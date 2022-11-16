use {
    crate::{error::ErrorCode, state::CandyMachineData},
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

declare_id!("B5xbSCv92pd9soUGjGL4w3p3Qpeevq1dwuD53iVU5L8g");

#[program]
pub mod kyc_dao {

    use super::*;
    use anchor_lang::solana_program::{
        program::{invoke, invoke_signed},
        system_instruction,
    };
    use metaplex_token_metadata::{
        instruction::{create_metadata_accounts, update_metadata_accounts},
        state::Creator,
    };
    use solana_program::native_token::LAMPORTS_PER_SOL;

    pub fn mint_nft(
        ctx: Context<MintNFT>,
        msg: Vec<u8>,
        sig: [u8; 64],
        recovery_id: u8,
        nft_name: String,
        nft_uri: String,
    ) -> Result<()> {
        /* Signature */
        /* get the Secp256k1Program instruction */
        let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;

        /* check that ix is what we expect to have been sent */
        verify_signature::verify_secp256k1_ix(
            &ix,
            &ctx.accounts.candy_machine.data.eth_signer,
            &msg,
            &sig,
            recovery_id,
        )?;

        /* get the mutable context */
        let candy_machine = &mut ctx.accounts.candy_machine;

        /* increment the counter of total mints by 1 */
        candy_machine.data.nfts_minted += 1;

        /* check if the collection still has NFTs to mint */
        if let Some(max_supply) = candy_machine.data.max_supply {
            if candy_machine.data.nfts_minted >= max_supply {
                return Err(ErrorCode::CandyMachineEmpty.into());
            }
        }

        /* Price */
        let price_account_info: AccountInfo = ctx.accounts.price_feed.to_account_info();
        let price_feed: PriceFeed = load_price_feed_from_account_info(&price_account_info).unwrap();
        let price_unwrap: Price = price_feed.get_current_price().unwrap();
        let price_u64: u64 = price_unwrap.price.try_into().unwrap();
        let price: u64 = candy_machine
            .data
            .price
            .safe_div((price_u64 * 10000).safe_div(LAMPORTS_PER_SOL)?)?
            * 10000;

        /* check if the payer (mint_authority) has enough SOL to pay the mint cost */
        if ctx.accounts.mint_authority.lamports() < price {
            return Err(ErrorCode::NotEnoughSOL.into());
        }

        /* pay fees - transfer money from the buyer to the treasury account */
        invoke(
            &system_instruction::transfer(
                &ctx.accounts.mint_authority.key, // from
                ctx.accounts.wallet.key,          // to
                price,                            // amount
            ),
            &[
                ctx.accounts.mint_authority.clone(),
                ctx.accounts.wallet.clone(),
                ctx.accounts.system_program.clone(),
            ],
        )?;

        /* if you are confused about PDAs and why it is needed */
        /* please read this article: https://paulx.dev/blog/2021/01/14/programming-on-solana-an-introduction/#program-derived-addresses-pdas-part-1 */
        let (_pda_pubkey, bump) = Pubkey::find_program_address(
            &[
                state::CANDY_PREFIX.as_bytes(),
                state::CANDY_SUFIX.as_bytes(),
            ],
            &self::id(),
        );

        let authority_seeds = [
            state::CANDY_PREFIX.as_bytes(),
            state::CANDY_SUFIX.as_bytes(),
            &[bump],
        ];

        let mut creators: Vec<Creator> = vec![Creator {
            address: candy_machine.key(),
            verified: true,
            share: 0,
        }];

        /* add the creators that will receive royalties from secondary sales */
        for c in &candy_machine.data.creators {
            creators.push(Creator {
                address: c.address,
                verified: false,
                share: c.share,
            });
        }

        let metadata_infos = vec![
            ctx.accounts.metadata.clone(),
            ctx.accounts.mint.clone(),
            ctx.accounts.mint_authority.clone(),
            ctx.accounts.mint_authority.clone(),
            ctx.accounts.token_metadata_program.clone(),
            ctx.accounts.token_program.clone(),
            ctx.accounts.system_program.clone(),
            ctx.accounts.rent.to_account_info().clone(),
            candy_machine.to_account_info().clone(),
        ];

        /* set the metadata of the NFT */
        invoke_signed(
            &create_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,   // program id
                *ctx.accounts.metadata.key,                 // metadata account
                *ctx.accounts.mint.key,                     // mint account
                *ctx.accounts.mint_authority.key,           // mint authority
                *ctx.accounts.mint_authority.key,           // payer
                candy_machine.key(),                        // update Authority
                nft_name,                                   // name
                candy_machine.data.symbol.to_string(),      // symbol
                nft_uri,                                    // uRI
                Some(creators),                             // creators
                candy_machine.data.seller_fee_basis_points, // royalties percentage in basis point 500 = 5%
                true,                                       // update auth is signer?
                false,                                      // is mutable?
            ),
            metadata_infos.as_slice(),
            &[&authority_seeds],
        )?;

        /* denote that the primary sale has happened */
        /* and disable future updates to the NFT, so it is truly immutable */
        invoke_signed(
            &update_metadata_accounts(
                *ctx.accounts.token_metadata_program.key,
                *ctx.accounts.metadata.key,
                candy_machine.key(),
                None,
                None,
                Some(true),
            ),
            &[
                ctx.accounts.token_metadata_program.clone(),
                ctx.accounts.metadata.clone(),
                candy_machine.to_account_info().clone(),
            ],
            &[&authority_seeds],
        )?;

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

    pub fn initialize_state(ctx: Context<State>) -> Result<()> {
        let authority = &mut ctx.accounts.authority;
        let data = &mut ctx.accounts.data;
        let candy_machine = &mut ctx.accounts.candy_machine;

        /* Only the owner can create states */
        if authority.key() != candy_machine.wallet.key() {
            return Err(ErrorCode::InvalidAuthority.into());
        }

        data.authority = ctx.accounts.authority.key();
        msg!("KycDAO: StateMachine pubKey {}", data.key());
        Ok(())
    }

    pub fn set_data(
        ctx: Context<SetData>,
        is_valid: bool,
        associated_account: Pubkey,
    ) -> Result<()> {
        let data = &mut ctx.accounts.data_acc;
        msg!(
            "KycDAO: State changed from {} to {} for account {}",
            data.is_valid,
            is_valid,
            associated_account
        );
        (*ctx.accounts.data_acc).is_valid = is_valid;
        (*ctx.accounts.data_acc).associated_account = associated_account;
        Ok(())
    }

    pub fn initialize_candy_machine(
        ctx: Context<InitializeCandyMachine>,
        _bump: u8,
        data: CandyMachineData,
    ) -> Result<()> {
        let candy_machine = &mut ctx.accounts.candy_machine;

        msg!("KycDAO: CandyMachine pubKey {}", candy_machine.key());
        candy_machine.authority = *ctx.accounts.authority.key;
        candy_machine.wallet = *ctx.accounts.wallet.key;
        candy_machine.data = data;

        Ok(())
    }

    pub fn update_candy_machine(
        ctx: Context<UpdateCandyMachine>,
        eth_signer: Option<[u8; 20]>,
        price: Option<u64>,
    ) -> Result<()> {
        let candy_machine = &mut ctx.accounts.candy_machine;

        if let Some(eth_s) = eth_signer {
            msg!(
                "KycDAO: ETH Signer changed from {:?} to {:?}",
                candy_machine.data.eth_signer,
                eth_s
            );
            candy_machine.data.eth_signer = eth_s;
        }

        if let Some(p) = price {
            msg!(
                "KycDAO: Price changed from {:?} to {}",
                candy_machine.data.price,
                p
            );
            candy_machine.data.price = p;
        };

        Ok(())
    }
}
