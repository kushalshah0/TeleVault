'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { starredUtils } from '../utils/starred';
import { Card, EmptyState, FileIcon, Button, ViewModeToggle } from './ui';

interface StarredItem {
  id: number;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  storage_id: number;
  storageName: string;
  starredAt: string;
}

function StarredView() {
  const [starredItems, setStarredItems] = useState<StarredItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const router = useRouter();

  useEffect(() => {
    loadStarred();
  }, []);

  const loadStarred = () => {
    const starred = starredUtils.getStarred();
    setStarredItems(starred);
  };

  const handleUnstar = (itemId: number, itemType: 'file' | 'folder') => {
    starredUtils.removeStarred(itemId, itemType);
    loadStarred();
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getItemTypeLabel = (type: 'file' | 'folder'): string => {
    return type === 'folder' ? 'Folder' : 'File';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Starred
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Your favorite files and folders
          </p>
        </div>
        {starredItems.length > 0 && (
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
        )}
      </div>

      {/* Starred Items List */}
      {starredItems.length === 0 ? (
        <EmptyState
          icon={<span className="text-6xl">⭐</span>}
          title="No starred items"
          description="Star your favorite files and folders for quick access"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {starredItems.map((item, index) => (
            <Card
              key={`${item.id}-${item.type}-${index}`}
              hover
              onClick={() => router.push(`/storage/${item.storage_id}`)}
              className="group cursor-pointer transition-all relative"
            >
              <div className="p-4 flex flex-col items-center">
                {/* Unstar Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnstar(item.id, item.type);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 
                    transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  title="Remove from starred"
                >
                  <span className="text-yellow-500">⭐</span>
                </button>

                <div className="mb-3 transform group-hover:scale-110 transition-transform">
                  <FileIcon 
                    type={item.type === 'folder' ? 'folder' : undefined}
                    mimeType={item.mimeType} 
                    size="xl" 
                  />
                </div>
                <div className="w-full min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 text-center 
                    px-1 break-words line-clamp-2" 
                    title={item.name}
                    style={{ wordBreak: 'break-word', minHeight: '2.5rem' }}>
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {item.storageName}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {starredItems.map((item, index) => (
              <div
                key={`${item.id}-${item.type}-${index}`}
                onClick={() => router.push(`/storage/${item.storage_id}`)}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 
                  transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <FileIcon 
                    type={item.type === 'folder' ? 'folder' : undefined}
                    mimeType={item.mimeType} 
                    size="lg" 
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <span>{item.storageName}</span>
                      <span>•</span>
                      <span>{getItemTypeLabel(item.type)}</span>
                      <span>•</span>
                      <span>{formatDate(item.starredAt)}</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnstar(item.id, item.type);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity 
                      p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    title="Remove from starred"
                  >
                    <span className="text-yellow-500 text-xl">⭐</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default StarredView;
