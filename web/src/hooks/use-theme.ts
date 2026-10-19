import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

export const THEME_STORAGE_KEY = "zaeron-theme";
const LEGACY_STORAGE_KEY = "zaeron_theme";

export function getInitialTheme(): Theme {
  try {
    if (typeof window === "undefined") return "dark";
    // 1. Explicit user selection in localStorage (canonical or legacy)
    const saved =
      localStorage.getItem(THEME_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
    // 2. System preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      return "light";
    }
    // 3. Product default
    return "dark";
  } catch {
    return "dark";
  }
}

export function applyThemeToDocument(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
    root.setAttribute("data-theme", "dark");
  }

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#090B0D" : "#EEF1F6");
  }

  // Dispatch custom event for WebGL / Three.js 3D canvas listeners
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("zaeron-theme-changed", { detail: { theme } })
    );
  }
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = getInitialTheme();
    // Synchronously apply to DOM before first render
    applyThemeToDocument(initial);
    return initial;
  });

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToDocument(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      // Clean up legacy key if present
      if (localStorage.getItem(LEGACY_STORAGE_KEY)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {
      // Storage unavailable / private browsing fallback
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Ensure DOM and storage are in sync on mount and state changes
  useEffect(() => {
    applyThemeToDocument(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  // Cross-tab synchronization
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (
        (e.key === THEME_STORAGE_KEY || e.key === LEGACY_STORAGE_KEY) &&
        (e.newValue === "light" || e.newValue === "dark")
      ) {
        setThemeState(e.newValue);
        applyThemeToDocument(e.newValue);
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Listen to OS color scheme changes if user hasn't explicitly set a stored preference
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    function handleMediaChange(e: MediaQueryListEvent) {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (!stored) {
          const sysTheme: Theme = e.matches ? "light" : "dark";
          setThemeState(sysTheme);
          applyThemeToDocument(sysTheme);
        }
      } catch {
        // Ignore
      }
    }

    mediaQuery.addEventListener("change", handleMediaChange);
    return () => mediaQuery.removeEventListener("change", handleMediaChange);
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDark: theme === "dark",
    }),
    [theme, setTheme, toggleTheme]
  );

  return createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    // Graceful fallback for components used outside ThemeProvider
    const initial = getInitialTheme();
    return {
      theme: initial,
      setTheme: (t) => {
        applyThemeToDocument(t);
        try {
          localStorage.setItem(THEME_STORAGE_KEY, t);
        } catch {}
      },
      toggleTheme: () => {},
      isDark: initial === "dark",
    };
  }
  return context;
}
