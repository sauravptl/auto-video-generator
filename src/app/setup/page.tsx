'use client';

import React, { useEffect, useState } from 'react';
import {
  Share2,
  Instagram,
  Facebook,
  Phone,
  CheckCircle2,
  AlertCircle,
  Key,
  ShieldCheck,
  RefreshCw,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import type { MetaConnectionStatus } from '@/shared/meta-types';

export default function MetaSetupPage() {
  const [status, setStatus] = useState<MetaConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [directToken, setDirectToken] = useState('');
  const [savingDirectToken, setSavingDirectToken] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const current = await window.electronAPI.meta.getStatus();
        setStatus(current);
        window.dispatchEvent(new CustomEvent('meta-status-updated', { detail: current }));
      } catch (err) {
        console.error('Failed to load Meta status:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleStartOAuth = async () => {
    setAuthenticating(true);
    setMessage(null);
    try {
      const res = await window.electronAPI.meta.startOAuth();
      setStatus(res);
      window.dispatchEvent(new CustomEvent('meta-status-updated', { detail: res }));
      setMessage({ type: 'success', text: 'Connected to Meta Suite successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Meta login failed' });
    } finally {
      setAuthenticating(false);
    }
  };

  const handleSaveDirectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directToken.trim()) return;

    setSavingDirectToken(true);
    setMessage(null);
    try {
      const res = await window.electronAPI.meta.saveDirectToken(directToken.trim());
      setStatus(res);
      window.dispatchEvent(new CustomEvent('meta-status-updated', { detail: res }));
      setMessage({ type: 'success', text: 'Access Token saved and validated successfully!' });
      setDirectToken('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Invalid Meta Access Token' });
    } finally {
      setSavingDirectToken(false);
    }
  };

  const handleSelectPage = async (pageId: string) => {
    try {
      const res = await window.electronAPI.meta.selectPage(pageId);
      setStatus(res);
      window.dispatchEvent(new CustomEvent('meta-status-updated', { detail: res }));
    } catch (err: any) {
      console.error('Failed to select page:', err);
    }
  };

  const handleLogout = async () => {
    if (confirm('Disconnect Meta Suite accounts?')) {
      await window.electronAPI.meta.logout();
      const emptyStatus = { isConnected: false, pages: [] };
      setStatus(emptyStatus);
      window.dispatchEvent(new CustomEvent('meta-status-updated', { detail: emptyStatus }));
      await loadStatus();
      setMessage({ type: 'success', text: 'Disconnected successfully.' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
          <Share2 className="h-3.5 w-3.5 text-blue-400" />
          <span>First-Run Setup</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Meta Suite Connection</h1>
        <p className="text-sm text-slate-400">
          Connect your accounts to enable automated 1-click publishing for Instagram Reels, Facebook Reels & Videos, and WhatsApp media messages.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-xl border p-4 text-sm flex items-start space-x-3 ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Connected Accounts Status Card */}
      {status?.isConnected ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-studio-900/90 p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-studio-800 pb-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Meta Suite Connected</h3>
                <p className="text-xs text-slate-400">Logged in as {status.user?.name || 'Meta User'}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-studio-700 bg-studio-850 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-studio-800 hover:text-rose-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Disconnect</span>
            </button>
          </div>

          {/* Platforms status grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Instagram */}
            <div className="glass-card rounded-xl p-4 border border-studio-800">
              <div className="flex items-center space-x-2 text-pink-400 mb-2">
                <Instagram className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Instagram Reels</span>
              </div>
              {status.instagramAccount ? (
                <div>
                  <p className="text-sm font-semibold text-white">@{status.instagramAccount.username}</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5">Ready for automated Reels publishing</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-amber-400">No Instagram Business Account linked to this Facebook Page</p>
                </div>
              )}
            </div>

            {/* Facebook */}
            <div className="glass-card rounded-xl p-4 border border-studio-800">
              <div className="flex items-center space-x-2 text-blue-400 mb-2">
                <Facebook className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Facebook Page</span>
              </div>
              {status.selectedPage ? (
                <div>
                  <p className="text-sm font-semibold text-white">{status.selectedPage.name}</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5">Ready for Page Video & Reels</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-400">No Pages found</p>
                </div>
              )}
            </div>

            {/* WhatsApp */}
            <div className="glass-card rounded-xl p-4 border border-studio-800">
              <div className="flex items-center space-x-2 text-emerald-400 mb-2">
                <Phone className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">WhatsApp Cloud</span>
              </div>
              {status.whatsappPhone ? (
                <div>
                  <p className="text-sm font-semibold text-white">{status.whatsappPhone.displayPhoneNumber}</p>
                  <p className="text-[11px] text-emerald-400 mt-0.5">{status.whatsappPhone.verifiedName}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-400">Configure phone ID in Settings</p>
                </div>
              )}
            </div>
          </div>

          {/* Select Facebook Page if multiple available */}
          {status.pages.length > 1 && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-slate-300">Selected Facebook Page for Publishing:</label>
              <div className="flex flex-wrap gap-2">
                {status.pages.map(page => (
                  <button
                    key={page.id}
                    onClick={() => handleSelectPage(page.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      status.selectedPage?.id === page.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-studio-800 text-slate-300 hover:bg-studio-700'
                    }`}
                  >
                    {page.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Not Connected - Connection Options */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Method 1: Automatic OAuth */}
          <div className="rounded-2xl border border-studio-800 bg-studio-900/90 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Method 1: One-Click Meta Login</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connects through your Meta App using secure OAuth loopback. Requires Meta App ID & Secret in Settings.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Automatic 60-day Long-Lived Token</li>
                <li>Pulls all Facebook Pages & Instagram accounts</li>
                <li>Required scopes pre-configured</li>
              </ul>
            </div>

            <button
              onClick={handleStartOAuth}
              disabled={authenticating}
              className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-50"
            >
              {authenticating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Waiting for browser login...</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  <span>Connect with Meta OAuth</span>
                </>
              )}
            </button>
          </div>

          {/* Method 2: Direct Token Input (Developer / Fast Mode) */}
          <div className="rounded-2xl border border-studio-800 bg-studio-900/90 p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Key className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Method 2: Direct Access Token</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paste a Meta User Access Token or System User Token directly from the Meta Graph API Explorer.
              </p>
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs text-purple-400 hover:underline"
              >
                <span>Get Token from Graph API Explorer</span>
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>

            <form onSubmit={handleSaveDirectToken} className="space-y-3">
              <input
                type="password"
                placeholder="Paste EAA... access token here"
                value={directToken}
                onChange={e => setDirectToken(e.target.value)}
                className="w-full rounded-xl border border-studio-700 bg-studio-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={savingDirectToken || !directToken.trim()}
                className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-accent-purple px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:bg-accent-purple/90 active:scale-95 transition-all disabled:opacity-50"
              >
                {savingDirectToken ? (
                  <span>Validating token...</span>
                ) : (
                  <span>Save & Connect Token</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Info & Required Scopes Checklist */}
      <div className="rounded-xl border border-studio-800 bg-studio-900/50 p-6 space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Required Permissions / Scopes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <code>instagram_content_publish</code> - Post Instagram Reels
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <code>instagram_basic</code> - Read Instagram profile info
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <code>pages_manage_posts</code> - Publish video reels to Facebook Pages
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <code>whatsapp_business_messaging</code> - Send WhatsApp video messages
          </div>
        </div>
      </div>
    </div>
  );
}
