// This recognises explicit destructive operations. It is not a shell sandbox:
// dynamically constructed code and indirect child processes need host review.
const READ_SEARCH_COMMAND = /^\s*(?:Select-String|findstr|grep|rg|git\s+(?:log|show|diff|status|branch)|Get-Content|gc|cat|type)\b/i;
const DESTRUCTIVE = /(?:\b(?:destroy|drop|truncate|purge|diskpart|format-volume|clear-disk|clear-recyclebin|remove-item|remove-childitem|remove-object|erase|rmdir|rd|del|rm)\b|\bformat(?:\.com)?\s+(?:[A-Za-z]:|\/FS:)|\bgit\s+(?:clean|reset\s+--hard)\b|\b(?:fs\.)?(?:rmSync|rmdirSync|unlinkSync|truncateSync|ftruncateSync|rm|rmdir|unlink|truncate|ftruncate)\s*\(|\b(?:shutil\.rmtree|os\.remove|os\.unlink)\s*\()|^delete$/i;

export function isDestructiveCommand(command) {
  if (typeof command !== 'string' || !command.trim()) return false;
  if (READ_SEARCH_COMMAND.test(command)) return false;
  return DESTRUCTIVE.test(command);
}

export function isDestructiveAction(action) {
  if (!action || typeof action !== 'object') return false;
  return isDestructiveCommand(String(action.type || ''))
    || isDestructiveCommand(String(action.command || action.CommandLine || ''));
}
