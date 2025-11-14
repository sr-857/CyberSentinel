"""Database utilities for CyberSentinel.

This module provides a lightweight SQLite-backed persistence layer for
Indicators of Compromise (IOCs), parsed log events, and generated alerts.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional


class Database:
    """Simple SQLite wrapper used by the CyberSentinel backend."""

    def __init__(self, db_path: Optional[str] = None) -> None:
        default_path = Path(__file__).resolve().parent / "cybersentinel.db"
        self.db_path = Path(db_path).expanduser().resolve() if db_path else default_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _connection(self) -> Iterable[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _init_schema(self) -> None:
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS iocs (
                    indicator TEXT PRIMARY KEY,
                    type TEXT NOT NULL,
                    source TEXT NOT NULL,
                    first_seen TEXT,
                    last_seen TEXT,
                    confidence INTEGER,
                    raw JSON
                )
                """
            )
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS log_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    log_source TEXT NOT NULL,
                    event_time TEXT,
                    ip_address TEXT,
                    username TEXT,
                    request TEXT,
                    status_code INTEGER,
                    raw TEXT NOT NULL,
                    meta JSON
                )
                """
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_log_events_source ON log_events(log_source);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_log_events_ip ON log_events(ip_address);")
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    indicator TEXT NOT NULL,
                    log_source TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    event_time TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    meta JSON,
                    FOREIGN KEY (indicator) REFERENCES iocs(indicator)
                )
                """
            )
            cursor.close()

    def store_iocs(self, iocs: Iterable[Dict[str, Any]]) -> int:
        """Insert or update IOCs, returning the number processed."""
        count = 0
        with self._connection() as conn:
            query = (
                "INSERT INTO iocs (indicator, type, source, first_seen, last_seen, confidence, raw) "
                "VALUES (:indicator, :type, :source, :first_seen, :last_seen, :confidence, :raw) "
                "ON CONFLICT(indicator) DO UPDATE SET "
                "type=excluded.type, source=excluded.source, first_seen=excluded.first_seen, "
                "last_seen=excluded.last_seen, confidence=excluded.confidence, raw=excluded.raw"
            )
            for ioc in iocs:
                payload = dict(ioc)
                payload.setdefault("confidence", None)
                raw_json = json.dumps(payload, default=str)
                params = {
                    "indicator": payload.get("indicator"),
                    "type": payload.get("type", "ipv4"),
                    "source": payload.get("source", "unknown"),
                    "first_seen": payload.get("first_seen"),
                    "last_seen": payload.get("last_seen"),
                    "confidence": payload.get("confidence"),
                    "raw": raw_json,
                }
                conn.execute(query, params)
                count += 1
        return count

    def fetch_iocs(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        with self._connection() as conn:
            cursor = conn.cursor()
            sql = (
                "SELECT indicator, type, source, first_seen, last_seen, confidence "
                "FROM iocs ORDER BY COALESCE(last_seen, first_seen, indicator) DESC"
            )
            if limit:
                sql += " LIMIT ?"
                cursor.execute(sql, (limit,))
            else:
                cursor.execute(sql)
            rows = [dict(row) for row in cursor.fetchall()]
            cursor.close()
        return rows

    def replace_log_events(self, source: str, events: Iterable[Dict[str, Any]]) -> int:
        with self._connection() as conn:
            conn.execute("DELETE FROM log_events WHERE log_source = ?", (source,))
            query = (
                "INSERT INTO log_events (log_source, event_time, ip_address, username, request, status_code, raw, meta) "
                "VALUES (:log_source, :event_time, :ip_address, :username, :request, :status_code, :raw, :meta)"
            )
            count = 0
            for event in events:
                payload = dict(event)
                params = {
                    "log_source": source,
                    "event_time": payload.get("event_time"),
                    "ip_address": payload.get("ip_address"),
                    "username": payload.get("username"),
                    "request": payload.get("request"),
                    "status_code": payload.get("status_code"),
                    "raw": payload.get("raw", ""),
                    "meta": json.dumps(payload.get("meta", {}), default=str),
                }
                conn.execute(query, params)
                count += 1
        return count

    def fetch_log_events(
        self,
        source: Optional[str] = None,
        limit: int = 500,
    ) -> List[Dict[str, Any]]:
        with self._connection() as conn:
            cursor = conn.cursor()
            if source:
                cursor.execute(
                    "SELECT log_source, event_time, ip_address, username, request, status_code, raw "
                    "FROM log_events WHERE log_source = ? "
                    "ORDER BY COALESCE(event_time, '') DESC, id DESC LIMIT ?",
                    (source, limit),
                )
            else:
                cursor.execute(
                    "SELECT log_source, event_time, ip_address, username, request, status_code, raw "
                    "FROM log_events ORDER BY COALESCE(event_time, '') DESC, id DESC LIMIT ?",
                    (limit,),
                )
            rows = [dict(row) for row in cursor.fetchall()]
            cursor.close()
        return rows

    def store_alerts(self, alerts: Iterable[Dict[str, Any]]) -> int:
        with self._connection() as conn:
            query = (
                "INSERT INTO alerts (indicator, log_source, severity, message, event_time, meta) "
                "VALUES (:indicator, :log_source, :severity, :message, :event_time, :meta)"
            )
            count = 0
            for alert in alerts:
                payload = dict(alert)
                params = {
                    "indicator": payload.get("indicator"),
                    "log_source": payload.get("log_source"),
                    "severity": payload.get("severity", "medium"),
                    "message": payload.get("message", ""),
                    "event_time": payload.get("event_time"),
                    "meta": json.dumps(payload.get("meta", {}), default=str),
                }
                conn.execute(query, params)
                count += 1
        return count

    def fetch_alerts(self, limit: int = 200) -> List[Dict[str, Any]]:
        with self._connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, indicator, log_source, severity, message, event_time, created_at FROM alerts ORDER BY created_at DESC, id DESC LIMIT ?",
                (limit,),
            )
            rows = [dict(row) for row in cursor.fetchall()]
            cursor.close()
        return rows

    def purge(self) -> None:
        """Helper for tests to clear all stored state."""
        with self._connection() as conn:
            conn.execute("DELETE FROM alerts")
            conn.execute("DELETE FROM log_events")
            conn.execute("DELETE FROM iocs")


def main() -> None:
    parser = argparse.ArgumentParser(description="CyberSentinel database utility")
    parser.add_argument(
        "--db-path",
        dest="db_path",
        default=None,
        help="Path to the SQLite database (defaults to backend/cybersentinel.db)",
    )
    parser.add_argument(
        "--purge",
        action="store_true",
        help="Remove all stored alerts, logs, and IOCs",
    )
    args = parser.parse_args()

    db = Database(args.db_path)
    if args.purge:
        db.purge()
        print(f"Database purged at {db.db_path}")
    else:
        print(f"Database initialized at {db.db_path}")


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()
