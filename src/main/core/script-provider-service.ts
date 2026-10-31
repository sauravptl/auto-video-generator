import axios, { AxiosError } from 'axios';
import { AgyClient } from '../integrations/agy/agy-client';
import { SettingsService } from './settings-service';
import type { SceneDefinition, VideoScript } from '../../shared/types';
import type { ScriptGenerationRequest, ScriptProviderHealth, ScriptProviderSummary } from '../../shared/script-agent-types';

const STORYBOARD_PROMPT = `You are an expert AI video director for short social videos. Return only JSON with title, synopsis, targetDurationSeconds, caption, hashtags, and 3-5 scenes. Each scene needs durationSeconds (4, 6, 8, or 10), model (veo-3.1-fast), visualPrompt, narrationOrSubtitle, transition (fade, dissolve, wipeleft, or circlecrop), and transitionDuration.`;

function parseScript(content: string, referenceImages?: string[]): VideoScript {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed: unknown;
  try { parsed = JSON.parse(cleaned); } catch { throw new Error('The provider returned invalid JSON.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('The provider returned an invalid storyboard.');
  const value = parsed as Partial<VideoScript>;
  if (!value.title || !value.synopsis || !value.caption || !Array.isArray(value.hashtags) || !Array.isArray(value.scenes) || value.scenes.length === 0) {
    throw new Error('The provider response is missing required storyboard fields.');
  }
  const scenes = value.scenes.map((scene, index): SceneDefinition => {
    const candidate = scene as Partial<SceneDefinition>;
    if (!candidate.visualPrompt || !candidate.narrationOrSubtitle) throw new Error(`Scene ${index + 1} is incomplete.`);
    const duration = [4, 6, 8, 10].includes(candidate.durationSeconds || 6) ? candidate.durationSeconds as 4 | 6 | 8 | 10 : 6;
    return {
      sceneIndex: index,
      durationSeconds: duration,
      model: candidate.model || 'veo-3.1-fast',
      visualPrompt: candidate.visualPrompt,
      narrationOrSubtitle: candidate.narrationOrSubtitle,
      transition: candidate.transition || 'fade',
      transitionDuration: candidate.transitionDuration || 0.5,
      referenceImage: referenceImages?.[index % referenceImages.length],
      status: 'pending',
    };
  });
  return {
    title: value.title,
    synopsis: value.synopsis,
    targetDurationSeconds: Number(value.targetDurationSeconds) || scenes.reduce((total, scene) => total + scene.durationSeconds, 0),
    caption: value.caption,
    hashtags: value.hashtags.filter((tag): tag is string => typeof tag === 'string'),
    scenes,
  };
}

function completionUrl(baseUrl: string): string {
  return /\/chat\/completions\/?$/i.test(baseUrl) ? baseUrl : `${baseUrl.replace(/\/$/, '')}/chat/completions`;
}

export class ScriptProviderService {
  public static listConfigured(): ScriptProviderSummary[] {
    return SettingsService.getProviders()
      .map(provider => SettingsService.toSummary(provider))
      .filter(provider => provider.enabled && provider.configured);
  }

  public static async test(providerId: string): Promise<ScriptProviderHealth> {
    const provider = SettingsService.getProvider(providerId);
    if (!provider || !provider.enabled) return { success: false, providerId, error: 'Provider is unavailable.' };
    if (provider.type === 'agy-cli') {
      const result = await AgyClient.testConnection();
      return { ...result, providerId };
    }
    if (provider.type === 'local-fallback') return { success: true, providerId };
    if (!SettingsService.toSummary(provider).configured) return { success: false, providerId, error: 'Add a base URL, model, and API key in Settings.' };
    try {
      await axios.get(provider.baseUrl!, { timeout: 8_000, maxContentLength: 16_000 });
      return { success: true, providerId };
    } catch (error) {
      const status = (error as AxiosError).response?.status;
      return { success: status === 401 || status === 404 || !!status, providerId, error: status ? undefined : 'Could not reach the configured provider.' };
    }
  }

  public static async generate(request: ScriptGenerationRequest): Promise<VideoScript> {
    const provider = SettingsService.getProvider(request.providerId);
    if (!provider || !provider.enabled) throw new Error('Selected script provider is unavailable. Choose a configured provider in Settings.');
    if (provider.type === 'agy-cli') return AgyClient.generateScript(request.topic, request.format, request.referenceImages, false);
    if (provider.type === 'local-fallback') return AgyClient.generateLocalFallback(request.topic, request.format, request.referenceImages);
    const apiKey = SettingsService.getProviderApiKey(provider.id);
    if (!provider.baseUrl || !provider.model || !apiKey) throw new Error(`${provider.name} is incomplete. Add its base URL, model, and API key in Settings.`);
    try {
      const response = await axios.post(
        completionUrl(provider.baseUrl),
        {
          model: provider.model,
          temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: STORYBOARD_PROMPT },
            { role: 'user', content: `Create a storyboard for: ${request.topic}` },
          ],
        },
        { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60_000, maxContentLength: 1_000_000 }
      );
      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('The provider response did not include a storyboard.');
      return parseScript(content, request.referenceImages);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401 || status === 403) throw new Error(`${provider.name} rejected its API key.`);
        if (status === 429) throw new Error(`${provider.name} is rate-limiting requests. Try again shortly.`);
        if (error.code === 'ECONNABORTED') throw new Error(`${provider.name} timed out while generating the storyboard.`);
      }
      throw error instanceof Error ? error : new Error(`${provider.name} failed to generate a storyboard.`);
    }
  }
}
