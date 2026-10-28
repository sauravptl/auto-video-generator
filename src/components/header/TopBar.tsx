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
} from 'lucide-react';
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
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'New Video', href: '/new', icon: Video },
    { label: 'Meta Suite', href: '/setup', icon: Share2 },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const selectedPage = metaStatus?.selectedPage;
  const connectedPages = metaStatus?.pages || [];

  return (
    <header className="titlebar-drag sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-studio-700/60 bg-studio-950/90 px-6 backdrop-blur-md">
      {/* Brand & Left Navigation */}
      <div className="titlebar-no-drag flex items-center space-x-6">
        <div className="flex items-center space-x-2 pl-14">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-accent-purple to-accent-pink shadow-lg shadow-purple-500/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text font-bold tracking-tight text-transparent">
            Auto AI Video
          </span>
        </div>

        <nav className="flex items-center space-x-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-studio-800 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-studio-850 hover:text-slate-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-accent-purple' : ''}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right System Indicators & Side-by-Side Action */}
      <div className="titlebar-no-drag flex items-center space-x-3">
        {/* Meta Connection & Account Selector Dropdown */}
        {metaStatus?.isConnected && connectedPages.length > 0 ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsAccountDropdownOpen(prev => !prev)}
              className="flex items-center space-x-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/20 transition-all shadow-sm"
              title="Click to switch Meta publishing account"
            >
              <div className="flex items-center space-x-1.5">
                <Facebook className="h-3.5 w-3.5 text-blue-400" />
                {selectedPage?.instagramBusinessAccount && (
                  <Instagram className="h-3.5 w-3.5 text-pink-400" />
                )}
                <span className="font-semibold text-slate-100 max-w-[130px] truncate">
                  {selectedPage?.name || 'Select Page'}
                </span>
                {selectedPage?.instagramBusinessAccount && (
                  <span className="text-[10px] text-pink-300 font-mono hidden md:inline">
                    (@{selectedPage.instagramBusinessAccount.username})
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-emerald-400 transition-transform duration-200 ${
                  isAccountDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isAccountDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-studio-700 bg-studio-900/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-studio-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Publishing Target
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium flex items-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                      Active
                    </span>
                  </div>
                  {metaStatus.user && (
                    <p className="text-xs text-slate-200 mt-0.5 truncate">
                      Connected: <span className="font-medium text-white">{metaStatus.user.name}</span>
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
                        className={`w-full flex items-start justify-between p-2.5 rounded-xl text-left transition-all ${
                          isSelected
                            ? 'bg-accent-purple/20 border border-accent-purple/40 text-white'
                            : 'hover:bg-studio-800/80 text-slate-300 hover:text-white border border-transparent'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <Facebook className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span className="text-xs font-bold truncate">{page.name}</span>
                          </div>
                          {page.instagramBusinessAccount ? (
                            <div className="flex items-center space-x-1 text-[11px] text-pink-300">
                              <Instagram className="h-3 w-3 shrink-0" />
                              <span className="truncate">@{page.instagramBusinessAccount.username}</span>
                              <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1 rounded ml-1">
                                Reels
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 block">
                              No Instagram attached
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-accent-purple/30 text-accent-purple flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-1 border-t border-studio-800 px-2 flex items-center justify-between">
                  <Link
                    href="/setup"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="text-[11px] text-slate-400 hover:text-accent-purple flex items-center space-x-1 transition-colors"
                  >
                    <span>Manage Meta Accounts</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-[10px] text-slate-400">
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
            className="flex items-center space-x-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-300 hover:border-amber-500/50 hover:bg-amber-500/20 transition-all"
          >
            <span className="text-slate-400 font-medium">Meta:</span>
            <span className="flex items-center text-amber-400 font-semibold">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Setup
            </span>
          </Link>
        )}

        {/* Flow Connector & Chrome Tab Status */}
        <div className="flex items-center space-x-2 rounded-full border border-studio-700/60 bg-studio-900/80 px-3 py-1.5 text-xs">
          <span className="text-slate-400">Flow:</span>
          {flowStatus?.flowTabStatus === 'visible' ? (
            <span className="flex items-center text-emerald-400">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Chrome Ready
            </span>
          ) : flowStatus?.flowTabStatus === 'hidden' ? (
            <span className="flex items-center text-amber-400 animate-pulse">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Tab Hidden!
            </span>
          ) : flowStatus?.isInstalled ? (
            <span className="flex items-center text-blue-400">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              CLI Ready
            </span>
          ) : (
            <span className="flex items-center text-rose-400">
              <XCircle className="mr-1 h-3 w-3" />
              Offline
            </span>
          )}
        </div>

        {/* Snap Side-by-Side Button (Electron Left, Chrome Right) */}
        <button
          onClick={handleSnapSideBySide}
          disabled={isSnapping}
          title="Snap this app to the left 50% and Google Chrome with Google Flow to the right 50%"
          className="flex items-center space-x-1.5 rounded-lg bg-gradient-to-r from-accent-purple to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-purple-500/20 transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          <Columns2 className="h-3.5 w-3.5" />
          <span>{isSnapping ? 'Snapping...' : 'Snap Side-by-Side'}</span>
        </button>
      </div>
    </header>
  );
}

