'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Columns2,
  Instagram,
  Facebook,
  Phone,
  ArrowRight,
  Flame,
  Image as ImageIcon,
  Plus,
  Trash2,
  FileText,
  Lightbulb,
  Upload,
  X,
  Info,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ArrowDown,
  ArrowUp,
  MoveRight,
  Eye,
  Check,
} from 'lucide-react';
import type { VideoFormat, PublishTargets } from '@/shared/types';
import type { ScriptProviderSummary } from '@/shared/script-agent-types';
import Link from 'next/link';

interface UploadedImage {
  id: string;
  path: string;
  preview: string;
  name: string;
}

export type CameraAngle = 'top_to_bottom' | 'bottom_to_top' | 'left_to_right' | 'eye_level';

function NewProjectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [inputMode, setInputMode] = useState<'topic' | 'script'>('topic');
  const [topic, setTopic] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [format, setFormat] = useState<VideoFormat>('both');
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('eye_level');
  const [autoPublish, setAutoPublish] = useState(false);
  const [publishTargets, setPublishTargets] = useState<PublishTargets>({
    instagramReels: true,
    facebookReels: true,
    facebookPageVideo: true,
    whatsappStatus: false,
    whatsappBroadcast: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [agyToast, setAgyToast] = useState<{ show: boolean; message: string } | null>(null);
  const [providers, setProviders] = useState<ScriptProviderSummary[]>([]);
  const [providerId, setProviderId] = useState('');

  // Read topic passed from Dashboard quick command bar
  useEffect(() => {
    const urlTopic = searchParams?.get('topic');
    if (urlTopic) {
      setTopic(urlTopic);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!window.electronAPI) return;
    Promise.all([window.electronAPI.settings.get(), window.electronAPI.scriptProviders.list()])
      .then(([settings, availableProviders]) => {
        setAutoPublish(settings.autoPublish);
        setProviders(availableProviders);
        setProviderId(settings.defaultScriptProviderId || availableProviders[0]?.id || '');
      })
      .catch(error => console.error('Failed to load generation settings:', error));
  }, []);

  const sampleIdeas = [
    '3 Mindblowing Science Facts Nobody Taught You in School',
    'How Generative AI Actually Works in 30 Seconds',
    'The Hidden History of Coffee and Global Trade',
    '5 Morning Habits that 10x Daily Productivity',
  ];

  const sampleScriptTemplate = `[Scene 1]
Visual: Cinematic overhead shot of a modern neon-lit city at sunrise, dynamic camera push-in.
Narration: Ever wondered what our world will look like in 2050?

[Scene 2]
Visual: Macro extreme close-up of a quantum microchip pulsating with bright electric blue energy.
Narration: Artificial intelligence and quantum processors are now evolving faster than human comprehension.

[Scene 3]
Visual: Epic panoramic aerial shot of futuristic skyline with clean solar towers and golden twilight sky.
Narration: Follow us for daily breakthrough insights shaping the future!`;

  const cameraAnglesList: { id: CameraAngle; label: string; desc: string; icon: any }[] = [
    {
      id: 'top_to_bottom',
      label: 'Top to bottom',
      desc: 'High overhead drone / crane downward perspective',
      icon: ArrowDown,
    },
    {
      id: 'bottom_to_top',
      label: 'Bottom to top',
      desc: 'Low angle heroic perspective looking upward',
      icon: ArrowUp,
    },
    {
      id: 'left_to_right',
      label: 'From left to right',
      desc: 'Cinematic horizontal tracking pan',
      icon: MoveRight,
    },
    {
      id: 'eye_level',
      label: 'At eye level',
      desc: 'Natural direct human eye perspective',
      icon: Eye,
    },
  ];

  // Native Electron dialog or web file picker
  const handleSelectImages = async () => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.selectImages) {
        const filePaths = await window.electronAPI.selectImages();
        if (filePaths && filePaths.length > 0) {
          const newImgs: UploadedImage[] = filePaths.map((fp, i) => {
            const fileName = fp.split('/').pop() || fp.split('\\').pop() || `Image ${i + 1}`;
            return {
              id: `img_${Date.now()}_${i}`,
              path: fp,
              preview: fp.startsWith('data:') ? fp : `file://${fp}`,
              name: fileName,
            };
          });
          setImages(prev => [...prev, ...newImgs]);
          return;
        }
      }
    } catch (e) {
      console.warn('Native dialog failed, falling back to browser input:', e);
    }

    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        if (result) {
          setImages(prev => [
            ...prev,
            {
              id: `img_${Date.now()}_${i}`,
              path: result,
              preview: result,
              name: file.name,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, i) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = event => {
        const result = event.target?.result as string;
        if (result) {
          setImages(prev => [
            ...prev,
            {
              id: `img_${Date.now()}_${i}`,
              path: result,
              preview: result,
              name: file.name,
            },
          ]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsSubmitting(true);
    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        if (!providerId) {
          setAgyToast({ show: true, message: 'Configure and enable a script provider in Settings before creating a video.' });
          setIsSubmitting(false);
          return;
        }

        // Collect image paths
        const imagePayload = images.map(img => img.path);

        // Include camera angle preference inside the prompt if set
        const cameraAngleLabel = cameraAnglesList.find(c => c.id === cameraAngle)?.label;
        const topicWithCameraPreference = inputMode === 'topic' && cameraAngleLabel
          ? `${topic.trim()} [Preferred Camera Perspective: ${cameraAngleLabel}]`
          : topic.trim();

        // 1. Create project with reference images, full script, and autoPublish setting
        const project = await window.electronAPI.projects.create(
          topicWithCameraPreference,
          format,
          publishTargets,
          imagePayload,
          autoPublish,
          providerId
        );

        // 2. Launch the pipeline orchestrator
        await window.electronAPI.projects.startPipeline(project.id);

        // 3. Navigate to live project tracker
        router.push(`/project?id=${project.id}`);
      }
    } catch (err) {
      console.error('Failed to create project:', err);
      setIsSubmitting(false);
    }
  };

  const handleSnap = async () => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      await window.electronAPI.snapSideBySide();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Title Header with Brand Badges */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center space-x-2 rounded-full border border-lime-300 dark:border-[#BFF97E]/30 bg-lime-100 dark:bg-[#BFF97E]/10 px-3.5 py-1 text-xs font-semibold text-lime-800 dark:text-[#BFF97E] tracking-wide">
            <Sparkles className="h-3.5 w-3.5 text-lime-700 dark:text-[#BFF97E]" />
            <span>AI Storyboard & Flow Video Creator</span>
          </div>
          <button
            type="button"
            onClick={handleSnap}
            className="inline-flex items-center space-x-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-lime-400 dark:hover:border-[#BFF97E]/40 px-3.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-all active:scale-95 shadow-sm"
          >
            <Columns2 className="h-3.5 w-3.5 text-lime-600 dark:text-[#BFF97E]" />
            <span>Snap Side-by-Side</span>
          </button>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Create Automated Video
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
          Configure prompt, camera angles, aspect ratio, and reference assets. Google Flow (Veo 3.1) and AGY will generate and assemble your video scenes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Creation Mode Pills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Creation Mode
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {inputMode === 'script' ? 'Full Multi-Scene Script' : 'Quick Prompt / Topic'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setInputMode('topic')}
              className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition-all ${
                inputMode === 'topic'
                  ? 'border-lime-500 dark:border-[#BFF97E] bg-lime-50/80 dark:bg-[#BFF97E]/10 ring-1 ring-lime-400 dark:ring-[#BFF97E] text-slate-900 dark:text-white shadow-md dark:shadow-lg dark:shadow-[#BFF97E]/10'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white shadow-sm'
              }`}
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${inputMode === 'topic' ? 'bg-lime-400 dark:bg-[#BFF97E] text-black font-bold' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                <Lightbulb className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold">💡 Quick Topic / Concept</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">AI scriptwriter generates complete scenes</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('script')}
              className={`flex items-center space-x-3 rounded-2xl border p-4 text-left transition-all ${
                inputMode === 'script'
                  ? 'border-lime-500 dark:border-[#BFF97E] bg-lime-50/80 dark:bg-[#BFF97E]/10 ring-1 ring-lime-400 dark:ring-[#BFF97E] text-slate-900 dark:text-white shadow-md dark:shadow-lg dark:shadow-[#BFF97E]/10'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white shadow-sm'
              }`}
            >
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${inputMode === 'script' ? 'bg-lime-400 dark:bg-[#BFF97E] text-black font-bold' : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold">📝 Full Custom Script</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Paste your own multi-scene storyboard</div>
              </div>
            </button>
          </div>
        </div>

        {/* Floating Frosted Prompt / Storyboard Textarea */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                {inputMode === 'script' ? 'Custom Script / Storyboard' : 'Video Prompt or Concept'}
              </label>
              {inputMode === 'script' && (
                <button
                  type="button"
                  onClick={() => setTopic(sampleScriptTemplate)}
                  className="text-[11px] text-lime-700 dark:text-[#BFF97E] hover:underline font-semibold"
                >
                  Load sample template
                </button>
              )}
            </div>
            <span className={`text-xs ${topic.length > 19000 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
              {topic.length.toLocaleString()} / 20,000 characters
            </span>
          </div>

          <div className="relative rounded-3xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/85 p-2 backdrop-blur-2xl shadow-sm dark:shadow-xl focus-within:border-lime-500 dark:focus-within:border-[#BFF97E]/50 focus-within:ring-2 focus-within:ring-lime-400/20 dark:focus-within:ring-[#BFF97E]/20 transition-all">
            <textarea
              required
              rows={inputMode === 'script' ? 9 : 4}
              maxLength={20000}
              placeholder={
                inputMode === 'script'
                  ? `Paste your full script or storyboard here. You can use markers like:\n\n[Scene 1]\nVisual: Cinematic drone shot...\nNarration: Here is your dialogue or voiceover text...\n\n[Scene 2]\nVisual: Extreme close-up of...\nNarration: Next part of the story...`
                  : 'Describe your scene or video idea in detail (e.g. Cyberpunk Tokyo rain storm at midnight, neon reflections on wet asphalt with hypercar zooming past...)'
              }
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full bg-transparent p-4 text-sm md:text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none font-sans leading-relaxed resize-y"
            />
          </div>

          {/* Quick Idea Inspiration Chips */}
          {inputMode === 'topic' && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center">
                <Flame className="h-3 w-3 mr-1 text-lime-600 dark:text-[#BFF97E]" /> Quick inspiration:
              </span>
              <div className="flex flex-wrap gap-2">
                {sampleIdeas.map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTopic(idea)}
                    className="rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-1 text-xs text-slate-700 dark:text-slate-300 hover:border-lime-400 dark:hover:border-[#BFF97E]/40 hover:text-black dark:hover:text-white transition-all text-left shadow-sm"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2x2 Camera Angle Grid Directly from Reference Design (Image 1) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
              <Compass className="h-3.5 w-3.5 text-lime-600 dark:text-[#BFF97E]" />
              <span>Camera Angle / Perspective</span>
            </label>
            <span className="text-xs text-lime-700 dark:text-[#BFF97E] font-semibold">
              {cameraAnglesList.find(c => c.id === cameraAngle)?.label}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {cameraAnglesList.map(angle => {
              const Icon = angle.icon;
              const isSelected = cameraAngle === angle.id;
              return (
                <button
                  key={angle.id}
                  type="button"
                  onClick={() => setCameraAngle(angle.id)}
                  className={`flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-lime-500 dark:border-[#BFF97E] bg-lime-50/80 dark:bg-[#BFF97E]/10 ring-1 ring-lime-400 dark:ring-[#BFF97E] shadow-sm dark:shadow-md dark:shadow-[#BFF97E]/10 text-slate-900 dark:text-white'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 hover:border-slate-300 dark:hover:border-white/20 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-lime-400 dark:bg-[#BFF97E] text-black font-bold'
                          : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{angle.label}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{angle.desc}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="h-5 w-5 rounded-full bg-lime-400 dark:bg-[#BFF97E] text-black flex items-center justify-center shrink-0 font-bold">
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Video Aspect Ratio Format Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Output Aspect Ratio Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Both Formats */}
            <button
              type="button"
              onClick={() => setFormat('both')}
              className={`rounded-2xl border p-4 text-left transition-all ${
                format === 'both'
                  ? 'border-lime-500 dark:border-[#BFF97E] bg-lime-50/80 dark:bg-[#BFF97E]/10 ring-1 ring-lime-400 dark:ring-[#BFF97E] text-slate-900 dark:text-white shadow-sm dark:shadow-md dark:shadow-[#BFF97E]/10'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 hover:border-slate-300 dark:hover:border-white/20 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">Both Formats</span>
                <span className="rounded-full bg-lime-100 dark:bg-[#BFF97E] text-lime-800 dark:text-black px-2 py-0.5 text-[10px] font-bold border border-lime-300 dark:border-transparent">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Generate 9:16 vertical reels AND 16:9 widescreen video</p>
            </button>

            {/* 9:16 Vertical */}
            <button
              type="button"
              onClick={() => setFormat('9:16')}
              className={`rounded-2xl border p-4 text-left transition-all ${
                format === '9:16'
                  ? 'border-lime-500 dark:border-[#BFF97E] bg-lime-50/80 dark:bg-[#BFF97E]/10 ring-1 ring-lime-400 dark:ring-[#BFF97E] text-slate-900 dark:text-white shadow-sm dark:shadow-md dark:shadow-[#BFF97E]/10'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 hover:border-slate-300 dark:hover:border-white/20 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">9:16 Vertical</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Optimized for Instagram Reels, Facebook Reels, TikTok</p>
            </button>

            {/* 16:9 Landscape */}
            <button
              type="button"
              onClick={() => setFormat('16:9')}
              className={`rounded-2xl border p-4 text-left transition-all ${
                format === '16:9'
                  ? 'border-lime-500 dark:border-[#BFF97E] bg-lime-50/80 dark:bg-[#BFF97E]/10 ring-1 ring-lime-400 dark:ring-[#BFF97E] text-slate-900 dark:text-white shadow-sm dark:shadow-md dark:shadow-[#BFF97E]/10'
                  : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 hover:border-slate-300 dark:hover:border-white/20 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-slate-900 dark:text-white">16:9 Landscape</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Optimized for Facebook Page posts and YouTube</p>
            </button>
          </div>
        </div>

        {/* Script Provider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="script-provider" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Script agent</label>
            {providers.length === 0 && <Link href="/settings" className="text-xs font-semibold text-lime-700 dark:text-[#BFF97E] hover:underline">Configure one in Settings</Link>}
          </div>
          <select
            id="script-provider"
            value={providerId}
            onChange={event => setProviderId(event.target.value)}
            disabled={providers.length === 0}
            className="w-full rounded-2xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#121612]/80 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-400/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {providers.length === 0 ? <option>No configured script agents</option> : providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}
          </select>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">This agent writes the storyboard. Google Flow remains the separate scene-generation engine.</p>
        </div>

        {/* Reference Images / Assets Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-lime-600 dark:text-[#BFF97E]" />
                <span>Reference Images & Assets (Optional)</span>
              </label>
              <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-400">
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSelectImages}
              className="inline-flex items-center space-x-1 text-xs font-bold text-lime-700 dark:text-[#BFF97E] hover:underline transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Images</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {images.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleSelectImages}
              className={`rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-lime-500 dark:border-[#BFF97E] bg-lime-50/80 dark:bg-[#BFF97E]/10 scale-[1.01]'
                  : 'border-slate-300 dark:border-white/15 bg-white/70 dark:bg-[#121612]/40 hover:border-slate-400 dark:hover:border-white/30 hover:bg-white dark:hover:bg-[#121612]/70 shadow-sm'
              }`}
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-100 dark:bg-[#BFF97E]/10 text-lime-700 dark:text-[#BFF97E] mb-3 ring-1 ring-lime-300 dark:ring-[#BFF97E]/20">
                <Upload className="h-6 w-6" />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                Click or drag & drop reference images
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Supports JPG, PNG, WEBP. Used for image-to-video scene prompts and animated Ken Burns compositions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/90 overflow-hidden shadow-sm"
                  >
                    <div className="aspect-video w-full bg-slate-100 dark:bg-black/40 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.preview}
                        alt={img.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-2.5 flex items-center justify-between gap-1">
                      <div className="truncate">
                        <span className="text-[10px] font-bold text-lime-700 dark:text-[#BFF97E] block">
                          Scene {idx + 1} Reference
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block" title={img.name}>
                          {img.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-500/20 hover:text-rose-500 transition-colors"
                        title="Remove image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleSelectImages}
                  className="rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 p-4 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 hover:border-lime-500 dark:hover:border-[#BFF97E] hover:text-slate-900 dark:hover:text-white transition-all min-h-[90px] shadow-sm"
                >
                  <Plus className="h-5 w-5 mb-1 text-lime-600 dark:text-[#BFF97E]" />
                  <span className="text-[11px] font-semibold">Add More</span>
                </button>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <Info className="h-3.5 w-3.5 text-lime-600 dark:text-[#BFF97E] shrink-0" />
                <span>
                  Images are distributed sequentially across your storyboard scenes for Google Flow and FFmpeg assembly.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Publishing Target Platforms */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Automated Publishing Destinations (Meta Suite)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Instagram Reels */}
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 p-4 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
                  <Instagram className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Instagram Reels</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Upload to connected Instagram account</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishTargets.instagramReels}
                onChange={e => setPublishTargets({ ...publishTargets, instagramReels: e.target.checked })}
                className="h-4 w-4 rounded accent-lime-500 dark:accent-[#BFF97E]"
              />
            </label>

            {/* Facebook Reels */}
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 p-4 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Facebook className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Facebook Reels</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Publish as Facebook Reel on Page</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishTargets.facebookReels}
                onChange={e => setPublishTargets({ ...publishTargets, facebookReels: e.target.checked })}
                className="h-4 w-4 rounded accent-lime-500 dark:accent-[#BFF97E]"
              />
            </label>

            {/* Facebook Page Video */}
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 p-4 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Facebook className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Facebook Page Video</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Post regular widescreen video to feed</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishTargets.facebookPageVideo}
                onChange={e => setPublishTargets({ ...publishTargets, facebookPageVideo: e.target.checked })}
                className="h-4 w-4 rounded accent-lime-500 dark:accent-[#BFF97E]"
              />
            </label>

            {/* WhatsApp */}
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121612]/60 p-4 cursor-pointer hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">WhatsApp Status / Message</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">Upload video to WhatsApp Cloud</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishTargets.whatsappStatus}
                onChange={e => setPublishTargets({ ...publishTargets, whatsappStatus: e.target.checked })}
                className="h-4 w-4 rounded accent-lime-500 dark:accent-[#BFF97E]"
              />
            </label>
          </div>
        </div>

        {/* Auto-Publish Toggle */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#121612]/60 p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center space-x-2">
                <span>Publishing Mode</span>
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                    autoPublish
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                      : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                  }`}
                >
                  {autoPublish ? '⚡ Auto-Publish Enabled' : '🛡️ Manual Review First (Recommended)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {autoPublish
                  ? 'Video will automatically publish to Meta Suite immediately upon assembly.'
                  : 'Pipeline will pause after assembly so you can preview the video, tweak captions, and publish manually.'}
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={autoPublish}
                onChange={e => setAutoPublish(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500 dark:peer-checked:bg-[#BFF97E]"></div>
            </label>
          </div>
        </div>

        {/* Submit Primary Pill Action Matching Reference Design */}
        <button
          type="submit"
          disabled={isSubmitting || !topic.trim() || !providerId}
          className="w-full inline-flex items-center justify-center space-x-2.5 pill-btn-lime px-8 py-4 text-base font-bold text-black shadow-xl hover:opacity-95 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
        >
          <Sparkles className="h-5 w-5 text-black fill-black" />
          <span>{isSubmitting ? 'Starting Pipeline...' : 'Start Automatic Video Production'}</span>
          <ArrowRight className="h-5 w-5 stroke-[2.5]" />
        </button>
      </form>

      {/* Script generation error toast */}
      {agyToast?.show && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md rounded-3xl border border-rose-300 dark:border-rose-500/40 bg-white/95 dark:bg-[#121612]/95 p-5 shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom-5 duration-200 text-slate-900 dark:text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="h-4 w-4" />
              <span>Script agent setup required</span>
            </div>
            <button
              onClick={() => setAgyToast(null)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {agyToast.message}
          </p>
          <div className="mt-4 flex items-center space-x-2">
            <button
              onClick={() => setAgyToast(null)}
              className="pill-btn-lime px-4 py-1.5 text-xs font-bold text-black flex items-center space-x-1"
            >
              <Link href="/settings">Open Settings</Link>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-500 dark:border-[#BFF97E] border-t-transparent" />
        </div>
      }
    >
      <NewProjectContent />
    </Suspense>
  );
}
