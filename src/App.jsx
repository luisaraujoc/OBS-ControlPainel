import { useCallback, useEffect, useRef, useState } from 'react';
import ConnectionStatus from './components/ConnectionStatus';
import Home from './components/Home';
import SoundboardView from './components/SoundboardView';
import ScenesView from './components/ScenesView';
import SourcesView from './components/SourcesView';
import AudioMixerView from './components/AudioMixerView';
import LivesView from './components/LivesView';
import OverlaysView from './components/OverlaysView';
import ActionsView from './components/ActionsView';
import ChatView from './components/ChatView';
import SettingsView from './components/SettingsView';
import LogPanel from './components/LogPanel';
import { useOBSWebSocket } from './hooks/useOBSWebSocket';
import { useStreamerBot } from './hooks/useStreamerBot';
import { useButtonConfig } from './hooks/useButtonConfig';
import { getLastView, saveLastView } from './utils/storage';

const VALID_VIEWS = ['home', 'soundboard', 'scenes', 'sources', 'mixer', 'lives', 'overlays', 'actions', 'chat', 'settings'];

// Cada tela tem sua própria rota (#/tela), pra poder abrir uma tela específica
// direto (ex: só o Chat como fonte de navegador no OBS, com ?embed=1 pra
// esconder o cabeçalho/menu: http://<ip>:5175/?embed=1#/chat).
function viewFromHash() {
  const h = window.location.hash.replace(/^#\/?/, '');
  return VALID_VIEWS.includes(h) ? h : null;
}

function loadInitialView() {
  return viewFromHash() || (VALID_VIEWS.includes(getLastView()) ? getLastView() : 'home');
}

function isEmbedMode() {
  return new URLSearchParams(window.location.search).get('embed') === '1';
}

export default function App() {
  const obs = useOBSWebSocket();
  const sb = useStreamerBot({ obsUrl: obs.settings.url });
  const buttonConfig = useButtonConfig();
  const [view, setView] = useState(loadInitialView);
  const [showLogs, setShowLogs] = useState(false);
  const [embed] = useState(isEmbedMode);
  const hasAutoSyncedRef = useRef(false);

  const changeView = useCallback((next) => {
    setView(next);
    saveLastView(next);
    window.history.replaceState(null, '', `#/${next}`);
  }, []);

  // Deixa a URL e a navegação por "Voltar"/"Avançar" do navegador em sincronia
  // com a tela atual (útil se alguém editar a #rota na mão).
  useEffect(() => {
    const onHashChange = () => {
      const next = viewFromHash();
      if (next && next !== view) setView(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [view]);

  const handleAutoSync = useCallback(async () => {
    const discovered = await obs.discoverSoundboardButtons();
    buttonConfig.syncButtons(discovered);
  }, [obs, buttonConfig]);

  // Ao conectar pela primeira vez nesta sessão, sincroniza automaticamente
  // os botões com os sons cadastrados no Soundboard Dock do OBS, mesmo que
  // a tela do Soundboard não esteja aberta no momento.
  useEffect(() => {
    if (obs.connected && !hasAutoSyncedRef.current) {
      hasAutoSyncedRef.current = true;
      handleAutoSync();
    }
  }, [obs.connected, handleAutoSync]);

  return (
    <div className={`flex flex-col h-full ${embed ? '' : 'bg-gray-950'}`}>
      {!embed && (
        <ConnectionStatus
          connected={obs.connected}
          sbConnected={sb.connected}
          sbEnabled={sb.enabled}
          view={view}
          onBack={() => changeView('home')}
          onShowLogs={() => setShowLogs(true)}
        />
      )}

      {!embed && view === 'home' && <Home onSelect={changeView} />}
      {view === 'soundboard' && (
        <SoundboardView obs={obs} buttonConfig={buttonConfig} onShowLogs={() => setShowLogs(true)} />
      )}
      {view === 'scenes' && <ScenesView obs={obs} />}
      {view === 'sources' && <SourcesView obs={obs} />}
      {view === 'mixer' && <AudioMixerView obs={obs} />}
      {view === 'lives' && <LivesView obs={obs} />}
      {view === 'overlays' && <OverlaysView obs={obs} />}
      {view === 'actions' && <ActionsView sb={sb} />}
      {view === 'chat' && <ChatView sb={sb} embed={embed} />}
      {view === 'settings' && <SettingsView obs={obs} sb={sb} />}

      {!embed && showLogs && <LogPanel onClose={() => setShowLogs(false)} />}
    </div>
  );
}
