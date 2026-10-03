# A2A assistant: self-hosted runner

GitHub Pages cannot run the serverless functions in `netlify/functions/`, so the assistant runs on the Fasthosts VPS instead.

- Endpoint: `https://agent.heimdell-tech-ai.co.uk/a2a/v1` (JSON-RPC 2.0, A2A v1.0), advertised in `/.well-known/agent-card.json`.
- Code: `server/assistant-server.mjs` wraps the unchanged handler in `netlify/functions/_lib/` (`rpc.mjs`, `skill-faq.mjs`, `knowledge.mjs`). `netlify/functions/a2a.mjs` is no longer used.
- Knowledge: read from the live site, `https://heimdell-tech-ai.co.uk/knowledge/catalogue.json`, cached 5 minutes. Merging a catalogue change here updates the assistant within 5 minutes; no redeploy needed.
- Code changes to `server/` or `netlify/functions/_lib/` need copying to `/opt/assistant/` on the VPS, then `systemctl restart heimdell-assistant`.
- Limits: 30 requests/minute per IP, 32 KB request body, no streaming. It runs as an unprivileged user behind nginx and cannot reach other services on the server.

Local run: `URL=https://heimdell-tech-ai.co.uk node server/assistant-server.mjs` then `POST http://127.0.0.1:8095/a2a/v1`.
