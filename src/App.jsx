import { useCallback, useEffect, useRef, useState } from 'react';
import ConnectionStatus from './components/ConnectionStatus';
import Home from './components/Home';
import SoundboardView from './components/SoundboardView';
import ScenesView from './components/ScenesView';
import SourcesView from './components/SourcesView';
import AudioMixerView from './components/AudioMixerView';
import LivesView from './components/LivesView';
import SettingsView from './components/SettingsView';
import LogPanel from './components/LogPanel';
import { useOBSWebSocket } from './hooks/useOBSWebSocket';
import { useButtonConfig } from './hooks/useButtonConfig';

export default function App() {
  const obs = useOBSWebSocket();
  const buttonConfig = useButtonConfig();
  const [view, setView] = useState('home');
  const [showLogs, setShowLogs] = useState(false);
  const hasAutoSyncedRef = useRef(false);

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
    <div className="flex flex-col h-full bg-gray-950">
      <ConnectionStatus
        connected={obs.connected}
        view={view}
        onBack={() => setView('home')}
        onShowLogs={() => setShowLogs(true)}
      />

      {view === 'home' && <Home onSelect={setView} />}
      {view === 'soundboard' && (
        <SoundboardView obs={obs} buttonConfig={buttonConfig} onShowLogs={() => setShowLogs(true)} />
      )}
      {view === 'scenes' && <ScenesView obs={obs} />}
      {view === 'sources' && <SourcesView obs={obs} />}
      {view === 'mixer' && <AudioMixerView obs={obs} />}
      {view === 'lives' && <LivesView obs={obs} />}
      {view === 'settings' && <SettingsView obs={obs} />}

      {showLogs && <LogPanel onClose={() => setShowLogs(false)} />}
    </div>
  );
}
