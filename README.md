# Patent Value Explorer

A web application that evaluates patent quality using ten indicators from the **OECD Patent Quality framework** (Squicciarini, Dernis & Criscuolo, 2013), plus a Breakthrough Invention flag (OECD "Breakthrough inventions") for patents in the top 1 % of their cohort - 11 of the 13 OECD concepts. Enter a patent publication number and receive a quality profile with normalized scores, a radar chart visualization, and an optional AI-generated narrative summary.

Built for the **EPO CodeFest 2026**.

## EPO CodeFest 2026

The [European Patent Office (EPO) CodeFest 2026](https://www.epo.org/en/news-events/in-focus/codefest/codefest-2026-patent-and-ip-portfolio-evaluation) challenges participants to build innovative tools using patent data. Patent Value Explorer combines real-time PATSTAT data with the OECD Patent Quality methodology.

The application runs on the **EPO Technology and Innovation Platform (TIP)** environment and can also be deployed locally for development.

## OECD Patent Quality Indicators

The scoring engine implements ten quality indicators from the OECD Patent Quality framework (Squicciarini, M., Dernis, H. & Criscuolo, C., 2013, "Measuring Patent Quality"), plus a Breakthrough Invention flag:

| #   | Indicator                  | OECD paper section      | Description                                                                                  |
| --- | -------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| 1   | **Forward Citations**      | "Forward citations"     | Technological impact - how many later patent families cite this patent                       |
| 2   | **Backward Citations**     | "Backward citations"    | Knowledge base breadth - how many prior-art references are cited                             |
| 3   | **Patent Scope**           | "Patent scope"          | Technological breadth - distinct CPC subclasses assigned to the patent                       |
| 4   | **Family Size**            | "Patent family size"    | International market relevance - number of jurisdictions in the DOCDB family                 |
| 5   | **Generality Index**       | "Generality index"      | Cross-field applicability - Herfindahl diversity of citing patents' CPC sections (on-demand) |
| 6   | **Originality Index**      | "Originality index"     | Breadth of knowledge sources - Herfindahl diversity of cited patents' CPC sections           |
| 7   | **Radicalness Index**      | "Radicalness index"     | Share of backward citations in CPC subclasses outside those of the focal patent              |
| 8   | **Grant Lag**              | "Grant lag"             | Examination speed - days from filing to grant                                                |
| 9   | **Number of Claims**       | "Claims"                | Scope of legal protection - number of patent claims                                          |
| 10  | **Renewal Duration**       | "Patent renewal"        | Sustained commercial value - maximum renewal fee year paid                                   |
| +   | **Breakthrough Invention** | "Breakthrough inventions" | Flag (not a score) - awarded when forward-citation percentile ≥ 99 in the cohort           |

Each indicator is normalized against the patent's **technology-field and filing-year cohort** (35 WIPO fields × 47 filing years, 1978–2024). The shipped cohort statistics (`src/lib/server/data/cohort-stats.json`) hold **16,348 cohorts**, one percentile distribution per (field, year, indicator) combination, covering all ten indicators; sparse cohorts are omitted. Scores are rendered on a 0.0–1.0 scale. A **Composite Quality Index** aggregates five of the six OECD composite components (Forward Citations, Family Size, Number of Claims, Originality, Radicalness) by equal weighting; Generality is excluded from the standard composite because computing it requires a ~16 GB per-patent scan and is offered on-demand.

## EPO TIP Deployment

Patent Value Explorer is designed to run on the EPO Technology and Innovation Platform (TIP) JupyterHub. A Jupyter Notebook launcher is included for one-click deployment.

### Using the Notebook Launcher


The only file you need is [`Patent_Value_Explorer.ipynb`](Patent_Value_Explorer.ipynb).

1. Download it from this repo (or: *File → Save Link As…* on the [raw link](https://raw.githubusercontent.com/mtcberlin/epo-tip-patent-value-explorer/refs/heads/main/Patent_Value_Explorer.ipynb)
2. Run all cells. The notebook will:
   - Install the PATSTAT MCP server and `psutil` (pip --user)
   - Install project dependencies via `npm ci`
   - Build the SvelteKit app
   - Start the PATSTAT MCP sidecar on port 8082 and the app on port 52080
   - Display a clickable link to the app and a Stop button
3. The app is accessible through a new tab in your browser. 

## Architecture

```
Patent Number (user input)
        |
        v
  +-----------+       +-----------------+       +----------+
  | SvelteKit | ----> | PATSTAT MCP     | ----> | BigQuery |
  | Server    |       | Server          |       | (EPO)    |
  +-----------+       +-----------------+       +----------+
        |
        v
  +-----------+       +-----------------+
  | Scoring   | ----> | Cohort          |
  | Engine    |       | Normalization   |
  +-----------+       | (16,348 cohorts)|
        |             +-----------------+
        v
  +-----------+       +-----------------+
  | Radar     |       | AI Narrative    |
  | Chart     |       | (Claude API)    |
  +-----------+       +-----------------+
        |                     |
        v                     v
  +-------------------------------+
  |   Patent Quality Dashboard    |
  +-------------------------------+
```

**Data Flow:**

1. User enters a patent publication number (e.g., EP1000000)
2. SvelteKit server queries the **PATSTAT MCP Server**, which retrieves patent data via BigQuery
3. The **Scoring Engine** computes ten OECD quality indicators from raw patent data
4. **Cohort Normalization** compares scores against pre-computed statistics (16,348 cohorts)
5. Results are displayed as a **Radar Chart** (LayerChart/D3) with indicator cards
6. An optional **AI Narrative** (Anthropic Claude API) generates a patent quality summary

## Tech Stack

| Technology                                                         | Version   | Purpose                                    |
| ------------------------------------------------------------------ | --------- | ------------------------------------------ |
| [SvelteKit](https://svelte.dev/docs/kit)                           | 2         | Full-stack framework                       |
| [Svelte](https://svelte.dev)                                       | 5 (Runes) | UI components with fine-grained reactivity |
| [TypeScript](https://www.typescriptlang.org)                       | 5.9       | Type-safe development                      |
| [Tailwind CSS](https://tailwindcss.com)                            | 4         | Utility-first styling                      |
| [shadcn-svelte](https://www.shadcn-svelte.com)                     | -         | Accessible UI components (Bits UI)         |
| [LayerChart](https://layerchart.com)                               | 2.0-next  | Chart visualizations (D3-based)            |
| [Valibot](https://valibot.dev)                                     | 1.x       | Runtime schema validation                  |
| [@sveltejs/adapter-node](https://svelte.dev/docs/kit/adapter-node) | 5.x       | Node.js server deployment                  |
| [Anthropic Claude API](https://docs.anthropic.com)                 | -         | AI narrative generation                    |


## Quick Start (Local Development)

**Prerequisites:** Node.js 20+, npm 10+

```bash
# Clone the repository
git clone https://github.com/mtcberlin/epo-tip-patent-value-explorer.git
cd epo-tip-patent-value-explorer

# Install dependencies (reproducible, uses committed package-lock.json)
npm ci --legacy-peer-deps

# Configure environment
cp .env.example .env
# Edit .env and set your PATSTAT_MCP_URL

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

The **Anthropic API key** for AI narrative generation is configured via the in-app **Settings dialog** (gear icon in the header). No environment variable is needed.

## AI Tool Disclosure

**Development:** This project was built with assistance from **Claude Code** (Anthropic, Claude Sonnet 4.5 and Claude Opus 4.6 across the CodeFest window), used as a pair-programming tool for code generation and refactoring, test writing, architecture decisions, and documentation drafting. All AI-generated code was reviewed and validated by the developers. The OECD methodology implementation follows the published academic framework (Squicciarini, Dernis & Criscuolo, 2013) and was verified against the original indicator definitions.

**Runtime:** The optional AI narrative uses the **Claude API** (Anthropic, model `claude-sonnet-4-5-20250929`). The application functions fully without it; all indicator scores, composite, radar chart, badges, and FAI are computed from PATSTAT data alone. Users supply their own Anthropic API key via the in-app Settings dialog; no key is shipped with the deployment.

## License

EPO and mtc.berlin keep all rights (Proprietary License). See [LICENSE](LICENSE) for details.
