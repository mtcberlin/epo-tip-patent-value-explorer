# Patent Value Explorer - EPO CodeFest 2026 Submission

## 1. Executive Summary

Patent Value Explorer (PVE) is a SvelteKit web application for evaluating patent quality with indicators from the OECD Patent Quality framework (Squicciarini, Dernis & Criscuolo, 2013). The user enters a patent publication number and receives normalized indicator scores, a radar chart, a composite quality index, and an optional AI-generated narrative.

PVE implements ten OECD Patent Quality indicators and adds a Breakthrough Invention flag driven by a cohort-relative forward-citation threshold (OECD §3.12), covering 11 of the 13 OECD concepts. The two not covered are Citations to Non-Patent Literature (§3.10), which requires a dataset not available in BigQuery PATSTAT, and X/I/Y-only Forward Citations (§3.13), which Squicciarini, Dernis & Criscuolo themselves describe as basically identical to standard forward citations.

Each indicator is normalized against the patent's technology-field and filing-year cohort (35 WIPO fields × 47 filing years, 1978–2024). The shipped cohort table holds **16,348 cohorts** (one percentile distribution per field × year × indicator; sparse combinations are omitted). Raw PATSTAT data is queried at request time through a PATSTAT MCP server that calls `epo.tipdata.patstat` and BigQuery from within the TIP environment.

**Deployment model:** PVE runs inside the **EPO Technology Intelligence Platform (TIP)** JupyterHub. The Jupyter notebook `Patent_Value_Explorer.ipynb` clones the repo, installs dependencies, builds the SvelteKit app, starts the PATSTAT MCP sidecar, and exposes the app through the JupyterHub proxy. The jury can run the submission inside their own TIP session without additional infrastructure.

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

PVE implements ten indicators from Squicciarini, Dernis & Criscuolo (2013), "Measuring Patent Quality: Indicators of Technological and Economic Value", OECD Science, Technology and Industry Working Papers, 2013/03:

| Indicator          | OECD Section | Measures                                                                                          |
| ------------------ | ------------ | ------------------------------------------------------------------------------------------------- |
| Forward Citations  | 3.1          | Technological impact - how many later patent families cite this patent                            |
| Backward Citations | 3.2          | Knowledge base breadth - how many prior-art references are cited                                  |
| Patent Scope       | 3.3          | Technological breadth - distinct CPC subclasses assigned to the patent                            |
| Family Size        | 3.4          | International market relevance - number of jurisdictions in DOCDB family                          |
| Generality Index   | 3.5          | Cross-field applicability - Herfindahl diversity of citing patents' CPC sections                  |
| Originality Index  | 3.6          | Breadth of knowledge sources - Herfindahl diversity of cited patents' CPC sections                |
| Radicalness Index  | 3.7          | Technological discontinuity - share of backward citations in CPC subclasses outside those of the focal patent |
| Grant Lag          | 3.8          | Examination speed - days from filing to grant; the UI presents lower values as positive (faster grant = higher normalized score) |
| Number of Claims   | 3.9          | Scope of legal protection - number of patent claims                                               |
| Renewal Duration   | 3.11         | Sustained commercial value - maximum renewal fee year paid                                        |

In addition, PVE covers **Breakthrough Inventions** (OECD §3.12) as a title-strip badge derived from the forward-citation percentile; no separate score is computed. See "Citation-rank title badge" below for the tier thresholds.

Formula notes:
- **Generality / Originality**: Herfindahl diversity `H = 1 - Σ(s_ij²)`, where `s_ij` is the share of (forward- or backward-) citing patents in CPC section `j`.
- **Radicalness**: `RAD = (1/n_BC) · COUNT(j : CPC(j) ∩ CPC(focal) = ∅)`, the share of backward citations whose CPC subclasses do not overlap with the focal patent's.
- **Patent Scope**: distinct count of 4-character CPC subclasses on the focal patent. CPC and IPC share the subclass taxonomy used in the OECD definition.

