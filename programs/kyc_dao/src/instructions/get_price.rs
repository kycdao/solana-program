use {
    anchor_lang::prelude::*,
    pyth_sdk_solana::{load_price_feed_from_account_info, Price, PriceFeed},
};

#[derive(Accounts)]
pub struct GetPriceCtx<'info> {
    #[account(mut)]
    /// CHECK: pyth oracle account
    pub price_feed: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<GetPriceCtx>) -> Result<()> {
    let price_account_info: AccountInfo = ctx.accounts.price_feed.to_account_info();
    let price_feed: PriceFeed = load_price_feed_from_account_info(&price_account_info).unwrap();
    let current_price: Price = price_feed.get_current_price().unwrap();
    msg!(
        "price: ({} +- {}) x 10^{}",
        current_price.price,
        current_price.conf,
        current_price.expo
    );

    Ok(())
}
