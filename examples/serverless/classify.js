const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  TextractClient,
  AnalyzeDocumentCommand,
} = require("@aws-sdk/client-textract");
const { extractAndClassify } = require("../../package");

const client = new DynamoDBClient({ endpoint: process.env.DYNAMODB_ENDPOINT });
const textract = new TextractClient({});

const dynamo = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  let statusCode;
  let body;

  try {
    const { nftData, proofLength } = JSON.parse(event.body);

    const classification = await (async () => {
      const address = nftData.id;
      const { tree } = nftData.compression;

      const imageUrl = nftData.content.links.image;

      // fetch the image from the URL
      const image = await fetch(imageUrl)
        .then((res) => res.arrayBuffer())
        .then((buf) => new Uint8Array(buf));

      // use Textract to extract text from the image
      const textractCommand = new AnalyzeDocumentCommand({
        Document: {
          Bytes: image,
        },
        FeatureTypes: ["TABLES"],
      });
      const textractResponse = await textract.send(textractCommand);
      const text = textractResponse.Blocks.map((block) => block.Text).join(" ");

      const imageWords = text.split(/\s+/).filter(Boolean);

      const { classification } = await extractAndClassify(
        nftData,
        proofLength,
        imageWords,
      );

      await dynamo.send(
        new BatchWriteCommand({
          RequestItems: {
            classifications: [address, tree].map((address) => ({
              PutRequest: {
                Item: {
                  address,
                  classification,
                },
              },
            })),
          },
        }),
      );

      return classification;
    })();

    statusCode = 200;
    body = { classification };
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
