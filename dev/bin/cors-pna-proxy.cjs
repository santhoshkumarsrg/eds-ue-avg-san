#!/usr/bin/env node

/*
 * Vendored copy of the CORS + Private Network Access HTTPS proxy that sits
 * in front of the local AEM Author (HTTPS :14502 -> HTTP :4502). It exists
 * because Chrome's Private Network Access preflight requires the response
 * header `Access-Control-Allow-Private-Network: true` for any request from
 * a public origin (the Adobe-hosted Universal Editor SPA at
 * https://experience.adobe.com) to a private host (localhost). AEM does not
 * emit that header on its own, so a thin proxy short-circuits the preflight
 * and forwards the rest.
 *
 * The proxy also:
 *  - rewrites Set-Cookie to SameSite=None; Secure; Partitioned so the UE
 *    iframe can persist auth cookies across the cross-site boundary,
 *  - rewrites self-referential Location headers from http://localhost:4502
 *    back to https://localhost:14502 so the browser does not block
 *    mixed-content redirects,
 *  - injects the `urn:adobe:aue:config:service` meta tag and rewrites the
 *    `urn:adobe:aue:system:aemconnection` meta tag so the UE shell talks to
 *    our local UES instead of falling back to the Adobe-hosted service,
 *  - patches Content-Security-Policy frame-ancestors so the UE shell can
 *    iframe local AEM.
 *
 * Vendored from the upstream universal-editor-service project so the
 * project repo is the source of truth for the proxy's exact behaviour.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const httpProxy = require('http-proxy');

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, cur, idx, arr) => {
  if (cur.startsWith('--')) acc.push([cur.slice(2), arr[idx + 1]]);
  return acc;
}, []));

const SOURCE_PORT = parseInt(args.source || '14502', 10);
const TARGET = args.target || 'http://localhost:4502';
const CERT_PATH = args.cert || path.resolve(__dirname, '..', '.local', 'certificate.pem');
const KEY_PATH = args.key || path.resolve(__dirname, '..', '.local', 'key.pem');
const UES_URL = args.ues || 'https://localhost:14500';
const AEM_CONN = args['aem-conn'] || `xwalk:https://localhost:${SOURCE_PORT}`;

const cert = fs.readFileSync(CERT_PATH);
const key = fs.readFileSync(KEY_PATH);

const TARGET_URL = new URL(TARGET);
const TARGET_HOST_HEADER = `localhost:${SOURCE_PORT}`;

/* Upstream HTTP keep-alive agent. AEM Sling Development always emits
 * `Connection: close` on every response, which would otherwise force
 * a fresh TCP handshake to :4502 for every CSS/JS sub-request. With a
 * pooled agent we still get a new socket each time (Sling closes its
 * side) but the agent eliminates the per-request socket-create latency
 * by reusing a warm pool slot. */
const upstreamAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 32,
  maxFreeSockets: 16,
});

const proxy = httpProxy.createProxyServer({
  target: TARGET,
  changeOrigin: false,
  secure: false,
  ws: true,
  xfwd: false,
  followRedirects: false,
  selfHandleResponse: true,
  agent: upstreamAgent,
});

proxy.on('proxyReq', (proxyReq, req) => {
  /* http-proxy still emits `proxyReq` when the client aborts mid-request,
   * but by then the underlying ClientRequest has finalized its headers.
   * Calling setHeader in that state throws ERR_HTTP_HEADERS_SENT
   * synchronously - and because this fires from ProxyServer.emit(),
   * the throw escapes the emitter and crashes the whole process
   * (proxy.on('error') only catches emitted errors, not synchronous
   * throws from listeners). Guard with an early return and a defensive
   * try/catch so a client-abort race can never take the proxy down. */
  if (proxyReq.headersSent || proxyReq.destroyed) return;
  try {
    proxyReq.setHeader('X-Forwarded-Proto', 'https');
    proxyReq.setHeader('X-Forwarded-Host', TARGET_HOST_HEADER);
    proxyReq.setHeader('X-Forwarded-Port', String(SOURCE_PORT));
    proxyReq.setHeader('X-Forwarded-SSL', 'on');
    proxyReq.setHeader('Host', TARGET_HOST_HEADER);
    proxyReq.setHeader('Accept-Encoding', 'identity');
    /* Ask AEM to keep the socket open. Sling Dev mode still answers with
     * `Connection: close`, but stating intent is harmless and aligns with
     * the response-side override below. */
    proxyReq.setHeader('Connection', 'keep-alive');
  } catch (err) {
    if (err && err.code !== 'ERR_HTTP_HEADERS_SENT') throw err;
  }
});

