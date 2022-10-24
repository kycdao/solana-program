pub mod instructions;
use solana_program::instruction::Instruction;
use solana_program::sysvar::instructions::load_instruction_at_checked;
use {anchor_lang::prelude::*, instructions::*};

declare_id!("8Y7hXQY96Vovp3c1bnsbRvD6Vtp56oG37La1CVfaFBff");

#[program]
pub mod kyc_dao {

    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("inicializou");
        Ok(())
    }

    pub fn get_price(ctx: Context<GetPriceCtx>) -> Result<()> {
        get_price::handler(ctx)
    }

    /// External instruction that only gets executed if
    /// a `Secp256k1Program.createInstructionWithEthAddress`
    /// instruction was sent in the same transaction.
    pub fn verify_secp(
        ctx: Context<Verify>,
        eth_address: [u8; 20],
        msg: Vec<u8>,
        sig: [u8; 64],
        recovery_id: u8,
    ) -> Result<()> {
        // Get what should be the Secp256k1Program instruction
        let ix: Instruction = load_instruction_at_checked(0, &ctx.accounts.ix_sysvar)?;

        // Check that ix is what we expect to have been sent
        utils::verify_secp256k1_ix(&ix, &eth_address, &msg, &sig, recovery_id)?;

        msg!("bombou!");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
