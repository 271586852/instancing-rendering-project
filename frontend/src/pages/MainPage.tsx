import { useRef, useState } from 'react';
import CesiumViewer from '../components/cesium/CesiumViewer';
import MenuBar from '../components/MenuBar';
import type { CesiumViewerRef } from '../types';
import '../App.css';

/**
 * 主页面组件
 * Cesium 视图作为主视图，顶部菜单栏提供功能入口
 */
function MainPage() {
  const cesiumViewerRef = useRef<CesiumViewerRef>(null);
  const [performanceStatsEnabled, setPerformanceStatsEnabled] = useState(true);

  return (
    <div className="main-page">
      {/* 顶部菜单栏 */}
      <MenuBar
        cesiumViewerRef={cesiumViewerRef}
        performanceStatsEnabled={performanceStatsEnabled}
        onTogglePerformanceStats={setPerformanceStatsEnabled}
      />
      
      {/* Cesium 视图作为主视图，全屏显示 */}
      <div className="cesium-viewport">
        <CesiumViewer ref={cesiumViewerRef} showPerformanceStats={performanceStatsEnabled} />
      </div>
    </div>
  );
}

export default MainPage;

