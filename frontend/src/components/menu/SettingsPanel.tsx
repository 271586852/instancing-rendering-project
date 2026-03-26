import type { ChangeEvent } from 'react';

interface SettingsPanelProps {
  debugShowBoundingVolume: boolean;
  debugColorizeTiles: boolean;
  debugShowGeometricError: boolean;
  debugShowRenderingStatistics: boolean;
  debugShowMemoryUsage: boolean;
  onToggleBoundingVolume: (enabled: boolean) => void;
  onToggleColorizeTiles: (enabled: boolean) => void;
  onToggleGeometricError: (enabled: boolean) => void;
  onToggleRenderingStatistics: (enabled: boolean) => void;
  onToggleMemoryUsage: (enabled: boolean) => void;
  screenSpaceError: number;
  onChangeScreenSpaceError: (value: number) => void;
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
  performanceStatsEnabled: boolean;
  onTogglePerformanceStats: (enabled: boolean) => void;
  onExportPerformanceStats: () => void;
  onExportPerformanceChart: () => void;
  onExportPerformanceComparisonChart: () => void;
  isCameraPathRecording: boolean;
  isCameraPathPlaying: boolean;
  cameraPathPointCount: number;
  cameraPathDurationSeconds: number;
  onStartCameraPathRecording: () => void;
  onStopCameraPathRecording: () => void;
  onStartCameraPathPlayback: () => void;
  onStopCameraPathPlayback: () => void;
  onClearCameraPath: () => void;
}

