'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Layers,
  Film,
  Share2,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  FolderOpen,
  ExternalLink,
  Instagram,
  Facebook,
  Phone,
  ArrowLeft,
  Send,
  Check,
  AlertCircle,
  AlertTriangle,
  Copy,
  Edit3,
  Loader2,
  Columns2,
  Video,
  Radio,
  Tv,
  Smartphone,
  Eye,
  Download,
  RefreshCw,
  Save,
  X,
  Volume2,
  Sliders,
  Maximize2,
} from 'lucide-react';
import type { Project, SceneDefinition, PublishTargets } from '@/shared/types';
import type { MetaConnectionStatus } from '@/shared/meta-types';

function ProjectTrackerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get('id') || '';

  const [project, setProject] = useState<Project | null>(null);
  const [metaStatus, setMetaStatus] = useState<MetaConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePlayerTab, setActivePlayerTab] = useState<'9:16' | '16:9'>('9:16');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishFeedback, setPublishFeedback] = useState<string | null>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [activeScenePreviewIdx, setActiveScenePreviewIdx] = useState<number>(0);

  // Scene editing states
  const [editingSceneIdx, setEditingSceneIdx] = useState<number | null>(null);
  const [tempPrompt, setTempPrompt] = useState<string>('');
  const [tempNarration, setTempNarration] = useState<string>('');
  const [retryingSceneIdx, setRetryingSceneIdx] = useState<number | null>(null);
  const [retryError, setRetryError] = useState<{ [idx: number]: string }>({});

  // Generation controls
  const [isStartingScenes, setIsStartingScenes] = useState(false);
  const [isPausingOrResuming, setIsPausingOrResuming] = useState(false);

  // Editable publishing content
  const [editedCaption, setEditedCaption] = useState('');
  const [editedHashtags, setEditedHashtags] = useState('');
  const [selectedTargets, setSelectedTargets] = useState<PublishTargets>({
    instagramReels: true,
    facebookReels: true,
    facebookPageVideo: false,
    whatsappStatus: true,
    whatsappBroadcast: false,
  });

  const [copiedCaption, setCopiedCaption] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI && projectId) {
      window.electronAPI.projects.get(projectId).then(p => {
        if (p) {
          setProject(p);
          if (p.format === '16:9') setActivePlayerTab('16:9');
          if (p.script?.caption) setEditedCaption(p.script.caption);
          if (p.script?.hashtags) setEditedHashtags(p.script.hashtags.join(' '));
          if (p.publishTargets) setSelectedTargets(p.publishTargets);
        }
        setLoading(false);
      });

      window.electronAPI.meta.getStatus().then(setMetaStatus).catch(console.error);

      const unsubscribeMeta = window.electronAPI.meta.onStatusChange?.(status => {
        setMetaStatus(status);
      });

      const handleMetaCustomEvent = (e: any) => {
        if (e.detail) {
          setMetaStatus(e.detail);
        } else if (window.electronAPI) {
          window.electronAPI.meta.getStatus().then(setMetaStatus).catch(console.error);
        }
      };
      window.addEventListener('meta-status-updated', handleMetaCustomEvent);

      const unsubscribeProgress = window.electronAPI.projects.onProgress(updated => {
        if (updated.id === projectId) {
          setProject(updated);
          if (updated.script?.caption && !editedCaption) {
            setEditedCaption(updated.script.caption);
          }
          if (updated.script?.hashtags && !editedHashtags) {
            setEditedHashtags(updated.script.hashtags.join(' '));
          }
        }
      });

      const pollInterval = setInterval(() => {
        window.electronAPI.projects.get(projectId).then(p => {
          if (p) {
            setProject(p);
          }
        });
      }, 2500);

      return () => {
        unsubscribeProgress?.();
        unsubscribeMeta?.();
        window.removeEventListener('meta-status-updated', handleMetaCustomEvent);
        clearInterval(pollInterval);
      };
    } else {
      setLoading(false);
    }
  }, [projectId]);

  const handleOpenFolder = () => {
    if (typeof window !== 'undefined' && window.electronAPI && project) {
      const targetPath = project.outputVideo916 || project.outputVideo169;
      if (targetPath) {
        window.electronAPI.openPath(targetPath);
      }
    }
  };

  const handleStartScenes = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && project) {
      setIsStartingScenes(true);
      try {
        await window.electronAPI.projects.startScenes(project.id);
        const updated = await window.electronAPI.projects.get(project.id);
        if (updated) setProject(updated);
      } catch (err: any) {
        console.error('Failed to start scene generation:', err);
      } finally {
        setIsStartingScenes(false);
      }
    }
  };

  const handlePauseGeneration = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && project) {
      setIsPausingOrResuming(true);
      try {
        await window.electronAPI.projects.pausePipeline(project.id);
        const updated = await window.electronAPI.projects.get(project.id);
        if (updated) setProject(updated);
      } finally {
        setIsPausingOrResuming(false);
      }
    }
  };

  const handleResumeGeneration = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && project) {
      setIsPausingOrResuming(true);
      try {
        await window.electronAPI.projects.resumePipeline(project.id);
        const updated = await window.electronAPI.projects.get(project.id);
        if (updated) setProject(updated);
      } finally {
        setIsPausingOrResuming(false);
      }
    }
  };

  const handleStartEditingScene = (idx: number, prompt: string, narration: string) => {
    setEditingSceneIdx(idx);
    setTempPrompt(prompt);
    setTempNarration(narration);
  };

  const handleSaveSceneEdit = async (sceneIndex: number) => {
    if (typeof window !== 'undefined' && window.electronAPI && project && project.script) {
      const updatedScenes = project.script.scenes.map(s => {
        if (s.sceneIndex === sceneIndex) {
          return {
            ...s,
            visualPrompt: tempPrompt.trim(),
            narrationOrSubtitle: tempNarration.trim(),
          };
        }
        return s;
      });

      const updatedProject: Project = {
        ...project,
        script: {
          ...project.script,
          scenes: updatedScenes,
        },
      };

      const saved = await window.electronAPI.projects.update(updatedProject);
      setProject(saved);
      setEditingSceneIdx(null);
    }
  };

  const handleRetryScene = async (sceneIndex: number) => {
    if (typeof window !== 'undefined' && window.electronAPI && project) {
      setRetryingSceneIdx(sceneIndex);
      setRetryError(prev => ({ ...prev, [sceneIndex]: '' }));

      const scenePrompt = editingSceneIdx === sceneIndex ? tempPrompt : undefined;

      try {
        const res = await window.electronAPI.projects.retryScene(
          project.id,
          sceneIndex,
          scenePrompt
        );
        if (!res.success && res.error) {
          setRetryError(prev => ({ ...prev, [sceneIndex]: res.error || 'Retry failed' }));
        }
        setEditingSceneIdx(null);
        const updated = await window.electronAPI.projects.get(project.id);
        if (updated) setProject(updated);
      } catch (err: any) {
        setRetryError(prev => ({ ...prev, [sceneIndex]: err.message || 'Error retrying scene' }));
      } finally {
        setRetryingSceneIdx(null);
      }
    }
  };

  const handleManualAssemble = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && project) {
      await window.electronAPI.video.assemble(project.id);
      const updated = await window.electronAPI.projects.get(project.id);
      if (updated) setProject(updated);
    }
  };

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

  const handleManualPublish = async () => {
    if (typeof window !== 'undefined' && window.electronAPI && project) {
      setIsPublishing(true);
      setPublishFeedback('Publishing to selected Meta platforms...');
      try {
        if (project.script) {
          project.script.caption = editedCaption;
          project.script.hashtags = editedHashtags
            .split(/\s+/)
            .filter(t => t.length > 0)
            .map(t => (t.startsWith('#') ? t : `#${t}`));
        }
        project.publishTargets = selectedTargets;
        await window.electronAPI.projects.update(project);

        await window.electronAPI.meta.publish(project.id, selectedTargets);
        const updated = await window.electronAPI.projects.get(project.id);
        if (updated) setProject(updated);
        setPublishFeedback('Publishing process finished successfully!');
      } catch (err: any) {
        const msg = err.message || String(err);
        if (msg.includes('expired') || msg.includes('token')) {
          setPublishFeedback(
            `⚠️ Meta token expired. Go to Setup → reconnect your account with a new token, then try again.`
          );
        } else {
          setPublishFeedback(`Publishing error: ${msg}`);
        }
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const handleCopyCaption = () => {
    const fullText = `${editedCaption}\n\n${editedHashtags}`;
    navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-500 dark:border-[#BFF97E] border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4 text-center">
        <p className="text-slate-500 dark:text-slate-400">Project not found or was removed.</p>
        <Link
          href="/"
          className="pill-btn-lime px-5 py-2 text-xs font-bold text-black"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isScriptReady = project.status === 'script_ready';
  const isGenerating = project.status === 'scenes_generating';
  const isPaused = project.status === 'paused';
  const hasOutputVideos = !!(project.outputVideo916 || project.outputVideo169);
  const isAssembledOrDone =
    ['assembled', 'publishing', 'published'].includes(project.status) && hasOutputVideos;

  const stages = [
    {
      key: 'script',
      label: '1. AI Scriptwriter',
      icon: Sparkles,
      done:
        ['script_ready', 'scenes_generating', 'scenes_ready', 'assembling', 'assembled', 'publishing', 'published'].includes(
          project.status
        ) || !!project.script,
      active: project.status === 'script_generating',
    },
    {
      key: 'scenes',
      label: '2. Google Flow Scenes',
      icon: Layers,
      done: ['scenes_ready', 'assembling', 'assembled', 'publishing', 'published'].includes(
        project.status
      ),
      active: project.status === 'scenes_generating' || isPaused,
    },
    {
      key: 'assembly',
      label: '3. Video Assembly',
      icon: Film,
      done: ['assembled', 'publishing', 'published'].includes(project.status) && hasOutputVideos,
      active: project.status === 'assembling' || project.status === 'scenes_ready',
    },
    {
      key: 'publish',
      label: '4. Social Publishing',
      icon: Share2,
      done: project.status === 'published',
      active: project.status === 'publishing',
    },
  ];

  const scenes = project.script?.scenes || [];
  const completedScenes = scenes.filter(
    s => s.status === 'completed' || s.clipPath916 || s.clipPath169
  ).length;
  const totalScenes = scenes.length;
  const allScenesComplete = totalScenes > 0 && completedScenes === totalScenes;

  const getVideoUrl = (filePath?: string) => {
    if (!filePath) return '';
    return `media://${filePath}`;
  };

  return (
    <div className="space-y-8 pb-24 max-w-7xl mx-auto">
      {/* Top Header with Back, Title, and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-lime-400 dark:hover:border-[#BFF97E]/40 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white line-clamp-1">
                {project.title}
              </h1>
              {isScriptReady && (
                <span className="flex items-center space-x-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 border border-blue-300 dark:border-blue-500/40 text-[11px] text-blue-800 dark:text-blue-300 font-bold">
                  <span>Script Ready</span>
                </span>
              )}
              {isGenerating && (
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-lime-100 dark:bg-[#BFF97E]/20 border border-lime-300 dark:border-[#BFF97E]/40 text-lime-800 dark:text-[#BFF97E] font-bold animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-lime-500 dark:bg-[#BFF97E]" />
                  <span>Generating Video</span>
                </span>
              )}
              {isPaused && (
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 font-bold">
                  <Pause className="h-3 w-3" />
                  <span>Paused</span>
                </span>
              )}
              {isAssembledOrDone && (
                <span className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Ready for Export</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-1 max-w-2xl">{project.topic}</p>
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center space-x-2.5">
          {isGenerating && (
            <button
              onClick={handlePauseGeneration}
              disabled={isPausingOrResuming}
              className="inline-flex items-center space-x-1.5 rounded-full border border-amber-400 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all shadow-sm"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>{isPausingOrResuming ? 'Pausing...' : 'Pause'}</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={handleResumeGeneration}
              disabled={isPausingOrResuming}
              className="inline-flex items-center space-x-1.5 rounded-full pill-btn-lime px-4 py-2 text-xs font-bold text-black"
            >
              <Play className="h-3.5 w-3.5 fill-black" />
              <span>{isPausingOrResuming ? 'Resuming...' : 'Resume Generation'}</span>
            </button>
          )}

          {hasOutputVideos && (
            <button
              onClick={handleOpenFolder}
              className="inline-flex items-center space-x-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition-colors shadow-sm"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Finder</span>
            </button>
          )}

          {hasOutputVideos && (
            <button
              onClick={handleOpenFolder}
              className="inline-flex items-center space-x-1.5 pill-btn-lime px-5 py-2 text-xs font-bold text-black shadow-md shadow-[#BFF97E]/20"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Video</span>
            </button>
          )}

          {project.status === 'scenes_ready' && (
            <button
              onClick={handleManualAssemble}
              className="inline-flex items-center space-x-1.5 pill-btn-lime px-5 py-2 text-xs font-bold text-black shadow-md shadow-[#BFF97E]/20 transition-all"
            >
              <Film className="h-3.5 w-3.5" />
              <span>Assemble Now</span>
            </button>
          )}
        </div>
      </div>

      {/* Script Ready Callout Banner */}
      {isScriptReady && (
        <div className="relative overflow-hidden rounded-3xl border border-lime-300 dark:border-[#BFF97E]/40 bg-gradient-to-r from-lime-50 via-white to-emerald-50 dark:from-[#121612] dark:via-[#161c16] dark:to-[#0c0f0c] p-7 shadow-sm dark:shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-lime-700 dark:text-[#BFF97E] uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" />
                <span>Script Generated & Ready for Review</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                Review Scenes & Start Video Generation
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                The AI scriptwriter created {totalScenes} scenes. You can adjust visual prompts below. When satisfied, launch the Google Flow pipeline.
              </p>
            </div>

            <button
              onClick={handleStartScenes}
              disabled={isStartingScenes}
              className="pill-btn-lime px-8 py-4 text-sm font-bold text-black flex items-center space-x-2 shadow-xl hover:opacity-95 shrink-0"
            >
              {isStartingScenes ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  <span>Starting Google Flow...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-black" />
                  <span>Start Generating Video (Google Flow)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Progress & Milestones Tracker */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/85 p-6 space-y-6 shadow-sm dark:shadow-xl backdrop-blur-2xl">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-800 dark:text-slate-200 font-semibold flex items-center space-x-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {isGenerating && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-500 dark:bg-[#BFF97E] opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isGenerating
                      ? 'bg-lime-500 dark:bg-[#BFF97E]'
                      : isPaused
                      ? 'bg-amber-400'
                      : isAssembledOrDone
                      ? 'bg-emerald-400'
                      : 'bg-slate-300 dark:bg-white/20'
                  }`}
                />
              </span>
              <span>{project.currentStageMessage || 'Initializing production engine...'}</span>
            </span>

            <div className="flex items-center space-x-3">
              <span className="font-mono text-sm font-bold text-lime-700 dark:text-[#BFF97E]">
                {project.progressPercent}%
              </span>
            </div>
          </div>

          {/* Lime/Mint Gradient Progress Bar */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isPaused
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400 dark:from-[#BFF97E] dark:via-[#98F899] dark:to-[#CCFFEA]'
              }`}
              style={{ width: `${project.progressPercent}%` }}
            >
              {isGenerating && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
              )}
            </div>
          </div>
        </div>

        {/* 4-Stage Visual Milestones */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stages.map(st => {
            const Icon = st.icon;
            return (
              <div
                key={st.key}
                className={`flex items-center space-x-3 rounded-2xl border p-3.5 transition-all ${
                  st.done
                    ? 'border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : st.active
                    ? 'border-lime-500 dark:border-[#BFF97E]/60 bg-lime-50/80 dark:bg-[#BFF97E]/10 text-slate-900 dark:text-white shadow-md dark:shadow-lg dark:shadow-[#BFF97E]/10'
                    : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-black/20 text-slate-500'
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    st.done
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold'
                      : st.active
                      ? 'bg-lime-400 dark:bg-[#BFF97E] text-black font-bold shadow-md'
                      : 'bg-slate-200 dark:bg-white/5 text-slate-500'
                  }`}
                >
                  {st.active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                  ) : st.done ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">{st.label}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                    {st.done ? 'Completed' : st.active ? 'In Progress...' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Video Cinema Player Frame */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 p-6 sm:p-8 space-y-6 shadow-sm dark:shadow-2xl backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Film className="h-4 w-4 text-lime-600 dark:text-[#BFF97E]" />
              <span>{isAssembledOrDone ? 'Final Video Cinema' : 'Video Output Canvas'}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {isAssembledOrDone
                ? 'High-definition video rendered with smooth scene cuts, voiceover narration, and background track.'
                : 'Scenes will automatically merge here once all clips finish generating in Google Flow.'}
            </p>
          </div>

          {/* Aspect Ratio Switcher Segmented Pills */}
          <div className="flex rounded-full bg-slate-100 dark:bg-black/40 p-1 border border-slate-200 dark:border-white/10 shrink-0">
            <button
              onClick={() => setActivePlayerTab('9:16')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activePlayerTab === '9:16'
                  ? 'pill-btn-lime shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>9:16 Vertical</span>
            </button>
            <button
              onClick={() => setActivePlayerTab('16:9')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold flex items-center space-x-1.5 transition-all ${
                activePlayerTab === '16:9'
                  ? 'pill-btn-lime shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span>16:9 Widescreen</span>
            </button>
          </div>
        </div>

        {/* Video Viewer Container */}
        <div className="flex justify-center bg-slate-950 dark:bg-black/60 rounded-3xl p-6 sm:p-8 border border-slate-800 dark:border-white/5 min-h-[480px] items-center">
          {isAssembledOrDone && hasOutputVideos ? (
            activePlayerTab === '9:16' && project.outputVideo916 ? (
              <div className="relative mx-auto w-[290px] h-[515px] rounded-[36px] overflow-hidden shadow-2xl border-4 border-white/15 bg-black">
                <video
                  key={project.outputVideo916}
                  src={getVideoUrl(project.outputVideo916)}
                  controls
                  playsInline
                  autoPlay={false}
                  preload="metadata"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : project.outputVideo169 ? (
              <div className="relative w-full max-w-3xl aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-white/15 bg-black">
                <video
                  key={project.outputVideo169}
                  src={getVideoUrl(project.outputVideo169)}
                  controls
                  playsInline
                  autoPlay={false}
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="text-center p-8 text-xs text-slate-400">
                Format not rendered for {activePlayerTab}. Switch tabs to preview available format.
              </div>
            )
          ) : (
            /* Generating / Skeleton State */
            <div className="w-full flex justify-center">
              {activePlayerTab === '9:16' ? (
                <div className="relative w-[290px] h-[515px] rounded-[36px] overflow-hidden shadow-2xl border-4 border-white/15 bg-gradient-to-b from-[#121612] via-[#0c0f0c] to-[#121612] flex flex-col justify-between p-6 select-none">
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#BFF97E] to-transparent opacity-80 animate-scanline pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center space-x-2 rounded-full border border-[#BFF97E]/30 bg-[#BFF97E]/10 px-3 py-1 text-xs text-[#BFF97E] font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-[#BFF97E]" />
                      <span>Reels Live Canvas</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      ~{project.script?.targetDurationSeconds || 15}s
                    </span>
                  </div>

                  <div className="relative z-10 text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BFF97E]/10 border border-[#BFF97E]/30 text-[#BFF97E]">
                      {isGenerating ? (
                        <Loader2 className="h-7 w-7 animate-spin" />
                      ) : (
                        <Film className="h-7 w-7" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {isGenerating
                          ? `Creating Scenes (${completedScenes}/${totalScenes})...`
                          : isScriptReady
                          ? 'Storyboards Ready'
                          : 'Awaiting Assembly'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto">
                        Google Flow & Antigravity AI rendering video sequence
                      </p>
                    </div>
                  </div>

                  <div className="relative z-10 space-y-2 text-center">
                    <div className="p-2.5 rounded-2xl bg-black/80 border border-white/10 backdrop-blur-md">
                      <span className="text-xs font-bold text-[#BFF97E]">
                        {allScenesComplete
                          ? 'All scenes downloaded — assembling...'
                          : `${completedScenes}/${totalScenes} scenes completed`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full max-w-2xl aspect-video rounded-3xl overflow-hidden shadow-2xl border-2 border-white/15 bg-gradient-to-b from-[#121612] via-[#0c0f0c] to-[#121612] flex flex-col justify-between p-6 select-none">
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center space-x-2 rounded-full border border-[#BFF97E]/30 bg-[#BFF97E]/10 px-3 py-1 text-xs text-[#BFF97E] font-bold">
                      <Sparkles className="h-3.5 w-3.5 text-[#BFF97E]" />
                      <span>16:9 Widescreen Feed</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      ~{project.script?.targetDurationSeconds || 15}s
                    </span>
                  </div>

                  <div className="relative z-10 text-center space-y-3 max-w-md mx-auto">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#BFF97E]/10 border border-[#BFF97E]/30 text-[#BFF97E]">
                      <Film className="h-7 w-7" />
                    </div>
                    <h4 className="text-base font-bold text-white">
                      {isGenerating
                        ? `Rendering Scenes (${completedScenes}/${totalScenes})...`
                        : 'Widescreen Assembly Pending'}
                    </h4>
                  </div>

                  <div className="relative z-10 text-center text-xs text-slate-400">
                    Video player will display output here upon completion
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Scene Timeline Strip Directly Matching Reference Design (Image 1 Bottom) */}
      {project.script && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 p-6 space-y-4 shadow-sm dark:shadow-xl backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <span>Horizontal Scene Timeline Strip</span>
              </h3>
              <span className="rounded-full bg-lime-100 dark:bg-white/10 px-3 py-0.5 text-xs font-bold text-lime-800 dark:text-[#BFF97E] border border-lime-300 dark:border-transparent">
                {completedScenes}/{totalScenes} Scenes Ready
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
              <Volume2 className="h-3.5 w-3.5 text-lime-600 dark:text-[#BFF97E]" />
              <span>Voiceover + Ken Burns Synced</span>
            </div>
          </div>

          {/* Horizontal Scrolling Card Row */}
          <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 pt-1">
            {scenes.map((scene, idx) => {
              const sceneVideo = scene.clipPath916 || scene.clipPath169;
              const isSceneComplete = scene.status === 'completed' || !!sceneVideo;
              const isSceneGenerating = scene.status === 'generating' || retryingSceneIdx === scene.sceneIndex;
              const isSelected = activeScenePreviewIdx === idx;

              return (
                <div
                  key={idx}
                  onClick={() => setActiveScenePreviewIdx(idx)}
                  className={`group relative flex-shrink-0 w-72 rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-lime-500 dark:border-[#BFF97E] bg-lime-50/50 dark:bg-[#161c16] ring-1 ring-lime-400 dark:ring-[#BFF97E] shadow-md dark:shadow-xl dark:shadow-[#BFF97E]/10'
                      : 'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-100/70 dark:hover:bg-[#141814]'
                  }`}
                >
                  {/* Thumbnail / Preview Squircle */}
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 dark:bg-black/50 border border-slate-200 dark:border-white/10 mb-3">
                    {sceneVideo ? (
                      <video
                        src={getVideoUrl(sceneVideo)}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    ) : isSceneGenerating ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-black/60 text-[#BFF97E] space-y-1">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-[10px] font-mono">Generating...</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Film className="h-6 w-6" />
                      </div>
                    )}

                    <div className="absolute top-2 left-2 rounded-full bg-black/70 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white">
                      Scene {idx + 1}
                    </div>

                    <div className="absolute top-2 right-2 rounded-full bg-black/70 backdrop-blur px-2 py-0.5 text-[10px] font-mono text-[#BFF97E]">
                      {scene.durationSeconds}s
                    </div>
                  </div>

                  {/* Narration & Audio Waveform Badge */}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 italic leading-relaxed">
                      &ldquo;{scene.narrationOrSubtitle}&rdquo;
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10 text-[10px]">
                      <div className="flex items-center space-x-1.5 text-lime-700 dark:text-[#BFF97E] font-mono font-semibold">
                        <span>♫ ||||||</span>
                        <span className="text-slate-500 dark:text-slate-400 font-sans">Audio Synced</span>
                      </div>
                      <span className={`font-bold ${isSceneComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                        {isSceneComplete ? '✓ Ready' : 'In Queue'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Scene Detailed Prompt & Edit Inspector */}
      {project.script && scenes[activeScenePreviewIdx] && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/85 p-6 space-y-4 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Scene {activeScenePreviewIdx + 1} Prompt Inspector</span>
            </h4>
            <button
              onClick={() => handleRetryScene(scenes[activeScenePreviewIdx].sceneIndex)}
              disabled={retryingSceneIdx === scenes[activeScenePreviewIdx].sceneIndex}
              className="pill-btn-lime px-4 py-1 text-xs font-bold text-black flex items-center space-x-1 shadow-sm"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Regenerate Scene {activeScenePreviewIdx + 1}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Visual Prompt (Google Flow Veo 3.1)
              </span>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-800 dark:text-slate-200 leading-relaxed break-words whitespace-pre-wrap">
                {scenes[activeScenePreviewIdx].visualPrompt}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Voiceover Narration
              </span>
              <div className="p-3.5 rounded-2xl bg-lime-50/70 dark:bg-black/40 border border-lime-200 dark:border-white/10 text-xs text-lime-900 dark:text-[#BFF97E] italic leading-relaxed break-words whitespace-pre-wrap">
                &ldquo;{scenes[activeScenePreviewIdx].narrationOrSubtitle}&rdquo;
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Social Publishing Section (Gated for completed videos) */}
      {isAssembledOrDone && (
        <div className="rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 p-8 space-y-6 shadow-sm dark:shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-5">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Share2 className="h-5 w-5 text-lime-600 dark:text-[#BFF97E]" />
                <span>Meta Suite Publishing Hub</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Video is assembled! Review caption, hashtags, and publish directly to Meta Suite accounts.
              </p>
            </div>

            <button
              onClick={handleCopyCaption}
              className="rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-all flex items-center space-x-1.5 shadow-sm"
            >
              {copiedCaption ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCaption ? 'Copied!' : 'Copy Caption & Tags'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Post Caption
                </label>
                <textarea
                  value={editedCaption}
                  onChange={e => setEditedCaption(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-black/40 p-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-lime-500 dark:focus:border-[#BFF97E]/50 leading-relaxed font-sans"
                  placeholder="Enter caption for Instagram & Facebook..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-1.5">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={editedHashtags}
                  onChange={e => setEditedHashtags(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-slate-50/70 dark:bg-black/40 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-lime-500 dark:focus:border-[#BFF97E]/50 font-mono"
                  placeholder="#ai #reels #viral #trending"
                />
              </div>
            </div>

            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Destinations
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Instagram className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">Instagram Reels</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTargets.instagramReels}
                      onChange={e => setSelectedTargets({ ...selectedTargets, instagramReels: e.target.checked })}
                      className="accent-lime-500 dark:accent-[#BFF97E]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Facebook className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">Facebook Reels</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTargets.facebookReels}
                      onChange={e => setSelectedTargets({ ...selectedTargets, facebookReels: e.target.checked })}
                      className="accent-lime-500 dark:accent-[#BFF97E]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Facebook className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">Page Video</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTargets.facebookPageVideo}
                      onChange={e => setSelectedTargets({ ...selectedTargets, facebookPageVideo: e.target.checked })}
                      className="accent-lime-500 dark:accent-[#BFF97E]"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-black/30 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">WhatsApp</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTargets.whatsappStatus}
                      onChange={e => setSelectedTargets({ ...selectedTargets, whatsappStatus: e.target.checked })}
                      className="accent-lime-500 dark:accent-[#BFF97E]"
                    />
                  </label>
                </div>
              </div>

              {publishFeedback && (
                <div className="p-3 rounded-2xl border text-xs bg-lime-50 dark:bg-[#BFF97E]/10 border-lime-300 dark:border-[#BFF97E]/30 text-lime-900 dark:text-white">
                  {publishFeedback}
                </div>
              )}

              <button
                onClick={handleManualPublish}
                disabled={isPublishing}
                className="w-full pill-btn-lime py-4 text-sm font-bold text-black flex items-center justify-center space-x-2 shadow-xl hover:opacity-95"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-black" />
                    <span>Publishing to Meta Suite...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Publish Video Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectTrackerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-500 dark:border-[#BFF97E] border-t-transparent" />
        </div>
      }
    >
      <ProjectTrackerContent />
    </Suspense>
  );
}
