# Patent Value Explorer - EPO CodeFest 2026 Submission

## 1. Executive Summary

Patent Value Explorer (PVE) is a web application that evaluates patent quality using indicators from the OECD Patent Quality framework (Squicciarini & Dernis, 2013). Users enter a patent publication number and receive a quality profile with normalized scores, a radar chart visualization, and an AI-generated narrative summary.

PVE implements ten OECD Patent Quality indicators and surfaces a Breakthrough Invention flag based on a cohort-relative forward-citation threshold (OECD §3.12) - 11 of the 13 OECD concepts. The two omitted ones (Citations to NPL, §3.10; X/I/Y-only Forward Citations, §3.13) require data outside BigQuery PATSTAT or are empirically redundant with standard Forward Citations.

Each indicator is normalized against the patent's technology-field and filing-year cohort (35 WIPO fields × 47 filing years, 1978–2024). The shipped cohort table holds **16,348 cohorts** (one percentile distribution per field × year × indicator, sparse combinations omitted). Raw PATSTAT data is queried in real time through a PATSTAT MCP server that calls `epo.tipdata.patstat` / BigQuery from within the TIP environment.

**Deployment model:** the application is designed to run inside the **EPO Technology Intelligence Platform (TIP)** JupyterHub. A one-cell Jupyter notebook (`Patent_Value_Explorer.ipynb`) clones the repo, installs dependencies, builds the SvelteKit app, starts the PATSTAT MCP sidecar, and exposes the app through the JupyterHub proxy. No external hosting is required - the jury can run the submission inside their own TIP session.

**Public Repository:** <https://github.com/mtcberlin/epo-tip-patent-value-explorer>

### Team

| Name                  | Role            | Organisation                           | Email                            |
| --------------------- | --------------- | -------------------------------------- | -------------------------------- |
| Arne Krüger           | Product Owner   | Moving Targets Consulting (mtc.berlin) | arne.krueger@mtc.berlin          |
| Matthias Schmidbauer  | Developer       | Moving Targets Consulting (mtc.berlin) | matze.schmidbauer@mtc.berlin     |
| Tom Lichtenstein      | Developer       | Moving Targets Consulting (mtc.berlin) | tom.lichtenstein@mtc.berlin      |

---

## 2. Creativity and Innovation

### OECD Patent Quality Indicators

PVE implements ten indicators from Squicciarini & Dernis (2013), "Measuring Patent Quality: Indicators of Technological and Economic Value", OECD Science, Technology and Industry Working Papers, 2013/03:

| Indicator          | OECD Section | Measures                                                                                          |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------- |
| Forward Citations  | 3.1          | Technological impact - how many later patent families cite this patent                            |
| Backward Citations | 3.2          | Knowledge base breadth - how many prior-art references are cited                                  |
| Patent Scope       | 3.3          | Technological breadth - distinct CPC subclasses assigned to the patent                            |
| Family Size        | 3.4          | International market relevance - number of jurisdictions in DOCDB family                          |
| Generality Index   | 3.5          | Cross-field applicability - Herfindahl diversity of citing patents' CPC sections                  |
| Originality Index  | 3.6          | Breadth of knowledge sources - Herfindahl diversity of cited patents' CPC sections                |
| Radicalness Index  | 3.7          | Technological discontinuity - share of backward citations in CPC subclasses outside the focal patent's |
| Grant Lag          | 3.8          | Examination speed - days from filing to grant (inverse framing in the UI)                         |
| Number of Claims   | 3.9          | Scope of legal protection - number of patent claims                                               |
| Renewal Duration   | 3.11         | Sustained commercial value - maximum renewal fee year paid                                        |

In addition, PVE surfaces a **Breakthrough Invention flag** (OECD §3.12) as a title-strip badge when the patent's forward-citation count lands in the top 1 % of its cohort. No separate score is computed; the flag reuses the existing forward-citation percentile.

