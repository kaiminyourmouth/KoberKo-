const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function getGroqApiKey() {
  return process.env.GROQ_API_KEY?.trim() || process.env.VITE_GROQ_API_KEY?.trim() || '';
}

export function sendJson(response, payload, statusCode = 200) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  response.end(JSON.stringify(payload));
}

export function normalizeMessages(messages = []) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => message && typeof message.content === 'string' && typeof message.role === 'string')
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object') {
    return request.body;
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return {};
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(body);
}

export async function proxyGroqPayload(payload) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      payload: { error: 'missing_key' },
    };
  }

  const messages = normalizeMessages(payload?.messages);
  if (!messages.length) {
    return {
      ok: false,
      status: 400,
      payload: { error: 'bad_request' },
    };
  }

  try {
    const upstreamResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: payload.model || 'llama-3.3-70b-versatile',
        temperature: payload.temperature ?? 0.2,
        max_tokens: payload.maxTokens ?? payload.max_tokens ?? 1000,
        messages,
      }),
    });

    const text = await upstreamResponse.text();
    return {
      ok: upstreamResponse.ok,
      status: upstreamResponse.status,
      contentType: upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      body: text,
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      payload: {
        error: 'proxy_error',
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
