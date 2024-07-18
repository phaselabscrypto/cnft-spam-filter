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

  const addresses = [
    ...new Set(event.queryStringParameters?.address.split(",")),
  ].filter(Boolean);

  if (!addresses?.length) {
    return jsonResponse(400, { error: "No addresses provided" });
  }

  try {
    let classifications = [];

    for (let chunk of chunks(addresses, DYNAMODB_CHUNK_SIZE)) {
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

      classifications.push(...items);
    }

    return jsonResponse(200, { classifications });
  } catch (error) {
    console.log(error);

    return jsonResponse(500, { error });
  }
}

module.exports = { handler };
