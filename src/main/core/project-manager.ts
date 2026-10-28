import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { store } from './store';
import type { Project, VideoFormat, PublishTargets } from '../../shared/types';

export class ProjectManager {
  private static getProjectsDir(): string {
    const basePath = app?.getPath
      ? app.getPath('userData')
      : path.join(process.env.HOME || '', 'Library/Application Support/auto-video-generator');
    const dir = path.join(basePath, 'projects');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public static getProjectAssetsDir(projectId: string): string {
    const dir = path.join(this.getProjectsDir(), projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  public static createProject(
    topic: string,
    format: VideoFormat,
    publishTargets: PublishTargets,
    referenceImages?: string[],
    autoPublish: boolean = false
  ): Project {
    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Create a clean title from the first non-empty line of the script/topic
    const firstLine =
      topic
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)[0] || topic;
    const cleanTitle = firstLine.replace(/^#+\s*/, '').replace(/^(topic|title|script):\s*/i, '');
    const title = cleanTitle.length > 50 ? cleanTitle.slice(0, 47) + '...' : cleanTitle;

    // Process reference images (local paths or base64 data URLs)
    const savedImages: string[] = [];
    if (referenceImages && referenceImages.length > 0) {
      const imgDir = path.join(this.getProjectAssetsDir(id), 'images');
      if (!fs.existsSync(imgDir)) {
        fs.mkdirSync(imgDir, { recursive: true });
      }

      referenceImages.forEach((img, idx) => {
        try {
          if (img.startsWith('data:image/')) {
            const matches = img.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
            if (matches) {
              const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
              const dest = path.join(imgDir, `asset_${idx + 1}.${ext}`);
              fs.writeFileSync(dest, Buffer.from(matches[2], 'base64'));
              savedImages.push(dest);
            }
          } else if (fs.existsSync(img)) {
            const ext = path.extname(img) || '.jpg';
            const dest = path.join(imgDir, `asset_${idx + 1}${ext}`);
            fs.copyFileSync(img, dest);
            savedImages.push(dest);
          }
        } catch (e) {
          console.error(`Failed to save reference image ${idx}:`, e);
        }
      });
    }

    const newProject: Project = {
      id,
      title,
      topic,
      format,
      referenceImages: savedImages,
      publishTargets,
      autoPublish,
      status: 'idle',
      progressPercent: 0,
      currentStageMessage: 'Project created, ready to start',
      publishResults: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Ensure assets directory exists
    this.getProjectAssetsDir(id);

    // Save to store
    const projects = store.get<Record<string, Project>>('projects', {});
    projects[id] = newProject;
    store.set('projects', projects);

    return newProject;
  }

  public static getAllProjects(): Project[] {
    const projects = store.get<Record<string, Project>>('projects', {});

    // Discover any project folders on disk not yet in store
    try {
      const projectsDir = this.getProjectsDir();
      if (fs.existsSync(projectsDir)) {
        const folders = fs.readdirSync(projectsDir);
        for (const folder of folders) {
          if (!projects[folder] && folder.startsWith('proj_')) {
            const restored = this.restoreProjectFromDisk(folder);
            if (restored) {
              projects[folder] = restored;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error discovering projects on disk:', e);
    }

    return Object.values(projects).sort(
      (a: Project, b: Project) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public static getProject(id: string): Project | null {
    const projects = store.get<Record<string, Project>>('projects', {});
    if (projects[id]) return projects[id];

    return this.restoreProjectFromDisk(id);
  }

  private static restoreProjectFromDisk(id: string): Project | null {
    const assetsDir = path.join(this.getProjectsDir(), id);
    const scriptPath = path.join(assetsDir, 'script.json');
    if (fs.existsSync(scriptPath)) {
      try {
        const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
        const output916 = path.join(assetsDir, 'output_9_16.mp4');
        const output169 = path.join(assetsDir, 'output_16_9.mp4');
        const has916 = fs.existsSync(output916);
        const has169 = fs.existsSync(output169);

        // Check scene clips on disk
        const scenesDir = path.join(assetsDir, 'scenes');
        if (fs.existsSync(scenesDir) && script.scenes) {
          script.scenes.forEach((s: any, idx: number) => {
            const clip916 = path.join(scenesDir, `scene_${idx + 1}_9_16.mp4`);
            const clip169 = path.join(scenesDir, `scene_${idx + 1}_16_9.mp4`);
            if (fs.existsSync(clip916)) s.clipPath916 = clip916;
            if (fs.existsSync(clip169)) s.clipPath169 = clip169;
          });
        }

        const restored: Project = {
          id,
          title: script.title || id,
          topic: script.synopsis || script.title || id,
          format: has169 && has916 ? 'both' : (has169 ? '16:9' : '9:16'),
          referenceImages: [],
          publishTargets: {
            instagramReels: true,
            facebookReels: true,
            facebookPageVideo: false,
            whatsappStatus: false,
            whatsappBroadcast: false,
          },
          autoPublish: false,
          status: has916 || has169 ? 'assembled' : 'idle',
          progressPercent: has916 || has169 ? 100 : 0,
          currentStageMessage: has916 || has169 ? 'Video assembled and ready for review!' : 'Ready',
          script,
          outputVideo916: has916 ? output916 : undefined,
          outputVideo169: has169 ? output169 : undefined,
          thumbnailPath: path.join(assetsDir, 'thumbnail.jpg'),
          publishResults: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const projects = store.get<Record<string, Project>>('projects', {});
        projects[id] = restored;
        store.set('projects', projects);
        return restored;
      } catch (e) {
        console.error(`Failed to restore project ${id} from disk:`, e);
      }
    }
    return null;
  }

  public static updateProject(project: Project): Project {
    project.updatedAt = new Date().toISOString();
    const projects = store.get<Record<string, Project>>('projects', {});
    projects[project.id] = project;
    store.set('projects', projects);
    return project;
  }

  public static deleteProject(id: string): void {
    const projects = store.get<Record<string, Project>>('projects', {});
    delete projects[id];
    store.set('projects', projects);

    // Cleanup asset directory
    try {
      const dir = path.join(this.getProjectsDir(), id);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (err) {
      console.error(`Failed to delete project folder ${id}:`, err);
    }
  }
}
