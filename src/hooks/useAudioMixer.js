import { useCallback, useEffect, useState } from 'react';
import { logError, logInfo } from '../utils/logger';

export function useAudioMixer({ connected, call, on }) {
  const [inputs, setInputs] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { inputs: allInputs } = await call('GetInputList');
      const audioInputs = [];
      for (const input of allInputs) {
        try {
          const [{ inputVolumeMul }, { inputMuted }] = await Promise.all([
            call('GetInputVolume', { inputName: input.inputName }),
            call('GetInputMute', { inputName: input.inputName }),
          ]);
          audioInputs.push({
            inputName: input.inputName,
            volumeMul: inputVolumeMul,
            muted: inputMuted,
          });
        } catch {
          // fonte não tem áudio, ignora
        }
      }
      setInputs(audioInputs);
      logInfo(`${audioInputs.length} fonte(s) de áudio encontrada(s) para o mixer.`);
    } catch (err) {
      logError(`Falha ao listar fontes de áudio: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  useEffect(() => on('InputVolumeChanged', ({ inputName, inputVolumeMul }) => {
    setInputs((prev) =>
      prev.map((i) => (i.inputName === inputName ? { ...i, volumeMul: inputVolumeMul } : i))
    );
  }), [on]);

  useEffect(() => on('InputMuteStateChanged', ({ inputName, inputMuted }) => {
    setInputs((prev) =>
      prev.map((i) => (i.inputName === inputName ? { ...i, muted: inputMuted } : i))
    );
  }), [on]);

  const setVolume = useCallback(async (inputName, volumeMul) => {
    setInputs((prev) =>
      prev.map((i) => (i.inputName === inputName ? { ...i, volumeMul } : i))
    );
    try {
      await call('SetInputVolume', { inputName, inputVolumeMul: volumeMul });
    } catch (err) {
      logError(`Falha ao ajustar volume de "${inputName}": ${err?.message || err}`);
    }
  }, [call]);

  const toggleMute = useCallback(async (inputName, currentMuted) => {
    try {
      await call('SetInputMute', { inputName, inputMuted: !currentMuted });
    } catch (err) {
      logError(`Falha ao alternar mute de "${inputName}": ${err?.message || err}`);
    }
  }, [call]);

  return { inputs, setVolume, toggleMute, loading };
}
