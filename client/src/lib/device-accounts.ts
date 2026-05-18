const STORAGE_KEY = "mydraft_device_accounts";
const SWITCH_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000;

export interface DeviceAccount {
  userId: string;
  email: string;
  displayName: string | null;
  plan: string | null;
  lastUsed: number;
  switchToken?: string;
  tokenSavedAt?: number;
}

export function getDeviceAccounts(): DeviceAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DeviceAccount[];
  } catch {
    return [];
  }
}

export function saveDeviceAccount(
  account: Omit<DeviceAccount, "lastUsed"> & { switchToken?: string }
) {
  const accounts = getDeviceAccounts();
  const idx = accounts.findIndex((a) => a.userId === account.userId);
  const existing = idx >= 0 ? accounts[idx] : null;

  const entry: DeviceAccount = {
    userId: account.userId,
    email: account.email,
    displayName: account.displayName,
    plan: account.plan,
    lastUsed: Date.now(),
    switchToken: account.switchToken ?? existing?.switchToken,
    tokenSavedAt: account.switchToken ? Date.now() : existing?.tokenSavedAt,
  };

  if (idx >= 0) accounts[idx] = entry;
  else accounts.push(entry);

  accounts.sort((a, b) => b.lastUsed - a.lastUsed);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function removeDeviceAccount(userId: string) {
  const accounts = getDeviceAccounts().filter((a) => a.userId !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function clearSwitchToken(userId: string) {
  const accounts = getDeviceAccounts();
  const idx = accounts.findIndex((a) => a.userId === userId);
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], switchToken: undefined, tokenSavedAt: undefined };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }
}

export function hasValidSwitchToken(account: DeviceAccount): boolean {
  if (!account.switchToken || !account.tokenSavedAt) return false;
  return Date.now() - account.tokenSavedAt < SWITCH_TOKEN_TTL_MS;
}
