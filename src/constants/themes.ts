export const GUI_THEME_STORAGE_KEY = 'appGuiTheme';

export type ThemeDef = { id: string; name: string };

export const AVAILABLE_THEMES: ThemeDef[] = [
  { id: 'default-light', name: 'Default Light' },
  { id: 'default-dark', name: 'Default Dark' },
  { id: 'catppuccin-latte', name: 'Catppuccin Latte' },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha' },
];

