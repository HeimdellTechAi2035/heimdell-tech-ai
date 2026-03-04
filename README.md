# Heimdell Tech AI – The Silver Protocol Landing Page

Managed post-sale compliance verification for UK SMEs and service providers.

## Image Naming Convention (Visual Authority SOP)

### Naming Rules
- Use **kebab-case** only: `my-image-name.webp`
- Be **descriptive**: Include what the image shows and its purpose
- Include **context keywords**: Brand, feature, or page relevance
- **Max 60 characters** for filename (excluding extension)

### Format Priority
1. **WebP** (preferred) — best compression, wide support
2. **AVIF** (optional) — smaller files, newer browsers
3. **PNG** (fallback) — for transparency or legacy

### Alt Text Rules
- Describe the **concept**, not just "image" or "diagram"
- Include **what it explains** and **who it helps**
- Target 10-25 words for explainer visuals
- Example: `"Eight-step compliance verification process flowchart showing how The Silver Protocol validates customer consent for UK SMEs"`

### ImageObject Schema
Every concept explainer image should have accompanying JSON-LD:
```json
{
  "@type": "ImageObject",
  "contentUrl": "https://telecomcompliance.uk/images/my-image.webp",
  "name": "Descriptive Image Title",
  "description": "10-25 word description of what the image explains",
  "width": 1200,
  "height": 800,
  "encodingFormat": "image/webp",
  "creator": { "@id": "https://telecomcompliance.uk/#organization" }
}
```

### Current Core Visuals
| Page | Image | Status |
|------|-------|--------|
| Homepage | silver-protocol-four-pillar-audit-automation-framework.webp | ✓ Exists |
| System Capabilities | eight-step-compliance-verification-process-silver-protocol.webp | ✓ Exists |
| Post-Sale Verification | job-verification-workflow-diagram.webp | TODO: Create |
| Financial Leakage Audit | financial-leakage-revenue-loss-fraud-waste-non-compliance.webp | ✓ Exists |
| CRM Integration | ai-crm-integration-data-flow-diagram.webp | TODO: Create |

## Hosting

This site is hosted on **GitHub Pages** at:  
🔗 [https://telecomcompliance.uk/](https://telecomcompliance.uk/)

## Custom Domain

Live at **https://telecomcompliance.uk** — connected via GitHub Pages with custom domain.

DNS configured with:
- A records pointing to GitHub Pages IPs (185.199.108-111.153)
- CNAME file in repo root

## Structure

```
├── index.html      # Main landing page (self-contained HTML/CSS/JS)
├── 404.html        # Custom 404 page
├── logo.png        # Heimdell Tech AI logo
├── .nojekyll       # Prevents Jekyll processing on GitHub Pages
├── .gitignore      # Git ignore rules
└── README.md       # This file
```

## Updating Content

All content, styles and scripts are in `index.html`. Edit directly and push to deploy.

Replace `+44XXXXXXXXXX` / `contact@heimdelltech.ai` with real contact details before going live.

