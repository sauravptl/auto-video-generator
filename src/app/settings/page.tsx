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
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 rounded-full border border-lime-300 dark:border-[#BFF97E]/30 bg-lime-100 dark:bg-[#BFF97E]/10 px-3.5 py-1 text-xs font-semibold text-lime-800 dark:text-[#BFF97E]">
          <SettingsIcon className="h-3.5 w-3.5" />
          <span>System Preferences</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Settings & Engine Configuration</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Configure API credentials, Google Flow models, FFmpeg binaries, and automated publishing preferences.
        </p>
      </div>

      {saved && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center space-x-2 shadow-lg animate-in fade-in duration-200">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Meta API Configuration */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 p-7 space-y-5 shadow-sm dark:shadow-xl backdrop-blur-2xl">
          <div className="flex items-center space-x-2.5">
            <Shield className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Meta Suite OAuth Credentials</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Obtain from your Meta Developer App at developers.facebook.com to enable 1-click OAuth login.
          </p>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">Meta App ID</label>
              <input
                type="text"
                value={metaAppId}
                onChange={e => setMetaAppId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-black/40 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-lime-500 dark:focus:border-[#BFF97E]/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20 dark:focus:ring-[#BFF97E]/20 transition-all font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">Meta App Secret</label>
              <input
                type="password"
                value={metaAppSecret}
                onChange={e => setMetaAppSecret(e.target.value)}
                placeholder="••••••••••••••••"
                className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-black/40 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-lime-500 dark:focus:border-[#BFF97E]/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20 dark:focus:ring-[#BFF97E]/20 transition-all font-mono"
              />
            </div>
          </div>
        </div>

        {/* Video & Flow Generation Preferences */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 p-7 space-y-5 shadow-sm dark:shadow-xl backdrop-blur-2xl">
          <div className="flex items-center space-x-2.5">
            <Film className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Engine Configuration</h3>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">FFmpeg Binary Path</label>
              <input
                type="text"
                value={ffmpegPath}
                onChange={e => setFfmpegPath(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-black/40 px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-lime-500 dark:focus:border-[#BFF97E]/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20 dark:focus:ring-[#BFF97E]/20 transition-all font-mono"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">Default: /Users/geniussau/.local/bin/ffmpeg</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">Google Flow Preferred Video Model</label>
              <select
                value={flowModel}
                onChange={e => setFlowModel(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-black/40 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-lime-500 dark:focus:border-[#BFF97E]/50 focus:outline-none focus:ring-2 focus:ring-lime-400/20 dark:focus:ring-[#BFF97E]/20 transition-all"
              >
                <option value="veo-3.1-fast">Veo 3.1 Fast (Recommended for rapid multi-scene flow)</option>
                <option value="veo-3.1-quality">Veo 3.1 Quality (Highest cinematic fidelity)</option>
                <option value="omni-flash">Gemini Omni-Flash (Multimodal drafts)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Antigravity AI Engine (AGY CLI) */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 p-7 space-y-5 shadow-sm dark:shadow-xl backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Sparkles className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Antigravity AI (AGY CLI)</h3>
            </div>
            {agyStatus?.checked && (
              <span
                className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${
                  agyStatus.success
                    ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
                    : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400 border-rose-300 dark:border-rose-500/30'
                }`}
              >
                {agyStatus.success ? `✓ Ready (${agyStatus.version || 'v1.4.8'})` : 'Offline / Missing'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            AGY CLI generates viral multi-scene video scripts, camera directions, and prompts using your authenticated Google account.
          </p>

          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-900 dark:text-white">Interactive Setup Tutorial</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                View installation commands, Google OAuth instructions, and test your local connection.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-agy-tutorial'))}
              className="inline-flex items-center space-x-1.5 rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white hover:border-lime-500 dark:hover:border-[#BFF97E]/40 transition-all active:scale-95 shadow-sm"
            >
              <Terminal className="h-3.5 w-3.5 text-lime-600 dark:text-[#BFF97E]" />
              <span>Open AGY Tutorial</span>
            </button>
          </div>
        </div>

        {/* Publishing Automation Preferences */}
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 p-7 space-y-5 shadow-sm dark:shadow-xl backdrop-blur-2xl">
          <div className="flex items-center space-x-2.5">
            <SettingsIcon className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Social Publishing Automation</h3>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">Default Auto-Publish Setting</div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
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
              <div className="w-11 h-6 bg-slate-300 dark:bg-black/60 border border-slate-400/30 dark:border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500 dark:peer-checked:bg-[#BFF97E]"></div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center space-x-2 pill-btn-lime px-8 py-3.5 text-xs font-bold text-black shadow-xl hover:opacity-95 active:scale-95 transition-all"
        >
          <Save className="h-4 w-4 text-black fill-black" />
          <span>Save Preferences</span>
        </button>
      </form>
    </div>
  );
}