Formula notes:
- **Generality / Originality**: Herfindahl diversity `H = 1 - Σ(s_ij²)`, where `s_ij` is the share of (forward- or backward-) citing patents in CPC section `j`.
- **Radicalness**: `RAD = (1/n_BC) · COUNT(j : CPC(j) ∩ CPC(focal) = ∅)`, the share of backward citations whose CPC subclasses do not overlap with the focal patent's.
- **Patent Scope**: distinct count of 4-character CPC subclasses on the focal patent. CPC and IPC share the subclass taxonomy used in the OECD definition.

### Cohort Normalization

Raw indicator values are not comparable across technology fields or time periods. A patent with 10 forward citations in biotechnology has different significance than 10 citations in mechanical engineering.

PVE normalizes each indicator against a cohort defined by the patent's primary WIPO technology field and filing year. The normalization process:

1. **Cohort lookup:** retrieve a pre-computed percentile distribution (p1, p5, p25, p50, p75, p95, p99) for the patent's (field, year, indicator) tuple.
2. **Winsorization:** clamp the raw value to the [p1, p99] range, removing outlier influence.
3. **Linear scaling:** map the Winsorized value to 0.0-1.0 within the cohort's p1-p99 range.
4. **Percentile interpolation:** calculate the patent's approximate percentile position within its cohort.

Cohort statistics are pre-computed from PATSTAT on the EPO Technology Intelligence Platform (TIP) using `epo.tipdata.patstat` against BigQuery, covering filing years 1978-2024. The output is a **static JSON file** (`src/lib/server/data/cohort-stats.json`, **16,348 cohorts**) that ships with the application - no runtime database is required for cohort lookups.

### Composite Quality Index

The Composite Quality Index follows the OECD 6-component composite (Squicciarini & Dernis 2013, §4), implemented as an equal-weighted mean of five components:

```
Composite = mean(Forward Citations, Family Size, Number of Claims,
                 Originality, Radicalness)
```

Generality is excluded from the standard composite because computing it requires a ~16 GB scan over every citing patent's CPC classes (see §4, Query Execution). It is offered on-demand via a button in the UI. Backward Citations, Patent Scope, Grant Lag, and Renewal Duration are reported as standalone indicators but, per Squicciarini & Dernis, are not part of the composite.

When some components are unavailable (e.g., no grant date, or cohort data missing), the composite is computed from the remaining available components and the count is always shown (e.g., "based on 4 of 5 components").

### OECD / PVE provenance labelling

Every UI surface carries an explicit provenance badge so that reviewers can tell at a glance which elements are OECD-defined and which are PVE additions:

- **OECD** (EPO blue) - attached to each of the 10 indicator cards and their methodology explanations.
- **PVE** (amber) - attached to PVE-specific layers: the EPO Dimensions grouping (Technological Importance / Market Relevance), the Patent Archetype classification (Specialist / Generalist / Disruptor / Incremental), the Field Activity Index (adapted from the WIPO Patent Momentum Indicator), the composite component selection, and the qualitative percentile-interpretation labels ("Exceptionally high" etc.) that frame the underlying OECD scores for non-specialist readers.

### Breakthrough title badge

When the patent's forward-citation percentile is in the top 1 % of its cohort, a "Breakthrough - Top 1%" badge (amber) is rendered next to the title. Between the 90th and 99th percentile, a "Highly Cited - Top 10%" badge (EPO blue) is shown instead. Below that, no badge is displayed - the information is still visible on the Forward Citations card.

### WIPO Patent Momentum Indicator (adapted)

PVE integrates a **Field Activity Index (FAI)**, adapted from the WIPO Patent Momentum Indicator (PMI), to provide technology-field context. Each patent's WIPO field is annotated with an activity classification (HIGH, MEDIUM, or LOW), a compound annual growth rate, and a composite FAI score. This layer is labelled PVE (not OECD) in the UI and carries an explicit disclaimer that it is not an official WIPO product.

---

## 3. Functionality and Usability

### Core Interaction

A user enters a patent publication number and receives:

