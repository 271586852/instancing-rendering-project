import type { ChangeEvent } from 'react';

interface SettingsPanelProps {
  debugShowBoundingVolume: boolean;
  debugColorizeTiles: boolean;
  onToggleBoundingVolume: (enabled: boolean) => void;
  onToggleColorizeTiles: (enabled: boolean) => void;
  showGlobe: boolean;
  depthTestAgainstTerrain: boolean;
  onToggleShowGlobe: (enabled: boolean) => void;
  onToggleDepthTest: (enabled: boolean) => void;
}

function SettingsPanel({
  debugShowBoundingVolume,
  debugColorizeTiles,
  onToggleBoundingVolume,
  onToggleColorizeTiles,
  showGlobe,
  depthTestAgainstTerrain,
  onToggleShowGlobe,
  onToggleDepthTest,
}: SettingsPanelProps) {
  const handleBoundingVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleBoundingVolume(event.target.checked);
  };

  const handleColorizeTilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleColorizeTiles(event.target.checked);
  };

  const handleShowGlobeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleShowGlobe(event.target.checked);
  };

  const handleDepthTestChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleDepthTest(event.target.checked);
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>调试选项</h3>
        <p className="settings-description">对已加载及后续加载的 3D Tiles 生效。</p>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">显示包围盒</div>
          <div className="setting-subtitle">tileset.debugShowBoundingVolume</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={debugShowBoundingVolume}
            onChange={handleBoundingVolumeChange}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">按瓦片上色</div>
          <div className="setting-subtitle">tileset.debugColorizeTiles</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={debugColorizeTiles}
            onChange={handleColorizeTilesChange}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">显示地球表面</div>
          <div className="setting-subtitle">viewer.scene.globe.show</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={showGlobe}
            onChange={handleShowGlobeChange}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">地形深度测试</div>
          <div className="setting-subtitle">viewer.scene.globe.depthTestAgainstTerrain</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={depthTestAgainstTerrain}
            onChange={handleDepthTestChange}
          />
          <span className="toggle-slider" />
        </label>
      </div>
    </div>
  );
}

export default SettingsPanel;


