export type VideoFormat = '9:16' | '16:9' | 'both';

export type PipelineStage =
  | 'idle'
  | 'script_generating'
  | 'script_ready'
  | 'scenes_generating'
  | 'scenes_ready'
  | 'assembling'
  | 'assembled'
  | 'publishing'
  | 'published'
  | 'paused'
  | 'failed';

export interface SceneDefinition {
  sceneIndex: number;
  durationSeconds: 4 | 6 | 8 | 10;
  model: 'veo-3.1-fast' | 'veo-3.1-quality' | 'omni-flash' | 'nano-banana-pro';
  visualPrompt: string;
  narrationOrSubtitle: string;
  transition: 'fade' | 'dissolve' | 'wipeleft' | 'circlecrop';
  transitionDuration: number;
  // Optional reference image/asset for this scene
  referenceImage?: string;
  // Generated assets
  clipPath916?: string;
  clipPath169?: string;
  thumbnailPath?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

export interface VideoScript {
  title: string;
  synopsis: string;
  targetDurationSeconds: number;
  caption: string;
  hashtags: string[];
  scenes: SceneDefinition[];
}

export interface PublishTargets {
  instagramReels: boolean;
  facebookReels: boolean;
  facebookPageVideo: boolean;
  whatsappStatus: boolean;
  whatsappBroadcast: boolean;
}

export interface PublishResult {
  platform: 'instagram' | 'facebook' | 'whatsapp';
  status: 'success' | 'failed';
  url?: string;
  postId?: string;
  error?: string;
  publishedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  topic: string;
  format: VideoFormat;
  script?: VideoScript;
  referenceImages?: string[];
  publishTargets: PublishTargets;
  autoPublish?: boolean;
  status: PipelineStage;
  progressPercent: number;
  currentStageMessage: string;
  // Output paths
  outputVideo916?: string;
  outputVideo169?: string;
  thumbnailPath?: string;
  publishResults: PublishResult[];
  createdAt: string;
  updatedAt: string;
}
