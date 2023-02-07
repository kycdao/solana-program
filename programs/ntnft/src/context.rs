use crate::state::*;

/* deserialized instruction data. These are the ctx structs of the instructions inside lib.rs */

use {
    anchor_lang::{prelude::*, solana_program::system_program},
    mpl_token_metadata,
};

#[derive(Accounts)]
pub struct MintWithArgs<'info> {
    #[account(
        mut, 
        has_one=wallet,
        seeds=[KYCDAO_COLLECTION_KYC_SEED.as_bytes()],
        bump,        
    )]
    pub collection: Account<'info, KycDaoNftCollection>,
    // /// CHECK: This is not dangerous because we don't read or write from this account
    // #[account(mut)]
    // pub receiver: AccountInfo<'info>,
    // /// CHECK: This is not dangerous because we don't read or write from this account
    // #[account(
    //     seeds=[KYCDAO_STATUS_KYC_SEED.as_bytes(), &receiver.key.to_bytes()],
    //     bump,
    // )]
    // pub status: Account<'info, KycDaoNftStatus>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub wallet: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub mint: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub associated_account: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer)]
    pub mint_authority: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer)]
    pub fee_payer: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    // #[account(signer)]
    // pub payer: Signer<'info>,
    /// CHECK: pyth oracle account
    /// TODO: We need to ensure we have the right price_feed, store in the collection?
    #[account(mut)]
    pub price_feed: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = spl_token::id())]
    pub token_program: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = mpl_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
}

/* derived account initialization */

/*
    The #[account(...)] macro enforces that our `kycdao_nft_collection`
    is owned by the currently executing program, as it's a PDA.

    We marking an account with the `init` attribute,
    creates a new account owned by the program
    When using `init`, we must also provide:
    `payer`, which funds the account creation
    and the `system_program` which is required by the runtime

    If our account were to use variable length types like String or Vec
    we would also need to allocate `space` to our account
    Since we are only dealing with fixed-sized integers,
    we can leave out `space` and Anchor will calculate this for us automatically

    `seeds` and `bump` tell us that our `kycdao_nft_collection` is a PDA that can be derived from their respective values
*/

#[derive(Accounts)]
//TODO: When is bump required?
// #[instruction(bump: u8, data: KycDaoNftStatusData)]
pub struct InitializeKycDAONFTStatus<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        has_one = authority,
        seeds=[KYCDAO_COLLECTION_KYC_SEED.as_bytes()],
        bump,
    )]
    pub collection: Account<'info, KycDaoNftCollection>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub receiver: AccountInfo<'info>,    
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        init, 
        seeds=[KYCDAO_STATUS_KYC_SEED.as_bytes(), &receiver.key.to_bytes()],
        bump,
        payer=receiver,
        //TODO: Will need to revisit this space calc
        space =
            8  +  // < discriminator   
            1  +  // pub is_valid: bool,
            8  +  // pub expiry: u64,
            64    // pub verification_tier: String (?), 
    )]
    pub status: Account<'info, KycDaoNftStatus>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(signer)]
    pub authority: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,    
}

#[derive(Accounts)]
//TODO: When is bump required?
// #[instruction(bump: u8, data: KycDaoNftStatusData)]
pub struct UpdateKycDAONFTStatus<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        has_one = authority,
        seeds=[KYCDAO_COLLECTION_KYC_SEED.as_bytes()],
        bump,
    )]
    pub collection: Account<'info, KycDaoNftCollection>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub status: Account<'info, KycDaoNftStatus>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8, data: KycDaoNftCollectionData)]
pub struct InitializeKycDAONFTCollection<'info> {
    #[account(
        init,
        seeds=[KYCDAO_COLLECTION_KYC_SEED.as_bytes()],
        payer = authority,
        bump,
        //TODO: Need to check this space calc, probably use it dynamically
        space =
            8  +  // < discriminator
                  // \/ candy_machine
            8  + 8 + 8 + (38 * 1 /* multiply by n of creators */) + 4 + 2 + 8 + 4 +
            32 +  // < wallet
            32 +  // < authority
            32    // < extra - remove later
    )]
    pub kycdao_nft_collection: Account<'info, KycDaoNftCollection>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    /// TODO: Why do we need the constraint check on wallet here?
    #[account(constraint = wallet.data_is_empty() && wallet.lamports() > 0 )]
    pub wallet: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    /// TODO: Why do we need the constraint check on authority here?
    #[account(mut, signer, constraint= authority.data_is_empty() && authority.lamports() > 0)]
    pub authority: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8, data: KycDaoNftCollectionData)]
pub struct UpdateKycDAONFTCollection<'info> {
    #[account(
        mut, 
        has_one = authority,
        seeds=[KYCDAO_COLLECTION_KYC_SEED.as_bytes()],
        bump
    )]
    pub kycdao_nft_collection: Account<'info, KycDaoNftCollection>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account()]
    pub wallet: AccountInfo<'info>,    
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(addr: Pubkey)]
pub struct HasValidToken<'info> {
    #[account(
        seeds=[KYCDAO_STATUS_KYC_SEED.as_bytes(), addr.as_ref()],
        bump,
    )]
    pub status: Account<'info, KycDaoNftStatus>,
}

/* rent table */
/* use this to calculate the space necessary of your accounts */

/*
    bool	        1 byte	    1 bit rounded up to 1 byte.
    u8 or i8	    1 byte
    u16 or i16	    2 bytes
    u32 or i32	    4 bytes
    u64 or i64	    8 bytes
    u128 or i128	16 bytes
    [u16; 32]	    64 bytes	32 items x 2 bytes. [itemSize; arrayLength]
    PubKey	        32 bytes	Same as [u8; 32]
    vec<u16>	    Any multiple of 2 bytes + 4 bytes for the prefix	Need to allocate the maximum amount of item that could be required.
    String	        Any multiple of 1 byte + 4 bytes for the prefix	Same as vec<u8>
*/
