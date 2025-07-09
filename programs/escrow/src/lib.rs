#[allow(deprecated)]
#[allow(unexpected_cfgs)]
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("DfPpUtyafyGgUHgXcyNMtgvZZUBm8gSYaFagqbox5UW3");

#[program]
pub mod escrow {
    use super::*;
    
}
