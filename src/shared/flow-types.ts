export interface FlowStatus {
  isInstalled: boolean;
  version?: string;
  bridgeStatus: 'up' | 'down' | 'unknown';
  extensionConnected: boolean;
  flowTabVisible: boolean;
  flowTabStatus: 'visible' | 'hidden' | 'blocked' | 'not_found';
  userPlan: 'free' | 'pro' | 'unknown';
  dailyVideoLimit?: number;
  dailyVideosUsed?: number;
  dailyImageLimit?: number;
  dailyImagesUsed?: number;
  /** Non-fatal diagnostic warning from flow-auto (for example, multiple browser sessions). */
  warning?: string;
  lastChecked: string;
}

export interface FlowJobRequest {
  prompt: string;
  type: 'video' | 'image';
  aspectRatio: '9:16' | '16:9';
  durationSeconds?: 4 | 6 | 8 | 10;
  model?: 'veo-3.1-fast' | 'veo-3.1-quality' | 'omni-flash' | 'nano-banana-pro';
  resolution?: '720p' | '360p';
  folder?: string;
  index?: number;
  inputImage?: string;
}

export interface FlowJobResult {
  id: string;
  status: 'pending' | 'generating' | 'done' | 'failed';
  filePath?: string;
  error?: string;
}
