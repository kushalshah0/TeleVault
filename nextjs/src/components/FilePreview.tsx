'use client'

import { useState, useEffect } from 'react';
import { Modal, Button } from './ui';
import { Loader } from './ModernLoader';
import FileIcon from './ui/FileIcon';
import { AlertCircle, RefreshCw, Download, X } from 'lucide-react';
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
              <Download className="w-4 h-4" />
              Download
            </Button>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-muted-foreground" />
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
            <Download className="w-4 h-4" />
            Download
          </Button>
        </div>

        {/* Preview Content */}
        <div className="file-preview-content">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader size="lg" />
              <p className="text-muted-foreground">Loading preview...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-destructive" />
              </div>
              <p className="text-foreground font-medium mb-1">Failed to load preview</p>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                The file could not be downloaded for preview. Try downloading it directly instead.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadPreview}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownload}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
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
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <FileIcon mimeType={mimeType} size="md" />
              </div>
              <p className="text-foreground font-medium mb-1">Preview not available</p>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-xs">
                This file type cannot be previewed in the browser. Download the file to view it.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default FilePreview;
