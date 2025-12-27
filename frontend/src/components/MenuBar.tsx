import { useState } from 'react';
import type { CesiumViewerRef } from '../types';
import InstancingTool from './menu/InstancingTool';
import TilesLoader from './menu/TilesLoader';
import './MenuBar.css';

interface MenuBarProps {
  cesiumViewerRef: React.RefObject<CesiumViewerRef | null>;
}

type MenuItem = 'instancing' | 'tiles' | null;

/**
 * 顶部菜单栏组件
 * 包含多个功能菜单项
 */
function MenuBar({ cesiumViewerRef }: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<MenuItem>(null);
  const [isClosing, setIsClosing] = useState(false);

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
          </div>
        </div>
      </div>

      {/* 右侧菜单内容面板 */}
      {activeMenu && (
        <div className={`menu-panel ${isClosing ? 'closing' : ''}`}>
          <div className="menu-panel-header">
            <h2 className="menu-panel-title">
              {activeMenu === 'instancing' ? 'Instancing Tool' : 'Add 3D Tiles'}
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
          </div>
        </div>
      )}
    </>
  );
}

export default MenuBar;

