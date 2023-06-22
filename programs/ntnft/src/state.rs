use anchor_lang::prelude::*;

/* state */
#[account]
#[derive(Default)]
pub struct KycDaoNftCollection {
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub data: KycDaoNftCollectionData,   
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, PartialEq)]
pub struct KycDaoNftCollectionData {
    pub price_per_year: u64,
    pub nfts_minted: u64,
    pub symbol: String,
    pub name: String,
    pub base_url: String,
}

// TODO: Creator is not relevant I think. Also its defined elsewhere in metadata libs
// #[repr(C)]
// #[derive(AnchorDeserialize, AnchorSerialize, PartialEq, Debug, Clone)]
// pub struct Creator {
//     pub address: Pubkey,
//     pub verified: bool,
//     pub share: u8,
// }

#[account]
#[derive(Default)]
pub struct KycDaoNftStatus {
    pub data: KycDaoNftStatusData,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, PartialEq)]
pub struct KycDaoNftStatusData {
    pub is_valid: bool,
    pub expiry: u64,
    pub verification_tier: String,        
}

/* seeds of the PDA, can be anything you want */
/* remember to change them on the JS too (utils.ts file) */
pub static KYCDAO_COLLECTION_KYC_SEED: &str = "KYCDAO_COLLECTION_KYC_SEED";
pub static KYCDAO_STATUS_KYC_SEED: &str = "KYCDAO_STATUS_KYC_SEED";
