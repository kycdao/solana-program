
// /// Creates a `HasValidToken` instruction.
// pub fn has_valid_token(
//     kycdaontnft_program_id: &Pubkey,
//     address: &Pubkey,
// ) -> Result<Instruction, ProgramError> {
//     check_program_account(kycdaontnft_program_id)?;
//     let data = KycDaoNftInstruction::HasValidToken.into();

//     let mut accounts = Vec::with_capacity(3 + signer_pubkeys.len());
//     accounts.push(AccountMeta::new(*account_pubkey, false));
//     accounts.push(AccountMeta::new_readonly(*mint_pubkey, false));
//     accounts.push(AccountMeta::new_readonly(
//         *owner_pubkey,
//         signer_pubkeys.is_empty(),
//     ));
//     for signer_pubkey in signer_pubkeys.iter() {
//         accounts.push(AccountMeta::new_readonly(**signer_pubkey, true));
//     }

//     Ok(Instruction {
//         program_id: *kycdaontnft_program_id,
//         accounts,
//         data,
//     })
// }

// /// Checks that the supplied program ID is the correct one for kycdaontnft
// pub fn check_program_account(kycdaontnft_program_id: &Pubkey) -> ProgramResult {
//     if kycdaontnft_program_id != &id() {
//         return Err(ProgramError::IncorrectProgramId);
//     }
//     Ok(())
// }