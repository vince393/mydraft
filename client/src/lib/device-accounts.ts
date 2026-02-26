const STORAGE_KEY = "mydraft_device_accounts";

export interface DeviceAccount {
  userId: string;
  email: string;
  displayName: string | null;
  plan: string | null;
  lastUsed: number;
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

export function saveDeviceAccount(account: Omit<DeviceAccount, "lastUsed">) {
  const accounts = getDeviceAccounts();
  const idx = accounts.findIndex((a) => a.userId === account.userId);
  const entry: DeviceAccount = { ...account, lastUsed: Date.now() };

  if (idx >= 0) {
    accounts[idx] = entry;
  } else {
    accounts.push(entry);
  }

  accounts.sort((a, b) => b.lastUsed - a.lastUsed);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

export function removeDeviceAccount(userId: string) {
  const accounts = getDeviceAccounts().filter((a) => a.userId !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}
