'use client'

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { storageAPI } from '@/utils/api-client';
import { Button, Card, Input, Modal, EmptyState, ViewModeToggle } from './ui';
import StorageSettings from './StorageSettings';
import { Storage } from '@/types';

interface DashboardProps {
  onStorageCreated?: () => void;
  storages?: Storage[];
  onRefresh?: () => Promise<void>;
}

function Dashboard({ onStorageCreated, storages: initialStorages = [], onRefresh }: DashboardProps) {
  const [storages, setStorages] = useState<Storage[]>(initialStorages);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState<Storage | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formData, setFormData] = useState({
    name: '',
    telegram_channel_id: '',
  });
  const [renameValue, setRenameValue] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const router = useRouter();
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update storages when prop changes
  useEffect(() => {
    setStorages(initialStorages);
  }, [initialStorages]);

  const loadStorages = async () => {
    // Delegate to parent component's refresh function
    if (onRefresh) {
      await onRefresh();
    }
  };

  const handleCreateStorage = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await storageAPI.create(formData.name, formData.telegram_channel_id);
      toast.success('Storage created successfully');
      setFormData({ name: '', telegram_channel_id: '' });
      setShowCreateModal(false);
      await loadStorages();
      onStorageCreated?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create storage');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStorageSettings = (e: React.MouseEvent | null, storage: Storage) => {
    if (e) e.stopPropagation();
    setSelectedStorage(storage);
    setShowSettingsModal(true);
  };

  const handleDeleteStorage = async (e: React.MouseEvent | null, storage: Storage) => {
    if (e) e.stopPropagation();
    setSelectedStorage(storage);
    setShowDeleteModal(true);
  };

  const confirmDeleteStorage = async () => {
    if (!selectedStorage) return;
    
    setDeleting(true);
    try {
      await storageAPI.delete(selectedStorage.id);
      toast.success('Storage deleted successfully');
      setShowDeleteModal(false);
      setSelectedStorage(null);
      await loadStorages();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete storage');
    } finally {
      setDeleting(false);
    }
  };

  const handleRenameStorage = (e: React.MouseEvent | null, storage: Storage) => {
    if (e) e.stopPropagation();
    setSelectedStorage(storage);
    setRenameValue(storage.name);
    setShowRenameModal(true);
  };

  const confirmRenameStorage = async (e: React.FormEvent) => {
    console.log('confirmRenameStorage called');
    e.preventDefault();
    console.log('Selected storage:', selectedStorage);
    console.log('Rename value:', renameValue);
    
    if (!selectedStorage || !renameValue.trim()) {
      console.log('Validation failed - selectedStorage or renameValue is missing');
      return;
    }

    console.log('Starting rename...');
    setRenaming(true);
    try {
      console.log('Calling API update...');
      const response = await storageAPI.update(selectedStorage.id, { name: renameValue.trim() });
      console.log('Rename response:', response);
      toast.success(`Storage renamed to "${renameValue.trim()}"`);
      setShowRenameModal(false);
      setSelectedStorage(null);
      setRenameValue('');
      await loadStorages();
    } catch (error: any) {
      console.error('Rename error:', error);
      toast.error(error.message || 'Failed to rename storage');
    } finally {
      setRenaming(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStorageStats = (storage: Storage) => {
    const fileCount = storage._count?.files ?? storage.fileCount ?? storage.file_count ?? 0;
    const totalSize = Number(storage._count ? storage._count.files * 1000000 : storage.totalSize ?? storage.total_size ?? 0);
    return {
      files: fileCount,
      size: formatFileSize(totalSize),
    };
  };

  const handleStorageClick = (e: React.MouseEvent, storage: Storage) => {
    e.stopPropagation();
    
    // Clear any existing timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    // Double-click opens storage
    if (e.detail === 2) {
      setSelectedStorage(null);
      router.push(`/storage/${storage.id}`);
      return;
    }
    
    // Single click selects storage
    clickTimerRef.current = setTimeout(() => {
      setSelectedStorage(storage);
      clickTimerRef.current = null;
    }, 200);
  };

  const clearSelection = () => {
    setSelectedStorage(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Storages</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Telegram cloud storage spaces
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          <Button onClick={() => setShowCreateModal(true)}>
            + New Storage
          </Button>
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedStorage && (
        <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-primary-900 dark:text-primary-100">
              1 selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/storage/${selectedStorage.id}`);
                }}
                className="p-2 sm:px-3 sm:py-1.5 text-sm rounded-md hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors flex items-center gap-2"
                title="Open"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="hidden sm:inline">Open</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStorageSettings(null, selectedStorage);
                }}
                className="p-2 sm:px-3 sm:py-1.5 text-sm rounded-md hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors flex items-center gap-2"
                title="Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Settings</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenameStorage(null, selectedStorage);
                }}
                className="p-2 sm:px-3 sm:py-1.5 text-sm rounded-md hover:bg-primary-100 dark:hover:bg-primary-800 transition-colors flex items-center gap-2"
                title="Rename"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="hidden sm:inline">Rename</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteStorage(null, selectedStorage);
                }}
                className="p-2 sm:px-3 sm:py-1.5 text-sm rounded-md hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors flex items-center gap-2"
                title="Delete"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200"
            title="Clear selection"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Storages Grid/List */}
      <div onClick={clearSelection}>
      {storages.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No storages yet"
          description="Create your first Telegram cloud storage to get started"
          action={
            <Button onClick={() => setShowCreateModal(true)}>
              + Create Storage
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {storages.map((storage) => {
            const stats = getStorageStats(storage);
            const isSelected = selectedStorage?.id === storage.id;
            return (
              <Card
                key={storage.id}
                className={`cursor-pointer hover:shadow-lg transition-all ${
                  isSelected ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
                onClick={(e) => handleStorageClick(e, storage)}
              >
                {/* Centered vertical layout for grid view */}
                <div className="flex flex-col items-center text-center space-y-3 py-2">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <div className="w-full px-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {storage.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(storage.created_at)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {storages.map((storage) => {
            const stats = getStorageStats(storage);
            const isSelected = selectedStorage?.id === storage.id;
            return (
              <Card
                key={storage.id}
                className={`cursor-pointer hover:bg-accent transition-all ${
                  isSelected ? 'ring-2 ring-primary bg-accent' : ''
                }`}
                onClick={(e) => handleStorageClick(e, storage)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {storage.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Created {formatDate(storage.created_at)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </div>

      {/* Create Storage Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Storage"
      >
        <form onSubmit={handleCreateStorage} className="space-y-6">
          <Input
            label="Storage Name"
            placeholder="My Cloud Storage"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />

          <Input
            label="Telegram Channel ID"
            placeholder="-1001234567890"
            value={formData.telegram_channel_id}
            onChange={(e) => setFormData({ ...formData, telegram_channel_id: e.target.value })}
            required
            helperText="The numeric ID of your Telegram channel (must start with -100)"
          />

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(false)}
              type="button"
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={creating}
            >
              Create Storage
            </Button>
          </div>
        </form>
      </Modal>

      {/* Storage Settings Modal */}
      {selectedStorage && (
        <Modal
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedStorage(null);
          }}
          title={`Settings - ${selectedStorage.name}`}
          size="lg"
        >
          <StorageSettings
            isOpen={showSettingsModal}
            storage={selectedStorage}
            onClose={() => {
              setShowSettingsModal(false);
              setSelectedStorage(null);
            }}
            onUpdate={loadStorages}
          />
        </Modal>
      )}

      {/* Delete Storage Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedStorage(null);
        }}
        title="Delete Storage"
      >
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Warning: This action cannot be undone
                </h4>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Deleting <strong>"{selectedStorage?.name}"</strong> will permanently remove:
                </p>
                <ul className="text-sm text-red-800 dark:text-red-200 mt-2 ml-4 list-disc">
                  <li>All files and folders in this storage</li>
                  <li>All file data from Telegram</li>
                  <li>All sharing permissions</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedStorage(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteStorage}
              isLoading={deleting}
            >
              Delete Storage
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Storage Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setSelectedStorage(null);
          setRenameValue('');
        }}
        title="Rename Storage"
      >
        <form onSubmit={confirmRenameStorage} className="space-y-6">
          <Input
            label="New Storage Name"
            placeholder="Enter new name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            required
            autoFocus
          />

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRenameModal(false);
                setSelectedStorage(null);
                setRenameValue('');
              }}
              type="button"
              disabled={renaming}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={renaming}
            >
              Rename
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Dashboard;