function decompress(buf, encoding) {
  if (!encoding || encoding === 'identity') return buf;
  if (encoding === 'gzip') return zlib.gunzipSync(buf);
  if (encoding === 'deflate') return zlib.inflateSync(buf);
  if (encoding === 'br') return zlib.brotliDecompressSync(buf);
  return buf;
}

function injectUeMetaTags(html) {
  let out = html;
  const configMeta = `<meta name="urn:adobe:aue:config:service" content="${UES_URL}"/>`;
  if (!/urn:adobe:aue:config:service/i.test(out)) {
    out = out.replace(/<\/head>/i, `    ${configMeta}\n  </head>`);
  }
  out = out.replace(
    /<meta\s+name=["']urn:adobe:aue:system:aemconnection["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="urn:adobe:aue:system:aemconnection" content="${AEM_CONN}"/>`,
  );
  return out;
}

proxy.on('error', (err, req, res) => {
  console.error('[proxy error]', req && req.method, req && req.url, '->', err && err.message);
  if (res && !res.headersSent) {
    try {
      res.writeHead(502, { 'content-type': 'text/plain' });
      res.end('Proxy error: ' + (err && err.message));
    } catch (_) { /* swallow */ }
  }
});

/* Belt-and-braces: http-proxy re-emits synchronous throws from listener
 * callbacks (proxyReq / proxyRes / ws) as uncaught exceptions - the
 * `proxy.on('error')` handler above cannot catch them. Log benign
 * client-abort codes and keep the process alive; re-throw anything
 * unexpected so real bugs still surface. */
process.on('uncaughtException', (err) => {
  const code = err && err.code;
  if (code === 'ERR_HTTP_HEADERS_SENT' || code === 'ECONNRESET' || code === 'EPIPE') {
    console.error('[proxy uncaught]', code, err.message);
    return;
  }
  throw err;
});

function rewriteSetCookie(value) {
  let v = value;
  if (/SameSite\s*=\s*Lax/i.test(v)) {
    v = v.replace(/SameSite\s*=\s*Lax/gi, 'SameSite=None');
  } else if (!/SameSite\s*=/i.test(v)) {
    v = v.replace(/;?\s*$/, '') + '; SameSite=None';
  }
  if (!/;\s*Secure(\s|;|$)/i.test(v)) {
    v = v.replace(/;?\s*$/, '') + '; Secure';
  }
  if (!/;\s*Partitioned(\s|;|$)/i.test(v)) {
    v = v.replace(/;?\s*$/, '') + '; Partitioned';
  }
  return v;
}

function rewriteLocation(location) {
  if (!location) return location;
  try {
    const u = new URL(location);
    if (u.host === TARGET_URL.host || u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      u.protocol = 'https:';
      u.host = TARGET_HOST_HEADER;
      return u.toString();
    }
  } catch (_) { /* relative location; leave alone */ }
  return location;
}

function rewriteResponseHeaders(headers) {
  const h = { ...headers };
  h['access-control-allow-private-network'] = 'true';

  /* Force keep-alive on the browser-facing socket regardless of what
   * AEM emitted upstream. AEM Sling Dev returns `Connection: close` on
   * every response, which would otherwise close the proxy<->browser
   * HTTPS socket too and force a fresh TLS handshake for each of the
   * ~60 CSS/JS sub-requests on a UE canvas load. Under slow networks
   * (e.g. 3G) the resulting handshake storm saturates Chrome's
   * per-origin socket pool and bubbles up as ERR_TOO_MANY_RETRIES. We
   * preserve content-length / transfer-encoding from upstream so the
   * browser still knows where the response ends. */
  h['connection'] = 'keep-alive';
  h['keep-alive'] = 'timeout=60, max=1000';

  const setCookie = h['set-cookie'];
  if (Array.isArray(setCookie) && setCookie.length) {
    h['set-cookie'] = setCookie.map(rewriteSetCookie);
  } else if (typeof setCookie === 'string' && setCookie.length) {
    h['set-cookie'] = rewriteSetCookie(setCookie);
  }

  if (h['location']) h['location'] = rewriteLocation(h['location']);

  delete h['x-frame-options'];
  const allowFrameAncestors =
    "'self' https://*.adobeaemcloud.com https://experience.adobe.com";
  const existingCsp = h['content-security-policy'];
  if (existingCsp) {
    if (/frame-ancestors/i.test(existingCsp)) {
      h['content-security-policy'] = existingCsp.replace(
        /frame-ancestors[^;]*/i,
        `frame-ancestors ${allowFrameAncestors}`,
      );
    } else {
      h['content-security-policy'] =
        existingCsp.replace(/;?\s*$/, '') + `; frame-ancestors ${allowFrameAncestors}`;
    }
  } else {
    h['content-security-policy'] = `frame-ancestors ${allowFrameAncestors}`;
  }
  return h;
}

proxy.on('proxyRes', (proxyRes, req, res) => {
  const ct = (proxyRes.headers['content-type'] || '').toLowerCase();
  const isHtml = ct.startsWith('text/html');

  if (!isHtml) {
    const headers = rewriteResponseHeaders(proxyRes.headers);
    res.writeHead(proxyRes.statusCode, proxyRes.statusMessage, headers);
    proxyRes.pipe(res);
    return;
  }

  const chunks = [];
  proxyRes.on('data', (c) => chunks.push(c));
  proxyRes.on('end', () => {
    let body;
    try {
      body = decompress(Buffer.concat(chunks), proxyRes.headers['content-encoding']);
    } catch (e) {
      body = Buffer.concat(chunks);
    }
    const html = injectUeMetaTags(body.toString('utf8'));
    const out = Buffer.from(html, 'utf8');
    const headers = rewriteResponseHeaders(proxyRes.headers);
    delete headers['content-encoding'];
    delete headers['content-length'];
    delete headers['transfer-encoding'];
    headers['content-length'] = String(out.length);
    res.writeHead(proxyRes.statusCode, proxyRes.statusMessage, headers);
    res.end(out);
  });
  proxyRes.on('error', (err) => {
    console.error('[proxyRes error]', err.message);
    try { res.end(); } catch (_) { /* swallow */ }
  });
});

const server = https.createServer({
  key,
  cert,
  /* `sessionIdContext` enables TLS session-id resumption alongside Node's
   * default session-ticket support. Pin it so the value is stable across
   * the proxy's lifetime and Chrome can resume the same TLS session for
   * every sub-request on a page load instead of running a full handshake
   * each time. The string is opaque - any constant up to 32 bytes is fine. */
  sessionIdContext: 'cors-pna-proxy',
}, (req, res) => {
  if (req.method === 'OPTIONS' && req.headers['access-control-request-private-network']) {
    const origin = req.headers.origin || '*';
    const reqHeaders = req.headers['access-control-request-headers'] || '';
    const reqMethod = req.headers['access-control-request-method'] || 'GET, POST, OPTIONS';
    res.writeHead(204, {
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
      'access-control-allow-methods': reqMethod + ', GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH',
      'access-control-allow-headers': reqHeaders || '*',
      'access-control-allow-private-network': 'true',
      'access-control-max-age': '600',
      'vary': 'origin',
      /* Mirror the keep-alive override applied to proxied responses. */
      'connection': 'keep-alive',
      'keep-alive': 'timeout=60, max=1000',
    });
    res.end();
    return;
  }
  proxy.web(req, res);
});

/* Generous keep-alive + headers timeouts so Chrome can hold the HTTPS
 * socket open across the long-tail of a UE page load on a throttled
 * connection. Node defaults to 5 s, which kills the socket mid-load
 * under 3G and triggers the very handshake storm we're trying to avoid. */
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;

server.on('upgrade', (req, socket, head) => proxy.ws(req, socket, head));

server.listen(SOURCE_PORT, () => {
  console.log(`cors-pna-proxy listening on https://localhost:${SOURCE_PORT} -> ${TARGET}`);
});
