const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  BatchGetCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT });
const dynamo = DynamoDBDocumentClient.from(client);

function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}

const DYNAMODB_CHUNK_SIZE = 100;

module.exports.handler = async (event) => {
  const addresses = [
    ...new Set(event.queryStringParameters?.address.split(",")),
  ].filter(Boolean);

  if (!addresses?.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No addresses provided" }),
    };
  }

  let statusCode;
  let body;

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

    statusCode = 200;
    body = { classifications };
  } catch (error) {
    console.log(error);

    statusCode = 500;
    body = { error };
  }

  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
};
