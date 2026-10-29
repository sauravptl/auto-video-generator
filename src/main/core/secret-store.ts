import { safeStorage } from 'electron';
import { store } from './store';

const SECRET_PREFIX = 'safe:v1:';

export class SecretStore {
  private static assertAvailable(): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Secure credential storage is unavailable. Unlock the OS keychain and restart CineFlow AI before saving credentials.');
    }
  }

  public static get(key: string): string | undefined {
    const value = store.get<string>(`secureSecrets.${key}`);
    if (!value) return undefined;
    this.assertAvailable();
    if (!value.startsWith(SECRET_PREFIX)) return undefined;
    try {
      return safeStorage.decryptString(Buffer.from(value.slice(SECRET_PREFIX.length), 'base64'));
    } catch {
      throw new Error(`Unable to decrypt secure credential ${key}. Re-enter it in Settings.`);
    }
  }

  public static set(key: string, value: string): void {
    this.assertAvailable();
    const encrypted = safeStorage.encryptString(value).toString('base64');
    store.set(`secureSecrets.${key}`, `${SECRET_PREFIX}${encrypted}`);
  }

  public static delete(key: string): void {
    store.delete(`secureSecrets.${key}`);
  }

  public static has(key: string): boolean {
    return !!store.get<string>(`secureSecrets.${key}`);
  }
}
