// frontend/src/types.ts

// 分析数据接口
export interface AnalysisData {
  [key: string]: string;
}

// 3D Tiles 图层信息接口
export interface TilesetLayerInfo {
  id: string;
  name: string;
  url: string;
  show: boolean;
}

// Tileset 调试开关
export interface TilesetDebugOptions {
  debugShowBoundingVolume?: boolean;
  debugColorizeTiles?: boolean;
}

// Globe 相关开关
export interface GlobeOptions {
  showGlobe?: boolean;
  depthTestAgainstTerrain?: boolean;
}

// Tileset 变换配置
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

// Cesium Viewer Handles 接口
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
}

// Cesium Viewer 的 ref 接口
export type CesiumViewerRef = CesiumViewerHandles;

// 文件上传组件的 Props
export interface FileUploadProps {
  onUploadSuccess: (url: string, data: AnalysisData | null) => void;
  setInfoMessage: (message: string | null) => void;
  setErrorMessage: (message: string | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

// 错误响应数据接口
export interface ErrorResponseData {
  error: string;
  logs?: {
    stdout: string;
    stderr: string;
  };
}

// 处理请求的参数接口
export interface ProcessRequestParams {
  model: File;
  tolerance: number;
  instanceLimit: number;
  mergeAllGlb?: boolean;
  meshSegmentation?: boolean;
}

// 处理响应接口
export interface ProcessResponse {
  tilesetUrl: string;
  analysis: AnalysisData | null;
}

