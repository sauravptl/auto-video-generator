'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
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
  HelpCircle,
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
          // If already installed, mark as completed silently
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-studio-700 bg-studio-900/95 shadow-2xl backdrop-blur-2xl text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="relative p-6 border-b border-studio-800 bg-gradient-to-r from-accent-purple/10 via-studio-900 to-indigo-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-accent-purple to-accent-pink shadow-lg shadow-purple-500/25">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                  <span>Antigravity AI (AGY) Setup Guide</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                    Required Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  CineFlow AI uses the AGY CLI engine to generate multi-scene cinematic scripts & prompts.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-full p-2 text-slate-400 hover:bg-studio-800 hover:text-white transition-colors"
              title="Close guide"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Stepper Tabs */}
          <div className="mt-6 flex items-center justify-between border-t border-studio-800/80 pt-4">
            {[
              { num: 1, label: '1. Install CLI' },
              { num: 2, label: '2. Google Login' },
              { num: 3, label: '3. Verify & Start' },
            ].map(step => (
              <button
                key={step.num}
                onClick={() => setActiveStep(step.num as any)}
                className={`flex items-center space-x-2 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  activeStep === step.num
                    ? 'bg-accent-purple text-white shadow-md shadow-purple-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-studio-800'
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
              <div className="rounded-2xl border border-studio-800 bg-studio-950/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent-purple flex items-center">
                    <Terminal className="h-4 w-4 mr-1.5" />
                    Install Command
                  </span>
                  <button
                    onClick={handleOpenDocs}
                    className="text-xs text-accent-blue hover:underline flex items-center space-x-1"
                  >
                    <span>Official Download Site</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>

                <p className="text-xs text-slate-300">
                  Open your Terminal (<code className="text-accent-pink font-mono">Terminal.app</code> or iTerm) and run the global install command:
                </p>

                <div className="flex items-center justify-between rounded-xl bg-studio-900 border border-studio-700/80 p-3 font-mono text-xs text-emerald-400">
                  <span className="truncate mr-2">$ {installCmd}</span>
                  <button
                    onClick={() => handleCopy(installCmd)}
                    className="shrink-0 flex items-center space-x-1 rounded-lg bg-studio-800 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-studio-700 transition-colors"
                  >
                    {copiedText === installCmd ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-400 font-sans">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-sans">Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-studio-800/80 bg-studio-850/40 p-4 text-xs text-slate-400 space-y-2">
                <p className="font-semibold text-slate-200">Alternative Installation Methods:</p>
                <div className="space-y-1 font-mono text-[11px] text-slate-300">
                  <div className="flex justify-between items-center py-1 border-b border-studio-800">
                    <span>Curl installer:</span>
                    <button
                      onClick={() => handleCopy('curl -fsSL https://antigravity.google/install.sh | bash')}
                      className="text-accent-purple hover:underline"
                    >
                      Copy curl command
                    </button>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span>Homebrew / Python pip:</span>
                    <button
                      onClick={() => handleCopy('pip install agy-cli')}
                      className="text-accent-purple hover:underline"
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
              <div className="rounded-2xl border border-studio-800 bg-studio-950/70 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-accent-purple flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-1.5" />
                  Google Account Authentication
                </span>

                <p className="text-xs text-slate-300">
                  Authorize your Google Account so AGY CLI can connect to Antigravity AI models and quota:
                </p>

                <div className="flex items-center justify-between rounded-xl bg-studio-900 border border-studio-700/80 p-3 font-mono text-xs text-emerald-400">
                  <span className="truncate mr-2">$ {loginCmd}</span>
                  <button
                    onClick={() => handleCopy(loginCmd)}
                    className="shrink-0 flex items-center space-x-1 rounded-lg bg-studio-800 px-2.5 py-1 text-slate-300 hover:text-white hover:bg-studio-700 transition-colors"
                  >
                    {copiedText === loginCmd ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[11px] text-emerald-400 font-sans">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-sans">Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-3 text-xs text-purple-200">
                  <p className="font-medium">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-300 text-[11px]">
                    <li>Type <code className="font-mono text-purple-300">agy login</code> in Terminal and press Enter.</li>
                    <li>Your browser will open the official Google OAuth consent screen.</li>
                    <li>Sign in with your Google account and grant permissions.</li>
                    <li>Return to CineFlow AI and click "Verify AGY Installation" below.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Verification */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="rounded-2xl border border-studio-800 bg-studio-950/70 p-5 space-y-4 text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-studio-800 border border-studio-700">
                  {verifyResult.tested ? (
                    verifyResult.success ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    ) : (
                      <XCircle className="h-6 w-6 text-rose-400" />
                    )
                  ) : (
                    <Terminal className="h-6 w-6 text-accent-purple" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white">
                    {verifyResult.tested
                      ? verifyResult.success
                        ? 'AGY CLI Verified & Ready!'
                        : 'AGY CLI Not Detected Yet'
                      : 'Test AGY Installation'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    {verifyResult.tested
                      ? verifyResult.success
                        ? `Antigravity AI Engine is operational (${verifyResult.version || 'v1.4.8'}). You are ready to generate scripts!`
                        : 'We could not detect the "agy" command in your system PATH. Make sure you installed it globally.'
                      : 'Click the button below to verify that "agy --version" responds correctly on your machine.'}
                  </p>
                </div>

                {verifyResult.tested && verifyResult.success && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-300 font-mono inline-block">
                    ✓ Antigravity AI Engine {verifyResult.version || 'v1.4.8'} Connected
                  </div>
                )}

                {verifyResult.tested && !verifyResult.success && verifyResult.error && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-300 font-mono text-left max-w-lg mx-auto">
                    <p className="font-bold text-[11px] uppercase tracking-wider mb-1">Diagnostic Log:</p>
                    <p className="text-[11px] opacity-90 break-words">{verifyResult.error}</p>
                  </div>
                )}

                <div>
                  <button
                    onClick={checkAgyHealth}
                    disabled={isVerifying}
                    className="inline-flex items-center space-x-2 rounded-xl bg-studio-800 border border-studio-700 hover:bg-studio-700 hover:text-white px-5 py-2.5 text-xs font-semibold text-slate-200 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isVerifying ? 'animate-spin text-accent-purple' : ''}`} />
                    <span>{isVerifying ? 'Checking System PATH...' : 'Run Verification Test'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 border-t border-studio-800 bg-studio-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {activeStep > 1 && (
              <button
                onClick={() => setActiveStep((activeStep - 1) as any)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {activeStep < 3 ? (
              <button
                onClick={() => setActiveStep((activeStep + 1) as any)}
                className="flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-accent-purple to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-purple-500/20 hover:opacity-90 transition-all active:scale-95"
              >
                <span>Next Step</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!verifyResult.success}
                className={`flex items-center space-x-1.5 rounded-xl px-6 py-2.5 text-xs font-semibold shadow-lg transition-all active:scale-95 ${
                  verifyResult.success
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 hover:opacity-95 cursor-pointer'
                    : 'bg-studio-800 text-slate-500 cursor-not-allowed border border-studio-700'
                }`}
              >
                <span>{verifyResult.success ? 'Get Started with CineFlow AI' : 'Complete Verification to Proceed'}</span>
                {verifyResult.success && <Check className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
