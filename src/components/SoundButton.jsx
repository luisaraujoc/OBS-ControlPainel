import { useState } from 'react';
import { useLongPress } from '../hooks/useLongPress';

export default function SoundButton({ button, onTrigger, onEdit }) {
  const [pressed, setPressed] = useState(false);

  const handleClick = () => {
    setPressed(true);
    if (navigator.vibrate) navigator.vibrate(50);
    onTrigger(button);
    setTimeout(() => setPressed(false), 150);
  };

  const handleLongPress = () => {
    if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
    onEdit(button);
  };

  const longPressHandlers = useLongPress(handleLongPress, handleClick);

  return (
    <button
      {...longPressHandlers}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative aspect-square flex flex-col items-center justify-center gap-1 rounded-xl text-white font-semibold shadow-md transition-transform duration-100 select-none touch-pan-y
        ${button.color || 'bg-gray-500'}
        ${pressed ? 'scale-90 brightness-125' : 'scale-100'}`}
    >
      <span className="text-2xl leading-none">{button.icon}</span>
      <span className="text-xs sm:text-sm leading-tight text-center px-1">{button.label}</span>
    </button>
  );
}
