# TruePeptideSource MCP server

Let Claude, ChatGPT or any MCP client answer peptide questions with our data and our exact calculator math. Free, read-only, no sign-in, no API key.

- **Server URL:** `https://truepeptidesource.com/mcp`
- **Transport:** Streamable HTTP (stateless)
- **Registry name:** `com.truepeptidesource/peptides` ([server.json](../server.json))
- **Docs page:** https://truepeptidesource.com/ai

## Tools

| Tool | What it answers |
|---|---|
| `peptide_reconstitution_calculator` | Syringe units for a dose after adding bacteriostatic water, concentration, doses per vial, or the dose held in a number of units. Flags likely mg/mcg mix-ups. |
| `peptide_blend_calculator` | Vials with two or more peptides (KLOW, GLOW, BPC-157 + TB-500, CJC-1295 + Ipamorelin): units to draw and how much of each peptide one draw delivers. |
| `peptide_supply_calculator` | How long a vial lasts and how many vials a cycle needs, respecting how long a mixed vial keeps. |
| `peptide_lookup` | One peptide: published dose ranges and protocols, reconstitution, vial sizes, side effects, storage, half-life, FDA status. Every dose row carries its source label. |
| `peptide_compare` | Two peptides side by side, e.g. semaglutide vs tirzepatide, BPC-157 vs TB-500. |
| `peptide_search` | Find peptides by name, alias or topic (GLP-1, healing, sleep). |

Calculator tools use the same math as this repo and return a link to the matching calculator on the site. Dose ranges are labelled Clinical study, FDA / regulator, Protocol sites or Community reported: they describe what studies and communities report, not a recommendation.

## Claude (web and desktop)

1. Open **Settings > Connectors**.
2. Choose **Add custom connector**.
3. Name it `TruePeptideSource` and paste `https://truepeptidesource.com/mcp`.
4. Leave authentication empty and save.

## Claude Code

```sh
claude mcp add --transport http truepeptidesource https://truepeptidesource.com/mcp
```

## ChatGPT

On plans with developer mode: open **Settings**, turn on developer mode under connectors or apps, then add a connector with the URL `https://truepeptidesource.com/mcp` and no authentication.

## Cursor, Claude Desktop config files and other clients

Most clients read an `mcpServers` file (`.cursor/mcp.json`, `.mcp.json`, `claude_desktop_config.json` on clients that support remote servers):

```json
{
  "mcpServers": {
    "truepeptidesource": {
      "type": "http",
      "url": "https://truepeptidesource.com/mcp"
    }
  }
}
```

VS Code uses a `servers` key in `.vscode/mcp.json`:

```json
{
  "servers": {
    "truepeptidesource": {
      "type": "http",
      "url": "https://truepeptidesource.com/mcp"
    }
  }
}
```

## Try it with curl

```sh
curl -s https://truepeptidesource.com/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"peptide_reconstitution_calculator","arguments":{"vialAmount":10,"vialUnit":"mg","waterMl":2,"dose":2,"doseUnit":"mg"}}}'
```

Returns, among other fields: `"Draw 40 units on a U-100, 1 mL syringe (0.4 mL). The vial holds 5 full doses."`

## MCP Registry

[`server.json`](../server.json) follows the official MCP Registry schema. The namespace `com.truepeptidesource/*` is verified by a DNS TXT record on `truepeptidesource.com` (`v=MCPv1; k=ed25519; p=...`). Version 1.0.0 is already listed; a future change needs a new `version` before publishing with `mcp-publisher login dns --domain truepeptidesource.com` and `mcp-publisher publish`.
