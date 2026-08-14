const KEY = 'jobTrackerTheme';

export const readTheme = () =>
  localStorage.getItem(KEY) ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export const applyTheme = (theme) => {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(KEY, theme);
};

// Runs on import, before React paints. The theme has to be on the page from the
// very first frame — the sign-in screen renders long before JobTracker mounts,
// and this also kills the flash of the wrong theme on reload.
applyTheme(readTheme());
