const STORAGE_KEY = "admin:mode";

export function isAdminMode(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

export function setAdminMode(pin: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, pin);
    sessionStorage.setItem("admin:authed", pin);
  } catch {
    // ignore
  }
}

export function clearAdminMode(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem("admin:authed");
  } catch {
    // ignore
  }
}

export function getAdminPin(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}
