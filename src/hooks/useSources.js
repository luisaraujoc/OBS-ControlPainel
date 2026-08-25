import { useCallback, useEffect, useState } from 'react';
import { logError, logInfo } from '../utils/logger';

export function useSources({ connected, call, on }, sceneName) {
  const [items, setItems] = useState([]);
  const [availableKinds, setAvailableKinds] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!sceneName) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const [{ sceneItems }, { inputs }] = await Promise.all([
        call('GetSceneItemList', { sceneName }),
        call('GetInputList'),
      ]);
      const kindByName = Object.fromEntries(inputs.map((i) => [i.inputName, i.inputKind]));
      setItems(sceneItems.map((item) => ({ ...item, inputKind: kindByName[item.sourceName] })));
    } catch (err) {
      logError(`Falha ao listar fontes da cena "${sceneName}": ${err?.message || err}`);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [call, sceneName]);

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  useEffect(() => {
    if (!connected) return;
    call('GetInputKindList')
      .then(({ inputKinds }) => setAvailableKinds(inputKinds))
      .catch((err) => logError(`Falha ao listar tipos de fonte: ${err?.message || err}`));
  }, [connected, call]);

  useEffect(() => on('SceneItemEnableStateChanged', (data) => {
    if (data.sceneName !== sceneName) return;
    setItems((prev) =>
      prev.map((item) =>
        item.sceneItemId === data.sceneItemId
          ? { ...item, sceneItemEnabled: data.sceneItemEnabled }
          : item
      )
    );
  }), [on, sceneName]);

  useEffect(() => on('SceneItemCreated', (data) => {
    if (data.sceneName === sceneName) refresh();
  }), [on, sceneName, refresh]);

  const toggleVisibility = useCallback(async (sceneItemId, currentEnabled) => {
    try {
      await call('SetSceneItemEnabled', {
        sceneName,
        sceneItemId,
        sceneItemEnabled: !currentEnabled,
      });
    } catch (err) {
      logError(`Falha ao alternar visibilidade da fonte: ${err?.message || err}`);
    }
  }, [call, sceneName]);

  const createSource = useCallback(async (inputName, inputKind) => {
    try {
      await call('CreateInput', {
        sceneName,
        inputName,
        inputKind,
        sceneItemEnabled: true,
      });
      logInfo(`Fonte "${inputName}" (${inputKind}) criada na cena "${sceneName}".`);
      await refresh();
      return true;
    } catch (err) {
      logError(`Falha ao criar fonte "${inputName}": ${err?.message || err}`);
      return false;
    }
  }, [call, sceneName, refresh]);

  const getPickerOptions = useCallback(async (inputName, propertyName) => {
    const { propertyItems } = await call('GetInputPropertiesListPropertyItems', {
      inputName,
      propertyName,
    });
    return propertyItems;
  }, [call]);

  const applyPickerChoice = useCallback(async (inputName, propertyName, value) => {
    try {
      await call('SetInputSettings', {
        inputName,
        inputSettings: { [propertyName]: value },
        overlay: true,
      });
      logInfo(`"${propertyName}" da fonte "${inputName}" atualizado.`);
    } catch (err) {
      logError(`Falha ao atualizar "${propertyName}" da fonte "${inputName}": ${err?.message || err}`);
    }
  }, [call]);

  return {
    items,
    availableKinds,
    loading,
    toggleVisibility,
    createSource,
    getPickerOptions,
    applyPickerChoice,
  };
}
