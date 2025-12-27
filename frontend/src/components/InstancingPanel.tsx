import FileUpload from './FileUpload';
import { useInstancing } from '../hooks/useInstancing';
import { formatKey } from '../utils';
import { API_ENDPOINTS } from '../constants';
import type { CesiumViewerRef } from '../types';

interface InstancingPanelProps {
  cesiumViewerRef: React.RefObject<CesiumViewerRef | null>;
}

/**
 * Instancing 控制面板组件
 * 作为覆盖层显示在 Cesium 视图上
 */
function InstancingPanel({ cesiumViewerRef }: InstancingPanelProps) {
  const {
    isLoading,
    setIsLoading,
    infoMessage,
    setInfoMessage,
    errorMessage,
    setErrorMessage,
    analysisData,
    resultId,
    handleUploadSuccess,
  } = useInstancing();

  // 包装 handleUploadSuccess，添加加载 tileset 的逻辑
  const handleUploadSuccessWithRef = (url: string, data: any) => {
    handleUploadSuccess(url, data);
    // 使用传入的 ref 加载 tileset
    if (cesiumViewerRef.current) {
      cesiumViewerRef.current.loadTileset(url);
    }
  };

  return (
    <div className="instancing-panel">
      <div className="panel-header">
        <h1>Gltf Instancing Tool</h1>
      </div>
      
      <div className="panel-content">
        <FileUpload 
          onUploadSuccess={handleUploadSuccessWithRef}
          setInfoMessage={setInfoMessage}
          setErrorMessage={setErrorMessage}
          setIsLoading={setIsLoading}
        />

        <div className="status-section">
          <h2>Status</h2>
          {isLoading && <div className="loader"></div>}
          
          {infoMessage && !errorMessage && (
            <div className="status-message info">{infoMessage}</div>
          )}

          {errorMessage && (
            <div className="status-message error">{errorMessage}</div>
          )}
          
          {analysisData && (
            <div className="analysis-results">
              <h4>Analysis Results</h4>
              <ul>
                {Object.entries(analysisData).map(([key, value]) => (
                  <li key={key}>
                    <strong>{formatKey(key)}:</strong> {value}
                  </li>
                ))}
              </ul>
              {resultId && (
                <a 
                  href={API_ENDPOINTS.DOWNLOAD(resultId)} 
                  className="download-button"
                  download
                >
                  Download Results (.zip)
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstancingPanel;

