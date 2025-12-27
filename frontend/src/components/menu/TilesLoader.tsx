import { useState } from 'react';
import type { CesiumViewerRef } from '../../types';

interface TilesLoaderProps {
  cesiumViewerRef: React.RefObject<CesiumViewerRef | null>;
}

/**
 * 3D Tiles 加载器组件
 * 允许用户输入 URL 加载 3D Tiles
 */
function TilesLoader({ cesiumViewerRef }: TilesLoaderProps) {
  const [tilesUrl, setTilesUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLoadTiles = async () => {
    if (!tilesUrl.trim()) {
      setError('Please enter a valid tileset URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (cesiumViewerRef.current) {
        await cesiumViewerRef.current.loadTileset(tilesUrl.trim());
        setSuccess('3D Tiles loaded successfully!');
        setTilesUrl(''); // 清空输入框
      } else {
        setError('Cesium viewer is not ready');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load 3D Tiles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLoadTiles();
    }
  };

  return (
    <div className="tiles-loader">
      <h3>Load 3D Tiles</h3>
      <p className="tiles-loader-description">
        Enter a URL to a tileset.json file to load 3D Tiles into the viewer.
      </p>
      
      <div className="tiles-input-group">
        <input
          type="text"
          className="tiles-url-input"
          placeholder="https://example.com/tileset.json"
          value={tilesUrl}
          onChange={(e) => setTilesUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isLoading}
        />
        <button
          className="tiles-load-button"
          onClick={handleLoadTiles}
          disabled={isLoading || !tilesUrl.trim()}
        >
          {isLoading ? 'Loading...' : 'Load Tiles'}
        </button>
      </div>

      {error && (
        <div className="status-message error">{error}</div>
      )}

      {success && (
        <div className="status-message success">{success}</div>
      )}

      <div className="tiles-examples">
        <h4>Example URLs:</h4>
        <ul>
          <li>
            <code>http://localhost:8080/results/your-uuid/tileset.json</code>
          </li>
          <li>
            <code>https://assets.cesium.com/1/tilesets/Cesium3DTiles/Tileset/tileset.json</code>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default TilesLoader;

