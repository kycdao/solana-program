use {
    crate::{error::ErrorCode, state::*},
    anchor_lang::prelude::*,
    context::*,
    pyth_sdk_solana::{load_price_feed_from_account_info, Price, PriceFeed},
    solana_program::instruction::Instruction,
    solana_program::sysvar::instructions::load_instruction_at_checked,
    solana_safe_math::SafeMath,
};
pub mod context;
pub mod error;
pub mod state;
pub mod verify_signature;

declare_id!("CAA11798ETgBYZT5KBN1z7SMat76Wt9xE5RCxU5nX5Ft");

#[program]
pub mod kyc_dao {

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

    pub fn mint_nft(
        ctx: Context<MintNFT>,
        msg: Option<Vec<u8>>,
        sig: Option<[u8; 64]>,
        recovery_id: u8,
        // nft_name: String,
        nft_uri: String,
    ) -> Result<()> {
        /* Signature */
        /* get the Secp256k1Program instruction */
        let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;

        /* check that ix is what we expect to have been sent */
        if let Some(msg_s) = msg {
            if let Some(sig_s) = sig {
                verify_signature::verify_secp256k1_ix(
                    &ix,
                    &ctx.accounts.collection.data.eth_signer,
                    &msg_s,
                    &sig_s,
                    recovery_id,
                )?;
            } else {
                return Err(ErrorCode::SignatureVerificationFailed.into());
            }
        } else {
            return Err(ErrorCode::SignatureVerificationFailed.into());
        }

        /* Apparently msg and sig must be options to be send as buffers */
        // verify_signature::verify_secp256k1_ix(
        //     &ix,
        //     &ctx.accounts.candy_machine.data.eth_signer,
        //     &msg,
        //     &sig,
        //     recovery_id,
        // )?;

        /* get the mutable context */
        let kycdao_nft_collection = &mut ctx.accounts.collection;

        /* increment the counter of total mints by 1 */
        kycdao_nft_collection.data.nfts_minted += 1;

        /* check if the collection still has NFTs to mint */
        //TODO: No need to check max supply of NFTs
        // if let Some(max_supply) = candy_machine.data.max_supply {
        //     if candy_machine.data.nfts_minted >= max_supply {
        //         return Err(ErrorCode::CandyMachineEmpty.into());
        //     }
        // }

        //TODO: Add status handling after
        // Set isValid to true here
        let kycdao_nft_status = &mut ctx.accounts.status;
        kycdao_nft_status.data.is_valid = true;

        //TODO: Need to set expiry properly here, for now just check it's set correctly
        kycdao_nft_status.data.expiry = 1;

        /* Price */
        //TODO: Will need more complex expiry handling here, for now this is just doing one year
        let price_account_info: AccountInfo = ctx.accounts.price_feed.to_account_info();
        let price_feed: PriceFeed = load_price_feed_from_account_info(&price_account_info).unwrap();
        let price_unwrap: Price = price_feed.get_current_price().unwrap();
        let price_u64: u64 = price_unwrap.price.try_into().unwrap();
        let price: u64 = kycdao_nft_collection
            .data
            .price_per_year
            .safe_div((price_u64 * 10000).safe_div(LAMPORTS_PER_SOL)?)?
            * 10000;

        /* check if the payer (fee_payer) has enough SOL to pay the mint cost */
        if ctx.accounts.fee_payer.lamports() < price {
            return Err(ErrorCode::NotEnoughSOL.into());
        }

        /* pay fees - transfer money from the buyer to the treasury account */
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.fee_payer.key,        // from
                &ctx.accounts.wallet.key,           // to
                price,                              // amount
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
            // candy_machine.to_account_info().clone(),
        ];

        // /* set the metadata of the NFT */
        // invoke_signed(
        //     &create_metadata_accounts(
        //         *ctx.accounts.token_metadata_program.key,   // program id
        //         *ctx.accounts.metadata.key,                 // metadata account
        //         *ctx.accounts.mint.key,                     // mint account
        //         *ctx.accounts.mint_authority.key,           // mint authority
        //         *ctx.accounts.fee_payer.key,                // payer
        //         candy_machine.key(),                        // update Authority
        //         nft_name,                                   // name
        //         candy_machine.data.symbol.to_string(),      // symbol
        //         nft_uri,                                    // uRI
        //         None,                                       // creators
        //         candy_machine.data.seller_fee_basis_points, // royalties percentage in basis point 500 = 5%
        //         true,                                       // update auth is signer?
        //         false,                                      // is mutable?
        //     ),
        //     metadata_infos.as_slice(),
        //     &[&authority_seeds],
        // )?;

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

        /* set the metadata of the NFT */
        invoke_signed(
            &create_metadata_accounts_v3(
                *ctx.accounts.token_metadata_program.key,       // program id
                *ctx.accounts.metadata.key,                     // metadata account
                *ctx.accounts.mint.key,                         // mint account
                *ctx.accounts.mint_authority.key,               // mint authority
                *ctx.accounts.fee_payer.key,                    // payer
                kycdao_nft_collection.key(),                    // update Authority
                kycdao_nft_collection.data.name.to_string(),    // name
                kycdao_nft_collection.data.symbol.to_string(),  // symbol
                nft_uri,                                        // uRI
                None,                                           // creators
                0,                                              // royalties percentage in basis point 500 = 5%
                true,                                           // update auth is signer?
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
        //TODO: Don't want to prevent metadata updates
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

    //TODO: Not sure how we're going to init status yet
    // pub fn initialize_state(ctx: Context<State>) -> Result<()> {
    //     let authority = &mut ctx.accounts.authority;
    //     let data = &mut ctx.accounts.data;
    //     let candy_machine = &mut ctx.accounts.candy_machine;

    //     /* Only the owner can create states */
    //     if authority.key() != candy_machine.wallet.key() {
    //         return Err(ErrorCode::InvalidAuthority.into());
    //     }

    //     data.authority = ctx.accounts.authority.key();
    //     msg!("KycDAO: StateMachine pubKey {}", data.key());
    //     Ok(())
    // }

    pub fn update_status(
        ctx: Context<UpdateKycDAONFTStatus>,
        // _bump: u8,
        data: KycDaoNftStatusData,
    ) -> Result<()> {
        let status = &mut ctx.accounts.status;
        // msg!(
        //     "KycDAO: State changed from {} to {}",
        //     status.data,
        //     data
        // );
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
