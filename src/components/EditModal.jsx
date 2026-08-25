import { useState, useEffect } from 'react';

const COLOR_OPTIONS = [
  'bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500',
  'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500',
  'bg-orange-500', 'bg-cyan-500', 'bg-lime-500', 'bg-emerald-500',
  'bg-gray-500',
];

export default function EditModal({ button, onSave, onClose, availableHotkeys = [], availableSources = [] }) {
  const [label, setLabel] = useState(button.label);
  const [color, setColor] = useState(button.color);
  const [icon, setIcon] = useState(button.icon);
  const [hotkeyName, setHotkeyName] = useState(button.obsPayload?.hotkeyName || '');
  const [contextName, setContextName] = useState(button.obsPayload?.contextName || '');

  useEffect(() => {
    setLabel(button.label);
    setColor(button.color);
    setIcon(button.icon);
    setHotkeyName(button.obsPayload?.hotkeyName || '');
    setContextName(button.obsPayload?.contextName || '');
  }, [button]);

  const handleSave = () => {
    onSave(button.id, {
      label,
      color,
      icon,
      obsPayload: { hotkeyName: hotkeyName.trim(), contextName: contextName.trim() },
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 text-white rounded-xl p-4 w-full max-w-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-3">Editar botão</h2>

        <label className="block text-sm mb-1 text-gray-300">Nome</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={20}
        />

        <label className="block text-sm mb-1 text-gray-300">Ícone / emoji</label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={4}
        />

        <label className="block text-sm mb-1 text-gray-300">Ação do atalho (hotkey name)</label>
        <input
          type="text"
          list="hotkey-options"
          value={hotkeyName}
          onChange={(e) => setHotkeyName(e.target.value)}
          placeholder="ex: MediaSource.Restart"
          className="w-full mb-1 px-3 py-2 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <datalist id="hotkey-options">
          {availableHotkeys.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>

        <label className="block text-sm mb-1 text-gray-300">Fonte alvo (contextName)</label>
        <input
          type="text"
          list="source-options"
          value={contextName}
          onChange={(e) => setContextName(e.target.value)}
          placeholder="ex: Som Aplausos"
          className="w-full mb-1 px-3 py-2 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
        <datalist id="source-options">
          {availableSources.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <p className="text-xs text-gray-400 mb-3">
          Muitos atalhos (ex: "MediaSource.Restart", "libobs.mute") são genéricos e valem para
          várias fontes — por isso é preciso informar a fonte exata aqui. Use "Descobrir atalhos"
          na barra superior pra listar os nomes disponíveis no seu OBS.
        </p>

        <label className="block text-sm mb-2 text-gray-300">Cor</label>
        <div className="grid grid-cols-7 gap-2 mb-4">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full ${c} ${
                color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-800' : ''
              }`}
            />
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-600 active:bg-gray-500">
            Cancelar
          </button>
          <button onClick={handleSave} className="px-3 py-2 rounded bg-blue-600 active:bg-blue-500">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
