import { signal, effect } from '@preact/signals';
import { AVAILABLE_THEMES, GUI_THEME_STORAGE_KEY } from '../constants/themes';

// Holds the current theme id
export const currentThemeId = signal<string>(AVAILABLE_THEMES[0].id);

// Initialize from storage on module load if available
export const initThemeFromStorage = () => {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(GUI_THEME_STORAGE_KEY);
  if (stored && AVAILABLE_THEMES.some(t => t.id === stored)) {
    currentThemeId.value = stored;
  }
};

// Apply theme classes to <html> and persist when it changes
effect(() => {
  if (typeof document === 'undefined') return;
  const id = currentThemeId.value;
  AVAILABLE_THEMES.forEach(theme => document.documentElement.classList.remove(`theme-${theme.id}`));
  document.documentElement.classList.add(`theme-${id}`);
  try {
    localStorage.setItem(GUI_THEME_STORAGE_KEY, id);
  } catch {}
});

export const setTheme = (id: string) => {
  if (AVAILABLE_THEMES.some(t => t.id === id)) {
    currentThemeId.value = id;
  }
};

