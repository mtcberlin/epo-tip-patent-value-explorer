# Patent Value Explorer

A web application that evaluates patent quality using eight indicators from the **OECD Patent Quality framework** (Squicciarini & Dernis, 2013). Enter a patent publication number and receive a quality profile with normalized scores, a radar chart visualization, and an AI-generated narrative summary.

Built for the **EPO CodeFest 2026**.

## EPO CodeFest 2026

The [European Patent Office (EPO) CodeFest 2026](https://www.epo.org/) challenges participants to build innovative tools using patent data. Patent Value Explorer addresses the need for accessible, transparent patent quality assessment by combining real-time PATSTAT data with established OECD methodology.

The application runs on the **EPO Technology and Innovation Platform (TIP)** JupyterHub environment and can also be deployed locally for development.

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

Each indicator is normalized against the patent's **technology-field and filing-year cohort** (35 WIPO fields x 25 filing years = 875 cohorts), producing comparable scores on a 0.0-1.0 scale. A composite **Patent Merit Index (PMI)** aggregates all indicators using equal weighting.

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
  +-----------+       | (875 cohorts)   |
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
2. SvelteKit server queries the **PATSTAT MCP Server**, which retrieves patent data from BigQuery
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
git clone https://github.com/your-org/patent-value-explorer.git
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

## EPO TIP JupyterHub Deployment

Patent Value Explorer is designed to run on the EPO Technology and Innovation Platform (TIP) JupyterHub. A Jupyter Notebook launcher is included for one-click deployment.

### Using the Notebook Launcher

1. Open `Patent_Value_Explorer.ipynb` in JupyterHub
2. Run all cells — the notebook will:
   - Install Node.js and pnpm (if needed)
   - Install project dependencies
   - Build the SvelteKit app
   - Start the server on port 52080
   - Display a clickable link to the app
3. The app is accessible through the JupyterHub proxy at your hub URL

### Manual Deployment

```bash
# Install and build
pnpm install
pnpm build

# Start production server
PORT=52080 node build/index.js
```

The standalone launcher script `launch.py` can also be used:

```bash
python launch.py
```

## Project Structure

```
src/
  lib/
    components/         # Svelte 5 UI components
      ui/               # shadcn-svelte base components
      RadarChart.svelte # D3/LayerChart radar visualization
      SettingsDialog.svelte
      ...
    scoring/
      types.ts          # Shared scoring type definitions
    server/
      ai/               # Anthropic Claude API integration
      data/             # Pre-computed cohort statistics (JSON)
      mcp/              # PATSTAT MCP client
      queries/          # Data queries and transformations
      scoring/          # OECD scoring engine & normalization
        indicators/     # Individual indicator calculations
        index.ts        # Main scoring orchestrator
        normalization.ts
        composite-index.ts
  routes/
    api/                # REST API endpoints
    patent/[number]/    # Patent detail page (SSR)
    health/             # Health check endpoint
    +page.svelte        # Homepage with reference patents
static/
  fonts/                # Self-hosted Inter & JetBrains Mono
Patent_Value_Explorer.ipynb  # Jupyter Notebook launcher
launch.py                    # Python launcher script
```

## AI Tool Disclosure

This project was developed with assistance from **Claude Code** (Anthropic Claude Opus), used as an AI pair-programming tool for:

- Code generation and refactoring
- Test writing
- Architecture decisions
- Documentation

All AI-generated code was reviewed and validated by the developer. The OECD methodology implementation follows the published academic framework (Squicciarini & Dernis, 2013) and was verified against the original indicator definitions.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
