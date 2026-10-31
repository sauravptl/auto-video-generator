import { app, BrowserWindow, ipcMain, shell, dialog, protocol, net, nativeTheme, nativeImage } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { ProjectManager } from './core/project-manager';
import { WindowManager } from './integrations/flow/window-manager';
import { FlowClient } from './integrations/flow/flow-client';
import { FlowPoller } from './integrations/flow/flow-poller';
import { AgyClient } from './integrations/agy/agy-client';
import { FFmpegEngine } from './integrations/ffmpeg/ffmpeg-engine';
import { MetaClient } from './integrations/meta/meta-client';
import { PipelineOrchestrator } from './core/pipeline-orchestrator';
import { SettingsService } from './core/settings-service';
import { migrateLegacyPlaintextSecrets } from './core/migrate';
import { ScriptProviderService } from './core/script-provider-service';

// Register privileged custom schemes
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;
let flowPoller: FlowPoller | null = null;

const isDev = !app.isPackaged;

/**
 * Electron GUI processes do not inherit the user's interactive shell PATH on macOS.
 * Resolve the common Node/local binary locations once so flow-auto, agy, and ffmpeg
 * work identically in development and in the packaged application.
 */
function initEnvironmentPaths() {
  const home = process.env.HOME || '';
  const nvmRoot = path.join(home, '.nvm', 'versions', 'node');
  const nvmBins = fs.existsSync(nvmRoot)
    ? fs
        .readdirSync(nvmRoot, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(nvmRoot, entry.name, 'bin'))
    : [];
  const extraPaths = [
    ...nvmBins,
    path.join(home, '.local', 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ];
  process.env.PATH = Array.from(new Set([...extraPaths, ...(process.env.PATH || '').split(path.delimiter)]))
    .filter(Boolean)
    .join(path.delimiter);
}

initEnvironmentPaths();

function createWindow() {
  const iconPath = path.join(__dirname, '../renderer/icon.png');
  let appIcon: Electron.NativeImage | undefined;
  if (fs.existsSync(iconPath)) {
    try {
      appIcon = nativeImage.createFromPath(iconPath);
      if (process.platform === 'darwin' && app.dock) {
        app.dock.setIcon(appIcon);
      }
    } catch (e) {
      console.error('Failed to set native app icon:', e);
    }
  }

  mainWindow = new BrowserWindow({
    title: 'CineFlow AI',
    ...(appIcon ? { icon: appIcon } : {}),
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#090a0f' : '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadURL('app://cineflow/index.html');
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start polling Flow status and broadcast to renderer
  if (flowPoller) {
    flowPoller.stop();
  }
  flowPoller = new FlowPoller(status => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.FLOW_STATUS_CHANGED, status);
    }
  });
  flowPoller.start();
}

