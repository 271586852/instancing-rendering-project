// frontend/src/types.ts

export interface AnalysisData {
  [key: string]: string;
}

export interface TilesetLayerInfo {
  id: string;
  name: string;
  url: string;
  show: boolean;
}

export interface TilesetDebugOptions {
  debugShowBoundingVolume?: boolean;
  debugColorizeTiles?: boolean;
  debugShowGeometricError?: boolean;
  debugShowRenderingStatistics?: boolean;
  debugShowMemoryUsage?: boolean;
}

export interface GlobeOptions {
  showGlobe?: boolean;
  depthTestAgainstTerrain?: boolean;
}

export interface TilesetTransformOptions {
  translation?: {
    x: number;
    y: number;
    z: number;
  };
  rotation?: {
    headingDeg: number;
    pitchDeg: number;
    rollDeg: number;
  };
  scale?: number;
}

export interface CameraPathStatus {
  isRecording: boolean;
  isPlaying: boolean;
  pathPointCount: number;
  durationSeconds: number;
}

export interface CesiumViewerHandles {
  loadTileset: (url: string) => Promise<void>;
  getTilesetLayers: () => TilesetLayerInfo[];
  removeTileset: (id: string) => void;
  toggleTilesetVisibility: (id: string, show: boolean) => void;
  setLayerName: (id: string, name: string) => void;
  flyToTileset: (id: string) => void;
  setTilesetDebugOptions: (options: TilesetDebugOptions) => void;
  setGlobeOptions: (options: GlobeOptions) => void;
  setTilesetTransform: (options: TilesetTransformOptions) => void;
  setTilesetTransformForLayer: (id: string, options: TilesetTransformOptions) => void;
  setTilesetScreenSpaceError: (value: number) => void;
  exportPerformanceStats: () => boolean;
  exportPerformanceChart: () => boolean;
  exportPerformanceComparisonChart: () => boolean;
  startCameraPathRecording: () => boolean;
  stopCameraPathRecording: () => boolean;
  startCameraPathPlayback: (speedMultiplier?: number) => boolean;
  stopCameraPathPlayback: () => void;
  clearCameraPath: () => void;
  getCameraPathStatus: () => CameraPathStatus;
}

export type CesiumViewerRef = CesiumViewerHandles;

export interface FileUploadProps {
  onUploadSuccess: (url: string, data: AnalysisData | null) => void;
  setInfoMessage: (message: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

export interface ErrorResponseData {
  error: string;
  logs?: {
    stdout: string;
    stderr: string;
  };
}

export interface ProcessRequestParams {
  model: File;
  tolerance: number;
  instanceLimit: number;
  mergeAllGlb?: boolean;
  meshSegmentation?: boolean;
}

export interface ProcessResponse {
  tilesetUrl: string;
  analysis: AnalysisData | null;
}
