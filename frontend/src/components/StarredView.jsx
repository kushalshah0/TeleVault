import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { starredUtils } from '../utils/starred';
import { Card, EmptyState, FileIcon, Button } from './ui';

function StarredView() {
  const [starredItems, setStarredItems] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadStarred();
  }, []);

  const loadStarred = () => {
    const starred = starredUtils.getStarred();
    setStarredItems(starred);
  };

  const handleUnstar = (itemId, itemType) => {
    starredUtils.removeStarred(itemId, itemType);
    loadStarred();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
      </div>

      {/* Starred Items List */}
      {starredItems.length === 0 ? (
        <EmptyState
          icon="⭐"
          title="No starred items"
          description="Star your favorite files and folders for quick access"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {starredItems.map((item, index) => (
            <Card
              key={`${item.id}-${item.type}-${index}`}
              hover
              onClick={() => navigate(`/storage/${item.storageId}`)}
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
      )}
    </div>
  );
}

export default StarredView;
