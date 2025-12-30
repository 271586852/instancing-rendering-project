import { useState, useEffect, useRef } from 'react';
import type { CesiumViewerRef } from '../../types';
import './layerController.css';

interface Layer {
    id: string;
    name: string;
    url: string;
    show: boolean;
}

interface LayerControllerProps {
    cesiumViewerRef: React.RefObject<CesiumViewerRef | null>;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * 图层管理器组件（包含悬浮窗口功能）
 * 可拖拽、可调整大小的独立窗口
 */
function LayerController({ cesiumViewerRef, isOpen, onClose }: LayerControllerProps) {
    const [layers, setLayers] = useState<Layer[]>([]);
    const [selectedLayer, setSelectedLayer] = useState<Layer | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    
    // 窗口相关状态
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [size, setSize] = useState({ width: 500, height: 600 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const windowRef = useRef<HTMLDivElement>(null);
        
    // 刷新图层列表的函数
    const refreshLayers = () => {
        if (cesiumViewerRef.current) {
            try {
                const layers = cesiumViewerRef.current.getTilesetLayers();
                console.log('Layers:', layers);
                setLayers(layers);
            } catch (error) {
                console.error('Error getting tileset layers:', error);
                setLayers([]);
            }
        }
    };

    // 当窗口打开时刷新图层列表
    useEffect(() => {
        if (isOpen) {
            refreshLayers();
        }
    }, [isOpen, cesiumViewerRef]);

    // 拖拽处理
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).classList.contains('layer-window-header')) {
            setIsDragging(true);
            setDragStart({
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            });
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y,
                });
            }
            if (isResizing) {
                const rect = windowRef.current?.getBoundingClientRect();
                if (rect) {
                    setSize({
                        width: Math.max(400, e.clientX - rect.left),
                        height: Math.max(300, e.clientY - rect.top),
                    });
                }
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragStart, position]);

    if (!isOpen) return null;

    return (
        <>
            {/* 遮罩层 */}
            <div className="layer-window-overlay" onClick={onClose} />
            
            {/* 悬浮窗口 */}
            <div
                ref={windowRef}
                className="layer-window"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                }}
            >
                {/* 窗口头部 */}
                <div
                    className="layer-window-header"
                    onMouseDown={handleMouseDown}
                >
                    <h2 className="layer-window-title">Layer Manager</h2>
                    <button
                        className="layer-window-close"
                        onClick={onClose}
                        aria-label="Close window"
                    >
                        ×
                    </button>
                </div>

                {/* 窗口内容 */}
                <div className="layer-window-content">
                    <div className="layer-controller-content">
                        <h1>Layer Controller</h1>
                        <div>
                            <input type="text" placeholder="Layer Name" />
                            <input type="text" placeholder="Layer URL" />
                            <button onClick={() => {
                                // cesiumViewerRef.current?.addTileset(layer.url);
                            }}>
                                Add
                            </button>
                        </div>
                        <div>
                            {layers.map((layer) => {
                                console.log('layers', layer);
                                return (
                                <div key={layer.id}>
                                    <h2>{layer.name}</h2>
                                    <div>
                                        <button onClick={() => {
                                            cesiumViewerRef.current?.toggleTilesetVisibility(layer.id, !layer.show);
                                            refreshLayers();
                                        }}>
                                            {layer.show ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <div>
                                        <button onClick={() => {
                                            cesiumViewerRef.current?.removeTileset(layer.id);
                                            refreshLayers();
                                        }}>
                                            Remove
                                        </button>
                                    </div>
                                    <div>
                                        <button onClick={() => {
                                            cesiumViewerRef.current?.loadTileset(layer.url);
                                            refreshLayers();
                                        }}>
                                            Load
                                        </button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 调整大小手柄 */}
                <div
                    className="layer-window-resize-handle"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setIsResizing(true);
                    }}
                />
            </div>
        </>
    );
}

export default LayerController;