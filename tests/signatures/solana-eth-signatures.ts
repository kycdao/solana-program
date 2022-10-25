import * as anchor from "@project-serum/anchor";
import { ethers } from "ethers";
import { KycDao } from "../../target/types/kyc_dao";
import * as assert from "assert";

describe("solana-program", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.KycDao as anchor.Program<KycDao>;

  const ethSigner: ethers.Wallet = ethers.Wallet.createRandom();
  const ethFakeSigner: ethers.Wallet = ethers.Wallet.createRandom();
  const user: anchor.web3.Keypair = anchor.web3.Keypair.generate();

  // Stuff
  const transactionMock = {
    solanaAddress: "3QR781QLVDEsPnq1NeVr8k2p2SxP5N6HnDEDp2qgubEA",
  }; // mock data
  let ethAddress: string; // Ethereum address to be recovered and checked against
  let fullSig: string; // 64 bytes + recovery byte
  let signature: Uint8Array; // 64 bytes of sig
  let recoveryId: number; // recovery byte (u8)
  let actualMessage: Buffer; // actual signed message with Ethereum Message prefix

  /// Sample Create Signature function that signs with ethers signMessage
  async function createSignature(solanaAddress: string): Promise<string> {
    // keccak256 hash of the message
    const messageHash: string = ethers.utils.solidityKeccak256(
      ["string"],
      [solanaAddress]
    );

    // get hash as Uint8Array of size 32
    const messageHashBytes: Uint8Array = ethers.utils.arrayify(messageHash);

    // Signed message that is actually this:
    // sign(keccak256("\x19Ethereum Signed Message:\n" + len(messageHash) + messageHash)))
    const signature = await ethSigner.signMessage(messageHashBytes);

    return signature;
  }

  before(async () => {
    // Fund user
    await program.provider.connection.confirmTransaction(
      await program.provider.connection.requestAirdrop(
        user.publicKey,
        5 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    // Signature
    // Full sig consists of 64 bytes + recovery byte
    fullSig = await createSignature(transactionMock.solanaAddress);

    let full_sig_bytes = ethers.utils.arrayify(fullSig);
    signature = full_sig_bytes.slice(0, 64);
    recoveryId = full_sig_bytes[64] - 27;
    // ^ Why - 27? Check https://ethereum.github.io/yellowpaper/paper.pdf page 27.

    // The message we have to check against is actually this
    // "\x19Ethereum Signed Message:\n" + "32" + keccak256(msg)
    // Since we're hashing with keccak256 the msg len is always 32
    let msg_digest = ethers.utils.arrayify(
      ethers.utils.solidityKeccak256(
        ["string"],
        [transactionMock.solanaAddress]
      )
    );
    actualMessage = Buffer.concat([
      Buffer.from("\x19Ethereum Signed Message:\n32"),
      msg_digest,
    ]);

    // Calculated Ethereum Address (20 bytes) from public key (32 bytes)
    ethAddress = ethers.utils.computeAddress(ethSigner.publicKey).slice(2);
  });

  it("Verifies correct Ethereum signature", async () => {
    let tx = new anchor.web3.Transaction()
      .add(
        // Secp256k1 instruction
        anchor.web3.Secp256k1Program.createInstructionWithEthAddress({
          ethAddress: ethAddress,
          message: actualMessage,
          signature: signature,
          recoveryId: recoveryId,
        })
      )
      .add(
        // Our instruction
        program.instruction.verifySecp(
          ethers.utils.arrayify("0x" + ethAddress),
          Buffer.from(actualMessage),
          Buffer.from(signature),
          recoveryId,
          {
            accounts: {
              sender: user.publicKey,
              ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            },
            signers: [user],
          }
        )
      );

    try {
      await anchor.web3.sendAndConfirmTransaction(
        program.provider.connection,
        tx,
        [user]
      );

      // If all goes well, we're good!
    } catch (error) {
      assert.fail(
        `Should not have failed with the following error:\n${error.msg}`
      );
    }
  });

  it("Fails to verify wrong signature", async () => {
    // Construct transaction made of 2 instructions:
    //      - Secp256k1 sig verification instruction to the Secp256k1Program
    //      - Custom instruction to our program
    // The second instruction checks that the 1st one has been sent in the same transaction.
    // It checks that program_id, accounts, and data are what should have been send for
    // the params that we are intending to check.
    // If the first instruction doesn't fail and our instruction manages to deserialize
    // the data and check that it is correct, it means that the sig verification was successful.
    // Otherwise it failed.
    let tx = new anchor.web3.Transaction()
      .add(
        // Secp256k1 instruction
        anchor.web3.Secp256k1Program.createInstructionWithEthAddress({
          ethAddress: ethAddress,
          message: Buffer.from("bad message"), // will fail to verify
          signature: signature,
          recoveryId: recoveryId,
        })
      )
      .add(
        // Our instruction
        program.instruction.verifySecp(
          ethers.utils.arrayify("0x" + ethAddress),
          Buffer.from(actualMessage),
          Buffer.from(signature),
          recoveryId,
          {
            accounts: {
              sender: user.publicKey,
              ixSysvar: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
            },
            signers: [user],
          }
        )
      );

    // Send tx
    try {
      await anchor.web3.sendAndConfirmTransaction(
        program.provider.connection,
        tx,
        [user]
      );
    } catch (error) {
      // No idea how to catch this error otherwise
      assert.ok(
        error
          .toString()
          .includes(
            "failed to send transaction: Transaction precompile verification failure InvalidAccountIndex"
          )
      );
      return;
    }

    assert.fail("Should have failed to verify an invalid Secp256k1 signature.");
  });
});
