import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

type SaveHandler = () => Promise<void> | void;
type DiscardHandler = () => void;
type GetValuesFn = () => unknown;

export interface EditStartupActionBarConfig {
  saveLabel: string;
  alwaysVisible: boolean;
  showDiscard: boolean;
}

const DEFAULT_ACTION_BAR_CONFIG: EditStartupActionBarConfig = {
  saveLabel: "Salvar alterações",
  alwaysVisible: false,
  showDiscard: true,
};

interface EditStartupFormContextValue {
  dirtyCount: number;
  isDirty: boolean;
  actionBarConfig: EditStartupActionBarConfig;
  setDirtyCount: (count: number) => void;
  setActionBarConfig: (
    config: Partial<EditStartupActionBarConfig>,
  ) => void;
  registerHandlers: (handlers: { onSave: SaveHandler; onDiscard: DiscardHandler }) => void;
  registerSectionReset: (sectionId: string, reset: () => void) => void;
  unregisterSectionReset: (sectionId: string) => void;
  registerSectionGetValues: (sectionId: string, getValues: GetValuesFn) => void;
  unregisterSectionGetValues: (sectionId: string) => void;
  getAllSectionValues: () => Record<string, unknown>;
  resetAllSections: () => void;
  setOnSave?: (handler: SaveHandler) => void;
  onSave: SaveHandler;
  onDiscard: DiscardHandler;
}

const noop = () => {};

const EditStartupFormContext = createContext<EditStartupFormContextValue>({
  dirtyCount: 0,
  isDirty: false,
  actionBarConfig: DEFAULT_ACTION_BAR_CONFIG,
  setDirtyCount: noop,
  setActionBarConfig: noop,
  registerHandlers: noop,
  registerSectionReset: noop,
  unregisterSectionReset: noop,
  registerSectionGetValues: noop,
  unregisterSectionGetValues: noop,
  getAllSectionValues: () => ({}),
  resetAllSections: noop,
  onSave: noop,
  onDiscard: noop,
});

export function EditStartupFormProvider({ children }: { children: ReactNode }) {
  const [dirtyCount, setDirtyCount] = useState(0);
  const [actionBarConfig, setActionBarConfigState] =
    useState<EditStartupActionBarConfig>(DEFAULT_ACTION_BAR_CONFIG);
  const [handlers, setHandlers] = useState<{ onSave: SaveHandler; onDiscard: DiscardHandler }>({
    onSave: noop,
    onDiscard: noop,
  });

  const sectionResetsRef = useRef<Map<string, () => void>>(new Map());
  const sectionGetValuesRef = useRef<Map<string, GetValuesFn>>(new Map());

  const registerHandlers = useCallback(
    (next: { onSave: SaveHandler; onDiscard: DiscardHandler }) => {
      setHandlers(next);
    },
    [],
  );

  const registerSectionReset = useCallback((sectionId: string, reset: () => void) => {
    sectionResetsRef.current.set(sectionId, reset);
  }, []);

  const unregisterSectionReset = useCallback((sectionId: string) => {
    sectionResetsRef.current.delete(sectionId);
  }, []);

  const registerSectionGetValues = useCallback(
    (sectionId: string, getValues: GetValuesFn) => {
      sectionGetValuesRef.current.set(sectionId, getValues);
    },
    [],
  );

  const unregisterSectionGetValues = useCallback((sectionId: string) => {
    sectionGetValuesRef.current.delete(sectionId);
  }, []);

  const getAllSectionValues = useCallback(() => {
    const out: Record<string, unknown> = {};
    sectionGetValuesRef.current.forEach((getValues, sectionId) => {
      try {
        out[sectionId] = getValues();
      } catch {
        out[sectionId] = null;
      }
    });
    return out;
  }, []);

  const resetAllSections = useCallback(() => {
    sectionResetsRef.current.forEach((reset) => reset());
  }, []);

  const setOnSave = useCallback((handler: SaveHandler) => {
    setHandlers((prev) => ({ ...prev, onSave: handler }));
  }, []);

  const setActionBarConfig = useCallback(
    (config: Partial<EditStartupActionBarConfig>) => {
      setActionBarConfigState((previous) => ({ ...previous, ...config }));
    },
    [],
  );

  const value = useMemo<EditStartupFormContextValue>(
    () => ({
      dirtyCount,
      isDirty: dirtyCount > 0 || actionBarConfig.alwaysVisible,
      actionBarConfig,
      setDirtyCount,
      setActionBarConfig,
      registerHandlers,
      registerSectionReset,
      unregisterSectionReset,
      registerSectionGetValues,
      unregisterSectionGetValues,
      getAllSectionValues,
      resetAllSections,
      setOnSave,
      onSave: handlers.onSave,
      onDiscard: handlers.onDiscard,
    }),
    [
      dirtyCount,
      actionBarConfig,
      setActionBarConfig,
      registerHandlers,
      registerSectionReset,
      unregisterSectionReset,
      registerSectionGetValues,
      unregisterSectionGetValues,
      getAllSectionValues,
      resetAllSections,
      setOnSave,
      handlers.onSave,
      handlers.onDiscard,
    ],
  );

  return <EditStartupFormContext.Provider value={value}>{children}</EditStartupFormContext.Provider>;
}

export function useEditStartupForm() {
  return useContext(EditStartupFormContext);
}

export { EditStartupFormContext };
