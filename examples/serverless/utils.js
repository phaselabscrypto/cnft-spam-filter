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
  extractAuthToken,
  jsonResponse,
};
