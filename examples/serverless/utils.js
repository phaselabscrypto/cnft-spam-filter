function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}

function extractAuthToken(event) {
  const [type, token] = event.headers.authorization?.split(" ") ?? [];
  return type === "Bearer" ? token : undefined;
}

function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

module.exports = {
  chunks,
  extractAuthToken,
  jsonResponse,
};
