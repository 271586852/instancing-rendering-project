// API 基础 URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// API 端点
export const API_ENDPOINTS = {
  PROCESS: `${API_BASE_URL}/api/process`,
  DOWNLOAD: (resultId: string) => `${API_BASE_URL}/api/download/${resultId}`,
} as const;

// 默认配置值
export const DEFAULT_CONFIG = {
  TOLERANCE: 0.0,
  INSTANCE_LIMIT: 2,
  MERGE_ALL_GLB: false,
  MESH_SEGMENTATION: false,
} as const;

// 默认消息
export const DEFAULT_MESSAGES = {
  WELCOME: 'Welcome! Please select a GLB model to begin.',
  UPLOADING: 'Uploading and processing... This may take a moment.',
  SUCCESS: 'Processing successful! Loading model...',
  NO_FILE: 'No file selected.',
  INVALID_FILE: 'Please select a .glb file.',
  NO_RESPONSE: 'No response from server. Is the backend running?',
} as const;

// 信息消息清除延迟（毫秒）
export const INFO_MESSAGE_CLEAR_DELAY = 3000;

