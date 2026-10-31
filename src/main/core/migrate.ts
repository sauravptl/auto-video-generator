import { store } from './store';
import { SecretStore } from './secret-store';

/**
 * Moves any pre-existing plaintext credentials out of config.json into
 * OS-encrypted storage. Runs once after app.whenReady, when safeStorage is
 * available. Values are only removed after the encrypted copy succeeds.
 */
export function migrateLegacyPlaintextSecrets(): void {
  try {
    const userToken = store.get<string>('metaTokens.userAccessToken');
    if (userToken && !SecretStore.has('meta:user-token')) {
      SecretStore.set('meta:user-token', userToken);
      store.delete('metaTokens.userAccessToken');
    }
    const pageToken = store.get<string>('metaTokens.pageAccessToken');
    if (pageToken && !SecretStore.has('meta:page-token')) {
      SecretStore.set('meta:page-token', pageToken);
      store.delete('metaTokens.pageAccessToken');
    }
    const appSecret = store.get<string>('settings.metaAppSecret', '');
    if (appSecret && !SecretStore.has('meta:app-secret')) {
      SecretStore.set('meta:app-secret', appSecret);
      store.set('settings.metaAppSecret', '');
    }
    const cachedStatus = store.get<any>('metaTokens.cachedStatus');
    if (cachedStatus && JSON.stringify(cachedStatus).includes('accessToken')) {
      store.delete('metaTokens.cachedStatus');
    }
  } catch (err) {
    console.warn('Could not migrate legacy plaintext credentials to secure storage:', err);
  }
}
