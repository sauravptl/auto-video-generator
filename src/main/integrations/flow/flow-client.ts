import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { FlowStatus, FlowJobRequest, FlowJobResult } from '../../../shared/flow-types';

const execAsync = promisify(exec);

export class FlowClient {
  /**
   * Check flow-auto installation and live connection to Google Flow in Chrome
   */
  public static async getStatus(): Promise<FlowStatus> {
    const defaultStatus: FlowStatus = {
      isInstalled: false,
      bridgeStatus: 'unknown',
      extensionConnected: false,
      flowTabVisible: false,
      flowTabStatus: 'not_found',
      userPlan: 'free',
      dailyVideoLimit: 30,
      dailyVideosUsed: 0,
      lastChecked: new Date().toISOString(),
    };

    try {
      // 1. Check version
      const { stdout: versionOut } = await execAsync('flow-auto --version');
      defaultStatus.isInstalled = true;
      defaultStatus.version = versionOut.trim();

      // 2. Check status with site flow
      const { stdout: statusOut } = await execAsync('flow-auto status --site flow');
      const text = statusOut.toLowerCase();

      // Parse status output
      if (text.includes('extension (flow): connected') || text.includes('connected')) {
        defaultStatus.extensionConnected = true;
      }

      if (text.includes('flow tab: visible') || text.includes('tab: visible')) {
        defaultStatus.flowTabVisible = true;
        defaultStatus.flowTabStatus = 'visible';
      } else if (text.includes('flow tab: hidden') || text.includes('tab: hidden')) {
        defaultStatus.flowTabVisible = false;
        defaultStatus.flowTabStatus = 'hidden';
      } else if (text.includes('blocked')) {
        defaultStatus.flowTabStatus = 'blocked';
      }

      if (text.includes('bridge: up') || text.includes('bridge running')) {
        defaultStatus.bridgeStatus = 'up';
      } else {
        defaultStatus.bridgeStatus = 'down';
      }

      if (text.includes('pro')) {
        defaultStatus.userPlan = 'pro';
      }

      defaultStatus.lastChecked = new Date().toISOString();
      return defaultStatus;
    } catch (err: any) {
      // Command failed or CLI not installed
      defaultStatus.isInstalled = false;
      defaultStatus.bridgeStatus = 'down';
      defaultStatus.flowTabStatus = 'not_found';
      defaultStatus.lastChecked = new Date().toISOString();
      return defaultStatus;
    }
  }

  /**
   * Run doctor command to check bridge, extension, and tab visibility
   */
  public static async runDoctor(): Promise<{ output: string }> {
    try {
      const { stdout } = await execAsync('flow-auto doctor');
      return { output: stdout };
    } catch (err: any) {
      return { output: err.stdout || err.message };
    }
  }

  /**
   * Submit scene generation prompt to Google Flow via flow-connector
   */
  public static async generateScene(req: FlowJobRequest): Promise<FlowJobResult> {
    try {
      const promptEscaped = req.prompt.replace(/"/g, '\\"');
      const aspectRatio = req.aspectRatio || '9:16';
      const duration = req.durationSeconds || 6;
      const model = req.model || 'veo-3.1-fast';
      const hasImage = req.inputImage && fs.existsSync(req.inputImage);

      // Pick correct Flow mode:
      // - flow-text-to-video: no reference images allowed
      // - flow-ingredients-to-video: accepts --image refs (max 3 on veo, 7 on omni-flash)
      // - flow-text-to-image / flow-image-to-image: for image generation
      let mode: string;
      if (req.type === 'image') {
        mode = hasImage ? 'flow-image-to-image' : 'flow-text-to-image';
      } else {
        mode = hasImage ? 'flow-ingredients-to-video' : 'flow-text-to-video';
      }

      // Build flow-auto generate command
      let cmd = `flow-auto generate create ${mode} --prompt "${promptEscaped}" --aspect-ratio ${aspectRatio} --model ${model} --duration ${duration}`;
      if (req.folder) {
        cmd += ` --folder "${req.folder}"`;
      }
      if (req.index !== undefined) {
        const safeIndex = Math.max(1, req.index);
        cmd += ` --index ${safeIndex}`;
      }
      if (hasImage) {
        cmd += ` --image "${req.inputImage}"`;
      }

      console.log(`Executing Flow Command: ${cmd}`);
      const { stdout } = await execAsync(cmd);

      // Attempt to parse job ID or result path
      const matchJob = stdout.match(/job(?:\s+id)?[:\s]+([a-zA-Z0-9_-]+)/i);
      const matchPath = stdout.match(/(?:\/|[A-Za-z]:\\)[^\s"']+\.(?:mp4|mov|png|jpg)/i);

      const jobId = matchJob ? matchJob[1] : `job_${Date.now()}`;
      const filePath = matchPath ? matchPath[0] : undefined;

      return {
        id: jobId,
        status: filePath ? 'done' : 'generating',
        filePath,
      };
    } catch (err: any) {
      console.error('Error in flow-auto generate:', err);
      return {
        id: `err_${Date.now()}`,
        status: 'failed',
        error: err.message,
      };
    }
  }

  /**
   * Polls and waits for a Flow generation job to complete and download the video file
   */
  public static async waitForJob(
    jobId: string,
    onPoll?: (status: string) => void,
    timeoutMinutes: number = 10,
    checkFolder?: { folder: string; index: number }
  ): Promise<string | undefined> {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      // 1. Check if file is already in Downloads subfolder
      if (checkFolder) {
        const downloadsDir = `${process.env.HOME || ''}/Downloads/${checkFolder.folder}`;
        if (fs.existsSync(downloadsDir)) {
          try {
            const files = fs.readdirSync(downloadsDir);
            const prefix = `${checkFolder.index} - `;
            const matched = files.find(
              f =>
                (f.startsWith(prefix) ||
                  f.startsWith(`${checkFolder.index}_`) ||
                  f.startsWith(`scene_${checkFolder.index}`)) &&
                f.endsWith('.mp4')
            );
            if (matched) {
              const fullPath = `${downloadsDir}/${matched}`;
              const stat = fs.statSync(fullPath);
              if (stat.size > 50000) {
                console.log(`Found completed video in downloads: ${fullPath}`);
                return fullPath;
              }
            }
          } catch (e) {
            // Ignore readdir error
          }
        }
      }

      // 2. Poll flow-auto generate get <id> --json
      try {
        const { stdout } = await execAsync(`flow-auto generate get ${jobId} --json`);
        const data = JSON.parse(stdout);
        const stage = data.stage || data.status || 'generating';
        onPoll?.(stage);

        if (data.status === 'done') {
          if (data.files && data.files.length > 0) {
            const videoFile =
              data.files.find((f: any) => f.kind === 'video' || f.path?.endsWith('.mp4')) ||
              data.files[0];
            if (videoFile && fs.existsSync(videoFile.path)) {
              return videoFile.path;
            }
          }
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          console.warn(`Flow job ${jobId} ended with status: ${data.status}`);
          return undefined;
        }
      } catch (err) {
        // Keep polling
      }

      // Wait 3 seconds between polls
      await new Promise(r => setTimeout(r, 3000));
    }

    console.warn(`Flow job ${jobId} timed out after ${timeoutMinutes} minutes.`);
    return undefined;
  }
}
