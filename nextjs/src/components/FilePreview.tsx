'use client'

import { useState, useEffect } from 'react';
import { Modal, Button } from './ui';
import { Loader } from './ModernLoader';
import FileIcon from './ui/FileIcon';
import './FilePreview.css';

interface FilePreviewProps {
  file: {
    id: number;
    name: string;
    size: number;
    mimeType?: string;
    mime_type?: string;
  };
  onClose: () => void;
  onDownload: (file: any, asBlob?: boolean) => Promise<Blob | undefined>;
}

function FilePreview({ file, onClose, onDownload }: FilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  // Support both camelCase (from Prisma) and snake_case (legacy)
  const mimeType = file.mimeType || file.mime_type;

  const isImage = mimeType?.startsWith('image/');
  const isPDF = mimeType === 'application/pdf';
  const isVideo = mimeType?.startsWith('video/');
  const isAudio = mimeType?.startsWith('audio/');
  const isText = mimeType?.startsWith('text/') ||
    ['application/json', 'application/javascript', 'application/xml'].includes(mimeType || '');

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

      if (!blob) throw new Error('Failed to download file content');

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

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };


  return (
    <Modal
      isOpen={true}
      onClose={handleClose}
      size="xl"
      showCloseButton={false}
    >
      <div className="space-y-4">
        {/* Compact Header with File Info */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <FileIcon mimeType={mimeType} size="md" />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-foreground truncate mb-1">
                {file.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} • {mimeType || 'Unknown type'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="hidden sm:flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" />
                <path d="M7 10L12 15L17 10" />
                <path d="M12 15V3" />
              </svg>
              Download
            </Button>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Download Button */}
        <div className="sm:hidden">
          <Button
            variant="primary"
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" />
              <path d="M7 10L12 15L17 10" />
              <path d="M12 15V3" />
            </svg>
            Download
          </Button>
        </div>

        {/* Preview Content */}
        <div className="file-preview-content">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader size="lg" />
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
                <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg p-2 sm:p-4">
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="max-w-full h-auto object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}

              {isPDF && previewUrl && (
                <div className="w-full h-[400px] sm:h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <iframe
                    src={previewUrl}
                    title={file.name}
                    className="w-full h-full rounded-lg"
                  />
                </div>
              )}

              {isVideo && previewUrl && (
                <div className="flex items-center justify-center bg-gray-900 rounded-lg p-2 sm:p-4">
                  <video
                    controls
                    controlsList="nodownload"
                    preload="auto"
                    playsInline
                    crossOrigin="anonymous"
                    src={previewUrl}
                    className="max-w-full max-h-[50vh] sm:max-h-[600px] rounded-lg w-full"
                    onLoadedMetadata={(e) => {
                      // Ensure audio is enabled
                      const video = e.target as HTMLVideoElement;
                      video.muted = false;
                      video.volume = 1.0;
                    }}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}

              {isAudio && previewUrl && (
                <div className="flex items-center justify-center py-16">
                  <div className="w-full max-w-md">
                    <div className="flex justify-center mb-6">
                      <FileIcon mimeType={mimeType} size="xl" />
                    </div>
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
                <div className="w-full h-[400px] sm:h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-auto">
                  <pre className="p-3 sm:p-4 text-xs sm:text-sm font-mono text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                    {textContent}
                  </pre>
                </div>
              )}
            </>
          )}

          {!loading && !error && !canPreview && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4">
                <FileIcon mimeType={mimeType} size="xl" />
              </div>
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
      </div>
    </Modal>
  );
}

export default FilePreview;