### Cohort Normalization

Raw indicator values are not comparable across technology fields or time periods: 10 forward citations in biotechnology mean something different than 10 in mechanical engineering. PVE normalizes each indicator against a cohort defined by the patent's primary WIPO technology field and filing year:

1. **Cohort lookup:** retrieve a pre-computed percentile distribution (p1, p5, p25, p50, p75, p95, p99) for the patent's (field, year, indicator) triple.
2. **Winsorization:** clamp the raw value to the [p1, p99] range.
3. **Linear scaling:** map the Winsorized value to 0.0-1.0 within the cohort's p1-p99 range.
4. **Percentile interpolation:** compute the patent's percentile position within its cohort by linear interpolation between the stored breakpoints.

Cohort statistics are pre-computed from PATSTAT on TIP using `epo.tipdata.patstat` and BigQuery, covering filing years 1978-2024. The output is a static JSON file (`src/lib/server/data/cohort-stats.json`, **16,348 cohorts**) that ships with the application; no runtime database is required for cohort lookups.

### Composite Quality Index

The Composite Quality Index follows the OECD 6-component composite (§4 of the paper cited above), implemented as an equal-weighted mean of five components:

```text
Composite = mean(Forward Citations, Family Size, Number of Claims,
                 Originality, Radicalness)
```

Generality is excluded because computing it requires a ~16 GB per-patent scan over every citing patent's CPC classes (see §4, Query Execution); it is offered on-demand via a button in the UI. Backward Citations, Patent Scope, Grant Lag, and Renewal Duration are reported as standalone indicators but, per the OECD framework, are not part of the composite.

When a component is unavailable (e.g. patent not yet granted, cohort data missing), the composite is computed from the remaining components and the count is shown (e.g. "based on 4 of 5 components").

### OECD / PVE provenance labelling

Each UI surface that carries either an OECD-defined or a PVE-added element shows a provenance badge:

- **OECD** (EPO blue): each of the 10 indicator cards and their methodology explanations.
- **PVE** (amber): the EPO Dimensions grouping (Technological Importance / Market Relevance), the Patent Archetype classification (Specialist / Generalist / Disruptor / Incremental), the Field Activity Index (adapted from the WIPO Patent Momentum Indicator), the composite component selection, and the qualitative percentile-interpretation labels ("Exceptionally high", "Average", etc.).

### Citation-rank title badge

Two tiers are rendered next to the patent title based on the forward-citation percentile:

- Percentile ≥ 99: "Breakthrough - Top 1%" (amber), corresponding to OECD §3.12.
- Percentile 90-98: "Highly Cited - Top 10%" (EPO blue).
- Percentile < 90: no badge; the percentile remains visible on the Forward Citations card.

### Field Activity Index (adapted from WIPO PMI)

PVE includes a Field Activity Index (FAI), adapted from the WIPO Patent Momentum Indicator, to add technology-field context. Each patent's WIPO field is annotated with an activity classification (HIGH, MEDIUM, or LOW), a compound annual growth rate, and an FAI score (`Z(activity) + Z(CAGR)`). The FAI is labelled PVE in the UI and carries a disclaimer that it is not an official WIPO product.

---

## 3. Functionality and Usability

### Core Interaction

A user enters a patent publication number and receives:

- A radar chart showing normalized scores for up to ten indicators
- Individual indicator cards with raw value, normalized score, cohort percentile, and a qualitative interpretation label
- A Composite Quality Index (OECD 5-of-6 subset)
- A Breakthrough or Highly-Cited badge when the forward-citation percentile reaches the threshold
- Field Activity Index (FAI) for the patent's technology field
- An optional AI-generated narrative and archetype classification
- Expandable methodology sections per indicator and for the composite

### Input Flexibility

The search bar accepts patent numbers in multiple formats:

- With or without spaces: `EP 1234567 B1` or `EP1234567B1`
- With separators: `EP-1,234,567/B1`
- Case insensitive: `ep1234567b1`
- With or without kind codes: `EP1234567` or `EP1234567B1`
- Supported authorities: EP, US, WO, DE, FR, GB, JP, KR, CN

