const MODULES = [
  { view: 'soundboard', icon: '🔊', label: 'Soundboard' },
  { view: 'scenes', icon: '🎬', label: 'Cenas' },
  { view: 'sources', icon: '👁', label: 'Fontes' },
  { view: 'mixer', icon: '🎚', label: 'Mixer' },
  { view: 'settings', icon: '⚙️', label: 'Configurações' },
];

export default function Home({ onSelect }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        {MODULES.map((mod) => (
          <button
            key={mod.view}
            onClick={() => onSelect(mod.view)}
            className={`${mod.view === 'settings' ? 'col-span-2 aspect-[2/1]' : 'aspect-square'} flex flex-col items-center justify-center gap-2 rounded-2xl bg-gray-800 text-white shadow-md active:scale-95 active:bg-gray-700 transition-transform`}
          >
            <span className="text-4xl">{mod.icon}</span>
            <span className="text-base font-semibold">{mod.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
