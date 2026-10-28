import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { Project } from '../../shared/types';
import type { MetaTokens } from '../../shared/meta-types';

export interface AppSchema {
  projects: Record<string, Project>;
  metaTokens: MetaTokens;
  settings: {
    metaAppId: string;
    metaAppSecret: string;
    ffmpegPath: string;
    flowModel: string;
    defaultFormat: string;
    autoPublish: boolean;
    whatsappPhoneNumberId?: string;
  };
}

class JsonStore {
  public path: string;
  private data: any;
  private lastMtimeMs: number = 0;

  constructor() {
    let userDataDir = '';
    try {
      userDataDir = (typeof app !== 'undefined' && app && typeof app.getPath === 'function')
        ? app.getPath('userData')
        : path.join(process.env.HOME || '', 'Library/Application Support/auto-video-generator');
    } catch {
      userDataDir = path.join(process.env.HOME || '', 'Library/Application Support/auto-video-generator');
    }

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    this.path = path.join(userDataDir, 'config.json');
    this.data = this.loadDefaults();
    this.reloadFromDisk();

    if (!fs.existsSync(this.path)) {
      this.save();
    }
  }

  private reloadFromDisk() {
    if (fs.existsSync(this.path)) {
      try {
        const stats = fs.statSync(this.path);
        if (stats.mtimeMs > this.lastMtimeMs) {
          const fileContent = fs.readFileSync(this.path, 'utf-8');
          this.data = { ...this.loadDefaults(), ...JSON.parse(fileContent) };
          this.lastMtimeMs = stats.mtimeMs;
        }
      } catch (e) {
        console.error('Failed to parse config.json, resetting to defaults', e);
      }
    }
  }

  private loadDefaults(): AppSchema {
    return {
      projects: {},
      metaTokens: {},
      settings: {
        metaAppId: process.env.META_APP_ID || '',
        metaAppSecret: process.env.META_APP_SECRET || '',
        ffmpegPath: '/Users/geniussau/.local/bin/ffmpeg',
        flowModel: 'veo-3.1-fast',
        defaultFormat: 'both',
        autoPublish: true,
      },
    };
  }

  private save() {
    try {
      fs.writeFileSync(this.path, JSON.stringify(this.data, null, 2), 'utf-8');
      const stats = fs.statSync(this.path);
      this.lastMtimeMs = stats.mtimeMs;
    } catch (e) {
      console.error('Failed to write store to disk:', e);
    }
  }

  public get<T = any>(keyPath: string, defaultValue?: T): T {
    this.reloadFromDisk();
    const keys = keyPath.split('.');
    let current = this.data;

    for (const key of keys) {
      if (current === undefined || current === null) return defaultValue as T;
      current = current[key];
    }

    return current !== undefined ? (current as T) : (defaultValue as T);
  }

  public set(keyPath: string, value: any): void {
    const keys = keyPath.split('.');
    let current = this.data;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    this.save();
  }

  public delete(keyPath: string): void {
    const keys = keyPath.split('.');
    let current = this.data;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) return;
      current = current[key];
    }

    delete current[keys[keys.length - 1]];
    this.save();
  }
}

export const store = new JsonStore();
