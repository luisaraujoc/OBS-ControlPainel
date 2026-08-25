import { useCallback, useMemo, useState } from 'react';
import defaultButtons from '../config/buttons.default.json';
import {
  getCustomOverrides,
  saveCustomOverride,
  resetCustomOverrides,
  getDiscoveredButtons,
  saveDiscoveredButtons,
} from '../utils/storage';

export function useButtonConfig() {
  const [overrides, setOverrides] = useState(() => getCustomOverrides());
  const [baseButtons, setBaseButtons] = useState(() => getDiscoveredButtons() || defaultButtons);

  const buttons = useMemo(
    () => baseButtons.map((btn) => ({ ...btn, ...overrides[btn.id] })),
    [baseButtons, overrides]
  );

  const updateButton = useCallback((buttonId, patch) => {
    const updated = saveCustomOverride(buttonId, patch);
    setOverrides({ ...updated });
  }, []);

  const resetAll = useCallback(() => {
    resetCustomOverrides();
    setOverrides({});
  }, []);

  const syncButtons = useCallback((discovered) => {
    if (!discovered || discovered.length === 0) return;
    saveDiscoveredButtons(discovered);
    setBaseButtons(discovered);
  }, []);

  return { buttons, updateButton, resetAll, syncButtons };
}
