# DeepSeek Hermès handoff

This is the provider and source-root handoff for the portable agent hub. It is intentionally a configuration guide, not a copy of the full DeepSeek Harness source tree.

## Local source and portable bridge

- Current source project: `E:\deepseek harmees` on the source PC.
- Portable bridge: `E:\Agents\subagents\deepseek-hermes`.
- Provider profile target: `%USERPROFILE%\.dsh`.
- Source-root variable for the runner: `DEEPSEEK_HERMES_ROOT`.

The bridge contains the runner, `.env`, Gemini fallback pool, Hermes profile, model catalog/settings, headless/web profile manifests and the install script. Secret values are not repeated here.

## Execution route

1. Gemini remains the lead orchestrator and safety/zero-code gate.
2. A scoped builder task can be sent to DeepSeek Hermès through `run-subagent.mjs`.
3. The runner resolves the source root, launches the supported `apps/cli/src/bin.ts` headless entry from that root, and passes workspace-write only to the scoped subprocess.
4. DeepSeek is attempted first. The configured Gemini pool is used only when the first route fails or is unavailable.
5. The verifier checks the resulting diff and runtime evidence independently.

## Destination setup

Run the hub installer with Antigravity closed:

```powershell
powershell -ExecutionPolicy Bypass -File E:\Agents\install.ps1 -Agent Antigravity -RestoreNativeHistory
```

If the DeepSeek source is in another folder, set its root before using the runner:

```powershell
$env:DEEPSEEK_HERMES_ROOT = 'E:\deepseek harmees'
node E:\Agents\subagents\deepseek-hermes\run-subagent.mjs "scoped task"
```

Use `-SkipHermes` when a destination should receive skills and agents without installing the provider profile.

## Verification boundaries

The source and hub provider files were compared by size and SHA-256 on the source PC without printing secret values. The bridge installer was run in a temporary profile and `.credentials.yaml`, the gateway key file, and model settings were copied with matching hashes. This verifies packaging and file transfer; it does not prove that a free-tier account will accept a token on a different device. Account or device authorization can still be required.

Do not commit new credentials to a public repository, paste them into chat, or include them in project-flow datasets. Keep the private repository access controlled and rotate a credential if the repository or WhatsApp transfer leaves the intended private circle.

## Project behavior rules

DeepSeek receives a narrow task and relevant files after the lead gate. It must preserve existing API contracts, state transitions, permissions, tenant boundaries, checkout/payment flows and project instructions. For UI requests such as minimalism, glassmorphism or polymorphism, the lead performs the research and two-option comparison first, then sends the selected blueprint to the builder.
