import { useEffect, useRef } from 'react';
import { Viewer, Ion, Math as CesiumMath } from 'cesium';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Set your Cesium Ion default access token.
// This is a public token and is safe to be in client-side code.
Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

interface CesiumSceneProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onViewerReady: (viewer: Viewer) => void;
  defaultCameraPosition?: {
    x: number;
    y: number;
    z: number;
    heading?: number;
    pitch?: number;
    roll?: number;
  };
}

/**
 * Cesium 地球场景组件
 * 负责初始化和管理 Cesium Viewer 实例
 */
export function CesiumScene({
  containerRef,
  onViewerReady,
  defaultCameraPosition = {
    x: -2183975.565869689,
    y: 4384351.46459388,
    z: 4075106.398018266,
    heading: 0.0,
    pitch: -25.0,
    roll: 0.0,
  },
}: CesiumSceneProps) {
  const viewerRef = useRef<Viewer | null>(null);
  const onViewerReadyRef = useRef(onViewerReady);
  const defaultCameraPositionRef = useRef(defaultCameraPosition);
  const hasCalledReadyRef = useRef(false);

  // 更新 ref 值，但不触发重新渲染
  useEffect(() => {
    onViewerReadyRef.current = onViewerReady;
    defaultCameraPositionRef.current = defaultCameraPosition;
  }, [onViewerReady, defaultCameraPosition]);

  useEffect(() => {
    if (containerRef.current && !viewerRef.current && !hasCalledReadyRef.current) {
      // 创建 Cesium Viewer，禁用大部分 UI 控件以保持简洁
      const viewer = new Viewer(containerRef.current, {
        animation: false,
        baseLayerPicker: false,
        fullscreenButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
      });

      // 设置默认相机视角
      const cameraPos = defaultCameraPositionRef.current;
      viewer.camera.flyTo({
        destination: new Cesium.Cartesian3(
          cameraPos.x,
          cameraPos.y,
          cameraPos.z
        ),
        orientation: {
          heading: CesiumMath.toRadians(cameraPos.heading ?? 0.0),
          pitch: CesiumMath.toRadians(cameraPos.pitch ?? -25.0),
          roll: cameraPos.roll ?? 0.0,
        },
      });

      viewerRef.current = viewer;
      hasCalledReadyRef.current = true;
      // 使用 ref 中的最新回调函数
      onViewerReadyRef.current(viewer);
    }

    return () => {
      // 清理资源
      const viewer = viewerRef.current;
      if (viewer && !viewer.isDestroyed()) {
        viewer.destroy();
        viewerRef.current = null;
        hasCalledReadyRef.current = false;
      }
    };
    // 只依赖 containerRef，避免无限循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);

  return null; // 此组件不渲染任何内容，只负责初始化 Viewer
}

