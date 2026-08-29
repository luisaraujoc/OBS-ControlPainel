import { useCallback, useEffect, useRef, useState } from 'react';
import { logError, logInfo, logWarn } from '../utils/logger';

const VENDOR = 'aitum-multistream';
const START_ALL_TIMEOUT_MS = 20000;
const PRIMARY_POLL_MS = 2000;

// Traduz os códigos de erro que o vendor do Aitum Multistream devolve.
const ERROR_LABELS = {
  name_not_set: 'nome da saída não informado',
  output_not_found: 'saída não encontrada na config do Aitum Multistream',
  already_starting_or_active: 'a saída já está iniciando ou no ar',
  main_output_not_active: 'a saída primária do OBS precisa estar no ar primeiro',
  output_not_running: 'a saída não está no ar',
  no_configuration: 'o Aitum Multistream não tem nenhum perfil carregado',
  no_dock_row: 'a saída existe na config mas não no dock do Aitum',
  dock_unavailable: 'o dock do Aitum Multistream não respondeu a tempo',
  vertical_canvas_unavailable: 'o plugin Vertical Canvas não está disponível',
  start_failed: 'falha ao iniciar a saída',
};

const labelError = (code) => ERROR_LABELS[code] || code || 'erro desconhecido';

const isNoVendor = (err) =>
  /vendor|not found|no vendor/i.test(err?.message || '') || err?.code === 604;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const IDLE_PRIMARY = { active: false, reconnecting: false, duration: 0, state: null };

