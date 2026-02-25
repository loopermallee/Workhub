import { createContext, useContext, useEffect, useState } from "react";

const MANUAL_KEY = "theme:manual";

function getSystemTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 19 ? "light" : "dark";
}

function applyTheme(theme: "light" | "dark") {
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

interface ThemeContextValue {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const manual = localStorage.getItem(MANUAL_KEY);
      if (manual === "light" || manual === "dark") return manual;
    } catch {
      // ignore
    }
    return getSystemTheme();
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const manual = localStorage.getItem(MANUAL_KEY);
        if (!manual) {
          const sys = getSystemTheme();
          setTheme(sys);
        }
      } catch {
        // ignore
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    try {
      localStorage.setItem(MANUAL_KEY, next);
    } catch {
      // ignore
    }
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
