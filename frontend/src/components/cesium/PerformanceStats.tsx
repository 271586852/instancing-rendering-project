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
  const containerElRef = useRef<HTMLDivElement | null>(null);
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

    const containerEl = containerRef.current;
    containerElRef.current = containerEl;

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

    if (!containerEl) {
      return;
    }

    containerEl.style.position = 'relative';
    containerEl.appendChild(statsContainer);
      statsContainerRef.current = statsContainer;

      // 摘要与图表容器
      const summaryDiv = document.createElement('div');
      summaryDiv.style.marginBottom = '8px';
      summaryDiv.style.fontSize = '12px';
      summaryDiv.style.lineHeight = '1.5';
      statsContainer.appendChild(summaryDiv);

      const chartsWrapper = document.createElement('div');
      chartsWrapper.style.display = 'flex';
      chartsWrapper.style.flexDirection = 'column';
      chartsWrapper.style.gap = '8px';
      chartsWrapper.style.width = '280px';
      statsContainer.appendChild(chartsWrapper);

      const createChartBlock = (color: string) => {
        const block = document.createElement('div');
        block.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
        block.style.padding = '4px 6px';
        block.style.borderRadius = '4px';
        block.style.border = `1px solid ${color}40`;

        const canvas = document.createElement('canvas');
        canvas.width = 260;
        canvas.height = 70;
        canvas.style.width = '260px';
        canvas.style.height = '70px';
        canvas.style.borderRadius = '3px';
        canvas.style.background = 'rgba(0, 0, 0, 0.25)';

        block.appendChild(canvas);
        chartsWrapper.appendChild(block);
        return canvas;
      };

      const fpsCanvas = createChartBlock('#4caf50');
      const frameTimeCanvas = createChartBlock('#ffb74d');
      const drawCallsCanvas = createChartBlock('#29b6f6');

      // 数据缓存
      let frameCount = 0;
      let lastFpsUpdate = performance.now();
      const startTime = performance.now();
      const maxPoints = 120;

      const timeHistory: number[] = [];
      const fpsHistory: number[] = [];
      const frameTimeHistory: number[] = [];
      const drawCallsHistory: number[] = [];

      const drawLineChart = (
        canvas: HTMLCanvasElement,
        times: number[],
        values: number[],
        color: string
      ) => {
        const ctx = canvas.getContext('2d');
        if (!ctx || values.length === 0) return;

        const w = canvas.width;
        const h = canvas.height;
        const padding = 18;

        ctx.clearRect(0, 0, w, h);

        const tMin = times[0];
        const tMax = times[times.length - 1];
        const timeRange = Math.max(1, tMax - tMin);

        const vMin = Math.min(...values);
        const vMax = Math.max(...values);
        const vRange = vMax - vMin || 1;

        const xScale = (t: number) => padding + ((t - tMin) / timeRange) * (w - padding * 2);
        const yScale = (v: number) => h - padding - ((v - vMin) / vRange) * (h - padding * 2);

        // 网格
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = padding + ((h - padding * 2) / 4) * i;
          ctx.beginPath();
          ctx.moveTo(padding, y);
          ctx.lineTo(w - padding, y);
          ctx.stroke();
        }

        // 曲线
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        values.forEach((v, idx) => {
          const x = xScale(times[idx]);
          const y = yScale(v);
          if (idx === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // 最新点
        const latestX = xScale(times[times.length - 1]);
        const latestY = yScale(values[values.length - 1]);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(latestX, latestY, 3, 0, Math.PI * 2);
        ctx.fill();

        // 标注
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '10px monospace';
        ctx.fillText(`t=${tMax.toFixed(1)}s`, w - padding - 48, h - 6);
        ctx.fillText(`${vMax.toFixed(1)}`, padding, yScale(vMax) - 6);
        ctx.fillText(`${vMin.toFixed(1)}`, padding, Math.min(h - 6, yScale(vMin) + 12));
      };

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
          const elapsedSeconds = (now - startTime) / 1000;
          
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

          // 数据入列
          timeHistory.push(elapsedSeconds);
          fpsHistory.push(fps);
          frameTimeHistory.push(avgFrameTime);
          drawCallsHistory.push(drawCalls);

          if (timeHistory.length > maxPoints) {
            timeHistory.shift();
            fpsHistory.shift();
            frameTimeHistory.shift();
            drawCallsHistory.shift();
          }

          let tilesetStatsHtml = '';
          let tilesetFound = false;
          const primitives = viewer.scene.primitives;
          type TilesetStats = {
            texturesByteLength?: number;
            geometryByteLength?: number;
            visited?: number;
            numberOfTriangles?: number;
            numberOfFeaturesSelected?: number;
            numberOfFeaturesLoaded?: number;
          };

          for (let i = 0; i < primitives.length; i++) {
            const p = primitives.get(i);
            if (p instanceof Cesium3DTileset) {
              tilesetFound = true;
              const stats = (p as Cesium3DTileset & { statistics?: TilesetStats }).statistics;
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

          if (summaryDiv && summaryDiv.parentNode) {
            summaryDiv.innerHTML = `
              FPS: ${fps} ｜ Frame Time: ${avgFrameTime.toFixed(2)} ms ｜ Draw Calls: ${drawCalls}
              ${tilesetStatsHtml}
            `;
          }

          // 绘制折线图
          drawLineChart(fpsCanvas, timeHistory, fpsHistory, '#4caf50');
          drawLineChart(frameTimeCanvas, timeHistory, frameTimeHistory, '#ffb74d');
          drawLineChart(drawCallsCanvas, timeHistory, drawCallsHistory, '#29b6f6');

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
        if (statsContainerRef.current && containerElRef.current?.contains(statsContainerRef.current)) {
          containerElRef.current.removeChild(statsContainerRef.current);
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
      if (statsContainerRef.current && containerElRef.current?.contains(statsContainerRef.current)) {
        containerElRef.current.removeChild(statsContainerRef.current);
      }
    };
  }, [viewer, containerRef, position, style]);

  return null; // 此组件不渲染任何内容，只负责性能监控
}
