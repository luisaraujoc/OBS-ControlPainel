const STORAGE_KEY = 'custom_labels';
const DISCOVERED_KEY = 'discovered_buttons';
const CONNECTION_KEY = 'obs_connection_settings';
const STREAMERBOT_KEY = 'streamerbot_connection_settings';
const SB_ACTION_PINS_KEY = 'streamerbot_action_pins';
const LAST_VIEW_KEY = 'last_view';
const OVERLAY_SETTINGS_KEY = 'overlay_settings';

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

// --- Streamer.bot ---------------------------------------------------------
// O host é o mesmo do OBS (mesma máquina na rede); aqui só guardamos a porta
// e se o conector está ligado. Streamer.bot WebSocket Server: sem autenticação.
const SB_DEFAULTS = { enabled: true, port: 4456 };

export function getStreamerBotSettings() {
  try {
    const raw = localStorage.getItem(STREAMERBOT_KEY);
    return raw ? { ...SB_DEFAULTS, ...JSON.parse(raw) } : { ...SB_DEFAULTS };
  } catch {
    return { ...SB_DEFAULTS };
  }
}

export function saveStreamerBotSettings(settings) {
  const merged = { ...getStreamerBotSettings(), ...settings };
  localStorage.setItem(STREAMERBOT_KEY, JSON.stringify(merged));
  return merged;
}

export function getStreamerBotActionPins() {
  try {
    const raw = localStorage.getItem(SB_ACTION_PINS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveStreamerBotActionPins(ids) {
  localStorage.setItem(SB_ACTION_PINS_KEY, JSON.stringify(ids));
}

// --- Última tela aberta ----------------------------------------------------
// Pra reabrir o app direto na tela em que o usuário estava, em vez de voltar
// pra Home sempre que o navegador fecha/recarrega.
export function getLastView() {
  try {
    return localStorage.getItem(LAST_VIEW_KEY) || null;
  } catch {
    return null;
  }
}

export function saveLastView(view) {
  try {
    localStorage.setItem(LAST_VIEW_KEY, view);
  } catch {
    // localStorage indisponível, ignora
  }
}

// --- Overlays (Pederas) ----------------------------------------------------
// Guarda, por tipo de overlay, qual fonte do OBS foi selecionada da última
// vez (pra não precisar escolher de novo a cada vez que abre a tela).
const OVERLAY_DEFAULTS = { sources: {} };

export function getOverlaySettings() {
  try {
    const raw = localStorage.getItem(OVERLAY_SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { sources: { ...OVERLAY_DEFAULTS.sources, ...parsed.sources } };
  } catch {
    return { ...OVERLAY_DEFAULTS };
  }
}

export function saveOverlaySource(role, sourceName) {
  const settings = getOverlaySettings();
  settings.sources[role] = sourceName;
  localStorage.setItem(OVERLAY_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}
