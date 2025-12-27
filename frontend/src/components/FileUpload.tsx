import React, { useState } from 'react';
import type { FileUploadProps } from '../types';
import { processModel } from '../services/api';
import { DEFAULT_CONFIG, DEFAULT_MESSAGES } from '../constants';

const FileUpload: React.FC<FileUploadProps> = ({ 
  onUploadSuccess, 
  setInfoMessage, 
  setErrorMessage,
  setIsLoading 
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tolerance, setTolerance] = useState<number>(DEFAULT_CONFIG.TOLERANCE);
  const [instanceLimit, setInstanceLimit] = useState<number>(DEFAULT_CONFIG.INSTANCE_LIMIT);
  const [mergeAllGlb, setMergeAllGlb] = useState<boolean>(DEFAULT_CONFIG.MERGE_ALL_GLB);
  const [meshSegmentation, setMeshSegmentation] = useState<boolean>(DEFAULT_CONFIG.MESH_SEGMENTATION);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.name.toLowerCase().endsWith('.glb')) {
        setSelectedFile(file);
        setErrorMessage(null); // Clear previous errors
      } else {
        setSelectedFile(null);
        setErrorMessage(DEFAULT_MESSAGES.INVALID_FILE);
      }
    }
  };

  const handleProcessClick = async () => {
    if (!selectedFile) {
      setErrorMessage(DEFAULT_MESSAGES.NO_FILE);
      return;
    }

    setIsLoading(true);
    setInfoMessage(DEFAULT_MESSAGES.UPLOADING);
    setErrorMessage(null);

    try {
      const response = await processModel({
        model: selectedFile,
        tolerance,
        instanceLimit,
        mergeAllGlb,
        meshSegmentation,
      });
      
      onUploadSuccess(response.tilesetUrl, response.analysis);
      setInfoMessage(DEFAULT_MESSAGES.SUCCESS);
    } catch (error) {
      console.error('Error during processing:', error);
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred.');
      setInfoMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="upload-section">
      <div className="file-input-wrapper">
        <label htmlFor="file-upload" className="file-label">
          {selectedFile ? 'Change GLB File' : 'Select GLB File'}
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".glb"
          onChange={handleFileChange}
        />
        {selectedFile && <p className="file-name">{selectedFile.name}</p>}
      </div>

      <button
        className="process-button"
        onClick={handleProcessClick}
        disabled={!selectedFile}
      >
        Process Model
      </button>

      <div className="options-section">
        <h3>Processing Options</h3>
        <div className="option-item">
            <label htmlFor="tolerance">Geometry Tolerance</label>
            <input 
                type="number" 
                id="tolerance" 
                value={tolerance}
                onChange={e => setTolerance(parseFloat(e.target.value) || 0.0)}
                step="0.001"
            />
        </div>
        <div className="option-item">
            <label htmlFor="instanceLimit">Instance Limit</label>
            <input 
                type="number" 
                id="instanceLimit" 
                value={instanceLimit}
                onChange={e => setInstanceLimit(parseInt(e.target.value) || 2)}
                min="2"
            />
        </div>
        <div className="option-item checkbox-item">
            <input 
                type="checkbox" 
                id="mergeAllGlb" 
                checked={mergeAllGlb}
                onChange={e => setMergeAllGlb(e.target.checked)}
            />
            <label htmlFor="mergeAllGlb">Merge All GLB Outputs</label>
        </div>
        <div className="option-item checkbox-item">
            <input 
                type="checkbox" 
                id="meshSegmentation" 
                checked={meshSegmentation}
                onChange={e => setMeshSegmentation(e.target.checked)}
            />
            <label htmlFor="meshSegmentation">Segment Each Mesh</label>
        </div>
      </div>
    </div>
  );
};

export default FileUpload; 