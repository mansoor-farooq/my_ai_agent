---
name: dotnet-secrets-configuration
description: Use when configuring .NET options, environment-specific settings, user secrets, vaults, certificates or connection strings.
---

# .NET Configuration & Secrets

Map configuration providers and precedence before changing settings. Bind typed options and validate on startup. Keep local development secrets out of source control; use the deployment platform's secret store for production. Never print secret values in diagnostics. Document required variable names and safe examples, not credentials. Support rotation and fail fast on missing required configuration.
