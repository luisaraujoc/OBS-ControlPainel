import { useCallback, useState } from 'react';
import ButtonGrid from './ButtonGrid';
import EditModal from './EditModal';

export default function SoundboardView({ obs, buttonConfig, onShowLogs }) {
  const {
    triggerHotkey,
    listHotkeys,
    listSources,
    playAllSounds,
    stopAllSounds,
    pauseAllSounds,
    discoverSoundboardButtons,
  } = obs;
  const { buttons, updateButton, resetAll, syncButtons } = buttonConfig;
  const [editingButton, setEditingButton] = useState(null);
  const [availableHotkeys, setAvailableHotkeys] = useState([]);
  const [availableSources, setAvailableSources] = useState([]);

  const handleTrigger = useCallback(
    (button) => triggerHotkey(button.obsPayload),
    [triggerHotkey]
  );

  const handleReset = () => {
    if (window.confirm('Restaurar todos os botões para a configuração padrão?')) {
      resetAll();
    }
  };

  const handleDiscoverHotkeys = async () => {
    const [hotkeys, sources] = await Promise.all([listHotkeys(), listSources()]);
    setAvailableHotkeys(hotkeys);
    setAvailableSources(sources);
    onShowLogs();
  };

  const handleSyncButtons = useCallback(async () => {
    const discovered = await discoverSoundboardButtons();
    syncButtons(discovered);
  }, [discoverSoundboardButtons, syncButtons]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex gap-2 px-3 py-2 flex-wrap bg-gray-900 border-b border-gray-800">
        <button
          onClick={playAllSounds}
          className="text-xs px-2 py-1 rounded bg-green-700 active:bg-green-600"
        >
          ▶ Play
        </button>
        <button
          onClick={pauseAllSounds}
          className="text-xs px-2 py-1 rounded bg-yellow-700 active:bg-yellow-600"
        >
          ⏸ Pausar
        </button>
        <button
          onClick={stopAllSounds}
          className="text-xs px-2 py-1 rounded bg-red-700 active:bg-red-600"
        >
          ⏹ Parar
        </button>
        <button
          onClick={handleSyncButtons}
          className="text-xs px-2 py-1 rounded bg-blue-700 active:bg-blue-600"
        >
          🔄 Sincronizar sons
        </button>
        <button
          onClick={handleDiscoverHotkeys}
          className="text-xs px-2 py-1 rounded bg-gray-700 active:bg-gray-600"
        >
          Descobrir atalhos
        </button>
        <button
          onClick={handleReset}
          className="text-xs px-2 py-1 rounded bg-gray-700 active:bg-gray-600"
        >
          Restaurar padrão
        </button>
      </div>

      <ButtonGrid buttons={buttons} onTrigger={handleTrigger} onEdit={setEditingButton} />

      {editingButton && (
        <EditModal
          button={editingButton}
          onSave={updateButton}
          onClose={() => setEditingButton(null)}
          availableHotkeys={availableHotkeys}
          availableSources={availableSources}
        />
      )}
    </div>
  );
}
