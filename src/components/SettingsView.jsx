import { useState } from 'react';
import { streamerBotUrlFromObs } from '../hooks/useStreamerBot';

function normalizeUrl(input) {
  const trimmed = input.trim();
  if (/^wss?:\/\//i.test(trimmed)) return trimmed;
  return `ws://${trimmed}`;
}

export default function SettingsView({ obs, sb }) {
  const [url, setUrl] = useState(obs.settings.url.replace(/^wss?:\/\//i, ''));
  const [authEnabled, setAuthEnabled] = useState(Boolean(obs.settings.password));
  const [password, setPassword] = useState(obs.settings.password || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  const effectivePassword = authEnabled ? password : '';

  const [sbPort, setSbPort] = useState(String(sb?.settings?.port ?? 4456));
  const [sbTesting, setSbTesting] = useState(false);
  const [sbTestResult, setSbTestResult] = useState(null);

  const sbUrlPreview = streamerBotUrlFromObs(normalizeUrl(url), Number(sbPort) || 4456);

  const handleSbToggle = (checked) => {
    sb.updateSettings({ enabled: checked });
    setSbTestResult(null);
  };

  const handleSbSavePort = () => {
    sb.updateSettings({ port: Number(sbPort) || 4456 });
    setSbTestResult(null);
  };

  const handleSbTest = async () => {
    setSbTesting(true);
    setSbTestResult(null);
    const result = await sb.testConnection(sbUrlPreview);
    setSbTestResult(result);
    setSbTesting(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setSaved(false);
    const result = await obs.testConnection(normalizeUrl(url), effectivePassword);
    setTestResult(result);
    setTesting(false);
  };

  const handleSave = () => {
    obs.updateConnectionSettings({ url: normalizeUrl(url), password: effectivePassword });
    setSaved(true);
    setTestResult(null);
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="max-w-md mx-auto flex flex-col gap-4">
        <div>
          <label className="block text-sm mb-1 text-gray-300">Endereço do OBS WebSocket</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="192.168.3.12:4455"
            className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">IP e porta do computador rodando o OBS na sua rede.</p>
        </div>

        <label className="flex items-center gap-2 text-white select-none">
          <input
            type="checkbox"
            checked={authEnabled}
            onChange={(e) => setAuthEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          Servidor WebSocket exige senha
        </label>

        {authEnabled && (
          <div>
            <label className="block text-sm mb-1 text-gray-300">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha configurada em OBS > Configurações > WebSocket"
              className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={testing || !url.trim()}
            className="flex-1 px-3 py-2 rounded bg-gray-700 active:bg-gray-600 disabled:opacity-40 text-white font-medium"
          >
            {testing ? 'Testando...' : 'Testar conexão'}
          </button>
          <button
            onClick={handleSave}
            disabled={!url.trim()}
            className="flex-1 px-3 py-2 rounded bg-blue-700 active:bg-blue-600 disabled:opacity-40 text-white font-medium"
          >
            Salvar
          </button>
        </div>

        {testResult && (
          <div
            className={`rounded-lg p-3 text-sm ${
              testResult.ok ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
            }`}
          >
            {testResult.ok ? (
              <>
                ✅ Conectado com sucesso! (obs-websocket v{testResult.info?.obsWebSocketVersion})
              </>
            ) : (
              <>❌ {testResult.error}</>
            )}
          </div>
        )}

        {saved && (
          <div className="rounded-lg p-3 text-sm bg-blue-900 text-blue-200">
            💾 Configuração salva. O app vai reconectar automaticamente com o novo endereço.
          </div>
        )}

        <hr className="border-gray-800 my-2" />

        <div>
          <h2 className="text-white font-semibold mb-1">Streamer.bot</h2>
          <p className="text-xs text-gray-500 mb-3">
            Usa o mesmo IP do OBS, só muda a porta. WebSocket Server sem autenticação.
          </p>

          <label className="flex items-center gap-2 text-white select-none mb-3">
            <input
              type="checkbox"
              checked={sb?.enabled ?? true}
              onChange={(e) => handleSbToggle(e.target.checked)}
              className="w-4 h-4"
            />
            Conector do Streamer.bot ligado
          </label>

          <label className="block text-sm mb-1 text-gray-300">Porta do WebSocket Server</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={sbPort}
              onChange={(e) => setSbPort(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="4456"
              className="flex-1 px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <button
              onClick={handleSbSavePort}
              className="px-3 py-2 rounded bg-blue-700 active:bg-blue-600 text-white font-medium"
            >
              Salvar
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-mono break-all">{sbUrlPreview}</p>

          <button
            onClick={handleSbTest}
            disabled={sbTesting}
            className="w-full mt-2 px-3 py-2 rounded bg-gray-700 active:bg-gray-600 disabled:opacity-40 text-white font-medium"
          >
            {sbTesting ? 'Testando...' : 'Testar Streamer.bot'}
          </button>

          {sbTestResult && (
            <div
              className={`rounded-lg p-3 text-sm mt-2 ${
                sbTestResult.ok ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
              }`}
            >
              {sbTestResult.ok ? (
                <>
                  ✅ Streamer.bot respondeu
                  {sbTestResult.info?.version ? ` (v${sbTestResult.info.version})` : ''}!
                </>
              ) : (
                <>❌ {sbTestResult.error}</>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
