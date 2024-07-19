const {
  ConcurrentMerkleTreeAccount,
} = require("@solana/spl-account-compression");
const { Connection, PublicKey } = require("@solana/web3.js");
const { Command } = require("commander");
const { getProofLength } = require("../../package");
const { chunks } = require("./utils");

const program = new Command();

program
  .command("classify")
  .requiredOption("-a, --address <string>", "address to classify")
  .option("-u, --base-url <string>", "base API URL to use")
  .action(async ({ address, baseUrl = "http://localhost:3000" }) => {
    const rpcUrl = process.env.RPC_URL;
    const authToken = process.env.AUTH_TOKEN;

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
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nftData,
        proofLength,
      }),
    }).then((response) => response.json());

    console.log(result);
  });

program
  .command("classifications")
  .requiredOption("-a, --addresses <string...>", "cNFT addresses to lookup")
  .option("-u, --base-url <string>", "base API URL to use")
  .action(async ({ addresses, baseUrl = "http://localhost:3000" }) => {
    const rpcUrl = process.env.RPC_URL;
    const authToken = process.env.AUTH_TOKEN;

    const id = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(addresses),
          ),
        ),
      ),
    );

    const { result: items } = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method: "getAssetBatch",
        params: {
          ids: addresses,
        },
      }),
    }).then((res) => res.json());

    const url = `${baseUrl}/classifications`;

    const classifications = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        items.flatMap((item) => [item.id, item.compression.tree]),
      ),
    })
      .then((response) => response.json())
      .then((json) => chunks(json, 2));

    const result = items.reduce((acc, { id }, index) => {
      if (
        classifications[index].some(
          (classification) => classification === "spam",
        )
      ) {
        acc[id] = "spam";
      } else if (classifications[index][0] === "ham") {
        acc[id] = "ham";
      } else if (classifications[index][1] === "ham") {
        acc[id] = "promising"; // to be enqueued for classification
      } else {
        acc[id] = "unknown"; // to be enqueued for classification
      }

      return acc;
    }, {});

    console.log(result);
  });

program.parse(process.argv);
