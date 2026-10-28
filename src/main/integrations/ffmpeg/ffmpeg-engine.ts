import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import ffmpeg from 'fluent-ffmpeg';
import { ProjectManager } from '../../core/project-manager';
import { SubtitleGenerator } from './subtitle-generator';
import { store } from '../../core/store';

export class FFmpegEngine {
  private static isConfigured = false;

  private static configureFFmpeg() {
    if (this.isConfigured) return;

    const customPath = store.get('settings.ffmpegPath', '/Users/geniussau/.local/bin/ffmpeg');
    if (fs.existsSync(customPath)) {
      ffmpeg.setFfmpegPath(customPath);
      console.log(`FFmpeg configured at: ${customPath}`);
    } else {
      console.log('Using default system FFmpeg in PATH');
    }
    this.isConfigured = true;
  }

  /**
   * Stitches all scene clips into seamless 9:16 and/or 16:9 videos
   */
  public static async assembleProject(
    projectId: string,
    onProgress?: (percent: number, message: string) => void
  ): Promise<{ success: boolean; output916?: string; output169?: string; error?: string }> {
    this.configureFFmpeg();

    const project = ProjectManager.getProject(projectId);
    if (!project || !project.script) {
      return { success: false, error: 'Project or script not found' };
    }

    const assetsDir = ProjectManager.getProjectAssetsDir(projectId);
    const scenes = project.script.scenes;

    if (!scenes || scenes.length === 0) {
      return { success: false, error: 'No scenes defined in script' };
    }

    onProgress?.(10, 'Preparing scene assets and generating subtitles...');

    try {
      let output916: string | undefined;
      let output169: string | undefined;

      // 1. Process 9:16 Vertical (Reels / Stories)
      if (project.format === '9:16' || project.format === 'both') {
        onProgress?.(30, 'Rendering 9:16 vertical video for Instagram & Facebook Reels...');
        output916 = path.join(assetsDir, 'output_9_16.mp4');
        const subPath = path.join(assetsDir, 'subtitles_9_16.ass');
        SubtitleGenerator.generateAssSubtitles(scenes, subPath, true);

        await this.renderVideo(scenes, output916, 1080, 1920, subPath, percent => {
          onProgress?.(30 + Math.floor(percent * 0.3), `Assembling 9:16: ${percent}%`);
        });
      }

      // 2. Process 16:9 Landscape (Facebook / YouTube)
      if (project.format === '16:9' || project.format === 'both') {
        onProgress?.(65, 'Rendering 16:9 landscape video for Facebook Posts...');
        output169 = path.join(assetsDir, 'output_16_9.mp4');
        const subPath = path.join(assetsDir, 'subtitles_16_9.ass');
        SubtitleGenerator.generateAssSubtitles(scenes, subPath, false);

        await this.renderVideo(scenes, output169, 1920, 1080, subPath, percent => {
          onProgress?.(65 + Math.floor(percent * 0.25), `Assembling 16:9: ${percent}%`);
        });
      }

      // 3. Generate thumbnail
      const thumbnailPath = path.join(assetsDir, 'thumbnail.jpg');
      const sourceVideo = output916 || output169;
      if (sourceVideo && fs.existsSync(sourceVideo)) {
        await this.extractThumbnail(sourceVideo, thumbnailPath);
      }

      // Update project record
      project.outputVideo916 = output916;
      project.outputVideo169 = output169;
      project.thumbnailPath = thumbnailPath;
      project.status = 'assembled';
      project.progressPercent = 100;
      ProjectManager.updateProject(project);

      onProgress?.(100, 'Video assembly completed successfully!');

      return {
        success: true,
        output916,
        output169,
      };
    } catch (err: any) {
      console.error('Error assembling video:', err);
      return {
        success: false,
        error: `FFmpeg assembly error: ${err.message}`,
      };
    }
  }

  private static async probeHasAudio(filePath: string): Promise<boolean> {
    const ffmpegBin = store.get('settings.ffmpegPath', '/Users/geniussau/.local/bin/ffmpeg');
    const binToUse = fs.existsSync(ffmpegBin) ? ffmpegBin : 'ffmpeg';

    return new Promise((resolve) => {
      execFile(binToUse, ['-i', filePath], (error, stdout, stderr) => {
        const output = (stdout || '') + (stderr || '');
        resolve(/Audio:\s+/i.test(output));
      });
    });
  }