### Response Times

- Reference patents (pre-computed JSON): under 100 ms
- Cached patents (in-memory, warm process): under 100 ms
- Fresh lookup without narrative (MCP + 9 BigQuery queries): 10-25 seconds
- Fresh lookup with AI narrative: add 3-8 seconds
- Generality Index (on-demand, ~16 GB BigQuery scan): 30-60 seconds

### Accessibility

PVE targets WCAG 2.1 AA:

- **Keyboard navigation:** the radar chart supports arrow-key cycling through axes; the search bar supports Enter to search and Escape to clear.
- **Screen-reader support:** semantic roles (`role="search"`, `role="application"`, `role="meter"`), ARIA labels on interactive elements, and text alternatives where applicable.
- **Bar-chart alternative:** a tabular bar chart with `role="meter"` and `aria-valuenow`/`aria-valuemin`/`aria-valuemax` on each bar is used on small viewports and is available to assistive technology.
- **Color contrast:** the two EPO-dimension colour pairs (blue for Technological Importance, teal for Market Relevance) meet at least 3:1 contrast against both light and dark backgrounds.
- **Motion safety:** transitions use Tailwind's `motion-safe:` prefix and `@media (prefers-reduced-motion: reduce)` suppresses animations system-wide.

### Methodology Transparency

Each indicator has an expandable methodology section showing:

- Calculation formula (and a plain-text display variant for Herfindahl-based indices)
- PATSTAT source tables
- Normalization method
- OECD section reference
- Reason shown when data is unavailable (distinguishing "not yet in reference cache" from "indicator not applicable to this patent")
- A short note identifying which parts of the card are PVE phrasings (story label, percentile-interpretation labels) and which are OECD-defined (the indicator and its formula)

### Reference Patent Collection

The homepage displays a curated set of 14 reference patents spanning eight WIPO fields (Semiconductors, Biotechnology, Computer technology, Electrical machinery, Chemical engineering, Control, Environmental technology, Telecommunications). Their quality profiles are pre-computed and shipped with the application in `src/lib/server/data/reference-patents.json`.

### Graceful Degradation

- Indicator failures are isolated: each query runs via `Promise.allSettled()`, so one failing indicator does not block the others.
- Missing indicators are shown as unavailable on the card and on the radar; the app does not surface raw error messages in this case.
- AI narrative failure is non-fatal: the patent profile is displayed without narrative, and a deterministic archetype classification (computed from the normalized scores) is used as fallback.
- FAI lookup failure is non-fatal: the patent is displayed without field-activity context.
- The Composite Quality Index is computed from the components that are available; the count is shown on the composite card.

---

## 4. Technical Implementation

### Tech Stack

| Component                | Technology                        | Version               |
| ------------------------ | --------------------------------- | --------------------- |
| Framework                | SvelteKit                         | 2.50.2                |
| UI                       | Svelte (Runes)                    | 5.49.2                |
| Language                 | TypeScript (strict mode)          | 5.9.3                 |
| Charts                   | LayerChart                        | 2.0.0-next.44         |
| UI primitives            | bits-ui (shadcn-svelte)           | 2.15.5                |
| CSS                      | Tailwind CSS                      | 4.1.18                |
| Input validation         | Valibot                           | 1.2.0                 |
| AI                       | Anthropic SDK (Claude Sonnet 4.5) | 0.74.0                |
| Icons                    | @lucide/svelte                    | 0.564.0               |
| Deployment adapter       | @sveltejs/adapter-node            | 5.5.3                 |
| Build                    | Vite                              | 7.3.1                 |
| Cohort and reference data | static JSON files in the repo     | n/a                   |
| Patent-result cache      | in-memory Map (Node process)      | n/a                   |
| PATSTAT access           | mtc.berlin PATSTAT MCP (BigQuery) | pinned to commit SHA  |

