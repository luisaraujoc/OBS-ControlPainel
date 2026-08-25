import { useEffect, useState } from 'react';
import { useScenes } from '../hooks/useScenes';
import { useSources } from '../hooks/useSources';

export default function SourcesView({ obs }) {
  const { scenes, currentScene } = useScenes(obs);
  const [selectedScene, setSelectedScene] = useState(null);

  useEffect(() => {
    if (!selectedScene && currentScene) setSelectedScene(currentScene);
  }, [currentScene, selectedScene]);

  const { items, toggleVisibility, loading } = useSources(obs, selectedScene);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="p-3 border-b border-gray-800">
        <select
          value={selectedScene || ''}
          onChange={(e) => setSelectedScene(e.target.value)}
          className="w-full px-3 py-2 rounded bg-gray-800 text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          {scenes.map((scene) => (
            <option key={scene.sceneUuid || scene.sceneName} value={scene.sceneName}>
              {scene.sceneName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {loading && items.length === 0 && (
          <p className="text-center text-gray-400">Carregando fontes...</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-center text-gray-400">Nenhuma fonte nesta cena.</p>
        )}
        {items.map((item) => (
          <button
            key={item.sceneItemId}
            onClick={() => toggleVisibility(item.sceneItemId, item.sceneItemEnabled)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl shadow-md active:scale-[0.98] transition-transform
              ${item.sceneItemEnabled ? 'bg-gray-800 text-white' : 'bg-gray-900 text-gray-500'}`}
          >
            <span className="font-medium">{item.sourceName}</span>
            <span className="text-xl">{item.sceneItemEnabled ? '👁' : '🚫'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
