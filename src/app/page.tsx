'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  Plus,
  Play,
  Share2,
  Clock,
  Sparkles,
  Columns2,
  Trash2,
  ExternalLink,
  ArrowRight,
  Mic,
  Paperclip,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import type { Project } from '@/shared/types';

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickPrompt, setQuickPrompt] = useState('');

  const sampleIdeas = [
    'Cyberpunk Tokyo rain storm at midnight, neon reflections',
    'Cinematic mountain sunrise hyperlapse with morning fog',
    'Luxury electric hypercar drifting through alpine curves',
    'Macro lens water droplet falling into calm emerald pool',
  ];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      try {
        const list = await window.electronAPI.projects.getAll();
        setProjects(list);
      } catch (err) {
        console.error('Failed to load projects:', err);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project?')) {
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.projects.delete(id);
        loadProjects();
      }
    }
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    router.push(`/new?topic=${encodeURIComponent(quickPrompt.trim())}`);
  };

  const handleSelectSampleIdea = (idea: string) => {
    router.push(`/new?topic=${encodeURIComponent(idea)}`);
  };

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'published':
        return (
          <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />
            Published
          </span>
        );
      case 'assembled':
        return (
          <span className="rounded-full bg-lime-100 dark:bg-[#BFF97E]/15 px-3 py-1 text-[11px] font-semibold text-lime-800 dark:text-[#BFF97E] border border-lime-300 dark:border-[#BFF97E]/30 flex items-center space-x-1">
            <CheckCircle2 className="h-3 w-3 mr-1 text-lime-600 dark:text-[#BFF97E]" />
            Ready
          </span>
        );
      case 'scenes_generating':
      case 'assembling':
      case 'script_generating':
      case 'publishing':
        return (
          <span className="rounded-full bg-amber-100 dark:bg-amber-500/15 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 animate-pulse flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1 animate-ping" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="rounded-full bg-rose-100 dark:bg-rose-500/15 px-3 py-1 text-[11px] font-semibold text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
            Failed
          </span>
        );
      default:
        return (
          <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Cinematic Hero Command Center Matching Reference Design */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/10 bg-gradient-to-br from-white via-[#f7faf5] to-[#edf6ea] dark:from-[#121612]/95 dark:via-[#0e120e]/95 dark:to-[#0c0f0c] p-8 md:p-10 shadow-sm dark:shadow-2xl backdrop-blur-2xl">
        <div className="relative z-10 space-y-6">
          {/* Eyebrow & Brand */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center space-x-2 rounded-full border border-lime-300 dark:border-[#BFF97E]/30 bg-lime-100 dark:bg-[#BFF97E]/10 px-3.5 py-1 text-xs font-semibold text-lime-800 dark:text-[#BFF97E] tracking-wide">
              <Sparkles className="h-3.5 w-3.5 text-lime-700 dark:text-[#BFF97E]" />
              <span>Full Pipeline: Topic ➔ Script ➔ Flow ➔ FFmpeg ➔ Meta</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-lime-500 dark:bg-[#BFF97E] animate-pulse" />
              <span>Veo 3.1 & AGY Connected</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <img
              src="/icon.png"
              alt="CineFlow AI Logo"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl shadow-xl shadow-[#BFF97E]/20 object-contain ring-1 ring-black/10 dark:ring-white/15"
            />
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center space-x-2">
                <span>CineFlow AI Studio</span>
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl font-normal">
                Generate high-converting multi-scene reels and widescreen videos using Google Flow (Veo 3.1) and AGY CLI.
              </p>
            </div>
          </div>

          {/* Floating Frosted Prompt Bar from Reference Image 1 */}
          <form onSubmit={handleQuickSubmit} className="pt-2">
            <div className="floating-prompt-bar relative flex items-center rounded-full p-2 transition-all focus-within:ring-2 focus-within:ring-lime-400/50 dark:focus-within:ring-[#BFF97E]/50 focus-within:border-lime-500 dark:focus-within:border-[#BFF97E]/60">
              <div className="flex items-center pl-3 pr-2 text-slate-400">
                <button
                  type="button"
                  title="Upload reference media"
                  onClick={() => router.push('/new')}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Paperclip className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <input
                type="text"
                value={quickPrompt}
                onChange={e => setQuickPrompt(e.target.value)}
                placeholder="Describe your video idea or topic (e.g. Cyberpunk Tokyo rain storm at midnight...)"
                className="w-full bg-transparent px-3 py-2.5 text-sm md:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 focus:outline-none"
              />

              <div className="flex items-center space-x-2 pr-1">
                <button
                  type="submit"
                  className="pill-btn-lime px-6 py-3 text-xs md:text-sm font-bold text-black flex items-center space-x-2 shadow-lg hover:opacity-95 active:scale-95 transition-all shrink-0"
                >
                  <Sparkles className="h-4 w-4 text-black fill-black" />
                  <span>Generate Video</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Idea Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center mr-1">
              <Flame className="h-3.5 w-3.5 mr-1 text-lime-600 dark:text-[#BFF97E]" /> Ideas:
            </span>
            {sampleIdeas.map(idea => (
              <button
                key={idea}
                onClick={() => handleSelectSampleIdea(idea)}
                className="rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-lime-400 dark:hover:border-[#BFF97E]/40 hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-left truncate max-w-[280px] shadow-sm"
              >
                {idea}
              </button>
            ))}
          </div>
        </div>

        {/* Ambient background glow matching lime/mint palette */}
        <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-lime-300/20 dark:bg-[#BFF97E]/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-emerald-300/20 dark:bg-[#98F899]/10 blur-3xl pointer-events-none" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5 border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Projects</span>
            <div className="h-8 w-8 rounded-full bg-lime-100 dark:bg-[#BFF97E]/15 text-lime-800 dark:text-[#BFF97E] flex items-center justify-center">
              <Video className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{projects.length}</p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Created in local workspace</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Published to Meta</span>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {projects.filter(p => p.status === 'published').length}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Live on Instagram & Facebook</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/90 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Pipeline</span>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">
            {projects.filter(p => ['script_generating', 'scenes_generating', 'assembling', 'publishing'].includes(p.status)).length}
          </p>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">Flow & FFmpeg queue</span>
        </div>
      </div>

      {/* Projects Gallery Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Recent Video Projects</h2>
            <span className="rounded-full bg-slate-200 dark:bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-400">
              {projects.length}
            </span>
          </div>
          <Link
            href="/new"
            className="flex items-center space-x-1.5 text-xs font-bold text-lime-700 dark:text-[#BFF97E] hover:underline"
          >
            <span>New Video</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/50">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-500 dark:border-[#BFF97E] border-t-transparent mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading cinematic projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 dark:border-white/15 p-12 text-center bg-white/70 dark:bg-white/5 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-100 dark:bg-[#BFF97E]/10 text-lime-800 dark:text-[#BFF97E] mb-4 ring-1 ring-lime-300 dark:ring-[#BFF97E]/20">
              <Video className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No video projects yet</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md leading-relaxed">
              Type an idea into the command bar above or click Create First Video. CineFlow will write the script, generate scenes with Google Flow (Veo 3.1), and assemble the audio.
            </p>
            <Link
              href="/new"
              className="mt-6 inline-flex items-center space-x-2 rounded-full pill-btn-lime px-6 py-2.5 text-xs font-bold text-black shadow-md hover:opacity-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Video</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <Link
                key={project.id}
                href={`/project?id=${project.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#121612]/85 p-6 shadow-sm hover:shadow-xl dark:shadow-md transition-all hover:border-lime-400 dark:hover:border-[#BFF97E]/50 hover:bg-slate-50/80 dark:hover:bg-[#161c16]"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="rounded-full bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 px-3 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {project.format === 'both' ? '9:16 + 16:9' : project.format}
                    </span>
                    {getStatusBadge(project.status)}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-lime-700 dark:group-hover:text-[#BFF97E] transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {project.topic}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-mono text-[11px]">{new Date(project.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={e => handleDelete(e, project.id)}
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                      title="Delete Project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex items-center font-bold text-lime-700 dark:text-[#BFF97E] group-hover:translate-x-0.5 transition-transform">
                      Open Studio <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
