# Serverless

If you don't have `serverless` installed and configured you'll need to follow a guide for that https://www.serverless.com/framework/docs/getting-started

Add `.env` with `AUTH_TOKEN` set to an arbitrary string, e.g.

```
AUTH_TOKEN=d6d79e00-d3fc-47f6-b876-9cb85bf0a332
```

## Run locally

Add `.env.development` with:

```
DYNAMODB_ENDPOINT=http://localhost:8000
```

and run `sls offline start`

# Deploy to AWS

Edit `serverless.yml` if necessary and run

```
sls create-cert
sls create_domain
sls deploy --stage prod
```

# Use CLI

Set environment variables:

```
export AUTH_TOKEN=d6d79e00-d3fc-47f6-b876-9cb85bf0a332 # set to AUTH_TOKEN from .env
export RPC_URL=https://mainnet.helius-rpc.com/?api-key=3c8d7771-f7ff-41db-b2a2-fcb201bbacfb # use your Helius API key
```

(Re-)classify a cNFT:

```
node cli.js classify -a A1xhLVywcq6SeZnmRG1pUzoSWxVMpS6J5ShEbt3smQJr -u https://filtoor.align.nexus
```

Get classifications for cNFT ids and Merkle tree addresses in batch:

```
node cli.js classifications -a A1xhLVywcq6SeZnmRG1pUzoSWxVMpS6J5ShEbt3smQJr 5hwBHvZS1QHrRRUmiWqJEKxGM8or88WGX8fbzyYxqZxS -u https://filtoor.align.nexus
```
