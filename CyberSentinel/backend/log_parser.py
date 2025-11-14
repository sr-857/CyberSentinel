"""Log parsing utilities for CyberSentinel."""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Optional

SSH_LOG_PATTERN = re.compile(
    r"^(?P<month>\w{3})\s+(?P<day>\d{1,2})\s+(?P<time>\d{2}:\d{2}:\d{2})\s+"  # timestamp
    r"(?P<host>[\w.-]+)\s+sshd\[[^\]]+\]:\s+"  # host + sshd
    r"(?:(?P<message>Failed password for (invalid user )?(?P<user>[\w-]+) from (?P<ip>[0-9.]+) port (?P<port>\d+) ssh2)|"
    r"(?P<other>.*))"
)

APACHE_LOG_PATTERN = re.compile(
    r"^(?P<ip>[0-9.]+)\s+-\s+(?P<user>[\w-]+|-)?\s+\[(?P<datetime>[^\]]+)\]\s+\"(?P<request>[A-Z]+\s+[^\s]+\s+HTTP/[0-9.]+)\"\s+"
    r"(?P<status>\d{3})\s+(?P<size>\d+|-)(\s+\"(?P<referrer>[^\"]*)\"\s+\"(?P<agent>[^\"]*)\")?"
)

MONTH_MAP = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}


def _parse_ssh_timestamp(month: str, day: str, time_str: str, year: Optional[int] = None) -> str:
    year = year or datetime.utcnow().year
    month_num = MONTH_MAP.get(month, 1)
    dt = datetime.strptime(f"{year}-{month_num:02d}-{int(day):02d} {time_str}", "%Y-%m-%d %H:%M:%S")
    return dt.isoformat()


def parse_ssh_log(log_path: Path) -> List[Dict[str, Optional[str]]]:
    events: List[Dict[str, Optional[str]]] = []
    if not log_path.exists():
        return events

    with log_path.open("r", encoding="utf-8") as file_handle:
        for line in file_handle:
            line = line.strip()
            match = SSH_LOG_PATTERN.match(line)
            if not match or not match.group("message"):
                continue
            data = match.groupdict()
            events.append(
                {
                    "event_time": _parse_ssh_timestamp(data["month"], data["day"], data["time"]),
                    "ip_address": data.get("ip"),
                    "username": data.get("user"),
                    "raw": line,
                    "meta": {
                        "port": data.get("port"),
                        "host": data.get("host"),
                        "message": data.get("message"),
                    },
                }
            )
    return events


def parse_apache_access_log(log_path: Path) -> List[Dict[str, Optional[str]]]:
    events: List[Dict[str, Optional[str]]] = []
    if not log_path.exists():
        return events

    with log_path.open("r", encoding="utf-8") as file_handle:
        for line in file_handle:
            line = line.strip()
            match = APACHE_LOG_PATTERN.match(line)
            if not match:
                continue
            data = match.groupdict()
            raw_dt = data.get("datetime")
            try:
                dt = datetime.strptime(raw_dt, "%d/%b/%Y:%H:%M:%S %z") if raw_dt else None
            except ValueError:
                dt = None
            events.append(
                {
                    "event_time": dt.astimezone().isoformat() if dt else None,
                    "ip_address": data.get("ip"),
                    "username": None if data.get("user") in {"-", None} else data.get("user"),
                    "request": data.get("request"),
                    "status_code": int(data.get("status")) if data.get("status") else None,
                    "raw": line,
                    "meta": {
                        "bytes": int(data.get("size")) if data.get("size") and data.get("size").isdigit() else None,
                        "referrer": data.get("referrer"),
                        "user_agent": data.get("agent"),
                    },
                }
            )
    return events


def parse_logs(log_directory: Path) -> Dict[str, List[Dict[str, Optional[str]]]]:
    ssh_log = log_directory / "sample_auth.log"
    apache_log = log_directory / "sample_access.log"
    return {
        "ssh": parse_ssh_log(ssh_log),
        "apache": parse_apache_access_log(apache_log),
    }


def load_and_parse(log_dir: Optional[str] = None) -> Dict[str, List[Dict[str, Optional[str]]]]:
    """Convenience function used by the API."""
    base_dir = Path(log_dir).expanduser() if log_dir else Path(__file__).resolve().parents[1] / "data" / "logs"
    return parse_logs(base_dir)
