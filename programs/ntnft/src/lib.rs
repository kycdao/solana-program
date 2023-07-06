use {
    crate::{error::ErrorCode, state::*},
    anchor_lang::prelude::*,
    context::*,
    pyth_sdk_solana::{load_price_feed_from_account_info, Price, PriceFeed},
    solana_safe_math::SafeMath,
};
pub mod context;
pub mod error;
pub mod state;
pub mod verify_signature;

declare_id!("2eDJYtAPuD7tN4bwqwebKN5GRPxRTkVPD1pK4w2MAJnF");

#[program]
pub mod ntnft {

    use super::*;
    use anchor_lang::solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    };
    use mpl_token_metadata::{
        instruction::{create_metadata_accounts_v3},
        // state::Creator,
    };
    use solana_program::native_token::LAMPORTS_PER_SOL;

    const SUBSCRIPTION_COST_DECIMALS: u32 = 8;
    const SECS_IN_YEAR: u64 = 365 * 24 * 60 * 60;

    pub fn has_valid_token(
        ctx: Context<HasValidToken>,
        addr: Pubkey,
    ) -> Result<bool> {
        let kycdao_nft_status = &ctx.accounts.status;
        let is_valid = kycdao_nft_status.data.is_valid;
        let expiry = kycdao_nft_status.data.expiry;
        let now = Clock::get()?.unix_timestamp.unsigned_abs();
        let result = is_valid && expiry > now;
        msg!("has_valid_token for addr: {}, result: {}", addr, result);
        return Ok(result)
    }

    pub fn mint_with_args(
        ctx: Context<MintWithArgs>,
        // expiry: u64,
        seconds_to_pay: u64,
        metadata_cid: String,
        // verification_tier: String,        
    ) -> Result<()> {
        /* get the mutable context */
        let kycdao_nft_collection = &mut ctx.accounts.collection;

        /* increment the counter of total mints by 1 */
        kycdao_nft_collection.data.nfts_minted += 1;

        // Set isValid to true here
        // let kycdao_nft_status = &mut ctx.accounts.status;
        // kycdao_nft_status.data.is_valid = true;
        // kycdao_nft_status.data.expiry = expiry;
        // kycdao_nft_status.data.verification_tier = verification_tier;

        /* Price */
        let price_account_info: AccountInfo = ctx.accounts.price_feed.to_account_info();
        let price_feed: PriceFeed = load_price_feed_from_account_info(&price_account_info).unwrap();
        let price_unwrap: Price = price_feed.get_price_unchecked();
        let solprice_usd: u64 = price_unwrap.price.try_into().unwrap();
        let price_expo: u32 = price_unwrap.expo.abs().try_into().unwrap();
        //TODO: This isn't super safe but price feed's decimals are the same as SUBSCRIPTION_COST_DECIMALS for now...
        let decimal_convert: u64 = LAMPORTS_PER_SOL * (10_u64.pow(price_expo - SUBSCRIPTION_COST_DECIMALS));
        // let decimal_convert: u64 = LAMPORTS_PER_SOL * (10_f32.powf(price_unwrap.expo - SUBSCRIPTION_COST_DECIMALS)).try_into().unwrap();
        let price_per_year_lamports: u64 = kycdao_nft_collection
            .data
            .price_per_year
            .safe_mul(decimal_convert)?
            .safe_div(solprice_usd)?;
        let mint_cost = price_per_year_lamports * (seconds_to_pay / SECS_IN_YEAR);

        /* check if the payer (fee_payer) has enough SOL to pay the mint cost */
        if ctx.accounts.fee_payer.lamports() < mint_cost {
            return Err(ErrorCode::NotEnoughSOL.into());
        }

        /* pay fees - transfer money from the buyer to the treasury account */
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.fee_payer.key,        // from
                &ctx.accounts.wallet.key,           // to
                mint_cost,                          // amount
            ),
            &[
                ctx.accounts.fee_payer.clone(),
                ctx.accounts.wallet.clone(),
                ctx.accounts.system_program.clone(),
            ],
        )?;

        /* if you are confused about PDAs and why it is needed */
        /* please read this article: https://paulx.dev/blog/2021/01/14/programming-on-solana-an-introduction/#program-derived-addresses-pdas-part-1 */
        let (_pda_pubkey, bump) = Pubkey::find_program_address(
            &[
                state::KYCDAO_COLLECTION_KYC_SEED.as_bytes(),
            ],
            &self::id(),
        );

        let authority_seeds = [
            state::KYCDAO_COLLECTION_KYC_SEED.as_bytes(),
            &[bump],
        ];

        //TODO: Don't think we need creators at all
        // let mut creators: Vec<Creator> = vec![Creator {
        //     address: candy_machine.key(),
        //     verified: true,
        //     share: 0,
        // }];

        // /* add the creators that will receive royalties from secondary sales */
        // for c in &candy_machine.data.creators {
        //     creators.push(Creator {
        //         address: c.address,
        //         verified: false,
        //         share: c.share,
        //     });
        // }

        let metadata_infos = vec![
            ctx.accounts.metadata.clone(),
            ctx.accounts.mint.clone(),
            ctx.accounts.mint_authority.clone(),
            ctx.accounts.fee_payer.clone(),
            ctx.accounts.token_metadata_program.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.system_program.clone(),
            ctx.accounts.rent.to_account_info().clone(),
            kycdao_nft_collection.to_account_info().clone(),
        ];

        // program_id: Pubkey,
        // metadata_account: Pubkey,
        // mint: Pubkey,
        // mint_authority: Pubkey,
        // payer: Pubkey,
        // update_authority: Pubkey,
        // name: String,
        // symbol: String,
        // uri: String,
        // creators: Option<Vec<Creator>>,
        // seller_fee_basis_points: u16,
        // update_authority_is_signer: bool,
        // is_mutable: bool,
        // collection: Option<Collection>,
        // uses: Option<Uses>,
        // collection_details: Option<CollectionDetails>,

        let uri = kycdao_nft_collection.data.base_url.to_string() + &metadata_cid;

        /* set the metadata of the NFT */
        invoke_signed(
            &create_metadata_accounts_v3(
                *ctx.accounts.token_metadata_program.key,       // program id
                *ctx.accounts.metadata.key,                     // metadata account
                *ctx.accounts.mint.key,                         // mint account
                kycdao_nft_collection.authority,                // mint authority
                *ctx.accounts.fee_payer.key,                    // payer
                kycdao_nft_collection.authority,                // update Authority
                kycdao_nft_collection.data.name.to_string(),    // name
                kycdao_nft_collection.data.symbol.to_string(),  // symbol
                uri,                                            // uRI
                None,                                           // creators
                0,                                              // royalties percentage in basis point 500 = 5%
                true,                                           // //TODO: update auth is signer? what does this mean?
                true,                                           // is mutable?
                None,                                           // collection
                None,                                           // uses
                None,                                           // collection details      
            ),
            metadata_infos.as_slice(),
            &[&authority_seeds],
        )?;

        /* denote that the primary sale has happened */
        /* and disable future updates to the NFT, so it is truly immutable */
        //TODO: Don't want to prevent metadata updates, but might want to indicate primary sale?
        // invoke_signed(
        //     &update_metadata_accounts(
        //         *ctx.accounts.token_metadata_program.key,
        //         *ctx.accounts.metadata.key,
        //         candy_machine.key(),
        //         None,
        //         None,
        //         Some(true),
        //     ),
        //     &[
        //         ctx.accounts.token_metadata_program.clone(),
        //         ctx.accounts.metadata.clone(),
        //         candy_machine.to_account_info().clone(),
        //     ],
        //     &[&authority_seeds],
        // )?;

        /* Soulbound */
        /* freeze the token account */
        invoke(
            &spl_token::instruction::freeze_account(
                &ctx.accounts.token_program.key(),
                &ctx.accounts.associated_account.key(),
                &ctx.accounts.mint.key(),
                &ctx.accounts.mint_authority.key(),
                &[&ctx.accounts.mint_authority.key()],
            )?,
            &[
                ctx.accounts.associated_account.clone(),
                ctx.accounts.mint_authority.clone(),
                ctx.accounts.mint.clone(),
                ctx.accounts.token_program.clone(),
            ],
        )?;

        /* set freeze authority to 'none' */
        invoke(
            &spl_token::instruction::set_authority(
                &ctx.accounts.token_program.key(),
                &ctx.accounts.mint.key(),
                None,
                spl_token::instruction::AuthorityType::FreezeAccount,
                &ctx.accounts.mint_authority.key(),
                &[&ctx.accounts.mint_authority.key()],
            )?,
            &[
                ctx.accounts.mint_authority.clone(),
                ctx.accounts.mint.clone(),
                ctx.accounts.token_program.clone(),
            ],
        )?;

        /* at this point the NFT is already minted with the metadata */
        /* this invoke will disable more mints to the account */
        invoke(
            &spl_token::instruction::set_authority(
                &ctx.accounts.token_program.key(),
                &ctx.accounts.mint.key(),
                None,
                spl_token::instruction::AuthorityType::MintTokens,
                &ctx.accounts.mint_authority.key(),
                &[&ctx.accounts.mint_authority.key()],
            )?,
            &[
                ctx.accounts.mint_authority.clone(),
                ctx.accounts.mint.clone(),
                ctx.accounts.token_program.clone(),
            ],
        )?;

        Ok(())
    }

    pub fn init_status(
        ctx: Context<InitializeKycDAONFTStatus>,
        // _bump: u8,
        data: KycDaoNftStatusData,
    ) -> Result<()> {
        let status = &mut ctx.accounts.status;
        status.data = data;
        Ok(())
    }

    pub fn update_status(
        ctx: Context<UpdateKycDAONFTStatus>,
        // _bump: u8,
        data: KycDaoNftStatusData,
    ) -> Result<()> {
        let status = &mut ctx.accounts.status;
        status.data = data;
        Ok(())
    }

    pub fn initialize_kycdaonft_collection(
        ctx: Context<InitializeKycDAONFTCollection>,
        _bump: u8,
        data: KycDaoNftCollectionData,
    ) -> Result<()> {
        let kycdao_nft_collection = &mut ctx.accounts.kycdao_nft_collection;

        msg!("KycDAO: collection pubKey {}", kycdao_nft_collection.key());
        kycdao_nft_collection.wallet = *ctx.accounts.wallet.key;
        kycdao_nft_collection.authority = *ctx.accounts.authority.key;
        kycdao_nft_collection.data = data;

        Ok(())
    }

    pub fn update_kycdaonft_collection(
        ctx: Context<UpdateKycDAONFTCollection>,
        _bump: u8,
        data: KycDaoNftCollectionData,
    ) -> Result<()> {
        let kycdao_nft_collection = &mut ctx.accounts.kycdao_nft_collection;
        kycdao_nft_collection.wallet = *ctx.accounts.wallet.key;
        kycdao_nft_collection.data = data;

        Ok(())
    }

}
