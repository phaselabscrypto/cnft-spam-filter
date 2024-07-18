const defaultModel = require("./model.json");

async function extractTokens(nftData, proofLength, imageWords) {
  const imageContainsUrl = imageWords.some((word) => word.match(/\../));

  // Get the words from the NFT metadata
  const attributeWords = (nftData.content.metadata.attributes ?? []).flatMap(
    (attr) => [...attr.value.split(/\s+/), ...attr.trait_type.split(/\s+/)],
  );
  const descriptionWords =
    nftData.content.metadata.description?.split(/\s+/) ?? "";
  const nameWords = nftData.content.metadata.name?.split(/\s+/) ?? "";

  // Check attribute/description/name for an emoji
  const allWords = [...attributeWords, ...descriptionWords, ...nameWords];
  const regexEmoji = /\p{Extended_Pictographic}/u;
  const containsEmoji = allWords.some((word) => regexEmoji.test(word));

  let tokens = [...imageWords, ...attributeWords] // only image and attribute words are useful for classification purposes
    .filter((word) => {
      if (word === "[]") return false;
      if (word.length <= 3) return false; // ignore words with less than 3 characters, kinda hacky but useful

      return true;
    })
    .map((word) => word.toLowerCase());

  const keywords = [
    "containsEmoji",
    "proofLengthImpossible",
    "imageContainsUrl",
    "not_containsEmoji",
    "not_proofLengthImpossible",
    "not_imageContainsUrl",
  ];

  tokens.filter((token) => {
    return !keywords.includes(token);
  });

  tokens.push(containsEmoji ? "containsEmoji" : "not_containsEmoji");
  tokens.push(
    proofLength > 23 ? "proofLengthImpossible" : "not_proofLengthImpossible",
  );
  tokens.push(imageContainsUrl ? "imageContainsUrl" : "not_imageContainsUrl");

  return tokens;
}

function classify(tokens, model = defaultModel) {
  let spam_likelihood = model.spam.size / (model.spam.size + model.ham.size);
  let ham_likelihood = 1 - spam_likelihood;
  const unique_tokens = new Set(tokens);

  unique_tokens.forEach((token) => {
    const spam_token_likelihood =
      ((model.spam.tokens[token] || 0) + 1) / (model.spam.size + 2);
    const ham_token_likelihood =
      ((model.ham.tokens[token] || 0) + 1) / (model.ham.size + 2);

    spam_likelihood *= spam_token_likelihood;
    ham_likelihood *= ham_token_likelihood;
  });

  return spam_likelihood > ham_likelihood ? "spam" : "ham";
}

async function extractAndClassify(nftData, proofLength, imageWords) {
  const tokens = await extractTokens(nftData, proofLength, imageWords);
  const classification = classify(tokens);

  return { classification };
}

module.exports = {
  extractTokens,
  classify,
  extractAndClassify,
};
