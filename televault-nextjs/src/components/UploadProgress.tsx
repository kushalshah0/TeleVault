'use client'

import React, { useState } from 'react';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'pending';
}

interface UploadQueue {
  current: number;
  total: number;
}

interface UploadProgressProps {
  uploadingFiles: UploadFile[];
  uploadQueue: UploadQueue;
}

const UploadProgress = React.memo(({ 
  uploadingFiles,
  uploadQueue 
}: UploadProgressProps) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!uploadingFiles || uploadingFiles.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 shadow-2xl">
      {/* Google Drive Style Upload Panel */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
              {uploadQueue.total > 1 
                ? `Uploading ${uploadQueue.current} of ${uploadQueue.total} files`
                : 'Uploading file'
              }
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Content - Collapsible */}
        {!isMinimized && (
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {/* All Files Upload */}
            {uploadingFiles.map((file) => (
              <div key={file.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                {/* Circular Progress */}
                <div className="relative flex-shrink-0">
                  <svg className="w-10 h-10 transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 16}`}
                      strokeDashoffset={`${2 * Math.PI * 16 * (1 - file.progress / 100)}`}
                      className={`transition-all duration-300 ${
                        file.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                        file.status === 'error' ? 'text-red-600 dark:text-red-400' :
                        file.status === 'uploading' ? 'text-primary-600 dark:text-primary-400' :
                        'text-gray-400 dark:text-gray-600'
                      }`}
                      strokeLinecap="round"
                    />
                  </svg>
                  {/* Icon/Status in center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {file.status === 'completed' ? (
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : file.status === 'error' ? (
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : file.status === 'uploading' ? (
                      <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-normal text-gray-700 dark:text-gray-300 truncate">
                      {file.name}
                    </p>
                    {file.status === 'error' && (
                      <span className="text-xs font-normal ml-2 flex-shrink-0 text-red-600 dark:text-red-400">
                        Failed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                    {file.status === 'uploading' && (
                      <span className="text-xs text-primary-600 dark:text-primary-400">
                        {file.progress}%
                      </span>
                    )}
                  </div>
                  
                  {/* Progress bar - only show for uploading files */}
                  {file.status === 'uploading' && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-primary-600 dark:bg-primary-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Overall Progress (if multiple files) */}
            {uploadQueue.total > 1 && (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>{uploadQueue.current} of {uploadQueue.total} files uploaded</span>
                  <span>{Math.round((uploadQueue.current / uploadQueue.total) * 100)}% complete</span>
                </div>
                <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-green-600 dark:bg-green-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadQueue.current / uploadQueue.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

UploadProgress.displayName = 'UploadProgress';

export default UploadProgress;
