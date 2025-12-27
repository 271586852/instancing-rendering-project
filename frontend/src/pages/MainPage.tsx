import { useRef } from 'react';
import CesiumViewer from '../components/cesium/CesiumViewer';
import InstancingPanel from '../components/InstancingPanel';
import type { CesiumViewerRef } from '../types';
import '../App.css';

/**
 * 主页面组件
 * Cesium 视图作为主视图，Instancing 面板作为覆盖层
 */
function MainPage() {
  const cesiumViewerRef = useRef<CesiumViewerRef>(null);

  return (
    <div className="main-page">
      {/* Cesium 视图作为主视图，全屏显示 */}
      <div className="cesium-viewport">
        <CesiumViewer ref={cesiumViewerRef} />
      </div>
      
      {/* Instancing 面板作为覆盖层 */}
      <InstancingPanel cesiumViewerRef={cesiumViewerRef} />
    </div>
  );
}

export default MainPage;

