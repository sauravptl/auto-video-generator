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
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 rounded-full border border-brand-lime/30 bg-brand-lime/10 px-3.5 py-1 text-xs font-semibold text-brand-lime">
          <Share2 className="h-3.5 w-3.5" />
          <span>First-Run Publishing Setup</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-overlay-ink">Meta Suite Connection</h1>
        <p className="text-sm text-ink-2">
          Connect your accounts to publish Instagram Reels and Facebook Reels or Page videos. WhatsApp remains unavailable until its phone and recipient configuration is validated.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-2xl border p-4 text-xs font-bold flex items-start space-x-3 shadow-lg ${
 message.type === 'success'
 ? 'border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
 : 'border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300'
 }`}
 >
 {message.type === 'success' ? (
 <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
 ) : (
 <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
 )}
 <span>{message.text}</span>
 </div>
 )}

 {/* Connected Accounts Status Card */}
 {status?.isConnected ? (
 <div className="rounded-3xl border border-emerald-500/30 bg-paper-2/95 dark:bg-paper-2/90 p-7 space-y-6 shadow-sm dark:shadow-2xl backdrop-blur-2xl">
 <div className="flex items-center justify-between border-b border-slate-200 dark:border-rule pb-5">
 <div className="flex items-center space-x-3.5">
 <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
 <CheckCircle2 className="h-6 w-6" />
 </div>
 <div>
 <h3 className="text-base font-bold text-slate-900 dark:text-overlay-ink">Meta Suite Connected</h3>
 <p className="text-xs text-slate-500 dark:text-slate-400">Logged in as {status.user?.name || 'Meta User'}</p>
 </div>
 </div>

 <button
 onClick={handleLogout}
 className="inline-flex items-center space-x-1.5 rounded-full border border-slate-300 dark:border-rule bg-paper-2 dark:bg-paper-2/5 px-4 py-2 text-xs font-semibold text-ink hover:bg-slate-100 dark:hover:bg-paper-2/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shadow-sm whitespace-nowrap"
 >
 <LogOut className="h-3.5 w-3.5" />
 <span>Disconnect</span>
 </button>
 </div>

 {/* Platforms status grid */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 {/* Instagram */}
 <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-rule bg-slate-50/70 dark:bg-overlay/30">
 <div className="flex items-center space-x-2 text-pink-600 dark:text-pink-400 mb-2">
 <Instagram className="h-4 w-4" />
 <span className="text-xs font-bold ">Instagram Reels</span>
 </div>
 {status.instagramAccount ? (
 <div>
 <p className="text-sm font-semibold text-slate-900 dark:text-overlay-ink">@{status.instagramAccount.username}</p>
 <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Ready for automated Reels publishing</p>
 </div>
 ) : (
 <div>
 <p className="text-xs text-amber-600 dark:text-amber-400">No Instagram Business Account linked</p>
 </div>
 )}
 </div>

 {/* Facebook */}
 <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-rule bg-slate-50/70 dark:bg-overlay/30">
 <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 mb-2">
 <Facebook className="h-4 w-4" />
 <span className="text-xs font-bold ">Facebook Page</span>
 </div>
 {status.selectedPage ? (
 <div>
 <p className="text-sm font-semibold text-slate-900 dark:text-overlay-ink">{status.selectedPage.name}</p>
 <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Ready for Page Video & Reels</p>
 </div>
 ) : (
 <div>
 <p className="text-xs text-slate-500 dark:text-slate-400">No Pages found</p>
 </div>
 )}
 </div>

 {/* WhatsApp */}
 <div className="glass-card rounded-2xl p-5 border border-slate-200 dark:border-rule bg-slate-50/70 dark:bg-overlay/30">
 <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-2">
 <Phone className="h-4 w-4" />
 <span className="text-xs font-bold ">WhatsApp Cloud</span>
 </div>
 {status.whatsappPhone ? (
 <div>
 <p className="text-sm font-semibold text-slate-900 dark:text-overlay-ink">{status.whatsappPhone.displayPhoneNumber}</p>
 <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Cloud number detected : publishing is not enabled yet</p>
 </div>
 ) : (
 <div>
 <p className="text-xs text-slate-500 dark:text-slate-400">Unavailable : add a validated phone number ID in Settings</p>
 </div>
 )}
 </div>
 </div>

 {/* Select Facebook Page if multiple available */}
 {status.pages.length > 1 && (
 <div className="space-y-2 pt-2">
 <label className="text-xs font-bold text-ink ">Selected Facebook Page for Publishing:</label>
 <div className="flex flex-wrap gap-2">
 {status.pages.map(page => (
 <button
 key={page.id}
 onClick={() => handleSelectPage(page.id)}
 className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                      status.selectedPage?.id === page.id
                        ? 'pill-btn-lime shadow'
                        : 'bg-slate-100 dark:bg-overlay/30 border border-slate-300 dark:border-rule text-ink hover:text-brand-ink dark:hover:text-overlay-ink'
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
          <div className="rounded-3xl border border-rule bg-paper-2/95 dark:bg-paper-2/90 p-7 flex flex-col justify-between space-y-6 shadow-sm dark:shadow-xl backdrop-blur-2xl">
            <div className="space-y-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-overlay-ink">Method 1: One-Click Meta Login</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Connects through your Meta App using secure OAuth loopback. Requires Meta App ID & Secret in Settings.
              </p>
              <ul className="text-xs text-ink-2 space-y-2 list-disc list-inside">
                <li>Automatic 60-day Long-Lived Token</li>
                <li>Pulls all Facebook Pages & Instagram accounts</li>
                <li>Required scopes pre-configured</li>
              </ul>
            </div>

            <button
              onClick={handleStartOAuth}
              disabled={authenticating}
              className="w-full pill-btn-lime py-3.5 text-xs font-bold text-brand-ink flex items-center justify-center space-x-2 shadow-xl hover:opacity-95 active:scale-95 transition-colors disabled:opacity-50"
            >
              {authenticating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-brand-ink" />
                  <span>Waiting for browser login...</span>
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4 text-brand-ink" />
                  <span>Connect with Meta OAuth</span>
                </>
              )}
            </button>
          </div>

          {/* Method 2: Direct Token Input */}
          <div className="rounded-3xl border border-rule bg-paper-2/95 dark:bg-paper-2/90 p-7 flex flex-col justify-between space-y-6 shadow-sm dark:shadow-xl backdrop-blur-2xl">
            <div className="space-y-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-lime/10 text-brand-lime">
                <Key className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-overlay-ink">Method 2: Direct Access Token</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Paste a Meta User Access Token or System User Token directly from the Meta Graph API Explorer.
              </p>
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs font-semibold text-brand-lime hover:underline"
              >
                <span>Get Token from Graph API Explorer</span>
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>

            <form onSubmit={handleSaveDirectToken} className="space-y-3.5">
              <input
                type="password"
                placeholder="Paste EAA... access token here"
                value={directToken}
                onChange={e => setDirectToken(e.target.value)}
                className="w-full rounded-2xl border-2 border-muted bg-slate-50/70 dark:bg-overlay/40 px-4 py-2.5 text-xs text-slate-900 dark:text-overlay-ink placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-brand-lime/70 focus:outline-none focus:ring-2 focus:ring-brand-lime/25 transition-colors font-mono"
              />

              <button
                type="submit"
                disabled={savingDirectToken || !directToken.trim()}
                className="w-full pill-btn-lime py-3.5 text-xs font-bold text-brand-ink flex items-center justify-center space-x-2 shadow-xl hover:opacity-95 active:scale-95 transition-colors disabled:opacity-50"
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
      <div className="rounded-3xl border border-rule bg-paper-2/95 dark:bg-paper-2/70 p-6 space-y-4 shadow-sm dark:shadow-xl backdrop-blur-xl">
        <h4 className="text-xs font-bold text-ink ">Required Permissions / Scopes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-ink-2">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-lime shrink-0" />
            <code className="text-slate-900 dark:text-overlay-ink font-mono font-semibold">instagram_content_publish</code> - Post Instagram Reels
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-lime shrink-0" />
            <code className="text-slate-900 dark:text-overlay-ink font-mono font-semibold">instagram_basic</code> - Read Instagram profile info
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-lime shrink-0" />
            <code className="text-slate-900 dark:text-overlay-ink font-mono font-semibold">pages_manage_posts</code> - Publish video reels to Facebook Pages
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-lime shrink-0" />
            <code className="text-slate-900 dark:text-overlay-ink font-mono font-semibold">whatsapp_business_messaging</code> - Send WhatsApp video messages
          </div>
        </div>
      </div>
    </div>
  );
}
