import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DARK, LIGHT } from '../constants/themes';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'auren:theme';

export function ThemeProvider({ children }) {
  const systemScheme          = useColorScheme(); // 'dark' | 'light' | null
  const [themeMode, setMode]  = useState('dark'); // 'auto' | 'dark' | 'light'

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val === 'auto' || val === 'dark' || val === 'light') setMode(val);
    });
  }, []);

  function setThemeMode(mode) {
    setMode(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }

  const isDark =
    themeMode === 'dark'  ? true  :
    themeMode === 'light' ? false :
    systemScheme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK : LIGHT, isDark, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
