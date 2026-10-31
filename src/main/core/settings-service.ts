import { store, defaultScriptProviders } from './store';
import { SecretStore } from './secret-store';
import type {
  ScriptProviderConfig,
  ScriptProviderSummary,
  SettingsSnapshot,
  SettingsUpdate,
} from '../../shared/script-agent-types';

const META_SECRET_KEY = 'meta:app-secret';
const providerSecretKey = (id: string) => `scriptProvider:${id}:apiKey`;

function isLoopback(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function validateProvider(provider: ScriptProviderConfig): ScriptProviderConfig {
  if (!/^[a-z0-9-]{1,64}$/.test(provider.id)) throw new Error('Provider ID may only contain lowercase letters, numbers, and dashes.');
  if (!provider.name.trim()) throw new Error('Provider name is required.');
  if (provider.type === 'openai-compatible') {
    if (!provider.baseUrl || !provider.model) throw new Error(`${provider.name} needs a base URL and model.`);
    let url: URL;
    try { url = new URL(provider.baseUrl); } catch { throw new Error(`${provider.name} has an invalid base URL.`); }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback(url.hostname))) {
      throw new Error(`${provider.name} must use HTTPS unless it targets localhost.`);
    }
    return { ...provider, baseUrl: url.toString().replace(/\/$/, '') };
  }
  return { id: provider.id, name: provider.name.trim(), type: provider.type, enabled: provider.enabled };
}

export class SettingsService {
  public static getMetaAppSecret(): string | undefined {
    const secure = SecretStore.get(META_SECRET_KEY);
    if (secure) return secure;
    const legacy = store.get<string>('settings.metaAppSecret', '');
    if (!legacy) return undefined;
    SecretStore.set(META_SECRET_KEY, legacy);
    store.set('settings.metaAppSecret', '');
    return legacy;
  }

  public static getSnapshot(): SettingsSnapshot {
    const settings = store.get<any>('settings', {});
    const providers = this.getProviders();
    return {
      metaAppId: settings.metaAppId || '',
      metaAppSecretConfigured: SecretStore.has(META_SECRET_KEY) || !!settings.metaAppSecret,
      metaRedirectUri: settings.metaRedirectUri || 'http://127.0.0.1:54321/auth/callback',
      ffmpegPath: settings.ffmpegPath || '',
      flowModel: settings.flowModel || 'veo-3.1-fast',
      defaultFormat: settings.defaultFormat || 'both',
      autoPublish: !!settings.autoPublish,
      whatsappPhoneNumberId: settings.whatsappPhoneNumberId,
      scriptProviders: providers.map(provider => this.toSummary(provider)),
      defaultScriptProviderId: settings.defaultScriptProviderId,
    };
  }

  public static getProviders(): ScriptProviderConfig[] {
    const providers = store.get<ScriptProviderConfig[]>('settings.scriptProviders', defaultScriptProviders);
    return Array.isArray(providers) && providers.length ? providers : defaultScriptProviders;
  }

  public static getProvider(id: string): ScriptProviderConfig | undefined {
    return this.getProviders().find(provider => provider.id === id);
  }

  public static getProviderApiKey(id: string): string | undefined {
    return SecretStore.get(providerSecretKey(id));
  }

  public static getDefaultProviderId(): string | undefined {
    return store.get<string>('settings.defaultScriptProviderId') || this.getProviders().find(provider => provider.enabled)?.id;
  }

  public static save(update: SettingsUpdate): SettingsSnapshot {
    const current = store.get<any>('settings', {});
    const next = { ...current };
    for (const key of ['metaAppId', 'metaRedirectUri', 'ffmpegPath', 'flowModel', 'defaultFormat', 'autoPublish', 'whatsappPhoneNumberId'] as const) {
      if (update[key] !== undefined) next[key] = update[key];
    }
    if (next.metaRedirectUri) {
      const redirect = new URL(next.metaRedirectUri);
      if (redirect.protocol !== 'http:' || !isLoopback(redirect.hostname) || redirect.pathname !== '/auth/callback') {
        throw new Error('Meta redirect URI must be a loopback http://127.0.0.1:<port>/auth/callback URL.');
      }
      next.metaRedirectUri = redirect.toString().replace(/\/$/, '');
    }
    if (update.scriptProviders) {
      const providers = update.scriptProviders.map(validateProvider);
      if (new Set(providers.map(provider => provider.id)).size !== providers.length) throw new Error('Provider IDs must be unique.');
      next.scriptProviders = providers;
    }
    if (update.defaultScriptProviderId !== undefined) {
      const valid = (next.scriptProviders || this.getProviders()).some((provider: ScriptProviderConfig) => provider.id === update.defaultScriptProviderId && provider.enabled);
      if (!valid) throw new Error('Default script provider must be enabled.');
      next.defaultScriptProviderId = update.defaultScriptProviderId;
    }
    store.set('settings', next);
    if (update.metaAppSecret?.trim()) SecretStore.set(META_SECRET_KEY, update.metaAppSecret.trim());
    for (const [id, apiKey] of Object.entries(update.providerApiKeys || {})) {
      if (!this.getProvider(id) && !next.scriptProviders?.some((provider: ScriptProviderConfig) => provider.id === id)) throw new Error('Unknown provider secret.');
      if (apiKey.trim()) SecretStore.set(providerSecretKey(id), apiKey.trim());
    }
    return this.getSnapshot();
  }

  public static toSummary(provider: ScriptProviderConfig): ScriptProviderSummary {
    const hasApiKey = provider.type === 'openai-compatible' && SecretStore.has(providerSecretKey(provider.id));
    const configured = provider.type === 'openai-compatible' ? !!(provider.baseUrl && provider.model && hasApiKey) : true;
    return { ...provider, configured, hasApiKey };
  }
}
