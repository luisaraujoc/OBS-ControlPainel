import { useAudioMixer } from '../hooks/useAudioMixer';

export default function AudioMixerView({ obs }) {
  const { inputs, setVolume, toggleMute, loading } = useAudioMixer(obs);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
      {loading && inputs.length === 0 && (
        <p className="text-center text-gray-400">Carregando fontes de áudio...</p>
      )}
      {!loading && inputs.length === 0 && (
        <p className="text-center text-gray-400">Nenhuma fonte de áudio encontrada.</p>
      )}
      {inputs.map((input) => (
        <div key={input.inputName} className="bg-gray-800 rounded-xl p-3 text-white shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium truncate pr-2">{input.inputName}</span>
            <button
              onClick={() => toggleMute(input.inputName, input.muted)}
              className={`text-lg px-2 py-1 rounded ${input.muted ? 'bg-red-700' : 'bg-gray-700'}`}
            >
              {input.muted ? '🔇' : '🔊'}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(input.volumeMul * 100)}
            onChange={(e) => setVolume(input.inputName, Number(e.target.value) / 100)}
            className="w-full accent-blue-500"
          />
        </div>
      ))}
    </div>
  );
}
