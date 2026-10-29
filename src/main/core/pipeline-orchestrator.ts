import fs from 'fs';
import path from 'path';
import { ProjectManager } from './project-manager';
import { AgyClient } from '../integrations/agy/agy-client';
import { FlowClient } from '../integrations/flow/flow-client';
import { FFmpegEngine } from '../integrations/ffmpeg/ffmpeg-engine';
import { MetaClient } from '../integrations/meta/meta-client';
import type { Project, SceneDefinition } from '../../shared/types';

export class PipelineOrchestrator {
  private static activeRuns = new Map<string, boolean>();

  /**
   * STAGE 1: Generate AI Script (AGY CLI).
   * Generates script & scene storyboards and stops at 'script_ready'
   * so user can review and edit before starting video generation.
   */
  public static async start(
    projectId: string,
    onProgress: (project: Project) => void
  ): Promise<void> {
    const project = ProjectManager.getProject(projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    this.activeRuns.set(projectId, true);

    try {
      if (!project.script) {
        project.status = 'script_generating';
        project.progressPercent = 10;
        project.currentStageMessage = 'Generating video script with AGY CLI AI...';
        ProjectManager.updateProject(project);
        onProgress(project);

        console.log(`[Pipeline ${projectId}] Generating script with AGY CLI for: ${project.topic.slice(0, 60)}...`);
        const script = await AgyClient.generateScript(
          project.topic,
          project.format,
          project.referenceImages
        );
        project.script = script;
        project.title = script.title;

        // Persist full script.json directly in project folder
        const projectDir = ProjectManager.getProjectAssetsDir(projectId);
        try {
          fs.writeFileSync(
            path.join(projectDir, 'script.json'),
            JSON.stringify(script, null, 2),
            'utf-8'
          );
        } catch (e) {
          console.error('Failed to write script.json:', e);
        }
      }

      project.status = 'script_ready';
      project.progressPercent = 25;
      project.currentStageMessage = `Script ready with ${project.script.scenes.length} scenes. Review/edit scenes, then click "Start Generating Video".`;
      ProjectManager.updateProject(project);
      onProgress(project);

      console.log(`[Pipeline ${projectId}] Script ready. Awaiting user review before scene video generation.`);
    } catch (err: any) {
      console.error(`Pipeline script error on project ${projectId}:`, err);
      project.status = 'failed';
      project.currentStageMessage = `Error: ${err.message}`;
      ProjectManager.updateProject(project);
      onProgress(project);
    } finally {
      this.activeRuns.delete(projectId);
    }
  }

  /**
   * STAGE 2-4: Start generating scenes in Google Flow, assemble, and publish.
   * Can be paused and resumed.
   */
  public static async startSceneGeneration(
    projectId: string,
    onProgress: (project: Project) => void
  ): Promise<void> {
    const project = ProjectManager.getProject(projectId);
    if (!project || !project.script) {
      throw new Error(`Project ${projectId} has no script. Generate script first.`);
    }

    this.activeRuns.set(projectId, true);

    try {
      const projectDir = ProjectManager.getProjectAssetsDir(projectId);
      const scenesDir = path.join(projectDir, 'scenes');
      const scenes = project.script.scenes;
      const needs916 = project.format === '9:16' || project.format === 'both';
      const needs169 = project.format === '16:9' || project.format === 'both';
      const isValidClip = (filePath?: string): filePath is string =>
        !!filePath && fs.existsSync(filePath) && fs.statSync(filePath).size > 50000;
      const hasRequiredClip = (scene: SceneDefinition) =>
        (!needs916 || isValidClip(scene.clipPath916)) && (!needs169 || isValidClip(scene.clipPath169));

      const missingBeforeStart = scenes.filter(scene => !hasRequiredClip(scene));
      if (missingBeforeStart.length > 0) {
        const flowStatus = await FlowClient.getStatus();
        const flowConnected = flowStatus.bridgeStatus === 'up' &&
          (flowStatus.extensionConnected || flowStatus.flowTabVisible);
        if (!flowConnected) {
          project.status = 'scenes_generating';
          project.progressPercent = 25;
          project.currentStageMessage = flowStatus.warning
            ? `Google Flow is not ready: ${flowStatus.warning}`
            : 'Google Flow is not connected. Open Chrome with the Flow Connector extension and keep the Flow tab visible, then retry.';
          ProjectManager.updateProject(project);
          onProgress(project);
          return;
        }
      }

      project.status = 'scenes_generating';
      project.currentStageMessage = 'Generating scenes with Google Flow (Veo 3.1)...';
      ProjectManager.updateProject(project);
      onProgress(project);

      if (!fs.existsSync(scenesDir)) {
        fs.mkdirSync(scenesDir, { recursive: true });
      }

      const totalScenes = scenes.length;

      // Helper to check existing file in downloads
      const findInDownloads = (idx: number): string | undefined => {
        const dlDir = path.join(process.env.HOME || '', 'Downloads', projectId);
        if (!fs.existsSync(dlDir)) return undefined;
        try {
          const files = fs.readdirSync(dlDir);
          const prefix = `${idx} - `;
          const matched = files.find(
            f =>
              (f.startsWith(prefix) ||
                f.startsWith(`${idx}_`) ||
                f.startsWith(`scene_${idx}`)) &&
              f.endsWith('.mp4')
          );
          if (matched) {
            const p = path.join(dlDir, matched);
            if (fs.existsSync(p) && fs.statSync(p).size > 50000) return p;
          }
        } catch (e) {
          // Ignore
        }
        return undefined;
      };

      for (let i = 0; i < totalScenes; i++) {
        // Check if paused
        if (!this.activeRuns.get(projectId)) {
          console.log(`[Pipeline ${projectId}] Generation paused at scene ${i + 1}`);
          project.status = 'paused';
          project.currentStageMessage = `Paused at Scene ${i + 1}/${totalScenes}. Click Resume to continue.`;
          ProjectManager.updateProject(project);
          onProgress(project);
          return;
        }

        const scene = scenes[i];

        // Skip if already completed and clip exists
        const destClip916 = path.join(scenesDir, `scene_${i + 1}_9_16.mp4`);
        const destClip169 = path.join(scenesDir, `scene_${i + 1}_16_9.mp4`);
        const has916 = fs.existsSync(destClip916) && fs.statSync(destClip916).size > 50000;
        const has169 = fs.existsSync(destClip169) && fs.statSync(destClip169).size > 50000;

        const needs916 = project.format === '9:16' || project.format === 'both';
        const needs169 = project.format === '16:9' || project.format === 'both';

        if ((!needs916 || has916) && (!needs169 || has169)) {
          if (has916) scene.clipPath916 = destClip916;
          if (has169) scene.clipPath169 = destClip169;
          scene.status = 'completed';
          scene.error = undefined;
          continue;
        }

        scene.status = 'generating';
        scene.error = undefined;
        project.progressPercent = 25 + Math.floor((i / totalScenes) * 35);
        project.currentStageMessage = `Scene ${i + 1}/${totalScenes}: Preparing generation...`;
        ProjectManager.updateProject(project);
        onProgress(project);

        // ------------------------------------------
        // Vertical 9:16 Scene
        // ------------------------------------------
        if (needs916 && !has916) {
          let sourceClip = findInDownloads(i + 1);

          if (!sourceClip) {
            project.currentStageMessage = `Scene ${i + 1}/${totalScenes}: Submitting to Google Flow (Veo 3.1)...`;
            onProgress(project);

            const res916 = await FlowClient.generateScene({
              prompt: scene.visualPrompt,
              type: scene.model === 'nano-banana-pro' ? 'image' : 'video',
              aspectRatio: '9:16',
              durationSeconds: scene.durationSeconds,
              model: scene.model,
              folder: projectId,
              index: i + 1,
              inputImage: scene.referenceImage,
            });

            if (res916.status === 'failed' || res916.id.startsWith('err_')) {
              console.warn(`[Pipeline] Scene ${i + 1} Flow submission error: ${res916.error}`);
              scene.status = 'failed';
              scene.error = res916.error || 'Google Flow rejected prompt or hit policy filter';
            } else if (res916.filePath && isValidClip(res916.filePath)) {
              sourceClip = res916.filePath;
            } else if (res916.id) {
              project.currentStageMessage = `Scene ${i + 1}/${totalScenes}: Waiting for Google Flow generation in Chrome...`;
              onProgress(project);

              sourceClip = await FlowClient.waitForJob(
                res916.id,
                stage => {
                  project.currentStageMessage = `Scene ${i + 1}/${totalScenes}: Google Flow is ${stage}...`;
                  onProgress(project);
                },
                4,
                { folder: projectId, index: i + 1 }
              );
            }
          }

          if (sourceClip && isValidClip(sourceClip)) {
            try {
              fs.copyFileSync(sourceClip, destClip916);
              if (isValidClip(destClip916)) {
                scene.clipPath916 = destClip916;
                scene.error = undefined;
                console.log(`[Pipeline] Saved scene ${i + 1} (9:16) to ${destClip916}`);
              } else {
                scene.status = 'failed';
                scene.error = 'Google Flow returned an invalid or incomplete 9:16 video file.';
              }
            } catch (e: any) {
              scene.status = 'failed';
              scene.error = `Could not save 9:16 video: ${e.message}`;
            }
          } else if (!scene.clipPath916 && scene.status !== 'failed') {
            scene.status = 'failed';
            scene.error = 'Video download timed out or was rejected by Google Flow.';
          }
        }

        // ------------------------------------------
        // Landscape 16:9 Scene
        // ------------------------------------------
        if (needs169 && !has169) {
          let sourceClip = findInDownloads(i + 1);

          if (!sourceClip) {
            project.currentStageMessage = `Scene ${i + 1}/${totalScenes} (16:9): Submitting to Google Flow...`;
            onProgress(project);

            const res169 = await FlowClient.generateScene({
              prompt: scene.visualPrompt,
              type: scene.model === 'nano-banana-pro' ? 'image' : 'video',
              aspectRatio: '16:9',
              durationSeconds: scene.durationSeconds,
              model: scene.model,
              folder: projectId,
              index: i + 1,
              inputImage: scene.referenceImage,
            });

            if (res169.status === 'failed' || res169.id.startsWith('err_')) {
              scene.status = 'failed';
              scene.error = res169.error || 'Google Flow rejected 16:9 prompt';
            } else if (res169.filePath && isValidClip(res169.filePath)) {
              sourceClip = res169.filePath;
            } else if (res169.id) {
              sourceClip = await FlowClient.waitForJob(
                res169.id,
                stage => {
                  project.currentStageMessage = `Scene ${i + 1}/${totalScenes}: Google Flow (16:9) is ${stage}...`;
                  onProgress(project);
                },
                4,
                { folder: projectId, index: i + 1 }
              );
            }
          }

          if (sourceClip && isValidClip(sourceClip)) {
            try {
              fs.copyFileSync(sourceClip, destClip169);
              if (isValidClip(destClip169)) {
                scene.clipPath169 = destClip169;
                scene.error = undefined;
              } else {
                scene.status = 'failed';
                scene.error = 'Google Flow returned an invalid or incomplete 16:9 video file.';
              }
            } catch (e: any) {
              scene.status = 'failed';
              scene.error = `Could not save 16:9 video: ${e.message}`;
            }
          } else if (!scene.clipPath169 && scene.status !== 'failed') {
            scene.status = 'failed';
            scene.error = 'Video download timed out or was rejected by Google Flow.';
          }
        }

        if (scene.status !== 'failed' && hasRequiredClip(scene)) {
          scene.status = 'completed';
          project.currentStageMessage = `Scene ${i + 1}/${totalScenes} ready.`;
        } else {
          project.currentStageMessage = `Scene ${i + 1}/${totalScenes} failed: ${scene.error}`;
        }

        ProjectManager.updateProject(project);
        onProgress(project);
      }

      // Check for pause
      if (!this.activeRuns.get(projectId)) return;

      const incompleteScenes = scenes.filter(scene => !hasRequiredClip(scene));
      if (incompleteScenes.length > 0) {
        const labels = incompleteScenes.map(scene => `Scene ${scene.sceneIndex + 1}`).join(', ');
        project.status = 'scenes_generating';
        project.progressPercent = 55;
        project.currentStageMessage = `Generation paused: ${labels} still need valid downloaded video clips. Retry those scenes before assembly.`;
        ProjectManager.updateProject(project);
        onProgress(project);
        return;
      }

      project.status = 'scenes_ready';
      project.progressPercent = 60;
      project.currentStageMessage = 'All scenes downloaded and verified. Starting video assembly...';
      ProjectManager.updateProject(project);
      onProgress(project);

      // ==========================================
      // STAGE 3: VIDEO ASSEMBLY (FFmpeg Engine)
      // ==========================================
      project.status = 'assembling';
      project.currentStageMessage = 'Stitching clips, applying transitions & burning subtitles...';
      ProjectManager.updateProject(project);
      onProgress(project);

      const assembleRes = await FFmpegEngine.assembleProject(projectId, (percent, msg) => {
        project.progressPercent = 60 + Math.floor(percent * 0.35);
        project.currentStageMessage = msg;
        ProjectManager.updateProject(project);
        onProgress(project);
      });

      if (!assembleRes.success) {
        throw new Error(assembleRes.error || 'Video assembly failed');
      }

      project.status = 'assembled';
      project.progressPercent = 100;
      project.currentStageMessage = 'Video assembled and ready for review!';
      ProjectManager.updateProject(project);
      onProgress(project);

      if (!this.activeRuns.get(projectId)) return;

      // ==========================================
      // STAGE 4: SOCIAL MEDIA PUBLISHING (Meta)
      // ==========================================
      if (project.autoPublish) {
        project.status = 'publishing';
        project.progressPercent = 95;
        project.currentStageMessage = 'Auto-publishing to Meta accounts...';
        ProjectManager.updateProject(project);
        onProgress(project);

        try {
          const publishResults = await MetaClient.publishProject(projectId, project.publishTargets);
          project.publishResults = publishResults;
          project.status = 'published';
          project.progressPercent = 100;
          project.currentStageMessage = 'Production and Publishing Complete! 🎉';
        } catch (publishErr: any) {
          console.warn('Auto-publishing error:', publishErr.message);
          project.status = 'assembled';
          project.progressPercent = 100;
          project.currentStageMessage = `Video assembled. Auto-publish failed: ${publishErr.message}`;
        }
      }

      ProjectManager.updateProject(project);
      onProgress(project);
    } catch (err: any) {
      console.error(`Pipeline error on project ${projectId}:`, err);
      project.status = 'failed';
      project.currentStageMessage = `Error: ${err.message}`;
      ProjectManager.updateProject(project);
      onProgress(project);
    } finally {
      this.activeRuns.delete(projectId);
    }
  }

  /**
   * Regenerates a single scene after failure, policy rejection, or prompt tweak.
   */
  public static async retryScene(
    projectId: string,
    sceneIndex: number,
    newPrompt?: string,
    onProgress?: (project: Project) => void
  ): Promise<{ success: boolean; error?: string }> {
    const project = ProjectManager.getProject(projectId);
    if (!project || !project.script) {
      return { success: false, error: 'Project or script not found' };
    }

    const scene = project.script.scenes.find(s => s.sceneIndex === sceneIndex);
    if (!scene) {
      return { success: false, error: `Scene ${sceneIndex} not found` };
    }

    if (newPrompt && newPrompt.trim()) {
      scene.visualPrompt = newPrompt.trim();
    }

    scene.status = 'generating';
    scene.error = undefined;

    // Delete existing clip files if any
    const projectDir = ProjectManager.getProjectAssetsDir(projectId);
    const scenesDir = path.join(projectDir, 'scenes');
    const destClip916 = path.join(scenesDir, `scene_${sceneIndex}_9_16.mp4`);
    const destClip169 = path.join(scenesDir, `scene_${sceneIndex}_16_9.mp4`);

    try {
      if (fs.existsSync(destClip916)) fs.unlinkSync(destClip916);
      if (fs.existsSync(destClip169)) fs.unlinkSync(destClip169);
    } catch (e) {
      // Ignore
    }
    scene.clipPath916 = undefined;
    scene.clipPath169 = undefined;

    project.currentStageMessage = `Regenerating Scene ${sceneIndex} in Google Flow...`;
    ProjectManager.updateProject(project);
    onProgress?.(project);

    try {
      const formats: Array<'9:16' | '16:9'> =
        project.format === 'both' ? ['9:16', '16:9'] : [project.format];
      const validClip = (filePath?: string): filePath is string =>
        !!filePath && fs.existsSync(filePath) && fs.statSync(filePath).size > 50000;

      for (const aspectRatio of formats) {
        const res = await FlowClient.generateScene({
          prompt: scene.visualPrompt,
          type: scene.model === 'nano-banana-pro' ? 'image' : 'video',
          aspectRatio,
          durationSeconds: scene.durationSeconds,
          model: scene.model,
          folder: projectId,
          index: sceneIndex,
          inputImage: scene.referenceImage,
        });

        if (res.status === 'failed' || res.id.startsWith('err_')) {
          throw new Error(res.error || `Google Flow rejected ${aspectRatio} prompt`);
        }

        let sourceClip = res.filePath;
        if (!sourceClip && res.id) {
          sourceClip = await FlowClient.waitForJob(
            res.id,
            stage => {
              project.currentStageMessage = `Scene ${sceneIndex} (${aspectRatio}): Google Flow is ${stage}...`;
              onProgress?.(project);
            },
            4,
            { folder: projectId, index: sceneIndex }
          );
        }

        if (!validClip(sourceClip)) {
          throw new Error(`Google Flow did not download a valid ${aspectRatio} video.`);
        }

        const dest = aspectRatio === '16:9' ? destClip169 : destClip916;
        fs.copyFileSync(sourceClip, dest);
        if (!validClip(dest)) {
          throw new Error(`The downloaded ${aspectRatio} video could not be saved completely.`);
        }
        if (aspectRatio === '16:9') scene.clipPath169 = dest;
        else scene.clipPath916 = dest;
      }

      scene.status = 'completed';
      scene.error = undefined;
      const needs916 = project.format === '9:16' || project.format === 'both';
      const needs169 = project.format === '16:9' || project.format === 'both';
      const allScenesComplete = project.script.scenes.every(item =>
        (!needs916 || validClip(item.clipPath916)) && (!needs169 || validClip(item.clipPath169))
      );
      project.status = allScenesComplete ? 'scenes_ready' : 'scenes_generating';
      project.currentStageMessage = allScenesComplete
        ? `Scene ${sceneIndex} regenerated successfully. All required clips are ready for assembly.`
        : `Scene ${sceneIndex} regenerated successfully. Other scenes still need valid downloaded clips.`;
      ProjectManager.updateProject(project);
      onProgress?.(project);
      return { success: true };
    } catch (err: any) {
      scene.status = 'failed';
      scene.error = err.message;
      project.currentStageMessage = `Scene ${sceneIndex} error: ${err.message}`;
      ProjectManager.updateProject(project);
      onProgress?.(project);
      return { success: false, error: err.message };
    }
  }

  public static pause(projectId: string, onProgress?: (project: Project) => void): void {
    this.activeRuns.set(projectId, false);
    const project = ProjectManager.getProject(projectId);
    if (project) {
      project.status = 'paused';
      project.currentStageMessage = 'Video generation paused by user. Click Resume to continue.';
      ProjectManager.updateProject(project);
      onProgress?.(project);
    }
  }

  public static async resume(
    projectId: string,
    onProgress: (project: Project) => void
  ): Promise<void> {
    return this.startSceneGeneration(projectId, onProgress);
  }

  public static cancel(projectId: string): { success: boolean } {
    this.activeRuns.delete(projectId);
    const project = ProjectManager.getProject(projectId);
    if (project) {
      project.status = 'idle';
      project.currentStageMessage = 'Pipeline cancelled';
      ProjectManager.updateProject(project);
    }
    return { success: true };
  }
}
