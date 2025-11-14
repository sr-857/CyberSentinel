"""Correlation logic for CyberSentinel."""
from __future__ import annotations

from collections import defaultdict
from typing import Dict, Iterable, List, Optional


def correlate_logs_with_iocs(
    log_events: Dict[str, Iterable[Dict[str, Optional[str]]]],
    iocs: Iterable[Dict[str, str]],
) -> List[Dict[str, str]]:
    """Return a list of alerts generated from IOC matches."""
    indicator_types = {ioc["indicator"]: ioc.get("type", "ipv4") for ioc in iocs}

    alerts: List[Dict[str, str]] = []
    matches: Dict[str, List[Dict[str, str]]] = defaultdict(list)

    for source, events in log_events.items():
        for event in events:
            ip = event.get("ip_address")
            if not ip or ip not in indicator_types:
                continue
            matches[ip].append({"source": source, "event": event})
            severity = "high" if source == "ssh" else "medium"
            alerts.append(
                {
                    "indicator": ip,
                    "log_source": source,
                    "severity": severity,
                    "message": f"IOC match for {ip} in {source} logs",
                    "event_time": event.get("event_time"),
                    "meta": {
                        "username": event.get("username"),
                        "request": event.get("request"),
                        "raw": event.get("raw"),
                    },
                }
            )

    if not alerts:
        alerts.append(
            {
                "indicator": "N/A",
                "log_source": "system",
                "severity": "info",
                "message": "No IOC matches detected",
                "event_time": None,
                "meta": {},
            }
        )

    return alerts
