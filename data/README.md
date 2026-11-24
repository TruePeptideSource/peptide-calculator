# Peptide Evidence Index

One row per peptide (67 peptides and blends): how strong the human evidence is, the FDA status, and how many sources and dose protocols come from studies, regulators, protocol sites and communities.

- **Version / last updated:** 2026-11-07
- **Copied from:** https://truepeptidesource.com/data on 2026-11-24 (unchanged)
- **Files:** `peptide-evidence-index.csv` (flat) and `peptide-evidence-index.json` (same rows, plus totals, per-category counts and field notes)
- **Methodology:** https://truepeptidesource.com/methodology
- **License:** CC BY 4.0, see [LICENSE](LICENSE)

## Cite it

> TruePeptideSource, Peptide Evidence Index, https://truepeptidesource.com/data, CC BY 4.0

## Every number has a source label

Each source and each dose protocol on the site carries one of these labels:

| Label | Column suffix | Meaning |
|---|---|---|
| Clinical study | `clinical_study` | A published trial or study. |
| FDA / regulator | `regulatory` | FDA, HHS or another regulator: labels, approvals, policy. |
| Protocol sites | `protocol_sites` | Doses published on other peptide sites (dosing guides), not verified by any study. |
| Community reported | `community` | What people report on forums and in communities. |

Two minor labels also appear in the counts: `media` (news coverage) and `reference` (encyclopedias and reference works).

A protocol takes the **weakest** label among its sources, so a dose backed by both a trial and a forum counts as community.

## Columns (CSV)

| Column | Meaning |
|---|---|
| `slug` | Stable id; the page is `https://truepeptidesource.com/peptides/<slug>`. |
| `name` | Display name. |
| `url` | The peptide's page. |
| `categories` | Semicolon-separated categories, e.g. `weight_loss;longevity_mitochondrial`. |
| `is_blend` | `true` for multi-peptide vials (KLOW, GLOW, BPC-157 + TB-500). |
| `human_trials` | `none`, `limited`, `moderate` or `strong`: how much human trial evidence exists. |
| `animal_only` | `true` when the only evidence is animal or cell studies. |
| `fda_status` | `approved`, `approved_other_indication`, `investigational`, `compounding_category_1`, `compounding_category_2`, `compounding_category_3`, `hhs_503a_enforcement_discretion`, `not_evaluated`, `removed_or_withdrawn` or `unknown`. |
| `sources_total` | Sources cited on the page, counted once per label (a source cited for two labels counts under each). |
| `distinct_source_urls` | Distinct source URLs, whatever their label. |
| `sources_<label>` | Sources per label (see table above). |
| `protocols_total` | Dose protocols on the page. |
| `protocols_study_or_regulator` | Protocols where every source is a study or a regulator. |
| `protocols_<label>` | Protocols per label. |
| `updated_at` | When the record last changed (YYYY-MM-DD). |

The JSON file holds the same records in camelCase (`humanTrials`, `fdaStatus`, `sources: { clinical_study, ... }`) plus `totals`, `categories` and a `fields` glossary.

## Dose numbers

This index counts protocols; the dose numbers themselves, each with its label and sources, are on each peptide's page and available through the [MCP server](../docs/mcp.md) (`peptide_lookup`). They describe what studies and communities report, not a recommendation.
