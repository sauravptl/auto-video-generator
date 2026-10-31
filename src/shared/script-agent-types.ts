import type { VideoFormat, VideoScript } from './types';

export type ScriptProviderType = 'agy-cli' | 'openai-compatible' | 'local-fallback';

export interface ScriptProviderConfig {
  id: string;
  name: string;
  type: ScriptProviderType;
  enabled: boolean;
  baseUrl?: string;
  model?: string;
}

export interface ScriptProviderSummary extends ScriptProviderConfig {
  configured: boolean;
  hasApiKey: boolean;
  available?: boolean;
  version?: string;
  error?: string;
}

export interface ScriptGenerationRequest {
  topic: string;
  format: VideoFormat;
  referenceImages?: string[];
  providerId: string;
}

export interface ScriptProviderHealth {
  success: boolean;
  providerId: string;
  version?: string;
  error?: string;
}

export interface ScriptProviderSettings {
  providers: ScriptProviderConfig[];
  defaultProviderId?: string;
}

export type ScriptProviderSecretKey = `scriptProvider:${string}:apiKey`;

export interface SettingsSnapshot {
  metaAppId: string;
  metaAppSecretConfigured: boolean;
  metaRedirectUri: string;
  ffmpegPath: string;
  flowModel: string;
  defaultFormat: string;
  autoPublish: boolean;
  whatsappPhoneNumberId?: string;
  scriptProviders: ScriptProviderSummary[];
  defaultScriptProviderId?: string;
}

export interface SettingsUpdate {
  metaAppId?: string;
  metaAppSecret?: string;
  metaRedirectUri?: string;
  ffmpegPath?: string;
  flowModel?: string;
  defaultFormat?: string;
  autoPublish?: boolean;
  whatsappPhoneNumberId?: string;
  scriptProviders?: ScriptProviderConfig[];
  providerApiKeys?: Record<string, string>;
  defaultScriptProviderId?: string;
}

export interface ScriptGenerationResult extends VideoScript {
  providerId?: string;
}
