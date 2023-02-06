use anchor_lang::{prelude::*, solana_program::system_program};
use kycdao_solana_ntnft::cpi::has_valid_token;
use kycdao_solana_ntnft::cpi::accounts::HasValidToken;
use kycdao_solana_ntnft::program::Ntnft;
use kycdao_solana_ntnft::state::KycDaoNftStatus;

declare_id!("12ooNXAnRpGcTX1fHBWysVoSzHvmqxZqWy4EQj6PcNyv");

pub static MEMBERSHIP_SEED: &str = "MEMBERSHIP_SEED";

#[program]
pub mod kycdao_cpi_example {
    use super::*;

    pub fn check_address(ctx: Context<CheckAddress>, addr: Pubkey) -> Result<bool> {
        let cpi_program = ctx.accounts.kycdao_program.to_account_info();
        let cpi_accounts = HasValidToken {
            status: ctx.accounts.kycdao_status.to_account_info(),
        };        
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let result = has_valid_token(cpi_ctx, addr)?.get();
        msg!("check_address for addr: {}, result: {}", addr, result);

        Ok(result)
    }

    pub fn add_new_member(ctx: Context<AddNewMember>, member_id: u64, _member_seed: Vec<u8>) -> Result<()> {
        let cpi_program = ctx.accounts.kycdao_program.to_account_info();
        let cpi_accounts = HasValidToken {
            status: ctx.accounts.kycdao_status.to_account_info(),
        };        
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        let result = has_valid_token(cpi_ctx, *ctx.accounts.receiver.key)?.get();

        if result {
            ctx.accounts.membership_status.is_member = true;
            ctx.accounts.membership_status.member_since = Clock::get()?.unix_timestamp;
            ctx.accounts.membership_status.member_id = member_id;
        }

        msg!("add_new_member successful for addr: {}, member_id: {}", ctx.accounts.receiver.key, member_id);

        Ok(())
    }

}

#[derive(Accounts)]
#[instruction(addr: Pubkey)]
pub struct CheckAddress<'info> {
    pub kycdao_program: Program<'info, Ntnft>,
    pub kycdao_status: Account<'info, KycDaoNftStatus>,
}

#[derive(Accounts)]
#[instruction(_member_id: u64, member_seed:Vec<u8>)]
pub struct AddNewMember<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub receiver: AccountInfo<'info>,    
    pub kycdao_program: Program<'info, Ntnft>,
    pub kycdao_status: Account<'info, KycDaoNftStatus>,
    #[account(
        init,
        seeds=[&member_seed, receiver.key.as_ref()],
        bump,
        payer=receiver,
        space =
            8  +  // < discriminator   
            1  +  // pub is_member: bool,
            8  +  // pub member_since: u64,
            8     // pub member_id: u64,         
    )]    
    pub membership_status: Account<'info, MembershipStatus>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>,    
}

#[account]
#[derive(Default)]
pub struct MembershipStatus {
    pub is_member: bool,
    pub member_since: i64,
    pub member_id: u64,
}