# Patent Value Explorer — EPO CodeFest 2026 Submission

## 1. Executive Summary

Patent Value Explorer (PVE) is a web application that evaluates patent quality using eight indicators from the OECD Patent Quality framework (Squicciarini & Dernis, 2013). Users enter a patent publication number and receive a quality profile with normalized scores, a radar chart visualization, and an AI-generated narrative summary.

Each indicator is normalized against the patent's technology-field and filing-year cohort (35 WIPO fields × 25 filing years = 875 cohorts), producing comparable scores on a 0.0–1.0 scale. Raw PATSTAT data is queried in real time via BigQuery.

**Live Demo:** https://epocodefest2026.mtc.berlin/

**Public Repository:** <!-- TODO: Insert public repository URL -->

### Team

<!-- TODO: Insert team members and organisation -->

| Name     | Role   | Organisation   |
| -------- | ------ | -------------- |
| [Name 1] | [Role] | [Organisation] |
| [Name 2] | [Role] | [Organisation] |
| [Name 3] | [Role] | [Organisation] |

---

## 2. Creativity and Innovation

### OECD Patent Quality Indicators

PVE implements eight indicators from Squicciarini & Dernis (2013), "Measuring Patent Quality: Indicators of Technological and Economic Value", OECD Science, Technology and Industry Working Papers, 2013/03:

| Indicator          | OECD Section | Measures                                                                                          |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------- |
| Forward Citations  | 3.1          | Technological impact — how many later patent families cite this patent                            |
| Backward Citations | 3.2          | Knowledge base breadth — how many prior art references are cited                                  |
| Family Size        | 3.4          | International market relevance — number of jurisdictions in DOCDB family                          |
| Generality Index   | 3.5          | Cross-field applicability — Herfindahl diversity of forward citations' technology classes         |
| Originality Index  | 3.6          | Breadth of knowledge sources — Herfindahl diversity of backward citations' technology classes     |
| Claims Count       | 3.7          | Scope of protection — number of patent claims                                                     |
| Grant Lag          | 3.8          | Examination complexity — days from filing to grant                                                |
| Renewal Duration   | 3.9          | Sustained commercial value — maximum renewal fee year paid                                        |

The Herfindahl formula for Generality and Originality: H = 1 − Σ(sij²), where sij is the share of citations in CPC section j.

### Cohort Normalization

Raw indicator values are not comparable across technology fields or time periods. A patent with 10 forward citations in biotechnology has different significance than 10 citations in mechanical engineering.

PVE addresses this by normalizing each indicator against a cohort defined by the patent's WIPO technology field and filing year. The normalization process:

1. **Cohort lookup:** Retrieve pre-computed percentile distribution (p1, p5, p25, p50, p75, p95, p99) from Turso for the patent's field/year/indicator combination.
2. **Winsorization:** Clamp the raw value to the [p1, p99] range, removing outlier influence.
3. **Linear scaling:** Map the Winsorized value to 0.0–1.0 within the cohort's p1–p99 range.
4. **Percentile interpolation:** Calculate the patent's approximate percentile position within its cohort.

Cohort statistics are pre-computed from PATSTAT via a Jupyter notebook pipeline and stored in Turso (~7,000 rows covering 35 fields × 25 years × 8 indicators).

### Composite Quality Index

The Composite Quality Index is the arithmetic mean of all available normalized indicator scores. If some indicators are unavailable (e.g., no grant date for pending patents), the index is computed from the remaining indicators. The number of contributing indicators is always displayed (e.g., "5 of 8 indicators").

### WIPO Patent Momentum Indicator

PVE integrates WIPO Patent Momentum Indicator (PMI) data to provide technology field context. Each patent's WIPO field is annotated with its activity classification (HIGH, MEDIUM, or LOW), compound annual growth rate, and PMI score.

---

## 3. Functionality and Usability

### Core Interaction

A user enters a patent publication number and receives:

- A radar chart showing normalized scores across up to eight quality indicators
- Individual indicator scores with percentile positions within the patent's cohort
- A Composite Quality Index
- An AI-generated narrative summarizing the patent's quality profile
- WIPO PMI data for the patent's technology field
- Expandable methodology sections per indicator

### Input Flexibility

The search bar accepts patent numbers in multiple formats:

- With or without spaces: `EP 1234567 B1` or `EP1234567B1`
- With separators: `EP-1,234,567/B1`
- Case insensitive: `ep1234567b1`
- With or without kind codes: `EP1234567` or `EP1234567B1`
- Supported authorities: EP, US, WO, DE, FR, GB, JP, KR, CN

### Response Times

