import { useRef, useState, useImperativeHandle, forwardRef, useCallback, useEffect } from 'react';
import {
  Viewer,
  Cesium3DTileset,
  Matrix4,
  Cartesian3,
  HeadingPitchRoll,
  Quaternion,
  TranslationRotationScale,
  Math as CesiumMath,
  ScreenSpaceCameraController,
  Clock,
} from 'cesium';
import { CesiumScene } from './CesiumScene';
import { PerformanceStats } from './PerformanceStats';
import type {
  CesiumViewerHandles,
  GlobeOptions,
  TilesetTransformOptions,
  TilesetDebugOptions,
  TilesetLayerInfo,
  CameraPathStatus,
} from '../../types';

type NamedTileset = Cesium3DTileset & {
  customName?: string;
  url?: string;
  debugShowStatistics?: boolean;
  debugShowGeometricError?: boolean;
  debugShowRenderingStatistics?: boolean;
  debugShowMemoryUsage?: boolean;
};

type CameraPathPoint = {
  timeSeconds: number;
  position: Cartesian3;
  heading: number;
  pitch: number;
  roll: number;
};

type CameraControllerState = {
  enableInputs: boolean;
  enableTranslate: boolean;
  enableZoom: boolean;
  enableRotate: boolean;
  enableTilt: boolean;
  enableLook: boolean;
};

