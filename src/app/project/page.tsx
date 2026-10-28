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
      // 1. Initial Project Fetch
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

      // 2. Fetch Meta status
      window.electronAPI.meta.getStatus().then(setMetaStatus).catch(console.error);

      // Listen for Meta status changes
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

      // Listen for live pipeline updates via IPC
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

      // Poll every 2.5s to ensure UI stays perfectly synchronized with background stages
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

      // If user had edits open, save them first
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

        const results = await window.electronAPI.meta.publish(project.id, selectedTargets);
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
        <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-64 flex-col items-center justify-center space-y-4 text-center">
        <p className="text-slate-400">Project not found or was removed.</p>
        <Link
          href="/"
          className="rounded-lg bg-studio-800 px-4 py-2 text-xs font-semibold text-white hover:bg-studio-700"
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

  // Stream URL helper for local files — uses Electron's custom media:// protocol
  const getVideoUrl = (filePath?: string) => {
    if (!filePath) return '';
    return `media://${filePath}`;
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header with Back, Title, and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-studio-800 bg-studio-900 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-white line-clamp-1">{project.title}</h1>
              {isScriptReady && (
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/40 text-[10px] text-blue-300 font-semibold">
                  <span>Script Ready</span>
                </span>
              )}
              {isGenerating && (
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-accent-purple/20 border border-accent-purple/30 text-[10px] text-accent-purple font-semibold animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-purple" />
                  <span>Generating Video</span>
                </span>
              )}
              {isPaused && (
                <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-semibold">
                  <Pause className="h-3 w-3" />
                  <span>Generation Paused</span>
                </span>
              )}
              {isAssembledOrDone && (
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Ready for Review</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{project.topic}</p>
          </div>
        </div>

        {/* Action Buttons in Header */}
        <div className="flex items-center space-x-2">
          {/* Pause / Resume Controls */}
          {isGenerating && (
            <button
              onClick={handlePauseGeneration}
              disabled={isPausingOrResuming}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm"
              title="Pause video scene generation in Google Flow"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>{isPausingOrResuming ? 'Pausing...' : 'Pause Generation'}</span>
            </button>
          )}

          {isPaused && (
            <button
              onClick={handleResumeGeneration}
              disabled={isPausingOrResuming}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/20"
              title="Resume generation from where it paused"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{isPausingOrResuming ? 'Resuming...' : 'Resume Generation'}</span>
            </button>
          )}

          {hasOutputVideos && (
            <button
              onClick={handleOpenFolder}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-studio-700 bg-studio-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-studio-800 hover:text-white transition-colors"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              <span>Show in Finder</span>
            </button>
          )}

          {project.status === 'scenes_ready' && (
            <button
              onClick={handleManualAssemble}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-accent-purple px-3 py-2 text-xs font-semibold text-white hover:bg-accent-purple/90 shadow-md shadow-purple-500/20 transition-all"
            >
              <Film className="h-3.5 w-3.5" />
              <span>Assemble Now</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SCRIPT REVIEW & "START GENERATING VIDEO" BANNER        */}
      {/* Allows user to inspect and edit before kicking off video   */}
      {/* ========================================================= */}
      {isScriptReady && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-accent-purple/50 bg-gradient-to-r from-accent-purple/15 via-studio-900 to-indigo-950/40 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-accent-purple uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Script Generated & Ready for Review</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                Review Scenes & Start Video Generation
              </h2>
              <p className="text-xs text-slate-300 max-w-xl">
                The AI scriptwriter has created {totalScenes} scenes. You can edit visual prompts, narrations, or durations directly below. When satisfied, click below to generate all scenes in Google Flow.
              </p>
            </div>

            <button
              onClick={handleStartScenes}
              disabled={isStartingScenes}
              className="inline-flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-accent-purple via-indigo-600 to-pink-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-purple-500/30 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
            >
              {isStartingScenes ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Starting Google Flow...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  <span>Start Generating Video (Google Flow)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ANIMATED PROGRESS & STAGE TRACKER CARD                */}
      {/* ========================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-studio-800 bg-studio-900/90 p-6 space-y-6 shadow-xl">
        {/* Ambient subtle background glow while generating */}
        {isGenerating && (
          <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-accent-purple/10 blur-3xl pointer-events-none" />
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-slate-200 font-medium flex items-center space-x-2.5">
              <span className="relative flex h-2.5 w-2.5">
                {isGenerating && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isGenerating
                      ? 'bg-accent-purple'
                      : isPaused
                      ? 'bg-amber-400'
                      : isAssembledOrDone
                      ? 'bg-emerald-400'
                      : 'bg-studio-600'
                  }`}
                />
              </span>
              <span>{project.currentStageMessage || 'Initializing production engine...'}</span>
            </span>

            <div className="flex items-center space-x-3">
              {isGenerating && (
                <button
                  onClick={handlePauseGeneration}
                  disabled={isPausingOrResuming}
                  className="text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold flex items-center space-x-1"
                >
                  <Pause className="h-3 w-3" />
                  <span>Pause</span>
                </button>
              )}
              {isPaused && (
                <button
                  onClick={handleResumeGeneration}
                  disabled={isPausingOrResuming}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-semibold flex items-center space-x-1"
                >
                  <Play className="h-3 w-3" />
                  <span>Resume</span>
                </button>
              )}
              <span className="font-mono text-sm font-bold text-accent-purple">
                {project.progressPercent}%
              </span>
            </div>
          </div>

          {/* Animated Main Progress Bar */}
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-studio-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${
                isPaused
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-accent-purple via-indigo-500 to-accent-pink'
              }`}
              style={{ width: `${project.progressPercent}%` }}
            >
              {isGenerating && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              )}
            </div>
          </div>
        </div>

        {/* 4-Stage Visual Milestones */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {stages.map(st => {
            const Icon = st.icon;
            return (
              <div
                key={st.key}
                className={`flex items-center space-x-3 rounded-xl border p-3 transition-all ${
                  st.done
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : st.active
                    ? 'border-accent-purple/60 bg-accent-purple/15 text-accent-purple shadow-lg shadow-purple-500/15'
                    : 'border-studio-800 bg-studio-950/40 text-slate-500'
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    st.done
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : st.active
                      ? 'bg-accent-purple text-white shadow-md'
                      : 'bg-studio-800 text-slate-400'
                  }`}
                >
                  {st.active ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : st.done ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold block truncate">{st.label}</span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {st.done ? 'Completed' : st.active ? 'In Progress...' : 'Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Google Flow Helper Banner (While Scene Generation is in flight) */}
        {project.status === 'scenes_generating' && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-200">
            <div className="flex items-center space-x-2">
              <Columns2 className="h-4 w-4 text-accent-purple shrink-0" />
              <span>
                <strong>Google Flow Generation Active:</strong> Keep Chrome visible to avoid background throttling.
              </span>
            </div>
            <button
              onClick={handleSnapSideBySide}
              disabled={isSnapping}
              className="inline-flex items-center space-x-1.5 rounded-lg bg-accent-purple px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-purple/90 shadow transition-all shrink-0"
            >
              <Columns2 className="h-3 w-3" />
              <span>{isSnapping ? 'Snapping...' : 'Snap Chrome Side-by-Side'}</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. SCRIPT & PER-SCENE STORYBOARD (EDITABLE + REGENERATE)  */}
      {/* Clean text wrap, no cut-offs, inline editing & retry       */}
      {/* ========================================================= */}
      {project.script && (
        <div className="rounded-2xl border border-studio-800 bg-studio-900/80 p-6 space-y-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-studio-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Scene Storyboard</span>
                <span className="text-xs font-normal text-slate-400">
                  ({completedScenes}/{totalScenes} Scenes Complete)
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Visual prompts send to Google Flow (Veo 3.1). Click &ldquo;Edit&rdquo; to modify prompts or &ldquo;Regenerate&rdquo; if rejected.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 font-mono">
                ~{project.script.targetDurationSeconds}s total
              </span>

              {isScriptReady && (
                <button
                  onClick={handleStartScenes}
                  disabled={isStartingScenes}
                  className="inline-flex items-center space-x-1.5 rounded-lg bg-accent-purple px-3 py-1.5 text-xs font-bold text-white hover:bg-accent-purple/90 shadow-md shadow-purple-500/20 transition-all"
                >
                  <Play className="h-3 w-3 fill-white" />
                  <span>Start Generating</span>
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {scenes.map((scene, idx) => {
              const sceneVideo = scene.clipPath916 || scene.clipPath169;
              const isCurrentSceneGenerating = scene.status === 'generating' || retryingSceneIdx === scene.sceneIndex;
              const isSceneFailed = scene.status === 'failed' || !!scene.error;
              const isSceneComplete = (scene.status === 'completed' || !!sceneVideo) && !isSceneFailed;
              const isScenePending = !isCurrentSceneGenerating && !isSceneComplete && !isSceneFailed;
              const isEditing = editingSceneIdx === scene.sceneIndex;

              // Calculate per-scene progress
              let sceneProgress = 0;
              if (isSceneComplete) sceneProgress = 100;
              else if (isCurrentSceneGenerating) sceneProgress = 45;

              return (
                <div
                  key={idx}
                  className={`rounded-xl border transition-all ${
                    isSceneFailed
                      ? 'border-rose-500/50 bg-rose-500/5 shadow-lg shadow-rose-500/10'
                      : isCurrentSceneGenerating
                      ? 'border-accent-purple/60 bg-accent-purple/5 shadow-lg shadow-purple-500/10'
                      : isSceneComplete
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-studio-800 bg-studio-950/60'
                  }`}
                >
                  {/* Scene Header */}
                  <div className="flex items-center justify-between p-4 pb-0">
                    <div className="flex items-center space-x-2.5">
                      {isCurrentSceneGenerating && (
                        <span className="h-2.5 w-2.5 rounded-full bg-accent-purple animate-ping" />
                      )}
                      {isSceneComplete && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                      {isSceneFailed && <AlertCircle className="h-4 w-4 text-rose-400" />}
                      {isScenePending && <Clock className="h-4 w-4 text-slate-500" />}

                      <span className="text-sm font-bold text-white">Scene {idx + 1}</span>
                      <span className="rounded bg-studio-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                        {scene.durationSeconds}s
                      </span>
                      {scene.model && (
                        <span className="rounded bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 text-[10px] text-purple-300 font-mono">
                          {scene.model}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isSceneComplete
                            ? 'text-emerald-400'
                            : isSceneFailed
                            ? 'text-rose-400'
                            : isCurrentSceneGenerating
                            ? 'text-accent-purple'
                            : 'text-slate-500'
                        }`}
                      >
                        {isSceneComplete
                          ? '✓ Ready'
                          : isSceneFailed
                          ? '⚠️ Failed / Rejected'
                          : isCurrentSceneGenerating
                          ? 'Rendering...'
                          : 'Pending'}
                      </span>

                      {/* Regenerate / Retry button */}
                      <button
                        onClick={() => handleRetryScene(scene.sceneIndex)}
                        disabled={isCurrentSceneGenerating}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-studio-800 text-[10px] font-medium text-slate-300 hover:text-white hover:bg-studio-700 transition-colors disabled:opacity-50"
                        title="Regenerate this scene clip with Google Flow"
                      >
                        <RotateCcw className={`h-2.5 w-2.5 ${isCurrentSceneGenerating ? 'animate-spin' : ''}`} />
                        <span>Regenerate</span>
                      </button>
                    </div>
                  </div>

                  {/* Failure / Policy Rejection Banner */}
                  {(isSceneFailed || retryError[scene.sceneIndex]) && (
                    <div className="mx-4 mt-3 p-3 rounded-lg border border-rose-500/40 bg-rose-500/10 text-xs text-rose-200 space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-rose-300">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Generation Failed or Policy Filter Triggered</span>
                      </div>
                      <p className="text-[11px] text-rose-200">
                        {retryError[scene.sceneIndex] || scene.error || 'Google Flow rejected the prompt or hit safe search.'}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        💡 Tip: Click &ldquo;Edit Prompt&rdquo; below to soften controversial words, then click Regenerate.
                      </p>
                    </div>
                  )}

                  {/* Per-Scene Loading Bar */}
                  {(isCurrentSceneGenerating || isSceneComplete) && !isSceneFailed && (
                    <div className="px-4 pt-2">
                      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-studio-800/80">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ease-out ${
                            isSceneComplete
                              ? 'bg-emerald-500 w-full'
                              : 'bg-gradient-to-r from-accent-purple to-indigo-500'
                          }`}
                          style={{ width: `${sceneProgress}%` }}
                        >
                          {isCurrentSceneGenerating && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-400">
                          {isSceneComplete ? 'Video clip ready' : 'Google Flow rendering in Chrome...'}
                        </span>
                        {isCurrentSceneGenerating && (
                          <span className="text-[10px] text-accent-purple font-mono animate-pulse">
                            <Download className="inline h-3 w-3 mr-0.5" />
                            Waiting for download...
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Scene Content: Video Preview OR Prompt */}
                  <div className="p-4 pt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Video Preview or placeholder */}
                    <div>
                      {sceneVideo ? (
                        <div className="relative rounded-lg overflow-hidden border border-emerald-500/30 aspect-video bg-black shadow-md">
                          <video
                            src={getVideoUrl(sceneVideo)}
                            controls
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                          <span className="absolute top-2 right-2 text-[9px] bg-emerald-500/90 text-white px-1.5 py-0.5 rounded font-bold shadow">
                            ✓ Ready
                          </span>
                        </div>
                      ) : isCurrentSceneGenerating ? (
                        <div className="relative rounded-lg overflow-hidden border border-accent-purple/40 aspect-video bg-studio-950 flex flex-col items-center justify-center p-3 text-center space-y-2">
                          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-accent-purple to-transparent opacity-60 animate-scanline pointer-events-none" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent animate-shimmer pointer-events-none" />
                          <Loader2 className="h-6 w-6 animate-spin text-accent-purple" />
                          <span className="text-[11px] font-semibold text-purple-300">
                            Rendering in Google Flow...
                          </span>
                          <span className="text-[9px] text-slate-400">
                            Clip will appear here automatically when downloaded
                          </span>
                        </div>
                      ) : (
                        <div className="relative rounded-lg overflow-hidden border border-studio-800 aspect-video bg-studio-950/80 flex flex-col items-center justify-center text-slate-500 text-[11px] p-3 text-center">
                          <Clock className="h-5 w-5 mb-1 text-slate-600" />
                          <span>Waiting to generate</span>
                          <span className="text-[9px] text-slate-600 mt-0.5">
                            Google Flow will generate clip here
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Visual Prompt & Subtitle (Full Text Wrap, Editable) */}
                    <div className="space-y-3 flex flex-col justify-between">
                      {isEditing ? (
                        /* Inline Scene Edit Form */
                        <div className="space-y-3 bg-studio-950/90 p-3.5 rounded-xl border border-accent-purple/50">
                          <div>
                            <label className="text-[10px] text-accent-purple uppercase tracking-wider font-bold block mb-1">
                              Edit Visual Prompt (Google Flow)
                            </label>
                            <textarea
                              value={tempPrompt}
                              onChange={e => setTempPrompt(e.target.value)}
                              rows={4}
                              className="w-full text-xs font-mono bg-studio-900 p-2.5 rounded-lg border border-studio-700 focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple text-slate-100 leading-relaxed resize-y"
                              placeholder="Enter detailed cinematic prompt..."
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                              Edit Subtitle / Narration
                            </label>
                            <input
                              type="text"
                              value={tempNarration}
                              onChange={e => setTempNarration(e.target.value)}
                              className="w-full text-xs bg-studio-900 p-2 rounded-lg border border-studio-700 focus:border-accent-purple focus:outline-none text-slate-200"
                            />
                          </div>

                          <div className="flex items-center justify-end space-x-2 pt-1">
                            <button
                              onClick={() => setEditingSceneIdx(null)}
                              className="px-2.5 py-1 text-xs text-slate-400 hover:text-white rounded border border-studio-700 hover:bg-studio-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveSceneEdit(scene.sceneIndex)}
                              className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold text-white rounded bg-accent-purple hover:bg-accent-purple/90 shadow"
                            >
                              <Save className="h-3 w-3" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal Scene View (No Cut-offs, Full Text Display) */
                        <>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                Visual Prompt
                              </span>
                              <button
                                onClick={() =>
                                  handleStartEditingScene(
                                    scene.sceneIndex,
                                    scene.visualPrompt,
                                    scene.narrationOrSubtitle
                                  )
                                }
                                className="text-[10px] text-accent-purple hover:text-purple-300 font-semibold flex items-center space-x-0.5"
                              >
                                <Edit3 className="h-2.5 w-2.5" />
                                <span>Edit</span>
                              </button>
                            </div>
                            {/* Full text with break-words and pre-wrap so it NEVER cuts off */}
                            <div className="text-xs text-slate-200 leading-relaxed font-mono bg-studio-900/90 p-3 rounded-lg border border-studio-800 break-words whitespace-pre-wrap select-text max-h-48 overflow-y-auto">
                              &ldquo;{scene.visualPrompt}&rdquo;
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1">
                              Subtitle / Voiceover
                            </span>
                            <div className="text-xs text-purple-300 italic font-medium bg-purple-500/5 p-2 rounded-lg border border-purple-500/10 break-words whitespace-pre-wrap">
                              &ldquo;{scene.narrationOrSubtitle}&rdquo;
                            </div>
                          </div>

                          {scene.transition && (
                            <div className="flex items-center space-x-2 pt-1">
                              <span className="text-[10px] text-slate-400">Transition:</span>
                              <span className="rounded bg-studio-800 px-1.5 py-0.5 text-[10px] text-slate-300 capitalize">
                                {scene.transition}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. FINAL VIDEO PREVIEW (BELOW SCENES)                     */}
      {/* Shows loading until ALL scenes done & assembled            */}
      {/* ========================================================= */}
      <div className="rounded-2xl border border-studio-800 bg-studio-900/90 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Film className="h-4 w-4 text-accent-purple" />
              <span>
                {isAssembledOrDone ? 'Final Video Preview' : 'Final Video Output'}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {isAssembledOrDone
                ? 'Merged video with transitions, subtitles & audio ready for publishing'
                : allScenesComplete && project.status === 'assembling'
                ? 'FFmpeg is assembling all scenes into final video...'
                : isScriptReady
                ? 'Start video generation above to create scenes'
                : `Waiting for all ${totalScenes} scenes to complete before assembly`}
            </p>
          </div>

          {/* Aspect ratio selector tabs */}
          <div className="flex rounded-lg bg-studio-850 p-1 border border-studio-700/60 shrink-0">
            <button
              onClick={() => setActivePlayerTab('9:16')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activePlayerTab === '9:16'
                  ? 'bg-accent-purple text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>9:16 Vertical (Reels)</span>
            </button>
            <button
              onClick={() => setActivePlayerTab('16:9')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium flex items-center space-x-1.5 transition-all ${
                activePlayerTab === '16:9'
                  ? 'bg-accent-purple text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="h-3.5 w-3.5" />
              <span>16:9 Landscape (Feed)</span>
            </button>
          </div>
        </div>

        {/* Video Viewer Container */}
        <div className="flex justify-center bg-studio-950/95 rounded-2xl p-6 border border-studio-800 min-h-[460px] items-center">
          {/* CASE A: Video is fully assembled -> Show real video player */}
          {isAssembledOrDone && hasOutputVideos ? (
            activePlayerTab === '9:16' && project.outputVideo916 ? (
              <div className="relative mx-auto w-[280px] h-[497px] rounded-3xl overflow-hidden shadow-2xl border-4 border-studio-700 bg-black">
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
              <div className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden shadow-2xl border border-studio-700 bg-black">
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
            /* CASE B: Video is NOT assembled -> Show Loading Skeleton */
            <div className="w-full flex justify-center">
              {activePlayerTab === '9:16' ? (
                /* 9:16 Smartphone Mockup Skeleton */
                <div className="relative w-[280px] h-[497px] rounded-[32px] overflow-hidden shadow-2xl border-4 border-studio-700 bg-gradient-to-b from-studio-950 via-studio-900 to-studio-950 flex flex-col justify-between p-5 select-none">
                  {/* Animated Scanline moving down */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent-purple to-transparent opacity-80 animate-scanline pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent animate-shimmer pointer-events-none" />

                  {/* Top phone speaker cutout & status pill */}
                  <div className="relative z-10 flex flex-col items-center space-y-3">
                    <div className="h-1.5 w-16 rounded-full bg-studio-700/80 mx-auto" />
                    <div className="flex items-center space-x-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-[10px] text-purple-300 font-semibold shadow-sm">
                      <Sparkles className="h-3 w-3 text-purple-400 animate-spin" />
                      <span>Google Flow Veo 3.1</span>
                    </div>
                  </div>

                  {/* Center Animation & Generation Status */}
                  <div className="relative z-10 text-center space-y-3 px-2">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-purple/15 border border-accent-purple/30 text-accent-purple shadow-lg shadow-purple-500/20 animate-pulse">
                      <Film className="h-7 w-7" />
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-bold text-white">
                        {project.status === 'script_generating'
                          ? 'Drafting Storyboard...'
                          : isScriptReady
                          ? 'Script Ready for Review'
                          : isGenerating
                          ? `Generating Scenes (${completedScenes}/${totalScenes})...`
                          : isPaused
                          ? 'Generation Paused'
                          : project.status === 'assembling'
                          ? 'Assembling Final Video...'
                          : 'AI Production in Progress...'}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {isGenerating
                          ? 'Final video will appear here after all scenes complete & merge'
                          : isScriptReady
                          ? 'Click "Start Generating Video" above to render in Google Flow'
                          : project.currentStageMessage}
                      </p>
                    </div>

                    {/* Scene progress indicator */}
                    {totalScenes > 0 && (
                      <div className="flex items-center justify-center space-x-1.5 mt-2">
                        {scenes.map((s, i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full transition-all ${
                              s.status === 'completed' || s.clipPath916 || s.clipPath169
                                ? 'bg-emerald-400'
                                : s.status === 'generating'
                                ? 'bg-accent-purple animate-ping'
                                : s.status === 'failed'
                                ? 'bg-rose-500'
                                : 'bg-studio-700'
                            }`}
                            title={`Scene ${i + 1}: ${s.status || 'pending'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom notice */}
                  <div className="relative z-10 space-y-2 text-center">
                    <div className="p-2 rounded-lg bg-black/80 border border-white/10 backdrop-blur-md">
                      <span className="text-[11px] font-bold text-yellow-300 drop-shadow">
                        {allScenesComplete
                          ? 'All scenes ready — assembling final video...'
                          : `${completedScenes}/${totalScenes} scenes downloaded`}
                      </span>
                    </div>
                    <span className="text-[9px] text-slate-400 block">
                      Video player unlocks here once assembled
                    </span>
                  </div>
                </div>
              ) : (
                /* 16:9 Landscape Widescreen Skeleton */
                <div className="relative w-full max-w-2xl aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-studio-700 bg-gradient-to-b from-studio-950 via-studio-900 to-studio-950 flex flex-col justify-between p-6 select-none">
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-accent-purple to-transparent opacity-80 animate-scanline pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent animate-shimmer pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center space-x-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 font-semibold">
                      <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-spin" />
                      <span>16:9 Feed & YouTube Landscape</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Target: {project.script?.targetDurationSeconds || 15}s
                    </span>
                  </div>

                  <div className="relative z-10 text-center space-y-3 max-w-md mx-auto">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-purple/15 border border-accent-purple/30 text-accent-purple shadow-lg shadow-purple-500/20 animate-pulse">
                      <Film className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        {project.status === 'assembling'
                          ? 'FFmpeg Assembling Final Video...'
                          : `Generating Scenes (${completedScenes}/${totalScenes})...`}
                      </h4>
                      <p className="text-xs text-slate-400">
                        Final merged video appears here after all scenes complete
                      </p>
                    </div>

                    {/* Scene dots */}
                    {totalScenes > 0 && (
                      <div className="flex items-center justify-center space-x-1.5 mt-2">
                        {scenes.map((s, i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full transition-all ${
                              s.status === 'completed' || s.clipPath916 || s.clipPath169
                                ? 'bg-emerald-400'
                                : s.status === 'generating'
                                ? 'bg-accent-purple animate-ping'
                                : s.status === 'failed'
                                ? 'bg-rose-500'
                                : 'bg-studio-700'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative z-10 flex items-center justify-between pt-2 border-t border-studio-800/60">
                    <div className="p-1.5 px-3 rounded-lg bg-black/80 border border-white/10 text-xs font-bold text-yellow-300">
                      {allScenesComplete
                        ? 'All scenes ready — assembling...'
                        : `${completedScenes}/${totalScenes} scenes downloaded`}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Player renders upon completion
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 5. DEDICATED SOCIAL PUBLISHING UI (STRICTLY GATED)        */}
      {/* Appears ONLY after video is 100% assembled and ready      */}
      {/* ========================================================= */}
      {isAssembledOrDone && (
        <div className="rounded-2xl border border-accent-purple/40 bg-gradient-to-b from-studio-900/95 to-studio-950 p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-studio-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <Share2 className="h-5 w-5 text-accent-purple" />
                <span>Meta Suite Publishing Hub</span>
              </h3>
              <p className="text-xs text-slate-400">
                Your video is assembled! Review caption, hashtags, and publish to your connected Meta accounts.
              </p>
            </div>

            <button
              onClick={handleCopyCaption}
              className="inline-flex items-center space-x-1.5 rounded-lg border border-studio-700 bg-studio-850 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              {copiedCaption ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedCaption ? 'Copied!' : 'Copy Caption & Tags'}</span>
            </button>
          </div>

          {/* Token expiry warning */}
          {metaStatus?.tokenExpiresInDays !== undefined && metaStatus.tokenExpiresInDays <= 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
              <span>
                <strong>Token expired!</strong> Go to{' '}
                <Link href="/setup" className="text-accent-purple hover:underline font-semibold">
                  Setup
                </Link>{' '}
                and paste a new Meta access token to publish.
              </span>
            </div>
          )}

          {/* Account Target Notification */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-studio-700 bg-studio-950/80">
            <div className="flex items-center space-x-2.5">
              <div className="flex -space-x-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow">
                  <Facebook className="h-3.5 w-3.5" />
                </div>
                {metaStatus?.selectedPage?.instagramBusinessAccount && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 text-white shadow">
                    <Instagram className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
              <div className="text-xs">
                <span className="text-slate-400">Publishing to Account: </span>
                <span className="font-bold text-white">
                  {metaStatus?.selectedPage?.name || 'Default Connected Page'}
                </span>
                {metaStatus?.selectedPage?.instagramBusinessAccount && (
                  <span className="text-pink-300 font-mono ml-1.5">
                    (@{metaStatus.selectedPage.instagramBusinessAccount.username})
                  </span>
                )}
              </div>
            </div>

            <Link
              href="/setup"
              className="text-xs text-accent-purple hover:underline font-medium shrink-0 flex items-center space-x-1"
            >
              <span>Change Account / Page</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Caption & Hashtags Editor */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                  <Edit3 className="h-3.5 w-3.5 text-accent-purple" />
                  <span>Post Caption</span>
                </label>
                <textarea
                  value={editedCaption}
                  onChange={e => setEditedCaption(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-studio-700 bg-studio-950 p-3 text-xs text-slate-200 focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple leading-relaxed"
                  placeholder="Enter caption for Instagram & Facebook..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Hashtags</label>
                <input
                  type="text"
                  value={editedHashtags}
                  onChange={e => setEditedHashtags(e.target.value)}
                  className="w-full rounded-xl border border-studio-700 bg-studio-950 px-3 py-2 text-xs text-slate-200 focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple font-mono"
                  placeholder="#ai #reels #viral #trending"
                />
              </div>
            </div>

            {/* Platform Selection & Publishing Trigger */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">
                  Select Publishing Platforms
                </label>
                <div className="space-y-2">
                  <label className="flex items-center justify-between p-3 rounded-xl border border-studio-800 bg-studio-950/60 cursor-pointer hover:border-studio-700 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <Instagram className="h-4 w-4 text-pink-400" />
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">
                          Instagram Reels (9:16)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Resumable Upload to connected IG account
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTargets.instagramReels}
                      onChange={e =>
                        setSelectedTargets({ ...selectedTargets, instagramReels: e.target.checked })
                      }
                      className="rounded border-studio-700 text-accent-purple focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-studio-800 bg-studio-950/60 cursor-pointer hover:border-studio-700 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <Facebook className="h-4 w-4 text-blue-400" />
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">
                          Facebook Reels (9:16)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Publishes as vertical Reel on Page (Resumable Upload)
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTargets.facebookReels}
                      onChange={e =>
                        setSelectedTargets({ ...selectedTargets, facebookReels: e.target.checked })
                      }
                      className="rounded border-studio-700 text-accent-purple focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-studio-800 bg-studio-950/60 cursor-pointer hover:border-studio-700 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <Facebook className="h-4 w-4 text-blue-500" />
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">
                          Facebook Page Video (16:9 / 9:16)
                        </span>
                        <span className="text-[10px] text-slate-400">Standard Page feed video</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTargets.facebookPageVideo}
                      onChange={e =>
                        setSelectedTargets({ ...selectedTargets, facebookPageVideo: e.target.checked })
                      }
                      className="rounded border-studio-700 text-accent-purple focus:ring-0"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl border border-studio-800 bg-studio-950/60 cursor-pointer hover:border-studio-700 transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <Phone className="h-4 w-4 text-emerald-400" />
                      <div>
                        <span className="text-xs font-medium text-slate-200 block">
                          WhatsApp Status (9:16)
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Broadcast media to WhatsApp audience
                        </span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedTargets.whatsappStatus}
                      onChange={e =>
                        setSelectedTargets({ ...selectedTargets, whatsappStatus: e.target.checked })
                      }
                      className="rounded border-studio-700 text-accent-purple focus:ring-0"
                    />
                  </label>
                </div>
              </div>

              {publishFeedback && (
                <div
                  className={`p-2.5 rounded-lg border text-[11px] ${
                    publishFeedback.includes('⚠️') || publishFeedback.includes('error')
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : publishFeedback.includes('success')
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-studio-800/60 border-studio-700/80 text-slate-300'
                  }`}
                >
                  {publishFeedback}
                </div>
              )}

              <button
                onClick={handleManualPublish}
                disabled={isPublishing}
                className="w-full flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-accent-purple to-pink-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
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

          {/* Published Links Section */}
          {project.publishResults && project.publishResults.length > 0 && (
            <div className="pt-4 border-t border-studio-800 space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Published Links:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.publishResults.map((res, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      res.status === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      {res.platform === 'facebook' && <Facebook className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                      {res.platform === 'instagram' && <Instagram className="h-3.5 w-3.5 text-pink-400 shrink-0" />}
                      <span className="font-semibold capitalize">{res.platform}:</span>
                      <span className="truncate">{res.status === 'success' ? 'Published' : res.error || 'Failed'}</span>
                    </div>

                    {res.url && res.status === 'success' && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-accent-purple hover:underline ml-2 shrink-0"
                      >
                        <span>View</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
          <Loader2 className="h-8 w-8 animate-spin text-accent-purple" />
        </div>
      }
    >
      <ProjectTrackerContent />
    </Suspense>
  );
}
