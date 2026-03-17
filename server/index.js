import { createServer } from 'node:http';
import { readFileSync, existsSync, createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PORT = Number(process.env.PORT || 8787);
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

loadEnvFile(path.join(ROOT_DIR, '.env'));
loadEnvFile(path.join(ROOT_DIR, '.env.local'));

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function getGroqApiKey() {
  return process.env.GROQ_API_KEY?.trim() || process.env.VITE_GROQ_API_KEY?.trim() || '';
}

function setJsonHeaders(response, statusCode = 200) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
}

function sendJson(response, payload, statusCode = 200) {
  setJsonHeaders(response, statusCode);
  response.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const extension = path.extname(filePath);
  switch (extension) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'application/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.webmanifest':
      return 'application/manifest+json; charset=utf-8';
    case '.ico':
      return 'image/x-icon';
    case '.woff2':
      return 'font/woff2';
    default:
      return 'application/octet-stream';
  }
}

function normalizeMessages(messages = []) {
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

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const body = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(body);
}

async function proxyGroqRequest(request, response) {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    sendJson(response, { error: 'missing_key' }, 503);
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch {
    sendJson(response, { error: 'bad_request' }, 400);
    return;
  }

  const messages = normalizeMessages(payload.messages);
  if (!messages.length) {
    sendJson(response, { error: 'bad_request' }, 400);
    return;
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

    const upstreamText = await upstreamResponse.text();
    response.writeHead(upstreamResponse.status, {
      'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    response.end(upstreamText);
  } catch (error) {
    sendJson(
      response,
      {
        error: 'proxy_error',
        details: error instanceof Error ? error.message : String(error),
      },
      502,
    );
  }
}

async function serveStaticAsset(response, filePath) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      return false;
    }
  } catch {
    return false;
  }

  response.writeHead(200, {
    'Content-Type': getContentType(filePath),
    'Cache-Control': 'public, max-age=31536000, immutable',
  });

  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(response);
  });

  return true;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

  if (request.method === 'OPTIONS') {
    setJsonHeaders(response, 204);
    response.end();
    return;
  }

  if (url.pathname === '/api/groq/status' && request.method === 'GET') {
    sendJson(response, { configured: Boolean(getGroqApiKey()) });
    return;
  }

  if (url.pathname === '/api/groq/chat' && request.method === 'POST') {
    await proxyGroqRequest(request, response);
    return;
  }

  const publicCandidate = path.join(PUBLIC_DIR, url.pathname);
  if (url.pathname !== '/' && existsSync(publicCandidate)) {
    const served = await serveStaticAsset(response, publicCandidate);
    if (served) {
      return;
    }
  }

  const distCandidate = path.join(DIST_DIR, url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  if (url.pathname !== '/' && existsSync(distCandidate)) {
    const served = await serveStaticAsset(response, distCandidate);
    if (served) {
      return;
    }
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (existsSync(indexPath)) {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    createReadStream(indexPath).pipe(response);
    return;
  }

  sendJson(
    response,
    {
      error: 'not_built',
      message: 'Frontend build not found. Run `npm run build` or use `npm run dev` for development.',
    },
    503,
  );
});

server.listen(PORT, () => {
  console.log(`[KoberKo backend] listening on http://localhost:${PORT}`);
});
