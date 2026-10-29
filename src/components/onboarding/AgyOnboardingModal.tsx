'use client';

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export function AgyOnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    tested: boolean;
    success: boolean;
    version?: string;
    error?: string;
  }>({ tested: false, success: false });
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const installCmd = 'npm install -g @antigravity/cli';
  const loginCmd = 'agy login';
  const docsUrl = 'https://antigravity.google';

  // Check on mount if first run or if AGY CLI is not yet verified
  useEffect(() => {
    const handleOpenTutorial = () => {
      setIsOpen(true);
      checkAgyHealth();
    };

    window.addEventListener('open-agy-tutorial', handleOpenTutorial);

    // Initial check on app startup
    const hasCompleted = localStorage.getItem('cineflow_agy_onboarding_completed');
    if (!hasCompleted && typeof window !== 'undefined' && window.electronAPI?.agy) {
      window.electronAPI.agy.testConnection().then(res => {
        if (!res.success) {
          setIsOpen(true);
          setVerifyResult({ tested: true, success: false, error: res.error });
        } else {
          setVerifyResult({ tested: true, success: true, version: res.version });
          localStorage.setItem('cineflow_agy_onboarding_completed', 'true');
        }
      }).catch(console.error);
    }

    return () => {
      window.removeEventListener('open-agy-tutorial', handleOpenTutorial);
    };
  }, []);

  const checkAgyHealth = async () => {
    if (typeof window === 'undefined' || !window.electronAPI?.agy) return;
    setIsVerifying(true);
    try {
      const res = await window.electronAPI.agy.testConnection();
      if (res.success) {
        setVerifyResult({ tested: true, success: true, version: res.version });
      } else {
        setVerifyResult({ tested: true, success: false, error: res.error });
      }
    } catch (err: any) {
      setVerifyResult({ tested: true, success: false, error: err.message || 'Verification check failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleOpenDocs = () => {
    if (typeof window !== 'undefined' && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(docsUrl);
    } else {
      window.open(docsUrl, '_blank');
    }
  };

  const handleComplete = () => {
    localStorage.setItem('cineflow_agy_onboarding_completed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/15 bg-white/95 dark:bg-[#121612]/95 shadow-2xl backdrop-blur-2xl text-slate-900 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative p-6 border-b border-slate-200 dark:border-white/10 bg-gradient-to-r from-slate-50 via-white to-slate-100 dark:from-[#161c16] dark:via-[#121612] dark:to-[#0c0f0c]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <img
                src="/icon.png"
                alt="CineFlow AI Logo"
                className="h-11 w-11 rounded-2xl shadow-xl shadow-[#BFF97E]/20 object-contain ring-1 ring-black/10 dark:ring-white/15"
              />
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>Antigravity AI (AGY) Setup Guide</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-lime-100 dark:bg-[#BFF97E]/20 text-lime-800 dark:text-[#BFF97E] border border-lime-300 dark:border-[#BFF97E]/40">
                    Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  CineFlow AI uses the AGY CLI engine to generate multi-scene cinematic scripts & prompts.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Close guide"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stepper Tabs - Rounded-full Pills */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 dark:border-white/10 pt-4">
            {[
              { num: 1, label: '1. Install CLI' },
              { num: 2, label: '2. Google Login' },
              { num: 3, label: '3. Verify & Start' },
            ].map(step => (
              <button
                key={step.num}
                onClick={() => setActiveStep(step.num as any)}
                className={`flex items-center space-x-2 text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                  activeStep === step.num
                    ? 'pill-btn-lime shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
              >
                <span>{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1: Install */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-black/40 p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-lime-700 dark:text-[#BFF97E] flex items-center">
                    <Terminal className="h-4 w-4 mr-1.5" />
                    Global Install Command
                  </span>
                  <button
                    onClick={handleOpenDocs}
                    className="text-xs text-lime-700 dark:text-[#BFF97E] hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <span>Official Download Site</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Open your Terminal (<code className="text-lime-700 dark:text-[#BFF97E] font-mono font-semibold">Terminal.app</code> or iTerm) and run the global install command:
                </p>

                <div className="flex items-center justify-between rounded-2xl bg-slate-900 dark:bg-black/80 border border-slate-800 dark:border-white/10 p-3.5 font-mono text-xs text-[#BFF97E] shadow-inner">
                  <span className="truncate mr-2">$ {installCmd}</span>
                  <button
                    onClick={() => handleCopy(installCmd)}
                    className="shrink-0 flex items-center space-x-1 rounded-full bg-white/15 px-3 py-1 text-slate-200 hover:text-white hover:bg-white/25 transition-colors"
                  >
                    {copiedText === installCmd ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#BFF97E]" />
                        <span className="text-[11px] text-[#BFF97E] font-sans font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-sans font-medium">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200">Alternative Installation Methods:</p>
                <div className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-white/10">
                    <span>Curl installer:</span>
                    <button
                      onClick={() => handleCopy('curl -fsSL https://antigravity.google/install.sh | bash')}
                      className="text-lime-700 dark:text-[#BFF97E] hover:underline font-semibold"
                    >
                      Copy curl command
                    </button>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span>Homebrew / Python pip:</span>
                    <button
                      onClick={() => handleCopy('pip install agy-cli')}
                      className="text-lime-700 dark:text-[#BFF97E] hover:underline font-semibold"
                    >
                      Copy pip command
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Login */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-black/40 p-5 space-y-3.5">
                <span className="text-xs font-bold uppercase tracking-wider text-lime-700 dark:text-[#BFF97E] flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Google Account Authentication
                </span>

                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Authorize your Google Account so AGY CLI can connect to Antigravity AI models and quota:
                </p>

                <div className="flex items-center justify-between rounded-2xl bg-slate-900 dark:bg-black/80 border border-slate-800 dark:border-white/10 p-3.5 font-mono text-xs text-[#BFF97E] shadow-inner">
                  <span className="truncate mr-2">$ {loginCmd}</span>
                  <button
                    onClick={() => handleCopy(loginCmd)}
                    className="shrink-0 flex items-center space-x-1 rounded-full bg-white/15 px-3 py-1 text-slate-200 hover:text-white hover:bg-white/25 transition-colors"
                  >
                    {copiedText === loginCmd ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-[#BFF97E]" />
                        <span className="text-[11px] text-[#BFF97E] font-sans font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-sans font-medium">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-2xl bg-lime-50 dark:bg-[#BFF97E]/10 border border-lime-200 dark:border-[#BFF97E]/20 p-4 text-xs text-slate-800 dark:text-slate-200">
                  <p className="font-bold text-lime-800 dark:text-[#BFF97E]">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1.5 mt-2 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                    <li>Type <code className="font-mono text-lime-800 dark:text-[#BFF97E] font-semibold">agy login</code> in Terminal and press Enter.</li>
                    <li>Your browser will open the official Google OAuth consent screen.</li>
                    <li>Sign in with your Google account and grant permissions.</li>
                    <li>Return to CineFlow AI and click &ldquo;Verify AGY Installation&rdquo; below.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Verification */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-black/40 p-6 space-y-4 text-center">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  {verifyResult.tested ? (
                    verifyResult.success ? (
                      <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
                    )
                  ) : (
                    <Terminal className="h-7 w-7 text-lime-600 dark:text-[#BFF97E]" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {verifyResult.tested
                      ? verifyResult.success
                        ? 'AGY CLI Verified & Operational!'
                        : 'AGY CLI Not Detected Yet'
                      : 'Test AGY Installation'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                    {verifyResult.tested
                      ? verifyResult.success
                        ? `Antigravity AI Engine is operational (${verifyResult.version || 'v1.4.8'}). You are ready to generate scripts!`
                        : 'We could not detect the "agy" command in your system PATH. Make sure you installed it globally.'
                      : 'Click the button below to verify that "agy --version" responds correctly on your machine.'}
                  </p>
                </div>

                {verifyResult.tested && verifyResult.success && (
                  <div className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 px-4 py-1.5 text-xs text-emerald-800 dark:text-emerald-300 font-mono inline-block">
                    ✓ Antigravity AI Engine {verifyResult.version || 'v1.4.8'} Connected
                  </div>
                )}

                {verifyResult.tested && !verifyResult.success && verifyResult.error && (
                  <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-800 dark:text-rose-300 font-mono text-left max-w-lg mx-auto">
                    <p className="font-bold text-[11px] uppercase tracking-wider mb-1">Diagnostic Log:</p>
                    <p className="text-[11px] opacity-90 break-words">{verifyResult.error}</p>
                  </div>
                )}

                <div>
                  <button
                    onClick={checkAgyHealth}
                    disabled={isVerifying}
                    className="inline-flex items-center space-x-2 rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 px-6 py-2.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                  >
                    <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin text-lime-600 dark:text-[#BFF97E]' : ''}`} />
                    <span>{isVerifying ? 'Checking System PATH...' : 'Run Verification Test'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-5 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-black/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep((activeStep - 1) as any)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {activeStep < 3 ? (
              <button
                onClick={() => setActiveStep((activeStep + 1) as any)}
                className="pill-btn-lime px-6 py-2.5 text-xs font-bold text-black flex items-center space-x-1.5 shadow-lg"
              >
                <span>Next Step</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!verifyResult.success}
                className={`flex items-center space-x-1.5 rounded-full px-6 py-2.5 text-xs font-bold shadow-lg transition-all active:scale-95 ${
                  verifyResult.success
                    ? 'pill-btn-lime shadow-[#BFF97E]/20 text-black cursor-pointer'
                    : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-white/10'
                }`}
              >
                <span>{verifyResult.success ? 'Get Started with CineFlow AI' : 'Complete Verification to Proceed'}</span>
                {verifyResult.success && <Check className="h-4 w-4 stroke-[3]" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
