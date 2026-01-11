import { useEffect, useRef } from 'react';
import { Viewer, Cesium3DTileset } from 'cesium';

interface PerformanceStatsProps {
  viewer: Viewer | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  position?: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
  style?: React.CSSProperties;
}

/**
 * 性能监控组件
 * 显示 FPS 和 Draw Calls 等性能指标
 */
export function PerformanceStats({
  viewer,
  containerRef,
  position = { top: '10px', left: '10px' },
  style,
}: PerformanceStatsProps) {
  const statsContainerRef = useRef<HTMLDivElement | null>(null);
  const renderListenerRef = useRef<(() => void) | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!viewer || !containerRef.current) {
      return;
    }

    // 检查 viewer 是否已销毁
    if (viewer.isDestroyed()) {
      return;
    }

    let isMounted = true;

    const initializeStats = () => {
      // 检查 scene 是否已初始化
      if (!viewer || viewer.isDestroyed() || !viewer.scene) {
        // 如果 scene 还未初始化，等待一下再重试
        timeoutRef.current = setTimeout(() => {
          if (isMounted && viewer && !viewer.isDestroyed() && viewer.scene) {
            initializeStats();
          }
        }, 100);
        return;
      }

      // 再次检查组件是否仍然挂载且 viewer 有效
      if (!isMounted || !viewer || viewer.isDestroyed() || !viewer.scene) {
        return;
      }

      // 创建性能统计容器
      const statsContainer = document.createElement('div');
      statsContainer.style.position = 'absolute';
      if (position.top) statsContainer.style.top = position.top;
      if (position.left) statsContainer.style.left = position.left;
      if (position.right) statsContainer.style.right = position.right;
      if (position.bottom) statsContainer.style.bottom = position.bottom;
      statsContainer.style.padding = '5px 10px';
      statsContainer.style.backgroundColor = 'rgba(40, 40, 40, 0.7)';
      statsContainer.style.color = 'white';
      statsContainer.style.borderRadius = '5px';
      statsContainer.style.fontFamily = 'monospace';
      statsContainer.style.zIndex = '1000';
      statsContainer.style.fontSize = '12px';
      statsContainer.style.lineHeight = '1.4';

      // 应用自定义样式
      if (style) {
        Object.assign(statsContainer.style, style);
      }

      if (!containerRef.current) {
        return;
      }

      containerRef.current.style.position = 'relative';
      containerRef.current.appendChild(statsContainer);
      statsContainerRef.current = statsContainer;

      // 性能统计逻辑
      let frameCount = 0;
      let lastFpsUpdate = performance.now();

      const renderListener = () => {
        // 在监听器中也要检查 viewer 是否仍然有效
        if (!isMounted || !viewer || viewer.isDestroyed() || !viewer.scene) {
          return;
        }

        frameCount++;
        const now = performance.now();
        const delta = now - lastFpsUpdate;

        if (delta > 1000) {
          const fps = Math.round((frameCount * 1000) / delta);
          const avgFrameTime = delta / frameCount;
          
          // 安全地获取 drawCalls
          let drawCalls = 0;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const frameState = (viewer.scene as any).frameState;
            if (frameState && frameState.commandList) {
              drawCalls = frameState.commandList.length;
            }
          } catch (error) {
            console.warn('Failed to get draw calls:', error);
          }

          let tilesetStatsHtml = '';
          let tilesetFound = false;
          const primitives = viewer.scene.primitives;
          for (let i = 0; i < primitives.length; i++) {
            const p = primitives.get(i);
            if (p instanceof Cesium3DTileset) {
              tilesetFound = true;
              const stats = (p as any).statistics;
              if (stats) {
                const texturesByteLength = stats.texturesByteLength || 0;
                const geometryByteLength = stats.geometryByteLength || 0;
                const memory = (texturesByteLength + geometryByteLength) / (1024 * 1024);
                
                const visited = stats.visited || 0;
                const triangles = stats.numberOfTriangles || 0;
                const features = stats.numberOfFeaturesSelected || stats.numberOfFeaturesLoaded || 0;

                tilesetStatsHtml = `
                  <br/>--- 3D Tileset ---
                  <br/>Visited Tiles: ${visited.toLocaleString()}
                  <br/>Triangles: ${triangles.toLocaleString()}
                  <br/>Features: ${features.toLocaleString()}
                  <br/>Memory (MB): ${memory.toFixed(2)}
                `;
                break; // 只显示找到的第一个瓦片集的统计信息
              }
            }
          }

          if (tilesetFound && !tilesetStatsHtml) {
            tilesetStatsHtml = `<br/>--- 3D Tileset ---<br/>(Waiting for stats...)`;
          }

          if (statsContainer && statsContainer.parentNode) {
            statsContainer.innerHTML = `FPS: ${fps}<br/>Frame Time: ${avgFrameTime.toFixed(2)} ms<br/>Draw Calls: ${drawCalls}${tilesetStatsHtml}`;
          }

          lastFpsUpdate = now;
          frameCount = 0;
        }
      };

      renderListenerRef.current = renderListener;
      
      // 安全地添加事件监听器
      try {
        viewer.scene.postRender.addEventListener(renderListener);
      } catch (error) {
        console.error('Failed to add render listener:', error);
        // 清理已创建的容器
        if (statsContainerRef.current && containerRef.current?.contains(statsContainerRef.current)) {
          containerRef.current.removeChild(statsContainerRef.current);
        }
      }
    };

    initializeStats();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // 清理资源
      if (renderListenerRef.current && viewer && !viewer.isDestroyed() && viewer.scene) {
        try {
          viewer.scene.postRender.removeEventListener(renderListenerRef.current);
        } catch (error) {
          console.warn('Failed to remove render listener:', error);
        }
      }
      if (statsContainerRef.current && containerRef.current?.contains(statsContainerRef.current)) {
        containerRef.current.removeChild(statsContainerRef.current);
      }
    };
  }, [viewer, containerRef, position, style]);

  return null; // 此组件不渲染任何内容，只负责性能监控
}
