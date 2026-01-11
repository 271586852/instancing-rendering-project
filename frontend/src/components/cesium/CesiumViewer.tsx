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

/**
 * Cesium 3D 可视化组件
 * 组合了场景初始化和性能监控功能
 */
const CesiumViewer = forwardRef<CesiumViewerHandles, CesiumViewerProps>(
  ({ showPerformanceStats = true, performanceStatsPosition }, ref) => {
    const cesiumContainerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<Viewer | null>(null);
    const [viewer, setViewer] = useState<Viewer | null>(null);

    // 当 Viewer 准备好时的回调
    const handleViewerReady = useCallback((viewerInstance: Viewer) => {
      viewerRef.current = viewerInstance;
      setViewer(viewerInstance);
    }, []);

    // 通过 ref 暴露的方法
    useImperativeHandle(ref, () => ({
      loadTileset: async (url: string) => {
        const viewerInstance = viewerRef.current;
        if (viewerInstance) {
          // 移除所有现有的 tilesets
          viewerInstance.scene.primitives.removeAll();

          try {
            const tileset = await Cesium3DTileset.fromUrl(url);
            // 开启统计信息，这样 PerformanceStats 组件才能显示
            (tileset as any).debugShowStatistics = true;
            viewerInstance.scene.primitives.add(tileset);

            // 自动缩放到新加载的 tileset
            await viewerInstance.zoomTo(tileset);
          } catch (error) {
            console.error(`Error loading tileset: ${error}`);
            throw error; // 重新抛出错误，让调用者处理
          }
        }
      },

      getTilesetLayers: (): TilesetLayerInfo[] => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance || !viewerInstance.scene) {
          return [];
        }

        const layers: TilesetLayerInfo[] = [];
        const primitives = viewerInstance.scene.primitives;

        // 遍历 primitives 集合，找出所有 Cesium3DTileset 实例
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const url = (primitive as any).url || '';
            const name = url.split('/').pop() || 'Untitled Tileset';
            
            layers.push({
              id: `${url}_${i}`, // 使用 URL 和索引生成唯一 ID
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
        if (!viewerInstance) {
          return;
        }

        const primitives = viewerInstance.scene.primitives;
        
        // 遍历 primitives，找到匹配 ID 的 tileset 并移除
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const url = (primitive as any).url || '';
            const layerId = `${url}_${i}`;
            
            if (layerId === id) {
              primitives.remove(primitive);
              break;
            }
          }
        }
      },

      toggleTilesetVisibility: (id: string, show: boolean) => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance) {
          return;
        }

        const primitives = viewerInstance.scene.primitives;
        
        // 遍历 primitives，找到匹配 ID 的 tileset 并切换显示状态
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const url = (primitive as any).url || '';
            const layerId = `${url}_${i}`;
            
            if (layerId === id) {
              primitive.show = show;
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

