---
name: agent-hub-operations
description: >-
  Maintain, install or route work through the Gemini-native Antigravity expert hub with bounded research and shared project memory.
  Use when changing this hub, its expert roster, skill assignments, or portable local package.
---

# Agent Hub Operations

Keep `production-orchestrator` as the only manager. The domain agents inherit the active Gemini model and own only their assigned field/task.

## Efficient routing

- Inspect project instructions and the relevant source before loading skills.
- Select only a few skill references that match the task; do not paste the skill catalog or unrelated chat history into a worker prompt.
- Use one domain expert for a bounded task. Add a reviewer only when a material security, data, payment, release or cross-domain risk warrants it.
- Keep handoffs to goal, owned paths, invariants, decisions, local checks and blockers.
- Store decisions and evidence, never hidden reasoning, keys, credentials, customer data or raw transcripts.

## Connector boundary

This kit includes no MCP configuration, OAuth setup, browser connector, external provider bridge or API-key router. Agents may use bounded `search_web` and `read_url_content` research for official references; `generate_image` is limited to an approved UI asset brief. Agents work with repository files and the skills already available in Antigravity. Never send secrets, private project files or customer data to research/image tools.

## Portable install

From the `E:\Agents` source checkout, run `install-antigravity-portable.ps1` to assemble and validate the local plugin ZIP. Copy the ZIP to the target machine, extract it, then run `agy plugin validate --strict <folder>` and `agy plugin install <folder>`. A local folder install does not require GitHub sign-in. The package installs manager and field specialists using `model: inherit` so they use that Antigravity runtime's Gemini model.