  private static async ensureClipHasAudio(
    clipPath: string,
    tmpDir: string,
    index: number
  ): Promise<string> {
    const hasAudio = await this.probeHasAudio(clipPath);
    if (hasAudio) return clipPath;

    const normalizedPath = path.join(tmpDir, `audio_norm_${index}_${path.basename(clipPath)}`);
    if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).size > 1000) {
      return normalizedPath;
    }

    const ffmpegBin = store.get('settings.ffmpegPath', '/Users/geniussau/.local/bin/ffmpeg');
    const binToUse = fs.existsSync(ffmpegBin) ? ffmpegBin : 'ffmpeg';

    return new Promise((resolve) => {
      execFile(
        binToUse,
        [
          '-y',
          '-i', clipPath,
          '-f', 'lavfi',
          '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-shortest',
          normalizedPath,
        ],
        (err) => {
          if (!err && fs.existsSync(normalizedPath)) {
            resolve(normalizedPath);
          } else {
            console.warn(`Failed to add silent audio to clip ${clipPath}:`, err);
            resolve(clipPath);
          }
        }
      );
    });
  }

  private static async renderVideo(
    scenes: any[],
    outputPath: string,
    width: number,
    height: number,
    subtitlesAssPath: string,
    onPercent: (p: number) => void
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const tmpDir = path.join(path.dirname(store.path), 'temp_clips');
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }

      // Collect valid scene clips or generate placeholder video if clips not yet downloaded
      const rawClipPaths: string[] = [];

      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        let p = width === 1080 ? s.clipPath916 : s.clipPath169;
        if (!p || !fs.existsSync(p)) {
          p = await this.createPlaceholderClip(s, width, height, i);
        }
        rawClipPaths.push(p);
      }

      // Ensure every clip has a valid audio stream before concat
      const clipPaths: string[] = [];
      for (let i = 0; i < rawClipPaths.length; i++) {
        const withAudio = await this.ensureClipHasAudio(rawClipPaths[i], tmpDir, i);
        clipPaths.push(withAudio);
      }

      // Dynamic FFmpeg command
      const command = ffmpeg();

      clipPaths.forEach(clip => {
        command.input(clip);
      });

      // Scale each video input to exact dimensions & frame rate, and format audio to standard stereo 48kHz
      const filterSteps: string[] = [];
      const concatInputs: string[] = [];

      for (let idx = 0; idx < clipPaths.length; idx++) {
        filterSteps.push(
          `[${idx}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=30[v${idx}]`
        );
        filterSteps.push(
          `[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo[a${idx}]`
        );
        concatInputs.push(`[v${idx}][a${idx}]`);
      }

      const concatFilter = `${concatInputs.join('')}concat=n=${clipPaths.length}:v=1:a=1[vconcat][aout]`;
      filterSteps.push(concatFilter);

      // Escape subtitle path for FFmpeg filter parser
      let finalVideoTag = 'vconcat';
      if (fs.existsSync(subtitlesAssPath)) {
        const escapedSubPath = subtitlesAssPath
          .replace(/\\/g, '/')
          .replace(/:/g, '\\:')
          .replace(/'/g, "\\'")
          .replace(/ /g, '\\ ');
        filterSteps.push(`[vconcat]subtitles='${escapedSubPath}'[vout]`);
        finalVideoTag = 'vout';
      }

      const filterString = filterSteps.join(';');

      command
        .complexFilter(filterString, [finalVideoTag, 'aout'])
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 22',
          '-pix_fmt yuv420p',
          '-c:a aac',
          '-b:a 192k',
          '-ar 48000',
          '-movflags +faststart',
        ])
        .output(outputPath)
        .on('progress', progress => {
          if (progress.percent) {
            onPercent(Math.min(99, Math.floor(progress.percent)));
          }
        })
        .on('end', () => {
          onPercent(100);
          resolve();
        })
        .on('error', async err => {
          console.warn(`Render with subtitles filter failed: ${err.message}. Retrying without subtitles...`);
          try {
            await this.renderVideoWithoutSubtitles(clipPaths, outputPath, width, height, onPercent);
            resolve();
          } catch (fallbackErr) {
            reject(fallbackErr);
          }
        });

      command.run();
    });
  }

  private static async renderVideoWithoutSubtitles(
    clipPaths: string[],
    outputPath: string,
    width: number,
    height: number,
    onPercent: (p: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      clipPaths.forEach(clip => command.input(clip));

      const filterSteps: string[] = [];
      const concatInputs: string[] = [];

      for (let idx = 0; idx < clipPaths.length; idx++) {
        filterSteps.push(
          `[${idx}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=30[v${idx}]`
        );
        filterSteps.push(
          `[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo[a${idx}]`
        );
        concatInputs.push(`[v${idx}][a${idx}]`);
      }

      const concatFilter = `${concatInputs.join('')}concat=n=${clipPaths.length}:v=1:a=1[vconcat][aout]`;
      filterSteps.push(concatFilter);

      const filterString = filterSteps.join(';');

      command
        .complexFilter(filterString, ['vconcat', 'aout'])
        .outputOptions([
          '-c:v libx264',
          '-preset fast',
          '-crf 22',
          '-pix_fmt yuv420p',
          '-c:a aac',
          '-b:a 192k',
          '-ar 48000',
          '-movflags +faststart',
        ])
        .output(outputPath)
        .on('progress', progress => {
          if (progress.percent) {
            onPercent(Math.min(99, Math.floor(progress.percent)));
          }
        })
        .on('end', () => {
          onPercent(100);
          resolve();
        })
        .on('error', err => reject(err));

      command.run();
    });
  }

  public static async createPlaceholderClip(
    scene: any,
    width: number,
    height: number,
    index: number
  ): Promise<string> {
    const tmpDir = path.join(path.dirname(store.path), 'temp_clips');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const duration = scene.durationSeconds || 5;
    const ffmpegBin = store.get('settings.ffmpegPath', '/Users/geniussau/.local/bin/ffmpeg');
    const binToUse = fs.existsSync(ffmpegBin) ? ffmpegBin : 'ffmpeg';

    // If reference image exists on the scene, render an animated image clip
    if (scene.referenceImage && fs.existsSync(scene.referenceImage)) {
      const imgTag = path.basename(scene.referenceImage).replace(/[^a-zA-Z0-9]/g, '_');
      const imageClipPath = path.join(tmpDir, `ref_${index}_${imgTag}_${width}x${height}.mp4`);
      if (fs.existsSync(imageClipPath)) return imageClipPath;

      return new Promise((resolve) => {
        execFile(
          binToUse,
          [
            '-y',
            '-loop', '1',
            '-i', scene.referenceImage,
            '-f', 'lavfi',
            '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
            '-t', String(duration),
            '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-shortest',
            '-r', '30',
            '-pix_fmt', 'yuv420p',
            imageClipPath,
          ],
          err => {
            if (!err) {
              resolve(imageClipPath);
            } else {
              console.warn('Failed to render reference image clip, using solid color:', err);
              this.createColorClip(binToUse, width, height, duration, index, tmpDir)
                .then(resolve)
                .catch(resolve);
            }
          }
        );
      });
    }

    return this.createColorClip(binToUse, width, height, duration, index, tmpDir);
  }

  private static createColorClip(
    binToUse: string,
    width: number,
    height: number,
    duration: number,
    index: number,
    tmpDir: string
  ): Promise<string> {
    const clipPath = path.join(tmpDir, `scene_${index}_${width}x${height}.mp4`);
    if (fs.existsSync(clipPath)) return Promise.resolve(clipPath);

    // Use nice studio gradients for placeholder clips
    const colors = ['#1e1b4b', '#172554', '#064e3b', '#701a75', '#450a0a'];
    const color = colors[index % colors.length];

    return new Promise((resolve, reject) => {
      execFile(
        binToUse,
        [
          '-y',
          '-f', 'lavfi',
          '-i', `color=c=${color}:s=${width}x${height}:d=${duration}:r=30`,
          '-f', 'lavfi',
          '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-shortest',
          '-t', `${duration}`,
          '-pix_fmt', 'yuv420p',
          clipPath,
        ],
        err => {
          if (err) {
            console.error('Failed to create color placeholder clip:', err);
            reject(err);
          } else {
            resolve(clipPath);
          }
        }
      );
    });
  }

  private static async extractThumbnail(videoPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:01.000'],
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: '640x?',
        })
        .on('end', () => resolve())
        .on('error', err => reject(err));
    });
  }
}
