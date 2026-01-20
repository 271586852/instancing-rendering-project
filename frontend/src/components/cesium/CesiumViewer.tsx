import { useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Viewer, Cesium3DTileset } from 'cesium';
import { CesiumScene } from './CesiumScene';
import { PerformanceStats } from './PerformanceStats';
import type {
  CesiumViewerHandles,
  GlobeOptions,
  TilesetDebugOptions,
  TilesetLayerInfo,
} from '../../types';

type NamedTileset = Cesium3DTileset & {
  customName?: string;
  url?: string;
  debugShowStatistics?: boolean;
};

interface CesiumViewerProps {
  showPerformanceStats?: boolean;
  performanceStatsPosition?: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
}

const CesiumViewer = forwardRef<CesiumViewerHandles, CesiumViewerProps>(
  ({ showPerformanceStats = true, performanceStatsPosition }, ref) => {
    const cesiumContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);
    const [viewer, setViewer] = useState<Viewer | null>(null);
    const debugOptionsRef = useRef<TilesetDebugOptions>({
      debugShowBoundingVolume: true,
      debugColorizeTiles: true,
    });
    const globeOptionsRef = useRef<GlobeOptions>({
      showGlobe: true,
      depthTestAgainstTerrain: true,
    });

    const handleViewerReady = useCallback((viewerInstance: Viewer) => {
      viewerRef.current = viewerInstance;
      setViewer(viewerInstance);
      applyGlobeOptions();
    }, []);

    const applyDebugOptionsToTileset = (tileset: NamedTileset) => {
      tileset.debugShowBoundingVolume = !!debugOptionsRef.current.debugShowBoundingVolume;
      tileset.debugColorizeTiles = !!debugOptionsRef.current.debugColorizeTiles;
    };

    const applyGlobeOptions = () => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;
      const globe = viewerInstance.scene?.globe;
      if (!globe) return;
      globe.show = globeOptionsRef.current.showGlobe ?? true;
      globe.depthTestAgainstTerrain = globeOptionsRef.current.depthTestAgainstTerrain ?? true;
    };

    const applyDebugOptionsToAllTilesets = () => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;
      const { primitives } = viewerInstance.scene;
      for (let i = 0; i < primitives.length; i++) {
        const primitive = primitives.get(i);
        if (primitive instanceof Cesium3DTileset) {
          applyDebugOptionsToTileset(primitive);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      loadTileset: async (url: string) => {
        const viewerInstance = viewerRef.current;
        if (viewerInstance && !viewerInstance.isDestroyed()) {
          try {
            const tileset = (await Cesium3DTileset.fromUrl(url)) as NamedTileset;
            tileset.debugShowStatistics = true;
            tileset.customName = url.split('/').pop() || 'Untitled Tileset';
            applyDebugOptionsToTileset(tileset);
            viewerInstance.scene.primitives.add(tileset);
            await viewerInstance.zoomTo(tileset);
          } catch (error) {
            console.error(`Error loading tileset: ${error}`);
            throw error;
          }
        }
      },

      getTilesetLayers: (): TilesetLayerInfo[] => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance || viewerInstance.isDestroyed() || !viewerInstance.scene) return [];
        
        const layers: TilesetLayerInfo[] = [];
        const primitives = viewerInstance.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const tileset = primitive as NamedTileset;
            const url = tileset.url || '';
            const name = tileset.customName || url.split('/').pop() || 'Untitled Tileset';
            layers.push({
              id: `${url}_${i}`,
              name: name,
              url: url,
              show: primitive.show,
            });
          }
        }
        return layers;
      },

      removeTileset: (id: string) => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance || viewerInstance.isDestroyed()) return;
        const primitives = viewerInstance.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const tileset = primitive as NamedTileset;
            const url = tileset.url || '';
            if (`${url}_${i}` === id) {
              primitives.remove(primitive);
              break;
            }
          }
        }
      },

      toggleTilesetVisibility: (id: string, show: boolean) => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance || viewerInstance.isDestroyed()) return;
        const primitives = viewerInstance.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const tileset = primitive as NamedTileset;
            const url = tileset.url || '';
            if (`${url}_${i}` === id) {
              primitive.show = show;
              break;
            }
          }
        }
      },

      setLayerName: (id: string, name: string) => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance) return;
        const primitives = viewerInstance.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const tileset = primitive as NamedTileset;
            const url = tileset.url || '';
            if (`${url}_${i}` === id) {
              tileset.customName = name;
              break;
            }
          }
        }
      },

      flyToTileset: (id: string) => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance) return;
        const primitives = viewerInstance.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const tileset = primitive as NamedTileset;
            const url = tileset.url || '';
            if (`${url}_${i}` === id) {
              viewerInstance.zoomTo(primitive);
              break;
            }
          }
        }
      },

      setTilesetDebugOptions: (options: TilesetDebugOptions) => {
        debugOptionsRef.current = {
          ...debugOptionsRef.current,
          ...options,
        };
        applyDebugOptionsToAllTilesets();
      },

      setGlobeOptions: (options: GlobeOptions) => {
        globeOptionsRef.current = {
          ...globeOptionsRef.current,
          ...options,
        };
        applyGlobeOptions();
      },
    }));

    return (
      <div className="cesium-container" ref={cesiumContainerRef}>
        <CesiumScene
          containerRef={cesiumContainerRef}
          onViewerReady={handleViewerReady}
        />
        {showPerformanceStats && viewer && (
          <PerformanceStats
            viewer={viewer}
            containerRef={cesiumContainerRef}
            position={performanceStatsPosition || { bottom: '10px', left: '10px' }}
          />
        )}
      </div>
    );
  }
);

CesiumViewer.displayName = 'CesiumViewer';

export default CesiumViewer;
