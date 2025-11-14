# 🛡️ CyberSentinel

Status overview:

- 📦 Latest release: [GitHub Releases](https://github.com/sr-857/CyberSentinel/releases)
- 📄 License: [MIT](https://github.com/sr-857/CyberSentinel/blob/main/LICENSE)
- 🌐 Live demo: https://sr-857.github.io/CyberSentinel
- ✅ CI pipeline: https://github.com/sr-857/CyberSentinel/actions/workflows/ci.yml
- 🔍 CodeQL scan: https://github.com/sr-857/CyberSentinel/actions/workflows/codeql.yml
- 🐳 Docker image: https://hub.docker.com/r/sr857/cybersentinel
- ⭐ Stars & community: https://github.com/sr-857/CyberSentinel/stargazers

CyberSentinel is a production-ready threat intelligence and log correlation dashboard. It ingests IOCs from open threat feeds, parses SSH/Apache server logs, correlates log activity against known malicious indicators, and presents analysts with an actionable browser-based dashboard complete with KPI tiles and Chart.js visualisations.

## 🛠️ System Requirements

- Python ≥ 3.11
- Docker ≥ 24 (for containerized deployment)
- OS: Linux, macOS, or Windows (via WSL2 recommended)
- Memory: ≥ 512 MB (2 GB recommended for container workloads)
- Git + Make (optional) for developer tooling

## 🧱 Architecture Overview

The high-contrast platform flow highlights:

- **Threat Intel (blue)** — AbuseIPDB + AlienVault OTX collectors with deduplication and confidence scoring.
- **Log Ingestion (orange)** — Deterministic SSH/Apache parsing with regex capture groups.
- **Correlation Engine (purple)** — Severity scoring that differentiates SSH brute force vs. web anomalies.
- **Analytics Core (teal)** — Pandas-powered aggregation feeding KPI tiles, charts, and alert summaries.
- **Analyst Dashboard (green)** — Chart.js visualization layer connected to the Flask REST API.

### Backend
- **Flask API** exposes endpoints to fetch threat intel, parse logs, run IOC correlation, produce analytics, and retrieve alerts.
- **Threat Feeds** integrate with AbuseIPDB and AlienVault OTX (extendable to custom sources).
- **Log Parsing** supports SSH auth logs and Apache access logs.
- **Correlation Engine** matches log IPs against known IOCs, generating severity-based alerts.
- **SQLite Database** persists indicators, parsed log events, and alert history.
- **Analytics Module** aggregates IOC matches, SSH activity trends, and web anomalies for charting.

### Frontend
- Responsive dashboard for security analysts with real-time status updates.
- Controls to fetch intel, parse logs, run correlation workflows, and auto-refresh analytics.
- KPI tiles summarising event volumes and active alerts.
- Chart.js visualisations for SSH failures over time, top offending IPs, Apache status mix, and alert severity.
- Tables for Threat Intel, SSH failures, Apache access events, and Alerts.

### Data Layer
- `data/logs` contains realistic sample SSH and Apache logs.
- `data/intel` persists the downloaded IOCs (mounted volume in Docker).

## 🧠 Design Decisions

- **SQLite for persistence** — Embedded, zero-ops database with ACID semantics ideal for single-node SOC demos and quick resets.
- **Flask REST API** — Lightweight, composable routing with blueprints ready for Gunicorn deployment.
- **Chart.js visualisations** — Straightforward chart primitives that render crisply in GitHub Pages demos.
- **Threat intel normalisation** — Canonical indicator schema with source, first/last seen, and confidence fields for downstream enrichment.
- **Correlation severity model** — SSH matches default to `high`, web anomalies as `medium`, with room to extend to rule-based scoring.
- **Regex-driven log parsing** — Explicit, unit-tested patterns enabling deterministic extraction for security investigations.

## ⚡ Quickstart

### One-command local install

```bash
./install.sh
```

The script provisions a local virtual environment, installs dependencies, initialises SQLite, and launches the Flask dev server.

### Live Demo / GitHub Pages Preview
- Explore the static walkthrough at **https://sr-857.github.io/CyberSentinel** for an at-a-glance dashboard tour powered by sample data.

### Prerequisites
- Docker & Docker Compose
- AbuseIPDB + AlienVault OTX API keys (optional but recommended)

### Environment
Copy the example environment file and edit as required:

```bash
cp backend/.env.example backend/.env
# Set ABUSEIPDB_API_KEY and OTX_API_KEY if available
```

### Run with Docker Compose

```bash
docker compose up --build
```

- Backend available at `http://localhost:5000`
- Frontend dashboard at `http://localhost:8080`

### Local Development (Backend)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m backend.db           # initialise SQLite schema (use --purge to reset)
python -m backend.app          # launch Flask server (uses built-in dev server)
```

Then open `frontend/index.html` directly or serve via your preferred static server.

## API Endpoints

| Method | Endpoint                | Description                                         |
| ------ | ----------------------- | --------------------------------------------------- |
| GET    | `/health`               | Health check                                        |
| GET    | `/api/intel`            | Retrieve stored IOCs                                |
| GET/POST | `/api/intel/fetch`    | Pull intel from AbuseIPDB + OTX and persist         |
| GET/POST | `/api/logs/parse`     | Parse SSH + Apache logs and store events            |
| GET    | `/api/logs`             | Retrieve parsed log events (filter with `source`)   |
| GET/POST | `/api/correlation/run`| Correlate logs with IOCs and create alerts          |
| GET/POST | `/api/correlate`      | Alias for `/api/correlation/run`                    |
| GET    | `/api/alerts`           | Retrieve generated alerts                           |
| GET    | `/api/analytics/summary`| Aggregated KPIs/charts data for the dashboard       |
| GET/POST | `/api/workflow/refresh`| One-click intel → logs → correlation pipeline run |

### OpenAPI Specification

- Browse the minimal contract at [`docs/api/openapi.yaml`](docs/api/openapi.yaml) or import into Swagger UI/Postman for contract-first demos.

## Dashboard Preview

- Primary interactions: **Fetch Intel → Parse Logs → Run Correlation → Workflow Refresh**.
- Chart.js canvases highlight SSH failures over time, alert severity mix, and top offending IPs.
- Alerts surface IOC matches with severity scoring, timestamps, and contextual metadata for triage.
- Responsive analyst workspace with sidebar metrics, live status messaging, and workflow walkthrough.
- Accessibility-conscious controls: keyboard focus states, ARIA-live updates, and disabled-state management during long-running tasks.

## 🎯 Recruiter Walkthrough

Looking to demo CyberSentinel in under five minutes? Follow this script:

1. **Set the stage (30s)** — “CyberSentinel emulates a Tier-1/Tier-2 SOC workflow: ingest intel, parse logs, correlate IOCs, and deliver analyst-ready visuals.”
2. **Show the data sources (60s)** — Open `docs/RELEASE_NOTES_TEMPLATE.md` or `README` to highlight intel feeds (AbuseIPDB, OTX) and sample logs in `data/logs/`.
3. **Run the pipeline (120s)** — In a terminal, execute:
   ```bash
   python -m backend.app  # or docker compose up --build
   ```
   Visit `http://localhost:5000` (or `8080` via Docker) and click **Fetch Intel → Parse Logs → Run Correlation**.
4. **Explain the dashboard (90s)** — Walk through KPI tiles, charts (trends, top IPs, status mix, severity), and the tables showing raw intel/logs/alerts.
5. **Close with impact (30s)** — Emphasise automation: reusable intel collectors, deterministic parsing, and a workflow refresh endpoint that chains the entire pipeline.

Talking points:
- Built with Flask + Chart.js, deployable via Docker + Gunicorn.
- Release automation, semantic versioning, and security-conscious defaults (.env handling, .gitignore, API key practices).
- Extensible architecture: add feeds, logs, or correlation rules without rewriting the core.

## Why CyberSentinel Matters
- **Demonstrates security engineering depth** across data ingestion, parsing, correlation, analytics, and UI storytelling.
- **Showcases production-minded operations** with Docker deployment, release automation, and a GitHub Pages preview that mirrors analyst workflows.
- **Highlights portfolio-ready polish**: live badges, architecture diagram, and recruiter guidance make the project immediately legible to hiring managers.
- **Invites collaboration** through clearly scoped contribution issues and sample data for rapid onboarding.

## 🚨 SOC Scenario Demo

**Scenario: SSH brute force escalation**

1. Threat intel collectors ingest a suspicious IP (`203.0.113.7`) flagged by AbuseIPDB with high confidence.
2. SSH parser detects 40 failed logins against privileged accounts within five minutes.
3. Correlation engine scores a **Critical** alert, persisting evidence and severity rationale.
4. Analytics layer spikes alert severity counts, surfacing the IOC in KPI tiles and Chart.js breakdowns.
5. Analyst uses the dashboard to confirm malicious behaviour and trigger next-step response (ticketing, firewall block, etc.).

## Security Notes
- Use API keys via environment variables—never commit them.
- Logs and intel volumes are mounted read-only/read-write to prevent tampering.
- CORS is enabled for the static frontend; enforce origin restrictions when deploying.
- SQLite is sufficient for MVP; migrate to managed SQL for multi-user deployments.
- Ensure TLS termination in production (e.g., reverse proxy with HTTPS).

## 🚀 Future Enhancements
1. Add user authentication and RBAC for dashboard access.
2. Enrich alerts with GeoIP/ASN data and MITRE ATT&CK mappings.
3. Support additional log sources (e.g., Sysmon, firewall logs, cloud trail).
4. Implement scheduled background jobs/APScheduler for continuous intel ingestion.
5. Integrate with ticketing systems for automated alert escalation and reporting.

## 📁 Folder Structure

```
CyberSentinel/
├── backend/
│   ├── __init__.py
│   ├── analytics.py
│   ├── app.py
│   ├── correlation.py
│   ├── db.py
│   ├── intel_feeds.py
│   ├── log_parser.py
│   └── requirements.txt
├── data/
│   ├── intel/
│   └── logs/
├── docs/
│   ├── api/openapi.yaml
│   ├── images/
│   ├── index.html
│   └── releases/
├── frontend/
│   ├── dashboard.js
│   ├── index.html
│   └── styles.css
├── tests/
│   ├── __init__.py
│   ├── test_analytics.py
│   ├── test_correlation.py
│   └── test_log_parser.py
├── install.sh
├── CHANGELOG.md
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## ✅ Quality & Testing

- **Unit tests** live in `tests/` and validate log parsing, IOC correlation, and analytics aggregation.
- **CI pipeline** executes linting, `py_compile`, and `pytest` on every push/pr.
- **CodeQL security scanning** ensures static analysis coverage across the Python backend.

## 🗺️ Roadmap
- [ ] Webhook alert notifications ([#1](https://github.com/sr-857/CyberSentinel/issues/1))
- [ ] CI smoke tests ([#2](https://github.com/sr-857/CyberSentinel/issues/2))
- [ ] Role-based dashboard access
- [ ] Scheduled IOC ingestion

## 📅 Milestone Plan

Public GitHub milestones to pin next-phase commitments:

- **v1.1.0 — Alert Webhooks**: outbound Slack/Teams/email webhook integrations.
- **v1.2.0 — Scheduled IOC Ingestion**: APScheduler-based background collectors.
- **v1.3.0 — Role-Based Access**: analyst vs. admin dashboard modes with authentication.
- **v1.4.0 — Agent-based Log Collection**: lightweight endpoint agent streaming logs to CyberSentinel.

Track milestone burndown from **Issues → Milestones** to communicate delivery cadence.

## 📝 GitHub Publishing Checklist
- `gh repo edit sr-857/CyberSentinel --description "🛡️ CyberSentinel — Threat Intel + Log Correlation Dashboard…"` to set the tagline and SEO topics (`cybersecurity`, `threat-intelligence`, `soc-automation`, `flask`, `python`, `log-analysis`, `ioc-correlation`, `chartjs`, `docker`, `sqlite`, `security-analytics`).
- Tag the release: `git tag -a v1.0.0 -m "CyberSentinel v1.0.0 — Initial analyst-ready release"` then `git push origin v1.0.0`.
- Publish notes via `gh release create v1.0.0 --title "CyberSentinel v1.0.0" --notes-file docs/releases/v1.0.0.md`.
- Upload the banner designed in `docs/banner_concept.md` to polish the repository header.
- Pin the “Quick Demo for Recruiters” snippet near the top of the README or project description for instant context.

## 🐳 Docker Image Publishing

```
docker build -t sr857/cybersentinel:latest .
docker login -u sr857
docker push sr857/cybersentinel:latest
```

Once pushed, the Docker Hub badge above will reflect pull counts automatically.

## 🗒️ CHANGELOG

All releases are tracked in [`CHANGELOG.md`](CHANGELOG.md) using Keep a Changelog formatting.

## ⚖️ MIT License

```
Copyright (c) 2025 CyberSentinel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