No runtime database is used. Cohort statistics and reference-patent profiles are shipped as JSON; per-patent results are cached in-memory for the lifetime of the Node process.

### Data Flow

```text
Patent Number (user input)
  -> Patent-number parser (validation, normalization)
  -> Route: /patent/[auth]/[number]
  -> 3-tier lookup:
      1. Reference patents JSON
      2. In-memory patent-result cache
      3. Fresh lookup via MCP + BigQuery
  -> On cache miss:
      -> MCP Server -> BigQuery (PATSTAT): patent metadata + primary WIPO field
      -> 9 parallel indicator queries (all except Generality, which is on-demand)
      -> Cohort normalization (per indicator, against the static JSON)
      -> Composite Quality Index: mean of 5 OECD components
      -> FAI lookup (static JSON)
      -> Anthropic API: narrative generation (optional, user-supplied key)
      -> Write to in-memory cache
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

Nine indicator queries run in parallel per patent via `Promise.allSettled()`: Forward Citations, Backward Citations, Family Size, Number of Claims, Originality Index, Radicalness Index, Patent Scope, Grant Lag, Renewal Duration. Each query is independent; a failure in one does not block the others. The MCP server enforces a 30-second timeout per query.

Generality Index is excluded from the automatic run (see §2, Composite Quality Index, for the rationale). It is available on-demand via a button on the profile page; once calculated, the result flows through the same normalization path as the other indicators.

### Storage Architecture

| Tier                      | Storage                                              | Contents                                     | Latency |
| ------------------------- | ---------------------------------------------------- | -------------------------------------------- | ------- |
| Reference patents         | `src/lib/server/data/reference-patents.json`         | 14 curated patents with pre-computed scores  | < 100 ms |
| Cohort statistics         | `src/lib/server/data/cohort-stats.json` (16,348 cohorts) | Percentile distributions per (field, year, indicator) | < 50 ms |
| WIPO PMI / FAI            | `src/lib/server/data/wipo-pmi.json`                  | Field-level activity metadata                | < 50 ms |
| Patent-result cache       | in-memory `Map` (Node process)                       | Full PatentProfile JSON, per publication     | < 10 ms |
| Fresh PATSTAT lookup      | MCP server -> BigQuery                               | Raw indicator inputs                         | 5-25 s  |

### Deployment model: EPO TIP JupyterHub

PVE runs inside the EPO Technology Intelligence Platform. The jury starts it from the notebook `Patent_Value_Explorer.ipynb`; no infrastructure setup is required.

Launch flow (`Patent_Value_Explorer.ipynb` + `launch.py`):

1. The notebook cell clones the repo into `~/patent_value_explorer` (or runs `git pull --ff-only` on subsequent runs).
2. `launch.py` verifies a Node.js runtime, then:
   - `pip install --user` the `mtc-patstat-mcp-lite` MCP server (pinned to a commit SHA) and `psutil`.
   - `npm ci --legacy-peer-deps` using the committed `package-lock.json`.
   - `npm run build` to produce the SvelteKit Node-adapter bundle (skipped when the build cache is fresh).
3. Two local processes are started:
   - The PATSTAT MCP sidecar on port 8082.
   - The SvelteKit app on port 52080 with `PATSTAT_MCP_URL=http://127.0.0.1:8082/mcp`.
4. The notebook displays a direct link via `JUPYTERHUB_SERVICE_PREFIX + proxy/52080/`, plus a Stop button that terminates both processes.

Orphaned ports from a previous kernel are cleaned up before start via `psutil`.

Why the TIP-inside model:

- The notebook is the only artefact the jury interacts with.
- PATSTAT access is included in the user's own TIP session, so no API keys, service accounts, or billing setup are involved.
- `cohort-stats.json` and `reference-patents.json` ship with the app, so the reference-patent homepage and cohort normalization work before any BigQuery call is made.

