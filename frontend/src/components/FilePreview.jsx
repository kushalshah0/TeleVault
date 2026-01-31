import { useState, useEffect } from 'react';
import { Modal, Button } from './ui';
import './FilePreview.css';

function FilePreview({ file, onClose, onDownload }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);

  const isImage = file.mime_type?.startsWith('image/');
  const isPDF = file.mime_type === 'application/pdf';
  const isVideo = file.mime_type?.startsWith('video/');
  const isAudio = file.mime_type?.startsWith('audio/');
  const isText = file.mime_type?.startsWith('text/') || 
                 ['application/json', 'application/javascript', 'application/xml'].includes(file.mime_type);

  const canPreview = isImage || isPDF || isVideo || isAudio || isText;

  useEffect(() => {
    if (canPreview && !previewUrl) {
      loadPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const blob = await onDownload(file, true); // Download as blob
      
      // For text files, read the content directly
      if (isText) {
        const text = await blob.text();
        setTextContent(text);
      } else {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      setError('Failed to load preview');
      console.error('Preview error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    onClose();
  };

  const handleDownload = () => {
    onDownload(file);
    handleClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = () => {
    if (isImage) return '🖼️';
    if (isPDF) return '📄';
    if (isVideo) return '🎥';
    if (isAudio) return '🎵';
    if (isText) return '📝';
    return '📎';
  };

  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      size="xl"
      title={
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getFileIcon()}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {file.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(file.size)} • {file.mime_type || 'Unknown type'}
            </p>
          </div>
        </div>
      }
      footer={
        <Button icon="⬇️" onClick={handleDownload}>
          Download
        </Button>
      }
    >
      <div className="file-preview-content min-h-[400px]">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={handleDownload}>Download File Instead</Button>
          </div>
        )}

        {!loading && !error && (previewUrl || textContent) && (
          <>
            {isImage && previewUrl && (
              <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <img 
                  src={previewUrl} 
                  alt={file.name} 
                  className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm"
                />
              </div>
            )}

            {isPDF && previewUrl && (
              <div className="w-full h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg">
                <iframe 
                  src={previewUrl} 
                  title={file.name}
                  className="w-full h-full rounded-lg"
                />
              </div>
            )}

            {isVideo && previewUrl && (
              <div className="flex items-center justify-center bg-gray-900 rounded-lg p-4">
                <video 
                  controls 
                  src={previewUrl}
                  className="max-w-full max-h-[600px] rounded-lg"
                >
                  Your browser does not support video playback.
                </video>
              </div>
            )}

            {isAudio && previewUrl && (
              <div className="flex items-center justify-center py-16">
                <div className="w-full max-w-md">
                  <div className="text-6xl text-center mb-6">🎵</div>
                  <audio 
                    controls 
                    src={previewUrl}
                    className="w-full"
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              </div>
            )}

            {isText && textContent && (
              <div className="w-full h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto">
                <pre className="p-4 text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                  {textContent}
                </pre>
              </div>
            )}
          </>
        )}

        {!loading && !error && !canPreview && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="text-6xl mb-4">{getFileIcon()}</div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Preview not available
            </h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This file type cannot be previewed in the browser.
            </p>
            <Button onClick={handleDownload}>Download to View</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default FilePreview;
