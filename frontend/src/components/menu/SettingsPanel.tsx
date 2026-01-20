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
  translation: { x: string; y: string; z: string };
  onChangeTranslation: (axis: 'x' | 'y' | 'z', value: string) => void;
  onApplyTransform: () => void;
  rotation: { headingDeg: string; pitchDeg: string; rollDeg: string };
  onChangeRotation: (
    axis: 'headingDeg' | 'pitchDeg' | 'rollDeg',
    value: string
  ) => void;
  scale: string;
  onChangeScale: (value: string) => void;
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
  translation,
  onChangeTranslation,
  onApplyTransform,
  rotation,
  onChangeRotation,
  scale,
  onChangeScale,
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

  const handleTranslationInput =
    (axis: 'x' | 'y' | 'z') => (event: ChangeEvent<HTMLInputElement>) => {
      onChangeTranslation(axis, event.target.value);
    };

  const handleRotationInput =
    (axis: 'headingDeg' | 'pitchDeg' | 'rollDeg') =>
    (event: ChangeEvent<HTMLInputElement>) => {
      onChangeRotation(axis, event.target.value);
    };

  const handleScaleInput = (event: ChangeEvent<HTMLInputElement>) => {
    onChangeScale(event.target.value);
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

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">位置偏移 (米)</div>
          <div className="setting-subtitle">3D Tiles 模型平移</div>
          <div className="translation-inputs">
            <label>
              X
              <input
                type="number"
                value={translation.x}
                onChange={handleTranslationInput('x')}
              />
            </label>
            <label>
              Y
              <input
                type="number"
                value={translation.y}
                onChange={handleTranslationInput('y')}
              />
            </label>
            <label>
              Z
              <input
                type="number"
                value={translation.z}
                onChange={handleTranslationInput('z')}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">旋转 (度)</div>
          <div className="setting-subtitle">Heading / Pitch / Roll</div>
          <div className="translation-inputs">
            <label>
              Heading
              <input
                type="number"
                value={rotation.headingDeg}
                onChange={handleRotationInput('headingDeg')}
              />
            </label>
            <label>
              Pitch
              <input
                type="number"
                value={rotation.pitchDeg}
                onChange={handleRotationInput('pitchDeg')}
              />
            </label>
            <label>
              Roll
              <input
                type="number"
                value={rotation.rollDeg}
                onChange={handleRotationInput('rollDeg')}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">缩放</div>
          <div className="setting-subtitle">均匀缩放系数</div>
          <div className="translation-inputs">
            <label>
              Scale
              <input type="number" step="0.01" value={scale} onChange={handleScaleInput} />
            </label>
          </div>
        </div>
      </div>

      <div className="transform-apply-row">
        <button className="transform-apply-btn" onClick={onApplyTransform}>
          应用变换
        </button>
      </div>
    </div>
  );
}

export default SettingsPanel;


