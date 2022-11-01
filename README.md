# Soulbound Token on Solana

### Get configs:

```
solana config get
```

### Switch between nets:
`
```
solana config set --url devnet
solana config set --url localnet
```

### Solana account stuff

```
solana balance
solana address
solana airdrop 1
```

### Compile and deploy

To run the test, it must be first build; the first deploy should print the new program_id, which must be places in 'lib.rs', 'contants.ts' and 'anchor.toml'.

```bash
yarn
anchor build
anchor deploy --provider.cluster devnet --provider.wallet /home/guilherme/Documents/criptocode/Blockful/kycDAO/solana-program-current/utils/keypairs/my-wallet.json
anchor test
```

### Deploy to devnet: open state accounts, then mint

To deploy both Candy and State Machine, must first create their account through context. Notice that there is commenting instructions for deploy and instructions order in the test file.

```
anchor test
```

After you finished adding the pubKey as response for the account creation and changed the varriables in 'constants.ts', run the test again with the mint uncommented.

### Deploy to localnet:

Metadata Program in constants, do not exist in localnet. You can comment the invoke 'create_metadata_accounts' in 'lib.rs' to run the tests smoothly in localnet.

Start the local validator and logs

```
solana-test-validator
solana logs
anchor deploy
```

Run both Machine initializers, copy their pubKeys to constants and run the mint using:

```
anchor test --skip-local-validator
```

### Remember to close Programs

You can close programs to fetch you lamports rent back!

```
solana program close <PROGRAM_ID>
```
