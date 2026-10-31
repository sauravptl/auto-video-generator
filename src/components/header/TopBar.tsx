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
  const [isCheckingFlow, setIsCheckingFlow] = useState(false);
  const [flowCheckMessage, setFlowCheckMessage] = useState<string | null>(null);

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

  const handleCheckFlow = async () => {
    if (!window.electronAPI || isCheckingFlow) return;
    setIsCheckingFlow(true);
    setFlowCheckMessage(null);
    try {
      const doctor = await window.electronAPI.flow.triggerDoctor();
      const refreshed = await window.electronAPI.flow.getStatus();
      setFlowStatus(refreshed);
      setFlowCheckMessage(
        refreshed.warning ||
          (refreshed.extensionConnected || refreshed.flowTabVisible
            ? 'Flow Connector is ready.'
            : doctor.output ? 'Flow check finished. Open Google Flow in Chrome and keep its tab visible.' : 'Flow Connector is not ready.')
      );
    } catch {
      setFlowCheckMessage('Flow check failed. Confirm flow-auto is installed, then try again.');
    } finally {
      setIsCheckingFlow(false);
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
    <header className="window-drag sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-rule bg-paper/85 backdrop-blur-2xl px-6">
      {/* Brand & Left Navigation */}
      <div className="window-no-drag flex items-center space-x-3 md:space-x-6">
        <Link href="/" className="flex items-center space-x-2.5 pl-3 md:pl-14 group transition-opacity hover:opacity-90">
          <img
            src="/icon.png"
            alt="CineFlow AI Logo"
            className="h-8 w-8 rounded-xl shadow-card object-contain ring-1 ring-rule transition-transform group-hover:scale-105"
          />
          <span className="font-extrabold tracking-tight text-ink text-sm">
            CineFlow <span className="text-brand-lime">AI</span>
          </span>
        </Link>

        {/* Floating Center Segmented Pill Navigation */}
        <nav className="hidden md:flex items-center space-x-1 rounded-full p-1 bg-paper-3 border border-rule backdrop-blur-xl">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-1.5 rounded-full px-3.5 py-1.5 text-xs transition-colors ${
 isActive
 ? 'pill-btn-lime shadow-md font-bold'
 : 'text-muted hover:text-ink hover:bg-paper-2 font-medium'
 }`}
 >
 <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-brand-ink' : 'text-muted'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right System Indicators & Side-by-Side Action */}
      <div className="window-no-drag hidden md:flex items-center space-x-2.5">
        {/* Meta Connection & Account Selector Dropdown */}
        {metaStatus?.isConnected && connectedPages.length > 0 ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsAccountDropdownOpen(prev => !prev)}
              className="flex items-center space-x-2 rounded-full border border-state-success/30 bg-state-success/10 px-3 py-1.5 text-xs text-state-success hover:border-state-success/50 hover:bg-state-success/15 transition-colors shadow-sm"
              title="Click to switch Meta publishing account"
            >
              <div className="flex items-center space-x-1.5">
                <Facebook className="h-3.5 w-3.5 text-state-info" />
                {selectedPage?.instagramBusinessAccount && (
                  <Instagram className="h-3.5 w-3.5 text-state-error" />
                )}
                <span className="font-semibold text-ink max-w-[130px] truncate">
                  {selectedPage?.name || 'Select Page'}
                </span>
                {selectedPage?.instagramBusinessAccount && (
                  <span className="text-[11px] text-state-error font-mono hidden md:inline">
                    (@{selectedPage.instagramBusinessAccount.username})
                  </span>
                )}
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-state-success transition-transform duration-200 ${
 isAccountDropdownOpen ? 'rotate-180' : ''
 }`}
 />
 </button>

 {/* Dropdown Menu */}
 {isAccountDropdownOpen && (
 <div className="absolute right-0 mt-2 w-80 rounded-3xl border border-rule bg-paper-2 p-2 shadow-2xl backdrop-blur-2xl z-50">
 <div className="px-3 py-2 border-b border-rule">
 <div className="flex items-center justify-between">
 <span className="text-xs font-semibold text-muted">
 Publishing target
 </span>
 <span className="text-[11px] text-brand-lime font-medium flex items-center">
 <span className="h-1.5 w-1.5 rounded-full bg-brand-lime mr-1 motion-safe:animate-pulse" />
 Active
 </span>
 </div>
 {metaStatus.user && (
 <p className="text-xs text-muted mt-0.5 truncate">
 Connected: <span className="font-medium text-ink">{metaStatus.user.name}</span>
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
 className={`w-full flex items-start justify-between p-2.5 rounded-2xl text-left transition-colors ${
                          isSelected
                            ? 'bg-brand-lime/15 border border-brand-lime/40 text-ink'
                            : 'hover:bg-paper-3 text-muted hover:text-ink border border-transparent'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center space-x-1.5">
                            <Facebook className="h-3.5 w-3.5 text-state-info shrink-0" />
                            <span className="text-xs font-bold truncate">{page.name}</span>
                          </div>
                          {page.instagramBusinessAccount ? (
                            <div className="flex items-center space-x-1 text-[11px] text-state-error">
                              <Instagram className="h-3 w-3 shrink-0" />
                              <span className="truncate">@{page.instagramBusinessAccount.username}</span>
                              <span className="text-[9px] bg-state-error/15 text-state-error px-1 rounded ml-1 font-medium">
                                Reels
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted block">
                              No Instagram attached
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-brand-lime text-brand-ink flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-1 border-t border-rule px-2 flex items-center justify-between">
                  <Link
                    href="/setup"
                    onClick={() => setIsAccountDropdownOpen(false)}
                    className="text-[11px] text-muted hover:text-brand-lime flex items-center space-x-1 transition-colors font-medium"
                  >
                    <span>Manage Meta Accounts</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <span className="text-[11px] text-muted">
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
            className="flex items-center space-x-2 rounded-full border border-state-warning/30 bg-state-warning/10 px-3 py-1.5 text-xs text-state-warning hover:border-state-warning/50 hover:bg-state-warning/20 transition-colors shadow-sm"
          >
            <span className="text-muted font-medium">Meta:</span>
            <span className="flex items-center text-state-warning font-semibold">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Setup
            </span>
          </Link>
        )}

        {/* Flow Connector & Chrome Tab Status */}
        <div className="relative">
        <button
          type="button"
          onClick={handleCheckFlow}
          disabled={isCheckingFlow}
          aria-label="Check Flow Connector status"
          title={flowStatus?.warning || 'Check Flow Connector, Chrome extension, and Google Flow tab'}
          className="flex min-h-11 items-center space-x-2 rounded-full border border-rule bg-paper-2 px-3 py-1.5 text-xs transition-colors hover:border-brand-lime/40 disabled:opacity-60"
        >
          <span className="text-muted font-medium">{isCheckingFlow ? 'Checking…' : 'Flow:'}</span>
          {flowStatus?.flowTabStatus === 'visible' || flowStatus?.extensionConnected ? (
            <span className="flex items-center text-brand-lime font-semibold">
              <span className="mr-1.5 h-2 w-2 rounded-full bg-brand-lime motion-safe:animate-pulse" />
              Chrome Ready
            </span>
          ) : flowStatus?.flowTabStatus === 'hidden' ? (
            <span className="flex items-center text-state-warning motion-safe:animate-pulse font-medium">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Tab Hidden!
            </span>
          ) : flowStatus?.isInstalled ? (
            <span className="flex items-center text-state-info font-medium">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              CLI Ready
            </span>
          ) : (
            <span className="flex items-center text-state-error font-medium">
              <XCircle className="mr-1 h-3 w-3" />
              Offline
            </span>
          )}
        </button>
        {flowCheckMessage && (
          <div role="status" className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-rule bg-paper-2 p-3 text-[11px] font-medium text-ink shadow-xl">
            {flowCheckMessage}
          </div>
        )}
        </div>

        {/* AGY Tutorial Guide Button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-agy-tutorial'))}
          title="Open AGY CLI Setup & Verification Tutorial"
          className="flex items-center space-x-1.5 rounded-full border border-rule bg-paper-2 px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink hover:border-brand-lime/40 transition-colors active:scale-95 shadow-sm"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-lime" />
          <span className="hidden xl:inline">AGY Guide</span>
        </button>

        {/* Dark / Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-rule bg-paper-2 text-muted hover:text-ink hover:border-brand-lime/40 transition-colors active:scale-95 shadow-sm"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4 text-brand-lime" />
          ) : (
            <Moon className="h-4 w-4 text-ink" />
          )}
        </button>

        {/* Snap Side-by-Side Button */}
        <button
          onClick={handleSnapSideBySide}
          disabled={isSnapping}
          title={flowStatus?.warning || 'Snap this app to the left 50% and Google Chrome with Google Flow to the right 50%'}
          className="flex items-center space-x-1.5 rounded-full pill-btn-lime px-4 py-1.5 text-xs font-bold shadow-md transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-50"
        >
          <Columns2 className="h-3.5 w-3.5 text-brand-ink" />
          <span>{isSnapping ? 'Snapping...' : 'Snap Side-by-Side'}</span>
        </button>
      </div>
    </header>
  );
}

