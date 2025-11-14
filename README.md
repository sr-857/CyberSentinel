# CyberSentinel

<p align="center">
  <a href="https://github.com/sr-857/CyberSentinel/releases">
    <img alt="Version" src="https://img.shields.io/github/v/tag/sr-857/CyberSentinel?label=version&sort=semver&color=1f6feb" />
  </a>
  <a href="https://github.com/sr-857/CyberSentinel/blob/main/LICENSE">
    <img alt="MIT License" src="https://img.shields.io/badge/license-MIT-2ea043.svg" />
  </a>
  <a href="https://sr-857.github.io/CyberSentinel">
    <img alt="Live Demo" src="https://img.shields.io/badge/demo-live-1d4ed8.svg" />
  </a>
  <a href="https://github.com/sr-857/CyberSentinel/actions/workflows/ci.yml">
    <img alt="CI Status" src="https://github.com/sr-857/CyberSentinel/actions/workflows/ci.yml/badge.svg" />
  </a>
  <img alt="Docker Ready" src="https://img.shields.io/badge/docker-ready-0db7ed.svg?logo=docker&logoColor=white" />
  <a href="https://github.com/sr-857/CyberSentinel/stargazers">
    <img alt="GitHub Stars" src="https://img.shields.io/github/stars/sr-857/CyberSentinel?style=flat&color=facc15" />
  </a>
</p>

CyberSentinel is a production-ready threat intelligence and log correlation dashboard. It ingests IOCs from open threat feeds, parses SSH/Apache server logs, correlates log activity against known malicious indicators, and presents analysts with an actionable browser-based dashboard complete with KPI tiles and Chart.js visualisations.

## Architecture Overview

```
CyberSentinel/
├── backend/        # Flask REST API, persistence, correlation logic
├── frontend/       # Static dashboard (HTML/JS/CSS) served via Nginx
├── data/           # Sample logs and intelligence storage volume
├── Dockerfile      # Python 3.11 + Gunicorn container for backend
├── docker-compose.yml
└── README.md
```

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

## Quickstart

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

## System Architecture

![CyberSentinel Architecture](docs/images/architecture.png)

- Threat feeds and log sources flow into modular ingestion/parsing services.
- SQLite persists indicators, parsed events, and generated alerts, providing a deterministic data backbone.
- The analyst dashboard consumes REST endpoints for intel, logs, alerts, analytics, and a one-click refresh pipeline.

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

## Dashboard Preview

> _Screenshots coming soon_

- `frontend/index.html`
- Primary interactions via **Fetch Intel**, **Parse Logs**, **Run Correlation** buttons.
- KPI tiles update live alongside Chart.js visualisations for SOC situational awareness.

## Recruiter Walkthrough

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

## Security Notes
- Use API keys via environment variables—never commit them.
- Logs and intel volumes are mounted read-only/read-write to prevent tampering.
- CORS is enabled for the static frontend; enforce origin restrictions when deploying.
- SQLite is sufficient for MVP; migrate to managed SQL for multi-user deployments.
- Ensure TLS termination in production (e.g., reverse proxy with HTTPS).

## Future Enhancements
1. Add user authentication and RBAC for dashboard access.
2. Enrich alerts with GeoIP/ASN data and MITRE ATT&CK mappings.
3. Support additional log sources (e.g., Sysmon, firewall logs, cloud trail).
4. Implement scheduled background jobs/APScheduler for continuous intel ingestion.
5. Integrate with ticketing systems for automated alert escalation and reporting.

## Roadmap
- [ ] Webhook alert notifications ([#1](https://github.com/sr-857/CyberSentinel/issues/1))
- [ ] CI smoke tests ([#2](https://github.com/sr-857/CyberSentinel/issues/2))
- [ ] Role-based dashboard access
- [ ] Scheduled IOC ingestion

## GitHub Publishing Checklist
- `gh repo edit sr-857/CyberSentinel --description "🛡️ CyberSentinel — Threat Intel + Log Correlation Dashboard…"` to set the tagline and SEO topics (`cybersecurity`, `threat-intelligence`, `soc-automation`, `flask`, `python`, `log-analysis`, `ioc-correlation`, `chartjs`, `docker`, `sqlite`, `security-analytics`).
- Tag the release: `git tag -a v1.0.0 -m "CyberSentinel v1.0.0 — Initial analyst-ready release"` then `git push origin v1.0.0`.
- Publish notes via `gh release create v1.0.0 --title "CyberSentinel v1.0.0" --notes-file docs/releases/v1.0.0.md`.
- Upload the banner designed in `docs/banner_concept.md` to polish the repository header.
- Pin the “Quick Demo for Recruiters” snippet near the top of the README or project description for instant context.

## MIT License

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
