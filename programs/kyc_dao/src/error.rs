use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("SECP256K1 program or lenght doesn't match")]
    InvalidDataProvided,

    #[msg("The signature data provded to validate the metadata is incorrect")]
    SignatureVerificationFailed,

    #[msg("You don't have enough SOL to mint this NFT")]
    NotEnoughSOL,

    #[msg("The launch date has not come yet")]
    CandyMachineNotLiveYet,

    #[msg("There are no more NFTs to mint in this collection")]
    CandyMachineEmpty,
}