- Reference patents (pre-computed): < 1 second
- Cached patents: < 1 second
- Fresh lookups (MCP + BigQuery + AI): 15–30 seconds
- Generality Index (on-demand, ~16 GB BigQuery scan): 30–60 seconds

### Accessibility

PVE targets WCAG 2.1 AA compliance:

- **Keyboard navigation:** The radar chart supports arrow key cycling through axes. The search bar supports Enter to search, Escape to clear.
- **Screen reader support:** Semantic roles (`role="search"`, `role="application"`, `role="meter"`), ARIA labels on all interactive elements, and descriptive text alternatives.
- **Bar chart alternative:** A tabular bar chart provides an accessible alternative to the radar chart, with `role="meter"` and `aria-valuenow`/`aria-valuemin`/`aria-valuemax` on each bar.
- **Color contrast:** Two base color pairs (blue for Technological Importance, teal for Market Relevance) verified at 3:1+ contrast against both light and dark backgrounds.
- **Motion safety:** Animations respect `prefers-reduced-motion` via `motion-safe:` CSS prefixes.

### Methodology Transparency

Each indicator has an expandable methodology section showing:

- Calculation formula
- PATSTAT source table and column
- Normalization method
- OECD section reference
- Explanation when data is unavailable

### Reference Patent Collection

The homepage displays a curated collection of reference patents for exploration without needing to know patent numbers. These patents have pre-computed quality profiles stored in Turso for instant loading. If the database is unavailable, three fallback patents are shown (PageRank, CRISPR-Cas9, blood glucose tracking).

### Graceful Degradation

- Individual indicator failures do not prevent other indicators from displaying. Each indicator query runs independently via `Promise.allSettled()`.
- Missing indicators are shown as unavailable (gray, dashed lines on radar chart, "N/A" in bar chart) — never as errors.
- AI narrative failure is non-fatal; the patent profile displays without narrative, with a deterministic archetype classification as fallback.
- PMI lookup failure is non-fatal; the patent displays without field activity context.
- The Composite Quality Index adjusts to available indicators and always shows the count (e.g., "5 of 8").

---

## 4. Technical Implementation

### Tech Stack

| Component     | Technology                        | Version               |
| ------------- | --------------------------------- | --------------------- |
| Framework     | SvelteKit                         | 2.50.2                |
| UI Library    | Svelte (Runes)                    | 5.49.2                |
| Language      | TypeScript (strict)               | 5.9.3                 |
| Database      | Turso Cloud (libSQL)              | @libsql/client 0.17.0 |
| ORM           | Drizzle ORM                       | 0.45.1                |
| Charts        | LayerChart                        | 2.0.0-next.44         |
| UI Components | bits-ui (shadcn-svelte)           | 2.15.5                |
| CSS           | Tailwind CSS                      | 4.1.18                |
| Validation    | Valibot                           | 1.2.0                 |
| AI            | Anthropic SDK (Claude Sonnet 4.5) | 0.74.0                |
| Icons         | @lucide/svelte                    | 0.564.0               |
| Deployment    | @sveltejs/adapter-node            | 5.5.3                 |
| Build         | Vite                              | 7.3.1                 |

### Data Flow

```
Patent Number (user input)
  → Patent number parser (validation, normalization)
  → Route: /patent/[auth]/[number]
  → 3-tier cache check:
      1. reference_patents table (pre-computed)
      2. patent_cache table (TTL: 1 year)
      3. MCP + BigQuery (fresh lookup)
  → If cache miss:
      → MCP Server → BigQuery (PATSTAT): patent metadata
      → 7 parallel BigQuery queries: indicator raw values
      → Turso: cohort normalization (per indicator)
      → Composite Quality Index: mean of available scores
      → Turso: WIPO PMI lookup
      → Anthropic API: narrative generation
      → Cache write (patent_cache)
  → Patent profile display
```

### PATSTAT Tables

PVE queries the following EPO PATSTAT Global tables:

| Table                      | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| tls201_appln               | Application data, filing dates, family size, citing family count |
| tls202_appln_title         | Patent titles                                                    |
| tls206_person              | Applicant/inventor records                                       |
| tls207_pers_appln          | Person-application linkage                                       |
| tls211_pat_publn           | Publication data, kind codes, claims count                       |
| tls212_citation            | Forward and backward citation relationships                      |
| tls224_appln_cpc           | CPC classification codes (for Herfindahl indices)                |
| tls228_docdb_fam_citn      | DOCDB family citations                                           |
| tls230_appln_techn_field   | WIPO technology field mapping                                    |
| tls231_inpadoc_legal_event | Renewal fee payment years                                        |
| tls901_techn_field_ipc     | WIPO field metadata                                              |

