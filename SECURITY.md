# Security Policy

## Supported version

The latest release on the `main` branch is supported.

## Reporting a vulnerability

Please do not open a public issue for a security problem. Instead, open a
private security advisory on GitHub (Security → Advisories → Report a
vulnerability) or contact the maintainer through GitHub. Include the
affected version, macOS version, reproduction steps and the impact you
observed. We will acknowledge the report as soon as possible and coordinate a
fix and disclosure.

## Scope

Q-Panel is a local-first desktop application. Relevant reports include, but
are not limited to:

- unsafe IPC or preload API exposure;
- path traversal or arbitrary file access through import/export;
- secret exposure in logs or workspace files;
- unsafe URL fetching / SSRF in link metadata;
- command injection or arbitrary code execution;
- unintended network requests or telemetry;
- Electron sandbox / context isolation regressions.

## Out of scope

- issues caused by third-party AI providers or their terms;
- data loss caused by deleting the local workspace or backups;
- ad-hoc signed builds being blocked by Gatekeeper;
- vulnerabilities in unsupported modified builds.
