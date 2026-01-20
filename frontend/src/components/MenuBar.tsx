import { useEffect, useState } from 'react';
import type { CesiumViewerRef } from '../types';
import InstancingTool from './menu/InstancingTool';
import TilesLoader from './menu/TilesLoader';
import SettingsPanel from './menu/SettingsPanel';
import LayerController from './layerManage/layerController';
import './MenuBar.css';


interface MenuBarProps {
  cesiumViewerRef: React.RefObject<CesiumViewerRef | null>;
}

type MenuItem = 'instancing' | 'tiles' | 'settings' | null;

/**
 * 顶部菜单栏组件
 * 包含多个功能菜单项
 */
function MenuBar({ cesiumViewerRef }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<MenuItem>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isLayerManagerOpen, setIsLayerManagerOpen] = useState(false);
  const [debugShowBoundingVolume, setDebugShowBoundingVolume] = useState(true);
  const [debugColorizeTiles, setDebugColorizeTiles] = useState(true);

  const handleMenuClick = (menu: MenuItem) => {
    if (activeMenu === menu) {
      // 关闭当前面板
      setIsClosing(true);
      setTimeout(() => {
        setActiveMenu(null);
        setIsClosing(false);
      }, 300); // 等待动画完成
    } else {
      // 打开新面板
      setActiveMenu(menu);
      setIsClosing(false);
    }
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveMenu(null);
      setIsClosing(false);
    }, 300); // 等待动画完成
  };

  const handleToggleBoundingVolume = (enabled: boolean) => {
    setDebugShowBoundingVolume(enabled);
    cesiumViewerRef.current?.setTilesetDebugOptions({
      debugShowBoundingVolume: enabled,
    });
  };

  const handleToggleColorizeTiles = (enabled: boolean) => {
    setDebugColorizeTiles(enabled);
    cesiumViewerRef.current?.setTilesetDebugOptions({
      debugColorizeTiles: enabled,
    });
  };

  useEffect(() => {
    cesiumViewerRef.current?.setTilesetDebugOptions({
      debugShowBoundingVolume,
      debugColorizeTiles,
    });
  }, [debugShowBoundingVolume, debugColorizeTiles, cesiumViewerRef]);

  const getPanelTitle = () => {
    if (activeMenu === 'instancing') return 'Instancing Tool';
    if (activeMenu === 'tiles') return 'Add 3D Tiles';
    return 'Settings';
  };

  return (
    <>
      {/* 顶部菜单栏 */}
      <div className="menu-bar">
        <div className="menu-bar-header">
          <h1 className="menu-bar-title">Gltf Instancing Tool</h1>
          <div className="menu-bar-actions">
            <button
              className={`menu-button ${activeMenu === 'instancing' ? 'active' : ''}`}
              onClick={() => handleMenuClick('instancing')}
            >
              Instancing Tool
            </button>
            <button
              className={`menu-button ${activeMenu === 'tiles' ? 'active' : ''}`}
              onClick={() => handleMenuClick('tiles')}
            >
              Add 3D Tiles
            </button>
            <button
              className={`menu-button ${activeMenu === 'settings' ? 'active' : ''}`}
              onClick={() => handleMenuClick('settings')}
            >
              Settings
            </button>
            <button
              className={`menu-button ${isLayerManagerOpen ? 'active' : ''}`}
              onClick={() => setIsLayerManagerOpen(!isLayerManagerOpen)}
            >
              Layer Manager
            </button>
          </div>
        </div>
      </div>

      {/* 右侧菜单内容面板 */}
      {activeMenu && (
        <div className={`menu-panel ${isClosing ? 'closing' : ''}`}>
          <div className="menu-panel-header">
            <h2 className="menu-panel-title">
              {getPanelTitle()}
            </h2>
            <button
              className="menu-panel-close"
              onClick={handleClose}
              aria-label="Close panel"
            >
              ×
            </button>
          </div>
          <div className="menu-panel-content">
            {activeMenu === 'instancing' && (
              <InstancingTool cesiumViewerRef={cesiumViewerRef} />
            )}
            {activeMenu === 'tiles' && (
              <TilesLoader cesiumViewerRef={cesiumViewerRef} />
            )}
            {activeMenu === 'settings' && (
              <SettingsPanel
                debugShowBoundingVolume={debugShowBoundingVolume}
                debugColorizeTiles={debugColorizeTiles}
                onToggleBoundingVolume={handleToggleBoundingVolume}
                onToggleColorizeTiles={handleToggleColorizeTiles}
              />
            )}
          </div>
        </div>
      )}

      {/* 图层管理器悬浮窗口 */}
      <LayerController
        cesiumViewerRef={cesiumViewerRef}
        isOpen={isLayerManagerOpen}
        onClose={() => setIsLayerManagerOpen(false)}
      />
    </>
  );
}

export default MenuBar;

