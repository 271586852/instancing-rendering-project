import type { ChangeEvent } from 'react';

interface SettingsPanelProps {
  debugShowBoundingVolume: boolean;
  debugColorizeTiles: boolean;
  onToggleBoundingVolume: (enabled: boolean) => void;
  onToggleColorizeTiles: (enabled: boolean) => void;
}

function SettingsPanel({
  debugShowBoundingVolume,
  debugColorizeTiles,
  onToggleBoundingVolume,
  onToggleColorizeTiles,
}: SettingsPanelProps) {
  const handleBoundingVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleBoundingVolume(event.target.checked);
  };

  const handleColorizeTilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleColorizeTiles(event.target.checked);
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
    </div>
  );
}

export default SettingsPanel;