- A radar chart showing normalized scores across up to ten quality indicators
- Individual indicator cards with raw value, normalized score, percentile position within the patent's cohort, and a qualitative interpretation
- A Composite Quality Index (OECD 5-of-6 subset)
- A Breakthrough or Highly-Cited badge when forward-citation rank warrants it
- Field Activity Index (FAI) for the patent's technology field
- An AI-generated narrative summarizing the patent's quality profile and an archetype classification
- Expandable methodology sections per indicator and per composite

### Input Flexibility

The search bar accepts patent numbers in multiple formats:

- With or without spaces: `EP 1234567 B1` or `EP1234567B1`
- With separators: `EP-1,234,567/B1`
- Case insensitive: `ep1234567b1`
- With or without kind codes: `EP1234567` or `EP1234567B1`
- Supported authorities: EP, US, WO, DE, FR, GB, JP, KR, CN

### Response Times

- Reference patents (pre-computed JSON): < 100 ms
- Cached patents (in-memory, warm process): < 100 ms
- Fresh lookups (MCP + BigQuery + AI narrative): 15-30 seconds
- Generality Index (on-demand, ~16 GB BigQuery scan): 30-60 seconds

### Accessibility

PVE targets WCAG 2.1 AA compliance:

- **Keyboard navigation:** the radar chart supports arrow-key cycling through axes; the search bar supports Enter to search, Escape to clear.
- **Screen-reader support:** semantic roles (`role="search"`, `role="application"`, `role="meter"`), ARIA labels on all interactive elements, and descriptive text alternatives.
- **Bar-chart alternative:** a tabular bar chart provides an accessible alternative to the radar chart, with `role="meter"` and `aria-valuenow`/`aria-valuemin`/`aria-valuemax` on each bar; it is also used as the mobile presentation.
- **Color contrast:** the two EPO-dimension colour pairs (blue for Technological Importance, teal for Market Relevance) are verified at 3:1+ contrast against both light and dark backgrounds.
- **Motion safety:** animations respect `prefers-reduced-motion`.

### Methodology Transparency

Each indicator has an expandable methodology section showing:

- Calculation formula (with a human-readable display variant for Herfindahl-based indices)
- PATSTAT source table and column
- Normalization method
- OECD section reference
- Explanation when data is unavailable (differentiating "not yet in reference cache" from "indicator not applicable to this patent")
- A consolidated disclaimer highlighting which elements of the card are PVE phrasings (story label, percentile-interpretation labels) vs. OECD-defined (the indicator itself)

### Reference Patent Collection

The homepage displays a curated collection of reference patents (14 entries spanning semiconductors, biotech, mechanical engineering, software and more) for exploration without needing to know patent numbers. These patents have pre-computed quality profiles shipped with the application (`src/lib/server/data/reference-patents.json`) for instant loading.

### Graceful Degradation

- Individual indicator failures do not prevent other indicators from displaying. Each indicator query runs independently via `Promise.allSettled()`.
- Missing indicators are shown as unavailable (greyed out on cards, dashed on the radar) - never as errors.
- AI narrative failure is non-fatal; the patent profile displays without narrative, with a deterministic archetype classification as fallback.
- FAI lookup failure is non-fatal; the patent displays without field-activity context.
- The Composite Quality Index adjusts to available components and always shows the count (e.g., "based on 4 of 5 components").

---

## 4. Technical Implementation

### Tech Stack

| Component                | Technology                        | Version               |
| ------------------------ | --------------------------------- | --------------------- |
| Framework                | SvelteKit                         | 2.50.2                |
| UI                       | Svelte (Runes)                    | 5.49.2                |
| Language                 | TypeScript (strict mode)          | 5.9.3                 |
| Charts                   | LayerChart                        | 2.0.0-next.44         |
| UI Primitives            | bits-ui (shadcn-svelte)           | 2.15.5                |
| CSS                      | Tailwind CSS                      | 4.1.18                |
| Input validation         | Valibot                           | 1.2.0                 |
| AI                       | Anthropic SDK (Claude Sonnet 4.5) | 0.74.0                |
| Icons                    | @lucide/svelte                    | 0.564.0               |
| Deployment adapter       | @sveltejs/adapter-node            | 5.5.3                 |
| Build                    | Vite                              | 7.3.1                 |
| Cohort & reference data  | static JSON files in the repo     | n/a                   |
| Patent-result cache      | in-memory Map (process lifetime)  | n/a                   |
| PATSTAT access           | mtc.berlin PATSTAT MCP (BigQuery) | pinned to commit SHA  |

