import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import type { Project, VideoScript, VideoFormat, PublishTargets } from '../shared/types';
import type { FlowStatus, FlowJobRequest, FlowJobResult } from '../shared/flow-types';
import type { MetaConnectionStatus } from '../shared/meta-types';

export const electronAPI = {
  // System & Window
  snapSideBySide: (): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SNAP_SIDE_BY_SIDE),
  openPath: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_PATH, filePath),
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, url),
  selectImages: (): Promise<string[]> =>
    ipcRenderer.invoke(IPC_CHANNELS.SYSTEM_SELECT_IMAGES),

  // Theme
  theme: {
    get: (): Promise<{ theme: string; shouldUseDarkColors: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.THEME_GET),
    set: (theme: 'dark' | 'light' | 'system'): Promise<{ success: boolean; theme: string; shouldUseDarkColors: boolean }> =>
      ipcRenderer.invoke(IPC_CHANNELS.THEME_SET, theme),
    onChange: (callback: (data: { theme: string; shouldUseDarkColors: boolean }) => void) => {
      const sub = (_e: unknown, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.THEME_CHANGED, sub);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.THEME_CHANGED, sub);
    },
  },

  // Flow Connector
  flow: {
    getStatus: (): Promise<FlowStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOW_GET_STATUS),
    triggerDoctor: (): Promise<{ output: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOW_TRIGGER_DOCTOR),
    generateScene: (request: FlowJobRequest): Promise<FlowJobResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.FLOW_GENERATE_SCENE, request),
    onStatusChange: (callback: (status: FlowStatus) => void) => {
      const subscription = (_event: unknown, status: FlowStatus) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.FLOW_STATUS_CHANGED, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.FLOW_STATUS_CHANGED, subscription);
    },
  },

  // AGY CLI Scriptwriter
  agy: {
    generateScript: (
      topic: string,
      format: VideoFormat,
      referenceImages?: string[]
    ): Promise<VideoScript> =>
      ipcRenderer.invoke(IPC_CHANNELS.AGY_GENERATE_SCRIPT, { topic, format, referenceImages }),
    testConnection: (): Promise<{ success: boolean; version?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.AGY_TEST_CONNECTION),
  },

  // Video Assembly
  video: {
    assemble: (projectId: string): Promise<{ success: boolean; output916?: string; output169?: string; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.VIDEO_ASSEMBLE, projectId),
    onProgress: (callback: (data: { projectId: string; percent: number; message: string }) => void) => {
      const subscription = (_event: unknown, data: any) => callback(data);
      ipcRenderer.on(IPC_CHANNELS.VIDEO_ASSEMBLY_PROGRESS, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.VIDEO_ASSEMBLY_PROGRESS, subscription);
    },
  },

  // Meta Suite (Instagram, Facebook, WhatsApp)
  meta: {
    startOAuth: (): Promise<MetaConnectionStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.META_START_OAUTH),
    saveDirectToken: (token: string): Promise<MetaConnectionStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.META_SAVE_DIRECT_TOKEN, token),
    getStatus: (): Promise<MetaConnectionStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.META_GET_STATUS),
    selectPage: (pageId: string): Promise<MetaConnectionStatus> =>
      ipcRenderer.invoke(IPC_CHANNELS.META_SELECT_PAGE, pageId),
    publish: (projectId: string, targets: PublishTargets): Promise<any> =>
      ipcRenderer.invoke(IPC_CHANNELS.META_PUBLISH, { projectId, targets }),
    logout: (): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.META_LOGOUT),
    onStatusChange: (callback: (status: MetaConnectionStatus) => void) => {
      const subscription = (_event: unknown, status: MetaConnectionStatus) => callback(status);
      ipcRenderer.on(IPC_CHANNELS.META_STATUS_CHANGED, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.META_STATUS_CHANGED, subscription);
    },
  },

  // Projects & Pipeline
  projects: {
    create: (
      topic: string,
      format: VideoFormat,
      publishTargets: PublishTargets,
      referenceImages?: string[],
      autoPublish?: boolean
    ): Promise<Project> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_CREATE, {
        topic,
        format,
        publishTargets,
        referenceImages,
        autoPublish,
      }),
    getAll: (): Promise<Project[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET_ALL),
    get: (id: string): Promise<Project | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_GET, id),
    update: (project: Project): Promise<Project> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_UPDATE, project),
    delete: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PROJECT_DELETE, id),
    startPipeline: (id: string): Promise<{ success: boolean; message?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_START, id),
    startScenes: (id: string): Promise<{ success: boolean; message?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_START_SCENES, id),
    retryScene: (
      projectId: string,
      sceneIndex: number,
      newPrompt?: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_RETRY_SCENE, { projectId, sceneIndex, newPrompt }),
    pausePipeline: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_PAUSE, id),
    resumePipeline: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_RESUME, id),
    cancelPipeline: (id: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.PIPELINE_CANCEL, id),
    onProgress: (callback: (project: Project) => void) => {
      const subscription = (_event: unknown, project: Project) => callback(project);
      ipcRenderer.on(IPC_CHANNELS.PIPELINE_PROGRESS, subscription);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.PIPELINE_PROGRESS, subscription);
    },
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
export type ElectronAPI = typeof electronAPI;
