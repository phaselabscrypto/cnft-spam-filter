const {
  ConcurrentMerkleTreeAccount,
} = require("@solana/spl-account-compression");
const { Connection, PublicKey } = require("@solana/web3.js");
const { Command } = require("commander");
const { getProofLength } = require("../../package");

const program = new Command();

program
  .command("classify")
  .requiredOption("-a, --address <string>", "address to classify")
  .option("-u, --base-url <string>", "base API URL to use")
  .action(async ({ address, baseUrl = "http://localhost:3000" }) => {
    const rpcUrl = process.env.RPC_URL;

    // Get NFT data
    const { result: nftData } = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: address,
        method: "getAsset",
        params: {
          id: address,
          displayOptions: {
            showUnverifiedCollections: true,
            showCollectionMetadata: true,
            showFungible: false,
            showInscription: false,
          },
        },
      }),
    }).then((response) => response.json());

    // Get proof length
    const connection = new Connection(rpcUrl);
    const { tree } = nftData.compression;

    const treeAccount = await ConcurrentMerkleTreeAccount.fromAccountAddress(
      connection,
      new PublicKey(tree),
    );

    const proofLength =
      treeAccount.getMaxDepth() -
      (Math.log2(treeAccount.getCanopyDepth() + 2) - 1);

    // Call the API
    const url = `${baseUrl}/classify`;

    const result = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nftData,
        proofLength,
      }),
    }).then((response) => response.json());

    console.log(result);
  });

program.parse(process.argv);
