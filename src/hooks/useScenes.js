import { useCallback, useEffect, useState } from 'react';
import { logError, logInfo } from '../utils/logger';

export function useScenes({ connected, call, on }) {
  const [scenes, setScenes] = useState([]);
  const [currentScene, setCurrentScene] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { scenes: list, currentProgramSceneName } = await call('GetSceneList');
      setScenes([...list].reverse());
      setCurrentScene(currentProgramSceneName);
    } catch (err) {
      logError(`Falha ao listar cenas: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  useEffect(() => on('CurrentProgramSceneChanged', ({ sceneName }) => {
    setCurrentScene(sceneName);
  }), [on]);

  const switchScene = useCallback(async (sceneName) => {
    try {
      await call('SetCurrentProgramScene', { sceneName });
      logInfo(`Cena trocada para "${sceneName}".`);
    } catch (err) {
      logError(`Falha ao trocar para a cena "${sceneName}": ${err?.message || err}`);
    }
  }, [call]);

  return { scenes, currentScene, switchScene, loading };
}
