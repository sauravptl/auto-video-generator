'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import type { VideoFormat, PublishTargets } from '@/shared/types';

interface UploadedImage {
  id: string;
  path: string;
  preview: string;
  name: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [inputMode, setInputMode] = useState<'topic' | 'script'>('topic');
  const [topic, setTopic] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [format, setFormat] = useState<VideoFormat>('both');
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

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedAutoPublish = localStorage.getItem('autoPublish');
      if (savedAutoPublish !== null) {
        setAutoPublish(savedAutoPublish === 'true');
      }
    }
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

    // Fallback: trigger HTML file input
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
              path: result, // Base64 data URL
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
        // Collect image paths (file path or data url)
        const imagePayload = images.map(img => img.path);

        // 1. Create project with reference images, full script, and autoPublish setting
        const project = await window.electronAPI.projects.create(
          topic.trim(),
          format,
          publishTargets,
          imagePayload,
          autoPublish
        );

        // 2. Launch the pipeline orchestrator (resolves immediately)
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
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* Title Header */}
      <div className="space-y-2">
        <div className="inline-flex items-center space-x-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>New AI Video Project</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Create Automated Video</h1>
        <p className="text-sm text-slate-400">
          Enter a prompt or paste a full multi-scene script. Upload reference images to steer Google Flow and Ken Burns scene animation.
        </p>
      </div>

      {/* Chrome Side-by-Side Prompt Card */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Reminder: Keep Chrome Visible</h4>
          <p className="text-xs text-amber-200/80 leading-relaxed">
            Google Flow runs inside your Chrome browser via Flow Connector. If Chrome is minimized or hidden, scene generation will pause.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSnap}
          className="shrink-0 inline-flex items-center space-x-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-200 transition-all active:scale-95"
        >
          <Columns2 className="h-3.5 w-3.5" />
          <span>Snap Side-by-Side</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Input Mode Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Creation Mode
            </label>
            <span className="text-xs text-slate-400">
              {inputMode === 'script' ? 'Full Multi-Scene Script' : 'Quick Prompt / Topic'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setInputMode('topic')}
              className={`flex items-center space-x-2.5 rounded-xl border p-3 text-left transition-all ${
                inputMode === 'topic'
                  ? 'border-accent-purple bg-accent-purple/15 text-white ring-1 ring-accent-purple'
                  : 'border-studio-800 bg-studio-900/60 text-slate-400 hover:border-studio-700 hover:text-slate-200'
              }`}
            >
              <Lightbulb className={`h-4 w-4 ${inputMode === 'topic' ? 'text-accent-purple' : 'text-slate-500'}`} />
              <div>
                <div className="text-xs font-bold">💡 Quick Topic / Concept</div>
                <div className="text-[11px] text-slate-400">AI scriptwriter generates complete scenes</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInputMode('script')}
              className={`flex items-center space-x-2.5 rounded-xl border p-3 text-left transition-all ${
                inputMode === 'script'
                  ? 'border-accent-purple bg-accent-purple/15 text-white ring-1 ring-accent-purple'
                  : 'border-studio-800 bg-studio-900/60 text-slate-400 hover:border-studio-700 hover:text-slate-200'
              }`}
            >
              <FileText className={`h-4 w-4 ${inputMode === 'script' ? 'text-accent-purple' : 'text-slate-500'}`} />
              <div>
                <div className="text-xs font-bold">📝 Full Custom Script</div>
                <div className="text-[11px] text-slate-400">Paste your own multi-scene storyboard</div>
              </div>
            </button>
          </div>
        </div>

        {/* Script / Topic Textarea */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {inputMode === 'script' ? 'Custom Script / Storyboard' : 'Video Topic or Concept'}
              </label>
              {inputMode === 'script' && (
                <button
                  type="button"
                  onClick={() => setTopic(sampleScriptTemplate)}
                  className="text-[11px] text-accent-purple hover:underline"
                >
                  Load sample template
                </button>
              )}
            </div>
            <span className={`text-xs ${topic.length > 19000 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
              {topic.length.toLocaleString()} / 20,000 characters
            </span>
          </div>

          <textarea
            required
            rows={inputMode === 'script' ? 9 : 4}
            maxLength={20000}
            placeholder={
              inputMode === 'script'
                ? `Paste your full script or storyboard here. You can use markers like:\n\n[Scene 1]\nVisual: Cinematic drone shot...\nNarration: Here is your dialogue or voiceover text...\n\n[Scene 2]\nVisual: Extreme close-up of...\nNarration: Next part of the story...`
                : 'e.g. 5 fascinating secrets of the deep ocean that scientists just discovered...'
            }
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="w-full rounded-xl border border-studio-700 bg-studio-900/90 p-4 text-sm text-white placeholder-slate-500 focus:border-accent-purple focus:outline-none focus:ring-1 focus:ring-accent-purple font-sans leading-relaxed"
          />

          {/* Quick Idea Chips (only in topic mode) */}
          {inputMode === 'topic' && (
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400 flex items-center">
                <Flame className="h-3 w-3 mr-1 text-accent-pink" /> Quick inspiration:
              </span>
              <div className="flex flex-wrap gap-2">
                {sampleIdeas.map((idea, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTopic(idea)}
                    className="rounded-lg border border-studio-800 bg-studio-900/60 px-2.5 py-1 text-xs text-slate-300 hover:border-purple-500/40 hover:text-white transition-all text-left"
                  >
                    {idea}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reference Images / Assets Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-accent-purple" />
                <span>Reference Images & Assets (Optional)</span>
              </label>
              <span className="rounded bg-studio-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                {images.length} {images.length === 1 ? 'image' : 'images'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSelectImages}
              className="inline-flex items-center space-x-1 text-xs font-semibold text-accent-purple hover:text-purple-300 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Images</span>
            </button>
          </div>

          {/* Hidden File Input for browser fallback */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Upload Dropzone / Gallery */}
          {images.length === 0 ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleSelectImages}
              className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-accent-purple bg-accent-purple/10 scale-[1.01]'
                  : 'border-studio-700/80 bg-studio-900/40 hover:border-studio-600 hover:bg-studio-900/60'
              }`}
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-studio-800 text-slate-400 mb-2">
                <Upload className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-slate-300">
                Click or drag & drop reference images
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports JPG, PNG, WEBP. Used for image-to-video scene prompts and animated Ken Burns compositions.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl border border-studio-700 bg-studio-900/90 overflow-hidden shadow-md"
                  >
                    <div className="aspect-video w-full bg-black/40 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.preview}
                        alt={img.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="p-2 flex items-center justify-between gap-1">
                      <div className="truncate">
                        <span className="text-[10px] font-bold text-accent-purple block">
                          Scene {idx + 1} Reference
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block" title={img.name}>
                          {img.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleRemoveImage(img.id);
                        }}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                        title="Remove image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add more button */}
                <button
                  type="button"
                  onClick={handleSelectImages}
                  className="rounded-xl border border-dashed border-studio-700 bg-studio-900/40 p-4 flex flex-col items-center justify-center text-slate-400 hover:border-accent-purple hover:text-white transition-all min-h-[90px]"
                >
                  <Plus className="h-5 w-5 mb-1" />
                  <span className="text-[11px] font-medium">Add More</span>
                </button>
              </div>

              <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                <Info className="h-3.5 w-3.5 text-accent-purple shrink-0" />
                <span>
                  Images are distributed sequentially across your storyboard scenes for Google Flow and FFmpeg assembly.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Video Format Selection */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Output Aspect Ratio Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Both Formats */}
            <button
              type="button"
              onClick={() => setFormat('both')}
              className={`rounded-xl border p-4 text-left transition-all ${
                format === 'both'
                  ? 'border-accent-purple bg-accent-purple/10 ring-1 ring-accent-purple'
                  : 'border-studio-800 bg-studio-900/60 hover:border-studio-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">Both Formats</span>
                <span className="rounded bg-accent-purple/20 text-purple-300 px-1.5 py-0.5 text-[10px] font-semibold">Recommended</span>
              </div>
              <p className="text-xs text-slate-400">Generate 9:16 vertical reels AND 16:9 widescreen video</p>
            </button>

            {/* 9:16 Vertical */}
            <button
              type="button"
              onClick={() => setFormat('9:16')}
              className={`rounded-xl border p-4 text-left transition-all ${
                format === '9:16'
                  ? 'border-accent-purple bg-accent-purple/10 ring-1 ring-accent-purple'
                  : 'border-studio-800 bg-studio-900/60 hover:border-studio-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">9:16 Vertical</span>
              </div>
              <p className="text-xs text-slate-400">Optimized for Instagram Reels, Facebook Reels, TikTok</p>
            </button>

            {/* 16:9 Landscape */}
            <button
              type="button"
              onClick={() => setFormat('16:9')}
              className={`rounded-xl border p-4 text-left transition-all ${
                format === '16:9'
                  ? 'border-accent-purple bg-accent-purple/10 ring-1 ring-accent-purple'
                  : 'border-studio-800 bg-studio-900/60 hover:border-studio-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold text-white">16:9 Landscape</span>
              </div>
              <p className="text-xs text-slate-400">Optimized for Facebook Page posts and YouTube</p>
            </button>
          </div>
        </div>

        {/* Publishing Target Platforms */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Automated Publishing Destinations (Meta Suite)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Instagram Reels */}
            <label className="flex items-center justify-between rounded-xl border border-studio-800 bg-studio-900/60 p-3.5 cursor-pointer hover:border-studio-700">
              <div className="flex items-center space-x-3">
                <Instagram className="h-5 w-5 text-pink-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">Instagram Reels</span>
                  <span className="text-[11px] text-slate-400">Upload to connected Instagram account</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishTargets.instagramReels}
                onChange={e => setPublishTargets({ ...publishTargets, instagramReels: e.target.checked })}
                className="h-4 w-4 rounded border-studio-700 text-accent-purple focus:ring-accent-purple"
              />
            </label>

            {/* Facebook Reels */}
            <label className="flex items-center justify-between rounded-xl border border-studio-800 bg-studio-900/60 p-3.5 cursor-pointer hover:border-studio-700">
              <div className="flex items-center space-x-3">
                <Facebook className="h-5 w-5 text-blue-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">Facebook Reels</span>
                  <span className="text-[11px] text-slate-400">Publish as Facebook Reel on Page</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishTargets.facebookReels}
                onChange={e => setPublishTargets({ ...publishTargets, facebookReels: e.target.checked })}
                className="h-4 w-4 rounded border-studio-700 text-accent-purple focus:ring-accent-purple"
              />
            </label>

            {/* Facebook Page Video */}
            <label className="flex items-center justify-between rounded-xl border border-studio-800 bg-studio-900/60 p-3.5 cursor-pointer hover:border-studio-700">
              <div className="flex items-center space-x-3">
                <Facebook className="h-5 w-5 text-indigo-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">Facebook Page Video</span>
                  <span className="text-[11px] text-slate-400">Post regular widescreen video to feed</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishTargets.facebookPageVideo}
                onChange={e => setPublishTargets({ ...publishTargets, facebookPageVideo: e.target.checked })}
                className="h-4 w-4 rounded border-studio-700 text-accent-purple focus:ring-accent-purple"
              />
            </label>

            {/* WhatsApp */}
            <label className="flex items-center justify-between rounded-xl border border-studio-800 bg-studio-900/60 p-3.5 cursor-pointer hover:border-studio-700">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-emerald-400" />
                <div>
                  <span className="text-xs font-semibold text-white block">WhatsApp Status / Message</span>
                  <span className="text-[11px] text-slate-400">Upload video to WhatsApp Cloud</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={publishTargets.whatsappStatus}
                onChange={e => setPublishTargets({ ...publishTargets, whatsappStatus: e.target.checked })}
                className="h-4 w-4 rounded border-studio-700 text-accent-purple focus:ring-accent-purple"
              />
            </label>
          </div>
        </div>

        {/* Auto-Publish Toggle */}
        <div className="rounded-xl border border-studio-800 bg-studio-900/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <span>Publishing Mode</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    autoPublish
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {autoPublish ? '⚡ Auto-Publish Enabled' : '🛡️ Manual Review First (Recommended)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
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
              <div className="w-11 h-6 bg-studio-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent-purple"></div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !topic.trim()}
          className="w-full inline-flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-accent-purple via-indigo-600 to-accent-pink px-6 py-4 text-base font-bold text-white shadow-xl shadow-purple-500/25 hover:opacity-95 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          <span>{isSubmitting ? 'Starting Pipeline...' : 'Start Automatic Video Production'}</span>
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
