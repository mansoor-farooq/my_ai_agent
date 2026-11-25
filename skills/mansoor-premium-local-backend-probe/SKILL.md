---
name: mansoor-premium-local-backend-probe
description: Use when detecting or validating an Ollama, llama.cpp, vLLM, or other local model backend without assuming it is installed or reachable.
---

# Local backend probe

Probe through an injected, read-only command or host adapter. Record backend, model identity, context limit, device/runtime, readiness, and failure reason. Never invent a model name or silently switch providers.

Stop with `ready`, `unavailable`, or `unconfigured` evidence before planning local execution.
