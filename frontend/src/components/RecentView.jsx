import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recentUtils } from '../utils/starred';
import { Card, EmptyState, FileIcon, Button } from './ui';

function RecentView() {
  const [recentFiles, setRecentFiles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = () => {
    const recent = recentUtils.getRecent();
    setRecentFiles(recent);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
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
        {recentFiles.length > 0 && (
          <Button variant="ghost" onClick={handleClearRecent}>
            Clear All
          </Button>
        )}
      </div>

      {/* Recent Files List */}
      {recentFiles.length === 0 ? (
        <EmptyState
          icon="🕒"
          title="No recent files"
          description="Files you access will appear here for quick access"
        />
      ) : (
        <Card>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentFiles.map((file, index) => (
              <div
                key={`${file.id}-${index}`}
                onClick={() => navigate(`/storage/${file.storageId}`)}
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
