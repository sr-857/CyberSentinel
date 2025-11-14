# Semantic Versioning Guide

CyberSentinel follows [Semantic Versioning 2.0.0](https://semver.org/). Every release version must follow the `MAJOR.MINOR.PATCH` pattern.

## When to Increment Versions

| Segment | When to Bump | Examples |
| ------- | ------------ | -------- |
| MAJOR   | Incompatible API changes, breaking schema updates, or significant workflow changes that require manual intervention. | Removing an endpoint, changing alert schema.
| MINOR   | Backwards-compatible feature additions, analytics enhancements, new dashboards, or non-breaking configuration changes. | Adding a new intel feed, introducing chart widgets.
| PATCH   | Backwards-compatible bug fixes or security patches, minor UI tweaks, dependency bumps that do not change functionality. | Fixing log parsing bug, tightening error handling.

## Release Workflow Checklist

1. Update `CHANGELOG.md` with the new version section under `[Unreleased]`.
2. Confirm database migrations or breaking changes are documented.
3. Ensure documentation (README, release notes) reflects new behaviour.
4. Tag the release using `git tag vX.Y.Z` and push tags.
5. Publish release notes using the template in `docs/RELEASE_NOTES_TEMPLATE.md`.

## Pre-release Identifiers

Use suffixes for pre-release versions, for example:
- `v1.2.0-rc.1` (release candidate)
- `v1.2.0-beta.2` (beta builds)

These should only be used for testing and should be promoted to a stable release once validated.

## Build Metadata

If necessary, append build metadata with a plus sign: `v1.2.0+build.45`. Metadata is ignored for precedence and should be used sparingly (e.g., CI build numbers).

## Automations

The GitHub Actions workflow (`.github/workflows/release.yml`) validates tag naming and can automatically generate GitHub releases when tags are pushed. Ensure tags follow semantic versioning to avoid workflow failures.
