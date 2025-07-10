import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import { PublicKey } from "@solana/web3.js"
import {
  getAccount,
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import wallet from "/home/ghostgamer/.config/solana/ghost.json";
import { assert } from "chai";


describe("escrow-flow", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);
  const program = anchor.workspace.escrow as Program<Escrow>;

  const maker = provider.wallet
  const taker = anchor.web3.Keypair.fromSecretKey(new Uint8Array(wallet));
  const seed = new anchor.BN(1)

  let [escrowPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      maker.publicKey.toBytes(),
      seed.toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  )

  const mintA = new PublicKey("725YGi3ZaCAyRnp8RtZyyyjZ6isV1mmcu8ktLRkT83az")
  const mintB = new PublicKey("E7xrcPZKwVUqPn6tnjvdgi9tqQ7U8scGzLdiJB27eQsG")


  it("Is initialized!", async () => {
    const tx = await program.methods.
      make(
        seed,
        new anchor.BN(1 * 1_000_000),
        new anchor.BN(2 * 1_000_000)
      ).accountsPartial({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        escrow: escrowPDA,
        vault: await getAssociatedTokenAddress(mintA, escrowPDA, true),
        makerAtaA: await getAssociatedTokenAddress(mintA, maker.publicKey),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID
      })
      .rpc();

    console.log("Your transaction signature", tx);

    const vaultAta = await getAccount(
      provider.connection,
      await getAssociatedTokenAddress(mintA, escrowPDA, true)
    );
    assert.strictEqual(Number(vaultAta.amount), 2_000_000);

  });


  it("Take", async () => {
    const takerAtaAAddress = await getAssociatedTokenAddress(mintA, taker.publicKey);

    let before = await getAccount(provider.connection, takerAtaAAddress);
    const beforeAmount = Number(before.amount);

    const tx = await program.methods.take().accountsPartial({
      escrow: escrowPDA,
      maker: maker.publicKey,
      mintA,
      mintB,
      taker: taker.publicKey,
      makerAtaB: (await getOrCreateAssociatedTokenAccount(provider.connection, taker, mintB, maker.publicKey)).address,
      tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
    })
      .signers([taker])
      .rpc();
    console.log("Your transaction signature", tx);

    const after = await getAccount(provider.connection, takerAtaAAddress);
    const afterAmount = Number(after.amount);

    assert.strictEqual(afterAmount - beforeAmount, 2_000_000);
  });

});


describe("escrow-refund", () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider);
  const program = anchor.workspace.escrow as Program<Escrow>;

  const maker = provider.wallet
  const seed = new anchor.BN(2)

  let [escrowPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("escrow"),
      maker.publicKey.toBytes(),
      seed.toArrayLike(Buffer, "le", 8)
    ],
    program.programId
  )
  const mintA = new PublicKey("725YGi3ZaCAyRnp8RtZyyyjZ6isV1mmcu8ktLRkT83az")
  const mintB = new PublicKey("E7xrcPZKwVUqPn6tnjvdgi9tqQ7U8scGzLdiJB27eQsG")

  it("Is initialized (for refund)!", async () => {
    const tx = await program.methods.
      make(
        seed,
        new anchor.BN(10 * 1_000_000),
        new anchor.BN(2 * 1_000_000)
      ).accountsPartial({
        maker: maker.publicKey,
        mintA: mintA,
        mintB: mintB,
        escrow: escrowPDA,
        vault: await getAssociatedTokenAddress(mintA, escrowPDA, true),
        makerAtaA: await getAssociatedTokenAddress(mintA, maker.publicKey),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID
      })
      .rpc();

    console.log("Your transaction signature", tx);

    const vaultAta = await getAccount(provider.connection, await getAssociatedTokenAddress(mintA, escrowPDA, true));
    assert.strictEqual(Number(vaultAta.amount), 2_000_000);
  });

  it("Refund", async () => {
    const tx = await program.methods.refundAndCloseVault()
      .accountsPartial({
        escrow: escrowPDA,
        maker: maker.publicKey,
        mintA,
        makerAtaA: await getAssociatedTokenAddress(mintA, maker.publicKey),
        vault: await getAssociatedTokenAddress(mintA, escrowPDA, true),
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      }).rpc();

    console.log("Your transaction signature", tx);

  });

});
