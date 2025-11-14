"""Threat intelligence feed integrations for CyberSentinel."""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


ABUSEIPDB_ENDPOINT = "https://api.abuseipdb.com/api/v2/blacklist"
OTX_PULSES_ENDPOINT = "https://otx.alienvault.com/api/v1/pulses/subscribed"
OTX_INDICATOR_EXPORT_ENDPOINT = "https://otx.alienvault.com/api/v1/indicators/export"


def _http_get(url: str, headers: Optional[Dict[str, str]] = None, params: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    try:
        response = requests.get(url, headers=headers, params=params, timeout=15)
        response.raise_for_status()
    except requests.RequestException as exc:
        logger.warning("Failed to fetch %s: %s", url, exc)
        return None
    try:
        return response.json()
    except ValueError:
        logger.warning("Non-JSON response received from %s", url)
        return None


def fetch_abuseipdb_blacklist(api_key: Optional[str], confidence_minimum: int = 50, limit: int = 500) -> List[Dict[str, Any]]:
    """Fetch IPv4 indicators from AbuseIPDB blacklist."""
    if not api_key:
        logger.debug("AbuseIPDB API key not configured; skipping fetch")
        return []

    headers = {"Key": api_key, "Accept": "application/json"}
    params = {
        "confidenceMinimum": confidence_minimum,
        "maxAgeInDays": 7,
    }
    data = _http_get(ABUSEIPDB_ENDPOINT, headers=headers, params=params)
    if not data or "data" not in data:
        return []

    iocs: List[Dict[str, Any]] = []
    for item in data.get("data", [])[:limit]:
        indicator = item.get("ipAddress")
        if not indicator:
            continue
        iocs.append(
            {
                "indicator": indicator,
                "type": "ipv4",
                "source": "abuseipdb",
                "first_seen": item.get("created"),
                "last_seen": item.get("lastReportedAt"),
                "confidence": item.get("abuseConfidenceScore"),
                "raw": item,
            }
        )
    return iocs


def fetch_otx_indicators(api_key: Optional[str], days: int = 7, limit: int = 500) -> List[Dict[str, Any]]:
    """Fetch AlienVault OTX indicators via the export endpoint."""
    if not api_key:
        logger.debug("OTX API key not configured; skipping fetch")
        return []

    headers = {"X-OTX-API-KEY": api_key}
    since = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    params = {"modified_since": since, "types": "IPv4,hostname"}

    try:
        response = requests.get(
            OTX_INDICATOR_EXPORT_ENDPOINT,
            headers=headers,
            params=params,
            timeout=20,
            stream=False,
        )
        response.raise_for_status()
        content = response.text
    except requests.RequestException as exc:
        logger.warning("Failed to fetch from OTX: %s", exc)
        return []

    iocs: List[Dict[str, Any]] = []
    for line in content.splitlines():
        if not line or line.startswith("#"):
            continue
        parts = line.split(",")
        indicator = parts[0].strip()
        indicator_type = parts[1].strip() if len(parts) > 1 else "ipv4"
        description = parts[2].strip() if len(parts) > 2 else ""
        if indicator:
            iocs.append(
                {
                    "indicator": indicator,
                    "type": "hostname" if "hostname" in indicator_type.lower() else "ipv4",
                    "source": "alienvault_otx",
                    "first_seen": None,
                    "last_seen": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "confidence": None,
                    "raw": {"description": description, "raw": line},
                }
            )
        if len(iocs) >= limit:
            break
    return iocs


def fetch_all_intel() -> List[Dict[str, Any]]:
    """Fetch indicators from all configured sources."""
    abuseipdb_key = os.getenv("ABUSEIPDB_API_KEY")
    otx_key = os.getenv("OTX_API_KEY")

    all_iocs: List[Dict[str, Any]] = []
    all_iocs.extend(fetch_abuseipdb_blacklist(abuseipdb_key))
    all_iocs.extend(fetch_otx_indicators(otx_key))

    logger.info("Fetched %d IOCs", len(all_iocs))
    unique_map = {ioc["indicator"]: ioc for ioc in all_iocs}
    return list(unique_map.values())
