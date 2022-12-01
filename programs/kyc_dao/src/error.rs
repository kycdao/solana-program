use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("SECP256K1 program or length doesn't match")]
    InvalidDataProvided,

    #[msg("The signature data provided to validate the metadata is incorrect")]
    SignatureVerificationFailed,

    #[msg("You don't have enough SOL to mint this NFT")]
    NotEnoughSOL,

    #[msg("There are no more NFTs to mint in this collection")]
    CandyMachineEmpty,

    #[msg("The authority provided is not valid")]
    InvalidAuthority,

    #[msg("The authMint provided is not valid")]
    InvalidAuthMint,    
}
