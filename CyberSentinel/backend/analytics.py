"""Analytics utilities for CyberSentinel dashboard."""
from __future__ import annotations

from collections import Counter
from typing import Any, Dict, List

import pandas as pd

from .db import Database


def _to_dataframe(records: List[Dict[str, Any]]) -> pd.DataFrame:
    if not records:
        return pd.DataFrame()
    return pd.DataFrame(records)


def build_dashboard_metrics(db: Database) -> Dict[str, Any]:
    ssh_events = db.fetch_log_events("ssh", limit=2000)
    apache_events = db.fetch_log_events("apache", limit=2000)
    alerts = db.fetch_alerts(limit=500)

    ssh_df = _to_dataframe(ssh_events)
    apache_df = _to_dataframe(apache_events)
    alerts_df = _to_dataframe(alerts)

    ssh_top_ips: List[Dict[str, Any]] = []
    ssh_top_users: List[Dict[str, Any]] = []
    ssh_failures_over_time: List[Dict[str, Any]] = []

    if not ssh_df.empty:
        ip_counts = ssh_df["ip_address"].fillna("Unknown").value_counts().head(5)
        ssh_top_ips = [
            {"ip": ip, "count": int(count)}
            for ip, count in ip_counts.items()
        ]
        if "username" in ssh_df.columns:
            user_counts = ssh_df["username"].fillna("Unknown").value_counts().head(5)
            ssh_top_users = [
                {"username": user, "count": int(count)}
                for user, count in user_counts.items()
            ]
        if "event_time" in ssh_df.columns:
            times = ssh_df["event_time"].dropna()
            if not times.empty:
                parsed = pd.to_datetime(times, errors="coerce")
                grouped = parsed.dt.floor("H").value_counts().sort_index()
                ssh_failures_over_time = [
                    {"time": ts.isoformat(), "count": int(count)}
                    for ts, count in grouped.items()
                ]

    apache_top_paths: List[Dict[str, Any]] = []
    apache_status_counts: List[Dict[str, Any]] = []
    if not apache_df.empty:
        if "request" in apache_df.columns:
            def _extract_path(request: Any) -> str:
                if not isinstance(request, str):
                    return "/"
                parts = request.split()
                return parts[1] if len(parts) > 1 else "/"

            apache_df["path"] = apache_df["request"].map(_extract_path)
            path_counts = apache_df["path"].fillna("/").value_counts().head(5)
            apache_top_paths = [
                {"path": path, "count": int(count)}
                for path, count in path_counts.items()
            ]
        if "status_code" in apache_df.columns:
            status_counts = apache_df["status_code"].fillna("Unknown").astype(str).value_counts().head(5)
            apache_status_counts = [
                {"status": status, "count": int(count)}
                for status, count in status_counts.items()
            ]

    alert_severity_counts: List[Dict[str, Any]] = []
    latest_alerts = alerts[:5]
    if not alerts_df.empty and "severity" in alerts_df.columns:
        severity_counts = alerts_df["severity"].fillna("info").value_counts()
        alert_severity_counts = [
            {"severity": severity, "count": int(count)}
            for severity, count in severity_counts.items()
        ]

    return {
        "ssh_top_ips": ssh_top_ips,
        "ssh_top_users": ssh_top_users,
        "ssh_failures_over_time": ssh_failures_over_time,
        "apache_top_paths": apache_top_paths,
        "apache_status_counts": apache_status_counts,
        "alert_severity_counts": alert_severity_counts,
        "latest_alerts": latest_alerts,
        "totals": {
            "ssh_events": len(ssh_events),
            "apache_events": len(apache_events),
            "alerts": len(alerts),
        },
    }
