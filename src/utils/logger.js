const MAX_ENTRIES = 200;
let entries = [];
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener(entries);
}

export function log(level, message, data) {
  const entry = {
    id: Date.now() + Math.random(),
    time: new Date(),
    level,
    message,
    data,
  };
  entries = [...entries, entry].slice(-MAX_ENTRIES);
  const prefix = `[OBS ${level.toUpperCase()}]`;
  if (level === 'error') console.error(prefix, message, data ?? '');
  else console.log(prefix, message, data ?? '');
  emit();
}

export const logInfo = (message, data) => log('info', message, data);
export const logError = (message, data) => log('error', message, data);
export const logWarn = (message, data) => log('warn', message, data);

export function getLogEntries() {
  return entries;
}

export function clearLogEntries() {
  entries = [];
  emit();
}

export function subscribeToLogs(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
