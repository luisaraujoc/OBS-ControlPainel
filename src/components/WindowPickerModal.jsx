import { useEffect, useState } from 'react';

export default function WindowPickerModal({ inputName, propertyName, title, getOptions, onChoose, onClose }) {
  const [options, setOptions] = useState(null);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOptions(inputName, propertyName)
      .then((items) => {
        if (!cancelled) setOptions(items);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [inputName, propertyName, getOptions]);

  const handleChoose = async (value) => {
    setApplying(true);
    await onChoose(inputName, propertyName, value);
    setApplying(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 text-white rounded-xl p-4 w-full max-w-sm max-h-[80vh] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-3">{title}</h2>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
          {!options && !error && <p className="text-gray-400 text-sm">Carregando opções...</p>}
          {error && (
            <p className="text-red-300 text-sm">
              Não foi possível carregar as opções desta fonte: {error}
            </p>
          )}
          {options && options.length === 0 && (
            <p className="text-gray-400 text-sm">Nenhuma janela/processo encontrado agora.</p>
          )}
          {options?.map((opt) => (
            <button
              key={opt.itemValue}
              disabled={!opt.itemEnabled || applying}
              onClick={() => handleChoose(opt.itemValue)}
              className="text-left px-3 py-2 rounded bg-gray-700 active:bg-gray-600 disabled:opacity-40 text-sm"
            >
              {opt.itemName}
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-3">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-600 active:bg-gray-500">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
