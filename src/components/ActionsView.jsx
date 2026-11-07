import { useMemo, useState } from 'react';
import { useLongPress } from '../hooks/useLongPress';
import { getStreamerBotActionPins, saveStreamerBotActionPins } from '../utils/storage';

function ActionButton({ action, pinned, onFire, onTogglePin }) {
  const [flash, setFlash] = useState(false);

  const fire = () => {
    setFlash(true);
    if (navigator.vibrate) navigator.vibrate(40);
    onFire(action);
    setTimeout(() => setFlash(false), 200);
  };

  const longPress = () => {
    if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
    onTogglePin(action);
  };

  const handlers = useLongPress(longPress, fire);

  return (
    <button
      {...handlers}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-left text-white shadow-md select-none touch-pan-y transition-transform duration-100
        ${action.enabled ? 'bg-gray-800 active:bg-gray-700' : 'bg-gray-800/50'}
        ${flash ? 'scale-95 brightness-150' : 'scale-100'}`}
    >
      <span className="text-xl shrink-0">{pinned ? '⭐' : '⚡'}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium truncate">{action.name}</span>
        {action.group && (
          <span className="block text-[11px] text-gray-400 truncate">{action.group}</span>
        )}
      </span>
      {!action.enabled && (
        <span className="text-[10px] text-yellow-500/80 shrink-0">desativada</span>
      )}
    </button>
  );
}

export default function ActionsView({ sb }) {
  const { enabled, connected, info, actions, loadingActions, wsUrl, settings } = sb;
  const [query, setQuery] = useState('');
  const [pins, setPins] = useState(getStreamerBotActionPins);

  const togglePin = (action) => {
    setPins((prev) => {
      const next = prev.includes(action.id)
        ? prev.filter((x) => x !== action.id)
        : [...prev, action.id];
      saveStreamerBotActionPins(next);
      return next;
    });
  };

  const fire = (action) => sb.doAction(action.id, action.name);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.name.toLowerCase().includes(q) || a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  const pinnedActions = useMemo(
    () => filtered.filter((a) => pins.includes(a.id)),
    [filtered, pins]
  );

  const groups = useMemo(() => {
    const map = new Map();
    for (const a of filtered) {
      const key = a.group || 'Sem grupo';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        {/* Status do conector */}
        <div className="bg-gray-800 rounded-xl p-3 text-white shadow-md">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-3 h-3 rounded-full ${
                connected ? 'bg-green-500' : enabled ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span className="font-semibold text-sm">
              {connected
                ? `Streamer.bot conectado`
                : enabled
                  ? 'Procurando Streamer.bot...'
                  : 'Conector do Streamer.bot desligado'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 font-mono break-all">{wsUrl}</p>
          {connected && (info.name || info.version) && (
            <p className="text-[11px] text-gray-400 mt-1">
              {info.name || 'Streamer.bot'} v{info.version || '?'}
              {info.os ? ` · ${info.os}` : ''}
            </p>
          )}
          {!connected && enabled && (
            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
              No Streamer.bot: <span className="text-gray-300">Servers / Clients → WebSocket
              Server</span>, marque <span className="text-gray-300">Enabled</span>, porta{' '}
              <span className="text-gray-300">{settings.port}</span>, <span className="text-gray-300">Auto Start</span> ligado
              e autenticação desligada.
            </p>
          )}
          {!enabled && (
            <p className="text-[11px] text-gray-500 mt-2">
              Ative o conector em ⚙️ Configurações.
            </p>
          )}
        </div>

        {connected && (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar ações..."
              className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />

            {actions.length === 0 && !loadingActions && (
              <p className="text-center text-gray-400 text-sm bg-gray-900 rounded-xl p-4">
                Nenhuma ação encontrada no Streamer.bot. Crie ações lá e toque em
                "Atualizar".
              </p>
            )}

            {pinnedActions.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1">⭐ Favoritas</h2>
                <div className="flex flex-col gap-2">
                  {pinnedActions.map((a) => (
                    <ActionButton
                      key={`pin-${a.id}`}
                      action={a}
                      pinned
                      onFire={fire}
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </div>
            )}

            {groups.map(([group, list]) => (
              <div key={group}>
                <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1">{group}</h2>
                <div className="flex flex-col gap-2">
                  {list.map((a) => (
                    <ActionButton
                      key={a.id}
                      action={a}
                      pinned={pins.includes(a.id)}
                      onFire={fire}
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </div>
            ))}

            <p className="text-[11px] text-gray-500 text-center">
              Toque para disparar · segure para favoritar
            </p>
            <button
              onClick={sb.refreshActions}
              className="text-xs text-gray-400 underline self-center"
            >
              {loadingActions ? 'Atualizando...' : 'Atualizar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
