import { type Dispatch, type SetStateAction, useState } from 'react';

export const useLocalStorage = <Type>(
  keyName: string,
  defaultValue: Type | null
) => {
  const [storedValue, setStoredValue] = useState<Type | null>(() => {
    try {
      const value = localStorage.getItem(keyName);
      if (value) {
        return JSON.parse(value) as Type;
      } else {
        localStorage.setItem(keyName, JSON.stringify(defaultValue));
        return defaultValue;
      }
    } catch (err) {
      console.log(err);
      return defaultValue;
    }
  });
  const setValue = (newValue: Type | null) => {
    try {
      localStorage.setItem(keyName, JSON.stringify(newValue));
    } catch (err) {
      console.log(err);
    }
    setStoredValue(newValue);
  };
  return [
    storedValue as Type,
    setValue as Dispatch<SetStateAction<Type>>,
  ] as const;
};
