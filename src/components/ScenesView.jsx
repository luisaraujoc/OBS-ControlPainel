import { useScenes } from '../hooks/useScenes';

export default function ScenesView({ obs }) {
  const { scenes, currentScene, switchScene, loading } = useScenes(obs);

  if (loading && scenes.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-gray-400">Carregando cenas...</div>;
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {scenes.map((scene) => {
          const active = scene.sceneName === currentScene;
          return (
            <button
              key={scene.sceneUuid || scene.sceneName}
              onClick={() => switchScene(scene.sceneName)}
              className={`aspect-video flex items-center justify-center text-center px-2 rounded-xl font-semibold text-white shadow-md active:scale-95 transition-transform
                ${active ? 'bg-green-600 ring-2 ring-white' : 'bg-gray-800 active:bg-gray-700'}`}
            >
              {scene.sceneName}
            </button>
          );
        })}
        {scenes.length === 0 && (
          <p className="col-span-2 text-center text-gray-400">Nenhuma cena encontrada.</p>
        )}
      </div>
    </div>
  );
}
