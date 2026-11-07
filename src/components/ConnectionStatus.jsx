export default function ConnectionStatus({
  connected,
  sbConnected,
  sbEnabled,
  view,
  onBack,
  onShowLogs,
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white select-none">
      <div className="flex items-center gap-2">
        {view !== 'home' && (
          <button
            onClick={onBack}
            className="text-xs px-2 py-1 rounded bg-gray-700 active:bg-gray-600 mr-1"
          >
            ← Menu
          </button>
        )}
        <span
          className={`inline-block w-3 h-3 rounded-full ${
            connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
          }`}
        />
        <span className="text-sm font-medium">
          {connected ? 'OBS conectado' : 'Reconectando ao OBS...'}
        </span>
        {sbEnabled && (
          <span
            title={sbConnected ? 'Streamer.bot conectado' : 'Streamer.bot procurando...'}
            className="flex items-center gap-1 ml-2 text-xs text-gray-400"
          >
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                sbConnected ? 'bg-green-500' : 'bg-yellow-400 animate-pulse'
              }`}
            />
            SB
          </span>
        )}
      </div>
      <button
        onClick={onShowLogs}
        className="text-xs px-2 py-1 rounded bg-gray-700 active:bg-gray-600"
      >
        Logs
      </button>
    </div>
  );
}
