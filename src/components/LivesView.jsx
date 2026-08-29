import { useLives } from '../hooks/useLives';

function fmtDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, '0');
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function platformEmoji(server = '') {
  if (/twitch\.tv|live-video\.net/i.test(server)) return '🟣';
  if (/youtube\.com/i.test(server)) return '🔴';
  if (/tiktok|restream/i.test(server)) return '⚫';
  if (/facebook|fbcdn/i.test(server)) return '🔵';
  if (/kick/i.test(server)) return '🟢';
  return '📡';
}

export default function LivesView({ obs }) {
  const lives = useLives(obs);
  const { primary, outputs, multistream, busyAll } = lives;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        {/* Iniciar / parar tudo */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={lives.startAll}
            disabled={busyAll}
            className="py-4 rounded-xl font-bold text-white bg-green-600 active:bg-green-700 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {busyAll ? '...' : '▶ Iniciar tudo'}
          </button>
          <button
            onClick={lives.stopAll}
            disabled={busyAll}
            className="py-4 rounded-xl font-bold text-white bg-red-700 active:bg-red-800 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {busyAll ? '...' : '⏹ Parar tudo'}
          </button>
        </div>

        {/* Saída primária do OBS */}
        <div className="bg-gray-800 rounded-xl p-4 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-3 h-3 rounded-full ${
                  primary.active
                    ? primary.reconnecting
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-green-500'
                    : 'bg-gray-500'
                }`}
              />
              <span className="font-semibold">Saída primária do OBS</span>
            </div>
            <span className="text-sm font-mono text-gray-300">
              {primary.active ? fmtDuration(primary.duration) : '--:--:--'}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            É a transmissão que o Twitch, o YouTube e as saídas do Aitum que usam o
            encoder principal precisam ter no ar primeiro. Se a live do YouTube estiver
            com autostart, ela sobe sozinha quando esta saída entra no ar.
          </p>
          <button
            onClick={primary.active ? lives.stopPrimary : lives.startPrimary}
            className={`w-full py-3 rounded-lg font-bold text-white active:scale-95 transition-transform ${
              primary.active ? 'bg-red-700 active:bg-red-800' : 'bg-green-600 active:bg-green-700'
            }`}
          >
            {primary.active ? '⏹ Parar saída primária' : '▶ Iniciar saída primária'}
          </button>
        </div>

        {/* Saídas do Aitum Multistream */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-sm font-semibold text-gray-300">Aitum Multistream</h2>
            {multistream.available && multistream.version && (
              <span className="text-[10px] text-gray-500">v{multistream.version}</span>
            )}
          </div>

          {multistream.available === null && (
            <p className="text-center text-gray-400 text-sm py-4">Verificando...</p>
          )}

          {multistream.available === false && (
            <p className="text-center text-gray-400 text-sm bg-gray-900 rounded-xl p-4">
              O Aitum Multistream instalado não expõe controle via obs-websocket
              (precisa da build do PR #19). Só a saída primária fica disponível aqui.
            </p>
          )}

          {multistream.available && outputs.length === 0 && (
            <p className="text-center text-gray-400 text-sm bg-gray-900 rounded-xl p-4">
              Nenhuma saída configurada no dock do Aitum Multistream.
            </p>
          )}

          <div className="flex flex-col gap-2">
            {outputs.map((o) => {
              const blockedByMain = o.requires_main && !primary.active && !o.active;
              return (
                <div key={o.name} className="bg-gray-800 rounded-xl p-3 text-white shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                          o.active ? 'bg-green-500' : 'bg-gray-500'
                        }`}
                      />
                      <span className="text-lg shrink-0">{platformEmoji(o.stream_server)}</span>
                      <span className="font-medium truncate">{o.name}</span>
                    </div>
                    <button
                      onClick={() => (o.active ? lives.stopOutput(o.name) : lives.startOutput(o.name))}
                      disabled={o.busy || blockedByMain}
                      className={`text-sm px-3 py-1.5 rounded-lg font-semibold shrink-0 text-white disabled:opacity-40 ${
                        o.active ? 'bg-red-700 active:bg-red-800' : 'bg-green-600 active:bg-green-700'
                      }`}
                    >
                      {o.busy ? '...' : o.active ? 'Parar' : 'Iniciar'}
                    </button>
                  </div>
                  {blockedByMain && (
                    <p className="text-[11px] text-yellow-500/80 mt-2">
                      Precisa da saída primária no ar (usa o encoder principal).
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={lives.refresh}
          className="text-xs text-gray-400 underline self-center mt-1"
        >
          Atualizar
        </button>
      </div>
    </div>
  );
}
