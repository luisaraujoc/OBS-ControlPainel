const HOTKEY_PATTERN = /^Soundboard:\s*'(.+)'$/i;

const COLORS = [
  'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
  'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-emerald-500',
  'bg-green-600', 'bg-blue-600', 'bg-purple-600', 'bg-pink-600',
  'bg-yellow-600', 'bg-red-600', 'bg-indigo-600', 'bg-teal-600',
  'bg-orange-600', 'bg-cyan-600', 'bg-lime-600', 'bg-emerald-600',
  'bg-green-700', 'bg-blue-700', 'bg-purple-700', 'bg-pink-700',
  'bg-yellow-700', 'bg-red-700', 'bg-indigo-700', 'bg-teal-700',
];

const ICONS = ['🔊', '🎵', '🎧', '🎶', '📢', '🔔'];

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function extractSoundboardClips(hotkeyNames = []) {
  const clips = [];
  for (const name of hotkeyNames) {
    const match = name.match(HOTKEY_PATTERN);
    if (match) clips.push({ hotkeyName: name, clip: match[1] });
  }
  return clips;
}

export function buildButtonsFromHotkeys(hotkeyNames = []) {
  const clips = extractSoundboardClips(hotkeyNames);
  return clips.map(({ hotkeyName, clip }) => {
    const hash = hashString(hotkeyName);
    return {
      id: `sb_${hash.toString(36)}`,
      label: capitalize(clip),
      color: COLORS[hash % COLORS.length],
      icon: ICONS[hash % ICONS.length],
      obsPayload: { hotkeyName, contextName: '' },
    };
  });
}