### Query Execution

Seven indicator queries run in parallel per patent using `Promise.allSettled()`. Each query is independent — a failure in one does not block others. The MCP server handles BigQuery execution with a 30-second timeout per query.

The Generality Index is excluded from automatic calculation due to its query size (~16 GB intermediate result). It is available on-demand via a button in the UI. Once calculated, the result is cached for subsequent visits.

### Caching Architecture

| Tier              | Storage                     | Contents                                         | Latency |
| ----------------- | --------------------------- | ------------------------------------------------ | ------- |
| Reference patents | Turso (`reference_patents`) | Pre-computed profiles for curated patents        | ~100 ms |
| Patent cache      | Turso (`patent_cache`)      | Full profiles as JSON, TTL 1 year                | ~100 ms |
| Cohort statistics | Turso (`cohort_stats`)      | Pre-computed percentile distributions per cohort | ~50 ms  |

### Deployment

- **Runtime:** Docker multi-stage build (Node.js 22 Alpine)
- **Adapter:** @sveltejs/adapter-node
- **Hosting:** Hetzner Cloud via Coolify
- **Health check:** GET `/health` — verifies Turso connectivity
- **Port:** 3000

### Code Quality

- TypeScript strict mode throughout
- No `any` types in scoring logic
- JSDoc comments on scoring functions with OECD section references
- Valibot for input validation
- Drizzle ORM for type-safe database queries
- ESLint + Prettier for consistent formatting

---

## 5. Impact on IP Valuation

### What PVE Enables

PVE provides automated, quantitative patent quality screening based on an established academic methodology. The OECD Patent Quality framework (Squicciarini & Dernis, 2013) is peer-reviewed and uses publicly available PATSTAT data. Scores are reproducible — the same patent produces the same scores given the same cohort statistics.

### Use Cases

- **IP portfolio screening:** Quickly assess quality indicators across a set of patents to identify those warranting deeper analysis.
- **Technology transfer assessment:** Evaluate patent quality metrics as one input in technology valuation decisions.
- **Prior art quality triage:** Understand the relative significance of cited patents within their technology field and filing year.

### Complementary to Expert Assessment

Manual expert assessment provides qualitative analysis incorporating legal, strategic, and market context that automated indicators cannot capture. PVE provides quantitative screening using OECD indicators. These serve different stages of patent evaluation — automated screening can identify patents for closer expert review, while expert assessment provides the depth needed for investment or licensing decisions.

### Processing Efficiency

PVE processes one patent in approximately 15–30 seconds (fresh lookup) or under 1 second (cached). This enables screening at a scale that is impractical through manual assessment alone.

---

## 6. Disclosures

### Team Members and Organisation

<!-- TODO: Insert team members and organisation (mandatory per Section 6, point 2) -->

| Name     | Organisation   |
| -------- | -------------- |
| [Name 1] | [Organisation] |
| [Name 2] | [Organisation] |
| [Name 3] | [Organisation] |

### AI Tools Used in Development

- **Claude Code** (Anthropic): Code generation assistance during development

### AI Tools Used at Runtime

- **Claude API** (Anthropic, model: `claude-sonnet-4-5-20250929`): Generates patent narrative summaries and archetype classifications at runtime. The AI component is optional — the application functions without it, providing all indicator scores and visualizations.

### Open-Source Dependencies

All dependencies are available free of charge under permissive open-source licenses:

| Package                | Version       | License    | Purpose                    |
| ---------------------- | ------------- | ---------- | -------------------------- |
| SvelteKit              | 2.50.2        | MIT        | Web framework              |
| Svelte                 | 5.49.2        | MIT        | UI framework               |
| TypeScript             | 5.9.3         | Apache-2.0 | Type system                |
| Drizzle ORM            | 0.45.1        | Apache-2.0 | Database ORM               |
| @libsql/client         | 0.17.0        | MIT        | Turso database client      |
| @anthropic-ai/sdk      | 0.74.0        | MIT        | Claude API client          |
| Tailwind CSS           | 4.1.18        | MIT        | CSS framework              |
| LayerChart             | 2.0.0-next.44 | MIT        | Chart library              |
| bits-ui                | 2.15.5        | MIT        | UI component primitives    |
| Valibot                | 1.2.0         | MIT        | Schema validation          |
| D3                     | 7.9.0         | ISC        | Math/data utilities        |
| @lucide/svelte         | 0.564.0       | ISC        | Icons                      |
| Vite                   | 7.3.1         | MIT        | Build tool                 |
| @sveltejs/adapter-node | 5.5.3         | MIT        | Node.js deployment adapter |
