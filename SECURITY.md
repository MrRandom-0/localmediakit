# Security Policy

## Supported versions

Only the latest release is supported with security fixes.

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## The security model in one paragraph

LocalMediaKit has no backend, no accounts and no uploads: all processing
happens in the visitor's browser. The main risks are therefore (a) a bug
that causes a file or its contents to be sent somewhere, (b) a dependency
compromise, and (c) hosting misconfiguration — in particular serving the
app without the COOP/COEP headers the video engine needs, which fails
closed (the tool disables itself) rather than open.

## Reporting a vulnerability

Please do **not** open a public issue for a security problem.

Use GitHub's private vulnerability reporting on this repository
(**Security → Report a vulnerability**). Include:

- What the issue is and what an attacker could do with it
- Steps to reproduce, ideally with a throwaway sample file
- The version / commit and the browser you used

We aim to acknowledge reports within 7 days. This is a volunteer-maintained
project, so fixes land on a best-effort basis — but privacy bugs are treated
as the highest priority there is, because privacy is the entire point.

## Out of scope

- Vulnerabilities in ffmpeg, Whisper/Transformers.js or other upstream
  dependencies should be reported upstream as well; tell us too so we can
  bump the dependency.
- Issues that require a malicious browser extension or a compromised device.
