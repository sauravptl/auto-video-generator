'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Columns2,
  Video,
  Share2,
  Settings,
  LayoutDashboard,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Facebook,
  Instagram,
  Check,
  ExternalLink,
  Sun,
  Moon,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import type { FlowStatus } from '@/shared/flow-types';
import type { MetaConnectionStatus, FacebookPage } from '@/shared/meta-types';

export function TopBar() {
  const pathname = usePathname();
  const [flowStatus, setFlowStatus] = useState<FlowStatus | null>(null);
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [isSwitchingPage, setIsSwitchingPage] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      // 1. Initial Flow status
      window.electronAPI.flow.getStatus().then(setFlowStatus).catch(console.error);

      // Listen for Flow status changes
      const unsubscribeFlow = window.electronAPI.flow.onStatusChange(status => {
        setFlowStatus(status);
      });

      // 2. Initial Meta status
      window.electronAPI.meta.getStatus().then(setMetaStatus).catch(console.error);

      // Listen for Meta status changes via IPC
      const unsubscribeMeta = window.electronAPI.meta.onStatusChange?.(status => {
        setMetaStatus(status);
      });

      // Listen for Custom DOM event from setup page
      const handleMetaCustomEvent = (e: any) => {
        if (e.detail) {
          setMetaStatus(e.detail);
        } else if (window.electronAPI) {
          window.electronAPI.meta.getStatus().then(setMetaStatus).catch(console.error);
        }
      };
      window.addEventListener('meta-status-updated', handleMetaCustomEvent);

      // Periodic check every 60 seconds to keep status in sync without hitting Meta rate limits
      const interval = setInterval(() => {
        if (window.electronAPI) {
          window.electronAPI.meta.getStatus().then(setMetaStatus).catch(console.error);
          window.electronAPI.flow.getStatus().then(setFlowStatus).catch(console.error);
        }
      }, 60000);

      return () => {
        unsubscribeFlow?.();
        unsubscribeMeta?.();
        window.removeEventListener('meta-status-updated', handleMetaCustomEvent);
        clearInterval(interval);
      };
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAccountDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Re-fetch Meta & Flow status whenever route changes (e.g. returning from /setup to /)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.meta.getStatus().then(setMetaStatus).catch(console.error);
      window.electronAPI.flow.getStatus().then(setFlowStatus).catch(console.error);
    }
  }, [pathname]);

  const handleSnapSideBySide = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsSnapping(true);
      try {
        await window.electronAPI.snapSideBySide();
        // Chrome may need a moment to expose the Flow tab after the window move.
        await new Promise(resolve => setTimeout(resolve, 600));
        const refreshed = await window.electronAPI.flow.getStatus();
        setFlowStatus(refreshed);
      } finally {
        setIsSnapping(false);
      }
    }
  };

  const handleSelectPage = async (pageId: string) => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      setIsSwitchingPage(true);
      try {
        const updated = await window.electronAPI.meta.selectPage(pageId);
        setMetaStatus(updated);
        setIsAccountDropdownOpen(false);
        window.dispatchEvent(new CustomEvent('meta-status-updated', { detail: updated }));
      } catch (err) {
        console.error('Failed to switch Meta page:', err);
      } finally {
        setIsSwitchingPage(false);
      }
    }
  };

  const navItems = [
    { label: 'Create Video', href: '/new', icon: Video },
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Meta Suite', href: '/setup', icon: Share2 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const selectedPage = metaStatus?.selectedPage;
  const connectedPages = metaStatus?.pages || [];

  return (
    <header className="titlebar-drag sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-200/90 dark:border-white/10 bg-white/85 dark:bg-[#0c0f0c]/85 backdrop-blur-2xl px-6">
      {/* Brand & Left Navigation */}
      <div className="titlebar-no-drag flex items-center space-x-6">
        <Link href="/" className="flex items-center space-x-2.5 pl-14 group transition-opacity hover:opacity-90">
          <img
            src="/icon.png"
            alt="CineFlow AI Logo"
            className="h-8 w-8 rounded-xl shadow-md shadow-[#BFF97E]/20 object-contain ring-1 ring-black/10 dark:ring-white/15 transition-transform group-hover:scale-105"
          />
          <span className="font-extrabold tracking-tight text-slate-900 dark:text-white text-sm">
            CineFlow <span className="text-lime-600 dark:text-[#BFF97E]">AI</span>
          </span>
        </Link>

        {/* Floating Center Segmented Pill Navigation from Reference Design */}
        <nav className="flex items-center space-x-1 rounded-full p-1 bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 backdrop-blur-xl">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 rounded-full px-3.5 py-1.5 text-xs transition-all ${
                  isActive
                    ? 'pill-btn-lime shadow-md font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 font-medium'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-black' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right System Indicators & Side-by-Side Action */}
      <div className="titlebar-no-drag flex items-center space-x-2.5">
        {/* Meta Connection & Account Selector Dropdown */}
        {metaStatus?.isConnected && connectedPages.length > 0 ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsAccountDropdownOpen(prev => !prev)}
              className="flex items-center space-x-2 rounded-full border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm"
              title="Click to switch Meta publishing account"
            >
              <div className="flex items-center space-x-1.5">
                <Facebook className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                {selectedPage?.instagramBusinessAccount && (
                  <Instagram className="h-3.5 w-3.5 text-pink-500 dark:text-pink-400" />
                )}
                <span className="font-semibold text-slate-900 dark:text-slate-100 max-w-[130px] truncate">
                  {selectedPage?.name || 'Select Page'}
                </span>
                {selectedPage?.instagramBusinessAccount && (
                  <span className="text-[10px] text-pink-600 dark:text-pink-300 font-mono hidden md:inline">
                    (@{selectedPage.instagramBusinessAccount.username})
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-200 ${
                  isAccountDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-3xl border border-slate-200 dark:border-white/15 bg-white dark:bg-studio-900/95 p-2 shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-studio-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Publishing Target
                    </span>
                    <span className="text-[10px] text-lime-700 dark:text-[#BFF97E] font-medium flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-lime-500 dark:bg-[#BFF97E] mr-1 animate-pulse" />
                      Active
                    </span>
                  </div>
                  {metaStatus.user && (
                    <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5 truncate">
                      Connected: <span className="font-medium text-slate-900 dark:text-white">{metaStatus.user.name}</span>
                    </p>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                  {connectedPages.map(page => {
                    const isSelected = page.id === selectedPage?.id;
                    return (
                      <button
                        key={page.id}
                        disabled={isSwitchingPage}
                        onClick={() => handleSelectPage(page.id)}
                        className={`w-full flex items-start justify-between p-2.5 rounded-2xl text-left transition-all ${
                          isSelected
                            ? 'bg-lime-50 dark:bg-[#BFF97E]/15 border border-lime-300 dark:border-[#BFF97E]/40 text-slate-900 dark:text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <Facebook className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                            <span className="text-xs font-bold truncate">{page.name}</span>
                          </div>
                          {page.instagramBusinessAccount ? (
                            <div className="flex items-center space-x-1 text-[11px] text-pink-600 dark:text-pink-300">
                              <Instagram className="h-3 w-3 shrink-0" />
                              <span className="truncate">@{page.instagramBusinessAccount.username}</span>
                              <span className="text-[9px] bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 px-1 rounded ml-1 font-medium">
                                Reels
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                              No Instagram attached
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-lime-400 dark:bg-[#BFF97E] text-black flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-1 border-t border-slate-100 dark:border-studio-800 px-2 flex items-center justify-between">
                  <Link
                    href="/setup"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-lime-700 dark:hover:text-[#BFF97E] flex items-center space-x-1 transition-colors font-medium"
                  >
                    <span>Manage Meta Accounts</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {connectedPages.length} {connectedPages.length === 1 ? 'Page' : 'Pages'}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            href="/setup"
            title="Click to connect Meta Suite (Instagram, Facebook, WhatsApp)"
            className="flex items-center space-x-2 rounded-full border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-300 hover:border-amber-500/50 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all shadow-sm"
          >
            <span className="text-slate-600 dark:text-slate-400 font-medium">Meta:</span>
            <span className="flex items-center text-amber-600 dark:text-amber-400 font-semibold">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Setup
            </span>
          </Link>
        )}

        {/* Flow Connector & Chrome Tab Status */}
        <div className="flex items-center space-x-2 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 px-3 py-1.5 text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Flow:</span>
          {flowStatus?.flowTabStatus === 'visible' || flowStatus?.extensionConnected ? (
            <span className="flex items-center text-lime-700 dark:text-[#BFF97E] font-semibold">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-lime-500 dark:bg-[#BFF97E] animate-pulse" />
              Chrome Ready
            </span>
          ) : flowStatus?.flowTabStatus === 'hidden' ? (
            <span className="flex items-center text-amber-600 dark:text-amber-400 animate-pulse font-medium">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Tab Hidden!
            </span>
          ) : flowStatus?.isInstalled ? (
            <span className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              CLI Ready
            </span>
          ) : (
            <span className="flex items-center text-rose-600 dark:text-rose-400 font-medium">
              <XCircle className="mr-1 h-3 w-3" />
              Offline
            </span>
          )}
        </div>

        {/* AGY Tutorial Guide Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-agy-tutorial'))}
          title="Open AGY CLI Setup & Verification Tutorial"
          className="flex items-center space-x-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-lime-400 dark:hover:border-[#BFF97E]/40 transition-all active:scale-95 shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-lime-600 dark:text-[#BFF97E]" />
          <span className="hidden xl:inline">AGY Guide</span>
        </button>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/30 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-lime-400 dark:hover:border-[#BFF97E]/40 transition-all active:scale-95 shadow-sm"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-[#BFF97E]" />
          ) : (
            <Moon className="h-4 w-4 text-slate-800" />
          )}
        </button>

        {/* Snap Side-by-Side Button (Electron Left, Chrome Right) */}
        <button
          onClick={handleSnapSideBySide}
          disabled={isSnapping}
          title={flowStatus?.warning || 'Snap this app to the left 50% and Google Chrome with Google Flow to the right 50%'}
          className="flex items-center space-x-1.5 rounded-full pill-btn-lime px-4 py-1.5 text-xs font-bold text-black shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          <Columns2 className="h-3.5 w-3.5 text-black" />
          <span>{isSnapping ? 'Snapping...' : 'Snap Side-by-Side'}</span>
        </button>
      </div>
    </header>
  );
}

