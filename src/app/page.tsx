'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import type { Project } from '@/shared/types';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

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

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'published':
        return <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">Published</span>;
      case 'assembled':
        return <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-400 border border-blue-500/20">Ready</span>;
      case 'scenes_generating':
      case 'assembling':
      case 'script_generating':
      case 'publishing':
        return <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20 animate-pulse">Processing</span>;
      case 'failed':
        return <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">Failed</span>;
      default:
        return <span className="rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400 border border-slate-500/20">Draft</span>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Hero / Studio Reminder Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-studio-700/60 bg-gradient-to-r from-white via-slate-50 to-purple-50/40 dark:from-studio-900 dark:via-studio-850 dark:to-studio-900 p-8 shadow-md dark:shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center space-x-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-300">
              <Sparkles className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400" />
              <span>Full Automation: Topic ➔ Script ➔ Flow ➔ FFmpeg ➔ Meta</span>
            </div>
            <div className="flex items-center space-x-3.5">
              <img
                src="/icon.png"
                alt="CineFlow AI Logo"
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl shadow-xl shadow-purple-500/25 object-contain ring-1 ring-black/5 dark:ring-white/10"
              />
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                CineFlow AI Studio
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Generate multi-scene reels and widescreen videos using Google Flow (Veo 3.1) and AGY CLI.
              Remember to keep Chrome open with Google Flow side-by-side during scene generation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/new"
              className="inline-flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-accent-purple to-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all hover:opacity-90 active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Video</span>
            </Link>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-accent-purple/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-accent-pink/10 blur-3xl pointer-events-none" />
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Projects</span>
            <Video className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{projects.length}</p>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Published</span>
            <Share2 className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {projects.filter(p => p.status === 'published').length}
          </p>
        </div>

        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Pipeline</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {projects.filter(p => ['script_generating', 'scenes_generating', 'assembling', 'publishing'].includes(p.status)).length}
          </p>
        </div>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Video Projects</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">{projects.length} videos</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-studio-800 bg-studio-900/50">
            <div className="text-center space-y-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-purple border-t-transparent mx-auto" />
              <p className="text-xs text-slate-400">Loading projects...</p>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-studio-700 p-12 text-center bg-slate-100/50 dark:bg-studio-900/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-studio-800 text-slate-600 dark:text-slate-400 mb-4">
              <Video className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">No video projects yet</h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-sm">
              Get started by typing a topic or idea. The AI will write the script, generate scenes in Google Flow, and assemble your video.
            </p>
            <Link
              href="/new"
              className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-accent-purple px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-accent-purple/90"
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
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 dark:border-studio-800 bg-white dark:bg-studio-900/80 p-5 shadow-sm transition-all hover:border-purple-500/40 hover:bg-slate-50 dark:hover:bg-studio-850 hover:shadow-xl hover:shadow-purple-500/10"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="rounded bg-slate-100 dark:bg-studio-800 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      {project.format === 'both' ? '9:16 + 16:9' : project.format}
                    </span>
                    {getStatusBadge(project.status)}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                    {project.topic}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-studio-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={e => handleDelete(e, project.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                      title="Delete Project"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex items-center text-accent-purple font-medium group-hover:translate-x-0.5 transition-transform">
                      View <ExternalLink className="ml-1 h-3 w-3" />
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
