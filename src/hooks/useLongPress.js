import { useRef, useCallback } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 15;

export function useLongPress(onLongPress, onClick) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const movedRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback((x, y) => {
    firedRef.current = false;
    movedRef.current = false;
    startPosRef.current = { x, y };
    clear();
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }, [clear, onLongPress]);

  const move = useCallback((x, y) => {
    const dx = x - startPosRef.current.x;
    const dy = y - startPosRef.current.y;
    if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
      movedRef.current = true;
      clear();
    }
  }, [clear]);

  const end = useCallback(() => {
    clear();
    // Se o dedo arrastou (ex: rolando o grid), não conta como toque no botão.
    if (!firedRef.current && !movedRef.current) onClick();
  }, [clear, onClick]);

  return {
    onMouseDown: (e) => start(e.clientX, e.clientY),
    onMouseMove: (e) => move(e.clientX, e.clientY),
    onMouseUp: end,
    onMouseLeave: clear,
    onTouchStart: (e) => {
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    },
    onTouchMove: (e) => {
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    },
    onTouchEnd: end,
    onTouchCancel: clear,
  };
}
