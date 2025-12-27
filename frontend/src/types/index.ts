// 分析数据接口
export interface AnalysisData {
  [key: string]: string;
}

// Cesium Viewer 的 ref 接口
export interface CesiumViewerRef {
  loadTileset: (url: string) => void;
}

// Cesium Viewer Handles 接口
export interface CesiumViewerHandles {
  loadTileset: (url: string) => void;
}

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

