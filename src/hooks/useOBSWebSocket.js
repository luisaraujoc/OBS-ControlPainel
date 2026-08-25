import { useEffect, useRef, useState, useCallback } from 'react';
import OBSWebSocket from 'obs-websocket-js';
import { logInfo, logWarn, logError } from '../utils/logger';
import { buildButtonsFromHotkeys } from '../utils/soundboardDiscovery';
import { getConnectionSettings, saveConnectionSettings } from '../utils/storage';

const ENV_URL = import.meta.env.VITE_OBS_WS_URL || 'ws://172.21.112.1:4455';
const ENV_PASSWORD = import.meta.env.VITE_OBS_WS_PASSWORD || '';
const RECONNECT_DELAY_MS = 3000;

function loadSettings() {
  const stored = getConnectionSettings();
  return {
    url: stored?.url || ENV_URL,
    password: stored?.password ?? ENV_PASSWORD,
  };
}

export function describeConnectError(err) {
  const msg = err?.message || String(err);
  if (err?.code === 4009 || /auth/i.test(msg)) {
    return 'Falha na autenticação: a senha configurada não confere com a do OBS (ou o OBS exige senha e nenhuma foi informada).';
  }
  return msg;
}

export function useOBSWebSocket() {
  const [connected, setConnected] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const obsRef = useRef(null);

  useEffect(() => {
    const obs = new OBSWebSocket();
    obsRef.current = obs;
    let disposed = false;
    let reconnectTimer = null;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      logWarn(`Tentando reconectar em ${RECONNECT_DELAY_MS / 1000}s...`);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const connect = async () => {
      if (disposed) return;
      logInfo(`Conectando a ${settings.url}...`);
      try {
        const result = await obs.connect(settings.url, settings.password || undefined);
        logInfo('Handshake concluído (Hello + Identified).', {
          obsWebSocketVersion: result?.obsWebSocketVersion,
          rpcVersion: result?.negotiatedRpcVersion,
        });
      } catch (err) {
        setConnected(false);
        logError(`Falha ao conectar: ${describeConnectError(err)}`, { code: err?.code });
        scheduleReconnect();
      }
    };

    obs.on('ConnectionOpened', () => {
      logInfo('Socket TCP/WS aberto, aguardando Hello do OBS...');
    });
    obs.on('Identified', () => {
      setConnected(true);
      logInfo('Identificado com sucesso pelo OBS WebSocket.');
    });
    obs.on('ConnectionClosed', (err) => {
      setConnected(false);
      logWarn(`Conexão fechada (code=${err?.code ?? '?'}): ${describeConnectError(err) || 'sem motivo informado'}`);
      scheduleReconnect();
    });
    obs.on('ConnectionError', (err) => {
      setConnected(false);
      logError(`Erro na conexão (code=${err?.code ?? '?'}): ${describeConnectError(err)}`);
    });

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      obs.disconnect();
    };
  }, [settings.url, settings.password]);

  const updateConnectionSettings = useCallback((newSettings) => {
    saveConnectionSettings(newSettings);
    setConnected(false);
    setSettings(newSettings);
  }, []);

  const testConnection = useCallback(async (url, password) => {
    const testObs = new OBSWebSocket();
    try {
      const result = await testObs.connect(url, password || undefined);
      await testObs.disconnect();
      return { ok: true, info: result };
    } catch (err) {
      try {
        await testObs.disconnect();
      } catch {
        // já desconectado
      }
      return { ok: false, error: describeConnectError(err) };
    }
  }, []);

  const triggerHotkey = useCallback(async (obsPayload) => {
    const obs = obsRef.current;
    const hotkeyName = obsPayload?.hotkeyName;
    const contextName = obsPayload?.contextName;
    if (!obs || !connected) {
      logWarn('Hotkey ignorada: OBS não está conectado.', obsPayload);
      return;
    }
    if (!hotkeyName) {
      logWarn('Hotkey ignorada: este botão ainda não tem um atalho configurado. Segure o botão para editar.', obsPayload);
      return;
    }
    try {
      const params = contextName ? { hotkeyName, contextName } : { hotkeyName };
      await obs.call('TriggerHotkeyByName', params);
      logInfo(`Hotkey "${hotkeyName}" disparada${contextName ? ` (fonte: ${contextName})` : ''}.`);
    } catch (err) {
      logError(`Falha ao acionar hotkey "${hotkeyName}"${contextName ? ` (fonte: ${contextName})` : ''}: ${err?.message || err}`);
    }
  }, [connected]);

  const listHotkeys = useCallback(async () => {
    const obs = obsRef.current;
    if (!obs || !connected) {
      logWarn('Não é possível listar atalhos: OBS não está conectado.');
      return [];
    }
    try {
      const { hotkeys } = await obs.call('GetHotkeyList');
      logInfo(`${hotkeys.length} atalhos encontrados no OBS:`, hotkeys);
      return hotkeys;
    } catch (err) {
      logError(`Falha ao listar atalhos: ${err?.message || err}`);
      return [];
    }
  }, [connected]);

  const setMediaAction = useCallback(async (mediaAction, label) => {
    const obs = obsRef.current;
    if (!obs || !connected) {
      logWarn(`Não é possível ${label}: OBS não está conectado.`);
      return;
    }
    try {
      const { inputs } = await obs.call('GetInputList');
      let hit = 0;
      for (const input of inputs) {
        try {
          await obs.call('TriggerMediaInputAction', {
            inputName: input.inputName,
            mediaAction,
          });
          hit += 1;
        } catch {
          // fonte não é uma fonte de mídia, ignora
        }
      }
      logInfo(`${label}: comando enviado para ${hit} fonte(s) de mídia.`);
    } catch (err) {
      logError(`Falha ao ${label}: ${err?.message || err}`);
    }
  }, [connected]);

  const playAllSounds = useCallback(
    () => setMediaAction('OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY', 'retomar todos os sons'),
    [setMediaAction]
  );

  const stopAllSounds = useCallback(
    () => setMediaAction('OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP', 'parar todos os sons'),
    [setMediaAction]
  );

  const pauseAllSounds = useCallback(
    () => setMediaAction('OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE', 'pausar todos os sons'),
    [setMediaAction]
  );

  const listSources = useCallback(async () => {
    const obs = obsRef.current;
    if (!obs || !connected) {
      logWarn('Não é possível listar fontes: OBS não está conectado.');
      return [];
    }
    try {
      const { inputs } = await obs.call('GetInputList');
      const names = inputs.map((i) => i.inputName);
      logInfo(`${names.length} fontes encontradas no OBS:`, names);
      return names;
    } catch (err) {
      logError(`Falha ao listar fontes: ${err?.message || err}`);
      return [];
    }
  }, [connected]);

  const discoverSoundboardButtons = useCallback(async () => {
    const hotkeys = await listHotkeys();
    const buttons = buildButtonsFromHotkeys(hotkeys);
    if (buttons.length === 0) {
      logWarn('Nenhuma fonte do Soundboard Dock encontrada (procurando por atalhos "Soundboard: \'...\'").');
    } else {
      logInfo(`${buttons.length} som(ns) do Soundboard Dock detectado(s) e mapeado(s) automaticamente.`);
    }
    return buttons;
  }, [listHotkeys]);

  const call = useCallback(async (request, params) => {
    const obs = obsRef.current;
    if (!obs || !connected) {
      throw new Error(`OBS não conectado (request: ${request})`);
    }
    return obs.call(request, params);
  }, [connected]);

  const on = useCallback((event, handler) => {
    const obs = obsRef.current;
    if (!obs) return () => {};
    obs.on(event, handler);
    return () => obs.off(event, handler);
  }, []);

  return {
    connected,
    settings,
    updateConnectionSettings,
    testConnection,
    triggerHotkey,
    listHotkeys,
    listSources,
    playAllSounds,
    stopAllSounds,
    pauseAllSounds,
    discoverSoundboardButtons,
    call,
    on,
  };
}
