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
          exportComparisonChart: () => boolean;
        }
      | null
  ) => void;
}

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

type RecentMetrics = {
  relativeTimes: number[];
  frameTimeValues: number[];
  trianglesValues: number[];
  fpsValues: number[];
  drawCallValues: number[];
};

type CsvComparisonDataset = {
  name: string;
  times: number[];
  frameTime: number[];
  triangles: number[];
  fps: number[];
  drawCalls: number[];
};

type ComparisonMetricKey = 'ft' | 'triangles' | 'fps' | 'drawCalls';

type ComparisonMetricConfig = {
  key: ComparisonMetricKey;
  title: string;
  yAxisName: string;
  fileName: string;
  fractionDigits: number;
};

const RECENT_WINDOW_SECONDS = 60;
const CHART_WIDTH = 260;
const CHART_HEIGHT = 70;

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
  if (content.innerContents?.length) {
    for (const inner of content.innerContents) {
      sum += getContentTriangles(inner);
    }
  }
  return sum;
};

const toMetricStats = (values: number[], fractionDigits = 2) => {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    min: min.toFixed(fractionDigits),
    max: max.toFixed(fractionDigits),
    avg: avg.toFixed(fractionDigits),
  };
};

const triggerTextDownload = (fileName: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};

const buildReportHtml = (
  chartData: {
    labels: number[];
    frameTime: number[];
    triangles: number[];
    fps: number[];
    drawCalls: number[];
  },
  stats: {
    ft: { min: string; max: string; avg: string };
    triangles: { min: string; max: string; avg: string };
    fps: { min: string; max: string; avg: string };
    drawCalls: { min: string; max: string; avg: string };
  }
) => {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Performance Metrics Report (Last 60 Seconds)</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #f7f8fb;
      color: #1f2937;
      font-family: "Times New Roman", "Noto Serif SC", serif;
    }
    .report-container {
      max-width: 1280px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d8dee9;
      border-radius: 8px;
      padding: 24px;
      box-sizing: border-box;
    }
    h1 {
      margin: 0;
      text-align: center;
      font-size: 24px;
      font-weight: 600;
    }
    .subtitle {
      margin: 10px 0 18px;
      text-align: center;
      color: #4b5563;
      font-size: 14px;
    }
    .charts-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 10px;
    }
    .chart-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 10px;
      background: #fafafa;
    }
    .chart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      gap: 8px;
    }
    .chart-title {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
    }
    .chart-export-btn {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      font-size: 12px;
      padding: 5px 10px;
      cursor: pointer;
    }
    .chart-export-btn:hover {
      background: #f1f5f9;
    }
    .chart-box {
      width: 100%;
      height: 260px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: center;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
    .tip {
      margin-top: 10px;
      color: #4b5563;
      font-size: 13px;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <h1>Performance Metrics Report (Last 60 Seconds)</h1>
    <div class="subtitle">FT (Frame Time), Triangle Count, FPS, DrawCall Count</div>
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title">FT (ms)</div>
          <button class="chart-export-btn" onclick="exportChart('ft')">Export PNG</button>
        </div>
        <div id="chart-ft" class="chart-box"></div>
      </div>
      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title">Triangle Count</div>
          <button class="chart-export-btn" onclick="exportChart('triangles')">Export PNG</button>
        </div>
        <div id="chart-triangles" class="chart-box"></div>
      </div>
      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title">FPS</div>
          <button class="chart-export-btn" onclick="exportChart('fps')">Export PNG</button>
        </div>
        <div id="chart-fps" class="chart-box"></div>
      </div>
      <div class="chart-card">
        <div class="chart-head">
          <div class="chart-title">DrawCall Count</div>
          <button class="chart-export-btn" onclick="exportChart('drawCalls')">Export PNG</button>
        </div>
        <div id="chart-drawcalls" class="chart-box"></div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Min</th>
          <th>Max</th>
          <th>Average</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>FT (ms)</td><td>${stats.ft.min}</td><td>${stats.ft.max}</td><td>${stats.ft.avg}</td></tr>
        <tr><td>Triangle Count</td><td>${stats.triangles.min}</td><td>${stats.triangles.max}</td><td>${stats.triangles.avg}</td></tr>
        <tr><td>FPS</td><td>${stats.fps.min}</td><td>${stats.fps.max}</td><td>${stats.fps.avg}</td></tr>
        <tr><td>DrawCall Count</td><td>${stats.drawCalls.min}</td><td>${stats.drawCalls.max}</td><td>${stats.drawCalls.avg}</td></tr>
      </tbody>
    </table>
    <div class="tip">Tip: each chart has an Export PNG button for individual export.</div>
  </div>

  <script>
    const data = ${JSON.stringify(chartData)};

    const chartRegistry = {};
    const saveChart = (chart, fileName) => {
      const url = chart.getDataURL({
        type: 'png',
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
    };

    const buildFileName = (value) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const buildLineOption = (seriesName, yName, color, values) => ({
      animation: false,
      title: {
        text: seriesName,
        left: 'center',
        top: 4,
        textStyle: { fontSize: 14, fontWeight: 600 }
      },
      legend: {
        top: 30,
        data: [seriesName]
      },
      toolbox: {
        right: 8,
        top: 0,
        feature: {
          saveAsImage: {
            type: 'png',
            pixelRatio: 3,
            name: \`performance_\${buildFileName(seriesName)}_last60s\`
          }
        }
      },
      tooltip: { trigger: 'axis' },
      grid: { left: '9%', right: '6%', top: 72, bottom: 38 },
      xAxis: {
        type: 'value',
        name: 't(s)',
        min: 0,
        max: 60,
        interval: 5,
        scale: false,
        axisLabel: {
          formatter: (value) => String(Math.round(value))
        }
      },
      yAxis: { type: 'value', name: yName, scale: true },
      series: [{
        name: seriesName,
        type: 'line',
        data: data.labels.map((time, index) => [time, values[index]]),
        smooth: true,
        showSymbol: false,
        lineStyle: { color, width: 2 },
        itemStyle: { color }
      }]
    });

    chartRegistry.ft = echarts.init(document.getElementById('chart-ft'));
    chartRegistry.triangles = echarts.init(document.getElementById('chart-triangles'));
    chartRegistry.fps = echarts.init(document.getElementById('chart-fps'));
    chartRegistry.drawCalls = echarts.init(document.getElementById('chart-drawcalls'));

    chartRegistry.ft.setOption(buildLineOption('FT (ms)', 'ms', '#F59E0B', data.frameTime));
    chartRegistry.triangles.setOption(buildLineOption('Triangle Count', 'count', '#8B5CF6', data.triangles));
    chartRegistry.fps.setOption(buildLineOption('FPS', 'fps', '#10B981', data.fps));
    chartRegistry.drawCalls.setOption(buildLineOption('DrawCall Count', 'count', '#3B82F6', data.drawCalls));

    window.exportChart = (chartKey) => {
      const chart = chartRegistry[chartKey];
      if (!chart) return;
      saveChart(chart, \`performance_\${chartKey}_last60s.png\`);
    };

    window.addEventListener('resize', () => {
      Object.values(chartRegistry).forEach((chart) => chart.resize());
    });
  </script>
</body>
</html>`;
};

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const findHeaderIndex = (headers: string[], candidates: string[]) => {
  const normalizedHeaders = headers.map((header) =>
    header.toLowerCase().replaceAll(' ', '').replaceAll('-', '_')
  );
  for (const candidate of candidates) {
    const normalizedCandidate = candidate
      .toLowerCase()
      .replaceAll(' ', '')
      .replaceAll('-', '_');
    const index = normalizedHeaders.indexOf(normalizedCandidate);
    if (index >= 0) {
      return index;
    }
  }
  return -1;
};

const parseCsvMetrics = (text: string, fileName: string): CsvComparisonDataset | null => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return null;
  }

  const headers = lines[0].split(',').map((header) => header.trim());
  const timeIndex = findHeaderIndex(headers, ['relative_time_s', 'time_s']);
  const ftIndex = findHeaderIndex(headers, ['ft_ms', 'frame_time_ms']);
  const trianglesIndex = findHeaderIndex(headers, ['triangle_count', 'triangles']);
  const fpsIndex = findHeaderIndex(headers, ['fps']);
  const drawCallsIndex = findHeaderIndex(headers, ['drawcall_count', 'draw_calls']);

  if (
    timeIndex < 0 ||
    ftIndex < 0 ||
    trianglesIndex < 0 ||
    fpsIndex < 0 ||
    drawCallsIndex < 0
  ) {
    return null;
  }

  const rows: {
    time: number;
    frameTime: number;
    triangles: number;
    fps: number;
    drawCalls: number;
  }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',').map((column) => column.trim());
    const time = Number.parseFloat(columns[timeIndex] ?? '');
    const frameTime = Number.parseFloat(columns[ftIndex] ?? '');
    const triangles = Number.parseFloat(columns[trianglesIndex] ?? '');
    const fps = Number.parseFloat(columns[fpsIndex] ?? '');
    const drawCalls = Number.parseFloat(columns[drawCallsIndex] ?? '');

    if (
      Number.isFinite(time) &&
      Number.isFinite(frameTime) &&
      Number.isFinite(triangles) &&
      Number.isFinite(fps) &&
      Number.isFinite(drawCalls)
    ) {
      rows.push({ time, frameTime, triangles, fps, drawCalls });
    }
  }

  if (rows.length === 0) {
    return null;
  }

  rows.sort((a, b) => a.time - b.time);
  const startTime = rows[0].time;

  return {
    name: fileName,
    times: rows.map((row) => Number((row.time - startTime).toFixed(3))),
    frameTime: rows.map((row) => row.frameTime),
    triangles: rows.map((row) => row.triangles),
    fps: rows.map((row) => row.fps),
    drawCalls: rows.map((row) => row.drawCalls),
  };
};

const getComparisonMetricValues = (
  dataset: CsvComparisonDataset,
  key: ComparisonMetricKey
) => {
  if (key === 'ft') return dataset.frameTime;
  if (key === 'triangles') return dataset.triangles;
  if (key === 'fps') return dataset.fps;
  return dataset.drawCalls;
};

const buildComparisonMetricHtml = (
  datasets: CsvComparisonDataset[],
  config: ComparisonMetricConfig
) => {
  const chartData = datasets.map((dataset) => {
    const values = getComparisonMetricValues(dataset, config.key);
    return {
      name: dataset.name,
      points: dataset.times.map((time, index) => [
        time,
        Number(values[index].toFixed(config.fractionDigits)),
      ]),
    };
  });

  const summaryRows = datasets
    .map((dataset) => {
      const values = getComparisonMetricValues(dataset, config.key);
      const metricStats = toMetricStats(values, config.fractionDigits);
      return `
        <tr>
          <td>${escapeHtml(dataset.name)}</td>
          <td>${metricStats.min}</td>
          <td>${metricStats.max}</td>
          <td>${metricStats.avg}</td>
        </tr>
      `;
    })
    .join('');

  const pngBaseName = config.fileName.replace(/\.html$/i, '');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${config.title} Comparison Report</title>
  <script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 24px;
      background: #f7f8fb;
      color: #1f2937;
      font-family: "Times New Roman", "Noto Serif SC", serif;
    }
    .report-container {
      max-width: 1100px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d8dee9;
      border-radius: 8px;
      padding: 24px;
      box-sizing: border-box;
    }
    h1 {
      margin: 0;
      text-align: center;
      font-size: 24px;
      font-weight: 600;
    }
    .subtitle {
      margin: 10px 0 12px;
      text-align: center;
      color: #4b5563;
      font-size: 14px;
    }
    .export-row {
      display: flex;
      justify-content: center;
      margin-bottom: 10px;
    }
    .export-btn {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #ffffff;
      font-size: 13px;
      padding: 6px 14px;
      cursor: pointer;
    }
    .export-btn:hover {
      background: #f1f5f9;
    }
    #chart {
      width: 100%;
      height: 430px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 10px;
      text-align: center;
    }
    th {
      background: #f3f4f6;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <h1>${config.title} Comparison Report</h1>
    <div class="subtitle">Overlay of imported CSV datasets (x-axis: relative time in seconds)</div>
    <div class="export-row">
      <button class="export-btn" onclick="exportMetricChart()">Export PNG</button>
    </div>
    <div id="chart"></div>
    <table>
      <thead>
        <tr>
          <th>Dataset</th>
          <th>Min</th>
          <th>Max</th>
          <th>Average</th>
        </tr>
      </thead>
      <tbody>
        ${summaryRows}
      </tbody>
    </table>
  </div>

  <script>
    const datasets = ${JSON.stringify(chartData)};
    const chart = echarts.init(document.getElementById('chart'));
    const colorPalette = [
      '#2563EB', '#DC2626', '#059669', '#D97706', '#7C3AED',
      '#0EA5E9', '#DB2777', '#65A30D', '#4338CA', '#0891B2'
    ];

    const option = {
      animation: false,
      color: colorPalette,
      title: {
        text: '${config.title}',
        left: 'center',
        top: 4,
        textStyle: { fontSize: 14, fontWeight: 600 }
      },
      legend: {
        type: 'scroll',
        top: 30,
        data: datasets.map((dataset) => dataset.name)
      },
      toolbox: {
        right: 8,
        top: 0,
        feature: {
          saveAsImage: {
            type: 'png',
            pixelRatio: 3,
            name: '${pngBaseName}'
          }
        }
      },
      tooltip: { trigger: 'axis' },
      grid: { left: '9%', right: '6%', top: 82, bottom: 45 },
      xAxis: {
        type: 'value',
        name: 't(s)',
        min: 0,
        max: 60,
        interval: 5,
        scale: false,
        axisLabel: {
          formatter: (value) => String(Math.round(value))
        }
      },
      yAxis: { type: 'value', name: '${config.yAxisName}', scale: true },
      series: datasets.map((dataset, index) => ({
        name: dataset.name,
        type: 'line',
        data: dataset.points,
        showSymbol: false,
        smooth: true,
        lineStyle: {
          width: 2,
          color: colorPalette[index % colorPalette.length]
        }
      }))
    };

    chart.setOption(option);

    window.exportMetricChart = () => {
      const url = chart.getDataURL({
        type: 'png',
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.href = url;
      link.download = '${pngBaseName}.png';
      link.click();
    };

    window.addEventListener('resize', () => chart.resize());
  </script>
</body>
</html>`;
};

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
    if (!viewer || !containerRef.current || viewer.isDestroyed()) {
      return;
    }

    let isMounted = true;

    const initializeStats = () => {
      if (!viewer || viewer.isDestroyed() || !viewer.scene) {
        timeoutRef.current = setTimeout(() => {
          if (isMounted && viewer && !viewer.isDestroyed() && viewer.scene) {
            initializeStats();
          }
        }, 100);
        return;
      }

      if (!isMounted || viewer.isDestroyed() || !viewer.scene) {
        return;
      }

      const containerEl = containerRef.current;
      if (!containerEl) {
        return;
      }
      containerElRef.current = containerEl;

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

      if (style) {
        Object.assign(statsContainer.style, style);
      }

      containerEl.style.position = 'relative';
      containerEl.appendChild(statsContainer);
      statsContainerRef.current = statsContainer;

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
        canvas.width = CHART_WIDTH;
        canvas.height = CHART_HEIGHT;
        canvas.style.width = `${CHART_WIDTH}px`;
        canvas.style.height = `${CHART_HEIGHT}px`;
        canvas.style.borderRadius = '3px';
        canvas.style.background = 'rgba(0, 0, 0, 0.25)';

        block.appendChild(canvas);
        chartsWrapper.appendChild(block);
        return canvas;
      };

      const fpsCanvas = createChartBlock('#4caf50');
      const frameTimeCanvas = createChartBlock('#ffb74d');
      const drawCallsCanvas = createChartBlock('#29b6f6');

      let frameCount = 0;
      let lastFpsUpdate = performance.now();
      const startTime = performance.now();

      const timeHistory: number[] = [];
      const fpsHistory: number[] = [];
      const frameTimeHistory: number[] = [];
      const drawCallsHistory: number[] = [];
      const trianglesHistory: number[] = [];

      const getRecentMetrics = (): RecentMetrics | null => {
        if (timeHistory.length === 0) return null;
        const latest = timeHistory[timeHistory.length - 1];
        const cutoff = latest - RECENT_WINDOW_SECONDS;

        const times: number[] = [];
        const frameTimes: number[] = [];
        const triangles: number[] = [];
        const fpsValues: number[] = [];
        const drawCalls: number[] = [];

        for (let i = 0; i < timeHistory.length; i++) {
          if (timeHistory[i] >= cutoff) {
            times.push(timeHistory[i]);
            frameTimes.push(frameTimeHistory[i]);
            triangles.push(trianglesHistory[i]);
            fpsValues.push(fpsHistory[i]);
            drawCalls.push(drawCallsHistory[i]);
          }
        }

        if (times.length === 0) return null;
        const start = times[0];
        return {
          relativeTimes: times.map((time) => time - start),
          frameTimeValues: frameTimes,
          trianglesValues: triangles,
          fpsValues,
          drawCallValues: drawCalls,
        };
      };

      const trimToRecentWindow = (latestTime: number) => {
        const cutoff = latestTime - RECENT_WINDOW_SECONDS;
        while (timeHistory.length > 0 && timeHistory[0] < cutoff) {
          timeHistory.shift();
          fpsHistory.shift();
          frameTimeHistory.shift();
          drawCallsHistory.shift();
          trianglesHistory.shift();
        }
      };

      const exportRecentMetrics = () => {
        const recent = getRecentMetrics();
        if (!recent) return false;

        const rows: string[] = ['relative_time_s,FT_ms,Triangle_Count,FPS,DrawCall_Count'];
        for (let i = 0; i < recent.relativeTimes.length; i++) {
          rows.push(
            [
              recent.relativeTimes[i].toFixed(2),
              recent.frameTimeValues[i].toFixed(3),
              recent.trianglesValues[i],
              recent.fpsValues[i],
              recent.drawCallValues[i],
            ].join(',')
          );
        }

        triggerTextDownload(
          `performance_report_last60s_${Date.now()}.csv`,
          rows.join('\n'),
          'text/csv;charset=utf-8;'
        );
        return true;
      };

      const exportRecentMetricsChart = () => {
        const recent = getRecentMetrics();
        if (!recent) return false;

        const html = buildReportHtml(
          {
            labels: recent.relativeTimes.map((time) => Number(time.toFixed(2))),
            frameTime: recent.frameTimeValues.map((value) => Number(value.toFixed(3))),
            triangles: recent.trianglesValues,
            fps: recent.fpsValues,
            drawCalls: recent.drawCallValues,
          },
          {
            ft: toMetricStats(recent.frameTimeValues, 3),
            triangles: toMetricStats(recent.trianglesValues, 0),
            fps: toMetricStats(recent.fpsValues, 2),
            drawCalls: toMetricStats(recent.drawCallValues, 2),
          }
        );

        triggerTextDownload(
          `performance_chart_last60s_${Date.now()}.html`,
          html,
          'text/html;charset=utf-8;'
        );
        return true;
      };

      const exportComparisonChart = () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.csv,text/csv';
        fileInput.multiple = true;

        fileInput.onchange = async () => {
          const selectedFiles = Array.from(fileInput.files ?? []);
          if (selectedFiles.length === 0) {
            return;
          }

          const parsedDatasets: CsvComparisonDataset[] = [];
          for (const file of selectedFiles) {
            try {
              const text = await file.text();
              const dataset = parseCsvMetrics(text, file.name);
              if (dataset) {
                parsedDatasets.push(dataset);
              }
            } catch (error) {
              console.warn(`Failed to parse CSV file: ${file.name}`, error);
            }
          }

          if (parsedDatasets.length === 0) {
            console.warn('No valid CSV datasets found for comparison export.');
            return;
          }

          const metricConfigs: ComparisonMetricConfig[] = [
            {
              key: 'ft',
              title: 'FT (ms)',
              yAxisName: 'ms',
              fileName: '01_ft_comparison.html',
              fractionDigits: 3,
            },
            {
              key: 'triangles',
              title: 'Triangle Count',
              yAxisName: 'count',
              fileName: '02_triangle_count_comparison.html',
              fractionDigits: 0,
            },
            {
              key: 'fps',
              title: 'FPS',
              yAxisName: 'fps',
              fileName: '03_fps_comparison.html',
              fractionDigits: 2,
            },
            {
              key: 'drawCalls',
              title: 'DrawCall Count',
              yAxisName: 'count',
              fileName: '04_drawcall_count_comparison.html',
              fractionDigits: 2,
            },
          ];

          const exportedFiles = metricConfigs.map((config) => ({
            fileName: config.fileName,
            content: buildComparisonMetricHtml(parsedDatasets, config),
          }));

          const folderName = `performance_comparison_${Date.now()}`;
          const fsWindow = window as Window & {
            showDirectoryPicker?: () => Promise<{
              getDirectoryHandle: (
                name: string,
                options?: { create?: boolean }
              ) => Promise<{
                getFileHandle: (
                  name: string,
                  options?: { create?: boolean }
                ) => Promise<{
                  createWritable: () => Promise<{
                    write: (data: string) => Promise<void>;
                    close: () => Promise<void>;
                  }>;
                }>;
              }>;
            }>;
          };

          if (typeof fsWindow.showDirectoryPicker === 'function') {
            try {
              const rootDir = await fsWindow.showDirectoryPicker();
              const targetDir = await rootDir.getDirectoryHandle(folderName, { create: true });
              for (const file of exportedFiles) {
                const fileHandle = await targetDir.getFileHandle(file.fileName, { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(file.content);
                await writable.close();
              }
              return;
            } catch (error) {
              const errorName =
                typeof error === 'object' && error && 'name' in error
                  ? String((error as { name?: string }).name)
                  : '';
              if (errorName === 'AbortError') {
                return;
              }
              console.warn('Directory export unavailable. Fallback to direct downloads.', error);
            }
          }

          for (const file of exportedFiles) {
            triggerTextDownload(
              `${folderName}_${file.fileName}`,
              file.content,
              'text/html;charset=utf-8;'
            );
          }
        };

        fileInput.click();
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

        const width = canvas.width;
        const height = canvas.height;
        const padding = 18;

        ctx.clearRect(0, 0, width, height);

        const latestTime = times[times.length - 1];
        const cutoffTime = latestTime - RECENT_WINDOW_SECONDS;
        const filteredTimes: number[] = [];
        const filteredValues: number[] = [];

        for (let i = 0; i < times.length; i++) {
          if (times[i] >= cutoffTime) {
            filteredTimes.push(times[i]);
            filteredValues.push(values[i]);
          }
        }

        if (filteredTimes.length === 0) return;

        const tMin = filteredTimes[0];
        const tMax = filteredTimes[filteredTimes.length - 1];
        const timeRange = Math.max(1, tMax - tMin);
        const vMin = Math.min(...filteredValues);
        const vMax = Math.max(...filteredValues);
        const valueRange = vMax - vMin || 1;

        const xScale = (time: number) =>
          padding + ((time - tMin) / timeRange) * (width - padding * 2);
        const yScale = (value: number) =>
          height - padding - ((value - vMin) / valueRange) * (height - padding * 2);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
          const y = padding + ((height - padding * 2) / 4) * i;
          ctx.beginPath();
          ctx.moveTo(padding, y);
          ctx.lineTo(width - padding, y);
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        filteredValues.forEach((value, index) => {
          const x = xScale(filteredTimes[index]);
          const y = yScale(value);
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        const latestX = xScale(filteredTimes[filteredTimes.length - 1]);
        const latestY = yScale(filteredValues[filteredValues.length - 1]);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(latestX, latestY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '10px monospace';
        ctx.fillText(`t=${tMax.toFixed(1)}s`, width - padding - 48, height - 6);
        ctx.fillText(`${vMax.toFixed(1)}`, padding, yScale(vMax) - 6);
        ctx.fillText(`${vMin.toFixed(1)}`, padding, Math.min(height - 6, yScale(vMin) + 12));
      };

      const renderListener = () => {
        if (!isMounted || !viewer || viewer.isDestroyed() || !viewer.scene) {
          return;
        }

        frameCount++;
        const now = performance.now();
        const delta = now - lastFpsUpdate;
        if (delta <= 1000) {
          return;
        }

        const fps = Math.round((frameCount * 1000) / delta);
        const frameTime = delta / frameCount;
        const elapsedSeconds = (now - startTime) / 1000;

        let drawCalls = 0;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const frameState = (viewer.scene as any).frameState;
          if (frameState?.commandList) {
            drawCalls = frameState.commandList.length;
          }
        } catch (error) {
          console.warn('Failed to get draw calls:', error);
        }

        let tilesetStatsHtml = '';
        let tilesetFound = false;
        let tilesetStatsFound = false;
        const primitives = viewer.scene.primitives;

        let totalTexturesBytes = 0;
        let totalGeometryBytes = 0;
        let totalVisited = 0;
        let totalTriangles = 0;
        let totalFeatures = 0;

        for (let i = 0; i < primitives.length; i++) {
          const primitive = primitives.get(i);
          if (!(primitive instanceof Cesium3DTileset)) continue;

          tilesetFound = true;
          const tileset = primitive as TilesetInternal;
          const stats = tileset.statistics;
          if (!stats) continue;

          tilesetStatsFound = true;
          totalTexturesBytes += stats.texturesByteLength ?? 0;
          totalGeometryBytes += stats.geometryByteLength ?? 0;
          totalVisited += stats.visited ?? 0;

          let triangles = stats.numberOfTrianglesSelected ?? 0;
          if (triangles === 0 && tileset._selectedTiles?.length) {
            for (const tile of tileset._selectedTiles) {
              triangles += getContentTriangles(tile.content);
            }
          }
          totalTriangles += triangles;
          totalFeatures += stats.numberOfFeaturesSelected ?? stats.numberOfFeaturesLoaded ?? 0;
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
          tilesetStatsHtml = '<br/>--- 3D Tileset ---<br/>(Waiting for stats...)';
        }

        timeHistory.push(elapsedSeconds);
        fpsHistory.push(fps);
        frameTimeHistory.push(frameTime);
        drawCallsHistory.push(drawCalls);
        trianglesHistory.push(totalTriangles);
        trimToRecentWindow(elapsedSeconds);

        if (summaryDiv.parentNode) {
          summaryDiv.innerHTML = `
            FPS: ${fps} | FT: ${frameTime.toFixed(2)} ms | DrawCall: ${drawCalls} | Triangle Count: ${totalTriangles.toLocaleString()}
            ${tilesetStatsHtml}
          `;
        }

        drawLineChart(fpsCanvas, timeHistory, fpsHistory, '#4caf50');
        drawLineChart(frameTimeCanvas, timeHistory, frameTimeHistory, '#ffb74d');
        drawLineChart(drawCallsCanvas, timeHistory, drawCallsHistory, '#29b6f6');

        lastFpsUpdate = now;
        frameCount = 0;
      };

      renderListenerRef.current = renderListener;
      try {
        onRegisterExporter?.({
          exportCsv: exportRecentMetrics,
          exportChart: exportRecentMetricsChart,
          exportComparisonChart,
        });
        viewer.scene.postRender.addEventListener(renderListener);
      } catch (error) {
        console.error('Failed to add render listener:', error);
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

  return null;
}
