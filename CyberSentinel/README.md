# CyberSentinel

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
