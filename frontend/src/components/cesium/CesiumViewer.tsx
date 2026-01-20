import { useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Viewer, Cesium3DTileset } from 'cesium';
import { CesiumScene } from './CesiumScene';
import { PerformanceStats } from './PerformanceStats';
import type { CesiumViewerHandles, TilesetLayerInfo } from '../../types';

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

    const handleViewerReady = useCallback((viewerInstance: Viewer) => {
      viewerRef.current = viewerInstance;
      setViewer(viewerInstance);
    }, []);

    useImperativeHandle(ref, () => ({
      loadTileset: async (url: string) => {
        const viewerInstance = viewerRef.current;
        if (viewerInstance) {
          try {
            const tileset: any = await Cesium3DTileset.fromUrl(url);
            tileset.debugShowStatistics = true;
            tileset.customName = url.split('/').pop() || 'Untitled Tileset';
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
        if (!viewerInstance || !viewerInstance.scene) return [];
        
        const layers: TilesetLayerInfo[] = [];
        const primitives = viewerInstance.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const url = (primitive as any).url || '';
            const name = (primitive as any).customName || url.split('/').pop() || 'Untitled Tileset';
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
        if (!viewerInstance) return;
        const primitives = viewerInstance.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const url = (primitive as any).url || '';
            if (`${url}_${i}` === id) {
              primitives.remove(primitive);
              break;
            }
          }
        }
      },

      toggleTilesetVisibility: (id: string, show: boolean) => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance) return;
        const primitives = viewerInstance.scene.primitives;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const url = (primitive as any).url || '';
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
            const url = (primitive as any).url || '';
            if (`${url}_${i}` === id) {
              (primitive as any).customName = name;
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
            const url = (primitive as any).url || '';
            if (`${url}_${i}` === id) {
              viewerInstance.zoomTo(primitive);
              break;
            }
          }
        }
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
