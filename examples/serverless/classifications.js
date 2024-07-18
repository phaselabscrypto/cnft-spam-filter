const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  BatchGetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { extractAuthToken, jsonResponse } = require("./utils");

const client = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT });
const dynamo = DynamoDBDocumentClient.from(client);

function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}

const DYNAMODB_CHUNK_SIZE = 100;

async function handler(event) {
  if (extractAuthToken(event) !== process.env.AUTH_TOKEN) {
    return jsonResponse(
      401,
      { error: "Unauthorized" },
      { "WWW-Authenticate": "Bearer" },
    );
  }

  const addresses = event.queryStringParameters?.address.split(",");

  const tidyAdresses = [...new Set(addresses)].filter(Boolean);

  if (!tidyAdresses?.length) {
    return jsonResponse(400, { error: "No addresses provided" });
  }

  try {
    const classifications = await Promise.all(
      chunks(tidyAdresses, DYNAMODB_CHUNK_SIZE).map(async (chunk) => {
        const {
          Responses: { classifications: items },
        } = await dynamo.send(
          new BatchGetCommand({
            RequestItems: {
              classifications: {
                Keys: chunk.map((address) => ({ address })),
              },
            },
          }),
        );

        return items;
      }),
    ).then((chunks) =>
      Object.fromEntries(
        chunks.flat().map((item) => [item.address, item.classification]),
      ),
    );

    return jsonResponse(
      200,
      addresses.map((address) => classifications[address] || null),
    );
  } catch (error) {
    console.log(error);

    return jsonResponse(500, { error });
  }
}

module.exports = { handler };