No external database (SQL or otherwise) is part of the runtime. Cohort statistics and reference-patent profiles are shipped as JSON; per-patent results are cached in-memory for the lifetime of the Node process.

### Data Flow

```
Patent Number (user input)
  -> Patent-number parser (validation, normalization)
  -> Route: /patent/[auth]/[number]
  -> 3-tier lookup:
      1. Reference patents JSON (instant)
      2. In-memory patent-result cache (instant)
      3. Fresh lookup via MCP + BigQuery
  -> On cache miss:
      -> MCP Server -> BigQuery (PATSTAT): patent metadata + primary WIPO field
      -> 9 parallel indicator queries (all except Generality, which is on-demand)
      -> Cohort normalization (per indicator, against static JSON stats)
      -> Composite Quality Index: mean of 5 OECD components
      -> FAI lookup (static JSON)
      -> Anthropic API: narrative generation (optional)
      -> Cache write (in-memory map)
  -> Patent profile display
```

### PATSTAT Tables

PVE queries the following EPO PATSTAT Global tables:

| Table                      | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| tls201_appln               | Application data, filing dates, family size, citing family count        |
| tls202_appln_title         | Patent titles                                                           |
| tls206_person              | Applicant / inventor records                                            |
| tls207_pers_appln          | Person-application linkage                                              |
| tls211_pat_publn           | Publication data, kind codes, claim counts                              |
| tls212_citation            | Forward and backward citation relationships                             |
| tls224_appln_cpc           | CPC classification codes (used by Patent Scope, Originality, Radicalness, Generality) |
| tls228_docdb_fam_citn      | DOCDB family citations                                                  |
| tls230_appln_techn_field   | WIPO technology-field mapping (primary field selected via max weight)   |
| tls231_inpadoc_legal_event | Renewal-fee payment years                                               |
| tls901_techn_field_ipc     | WIPO-field metadata (names)                                             |

### Query Execution

Nine indicator queries run in parallel per patent (`Promise.allSettled()`):
Forward Citations, Backward Citations, Family Size, Number of Claims, Originality Index, Radicalness Index, Patent Scope, Grant Lag, Renewal Duration. Each query is independent; a failure in one does not block others. The MCP server enforces a 30-second timeout per query.

The **Generality Index** is excluded from automatic calculation because it requires aggregating CPC classes across every patent that cites the focal patent - a ~16 GB intermediate scan per request on tls224_appln_cpc. It is available on-demand via a button in the UI; once calculated, the result flows through the same normalization path as the other indicators.

### Storage Architecture

| Tier                      | Storage                                              | Contents                                     | Latency |
| ------------------------- | ---------------------------------------------------- | -------------------------------------------- | ------- |
| Reference patents         | `src/lib/server/data/reference-patents.json`         | 14 curated patents with pre-computed scores  | < 100 ms |
| Cohort statistics         | `src/lib/server/data/cohort-stats.json` (16,348 cohorts) | Percentile distributions per (field, year, indicator) | < 50 ms |
| WIPO PMI / FAI            | `src/lib/server/data/wipo-pmi.json`                  | Field-level activity metadata                | < 50 ms |
| Patent-result cache       | in-memory `Map` (Node process)                       | Full PatentProfile JSON, per publication     | < 10 ms |
| Fresh PATSTAT lookup      | MCP server -> BigQuery                               | Raw indicator inputs                         | 5-25 s  |

### Deployment model: EPO TIP JupyterHub

PVE is shipped as a self-contained Jupyter notebook that runs entirely inside the EPO Technology Intelligence Platform. The jury does not need to provision infrastructure.

