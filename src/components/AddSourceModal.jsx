import { useState } from 'react';
import { describeKind } from '../utils/inputKinds';

export default function AddSourceModal({ availableKinds, onCreate, onClose }) {
  const [kind, setKind] = useState(availableKinds[0] || '');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!kind || !name.trim()) return;
    setSaving(true);
    const ok = await onCreate(name.trim(), kind);
    setSaving(false);
    if (ok) onClose();
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
        <h2 className="text-lg font-semibold mb-3">Adicionar fonte</h2>

        <label className="block text-sm mb-1 text-gray-300">Tipo</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableKinds.map((k) => {
            const { label, icon } = describeKind(k);
            return (
              <option key={k} value={k}>
                {icon} {label}
              </option>
            );
          })}
        </select>

        <label className="block text-sm mb-1 text-gray-300">Nome da fonte</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: Tela do jogo"
          className="w-full mb-4 px-3 py-2 rounded bg-gray-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={40}
        />

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-600 active:bg-gray-500">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !kind || !name.trim()}
            className="px-3 py-2 rounded bg-blue-600 active:bg-blue-500 disabled:opacity-40"
          >
            {saving ? 'Criando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}
