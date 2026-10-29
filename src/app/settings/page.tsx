'use client';

import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle2, Shield, Film, Sparkles, Terminal } from 'lucide-react';
import type { ScriptProviderConfig, SettingsSnapshot } from '@/shared/script-agent-types';

const defaults: ScriptProviderConfig[] = [
  { id: 'agy', name: 'AGY CLI', type: 'agy-cli', enabled: true },
  { id: 'openai', name: 'OpenAI-compatible', type: 'openai-compatible', enabled: false, baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { id: 'local-fallback', name: 'Local storyboard fallback', type: 'local-fallback', enabled: false },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsSnapshot | null>(null);
  const [providers, setProviders] = useState<ScriptProviderConfig[]>(defaults);
  const [apiKey, setApiKey] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [agyStatus, setAgyStatus] = useState<{ checked: boolean; success: boolean; version?: string } | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.settings.get().then(snapshot => {
      setSettings(snapshot);
      if (snapshot.scriptProviders.length) setProviders(snapshot.scriptProviders.map(({ configured, hasApiKey, available, version, error: providerError, ...provider }) => provider));
    }).catch(reason => setError(reason.message));
    window.electronAPI.agy.testConnection().then(result => setAgyStatus({ checked: true, success: result.success, version: result.version })).catch(() => setAgyStatus({ checked: true, success: false }));
  }, []);

  const updateProvider = (id: string, update: Partial<ScriptProviderConfig>) => {
    setProviders(current => current.map(provider => provider.id === id ? { ...provider, ...update } : provider));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      const openai = providers.find(provider => provider.id === 'openai');
      const snapshot = await window.electronAPI.settings.save({
        metaAppId: settings?.metaAppId || '',
        metaAppSecret,
        metaRedirectUri: settings?.metaRedirectUri,
        ffmpegPath: settings?.ffmpegPath,
        flowModel: settings?.flowModel,
        defaultFormat: settings?.defaultFormat,
        autoPublish: settings?.autoPublish,
        whatsappPhoneNumberId: settings?.whatsappPhoneNumberId,
        scriptProviders: providers,
        defaultScriptProviderId: settings?.defaultScriptProviderId || providers.find(provider => provider.enabled)?.id,
        providerApiKeys: apiKey ? { openai: apiKey } : undefined,
      });
      setSettings(snapshot);
      setMetaAppSecret('');
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (openai?.enabled && (!openai.baseUrl || !openai.model || (!snapshot.scriptProviders.find(provider => provider.id === 'openai')?.hasApiKey))) {
        setError('OpenAI-compatible is enabled but needs a valid URL, model, and API key before it can be selected.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Settings could not be saved.');
    }
  };

  if (!settings) return <div className="max-w-3xl mx-auto p-8 text-sm text-slate-600 dark:text-slate-300">Loading settings…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 rounded-full border border-lime-300 dark:border-[#BFF97E]/30 bg-lime-100 dark:bg-[#BFF97E]/10 px-3.5 py-1 text-xs font-semibold text-lime-800 dark:text-[#BFF97E]"><SettingsIcon className="h-3.5 w-3.5" /><span>System Preferences</span></div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Settings & Engine Configuration</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Credentials are stored by the Electron main process and are never returned to the renderer.</p>
      </div>
      {saved && <div role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center space-x-2"><CheckCircle2 className="h-4 w-4" /><span>Settings saved successfully.</span></div>}
      {error && <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs font-semibold text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/90 p-7 space-y-5 shadow-sm">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" /><h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Script Agents</h2></div>
          <p className="text-xs text-slate-600 dark:text-slate-400">Only enabled and fully configured agents appear in New Video. Google Flow remains the scene generator.</p>
          {providers.map(provider => <div key={provider.id} className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between"><div><div className="text-sm font-bold text-slate-900 dark:text-white">{provider.name}</div><div className="text-[11px] text-slate-500 dark:text-slate-400">{provider.type === 'agy-cli' ? agyStatus?.success ? `Available ${agyStatus.version || ''}` : agyStatus?.checked ? 'AGY CLI not available' : 'Checking AGY CLI…' : provider.type === 'local-fallback' ? 'Deterministic local storyboard generation' : settings.scriptProviders.find(item => item.id === provider.id)?.hasApiKey ? 'API key saved securely' : 'API key not configured'}</div></div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"><input type="checkbox" checked={provider.enabled} onChange={event => updateProvider(provider.id, { enabled: event.target.checked })} /> Enabled</label>
            </div>
            {provider.type === 'openai-compatible' && <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Provider name<input value={provider.name} onChange={event => updateProvider(provider.id, { name: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm" /></label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Model<input value={provider.model || ''} onChange={event => updateProvider(provider.id, { model: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm" placeholder="gpt-4o-mini" /></label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">Base URL<input value={provider.baseUrl || ''} onChange={event => updateProvider(provider.id, { baseUrl: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm" placeholder="https://api.openai.com/v1" /></label>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 sm:col-span-2">API key (write only)<input type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm" placeholder={settings.scriptProviders.find(item => item.id === provider.id)?.hasApiKey ? 'Saved securely — leave blank to keep' : 'Enter API key'} /></label>
            </div>}
          </div>)}
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Default script agent<select value={settings.defaultScriptProviderId || providers.find(provider => provider.enabled)?.id || ''} onChange={event => setSettings({ ...settings, defaultScriptProviderId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2 text-sm">{providers.filter(provider => provider.enabled).map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select></label>
        </section>
        <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/90 p-7 space-y-4 shadow-sm">
          <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" /><h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Meta Suite OAuth</h2></div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Meta App ID<input value={settings.metaAppId} onChange={event => setSettings({ ...settings, metaAppId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm" /></label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Meta App Secret (write only)<input type="password" value={metaAppSecret} onChange={event => setMetaAppSecret(event.target.value)} autoComplete="new-password" placeholder={settings.metaAppSecretConfigured ? 'Saved securely — leave blank to keep' : 'Enter app secret'} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm" /></label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Registered OAuth redirect URI<input value={settings.metaRedirectUri} onChange={event => setSettings({ ...settings, metaRedirectUri: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm font-mono" /></label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Register this exact redirect URI in Meta. Production use also requires the applicable products, scopes, public privacy/terms URLs, and Meta App Review.</p>
        </section>
        <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/90 p-7 space-y-4 shadow-sm">
          <div className="flex items-center gap-2"><Film className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" /><h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Engine Configuration</h2></div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">FFmpeg Binary Path<input value={settings.ffmpegPath} onChange={event => setSettings({ ...settings, ffmpegPath: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm font-mono" /></label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Google Flow Preferred Video Model<select value={settings.flowModel} onChange={event => setSettings({ ...settings, flowModel: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-black/30 px-3 py-2 text-sm"><option value="veo-3.1-fast">Veo 3.1 Fast</option><option value="veo-3.1-quality">Veo 3.1 Quality</option><option value="omni-flash">Gemini Omni-Flash</option></select></label>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">WhatsApp Phone Number ID<input value={settings.whatsappPhoneNumberId || ''} onChange={event => setSettings({ ...settings, whatsappPhoneNumberId: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/30 px-3 py-2 text-sm" /></label>
          <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 dark:bg-black/30 p-4 text-xs font-semibold text-slate-700 dark:text-slate-300">Default auto-publish<input type="checkbox" checked={settings.autoPublish} onChange={event => setSettings({ ...settings, autoPublish: event.target.checked })} /></label>
        </section>
        <section className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/90 p-7 space-y-3 shadow-sm">
          <div className="flex items-center gap-2"><Terminal className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" /><h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">AGY CLI</h2></div>
          <p className="text-xs text-slate-600 dark:text-slate-400">{agyStatus?.success ? `Available ${agyStatus.version || ''}` : agyStatus?.checked ? 'Not found in the application PATH.' : 'Checking connection…'}</p>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-agy-tutorial'))} className="rounded-full border border-slate-300 dark:border-white/15 px-4 py-2 text-xs font-semibold">Open AGY setup tutorial</button>
        </section>
        <button type="submit" className="inline-flex items-center gap-2 pill-btn-lime px-8 py-3.5 text-xs font-bold text-black shadow-xl"><Save className="h-4 w-4" /><span>Save Preferences</span></button>
      </form>
    </div>
  );
}
