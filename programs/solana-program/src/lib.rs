pub mod instructions;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("KKaUCEcxFjGRhbCU83rkS8rUQtVgKLKXC8oKnruBpFm");

#[program]
pub mod solana_program {

    use super::*;

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        msg!("inicializou");
        Ok(())
    }

    pub fn get_price(ctx: Context<GetPriceCtx>) -> Result<()> {
        get_price::handler(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
