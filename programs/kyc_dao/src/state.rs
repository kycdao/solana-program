use anchor_lang::prelude::*;

/* state machine */

#[account]
#[derive(Default)]
pub struct StateMachine {
    pub authority: Pubkey,
    pub associated_account: Pubkey,
    pub data: StateMachineData,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, PartialEq)]
pub struct StateMachineData {
    pub is_valid: bool,
}

/* candy machine */

#[repr(C)]
#[derive(AnchorDeserialize, AnchorSerialize, PartialEq, Debug, Clone)]
pub struct Creator {
    pub address: Pubkey,
    pub verified: bool,
    pub share: u8,
}

#[account]
#[derive(Default)]
pub struct CandyMachine {
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub data: CandyMachineData,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, PartialEq)]
pub struct CandyMachineData {
    pub eth_signer: [u8; 20],
    pub price: u64,
    pub nfts_minted: u64,
    pub creators: Vec<Creator>,
    pub symbol: String,
    pub seller_fee_basis_points: u16,
    pub max_supply: Option<u64>,
}

/* seeds of the PDA, can be anything you want */
/* remember to change them on the JS too (utils.ts file) */
pub static CANDY_PREFIX: &str = "0LZ3DI4S2B";
pub static CANDY_SUFIX: &str = "0LZ3DI4S2B";
pub static STATE_PREFIX: &str = "F96G8971BA36F5G4";
pub static STATE_SUFIX: &str = "F96G8971BA36F5G4";