const CAMERA_RECORD_SAMPLE_INTERVAL_MS = 120;
const CAMERA_RECORD_MIN_DISTANCE_METERS = 0.2;
const CAMERA_RECORD_MIN_ANGLE_RAD = (0.2 * Math.PI) / 180;

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
      exportComparisonChart: () => boolean;
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
    const cameraPathRef = useRef<CameraPathPoint[]>([]);
    const cameraRecordRef = useRef<{
      isRecording: boolean;
      startTimeMs: number;
      lastSampleTimeMs: number;
      listener: (() => void) | null;
    }>({
      isRecording: false,
      startTimeMs: 0,
      lastSampleTimeMs: 0,
      listener: null,
    });
    const cameraPlaybackRef = useRef<{
      isPlaying: boolean;
      startTimeMs: number;
      speedMultiplier: number;
      segmentIndex: number;
      listener: ((clock: Clock) => void) | null;
      savedControllerState: CameraControllerState | null;
    }>({
      isPlaying: false,
      startTimeMs: 0,
      speedMultiplier: 1,
      segmentIndex: 0,
      listener: null,
      savedControllerState: null,
    });
    const playbackScratchPositionRef = useRef(new Cartesian3());

    const getCameraPathDuration = () => {
      const path = cameraPathRef.current;
      if (path.length < 2) return 0;
      return path[path.length - 1].timeSeconds;
    };

    const getCameraPathStatus = (): CameraPathStatus => ({
      isRecording: cameraRecordRef.current.isRecording,
      isPlaying: cameraPlaybackRef.current.isPlaying,
      pathPointCount: cameraPathRef.current.length,
      durationSeconds: getCameraPathDuration(),
    });

    const removeCameraRecordListener = () => {
      const viewerInstance = viewerRef.current;
      const listener = cameraRecordRef.current.listener;
      if (!listener || !viewerInstance || viewerInstance.isDestroyed()) {
        cameraRecordRef.current.listener = null;
        return;
      }
      viewerInstance.scene.postRender.removeEventListener(listener);
      cameraRecordRef.current.listener = null;
    };

    const restoreCameraControllerState = () => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;
      const controller = viewerInstance.scene.screenSpaceCameraController;
      const saved = cameraPlaybackRef.current.savedControllerState;
      if (!saved) return;
      controller.enableInputs = saved.enableInputs;
      controller.enableTranslate = saved.enableTranslate;
      controller.enableZoom = saved.enableZoom;
      controller.enableRotate = saved.enableRotate;
      controller.enableTilt = saved.enableTilt;
      controller.enableLook = saved.enableLook;
      cameraPlaybackRef.current.savedControllerState = null;
    };

    const disableCameraController = (controller: ScreenSpaceCameraController) => {
      cameraPlaybackRef.current.savedControllerState = {
        enableInputs: controller.enableInputs,
        enableTranslate: controller.enableTranslate,
        enableZoom: controller.enableZoom,
        enableRotate: controller.enableRotate,
        enableTilt: controller.enableTilt,
        enableLook: controller.enableLook,
      };
      controller.enableInputs = false;
      controller.enableTranslate = false;
      controller.enableZoom = false;
      controller.enableRotate = false;
      controller.enableTilt = false;
      controller.enableLook = false;
    };

    const applyCameraPoint = (point: CameraPathPoint) => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return;
      viewerInstance.camera.setView({
        destination: Cartesian3.clone(point.position),
        orientation: {
          heading: point.heading,
          pitch: point.pitch,
          roll: point.roll,
        },
      });
    };

    const interpolateAngle = (start: number, end: number, t: number) =>
      start + CesiumMath.negativePiToPi(end - start) * t;

    const removeCameraPlaybackListener = () => {
      const viewerInstance = viewerRef.current;
      const listener = cameraPlaybackRef.current.listener;
      if (!listener || !viewerInstance || viewerInstance.isDestroyed()) {
        cameraPlaybackRef.current.listener = null;
        return;
      }
      viewerInstance.clock.onTick.removeEventListener(listener);
      cameraPlaybackRef.current.listener = null;
    };

    const stopCameraPathPlaybackInternal = () => {
      cameraPlaybackRef.current.isPlaying = false;
      cameraPlaybackRef.current.segmentIndex = 0;
      removeCameraPlaybackListener();
      restoreCameraControllerState();
    };

    const captureCurrentCameraPoint = (timeSeconds: number): CameraPathPoint | null => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return null;
      const camera = viewerInstance.camera;
      return {
        timeSeconds,
        position: Cartesian3.clone(camera.positionWC),
        heading: camera.heading,
        pitch: camera.pitch,
        roll: camera.roll,
      };
    };

    const appendCameraSample = (force = false) => {
      const recordState = cameraRecordRef.current;
      if (!recordState.isRecording) return;
      const now = performance.now();
      if (!force && now - recordState.lastSampleTimeMs < CAMERA_RECORD_SAMPLE_INTERVAL_MS) {
        return;
      }

      const elapsedSeconds = (now - recordState.startTimeMs) / 1000;
      const point = captureCurrentCameraPoint(elapsedSeconds);
      if (!point) return;

      const path = cameraPathRef.current;
      const lastPoint = path[path.length - 1];
      if (lastPoint) {
        const positionDelta = Cartesian3.distance(lastPoint.position, point.position);
        const headingDelta = Math.abs(CesiumMath.negativePiToPi(point.heading - lastPoint.heading));
        const pitchDelta = Math.abs(CesiumMath.negativePiToPi(point.pitch - lastPoint.pitch));
        const rollDelta = Math.abs(CesiumMath.negativePiToPi(point.roll - lastPoint.roll));
        const hasMoved =
          positionDelta >= CAMERA_RECORD_MIN_DISTANCE_METERS ||
          headingDelta >= CAMERA_RECORD_MIN_ANGLE_RAD ||
          pitchDelta >= CAMERA_RECORD_MIN_ANGLE_RAD ||
          rollDelta >= CAMERA_RECORD_MIN_ANGLE_RAD;

        if (!force && !hasMoved) {
          return;
        }
        if (force && !hasMoved && elapsedSeconds - lastPoint.timeSeconds < 0.05) {
          return;
        }
      }

      path.push(point);
      recordState.lastSampleTimeMs = now;
    };

    const stopCameraPathRecordingInternal = () => {
      const recordState = cameraRecordRef.current;
      if (!recordState.isRecording) return false;
      appendCameraSample(true);
      recordState.isRecording = false;
      removeCameraRecordListener();
      return cameraPathRef.current.length >= 2;
    };

    const startCameraPathRecordingInternal = () => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return false;
      if (cameraRecordRef.current.isRecording || cameraPlaybackRef.current.isPlaying) {
        return false;
      }

      cameraPathRef.current = [];
      cameraRecordRef.current.isRecording = true;
      cameraRecordRef.current.startTimeMs = performance.now();
      cameraRecordRef.current.lastSampleTimeMs = 0;
      appendCameraSample(true);

      const listener = () => {
        appendCameraSample(false);
      };
      cameraRecordRef.current.listener = listener;
      viewerInstance.scene.postRender.addEventListener(listener);
      return true;
    };

    const startCameraPathPlaybackInternal = (speedMultiplier = 1) => {
      const viewerInstance = viewerRef.current;
      if (!viewerInstance || viewerInstance.isDestroyed()) return false;
      if (cameraRecordRef.current.isRecording || cameraPlaybackRef.current.isPlaying) {
        return false;
      }

      const path = cameraPathRef.current;
      if (path.length < 2) return false;
      const playbackSpeed = Number.isFinite(speedMultiplier) && speedMultiplier > 0
        ? speedMultiplier
        : 1;

      cameraPlaybackRef.current.isPlaying = true;
      cameraPlaybackRef.current.startTimeMs = performance.now();
      cameraPlaybackRef.current.speedMultiplier = playbackSpeed;
      cameraPlaybackRef.current.segmentIndex = 0;
      disableCameraController(viewerInstance.scene.screenSpaceCameraController);
      applyCameraPoint(path[0]);

      const listener = () => {
        if (!cameraPlaybackRef.current.isPlaying) return;
        const currentPath = cameraPathRef.current;
        if (currentPath.length < 2) {
          stopCameraPathPlaybackInternal();
          return;
        }

        const playbackState = cameraPlaybackRef.current;
        const elapsedSeconds =
          ((performance.now() - playbackState.startTimeMs) / 1000) *
          playbackState.speedMultiplier;
        const finalPoint = currentPath[currentPath.length - 1];

        if (elapsedSeconds >= finalPoint.timeSeconds) {
          applyCameraPoint(finalPoint);
          stopCameraPathPlaybackInternal();
          return;
        }

        let segmentIndex = playbackState.segmentIndex;
        while (
          segmentIndex < currentPath.length - 2 &&
          elapsedSeconds > currentPath[segmentIndex + 1].timeSeconds
        ) {
          segmentIndex += 1;
        }
        playbackState.segmentIndex = segmentIndex;

        const startPoint = currentPath[segmentIndex];
        const endPoint = currentPath[segmentIndex + 1];
        const segmentDuration = Math.max(0.0001, endPoint.timeSeconds - startPoint.timeSeconds);
        const t = CesiumMath.clamp(
          (elapsedSeconds - startPoint.timeSeconds) / segmentDuration,
          0,
          1
        );

        const destination = Cartesian3.lerp(
          startPoint.position,
          endPoint.position,
          t,
          playbackScratchPositionRef.current
        );

        viewerInstance.camera.setView({
          destination,
          orientation: {
            heading: interpolateAngle(startPoint.heading, endPoint.heading, t),
            pitch: interpolateAngle(startPoint.pitch, endPoint.pitch, t),
            roll: interpolateAngle(startPoint.roll, endPoint.roll, t),
          },
        });
      };

      cameraPlaybackRef.current.listener = listener;
      viewerInstance.clock.onTick.addEventListener(listener);
      return true;
    };

    useEffect(() => {
      return () => {
        const viewerInstance = viewerRef.current;

        cameraRecordRef.current.isRecording = false;
        const recordListener = cameraRecordRef.current.listener;
        if (recordListener && viewerInstance && !viewerInstance.isDestroyed()) {
          viewerInstance.scene.postRender.removeEventListener(recordListener);
        }
        cameraRecordRef.current.listener = null;

        cameraPlaybackRef.current.isPlaying = false;
        const playbackListener = cameraPlaybackRef.current.listener;
        if (playbackListener && viewerInstance && !viewerInstance.isDestroyed()) {
          viewerInstance.clock.onTick.removeEventListener(playbackListener);
        }
        cameraPlaybackRef.current.listener = null;

        if (viewerInstance && !viewerInstance.isDestroyed()) {
          const controller = viewerInstance.scene.screenSpaceCameraController;
          const saved = cameraPlaybackRef.current.savedControllerState;
          if (saved) {
            controller.enableInputs = saved.enableInputs;
            controller.enableTranslate = saved.enableTranslate;
            controller.enableZoom = saved.enableZoom;
            controller.enableRotate = saved.enableRotate;
            controller.enableTilt = saved.enableTilt;
            controller.enableLook = saved.enableLook;
          }
        }
        cameraPlaybackRef.current.savedControllerState = null;
      };
    }, []);

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
              exportComparisonChart: () => boolean;
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

      exportPerformanceComparisonChart: () => {
        const exporter = performanceExporterRef.current;
        if (!exporter) return false;
        try {
          return exporter.exportComparisonChart();
        } catch (error) {
          console.error('Failed to export performance comparison chart:', error);
          return false;
        }
      },

      startCameraPathRecording: () => startCameraPathRecordingInternal(),

      stopCameraPathRecording: () => stopCameraPathRecordingInternal(),

      startCameraPathPlayback: (speedMultiplier = 1) =>
        startCameraPathPlaybackInternal(speedMultiplier),

      stopCameraPathPlayback: () => {
        stopCameraPathPlaybackInternal();
      },

      clearCameraPath: () => {
        if (cameraRecordRef.current.isRecording) {
          stopCameraPathRecordingInternal();
        }
        if (cameraPlaybackRef.current.isPlaying) {
          stopCameraPathPlaybackInternal();
        }
        cameraPathRef.current = [];
      },

      getCameraPathStatus: () => getCameraPathStatus(),
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