function SettingsPanel({
  debugShowBoundingVolume,
  debugColorizeTiles,
  debugShowGeometricError,
  debugShowRenderingStatistics,
  debugShowMemoryUsage,
  onToggleBoundingVolume,
  onToggleColorizeTiles,
  onToggleGeometricError,
  onToggleRenderingStatistics,
  onToggleMemoryUsage,
  screenSpaceError,
  onChangeScreenSpaceError,
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
  performanceStatsEnabled,
  onTogglePerformanceStats,
  onExportPerformanceStats,
  onExportPerformanceChart,
  onExportPerformanceComparisonChart,
  isCameraPathRecording,
  isCameraPathPlaying,
  cameraPathPointCount,
  cameraPathDurationSeconds,
  onStartCameraPathRecording,
  onStopCameraPathRecording,
  onStartCameraPathPlayback,
  onStopCameraPathPlayback,
  onClearCameraPath,
}: SettingsPanelProps) {
  const handleBoundingVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleBoundingVolume(event.target.checked);
  };

  const handleColorizeTilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleColorizeTiles(event.target.checked);
  };

  const handleGeometricErrorChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleGeometricError(event.target.checked);
  };

  const handleRenderingStatisticsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleRenderingStatistics(event.target.checked);
  };

  const handleMemoryUsageChange = (event: ChangeEvent<HTMLInputElement>) => {
    onToggleMemoryUsage(event.target.checked);
  };

  const handleScreenSpaceErrorRange = (event: ChangeEvent<HTMLInputElement>) => {
    onChangeScreenSpaceError(Number(event.target.value));
  };

  const handleScreenSpaceErrorInput = (event: ChangeEvent<HTMLInputElement>) => {
    onChangeScreenSpaceError(Number(event.target.value));
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

  const handlePerformanceStatsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onTogglePerformanceStats(event.target.checked);
  };

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h3>Viewer Settings</h3>
        <p className="settings-description">Apply to loaded and newly loaded 3D Tiles.</p>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Show Bounding Volume</div>
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
          <div className="setting-title">Colorize Tiles</div>
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
          <div className="setting-title">Show Geometric Error</div>
          <div className="setting-subtitle">tileset.debugShowGeometricError</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={debugShowGeometricError}
            onChange={handleGeometricErrorChange}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Rendering Statistics</div>
          <div className="setting-subtitle">tileset.debugShowRenderingStatistics</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={debugShowRenderingStatistics}
            onChange={handleRenderingStatisticsChange}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Memory Statistics</div>
          <div className="setting-subtitle">tileset.debugShowMemoryUsage</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={debugShowMemoryUsage}
            onChange={handleMemoryUsageChange}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item setting-item-column">
        <div className="setting-text">
          <div className="setting-title">LOD Strictness</div>
          <div className="setting-subtitle">tileset.maximumScreenSpaceError</div>
        </div>
        <div className="slider-row">
          <input
            className="range-input"
            type="range"
            min={1}
            max={64}
            step={1}
            value={screenSpaceError}
            onChange={handleScreenSpaceErrorRange}
          />
          <input
            className="number-input"
            type="number"
            min={1}
            max={64}
            step={1}
            value={screenSpaceError}
            onChange={handleScreenSpaceErrorInput}
          />
        </div>
        <div className="setting-subtitle">
          Smaller values are stricter and more detailed. Larger values are faster.
        </div>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Performance Panel</div>
          <div className="setting-subtitle">Show FPS / FrameTime / DrawCalls charts</div>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={performanceStatsEnabled}
            onChange={handlePerformanceStatsChange}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Export Performance Data</div>
          <div className="setting-subtitle">Last 60s: FrameTime / FPS / DrawCalls / Triangles</div>
        </div>
        <div className="export-button-row">
          <button
            className="export-button"
            type="button"
            onClick={onExportPerformanceStats}
            disabled={!performanceStatsEnabled}
          >
            Export CSV
          </button>
          <button
            className="export-button"
            type="button"
            onClick={onExportPerformanceChart}
            disabled={!performanceStatsEnabled}
          >
            Export Chart
          </button>
          <button
            className="export-button"
            type="button"
            onClick={onExportPerformanceComparisonChart}
          >
            CSV Compare HTML
          </button>
        </div>
      </div>

      <div className="setting-item setting-item-column">
        <div className="setting-text">
          <div className="setting-title">Camera Roaming Path</div>
          <div className="setting-subtitle">
            Points: {cameraPathPointCount} | Duration: {cameraPathDurationSeconds.toFixed(1)}s
          </div>
          <div className="setting-subtitle">
            Status: {isCameraPathRecording ? 'Recording' : isCameraPathPlaying ? 'Playing' : 'Idle'}
          </div>
        </div>
        <div className="export-button-row camera-path-button-row">
          <button
            className="export-button"
            type="button"
            onClick={onStartCameraPathRecording}
            disabled={isCameraPathRecording || isCameraPathPlaying}
          >
            Start Record
          </button>
          <button
            className="export-button"
            type="button"
            onClick={onStopCameraPathRecording}
            disabled={!isCameraPathRecording}
          >
            Stop & Save
          </button>
          <button
            className="export-button"
            type="button"
            onClick={onStartCameraPathPlayback}
            disabled={isCameraPathRecording || isCameraPathPlaying || cameraPathPointCount < 2}
          >
            Start Roam
          </button>
          <button
            className="export-button"
            type="button"
            onClick={onStopCameraPathPlayback}
            disabled={!isCameraPathPlaying}
          >
            Stop Roam
          </button>
          <button
            className="export-button"
            type="button"
            onClick={onClearCameraPath}
            disabled={isCameraPathRecording || isCameraPathPlaying || cameraPathPointCount === 0}
          >
            Clear Path
          </button>
        </div>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Show Globe Surface</div>
          <div className="setting-subtitle">viewer.scene.globe.show</div>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={showGlobe} onChange={handleShowGlobeChange} />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Depth Test Against Terrain</div>
          <div className="setting-subtitle">viewer.scene.globe.depthTestAgainstTerrain</div>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={depthTestAgainstTerrain} onChange={handleDepthTestChange} />
          <span className="toggle-slider" />
        </label>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Translation (m)</div>
          <div className="setting-subtitle">3D Tiles model translation</div>
          <div className="translation-inputs">
            <label>
              X
              <input type="number" value={translation.x} onChange={handleTranslationInput('x')} />
            </label>
            <label>
              Y
              <input type="number" value={translation.y} onChange={handleTranslationInput('y')} />
            </label>
            <label>
              Z
              <input type="number" value={translation.z} onChange={handleTranslationInput('z')} />
            </label>
          </div>
        </div>
      </div>

      <div className="setting-item">
        <div className="setting-text">
          <div className="setting-title">Rotation (deg)</div>
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
          <div className="setting-title">Scale</div>
          <div className="setting-subtitle">Uniform scaling factor</div>
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
          Apply Transform
        </button>
      </div>
    </div>
  );
}

export default SettingsPanel;
