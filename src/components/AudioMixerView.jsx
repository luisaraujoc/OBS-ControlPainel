import { useState } from 'react';
import { useAudioMixer, DB_MIN, DB_MAX } from '../hooks/useAudioMixer';

const DB_PRESETS = [0, -10, -20, -30, -40, -50, -60];

function formatDb(db) {
  if (db == null || !Number.isFinite(db) || db <= DB_MIN) return '−∞ dB';
  return `${db > 0 ? '+' : ''}${db.toFixed(1)} dB`;
}

function MixerChannel({ input, onSlide, onSetDb, onToggleMute }) {
  const [custom, setCustom] = useState('');
  const db = input.volumeDb;

  const applyCustom = (e) => {
    e.preventDefault();
    const val = parseFloat(custom.replace(',', '.'));
    if (Number.isFinite(val)) {
      onSetDb(input.inputName, Math.min(DB_MAX, Math.max(DB_MIN, val)));
      setCustom('');
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl p-3 text-white shadow-md">
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-medium truncate">{input.inputName}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-mono tabular-nums ${input.muted ? 'text-gray-500' : 'text-gray-300'}`}>
            {formatDb(db)}
          </span>
          <button
            onClick={() => onToggleMute(input.inputName, input.muted)}
            className={`text-lg px-2 py-1 rounded ${input.muted ? 'bg-red-700' : 'bg-gray-700'}`}
          >
            {input.muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={Math.round(input.volumeMul * 100)}
        onChange={(e) => onSlide(input.inputName, Number(e.target.value) / 100)}
        className="w-full accent-blue-500"
      />

      <div className="flex flex-wrap gap-1.5 mt-2">
        {DB_PRESETS.map((preset) => {
          const activePreset = Number.isFinite(db) && Math.abs(db - preset) < 0.15;
          return (
            <button
              key={preset}
              onClick={() => onSetDb(input.inputName, preset)}
              className={`text-xs font-mono px-2 py-1 rounded ${
                activePreset ? 'bg-blue-600 text-white' : 'bg-gray-700 active:bg-gray-600 text-gray-200'
              }`}
            >
              {preset === 0 ? '0' : preset}
            </button>
          );
        })}
        <form onSubmit={applyCustom} className="flex gap-1 ml-auto">
          <input
            type="number"
            inputMode="numeric"
            step="1"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="dB"
            className="w-16 text-xs font-mono px-2 py-1 rounded bg-gray-900 text-white outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="text-xs px-2 py-1 rounded bg-gray-700 active:bg-gray-600 text-gray-200"
          >
            OK
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AudioMixerView({ obs }) {
  const { inputs, setVolume, setVolumeDb, toggleMute, loading } = useAudioMixer(obs);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
      {loading && inputs.length === 0 && (
        <p className="text-center text-gray-400">Carregando fontes de áudio...</p>
      )}
      {!loading && inputs.length === 0 && (
        <p className="text-center text-gray-400">Nenhuma fonte de áudio encontrada.</p>
      )}
      {inputs.map((input) => (
        <MixerChannel
          key={input.inputName}
          input={input}
          onSlide={setVolume}
          onSetDb={setVolumeDb}
          onToggleMute={toggleMute}
        />
      ))}
    </div>
  );
}
