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
  onRegisterExporter?: (
    exporter:
      | {
          exportCsv: () => boolean;
          exportChart: () => boolean;
        }
      | null
  ) => void;
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
  onRegisterExporter,
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
      const trianglesHistory: number[] = [];

  const exportRecentMetrics = () => {
        if (timeHistory.length === 0) return false;
        const latestTime = timeHistory[timeHistory.length - 1];
        const cutoff = latestTime - 60;
        const rows: string[] = [
          'time_s,fps,frame_time_ms,draw_calls,triangles',
        ];
        for (let i = 0; i < timeHistory.length; i++) {
          const t = timeHistory[i];
          if (t >= cutoff) {
            rows.push(
              [
                t.toFixed(2),
                fpsHistory[i],
                frameTimeHistory[i].toFixed(3),
                drawCallsHistory[i],
                trianglesHistory[i],
              ].join(',')
            );
          }
        }
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `performance_last60s_${Date.now()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        return true;
      };

  const exportRecentMetricsChart = () => {
    if (timeHistory.length === 0) return false;
    const latestTime = timeHistory[timeHistory.length - 1];
    const cutoff = latestTime - 60;
    const times: number[] = [];
    const fpsValues: number[] = [];
    const frameTimeValues: number[] = [];
    const drawCallsValues: number[] = [];
    const trianglesValues: number[] = [];

    for (let i = 0; i < timeHistory.length; i++) {
      const t = timeHistory[i];
      if (t >= cutoff) {
        times.push(t);
        fpsValues.push(fpsHistory[i]);
        frameTimeValues.push(frameTimeHistory[i]);
        drawCallsValues.push(drawCallsHistory[i]);
        trianglesValues.push(trianglesHistory[i]);
      }
    }

    const chartData = {
      times,
      fps: fpsValues,
      frameTime: frameTimeValues,
      drawCalls: drawCallsValues,
      triangles: trianglesValues,
    };

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>性能统计折线图（最近60秒）</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <style>
    body { font-family: "Microsoft YaHei", Arial, sans-serif; background: #fff; padding: 20px; }
    h1 { font-size: 20px; margin: 0 0 16px; color: #333; text-align: center; }
    #container { width: 1000px; margin: 0 auto; }
    .chart-box { height: 260px; margin-bottom: 20px; }
    #btn-export { padding: 10px 16px; background: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
    #btn-export:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div id="container">
    <h1>性能统计折线图（最近60秒）</h1>
    <div id="chartA" class="chart-box"></div>
    <div id="chartB" class="chart-box"></div>
    <div id="chartC" class="chart-box"></div>
    <div id="chartD" class="chart-box"></div>
  </div>
  <div style="text-align:center;">
    <button id="btn-export" onclick="exportImage()">导出图片</button>
  </div>
  <script>
    const data = ${JSON.stringify(chartData)};
    const baseTime = data.times.length > 0 ? data.times[0] : 0;
    const labels = data.times.map(t => Math.max(0, Math.round(t - baseTime)));

    const chartA = echarts.init(document.getElementById('chartA'));
    chartA.setOption({
      tooltip: { trigger: 'axis' },
      title: { text: 'FPS', left: 'center' },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', name: 'FPS' },
      series: [{ name: 'FPS', type: 'line', data: data.fps }]
    });

    const chartB = echarts.init(document.getElementById('chartB'));
    chartB.setOption({
      tooltip: { trigger: 'axis' },
      title: { text: 'Frame Time (ms)', left: 'center' },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', name: 'ms' },
      series: [{ name: 'Frame Time (ms)', type: 'line', data: data.frameTime }]
    });

    const chartC = echarts.init(document.getElementById('chartC'));
    chartC.setOption({
      tooltip: { trigger: 'axis' },
      title: { text: 'Draw Calls', left: 'center' },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', name: 'Draw Calls' },
      series: [{ name: 'Draw Calls', type: 'line', data: data.drawCalls }]
    });

    const chartD = echarts.init(document.getElementById('chartD'));
    chartD.setOption({
      tooltip: { trigger: 'axis' },
      title: { text: 'Triangles', left: 'center' },
      xAxis: { type: 'category', data: labels, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value', name: 'Triangles' },
      series: [{ name: 'Triangles', type: 'line', data: data.triangles }]
    });

    function exportImage() {
      const element = document.getElementById('container');
      html2canvas(element, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'performance_last60s_chart.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      });
    }

    window.addEventListener('resize', () => {
      chartA.resize();
      chartB.resize();
      chartC.resize();
      chartD.resize();
    });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance_last60s_${Date.now()}.html`;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  };

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

          let tilesetStatsHtml = '';
          let tilesetFound = false;
          let tilesetStatsFound = false;
          const primitives = viewer.scene.primitives;
          type TilesetStats = {
            texturesByteLength?: number;
            geometryByteLength?: number;
            visited?: number;
            numberOfTrianglesSelected?: number;
            numberOfFeaturesSelected?: number;
            numberOfFeaturesLoaded?: number;
          };
          type TileContentStats = {
            numberOfTriangles?: number;
          };
          type TileContent = {
            trianglesLength?: number;
            innerContents?: TileContent[];
            statistics?: TileContentStats;
            _statistics?: TileContentStats;
            _model?: { statistics?: TileContentStats };
          };
          type SelectedTile = {
            content?: TileContent;
          };
          type TilesetInternal = Cesium3DTileset & {
            statistics?: TilesetStats;
            _selectedTiles?: SelectedTile[];
          };

          let totalTexturesBytes = 0;
          let totalGeometryBytes = 0;
          let totalVisited = 0;
          let totalTriangles = 0;
          let totalFeatures = 0;
          const getContentTriangles = (content?: TileContent): number => {
            if (!content) return 0;
            let sum = content.trianglesLength ?? 0;
            if (content.statistics?.numberOfTriangles) {
              sum = Math.max(sum, content.statistics.numberOfTriangles);
            }
            if (content._statistics?.numberOfTriangles) {
              sum = Math.max(sum, content._statistics.numberOfTriangles);
            }
            if (content._model?.statistics?.numberOfTriangles) {
              sum = Math.max(sum, content._model.statistics.numberOfTriangles);
            }
            const innerContents = content.innerContents;
            if (innerContents && innerContents.length > 0) {
              for (const inner of innerContents) {
                sum += getContentTriangles(inner);
              }
            }
            return sum;
          };

          for (let i = 0; i < primitives.length; i++) {
            const p = primitives.get(i);
            if (p instanceof Cesium3DTileset) {
              tilesetFound = true;
              const tileset = p as TilesetInternal;
              const stats = tileset.statistics;
              if (stats) {
                tilesetStatsFound = true;
                totalTexturesBytes += stats.texturesByteLength ?? 0;
                totalGeometryBytes += stats.geometryByteLength ?? 0;
                totalVisited += stats.visited ?? 0;
                let triangles = stats.numberOfTrianglesSelected ?? 0;
                if (triangles === 0 && tileset._selectedTiles && tileset._selectedTiles.length > 0) {
                  for (const tile of tileset._selectedTiles) {
                    triangles += getContentTriangles(tile.content);
                  }
                }
                totalTriangles += triangles;
                totalFeatures += stats.numberOfFeaturesSelected ?? stats.numberOfFeaturesLoaded ?? 0;
              }
            }
          }

          if (tilesetFound && tilesetStatsFound) {
            const toMb = (bytes: number) => bytes / (1024 * 1024);
            const formatMb = (value: number) =>
              value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8,
              });
            const texturesMb = toMb(totalTexturesBytes);
            const geometryMb = toMb(totalGeometryBytes);
            const totalMb = texturesMb + geometryMb;

            tilesetStatsHtml = `
              <br/>--- 3D Tileset (All) ---
              <br/>Visited Tiles: ${totalVisited.toLocaleString()}
              <br/>Triangles: ${totalTriangles.toLocaleString()}
              <br/>Features: ${totalFeatures.toLocaleString()}
              <br/>Textures (MB): ${formatMb(texturesMb)}
              <br/>Geometry (MB): ${formatMb(geometryMb)}
              <br/>Memory (MB): ${formatMb(totalMb)}
            `;
          } else if (tilesetFound && !tilesetStatsFound) {
            tilesetStatsHtml = `<br/>--- 3D Tileset ---<br/>(Waiting for stats...)`;
          }

          // 数据入列
          timeHistory.push(elapsedSeconds);
          fpsHistory.push(fps);
          frameTimeHistory.push(avgFrameTime);
          drawCallsHistory.push(drawCalls);
          trianglesHistory.push(totalTriangles);

          if (timeHistory.length > maxPoints) {
            timeHistory.shift();
            fpsHistory.shift();
            frameTimeHistory.shift();
            drawCallsHistory.shift();
            trianglesHistory.shift();
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
        onRegisterExporter?.({
          exportCsv: exportRecentMetrics,
          exportChart: exportRecentMetricsChart,
        });
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
      onRegisterExporter?.(null);
    };
  }, [viewer, containerRef, position, style, onRegisterExporter]);

  return null; // 此组件不渲染任何内容，只负责性能监控
}
