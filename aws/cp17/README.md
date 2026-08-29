# CP17 AWS pilot

This folder is the serverless AWS control plane for the CARD v2 controlled pilot.

## What it does

- Amazon Cognito: authenticated users and an `admin` group.
- API Gateway HTTP API: authenticated API surface.
- Lambda: participant registry API.
- DynamoDB: approved member/merchant registry, encrypted and point-in-time recoverable.
- CloudWatch: API/Lambda logs.

The application does **not** hold or sign with member private keys. Wallet signing remains outside the AWS backend. Do not put Ethereum private keys in frontend code, DynamoDB, Lambda environment variables, or the repository.

## Relationship to the contract

The on-chain contract remains the source of truth for permitted token movement. The AWS participant table is the application/audit registry used to drive administrative approvals and show pilot status.

The intended production flow is:

1. Administrator approves a person or merchant in the CP17 application.
2. A separately controlled admin signer/multisig executes the corresponding `setMember` or `setMerchant` transaction on the CARD contract.
3. The application records the wallet, role, approval state, actor and time.
4. Member wallets can transfer only through the contract's permitted paths.

Do not treat a DynamoDB approval as an on-chain approval until the Ethereum transaction is confirmed.

## Deployment prerequisites

- AWS CLI credentials for the CARD AWS account.
- AWS SAM CLI.
- A deployed Sepolia CARD v2 contract address.

Then:

```bash
cd aws/cp17
sam build
sam deploy --guided --parameter-overrides StageName=pilot CardContractAddress=0xSEPOLIA_CONTRACT
```

Use a separate AWS account or strongly isolated environment for production. Keep the pilot as `StageName=pilot` and production as a separately reviewed deployment.

## Before production

- Restrict API CORS from `*` to the actual CP17 web origin.
- Put the contract admin behind a Safe multisig.
- Add an explicit transaction-relay/signing design only after security and legal review; never add a raw private key to Lambda.
- Add CloudTrail, alarms, WAF/rate limits and administrative audit retention.
- Connect on-chain transaction receipts to participant change records so the app can distinguish pending, confirmed, and failed approvals.
