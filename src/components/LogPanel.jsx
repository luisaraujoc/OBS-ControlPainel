import { useEffect, useState } from 'react';
import { getLogEntries, subscribeToLogs, clearLogEntries } from '../utils/logger';

const LEVEL_COLOR = {
  info: 'text-blue-300',
  warn: 'text-yellow-300',
  error: 'text-red-400',
};

function formatTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour12: false });
}

function formatEntry(entry) {
  const data = entry.data !== undefined ? ` ${JSON.stringify(entry.data)}` : '';
  return `[${formatTime(entry.time)}] ${entry.level.toUpperCase()} ${entry.message}${data}`;
}

export default function LogPanel({ onClose }) {
  const [entries, setEntries] = useState(getLogEntries());

  useEffect(() => subscribeToLogs(setEntries), []);

  const handleCopy = async () => {
    const text = entries.map(formatEntry).join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // clipboard indisponível (ex: contexto não-seguro); ignora silenciosamente
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-2">
      <div className="bg-gray-900 text-white rounded-xl w-full max-w-2xl h-[70vh] flex flex-col shadow-xl border border-gray-700">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
          <h2 className="text-sm font-semibold">Logs de conexão OBS</h2>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="text-xs px-2 py-1 rounded bg-gray-700 active:bg-gray-600">
              Copiar
            </button>
            <button onClick={clearLogEntries} className="text-xs px-2 py-1 rounded bg-gray-700 active:bg-gray-600">
              Limpar
            </button>
            <button onClick={onClose} className="text-xs px-2 py-1 rounded bg-gray-700 active:bg-gray-600">
              Fechar
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
          {entries.length === 0 && <div className="text-gray-500">Sem eventos ainda.</div>}
          {entries.map((entry) => (
            <div key={entry.id} className={LEVEL_COLOR[entry.level] || 'text-gray-300'}>
              <span className="text-gray-500">[{formatTime(entry.time)}]</span> {entry.message}
              {entry.data !== undefined && (
                <span className="text-gray-500"> {JSON.stringify(entry.data)}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
