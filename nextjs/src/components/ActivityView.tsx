'use client'

import { useState, useEffect } from 'react';
import { storageAPI } from '@/utils/api-client';
import { Card, EmptyState } from './ui';
import { Spinner } from './ModernLoader';

interface Activity {
  id: number;
  activity_type: string;
  description: string;
  username?: string;
  storage_name?: string;
  created_at: string;
}

interface ActivitiesResponse {
  activities: Activity[];
  total: number;
}

function ActivityView() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    loadActivities();
  }, [currentPage]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      const response = await storageAPI.getActivities(itemsPerPage, offset);
      setActivities(response.data.activities);
      setTotalActivities(response.data.total);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
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

  const getActivityIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
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

  const getActivityColor = (type: string): string => {
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
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading activities...</p>
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
          icon={<span className="text-6xl">❌</span>}
          title="Error Loading Activities"
          description={error}
        />
      </div>
    );
  }

  const totalPages = Math.ceil(totalActivities / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
          Recent Activity
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          Your activity history across all storages ({totalActivities} total activities)
        </p>
      </div>

      {/* Activities List */}
      {activities.length === 0 ? (
        <EmptyState
          icon={<span className="text-6xl">📋</span>}
          title="No Activity Yet"
          description="Your activities will appear here as you use TeleVault"
        />
      ) : (
        <>
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
                      <p className="text-gray-900 dark:text-gray-100 font-medium break-words">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                        {activity.username && (
                          <>
                            <span className="flex items-center gap-1">
                              <span>👤</span>
                              <span className="font-medium">{activity.username}</span>
                            </span>
                            <span>•</span>
                          </>
                        )}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex-1 flex justify-between items-center sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, totalActivities)}
                    </span>{' '}
                    of <span className="font-medium">{totalActivities}</span> activities
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      ←
                    </button>
                    {getPageNumbers().map((page, idx) => (
                      page === '...' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page as number)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === page
                              ? 'z-10 bg-primary-50 dark:bg-primary-900 border-primary-500 text-primary-600 dark:text-primary-300'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      →
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ActivityView;
