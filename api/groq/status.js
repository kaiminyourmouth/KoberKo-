import { getGroqApiKey, sendJson } from './_lib.js';

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.end();
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, { error: 'method_not_allowed' }, 405);
    return;
  }

  sendJson(response, { configured: Boolean(getGroqApiKey()) });
}
