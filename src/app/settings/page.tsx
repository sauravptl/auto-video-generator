'use client';

import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, CheckCircle2, Shield, Film, Sparkles, Terminal } from 'lucide-react';

export default function SettingsPage() {
  const [metaAppId, setMetaAppId] = useState('');
  const [metaAppSecret, setMetaAppSecret] = useState('');
  const [ffmpegPath, setFfmpegPath] = useState('/Users/geniussau/.local/bin/ffmpeg');
  const [flowModel, setFlowModel] = useState('veo-3.1-fast');
  const [defaultAutoPublish, setDefaultAutoPublish] = useState(false);
  const [saved, setSaved] = useState(false);
  const [agyStatus, setAgyStatus] = useState<{ checked: boolean; success: boolean; version?: string } | null>(null);

  useEffect(() => {
    // Load existing settings if available in localStorage or Electron
    const savedId = localStorage.getItem('metaAppId') || '';
    const savedSecret = localStorage.getItem('metaAppSecret') || '';
    const savedFfmpeg = localStorage.getItem('ffmpegPath') || '/Users/geniussau/.local/bin/ffmpeg';
    const savedModel = localStorage.getItem('flowModel') || 'veo-3.1-fast';
    const savedAutoPublish = localStorage.getItem('autoPublish') === 'true';

    setMetaAppId(savedId);
    setMetaAppSecret(savedSecret);
    setFfmpegPath(savedFfmpeg);
    setFlowModel(savedModel);
    setDefaultAutoPublish(savedAutoPublish);

    if (typeof window !== 'undefined' && window.electronAPI?.agy) {
      window.electronAPI.agy.testConnection().then(res => {
        setAgyStatus({ checked: true, success: res.success, version: res.version });
      }).catch(console.error);
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('metaAppId', metaAppId);
    localStorage.setItem('metaAppSecret', metaAppSecret);
    localStorage.setItem('ffmpegPath', ffmpegPath);
    localStorage.setItem('flowModel', flowModel);
    localStorage.setItem('autoPublish', defaultAutoPublish ? 'true' : 'false');

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 rounded-full border border-slate-700 bg-studio-900 px-3 py-1 text-xs font-medium text-slate-300">
          <SettingsIcon className="h-3.5 w-3.5 text-purple-400" />
          <span>Application Settings</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Settings & Preferences</h1>
        <p className="text-sm text-slate-400">
          Configure API credentials, Google Flow models, and local media processing paths.
        </p>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Meta API Configuration */}
        <div className="rounded-2xl border border-studio-800 bg-studio-900/80 p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Meta Suite OAuth Credentials</h3>
          </div>
          <p className="text-xs text-slate-400">
            Obtain from your Meta Developer App at developers.facebook.com to enable 1-click OAuth login.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Meta App ID</label>
              <input
                type="text"
                value={metaAppId}
                onChange={e => setMetaAppId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full rounded-xl border border-studio-700 bg-studio-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-accent-purple focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Meta App Secret</label>
              <input
                type="password"
                value={metaAppSecret}
                onChange={e => setMetaAppSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full rounded-xl border border-studio-700 bg-studio-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-accent-purple focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Video & Flow Generation Preferences */}
        <div className="rounded-2xl border border-studio-800 bg-studio-900/80 p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <Film className="h-4 w-4 text-accent-purple" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Engine Configuration</h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">FFmpeg Binary Path</label>
              <input
                type="text"
                value={ffmpegPath}
                onChange={e => setFfmpegPath(e.target.value)}
                className="w-full rounded-xl border border-studio-700 bg-studio-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-accent-purple focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">Default: /Users/geniussau/.local/bin/ffmpeg</span>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Google Flow Preferred Video Model</label>
              <select
                value={flowModel}
                onChange={e => setFlowModel(e.target.value)}
                className="w-full rounded-xl border border-studio-700 bg-studio-950 px-3.5 py-2.5 text-xs text-white focus:border-accent-purple focus:outline-none"
              >
                <option value="veo-3.1-fast">Veo 3.1 Fast (Recommended for quick generation)</option>
                <option value="veo-3.1-quality">Veo 3.1 Quality (Highest visual fidelity)</option>
                <option value="omni-flash">Gemini Omni-Flash (Multimodal drafts)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Antigravity AI Engine (AGY CLI) */}
        <div className="rounded-2xl border border-studio-800 bg-studio-900/80 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-accent-pink" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Antigravity AI (AGY CLI)</h3>
            </div>
            {agyStatus?.checked && (
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  agyStatus.success
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
              >
                {agyStatus.success ? `✓ Ready (${agyStatus.version || 'v1.4.8'})` : 'Offline / Missing'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            AGY CLI generates viral multi-scene video scripts, camera directions, and prompts using your authenticated Google account.
          </p>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-studio-800 bg-studio-950/60">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Interactive Setup Tutorial</div>
              <p className="text-[11px] text-slate-400">
                View installation commands, Google OAuth instructions, and test your local connection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-agy-tutorial'))}
              className="inline-flex items-center space-x-1.5 rounded-xl bg-studio-800 border border-studio-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-studio-700 transition-all active:scale-95"
            >
              <Terminal className="h-3.5 w-3.5 text-accent-purple" />
              <span>Open AGY Tutorial</span>
            </button>
          </div>
        </div>

        {/* Publishing Automation Preferences */}
        <div className="rounded-2xl border border-studio-800 bg-studio-900/80 p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Social Publishing Automation</h3>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-studio-800 bg-studio-950/60">
            <div>
              <div className="text-xs font-semibold text-white">Default Auto-Publish Setting</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                When disabled, video production always pauses after assembly so you can review video and captions first.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={defaultAutoPublish}
                onChange={e => setDefaultAutoPublish(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-studio-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-purple"></div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center space-x-2 rounded-xl bg-accent-purple px-6 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:bg-accent-purple/90 active:scale-95 transition-all"
        >
          <Save className="h-4 w-4" />
          <span>Save Preferences</span>
        </button>
      </form>
    </div>
  );
}
