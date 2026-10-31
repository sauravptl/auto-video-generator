import fs from 'fs';
import { spawn } from 'child_process';
import type { VideoScript, VideoFormat, SceneDefinition } from '../../../shared/types';

export interface GenerateScriptOptions {
  isCustomScript?: boolean;
  referenceImages?: string[];
}

export class AgyClient {
  private static getSpawnEnv() {
    const home = process.env.HOME || '';
    const nvmRoot = `${home}/.nvm/versions/node`;
    const nvmBins = fs.existsSync(nvmRoot)
      ? fs
          .readdirSync(nvmRoot, { withFileTypes: true })
          .filter(entry => entry.isDirectory())
          .map(entry => `${nvmRoot}/${entry.name}/bin`)
      : [];
    const extraPaths = [
      ...nvmBins,
      `${home}/.local/bin`,
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/usr/sbin',
      '/sbin',
    ];
    const currentPath = process.env.PATH || '';
    const mergedPath = Array.from(new Set([...extraPaths, ...currentPath.split(':')])).filter(Boolean).join(':');

    return {
      ...process.env,
      PATH: mergedPath,
    };
  }

  public static async testConnection(): Promise<{ success: boolean; version?: string; error?: string }> {
    return new Promise(resolve => {
      const proc = spawn('agy', ['--version'], { env: this.getSpawnEnv() });
      let output = '';
      let errOutput = '';

      proc.stdout?.on('data', data => {
        output += data.toString();
      });

      proc.stderr?.on('data', data => {
        errOutput += data.toString();
      });

      proc.on('close', code => {
        if (code === 0 && output) {
          resolve({ success: true, version: output.trim() });
        } else {
          resolve({
            success: false,
            error: errOutput || 'AGY CLI not found in PATH or exited with code ' + code,
          });
        }
      });

      proc.on('error', err => {
        resolve({
          success: false,
          error: `Failed to execute 'agy': ${err.message}`,
        });
      });
    });
  }

  public static async generateScript(
    topic: string,
    format: VideoFormat,
    referenceImages?: string[],
    allowFallback = true
  ): Promise<VideoScript> {
    const trimmed = topic.trim();

    // Check if the input is already a full multi-scene script
    const hasSceneMarkers = /(?:\[?(?:scene|shot|part|act)\s*\d+\]?|visual:)/i.test(trimmed);
    const isMultiParagraph = trimmed.split(/\n\s*\n/).filter(b => b.trim().length > 0).length >= 2;
    const isLongScript = trimmed.length > 200;

    if (hasSceneMarkers || (isMultiParagraph && isLongScript)) {
      console.log('Detected full user script, parsing directly into multi-scene storyboard...');
      return this.parseUserScriptToStoryboard(trimmed, format, referenceImages);
    }

    const isAgyAvailable = (await this.testConnection()).success;

    if (isAgyAvailable) {
      try {
        const agyScript = await this.generateWithAgy(topic, format, referenceImages);
        if (agyScript) return agyScript;
      } catch (err) {
        if (!allowFallback) throw err;
        console.warn('AGY execution encountered an error, using intelligent prompt builder fallback:', err);
      }
    } else if (!allowFallback) {
      throw new Error('AGY CLI is not installed or authenticated. Configure another script provider or install AGY.');
    }

    return this.generateLocalFallback(topic, format, referenceImages);
  }

