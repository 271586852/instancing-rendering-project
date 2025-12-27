import { useState, useCallback } from 'react';
import type { AnalysisData } from '../types';
import { extractResultIdFromUrl } from '../utils';
import { INFO_MESSAGE_CLEAR_DELAY, DEFAULT_MESSAGES } from '../constants';

export function useInstancing() {
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(DEFAULT_MESSAGES.WELCOME);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);

  const handleUploadSuccess = useCallback((url: string, data: AnalysisData | null) => {
    setAnalysisData(data);
    setResultId(extractResultIdFromUrl(url));
    // 延迟清除信息消息，以便用户能看到"Loading model..."消息
    setTimeout(() => setInfoMessage(null), INFO_MESSAGE_CLEAR_DELAY);
  }, []);

  return {
    isLoading,
    setIsLoading,
    infoMessage,
    setInfoMessage,
    errorMessage,
    setErrorMessage,
    analysisData,
    resultId,
    handleUploadSuccess,
  };
}