export function useLives({ connected, call, callVendor, on }) {
  // saída primária do OBS (StartStream/StopStream)
  const [primary, setPrimary] = useState(IDLE_PRIMARY);
  // saídas extras do Aitum Multistream
  const [outputs, setOutputs] = useState([]);
  // available: null = ainda verificando | true = vendor respondeu | false = sem suporte
  const [multistream, setMultistream] = useState({ available: null, version: null });
  const [busyAll, setBusyAll] = useState(false);
  const pollRef = useRef(null);

  const vendor = useCallback(
    (requestType, requestData) => callVendor(VENDOR, requestType, requestData),
    [callVendor]
  );

  // ---- saída primária ------------------------------------------------------

  const refreshPrimary = useCallback(async () => {
    try {
      const s = await call('GetStreamStatus');
      setPrimary({
        active: s.outputActive,
        reconnecting: s.outputReconnecting,
        duration: s.outputDuration || 0,
        state: s.outputActive
          ? 'OBS_WEBSOCKET_OUTPUT_STARTED'
          : 'OBS_WEBSOCKET_OUTPUT_STOPPED',
      });
    } catch (err) {
      logError(`Falha ao ler o status da transmissão: ${err?.message || err}`);
    }
  }, [call]);

  const startPrimary = useCallback(async () => {
    try {
      await call('StartStream');
      logInfo('Saída primária: iniciando...');
    } catch (err) {
      logError(`Falha ao iniciar a saída primária: ${err?.message || err}`);
    }
  }, [call]);

  const stopPrimary = useCallback(async () => {
    try {
      await call('StopStream');
      logInfo('Saída primária: parando...');
    } catch (err) {
      logError(`Falha ao parar a saída primária: ${err?.message || err}`);
    }
  }, [call]);

  // ---- saídas do Aitum Multistream --------------------------------------

  const refreshOutputs = useCallback(async () => {
    try {
      const res = await vendor('get_outputs');
      if (!res.success) {
        logWarn(`Aitum Multistream: get_outputs falhou (${labelError(res.error)}).`);
        return;
      }
      setMultistream((m) => ({ ...m, available: true }));
      setOutputs((prev) =>
        (res.outputs || []).map((o) => ({
          ...o,
          busy: prev.find((p) => p.name === o.name)?.busy || false,
        }))
      );
    } catch (err) {
      if (isNoVendor(err)) {
        setMultistream({ available: false, version: null });
        setOutputs([]);
        logWarn(
          'Aitum Multistream instalado sem suporte a obs-websocket (vendor não registrado). Só a saída primária fica disponível.'
        );
      } else {
        logError(`Falha ao listar as saídas do Aitum Multistream: ${err?.message || err}`);
      }
    }
  }, [vendor]);

  const checkMultistream = useCallback(async () => {
    try {
      // Se o request resolve (mesmo com success:false por "dock_unavailable"
      // durante o boot do OBS), o vendor existe.
      const res = await vendor('status');
      setMultistream({ available: true, version: res.version || null });
      if (res.success) {
        logInfo(`Aitum Multistream ${res.version || '?'} detectado (API v${res.api ?? '?'}).`);
      }
      return !!res.success;
    } catch (err) {
      if (isNoVendor(err)) {
        setMultistream({ available: false, version: null });
      } else {
        logError(`Falha ao falar com o Aitum Multistream: ${err?.message || err}`);
      }
      return false;
    }
  }, [vendor]);

  const setOutputBusy = useCallback((name, busy) => {
    setOutputs((prev) => prev.map((o) => (o.name === name ? { ...o, busy } : o)));
  }, []);

  const startOutput = useCallback(
    async (name) => {
      setOutputBusy(name, true);
      try {
        const res = await vendor('start_output', { name });
        if (!res.success) {
          logError(`Falha ao iniciar "${name}": ${labelError(res.error)}.`);
          setOutputBusy(name, false);
          return false;
        }
        logInfo(`Saída "${name}": iniciando...`);
        return true;
      } catch (err) {
        logError(`Falha ao iniciar "${name}": ${err?.message || err}`);
        setOutputBusy(name, false);
        return false;
      }
    },
    [vendor, setOutputBusy]
  );

  const stopOutput = useCallback(
    async (name) => {
      setOutputBusy(name, true);
      try {
        const res = await vendor('stop_output', { name });
        if (!res.success && res.error !== 'output_not_running') {
          logError(`Falha ao parar "${name}": ${labelError(res.error)}.`);
        }
        return !!res.success;
      } catch (err) {
        logError(`Falha ao parar "${name}": ${err?.message || err}`);
        return false;
      } finally {
        setOutputBusy(name, false);
      }
    },
    [vendor, setOutputBusy]
  );

  // ---- "iniciar tudo" / "parar tudo" -----------------------------------

  const waitForPrimary = useCallback(async () => {
    const start = Date.now();
    while (Date.now() - start < START_ALL_TIMEOUT_MS) {
      try {
        const s = await call('GetStreamStatus');
        if (s.outputActive) return true;
      } catch {
        // ignora e tenta de novo
      }
      await wait(1000);
    }
    return false;
  }, [call]);

  const startAll = useCallback(async () => {
    setBusyAll(true);
    try {
      if (!primary.active) {
        await startPrimary();
        logInfo('Aguardando a saída primária entrar no ar...');
        if (!(await waitForPrimary())) {
          logError('A saída primária não entrou no ar a tempo. "Iniciar tudo" abortado.');
          return;
        }
      }
      if (multistream.available) {
        let list = [];
        try {
          list = (await vendor('get_outputs')).outputs || [];
        } catch {
          list = outputs;
        }
        for (const o of list) {
          if (o.active) continue;
          await startOutput(o.name);
          await wait(800);
        }
      }
      logInfo('"Iniciar tudo" concluído.');
    } finally {
      setBusyAll(false);
    }
  }, [primary.active, startPrimary, waitForPrimary, multistream.available, vendor, outputs, startOutput]);

  const stopAll = useCallback(async () => {
    setBusyAll(true);
    try {
      if (multistream.available) {
        for (const o of outputs) {
          if (!o.active) continue;
          await stopOutput(o.name);
          await wait(300);
        }
      }
      if (primary.active) await stopPrimary();
      logInfo('"Parar tudo" concluído.');
    } finally {
      setBusyAll(false);
    }
  }, [multistream.available, outputs, stopOutput, primary.active, stopPrimary]);

  // ---- ciclo de vida / eventos ----------------------------------------

  useEffect(() => {
    if (!connected) {
      setPrimary(IDLE_PRIMARY);
      setOutputs([]);
      setMultistream({ available: null, version: null });
      return;
    }
    refreshPrimary();
    checkMultistream().then((ok) => {
      if (ok) refreshOutputs();
    });
  }, [connected, refreshPrimary, checkMultistream, refreshOutputs]);

  // eventos da saída primária do OBS
  useEffect(
    () =>
      on('StreamStateChanged', ({ outputActive, outputState }) => {
        setPrimary((p) => ({ ...p, active: outputActive, state: outputState }));
        if (
          outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED' ||
          outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED'
        ) {
          refreshOutputs();
        }
      }),
    [on, refreshOutputs]
  );

  // eventos das saídas do Aitum Multistream
  useEffect(
    () =>
      on('VendorEvent', ({ vendorName, eventType, eventData }) => {
        if (vendorName !== VENDOR || eventType !== 'output_state_changed') return;
        setOutputs((prev) =>
          prev.map((o) =>
            o.name === eventData.name ? { ...o, active: eventData.active, busy: false } : o
          )
        );
        logInfo(`Saída "${eventData.name}" ${eventData.active ? 'no ar' : 'parada'}.`);
      }),
    [on]
  );

  // enquanto a saída primária está no ar, atualiza o cronômetro
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (!primary.active) return;
    pollRef.current = setInterval(refreshPrimary, PRIMARY_POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [primary.active, refreshPrimary]);

  const refresh = useCallback(() => {
    refreshPrimary();
    checkMultistream().then((ok) => {
      if (ok) refreshOutputs();
    });
  }, [refreshPrimary, checkMultistream, refreshOutputs]);

  return {
    primary,
    outputs,
    multistream,
    busyAll,
    startPrimary,
    stopPrimary,
    startOutput,
    stopOutput,
    startAll,
    stopAll,
    refresh,
  };
}
