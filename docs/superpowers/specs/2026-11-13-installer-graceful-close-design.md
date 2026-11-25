# Installer Graceful Antigravity Close Design

## Intent

When a signed Mansoor Agent Hub installer or owner build runs while Antigravity is open, the installer should close Antigravity gracefully, wait for its plugin files to unlock, and then complete the update without forcing process termination.

## Goals

- Request a normal close for every running `Antigravity` process with a main window.
- Wait a bounded 45 seconds for all Antigravity processes, including helper processes, to exit.
- Continue package installation only after no Antigravity process remains.
- Return the existing safe defer code `42` when a process remains after the timeout.
- Make `npm run build` treat code `42` as a successful package build with a deferred active-install update.
- Preserve unsaved work by never using `Stop-Process -Force`.

## Non-goals

- No forced termination, service deletion, registry changes, or machine reboot.
- No changes to Antigravity projects, routes, APIs, permissions, or business logic.
- No attempt to dismiss user save dialogs or bypass host prompts.

## Approach

The generated signed installer owns one PowerShell helper, `Request-AntigravityGracefulClose`, used before package validation or plugin mutation. It calls `CloseMainWindow()` only on processes that expose a main window, polls all `Antigravity` processes for up to 45 seconds, and exits `42` with a clear message if any remain. The owner build invokes that installer as before; an exit code of `42` is reported as a deferred update rather than a failed package build.

## Constraints

- Windows 10/11 only, using built-in PowerShell process APIs.
- No new dependencies.
- Existing signed package and checksum flow remains unchanged.
- The current installer must still require administrator elevation before modifying the active plugin.

## Acceptance

- With Antigravity closed, installer behavior is unchanged and update proceeds.
- With Antigravity open and closable, installer requests close, waits, and proceeds.
- With a remaining/blocked process, installer exits `42`, performs no plugin mutation, and the owner build exits `0` with a deferred message.
- Tests prove graceful close calls, bounded wait, no force-kill, and code-42 handling.
