import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Viewer, Cesium3DTileset, Ion, Math as CesiumMath } from 'cesium';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

// Set your Cesium Ion default access token.
// This is a public token and is safe to be in client-side code.
Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;

interface CesiumViewerHandles {
  loadTileset: (url: string) => void;
}

const CesiumViewer: React.ForwardRefRenderFunction<CesiumViewerHandles> = (props, ref) => {
  const cesiumContainerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);

  useEffect(() => {
    let statsContainer: HTMLDivElement | null = null;
    let renderListener: (() => void) | undefined = undefined;

    if (cesiumContainerRef.current && !viewerRef.current) {
      const viewer = new Viewer(cesiumContainerRef.current, {
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

      // Point the camera to a default view (e.g., looking at a region in China)
      viewer.camera.flyTo({
        destination: new Cesium.Cartesian3(-2183975.565869689, 4384351.46459388, 4075106.398018266),
        orientation: {
          heading: CesiumMath.toRadians(0.0),
          pitch: CesiumMath.toRadians(-25.0),
          roll: 0.0,
        },
      });

      viewerRef.current = viewer;

      // Display FPS and Draw Calls
      statsContainer = document.createElement('div');
      if (cesiumContainerRef.current) {
        cesiumContainerRef.current.style.position = 'relative';
        statsContainer.style.position = 'absolute';
        statsContainer.style.top = '10px';
        statsContainer.style.left = '10px';
        statsContainer.style.padding = '5px 10px';
        statsContainer.style.backgroundColor = 'rgba(40, 40, 40, 0.7)';
        statsContainer.style.color = 'white';
        statsContainer.style.borderRadius = '5px';
        statsContainer.style.fontFamily = 'monospace';
        statsContainer.style.zIndex = '1000';
        cesiumContainerRef.current.appendChild(statsContainer);
      }

      let frameCount = 0;
      let lastFpsUpdate = performance.now();

      renderListener = () => {
        frameCount++;
        const now = performance.now();
        const delta = now - lastFpsUpdate;

        if (delta > 1000) {
          const fps = Math.round((frameCount * 1000) / delta);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const drawCalls = (viewer.scene as any).frameState.commandList.length;

          if (statsContainer) {
            statsContainer.innerHTML = `FPS: ${fps}<br/>Draw Calls: ${drawCalls}`;
          }

          lastFpsUpdate = now;
          frameCount = 0;
        }
      };
      
      viewer.scene.postRender.addEventListener(renderListener);
    }

    return () => {
      const viewer = viewerRef.current;
      // Cleanup viewer on component unmount
      if (viewer && !viewer.isDestroyed()) {
        if (renderListener) {
          viewer.scene.postRender.removeEventListener(renderListener);
        }
        if (statsContainer && cesiumContainerRef.current?.contains(statsContainer)) {
          cesiumContainerRef.current.removeChild(statsContainer);
        }
        
        viewer.destroy();
        viewerRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  useImperativeHandle(ref, () => ({
    loadTileset: async (url: string) => {
      const viewer = viewerRef.current;
      if (viewer) {
        // Remove all existing tilesets before loading a new one
        viewer.scene.primitives.removeAll();

        try {
          const tileset = await Cesium3DTileset.fromUrl(url);
          viewer.scene.primitives.add(tileset);

          // Zoom to the newly loaded tileset
          viewer.zoomTo(tileset);
        } catch (error) {
          console.error(`Error loading tileset: ${error}`);
          // Optionally, you can have a callback to notify the parent component of the error
        }
      }
    },
  }));

  return <div className="cesium-container" ref={cesiumContainerRef} />;
};

export default forwardRef(CesiumViewer); 