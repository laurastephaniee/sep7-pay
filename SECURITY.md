# Security Policy

sep7-pay is a TypeScript library and CLI for SEP-7 payment request links and QR codes. It currently targets **Stellar testnet**; there
is no audited mainnet deployment yet. Treat it accordingly before handling
real funds.

## Reporting a vulnerability

**Please don't open a public issue for security problems.**

1. Open the [Security tab](https://github.com/laurastephaniee/sep7-pay/security) of this repository.
2. Click **Report a vulnerability** to start a private advisory.

Include what's affected, how to reproduce it (a failing test is ideal), and
the impact you expect. You'll get an acknowledgement on the advisory, and
a fix is coordinated there before anything is disclosed.

## What's in scope

Anything in this repository, especially URI validation and encoding, request signing and signature verification.

## Supported versions

Only the latest commit on `main` is supported. There are no tagged
releases yet, so fixes land on `main`.
