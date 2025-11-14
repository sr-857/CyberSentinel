## Summary
Bolster CyberSentinel's confidence signal by adding an automated smoke CI workflow that runs backend unit tests and linting on pull requests.

## Why
Recruiters and contributors expect visible quality gates. A lightweight pytest run plus linting demonstrates DevSecOps maturity without heavy infrastructure.

## Requirements
- [ ] Add a GitHub Actions workflow `.github/workflows/ci.yml` triggered on pull_request and manual dispatch.
- [ ] Reuse `backend/requirements.txt` to install dependencies and execute `pytest` (create basic tests scaffold if needed).
- [ ] Run `flake8` or `ruff` linting (choose one) to enforce baseline code quality.
- [ ] Update the README badge block with a CI status badge once the workflow exists.

## Definition of Done
- Workflow green on pull requests.
- README shows CI badge.
- Tests + lint output succeed locally and in CI.
