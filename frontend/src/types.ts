// frontend/src/types.ts

export interface TilesetLayerInfo {
  id: string;
  name: string;
  url: string;
  show: boolean;
}

export interface CesiumViewerHandles {
  loadTileset: (url: string) => Promise<void>;
  getTilesetLayers: () => TilesetLayerInfo[];
  removeTileset: (id: string) => void;
  toggleTilesetVisibility: (id: string, show: boolean) => void;
  setLayerName: (id: string, name: string) => void;
  flyToTileset: (id: string) => void;
}

