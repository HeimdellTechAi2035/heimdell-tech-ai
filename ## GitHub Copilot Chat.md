## GitHub Copilot Chat

- Extension: 0.42.3 (prod)
- VS Code: 1.114.0 (e7fb5e96c0730b9deb70b33781f98e2f35975036)
- OS: win32 10.0.26100 x64
- GitHub Account: heimdelltech1-max

## Network

User Settings:
```json
  "http.systemCertificatesNode": true,
  "github.copilot.advanced.debug.useElectronFetcher": true,
  "github.copilot.advanced.debug.useNodeFetcher": false,
  "github.copilot.advanced.debug.useNodeFetchFetcher": true
```

Connecting to https://api.github.com:
- DNS ipv4 Lookup: 20.26.156.210 (17 ms)
- DNS ipv6 Lookup: Error (11 ms): getaddrinfo ENOTFOUND api.github.com
- Proxy URL: None (2 ms)
- Electron fetch (configured): HTTP 200 (19 ms)
- Node.js https: HTTP 200 (81 ms)
- Node.js fetch: HTTP 200 (23 ms)

Connecting to https://api.githubcopilot.com/_ping:
- DNS ipv4 Lookup: 140.82.112.21 (17 ms)
- DNS ipv6 Lookup: Error (15 ms): getaddrinfo ENOTFOUND api.githubcopilot.com
- Proxy URL: None (37 ms)
- Electron fetch (configured): HTTP 200 (104 ms)
- Node.js https: HTTP 200 (349 ms)
- Node.js fetch: HTTP 200 (312 ms)

Connecting to https://copilot-proxy.githubusercontent.com/_ping:
- DNS ipv4 Lookup: 20.199.39.224 (11 ms)
- DNS ipv6 Lookup: Error (15 ms): getaddrinfo ENOTFOUND copilot-proxy.githubusercontent.com
- Proxy URL: None (3 ms)
- Electron fetch (configured): HTTP 200 (112 ms)
- Node.js https: HTTP 200 (131 ms)
- Node.js fetch: HTTP 200 (169 ms)

Connecting to https://mobile.events.data.microsoft.com: HTTP 404 (163 ms)
Connecting to https://dc.services.visualstudio.com: HTTP 404 (139 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (369 ms)
Connecting to https://copilot-telemetry.githubusercontent.com/_ping: HTTP 200 (334 ms)
Connecting to https://default.exp-tas.com: HTTP 400 (198 ms)

Number of system certificates: 66

## Documentation

In corporate networks: [Troubleshooting firewall settings for GitHub Copilot](https://docs.github.com/en/copilot/troubleshooting-github-copilot/troubleshooting-firewall-settings-for-github-copilot).