import { useCallback } from 'react';
import { logError, logInfo, logWarn } from '../utils/logger';

const BROWSER_SOURCE_EVENT_VENDOR = 'obs-browser';
const BROWSER_SOURCE_EVENT_NAME = 'pederas';

// Os overlays do Pederas são fontes de navegador com a URL em
// file:///...html?parametro=valor. Ver o roteiro na raiz do projeto
// ("Roteiro controlar os overlays do Pederas pelo app (OBS WebSocket).md").
export function useOverlays({ call, callVendor }) {
  const listOverlays = useCallback(async () => {
    try {
      const { inputs } = await call('GetInputList', { inputKind: 'browser_source' });
      return inputs.map((i) => i.inputName);
    } catch (err) {
      logError(`Falha ao listar fontes de navegador: ${err?.message || err}`);
      return [];
    }
  }, [call]);

  const readParams = useCallback(
    async (sourceName) => {
      const { inputSettings } = await call('GetInputSettings', { inputName: sourceName });
      if (inputSettings.is_local_file || !inputSettings.url) {
        throw new Error(`"${sourceName}": desmarque "Arquivo local" e use a URL file:///...`);
      }
      return Object.fromEntries(new URL(inputSettings.url).searchParams);
    },
    [call]
  );

  // Força a fonte a recarregar a página agora, sem precisar trocar de cena
  // pra OBS "perceber" a mudança (o botão "Refresh cache of current page"
  // das propriedades da fonte de navegador, via obs-websocket).
  const refreshSource = useCallback(
    async (sourceName) => {
      try {
        await call('PressInputPropertiesButton', { inputName: sourceName, propertyName: 'refreshnocache' });
      } catch (err) {
        logWarn(`Não consegui forçar o recarregamento de "${sourceName}": ${err?.message || err}`);
      }
    },
    [call]
  );

  const saveParams = useCallback(
    async (sourceName, changes) => {
      const { inputSettings } = await call('GetInputSettings', { inputName: sourceName });
      if (inputSettings.is_local_file || !inputSettings.url) {
        throw new Error(`"${sourceName}": desmarque "Arquivo local" e use a URL file:///...`);
      }
      const url = new URL(inputSettings.url);
      for (const [k, v] of Object.entries(changes)) {
        if (v === null || v === '') url.searchParams.delete(k);
        else url.searchParams.set(k, v);
      }
      await call('SetInputSettings', { inputName: sourceName, inputSettings: { url: url.toString() } });
      await refreshSource(sourceName);
      logInfo(`Overlay "${sourceName}": parâmetros salvos e fonte recarregada.`, changes);
    },
    [call, refreshSource]
  );

  // null = não deu pra confirmar (ex: canvas vertical do Aitum, que não
  // aparece na cena do programa principal)
  const isOnAir = useCallback(
    async (sourceName) => {
      try {
        const { currentProgramSceneName } = await call('GetCurrentProgramScene');
        const { sceneItems } = await call('GetSceneItemList', { sceneName: currentProgramSceneName });
        return sceneItems.some((i) => i.sourceName === sourceName && i.sceneItemEnabled);
      } catch (err) {
        logWarn(`Não deu pra confirmar se "${sourceName}" está no ar: ${err?.message || err}`);
        return null;
      }
    },
    [call]
  );

  // Manda o evento ao vivo pra tela trocar sem piscar (pra quem já está
  // assistindo); quem usa isso sempre grava em seguida com saveParams, pra
  // garantir que a mudança não se perca se a fonte recarregar depois.
  const liveUpdate = useCallback(
    async (dados) => {
      await callVendor(BROWSER_SOURCE_EVENT_VENDOR, 'emit_event', {
        event_name: BROWSER_SOURCE_EVENT_NAME,
        event_data: dados,
      });
    },
    [callVendor]
  );

  return {
    listOverlays,
    readParams,
    saveParams,
    refreshSource,
    isOnAir,
    liveUpdate,
  };
}
