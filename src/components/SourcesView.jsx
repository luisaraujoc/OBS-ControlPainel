import { useEffect, useState } from 'react';
import { useScenes } from '../hooks/useScenes';
import { useSources } from '../hooks/useSources';
import { describeKind } from '../utils/inputKinds';
import AddSourceModal from './AddSourceModal';
import WindowPickerModal from './WindowPickerModal';

export default function SourcesView({ obs }) {
  const { scenes, currentScene } = useScenes(obs);
  const [selectedScene, setSelectedScene] = useState(null);
  const [showAddSource, setShowAddSource] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);

  useEffect(() => {
    if (!selectedScene && currentScene) setSelectedScene(currentScene);
  }, [currentScene, selectedScene]);

  const {
    items,
    availableKinds,
    loading,
    toggleVisibility,
    createSource,
    getPickerOptions,
    applyPickerChoice,
  } = useSources(obs, selectedScene);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 border-b border-gray-800 flex gap-2">
        <select
          value={selectedScene || ''}
          onChange={(e) => setSelectedScene(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          {scenes.map((scene) => (
            <option key={scene.sceneUuid || scene.sceneName} value={scene.sceneName}>
              {scene.sceneName}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowAddSource(true)}
          disabled={!selectedScene}
          className="px-3 py-2 rounded bg-blue-700 active:bg-blue-600 disabled:opacity-40 text-white text-sm whitespace-nowrap"
        >
          + Fonte
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {loading && items.length === 0 && (
          <p className="text-center text-gray-400">Carregando fontes...</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-center text-gray-400">Nenhuma fonte nesta cena.</p>
        )}
        {items.map((item) => {
          const kindInfo = describeKind(item.inputKind);
          return (
            <div key={item.sceneItemId} className="flex items-center gap-2">
              <button
                onClick={() => toggleVisibility(item.sceneItemId, item.sceneItemEnabled)}
                className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl shadow-md active:scale-[0.98] transition-transform
                  ${item.sceneItemEnabled ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-500'}`}
              >
                <span className="font-medium truncate pr-2">{item.sourceName}</span>
                <span className="text-xl shrink-0">{item.sceneItemEnabled ? '👁' : '🚫'}</span>
              </button>
              {kindInfo.pickerProperty && (
                <button
                  onClick={() =>
                    setPickerTarget({
                      inputName: item.sourceName,
                      propertyName: kindInfo.pickerProperty,
                    })
                  }
                  className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-gray-800 active:bg-gray-700 text-xl"
                  title="Selecionar janela/processo"
                >
                  {kindInfo.icon}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {showAddSource && (
        <AddSourceModal
          availableKinds={availableKinds}
          onCreate={createSource}
          onClose={() => setShowAddSource(false)}
        />
      )}

      {pickerTarget && (
        <WindowPickerModal
          inputName={pickerTarget.inputName}
          propertyName={pickerTarget.propertyName}
          title={`Selecionar janela: ${pickerTarget.inputName}`}
          getOptions={getPickerOptions}
          onChoose={applyPickerChoice}
          onClose={() => setPickerTarget(null)}
        />
      )}
    </div>
  );
}
