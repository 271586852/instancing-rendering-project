import { useState, useEffect, useRef } from 'react';
import type { CesiumViewerRef } from '../../types';
import './layerController.css';
import { EyeIcon, EyeOffIcon, TrashIcon, FlyToIcon } from './icons'; // 引入图标

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
 * 极简风格的图层管理器
 */
function LayerController({ cesiumViewerRef, isOpen, onClose }: LayerControllerProps) {
    const [layers, setLayers] = useState<Layer[]>([]);
    const windowRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // 窗口拖拽相关状态
    const [isDragging, setIsDragging] = useState(false);
    // `position` state to hold the final position and trigger re-render once.
    const [position, setPosition] = useState({ x: window.innerWidth - 370, y: 70 });
    // `positionRef` to directly manipulate DOM without re-rendering during drag.
    const positionRef = useRef(position);
    const dragStartOffset = useRef({ x: 0, y: 0 });

    // Sync state with ref whenever state changes.
    useEffect(() => {
        positionRef.current = position;
    }, [position]);

    const refreshLayers = () => {
        if (cesiumViewerRef.current) {
            try {
                const currentLayers = cesiumViewerRef.current.getTilesetLayers();
                setLayers(currentLayers);
            } catch (error) {
                console.error('Error getting tileset layers:', error);
                setLayers([]);
            }
        }
    };

    useEffect(() => {
        if (isOpen) {
            refreshLayers();
            // 将窗口置于顶层
            if (windowRef.current) {
                windowRef.current.focus();
            }
        }
    }, [isOpen]);
    
    // 拖拽事件处理
    const onDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        dragStartOffset.current = {
            x: e.clientX - positionRef.current.x,
            y: e.clientY - positionRef.current.y,
        };
        document.body.style.cursor = 'move';
    };

    useEffect(() => {
        const onDragMouseMove = (e: MouseEvent) => {
            if (!isDragging || !windowRef.current) return;
            const newX = e.clientX - dragStartOffset.current.x;
            const newY = e.clientY - dragStartOffset.current.y;
            
            // Directly update the DOM element's style. This is fast.
            windowRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
            
            // Also update the ref for the final state update on mouse up.
            positionRef.current = { x: newX, y: newY };
        };

        const onDragMouseUp = () => {
            if (!isDragging) return;
            setIsDragging(false);
            document.body.style.cursor = 'default';
            // On drag end, update the React state once.
            setPosition(positionRef.current);
        };

        if (isDragging) {
            window.addEventListener('mousemove', onDragMouseMove);
            window.addEventListener('mouseup', onDragMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', onDragMouseMove);
            window.removeEventListener('mouseup', onDragMouseUp);
        };
    }, [isDragging]);


    const handleToggleVisibility = (layer: Layer) => {
        cesiumViewerRef.current?.toggleTilesetVisibility(layer.id, !layer.show);
        refreshLayers();
    };

    const handleRemoveLayer = (layer: Layer) => {
        cesiumViewerRef.current?.removeTileset(layer.id);
        refreshLayers();
    };

    if (!isOpen) return null;

    return (
        <div
            ref={windowRef}
            className="layer-manager"
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
            }}
            tabIndex={-1}
        >
            <div className="layer-manager-header" onMouseDown={onDragMouseDown}>
                <span className="layer-manager-title">图层管理</span>
                <button
                    className="layer-manager-close-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    aria-label="关闭"
                >
                    &times;
                </button>
            </div>

            <div ref={contentRef} className="layer-manager-content">
                {layers.length > 0 ? (
                    <ul className="layer-list">
                        {layers.map((layer) => (
                            <li key={layer.id} className="layer-item">
                                <span className="layer-name" title={layer.name}>{layer.name}</span>
                                <div className="layer-actions">
                                    <button
                                        className="action-btn"
                                        onClick={() => cesiumViewerRef.current?.flyToTileset(layer.id)}
                                        aria-label="飞至图层"
                                    >
                                        <FlyToIcon />
                                    </button>
                                    <button
                                        className="action-btn"
                                        onClick={() => handleToggleVisibility(layer)}
                                        aria-label={layer.show ? '隐藏图层' : '显示图层'}
                                    >
                                        {layer.show ? <EyeIcon /> : <EyeOffIcon />}
                                    </button>
                                    <button
                                        className="action-btn remove-btn"
                                        onClick={() => handleRemoveLayer(layer)}
                                        aria-label="移除图层"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="empty-layers">
                        <p>当前无图层</p>
                    </div>
                )}
            </div>
            <div className="layer-manager-footer">
                <button className="refresh-btn" onClick={refreshLayers}>
                    刷新列表
                </button>
            </div>
        </div>
    );
}

export default LayerController;
