# Marketplace Description Connectors

```yaml
id: CATALOG-MARKETPLACE-DESCRIPTION-CONNECTORS
status: active
owner: catalog orchestrator
created: 2026-06-30
source_goal: implementation-goals/GOAL-19-canonical-content-connectors.md
```

## Purpose

Catalog stores one canonical product description and renders marketplace-specific listing content through connectors. The connector contract prevents raw Allegro HTML, Bazos text, Aukro draft text, or FlipFlop storefront markup from becoming duplicated product truth.

## Canonical Document

`Product.descriptionRich` is a structured JSON document:

```json
{
  "version": 1,
  "locale": "cs-CZ",
  "blocks": [
    { "type": "heading", "level": 2, "text": "Key benefits" },
    { "type": "paragraph", "text": "Clean product description." },
    { "type": "bulleted_list", "items": ["Size M", "Black", "In stock"] },
    { "type": "table", "rows": [["Size", "Length"], ["M", "70 cm"]] }
  ]
}
```

Supported block types for Goal 19:

- `heading`
- `paragraph`
- `bulleted_list`
- `numbered_list`
- `table`
- `callout`

Unsupported or malformed blocks are normalized to safe paragraphs or ignored. `Product.description` remains clean plain text extracted from the canonical document or sanitized from legacy text.

## Connector Outputs

| Marketplace | Output format | Owner boundary |
|---|---|---|
| Allegro | limited HTML-like rendered body and text sections | Allegro service owns account, policy, draft, and publish lifecycle. |
| Bazos | plain text with compact bullets and table text | Bazos service owns identity, compliance, queueing, pacing, and publishing. |
| Aukro | plain/formatted text suitable for Aukro draft input | Aukro service owns account, policy, offer mutation, and publishing. |
| FlipFlop | structured blocks plus HTML preview for storefront UI | FlipFlop owns storefront projection, cart, checkout, and public UX. |

## Marketplace Profiles

`product_marketplace_profiles.overrides` may store small channel-specific values:

- `descriptionPrefix`
- `descriptionSuffix`
- `headline`
- `formatHints`
- marketplace category/parameter hints

`product_marketplace_profiles.source_data` may store imported raw payload evidence such as `rawDescriptionHtml`. Source data is never canonical unless a separate review flow converts it to `descriptionRich`.

## Adding A New Marketplace

1. Add a marketplace definition to the content renderer registry.
2. Define output format, unsupported blocks, length limits, and disallowed content.
3. Add tests for canonical document rendering and override behavior.
4. Add a preview tab in Catalog.
5. Add a service-local preview/import UI in the marketplace service.
6. Preserve the ownership boundary: Catalog emits content; the channel service owns platform accounts, compliance, and publication.
7. Update this contract and the relevant implementation goal/status evidence.

## Validation Requirements

Every connector must prove:

- canonical JSON renders without raw HTML leakage in plain-text channels;
- HTML-capable channels only receive allowed generated markup;
- overrides do not replace full canonical descriptions unless explicitly marked as channel-only;
- preview APIs are protected where they expose operational channel data;
- no secrets, tokens, customer data, or raw private payloads are written to logs or reports.
