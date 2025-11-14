# 📦 Release: vX.X.X — <Name of Release>

## 🔍 Overview
Provide a short summary of what this release delivers. Explain the purpose, key improvements, and why this release matters.

Example:
> This version enhances the threat intelligence workflow, improves log correlation accuracy, and adds a cleaner analyst dashboard.

---

## 🆕 New Features
List the major additions in bullet form with concise descriptions.

- ➕ Added <feature>
- ➕ Added <module / API endpoint>
- ➕ Added <dashboard component>

Example:
- Added AbuseIPDB threat feed ingestion module  
- Added SSH log parser with timestamp extraction  
- Added IOC correlation engine with alert storage  
- Added SOC analyst dashboard with alerts/logs/intel status sections

---

## 🔧 Improvements
Highlight usability, stability, security, or architectural upgrades.

- Improved <performance/accuracy/UI/etc>
- Refactored <code> for maintainability
- Enhanced <security/logging/etc>

Example:
- Improved correlation accuracy by normalizing IP sets  
- Refactored backend routing for clearer API structure  
- Enhanced error handling for intel fetch failures

---

## 🐛 Bug Fixes
Document resolved issues and edge cases.

- Fixed <bug>
- Fixed <edge case>
- Fixed <UI/API issue>

Example:
- Fixed parsing failure on SSH logs containing unusual timestamp formats  
- Fixed frontend alert table not refreshing after correlation run

---

## ⚠️ Breaking Changes (If Any)
Clarify anything that may break existing setups or requires manual intervention.

- <change> now behaves differently
- Removed <deprecated feature>

Example:
- Changed database schema for alerts; run `python -m backend.db --purge` before upgrading

---

## 📦 Deployment Notes
Call out essential upgrade steps, migrations, or configuration updates.

- Run: `python -m backend.db` to initialize/upgrade schema
- Add/update environment variable `<VAR>`
- Requires Docker image rebuild

Example:
- Update `.env` with new `OTX_API_KEY` field  
- Rebuild backend container to include latest dependencies

---

## 📝 Full Changelog
Provide a link to the GitHub compare view or enumerated commits/issues.

```
https://github.com/<org>/<repo>/compare/v(previous)...vX.X.X
```

---

## 🛡️ Security Notes
Surface any security-relevant context crucial for cybersecurity stakeholders.

- Reviewed inbound parsing for injection risks
- No user credentials stored
- API keys must be supplied via environment variables
- Added rate limiting to intel fetch endpoint

---

## 🙌 Contributors (Optional)
Recognise the people involved in the release.

Thanks to:
- @username — <role/contribution>
- @username — <role/contribution>

---

## 📑 License
Restate the project license for clarity.

> This release is distributed under the MIT License. See `LICENSE` for details.
