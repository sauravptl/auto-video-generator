export const IPC_CHANNELS = {
  // Window & System
  WINDOW_SNAP_SIDE_BY_SIDE: 'window:snap-side-by-side',
  SYSTEM_OPEN_PATH: 'system:open-path',
  SYSTEM_OPEN_EXTERNAL: 'system:open-external',
  SYSTEM_SELECT_IMAGES: 'system:select-images',

  // Flow Connector
  FLOW_GET_STATUS: 'flow:get-status',
  FLOW_TRIGGER_DOCTOR: 'flow:trigger-doctor',
  FLOW_GENERATE_SCENE: 'flow:generate-scene',
  FLOW_STATUS_CHANGED: 'flow:status-changed',

  // AGY CLI
  AGY_GENERATE_SCRIPT: 'agy:generate-script',
  AGY_TEST_CONNECTION: 'agy:test-connection',

  // Video Assembly
  VIDEO_ASSEMBLE: 'video:assemble',
  VIDEO_ASSEMBLY_PROGRESS: 'video:assembly-progress',

  // Meta Suite
  META_START_OAUTH: 'meta:start-oauth',
  META_SAVE_DIRECT_TOKEN: 'meta:save-direct-token',
  META_GET_STATUS: 'meta:get-status',
  META_SELECT_PAGE: 'meta:select-page',
  META_PUBLISH: 'meta:publish',
  META_LOGOUT: 'meta:logout',
  META_STATUS_CHANGED: 'meta:status-changed',

  // Projects & Pipeline
  PROJECT_CREATE: 'project:create',
  PROJECT_GET_ALL: 'project:get-all',
  PROJECT_GET: 'project:get',
  PROJECT_UPDATE: 'project:update',
  PROJECT_DELETE: 'project:delete',
  PIPELINE_START: 'pipeline:start',
  PIPELINE_START_SCENES: 'pipeline:start-scenes',
  PIPELINE_RETRY_SCENE: 'pipeline:retry-scene',
  PIPELINE_PAUSE: 'pipeline:pause',
  PIPELINE_RESUME: 'pipeline:resume',
  PIPELINE_CANCEL: 'pipeline:cancel',
  PIPELINE_PROGRESS: 'pipeline:progress',
} as const;
