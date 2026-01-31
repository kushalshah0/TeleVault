import { useState, useEffect } from 'react';
import { storageAPI } from '../api';
import { Card, EmptyState } from './ui';
import { ModernLoader } from './ModernLoader';

function ActivityView() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const response = await storageAPI.getActivities(100);
      setActivities(response.data.activities);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getActivityIcon = (type) => {
    const iconMap = {
      login: '🔐',
      register: '👤',
      storage_create: '📦',
      storage_delete: '🗑️',
      folder_create: '📁',
      folder_delete: '🗑️',
      file_upload: '⬆️',
      file_download: '⬇️',
      file_delete: '🗑️',
      file_preview: '👁️',
    };
    return iconMap[type] || '📋';
  };

  const getActivityColor = (type) => {
    if (type.includes('delete')) return 'text-red-600 dark:text-red-400';
    if (type.includes('create') || type.includes('upload')) return 'text-green-600 dark:text-green-400';
    if (type.includes('download')) return 'text-blue-600 dark:text-blue-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Recent Activity
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Your activity history across all storages
          </p>
        </div>
        <div className="flex justify-center items-center py-12">
          <ModernLoader text="Loading activities..." type="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Recent Activity
          </h1>
        </div>
        <EmptyState
          icon="❌"
          title="Error Loading Activities"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Recent Activity
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          Your activity history across all storages ({activities.length} activities)
        </p>
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No Activity Yet"
          description="Your activities will appear here as you use TeleVault"
        />
      ) : (
        <Card>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {activities.map((activity, index) => (
              <div
                key={`${activity.id}-${index}`}
                className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`text-2xl ${getActivityColor(activity.activity_type)}`}>
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                      <span>{formatDate(activity.created_at)}</span>
                      {activity.storage_name && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span>📦</span>
                            <span>{activity.storage_name}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default ActivityView;