**Launch flow** (`Patent_Value_Explorer.ipynb` + `launch.py`):

1. The notebook cell clones the repo into `~/patent_value_explorer` (or `git pull --ff-only` on subsequent runs).
2. `launch.py` verifies a Node.js runtime, then:
   - `pip install --user` the `mtc-patstat-mcp-lite` MCP server (pinned to a commit SHA) plus `psutil`.
   - `npm ci --legacy-peer-deps` using the committed `package-lock.json` (reproducible).
   - `npm run build` to produce the SvelteKit Node-adapter bundle (skipped when the build cache is fresh).
3. Two local processes are started:
   - The PATSTAT MCP sidecar on port **8082**.
   - The SvelteKit app on port **52080** with `PATSTAT_MCP_URL=http://127.0.0.1:8082/mcp`.
4. The notebook displays a direct link via `JUPYTERHUB_SERVICE_PREFIX + proxy/52080/`, and a Stop button that tears down both processes.

Orphaned ports from a previous kernel are cleaned up automatically before start via `psutil`.

**Why this shape?**

- **Zero infra on the jury's side.** The notebook is the only artefact they interact with.
- **PATSTAT access is free inside TIP.** Running the BigQuery calls from within the user's TIP session means no API keys, no service accounts, no billing.
- **Cohort data ships with the app.** `cohort-stats.json` and `reference-patents.json` are static files in the repo, so the static paths (reference patents, homepage, cohort normalization) work immediately - nothing to seed.

**Health check:** `GET /health` returns `{status, cohortStatsCount}` so the launcher can verify both that the app is alive and that the bundled cohort dataset is intact before surfacing the link.

**Optional local development** (not required for the submission) is documented in the README (`npm install`, `npm run dev`) with `PATSTAT_MCP_URL` pointing at a locally-run MCP server.

### Code Quality

- TypeScript strict mode throughout.
- No `any` in scoring logic; shared types in `src/lib/scoring/types.ts`.
- JSDoc comments on scoring functions include the OECD section reference they implement.
- Valibot for input validation on route parameters and MCP responses.
- ESLint + Prettier for consistent formatting.
- 230+ unit tests (`vitest`) covering indicators, normalization, composite, formatting, and the reference-patent mapper.

---

## 5. Impact on IP Valuation

### What PVE Enables

PVE provides automated, quantitative patent-quality screening based on an established academic methodology. The OECD Patent Quality framework (Squicciarini & Dernis, 2013) is peer-reviewed and uses publicly available PATSTAT data. Scores are reproducible - the same patent produces the same scores given the same cohort statistics.

The OECD/PVE provenance badges make the conceptual layering explicit: the numerical substrate is OECD-defined; the narrative overlays (story labels, archetypes, dimension grouping, percentile-interpretation text) are PVE presentation choices, clearly marked.

### Use Cases

- **IP portfolio screening:** quickly assess quality indicators across a set of patents to identify those warranting deeper analysis.
- **Technology-transfer assessment:** evaluate patent-quality metrics as one input in technology-valuation decisions.
- **Prior-art quality triage:** understand the relative significance of cited patents within their technology field and filing year.

### Complementary to Expert Assessment

Manual expert assessment provides qualitative analysis incorporating legal, strategic and market context that automated indicators cannot capture. PVE provides quantitative screening using OECD indicators. These serve different stages of patent evaluation - automated screening identifies patents for closer expert review, while expert assessment provides the depth needed for investment or licensing decisions.

### Processing Efficiency

PVE processes one patent in approximately 15-30 seconds (fresh lookup) or under 100 milliseconds (cached). This enables screening at a scale impractical through manual assessment alone.

---

## 6. Disclosures

### Team Members and Organisation

| Name                  | Organisation                           |
| --------------------- | -------------------------------------- |
| Arne Krüger           | Moving Targets Consulting (mtc.berlin) |
| Matthias Schmidbauer  | Moving Targets Consulting (mtc.berlin) |
| Tom Lichtenstein      | Moving Targets Consulting (mtc.berlin) |

