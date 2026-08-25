const STORAGE_KEY = 'custom_labels';
const DISCOVERED_KEY = 'discovered_buttons';
const CONNECTION_KEY = 'obs_connection_settings';

export function getCustomOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCustomOverride(buttonId, overrides) {
  const all = getCustomOverrides();
  all[buttonId] = { ...all[buttonId], ...overrides };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all;
}

export function resetCustomOverrides() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getDiscoveredButtons() {
  try {
    const raw = localStorage.getItem(DISCOVERED_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDiscoveredButtons(buttons) {
  localStorage.setItem(DISCOVERED_KEY, JSON.stringify(buttons));
}

export function getConnectionSettings() {
  try {
    const raw = localStorage.getItem(CONNECTION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConnectionSettings(settings) {
  localStorage.setItem(CONNECTION_KEY, JSON.stringify(settings));
}
