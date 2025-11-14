"""CyberSentinel backend application."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

try:
    from .analytics import build_dashboard_metrics
    from .correlation import correlate_logs_with_iocs
    from .db import Database
    from .intel_feeds import fetch_all_intel
    from .log_parser import load_and_parse
except ImportError:  # pragma: no cover - fallback when running as script
    from analytics import build_dashboard_metrics
    from correlation import correlate_logs_with_iocs
    from db import Database
    from intel_feeds import fetch_all_intel
    from log_parser import load_and_parse

load_dotenv()

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("cybersentinel")


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)

    db_path = os.getenv("CYBERSENTINEL_DB_PATH")
    app.config["DATABASE"] = Database(db_path)
    app.config["LOG_DIRECTORY"] = Path(os.getenv("CYBERSENTINEL_LOG_DIR", Path(__file__).resolve().parents[1] / "data" / "logs"))

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "ok"})

    @app.route("/api/intel", methods=["GET"])
    def get_intel():
        db: Database = app.config["DATABASE"]
        iocs = db.fetch_iocs(limit=request.args.get("limit", type=int))
        return jsonify({"count": len(iocs), "data": iocs})

    @app.route("/api/logs", methods=["GET"])
    def get_logs():
        db: Database = app.config["DATABASE"]
        source = request.args.get("source")
        events = db.fetch_log_events(source=source)
        return jsonify({"count": len(events), "data": events})

    @app.route("/api/alerts", methods=["GET"])
    def get_alerts():
        db: Database = app.config["DATABASE"]
        alerts = db.fetch_alerts(limit=request.args.get("limit", 200, type=int))
        return jsonify({"count": len(alerts), "data": alerts})

    @app.route("/api/intel/fetch", methods=["POST", "GET"])
    def fetch_intel():
        db: Database = app.config["DATABASE"]
        iocs = fetch_all_intel()
        stored = db.store_iocs(iocs)
        logger.info("Stored %d IOCs", stored)
        return jsonify({"stored": stored, "fetched": len(iocs)})

    @app.route("/api/logs/parse", methods=["POST", "GET"])
    def parse_logs_endpoint():
        db: Database = app.config["DATABASE"]
        log_dir: Path = app.config["LOG_DIRECTORY"]
        parsed = load_and_parse(log_dir.as_posix())
        totals: Dict[str, int] = {}
        for source, events in parsed.items():
            totals[source] = db.replace_log_events(source, events)
        logger.info("Parsed logs: %s", totals)
        return jsonify({"sources": totals})

    @app.route("/api/correlation/run", methods=["POST", "GET"])
    def run_correlation():
        db: Database = app.config["DATABASE"]
        log_dir: Path = app.config["LOG_DIRECTORY"]

        existing_logs: Dict[str, List[Dict[str, str]]] = {
            "ssh": db.fetch_log_events("ssh", limit=500),
            "apache": db.fetch_log_events("apache", limit=500),
        }

        if not existing_logs["ssh"] and not existing_logs["apache"]:
            parsed = load_and_parse(log_dir.as_posix())
            for source, events in parsed.items():
                db.replace_log_events(source, events)
            existing_logs = parsed

        iocs = db.fetch_iocs()
        alerts = correlate_logs_with_iocs(existing_logs, iocs)
        stored = db.store_alerts(alerts)
        logger.info("Correlation run: %d alerts", stored)
        return jsonify({"generated": len(alerts), "stored": stored, "alerts": alerts})

    @app.route("/api/analytics/summary", methods=["GET"])
    def analytics_summary():
        db: Database = app.config["DATABASE"]
        metrics = build_dashboard_metrics(db)
        return jsonify(metrics)

    @app.route("/api/correlate", methods=["POST", "GET"])
    def correlate_alias():
        return run_correlation()

    @app.route("/api/workflow/refresh", methods=["POST", "GET"])
    def workflow_refresh():
        responses = {
            "intel": fetch_intel().get_json(),
            "logs": parse_logs_endpoint().get_json(),
            "correlation": run_correlation().get_json(),
        }
        db: Database = app.config["DATABASE"]
        responses["analytics"] = build_dashboard_metrics(db)
        return jsonify(responses)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port)
