import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import type { CesiumViewerRef, TilesetTransformOptions } from '../../types';
import './layerController.css';
import { EyeIcon, EyeOffIcon, TrashIcon, FlyToIcon, EditIcon } from './icons'; // 引入图标

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
    const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
    const [translationInput, setTranslationInput] = useState({ x: '0', y: '0', z: '0' });
    const [rotationInput, setRotationInput] = useState({ headingDeg: '0', pitchDeg: '0', rollDeg: '0' });
    const [scaleInput, setScaleInput] = useState('1');

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

    const refreshLayers = useCallback(() => {
        if (cesiumViewerRef.current) {
            try {
                const currentLayers = cesiumViewerRef.current.getTilesetLayers();
                setLayers(currentLayers);
            } catch (error) {
                console.error('Error getting tileset layers:', error);
                setLayers([]);
            }
        }
    }, [cesiumViewerRef]);

    useEffect(() => {
        if (isOpen) {
            refreshLayers();
            // 将窗口置于顶层
            if (windowRef.current) {
                windowRef.current.focus();
            }
        }
    }, [isOpen, refreshLayers]);
    
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

    const openEdit = (layer: Layer) => {
        setEditingLayerId((prev) => (prev === layer.id ? null : layer.id));
        // 重置输入为默认
        setTranslationInput({ x: '0', y: '0', z: '0' });
        setRotationInput({ headingDeg: '0', pitchDeg: '0', rollDeg: '0' });
        setScaleInput('1');
    };

    const handleInput = <T extends Record<string, string>>(
        setter: Dispatch<SetStateAction<T>>,
        key: keyof T,
    ) => (e: ChangeEvent<HTMLInputElement>) => {
        setter((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const safeNumber = (val: string, fallback = 0) => {
        const num = parseFloat(val);
        return Number.isNaN(num) ? fallback : num;
    };

    const applyTransform = (layer: Layer) => {
        const options: TilesetTransformOptions = {
            translation: {
                x: safeNumber(translationInput.x, 0),
                y: safeNumber(translationInput.y, 0),
                z: safeNumber(translationInput.z, 0),
            },
            rotation: {
                headingDeg: safeNumber(rotationInput.headingDeg, 0),
                pitchDeg: safeNumber(rotationInput.pitchDeg, 0),
                rollDeg: safeNumber(rotationInput.rollDeg, 0),
            },
            scale: safeNumber(scaleInput, 1),
        };
        cesiumViewerRef.current?.setTilesetTransformForLayer(layer.id, options);
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
                                        className="action-btn"
                                        onClick={() => openEdit(layer)}
                                        aria-label="编辑变换"
                                    >
                                        <EditIcon />
                                    </button>
                                    <button
                                        className="action-btn remove-btn"
                                        onClick={() => handleRemoveLayer(layer)}
                                        aria-label="移除图层"
                                    >
                                        <TrashIcon />
                                    </button>
                                </div>
                                {editingLayerId === layer.id && (
                                    <div className="layer-transform-panel">
                                        <div className="transform-row">
                                            <div className="transform-label">平移 (m)</div>
                                            <div className="transform-inputs">
                                                <label>
                                                    X
                                                    <input
                                                        type="number"
                                                        value={translationInput.x}
                                                        onChange={handleInput(setTranslationInput, 'x')}
                                                    />
                                                </label>
                                                <label>
                                                    Y
                                                    <input
                                                        type="number"
                                                        value={translationInput.y}
                                                        onChange={handleInput(setTranslationInput, 'y')}
                                                    />
                                                </label>
                                                <label>
                                                    Z
                                                    <input
                                                        type="number"
                                                        value={translationInput.z}
                                                        onChange={handleInput(setTranslationInput, 'z')}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="transform-row">
                                            <div className="transform-label">旋转 (度)</div>
                                            <div className="transform-inputs">
                                                <label>
                                                    Heading
                                                    <input
                                                        type="number"
                                                        value={rotationInput.headingDeg}
                                                        onChange={handleInput(setRotationInput, 'headingDeg')}
                                                    />
                                                </label>
                                                <label>
                                                    Pitch
                                                    <input
                                                        type="number"
                                                        value={rotationInput.pitchDeg}
                                                        onChange={handleInput(setRotationInput, 'pitchDeg')}
                                                    />
                                                </label>
                                                <label>
                                                    Roll
                                                    <input
                                                        type="number"
                                                        value={rotationInput.rollDeg}
                                                        onChange={handleInput(setRotationInput, 'rollDeg')}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="transform-row">
                                            <div className="transform-label">缩放</div>
                                            <div className="transform-inputs">
                                                <label>
                                                    Scale
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={scaleInput}
                                                        onChange={(e) => setScaleInput(e.target.value)}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                        <div className="transform-actions">
                                            <button className="transform-apply-btn" onClick={() => applyTransform(layer)}>
                                                应用
                                            </button>
                                            <button className="transform-cancel-btn" onClick={() => setEditingLayerId(null)}>
                                                关闭
                                            </button>
                                        </div>
                                    </div>
                                )}
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