Health check: `GET /health` returns `{status, cohortStatsCount}` so the launcher can confirm the app is up and the shipped cohort dataset is intact.

Optional local development (not required for the submission) is documented in the README (`npm install`, `npm run dev`) with `PATSTAT_MCP_URL` pointing at a locally-run MCP server.

### Code Quality

- TypeScript strict mode across the codebase.
- No `any` in scoring logic; shared types in `src/lib/scoring/types.ts`.
- JSDoc comments on scoring functions reference the OECD section they implement.
- Valibot validates route parameters and MCP responses at system boundaries.
- ESLint and Prettier are configured for consistent formatting.
- 231 unit tests (`vitest`) covering indicators, normalization, composite, formatting, and the reference-patent mapper.

---

## 5. Impact on IP Valuation

### What PVE provides

PVE is quantitative patent-quality screening based on the OECD Patent Quality framework (see §2 for the full reference). Every score is derived from PATSTAT data and a documented cohort. Scores are reproducible: the same patent produces the same scores given the same cohort statistics.

The OECD/PVE provenance badges separate the two layers visually: the indicators and their formulas are OECD-defined; the story labels, archetypes, dimension grouping, and percentile-interpretation labels are PVE presentation choices, labelled as such.

### Use cases

- **IP portfolio screening:** compute quality indicators across a set of patents to identify those that warrant deeper analysis.
- **Technology-transfer assessment:** use patent-quality metrics as one input in technology-valuation decisions.
- **Prior-art quality triage:** gauge the relative significance of cited patents within their technology field and filing year.

### Complementary to expert assessment

Manual expert assessment covers legal, strategic, and market context that indicators cannot capture. PVE covers the quantitative layer that is expensive to compute by hand. The two are typically used at different stages: PVE as a first-pass screen, expert review for depth.

### Processing pace

A fresh lookup takes 10-25 seconds; a cached or reference patent takes under 100 milliseconds. The pace makes it practical to scan portfolios of dozens to hundreds of patents in a single session.

---

## 6. Disclosures

### Team Members and Organisation

Team composition and affiliations are listed in Section 1 ("Team"). All three members are affiliated with Moving Targets Consulting (mtc.berlin) and are participating in a personal capacity as natural persons. No other employer or affiliation applies to this submission.

### AI Tools Used in Development

- **Claude Code** (Anthropic, Claude Sonnet 4.5 and Claude Opus 4.6 across the CodeFest development window): used as a pair-programming assistant for code generation, refactoring, test writing, architecture review, and documentation drafting. All AI-generated code was reviewed and validated by the developers.

### AI Tools Used at Runtime

- **Claude API** (Anthropic, model `claude-sonnet-4-5-20250929`): generates the optional patent narrative summary. The application functions fully without it (all indicator scores, composite, radar chart, badges, FAI are computed from PATSTAT data alone). Users supply their own Anthropic API key via the in-app settings dialog; no key is shipped with the deployment.

### Open-Source Dependencies

All dependencies are available free of charge to EPO and other participants under the licenses listed. Generated from `package.json`:

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

- **mtc-patstat-mcp-lite** (MIT, MTC): thin MCP wrapper over `epo.tipdata.patstat`, used by `launch.py`. Pinned to a commit SHA for reproducibility.

### EPO Patent Knowledge Products and Services used

Per Section 6 of the Rules of Competition:

- **Technology Intelligence Platform (TIP):** used for PATSTAT access via BigQuery during cohort computation and per-patent queries.
- **PATSTAT Global:** the underlying dataset, accessed through TIP.

### Code Provenance

All code in the main source repository was developed within the CodeFest development window (5 December 2025 - 22 February 2026, extended to 19 April 2026). All dependent libraries are open-source and available free of charge to all participants and the EPO, as listed under "Open-Source Dependencies" above.

### Third-Party IP

No third-party material is included in the repository beyond the listed open-source dependencies and the EPO patent data accessed through TIP (as disclosed above). The code in this repository does not knowingly infringe any third-party intellectual property rights.
