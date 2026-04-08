# Patent Value Explorer

A web application that evaluates patent quality using eight indicators from the **OECD Patent Quality framework** (Squicciarini & Dernis, 2013). Enter a patent publication number and receive a quality profile with normalized scores, a radar chart visualization, and an AI-generated narrative summary.

Built for the **EPO CodeFest 2026**.

## EPO CodeFest 2026

The [European Patent Office (EPO) CodeFest 2026](https://www.epo.org/en/news-events/in-focus/codefest/codefest-2026-patent-and-ip-portfolio-evaluation) challenges participants to build innovative tools using patent data. Patent Value Explorer addresses the need for accessible, transparent patent quality assessment by combining real-time PATSTAT data with established OECD methodology.

The application runs on the **EPO Technology and Innovation Platform (TIP)** environment and can also be deployed locally for development.

## OECD Patent Quality Indicators

The scoring engine implements eight quality indicators from the OECD Patent Quality Indicators database (Squicciarini, M. & Dernis, H., 2013, "Measuring Patent Quality"):

| #   | Indicator                   | Description                                                           |
| --- | --------------------------- | --------------------------------------------------------------------- |
| 1   | **Patent Scope**            | Number of IPC classes (breadth of protection)                         |
| 2   | **Breakthrough Invention**  | Originality based on citation diversity across technology fields      |
| 3   | **Radicalness**             | Citations spanning technology classes different from the patent's own |
| 4   | **Forward Citations (5yr)** | Number of times cited by later patents within 5 years                 |
| 5   | **Backward Citations**      | Number of prior-art references made                                   |
| 6   | **Claims Count**            | Number of independent and dependent claims                            |
| 7   | **Patent Family Size**      | Number of jurisdictions where protection is sought                    |
| 8   | **Grant Lag**               | Time from application filing to grant (efficiency signal)             |

Each indicator is normalized against the patent's **technology-field and filing-year cohort** ((35 WIPO fields + 665 Mainclasses) x 25 filing years = 13,072 cohorts), producing comparable scores on a 0.0-1.0 scale. A composite **Patent Merit Index (PMI)** aggregates all indicators using equal weighting.

## EPO TIP Deployment

Patent Value Explorer is designed to run on the EPO Technology and Innovation Platform (TIP) JupyterHub. A Jupyter Notebook launcher is included for one-click deployment.

### Using the Notebook Launcher


The only file you need is [`PATSTAT_Value_Explorer.ipynb`](PATSTAT_Value_Explorer.ipynb).

1. Download it from this repo (or: *File → Save Link As…* on the [raw link](https://raw.githubusercontent.com/mtcberlin/epo-tip-patentvalue-explorer/main/PATSTAT_Value_Explorer.ipynb))
2. Run all cells — the notebook will:
   - Install Node.js and pnpm (if needed)
   - Install project dependencies
   - Build the SvelteKit app
   - Start the server on port 52080
   - Display a clickable link to the app
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
  +-----------+       | (13,072 cohorts)   |
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
2. SvelteKit server queries the **PATSTAT MCP Server**, which retrieves patent data from PATSTAT
3. The **Scoring Engine** computes eight OECD quality indicators from raw patent data
4. **Cohort Normalization** compares scores against pre-computed statistics (13,072 cohorts)
5. Results are displayed as a **Radar Chart** (LayerChart/D3) with indicator cards
6. An optional **AI Narrative** (Anthropic Claude API) generates a human-readable patent quality summary

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

**Prerequisites:** Node.js 20+, [pnpm](https://pnpm.io) 9+

```bash
# Clone the repository
# Clone the repository (replace with your actual repo URL)
git clone <your-repo-url>
cd patent-value-explorer

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env and set your PATSTAT_MCP_URL

# Start development server
pnpm dev
```

The app will be available at `http://localhost:5173`.

The **Anthropic API key** for AI narrative generation is configured via the in-app **Settings dialog** (gear icon in the header). No environment variable is needed.

## AI Tool Disclosure

This project was developed with assistance from **Claude Code** (Anthropic Claude Opus), used as an AI pair-programming tool for:

- Code generation and refactoring
- Test writing
- Architecture decisions
- Documentation

All AI-generated code was reviewed and validated by the developer. The OECD methodology implementation follows the published academic framework (Squicciarini & Dernis, 2013) and was verified against the original indicator definitions.

## License

EPO and mtc.berlin keep all rights (Proprietary License). See [LICENSE](LICENSE) for details.