app.whenReady().then(() => {
  migrateLegacyPlaintextSecrets();

  // Protocol handler for serving static Next.js production build offline
  protocol.handle('app', (request) => {
    try {
      const url = new URL(request.url);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === '/' || !pathname) {
        pathname = '/index.html';
      }
      const rendererDir = path.join(__dirname, '../renderer');
      let filePath = path.join(rendererDir, pathname.replace(/^\//, ''));
      if (!fs.existsSync(filePath) && fs.existsSync(`${filePath}.html`)) {
        filePath = `${filePath}.html`;
      }
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err: any) {
      console.error('Failed to handle app protocol request:', err);
      return new Response('Not found', { status: 404 });
    }
  });

  // Protocol handler for streaming local video and image files with HTTP 206 range support
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url);
      let rawPath = decodeURIComponent(url.pathname);
      if (url.host) {
        rawPath = `/${url.host}${rawPath}`;
      }
      const fileUrl = pathToFileURL(rawPath).toString();
      return net.fetch(fileUrl);
    } catch (err: any) {
      console.error('Failed to stream media protocol request:', err);
      return new Response('Media load error', { status: 500 });
    }
  });

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (flowPoller) {
    flowPoller.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function registerIpcHandlers() {
  // System & Window
  ipcMain.handle(IPC_CHANNELS.WINDOW_SNAP_SIDE_BY_SIDE, async () => {
    if (!mainWindow) return { success: false, message: 'Window not found' };
    return WindowManager.snapSideBySide(mainWindow);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_PATH, async (_event, filePath: string) => {
    await shell.openPath(filePath);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_OPEN_EXTERNAL, async (_event, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_SELECT_IMAGES, async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Reference Images / Assets for Video',
      buttonLabel: 'Select Images',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
      ],
    });
    return result.canceled ? [] : result.filePaths;
  });

  // Native Theme Controls
  ipcMain.handle(IPC_CHANNELS.THEME_GET, async () => {
    return {
      theme: nativeTheme.themeSource,
      shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    };
  });

  ipcMain.handle(IPC_CHANNELS.THEME_SET, async (_event, theme: 'dark' | 'light' | 'system') => {
    nativeTheme.themeSource = theme;
    const isDark = nativeTheme.shouldUseDarkColors;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBackgroundColor(isDark ? '#090a0f' : '#f8fafc');
    }
    return { success: true, theme, shouldUseDarkColors: isDark };
  });

  // Listen to OS theme changes when user chooses system mode
  nativeTheme.on('updated', () => {
    if (nativeTheme.themeSource === 'system' && mainWindow && !mainWindow.isDestroyed()) {
      const isDark = nativeTheme.shouldUseDarkColors;
      mainWindow.setBackgroundColor(isDark ? '#090a0f' : '#f8fafc');
      mainWindow.webContents.send(IPC_CHANNELS.THEME_CHANGED, {
        theme: 'system',
        shouldUseDarkColors: isDark,
      });
    }
  });

  // Flow Connector
  ipcMain.handle(IPC_CHANNELS.FLOW_GET_STATUS, async () => {
    return FlowClient.getStatus();
  });

  ipcMain.handle(IPC_CHANNELS.FLOW_TRIGGER_DOCTOR, async () => {
    return FlowClient.runDoctor();
  });

  ipcMain.handle(IPC_CHANNELS.FLOW_GENERATE_SCENE, async (_event, req) => {
    return FlowClient.generateScene(req);
  });

  // AGY CLI
  ipcMain.handle(IPC_CHANNELS.AGY_GENERATE_SCRIPT, async (_event, { topic, format, referenceImages }) => {
    return AgyClient.generateScript(topic, format, referenceImages);
  });

  ipcMain.handle(IPC_CHANNELS.AGY_TEST_CONNECTION, async () => {
    return AgyClient.testConnection();
  });

  // Settings and script providers. Secrets are write-only and never cross IPC back to the renderer.
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async () => SettingsService.getSnapshot());
  ipcMain.handle(IPC_CHANNELS.SETTINGS_SAVE, async (_event, update) => SettingsService.save(update));
  ipcMain.handle(IPC_CHANNELS.SCRIPT_PROVIDERS_LIST, async () => ScriptProviderService.listConfigured());
  ipcMain.handle(IPC_CHANNELS.SCRIPT_PROVIDER_TEST, async (_event, providerId: string) => ScriptProviderService.test(providerId));

  // Video Assembly
  ipcMain.handle(IPC_CHANNELS.VIDEO_ASSEMBLE, async (_event, projectId: string) => {
    return FFmpegEngine.assembleProject(projectId, (percent, message) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.VIDEO_ASSEMBLY_PROGRESS, {
          projectId,
          percent,
          message,
        });
      }
    });
  });

  // Helper to broadcast Meta status change to all renderer windows
  const broadcastMetaStatus = (status: any) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.META_STATUS_CHANGED, status);
    }
  };

  // Meta Suite
  ipcMain.handle(IPC_CHANNELS.META_START_OAUTH, async () => {
    const status = await MetaClient.startOAuth();
    broadcastMetaStatus(status);
    return status;
  });

  ipcMain.handle(IPC_CHANNELS.META_SAVE_DIRECT_TOKEN, async (_event, token: string) => {
    const status = await MetaClient.saveDirectToken(token);
    broadcastMetaStatus(status);
    return status;
  });

  ipcMain.handle(IPC_CHANNELS.META_GET_STATUS, async () => {
    return MetaClient.getConnectionStatus();
  });

  ipcMain.handle(IPC_CHANNELS.META_SELECT_PAGE, async (_event, pageId: string) => {
    const status = await MetaClient.selectPage(pageId);
    broadcastMetaStatus(status);
    return status;
  });

  ipcMain.handle(IPC_CHANNELS.META_PUBLISH, async (_event, { projectId, targets }) => {
    return MetaClient.publishProject(projectId, targets);
  });

  ipcMain.handle(IPC_CHANNELS.META_LOGOUT, async () => {
    await MetaClient.logout();
    const status = await MetaClient.getConnectionStatus();
    broadcastMetaStatus(status);
    return status;
  });

  // Projects & Pipeline
  ipcMain.handle(
    IPC_CHANNELS.PROJECT_CREATE,
    async (_event, { topic, format, publishTargets, referenceImages, autoPublish, scriptProviderId }) => {
      return ProjectManager.createProject(topic, format, publishTargets, referenceImages, autoPublish, scriptProviderId);
    }
  );

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_ALL, async () => {
    return ProjectManager.getAllProjects();
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET, async (_event, id: string) => {
    return ProjectManager.getProject(id);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_UPDATE, async (_event, project) => {
    return ProjectManager.updateProject(project);
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, async (_event, id: string) => {
    return ProjectManager.deleteProject(id);
  });

  // Pipeline Orchestration
  ipcMain.handle(IPC_CHANNELS.PIPELINE_START, async (_event, id: string) => {
    const project = ProjectManager.getProject(id);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }

    // Run pipeline asynchronously in background so IPC reply returns immediately
    PipelineOrchestrator.start(id, updatedProject => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.PIPELINE_PROGRESS, updatedProject);
      }
    }).catch((err: any) => {
      console.error(`Pipeline error for project ${id}:`, err);
    });

    return { success: true, message: 'Pipeline started' };
  });

  ipcMain.handle(IPC_CHANNELS.PIPELINE_START_SCENES, async (_event, id: string) => {
    const project = ProjectManager.getProject(id);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }

    PipelineOrchestrator.startSceneGeneration(id, updatedProject => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.PIPELINE_PROGRESS, updatedProject);
      }
    }).catch((err: any) => {
      console.error(`Pipeline scene generation error for project ${id}:`, err);
    });

    return { success: true, message: 'Scene generation started' };
  });

  ipcMain.handle(IPC_CHANNELS.PIPELINE_RETRY_SCENE, async (_event, { projectId, sceneIndex, newPrompt }: { projectId: string; sceneIndex: number; newPrompt?: string }) => {
    return PipelineOrchestrator.retryScene(projectId, sceneIndex, newPrompt, updatedProject => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.PIPELINE_PROGRESS, updatedProject);
      }
    });
  });

  ipcMain.handle(IPC_CHANNELS.PIPELINE_PAUSE, async (_event, id: string) => {
    PipelineOrchestrator.pause(id, updatedProject => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.PIPELINE_PROGRESS, updatedProject);
      }
    });
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.PIPELINE_RESUME, async (_event, id: string) => {
    PipelineOrchestrator.resume(id, updatedProject => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.PIPELINE_PROGRESS, updatedProject);
      }
    }).catch((err: any) => {
      console.error(`Pipeline resume error for project ${id}:`, err);
    });

    return { success: true, message: 'Pipeline resumed' };
  });

  ipcMain.handle(IPC_CHANNELS.PIPELINE_CANCEL, async (_event, id: string) => {
    return PipelineOrchestrator.cancel(id);
  });
}
