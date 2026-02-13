'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { recentUtils } from '../utils/starred';
import { Card, EmptyState, FileIcon, Button, ViewModeToggle } from './ui';

interface RecentFile {
  id: number;
  name: string;
  mimeType: string;
  size: number;
  storage_id: number;
  storageName: string;
  accessedAt: string;
}

function RecentView() {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const router = useRouter();

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = () => {
    const recent = recentUtils.getRecent();
    setRecentFiles(recent);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleClearRecent = () => {
    if (confirm('Clear all recent files?')) {
      recentUtils.clearAll();
      setRecentFiles([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Recent Files
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Your recently accessed files
          </p>
        </div>
        <div className="flex items-center gap-3">
          {recentFiles.length > 0 && (
            <>
              <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
              <Button variant="ghost" onClick={handleClearRecent}>
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Recent Files List */}
      {recentFiles.length === 0 ? (
        <EmptyState
          icon={<span className="text-6xl">🕒</span>}
          title="No recent files"
          description="Files you access will appear here for quick access"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {recentFiles.map((file, index) => (
            <Card
              key={`${file.id}-${index}`}
              hover
              onClick={() => router.push(`/storage/${file.storage_id}`)}
              className="group cursor-pointer transition-all"
            >
              <div className="p-4 flex flex-col items-center">
                <div className="mb-3 transform group-hover:scale-110 transition-transform">
                  <FileIcon mimeType={file.mimeType} size="xl" />
                </div>
                <div className="w-full min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 text-center 
                    px-1 break-words line-clamp-2" 
                    title={file.name}
                    style={{ wordBreak: 'break-word', minHeight: '2.5rem' }}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {file.storageName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 text-center">
                    {formatDate(file.accessedAt)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentFiles.map((file, index) => (
              <div
                key={`${file.id}-${index}`}
                onClick={() => router.push(`/storage/${file.storage_id}`)}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 
                  transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <FileIcon mimeType={file.mimeType} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>{file.storageName}</span>
                      <span>•</span>
                      <span>{formatFileSize(file.size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.accessedAt)}</span>
                    </p>
                  </div>
                  <span className="text-primary-600 dark:text-primary-400 text-xl">→</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default RecentView;
