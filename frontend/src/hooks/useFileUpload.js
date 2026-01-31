import { useState } from 'react';
import { fileAPI } from '../api';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const uploadFile = async (storageId, file, folderId = null) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      const response = await fileAPI.upload(storageId, file, folderId, (progressValue) => {
        setProgress(progressValue);
      });
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Upload failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const reset = () => {
    setUploading(false);
    setProgress(0);
    setError(null);
  };

  return {
    uploading,
    progress,
    error,
    uploadFile,
    reset,
  };
}
