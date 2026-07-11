import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  LOCAL_STORAGE_EVENT,
  readStorage,
  removeStorage,
  storageKey,
  writeStorage,
} from "../lib/storage";

export type LocalStorageSetter<T> = Dispatch<SetStateAction<T>>;

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => readStorage(key, initialValue));

  useEffect(() => {
    const scopedKey = storageKey(key);

    const syncFromStorage = (event: Event) => {
      if (event instanceof StorageEvent && event.key !== scopedKey) return;
      if (event instanceof CustomEvent && event.detail?.key !== scopedKey) return;
      setValue(readStorage(key, initialValue));
    };

    window.addEventListener("storage", syncFromStorage);
    window.addEventListener(LOCAL_STORAGE_EVENT, syncFromStorage);
    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener(LOCAL_STORAGE_EVENT, syncFromStorage);
    };
  }, [initialValue, key]);

  const setStoredValue = useCallback<LocalStorageSetter<T>>(
    (nextValue) => {
      setValue((currentValue) => {
        const resolvedValue = typeof nextValue === "function"
          ? (nextValue as (value: T) => T)(currentValue)
          : nextValue;
        writeStorage(key, resolvedValue);
        return resolvedValue;
      });
    },
    [key],
  );

  const clearStoredValue = useCallback(() => {
    removeStorage(key);
    setValue(initialValue);
  }, [initialValue, key]);

  return [value, setStoredValue, clearStoredValue] as const;
}

