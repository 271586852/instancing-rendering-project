import { useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import {
  Viewer,
  Cesium3DTileset,
  Matrix4,
  Cartesian3,
  HeadingPitchRoll,
  Quaternion,
  TranslationRotationScale,
} from 'cesium';
import { CesiumScene } from './CesiumScene';
import { PerformanceStats } from './PerformanceStats';
import type {
  CesiumViewerHandles,
  GlobeOptions,
  TilesetTransformOptions,
  TilesetDebugOptions,
  TilesetLayerInfo,
} from '../../types';

type NamedTileset = Cesium3DTileset & {
  customName?: string;
  url?: string;
  debugShowStatistics?: boolean;
  debugShowGeometricError?: boolean;
  debugShowRenderingStatistics?: boolean;
  debugShowMemoryUsage?: boolean;
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
    const performanceExporterRef = useRef<{
      exportCsv: () => boolean;
      exportChart: () => boolean;
    } | null>(null);
    const debugOptionsRef = useRef<TilesetDebugOptions>({
      debugShowBoundingVolume: true,
      debugColorizeTiles: true,
      debugShowGeometricError: false,
      debugShowRenderingStatistics: false,
      debugShowMemoryUsage: false,
    });
    const screenSpaceErrorRef = useRef<number>(16);
    const globeOptionsRef = useRef<GlobeOptions>({
      showGlobe: true,
      depthTestAgainstTerrain: true,
    });
    const transformOptionsRef = useRef<TilesetTransformOptions>({
      translation: { x: 0, y: 0, z: 0 },
      rotation: { headingDeg: 0, pitchDeg: 0, rollDeg: 0 },
      scale: 1,
    });

    const handleViewerReady = useCallback((viewerInstance: Viewer) => {
      viewerRef.current = viewerInstance;
      setViewer(viewerInstance);
      applyGlobeOptions();
    }, []);

    const handleRegisterPerformanceExporter = useCallback(
      (
        exporter:
          | {
              exportCsv: () => boolean;
              exportChart: () => boolean;
            }
          | null
      ) => {
      performanceExporterRef.current = exporter;
    }, []);

    const applyDebugOptionsToTileset = (tileset: NamedTileset) => {
      tileset.debugShowBoundingVolume = !!debugOptionsRef.current.debugShowBoundingVolume;
      tileset.debugColorizeTiles = !!debugOptionsRef.current.debugColorizeTiles;
      tileset.debugShowGeometricError = !!debugOptionsRef.current.debugShowGeometricError;
      tileset.debugShowRenderingStatistics = !!debugOptionsRef.current.debugShowRenderingStatistics;
      tileset.debugShowMemoryUsage = !!debugOptionsRef.current.debugShowMemoryUsage;
    };

    const buildModelMatrix = (options: TilesetTransformOptions) => {
      const { translation, rotation, scale } = options;
      const trs = new TranslationRotationScale();
      if (translation) {
        trs.translation = new Cartesian3(translation.x, translation.y, translation.z);
      }
      if (rotation) {
        const hpr = new HeadingPitchRoll(
          (rotation.headingDeg * Math.PI) / 180,
          (rotation.pitchDeg * Math.PI) / 180,
          (rotation.rollDeg * Math.PI) / 180
        );
        trs.rotation = Quaternion.fromHeadingPitchRoll(hpr);
      }
      if (typeof scale === 'number') {
        trs.scale = new Cartesian3(scale, scale, scale);
      }
      return Matrix4.fromTranslationRotationScale(trs);
    };

    const applyTransformToTileset = (tileset: NamedTileset) => {
      const matrix = buildModelMatrix(transformOptionsRef.current);
      tileset.modelMatrix = matrix;
    };

    const applyScreenSpaceErrorToTileset = (tileset: NamedTileset) => {
      tileset.maximumScreenSpaceError = screenSpaceErrorRef.current;
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

    const applyTransformToAllTilesets = () => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;
      const { primitives } = viewerInstance.scene;
      for (let i = 0; i < primitives.length; i++) {
        const primitive = primitives.get(i);
        if (primitive instanceof Cesium3DTileset) {
          applyTransformToTileset(primitive);
        }
      }
    };

    const applyScreenSpaceErrorToAllTilesets = () => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;
      const { primitives } = viewerInstance.scene;
      for (let i = 0; i < primitives.length; i++) {
        const primitive = primitives.get(i);
        if (primitive instanceof Cesium3DTileset) {
          applyScreenSpaceErrorToTileset(primitive);
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
            applyTransformToTileset(tileset);
            applyScreenSpaceErrorToTileset(tileset);
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

      setTilesetTransform: (options: TilesetTransformOptions) => {
        transformOptionsRef.current = {
          ...transformOptionsRef.current,
          ...options,
        };
        applyTransformToAllTilesets();
      },

      setTilesetTransformForLayer: (id: string, options: TilesetTransformOptions) => {
        const viewerInstance = viewerRef.current;
        if (!viewerInstance || viewerInstance.isDestroyed()) return;
        const { primitives } = viewerInstance.scene;
        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (primitive instanceof Cesium3DTileset) {
            const tileset = primitive as NamedTileset;
            const url = tileset.url || '';
            if (`${url}_${i}` === id) {
              const matrix = buildModelMatrix({
                translation: options.translation ?? { x: 0, y: 0, z: 0 },
                rotation: options.rotation ?? { headingDeg: 0, pitchDeg: 0, rollDeg: 0 },
                scale: options.scale ?? 1,
              });
              tileset.modelMatrix = matrix;
              break;
            }
          }
        }
      },

      setTilesetScreenSpaceError: (value: number) => {
        screenSpaceErrorRef.current = value;
        applyScreenSpaceErrorToAllTilesets();
      },

      exportPerformanceStats: () => {
        const exporter = performanceExporterRef.current;
        if (!exporter) return false;
        try {
          return exporter.exportCsv();
        } catch (error) {
          console.error('Failed to export performance stats:', error);
          return false;
        }
      },

      exportPerformanceChart: () => {
        const exporter = performanceExporterRef.current;
        if (!exporter) return false;
        try {
          return exporter.exportChart();
        } catch (error) {
          console.error('Failed to export performance chart:', error);
          return false;
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
            onRegisterExporter={handleRegisterPerformanceExporter}
          />
        )}
      </div>
    );
  }
);

CesiumViewer.displayName = 'CesiumViewer';

export default CesiumViewer;
