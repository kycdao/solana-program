use crate::state::*;

/* deserialized instruction data. These are the ctx structs of the instructions inside lib.rs */

use {
    anchor_lang::{prelude::*, solana_program::system_program},
    metaplex_token_metadata,
    solana_program::sysvar::instructions::ID as IX_ID,
};

#[derive(Accounts)]
pub struct MintNFT<'info> {
    #[account(
        mut,
        has_one = wallet,
    )]
    pub candy_machine: Account<'info, CandyMachine>,
    #[account(mut)]
    pub state_machine: Account<'info, StateMachine>,
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
    #[account(signer)]
    pub mint_authority: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = spl_token::id())]
    pub token_program: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = metaplex_token_metadata::id())]
    pub token_metadata_program: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
    pub rent: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = IX_ID)]
    pub ix_sysvar: AccountInfo<'info>,
}

/* derived account initialization */

/*
    The #[account(...)] macro enforces that our `candy_machine` 
    is owned by the currently executing program.

    We mark `candy_machine` with the `init` attribute, 
    which creates a new account owned by the program
    When using `init`, we must also provide:
    `payer`, which funds the account creation
    and the `system_program` which is required by the runtime

    If our account were to use variable length types like String or Vec 
    we would also need to allocate `space` to our account
    Since we are only dealing with fixed-sized integers, 
    we can leave out `space` and Anchor will calculate this for us automatically

    `seeds` and `bump` tell us that our `candy_machine` is a PDA that can be derived from their respective values
    Account<'info, VotingState> tells us that it should be deserialized to the VotingState struct defined below at #[account]

*/

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitializeStateMachine<'info> {
    #[account(
        init, 
        seeds=[STATE_PREFIX.as_bytes(), STATE_SUFIX.as_bytes()],
        payer = authority,
        bump,
        space =
            8  +  // < discriminator                
            1  +  // < status
            32 +  // < authority
            32 +  // < account
            32    // < extra - remove later
    )]
    pub state_machine: Account<'info, StateMachine>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer, constraint= authority.data_is_empty() && authority.lamports() > 0)]
    pub authority: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateStateMachine<'info> {
    #[account(
        mut,
        has_one = associated_account,
    )]
    pub state_machine: Account<'info, StateMachine>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub associated_account: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(signer)]
    pub authority: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(bump: u8, data: CandyMachineData)]
pub struct InitializeCandyMachine<'info> {
    #[account(
        init,
        seeds=[CANDY_PREFIX.as_bytes(), CANDY_SUFIX.as_bytes()],
        payer = authority,
        bump,
        space =
            8  +  // < discriminator
                  // \/ candy_machine
            8  + 8 + 8 + (38 * 1 /* multiply by n of creators */) + 4 + 2 + 8 + 4 +
            32 +  // < wallet
            32 +  // < authority
            32    // < extra - remove later
    )]
    pub candy_machine: Account<'info, CandyMachine>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(constraint = wallet.data_is_empty() && wallet.lamports() > 0 )]
    pub wallet: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, signer, constraint= authority.data_is_empty() && authority.lamports() > 0)]
    pub authority: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateCandyMachine<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub candy_machine: Account<'info, CandyMachine>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(signer)]
    pub authority: AccountInfo<'info>,
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