### AI Tools Used in Development

- **Claude Code** (Anthropic, Claude Opus 4.6): pair-programming assistant used for code generation, refactoring, test writing, architecture review, and documentation drafting. All AI-generated code was reviewed and validated by the developers.
- **Claude Code** (Anthropic, earlier Sonnet and Opus generations): same role, used during the earlier phases of the CodeFest development window.

### AI Tools Used at Runtime

- **Claude API** (Anthropic, model `claude-sonnet-4-5-20250929`): generates patent narrative summaries at runtime. The AI component is optional - the application functions fully (all indicator scores, composite, radar chart, badges, FAI) without it. Users supply their own Anthropic API key via an in-app settings dialog; no key is shipped with the deployment.

### Open-Source Dependencies

All dependencies are available free of charge under permissive open-source licenses (inspected against `package.json`):

| Package                      | Version       | License    | Purpose                          |
| ---------------------------- | ------------- | ---------- | -------------------------------- |
| @sveltejs/kit                | 2.50.2        | MIT        | Web framework                    |
| @sveltejs/adapter-node       | 5.5.3         | MIT        | Node.js deployment adapter       |
| @sveltejs/vite-plugin-svelte | 6.2.4         | MIT        | Svelte Vite integration          |
| svelte                       | 5.49.2        | MIT        | UI framework                     |
| typescript                   | 5.9.3         | Apache-2.0 | Type system                      |
| vite                         | 7.3.1         | MIT        | Build tool                       |
| tailwindcss                  | 4.1.18        | MIT        | CSS framework                    |
| @tailwindcss/vite            | 4.1.18        | MIT        | Tailwind Vite plugin             |
| @tailwindcss/typography      | 0.5.19        | MIT        | Typography plugin                |
| bits-ui                      | 2.15.5        | MIT        | Accessible UI primitives         |
| layerchart                   | 2.0.0-next.44 | MIT        | Chart library (D3-based)         |
| d3                           | 7.9.0         | ISC        | Data/math utilities              |
| @lucide/svelte               | 0.564.0       | ISC        | Icons                            |
| valibot                      | 1.2.0         | MIT        | Runtime schema validation        |
| @anthropic-ai/sdk            | 0.74.0        | MIT        | Claude API client                |
| clsx                         | 2.1.1         | MIT        | Conditional class names          |
| tailwind-merge               | 3.4.0         | MIT        | Tailwind class de-duplication    |
| tailwind-variants            | 3.2.2         | MIT        | Tailwind variant helpers         |
| mode-watcher                 | 1.1.0         | MIT        | Dark-mode state                  |
| @internationalized/date      | 3.10.0        | Apache-2.0 | Date helpers                     |
| @google-cloud/bigquery       | 8.1.1         | Apache-2.0 | BigQuery client (dev / tooling)  |
| vitest                       | 4.0.18        | MIT        | Unit testing                     |
| @vitest/browser              | 4.0.18        | MIT        | Browser-mode testing             |
| @playwright/test             | 1.58.2        | Apache-2.0 | End-to-end testing               |
| jsdom                        | 28.0.0        | MIT        | DOM shim for tests               |
| eslint + typescript-eslint   | 9.39.2        | MIT        | Linting                          |
| prettier                     | 3.8.1         | MIT        | Formatting                       |
| svelte-check                 | 4.3.6         | MIT        | Svelte type-checking             |

Runtime Python dependency (TIP JupyterHub notebook launcher only):
- **mtc-patstat-mcp-lite** (MIT, MTC) - thin MCP wrapper over `epo.tipdata.patstat` used by `launch.py`. Pinned to commit SHA for reproducibility.

### EPO Patent Knowledge Products and Services used

Per Section 6 of the Rules of Competition:
- **Technology Intelligence Platform (TIP)** - used for live PATSTAT access via BigQuery during cohort computation and per-patent queries.
- **PATSTAT Global** - the underlying dataset, accessed through TIP.
