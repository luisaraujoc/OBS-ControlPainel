import { useCallback, useEffect, useState } from 'react';
import { logError, logInfo } from '../utils/logger';

// OBS aceita de -100 dB (mudo) a +26 dB (ganho).
export const DB_MIN = -100;
export const DB_MAX = 26;

export const dbToMul = (db) => (db <= DB_MIN ? 0 : 10 ** (db / 20));
export const mulToDb = (mul) => (mul <= 0 ? DB_MIN : 20 * Math.log10(mul));

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
          const [{ inputVolumeMul, inputVolumeDb }, { inputMuted }] = await Promise.all([
            call('GetInputVolume', { inputName: input.inputName }),
            call('GetInputMute', { inputName: input.inputName }),
          ]);
          audioInputs.push({
            inputName: input.inputName,
            volumeMul: inputVolumeMul,
            volumeDb: inputVolumeDb,
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

  useEffect(() => on('InputVolumeChanged', ({ inputName, inputVolumeMul, inputVolumeDb }) => {
    setInputs((prev) =>
      prev.map((i) =>
        i.inputName === inputName
          ? { ...i, volumeMul: inputVolumeMul, volumeDb: inputVolumeDb }
          : i
      )
    );
  }), [on]);

  useEffect(() => on('InputMuteStateChanged', ({ inputName, inputMuted }) => {
    setInputs((prev) =>
      prev.map((i) => (i.inputName === inputName ? { ...i, muted: inputMuted } : i))
    );
  }), [on]);

  const setVolume = useCallback(async (inputName, volumeMul) => {
    setInputs((prev) =>
      prev.map((i) =>
        i.inputName === inputName ? { ...i, volumeMul, volumeDb: mulToDb(volumeMul) } : i
      )
    );
    try {
      await call('SetInputVolume', { inputName, inputVolumeMul: volumeMul });
    } catch (err) {
      logError(`Falha ao ajustar volume de "${inputName}": ${err?.message || err}`);
    }
  }, [call]);

  // Define o volume por um valor exato em dB (ex: -10, -50), sem usar o slider.
  const setVolumeDb = useCallback(async (inputName, db) => {
    const clamped = Math.min(DB_MAX, Math.max(DB_MIN, db));
    setInputs((prev) =>
      prev.map((i) =>
        i.inputName === inputName
          ? { ...i, volumeDb: clamped, volumeMul: dbToMul(clamped) }
          : i
      )
    );
    try {
      await call('SetInputVolume', { inputName, inputVolumeDb: clamped });
      logInfo(`Volume de "${inputName}" definido em ${clamped.toFixed(1)} dB.`);
    } catch (err) {
      logError(`Falha ao definir volume de "${inputName}" em ${db} dB: ${err?.message || err}`);
    }
  }, [call]);

  const toggleMute = useCallback(async (inputName, currentMuted) => {
    try {
      await call('SetInputMute', { inputName, inputMuted: !currentMuted });
    } catch (err) {
      logError(`Falha ao alternar mute de "${inputName}": ${err?.message || err}`);
    }
  }, [call]);

  return { inputs, setVolume, setVolumeDb, toggleMute, loading };
}
