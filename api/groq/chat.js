import { proxyGroqPayload, readJsonBody, sendJson } from './_lib.js';

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.statusCode = 204;
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.end();
    return;
  }

  if (request.method !== 'POST') {
    sendJson(response, { error: 'method_not_allowed' }, 405);
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendJson(response, { error: 'bad_request' }, 400);
    return;
  }

  const proxied = await proxyGroqPayload(payload);
  if (proxied.body) {
    response.statusCode = proxied.status;
    response.setHeader('Content-Type', proxied.contentType);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.end(proxied.body);
    return;
  }

  sendJson(response, proxied.payload, proxied.status);
}
