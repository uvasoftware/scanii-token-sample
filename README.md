# Scanii Client-Side Arbitration Sample

A minimal Node.js + browser sample that demonstrates Scanii's [client-side
content arbitration](https://docs.scanii.com/article/153-client-side-content-arbitration-with-scanii)
pattern: the browser uploads a file directly to Scanii using a short-lived auth
token, and the server only accepts the file once Scanii confirms it is clean.

The server uses the official [`@scanii/core`](https://www.npmjs.com/package/@scanii/core)
SDK to mint tokens and verify scan results.

## How it works

1. The browser asks the Node server for a short-lived auth token (`GET /auth-token.json`).
2. The server calls `scanii.createAuthToken(...)` and returns the token id plus the
   regional endpoint it was minted against.
3. The browser uploads the file directly to Scanii at that endpoint using the
   token for `Basic` auth.
4. If `findings` is non-empty, the browser blocks the upload locally. If it is
   clean, the browser POSTs the file (plus the scan id) to the Node server.
5. The server calls `scanii.retrieve(id)` to re-fetch the result, verifies the
   checksum matches the file on disk, and only then stores it.

## Requirements

- Node.js 22 or newer (the SDK uses native `fetch` / `FormData` / `Blob`)
- A Scanii account — sign up at <https://www.scanii.com>

## Running

```bash
npm install
SCANII_CREDS=YOUR_KEY:YOUR_SECRET npm start
```

Then open <http://localhost:3000>.

### Configuration

| Env var | Default | Purpose |
|---|---|---|
| `SCANII_CREDS` | `KEY:SECRET` | Your Scanii API key and secret, joined with `:`. |
| `SCANII_ENDPOINT` | `https://api-us1.scanii.com` (`ScaniiTarget.US1`) | Regional endpoint. Set to another region (e.g. `https://api-eu1.scanii.com`) or to `http://localhost:4000` to point at a local [scanii-cli](https://github.com/scanii/scanii-cli) mock server. |

The same endpoint is returned to the browser so the direct-to-Scanii upload
lands in the same region as the token.

## Testing

Unit tests run on every push:

```bash
npm test
```

The Playwright end-to-end suite drives a real browser through the full flow
against [scanii-cli](https://github.com/scanii/scanii-cli) — no Scanii
credentials needed.

```bash
docker run -d --name scanii-cli -p 4000:4000 \
  ghcr.io/scanii/scanii-cli:latest server -a 0.0.0.0:4000
npm run test:e2e
```

The e2e suite self-skips when scanii-cli is not reachable, so it is safe to
run unconditionally.

## License

Apache-2.0.
