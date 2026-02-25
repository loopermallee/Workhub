import { useEffect } from "react";

function isDayTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 6 && hour < 19;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    function applyTheme() {
      if (isDayTime()) {
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.add("dark");
      }
    }

    applyTheme();
    const interval = setInterval(applyTheme, 60_000);
    return () => clearInterval(interval);
  }, []);

  return <>{children}</>;
}