  /**
   * Intelligently parses user-provided full scripts (with scene labels, paragraphs, or narration)
   * into structured SceneDefinition storyboard objects and binds reference images.
   */
  private static parseUserScriptToStoryboard(
    scriptText: string,
    format: VideoFormat,
    referenceImages?: string[]
  ): VideoScript {
    // 1. Extract title if specified at the top (e.g. Title: ... or # ...)
    let workingText = scriptText;
    let extractedTitle = '';
    const titleMatch = workingText.match(/^(?:#+\s*|(?:title|topic):\s*)([^\n]+)/i);
    if (titleMatch) {
      extractedTitle = titleMatch[1].trim();
      workingText = workingText.replace(/^(?:#+\s*|(?:title|topic):\s*)[^\n]+\n*/i, '').trim();
    }

    // 2. Split into scene segments
    const sceneRegex = /(?:^|\n)(?:\[?(?:Scene|Shot|Part|Act)\s*\d+\]?[:\s-]*)/i;
    let rawBlocks = workingText.split(sceneRegex).map(b => b.trim()).filter(b => b.length > 0);

    // If no scene markers were found, split by double line breaks (paragraphs)
    if (rawBlocks.length <= 1) {
      rawBlocks = workingText
        .split(/\n\s*\n/)
        .map(b => b.trim())
        .filter(b => b.length > 0);
    }

    // If still a single long block, chunk into 2-3 sentence blocks
    if (rawBlocks.length <= 1 && workingText.length > 150) {
      const sentences = workingText.match(/[^.!?]+[.!?]+(?:\s|$)/g) || [workingText];
      rawBlocks = [];
      let currentChunk = '';
      for (const s of sentences) {
        if ((currentChunk + s).length > 150 && currentChunk.length > 0) {
          rawBlocks.push(currentChunk.trim());
          currentChunk = s;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + s.trim();
        }
      }
      if (currentChunk.trim()) {
        rawBlocks.push(currentChunk.trim());
      }
    }

    // Default title fallback
    if (!extractedTitle) {
      const firstLine = (rawBlocks[0] || scriptText).split('\n')[0].replace(/["']/g, '').trim();
      extractedTitle = firstLine.length > 40 ? firstLine.slice(0, 37) + '...' : firstLine;
    }

    const transitions: Array<'fade' | 'dissolve' | 'wipeleft'> = ['fade', 'dissolve', 'wipeleft'];
    const maxScenes = Math.min(8, Math.max(2, rawBlocks.length));
    const selectedBlocks = rawBlocks.slice(0, maxScenes);

    const scenes: SceneDefinition[] = selectedBlocks.map((block, idx) => {
      let visualPrompt = '';
      let narration = block;

      // Extract explicit [Visual: ...] or Visual: ... tags
      const visualMatch = block.match(/(?:\[visual[:\s]+([^\]]+)\]|visual[:\s]+([^\n]+))/i);
      if (visualMatch) {
        visualPrompt = (visualMatch[1] || visualMatch[2]).trim();
        narration = block
          .replace(/(?:\[visual[:\s]+[^\]]+\]|visual[:\s]+[^\n]+)/gi, '')
          .replace(/^(?:narration|audio|voiceover|dialogue)[:\s]+/i, '')
          .trim();
      }

      // Clean narration from prefix markers
      narration = narration
        .replace(/^(?:narration|audio|voiceover|dialogue|speaker)[:\s]+/i, '')
        .trim();

      if (!narration) {
        narration = block.slice(0, 140);
      }

      // If no explicit visual prompt was provided, synthesize a cinematic Veo 3.1 visual prompt from the narration
      if (!visualPrompt) {
        const cleanContext = narration.replace(/["']/g, '').slice(0, 90).replace(/\s+/g, ' ');
        visualPrompt = `Cinematic vivid shot illustrating "${cleanContext}". High production value, atmospheric cinematic lighting, fluid camera movement, photorealistic 8k detail.`;
      }

      // Assign reference image if available
      const assignedImage =
        referenceImages && referenceImages.length > 0
          ? referenceImages[idx % referenceImages.length]
          : undefined;

      return {
        sceneIndex: idx,
        durationSeconds: 6,
        model: 'veo-3.1-fast',
        visualPrompt,
        narrationOrSubtitle: narration,
        transition: transitions[idx % transitions.length],
        transitionDuration: 0.5,
        referenceImage: assignedImage,
        status: 'pending',
      };
    });

    const totalSeconds = scenes.length * 6;

    return {
      title: extractedTitle,
      synopsis: `Custom script storyboard produced with ${scenes.length} cinematic scenes.`,
      targetDurationSeconds: totalSeconds,
      caption: `${extractedTitle} 🚀 Watch until the end!\n\n#AIVideo #Reels #Shorts #Viral`,
      hashtags: ['#AIVideo', '#Reels', '#VideoProduction', '#Viral', '#GoogleFlow'],
      scenes,
    };
  }

  private static async generateWithAgy(
    topic: string,
    format: VideoFormat,
    referenceImages?: string[]
  ): Promise<VideoScript | null> {
    const systemPrompt = `You are an expert AI video director and scriptwriter for viral social media videos (Instagram Reels, Facebook Reels, TikTok).
Create a complete video storyboard for the topic: "${topic}".
Output ONLY valid raw JSON with this exact structure (no markdown fences, no explanation):
{
  "title": "Short catchy title",
  "synopsis": "One sentence summary of the video",
  "targetDurationSeconds": 24,
  "caption": "Engaging caption for Instagram & Facebook with call to action",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#viral", "#reels"],
  "scenes": [
    {
      "sceneIndex": 0,
      "durationSeconds": 6,
      "model": "veo-3.1-fast",
      "visualPrompt": "Detailed cinematic prompt for Google Flow Veo 3.1: camera angle, lighting, action, atmosphere",
      "narrationOrSubtitle": "Attention grabbing opening hook text",
      "transition": "fade",
      "transitionDuration": 0.5
    }
  ]
}
Generate between 3 to 5 scenes, total duration between 18 to 30 seconds.
Ensure each visualPrompt is descriptive and visual (avoid text overlays in the prompt, focus on camera motion, subject, lighting, environment).`;

    return new Promise((resolve, reject) => {
      const proc = spawn('agy', ['--print', systemPrompt], { env: this.getSpawnEnv() });
      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', data => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', data => {
        stderr += data.toString();
      });

      proc.on('close', code => {
        if (code !== 0) {
          return reject(new Error(`agy process exited with code ${code}: ${stderr}`));
        }

        try {
          // Clean possible markdown backticks
          let cleaned = stdout.trim();
          if (cleaned.startsWith('```json')) {
            cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
          } else if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
          }

          const parsed = JSON.parse(cleaned) as VideoScript;
          // Ensure scenes have status: 'pending' and bind reference images
          parsed.scenes = parsed.scenes.map((s, idx) => ({
            ...s,
            sceneIndex: idx,
            referenceImage:
              referenceImages && referenceImages.length > 0
                ? referenceImages[idx % referenceImages.length]
                : undefined,
            status: 'pending',
          }));
          resolve(parsed);
        } catch (e: any) {
          reject(new Error(`Failed to parse AGY JSON output: ${e.message}`));
        }
      });

      proc.on('error', err => {
        reject(err);
      });
    });
  }

  public static generateLocalFallback(
    topic: string,
    format: VideoFormat,
    referenceImages?: string[]
  ): VideoScript {
    // Generate intelligent multi-scene script crafted specifically for Google Flow Veo 3.1
    const scenes: SceneDefinition[] = [
      {
        sceneIndex: 0,
        durationSeconds: 6,
        model: 'veo-3.1-fast',
        visualPrompt: `Cinematic high-energy opening shot establishing ${topic}. Dynamic camera push-in, dramatic lighting, high detail 8k resolution, cinematic color grading.`,
        narrationOrSubtitle: `Did you know this about ${topic}?`,
        transition: 'fade',
        transitionDuration: 0.5,
        referenceImage: referenceImages?.[0],
        status: 'pending',
      },
      {
        sceneIndex: 1,
        durationSeconds: 8,
        model: 'veo-3.1-fast',
        visualPrompt: `Close-up dynamic action shot showing key mechanism or detail of ${topic}. Shallow depth of field, warm golden hour sunlight, hyperrealistic textures, slow continuous panning.`,
        narrationOrSubtitle: `Here is the secret that changes everything.`,
        transition: 'dissolve',
        transitionDuration: 0.5,
        referenceImage:
          referenceImages && referenceImages.length > 1 ? referenceImages[1] : referenceImages?.[0],
        status: 'pending',
      },
      {
        sceneIndex: 2,
        durationSeconds: 6,
        model: 'veo-3.1-fast',
        visualPrompt: `Wide epic concluding perspective of ${topic}. Smooth drone backward aerial pull-out, vibrant atmosphere, sunset rays, cinematic masterpiece.`,
        narrationOrSubtitle: `Follow for more insights every day!`,
        transition: 'fade',
        transitionDuration: 0.5,
        referenceImage:
          referenceImages && referenceImages.length > 2 ? referenceImages[2] : referenceImages?.[0],
        status: 'pending',
      },
    ];

    return {
      title: `${topic.slice(0, 30)} - AI Story`,
      synopsis: `An engaging AI-produced cinematic video exploring ${topic}.`,
      targetDurationSeconds: 20,
      caption: `Discover the truth about ${topic} 🚀 Watch until the end and share your thoughts in the comments! #AIVideo #Flow`,
      hashtags: ['#AIVideo', '#GoogleFlow', '#Veo', '#Reels', '#ViralVideo', '#TechTrends'],
      scenes,
    };
  }
}
