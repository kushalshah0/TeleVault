import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageAPI } from '../api';
import { Spinner } from './ModernLoader';
import { Button, Card, Input, Modal, EmptyState, Dropdown } from './ui';
import StorageSettings from './StorageSettings';

function Dashboard({ onStorageCreated }) {
  const [storages, setStorages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [formData, setFormData] = useState({
    name: '',
    telegram_channel_id: '',
  });
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadStorages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStorages = async () => {
    try {
      const response = await storageAPI.list();
      setStorages(response.data.storages);
    } catch (error) {
      console.error('Failed to load storages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStorage = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await storageAPI.create(formData.name, formData.telegram_channel_id);
      setFormData({ name: '', telegram_channel_id: '' });
      setShowCreateModal(false);
      await loadStorages();
      onStorageCreated?.();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create storage');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleStorageSettings = (e, storage) => {
    e.stopPropagation();
    setSelectedStorage(storage);
    setShowSettingsModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-primary-500 mb-4">
          <Spinner size="lg" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Loading storages...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            My Storages
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Manage your Telegram-backed cloud storage volumes
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 sm:p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              title="Grid view"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 sm:p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              title="List view"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <Button icon="➕" onClick={() => setShowCreateModal(true)}>
            Create Storage
          </Button>
        </div>
      </div>

      {/* Storage List */}
      {storages.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No storages yet"
          description="Create your first storage to start uploading files to Telegram!"
          action={() => setShowCreateModal(true)}
          actionLabel="Create Storage"
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {storages.map((storage) => (
            <Card
              key={storage.id}
              hover
              onClick={() => navigate(`/storage/${storage.id}`)}
              className="group cursor-pointer transition-all"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 
                      rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 
                      transition-transform shadow-sm">
                      💾
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 
                        group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors
                        truncate">
                        {storage.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        📱 {storage.telegram_channel_id}
                      </p>
                    </div>
                  </div>
                  <Dropdown
                    align="right"
                    trigger={
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg 
                          opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      >
                        <span className="text-xl">⋮</span>
                      </button>
                    }
                    items={[
                      { 
                        icon: '⚙️', 
                        label: 'Settings', 
                        onClick: (e) => handleStorageSettings(e, storage) 
                      },
                      { divider: true },
                      { 
                        icon: '🗑️', 
                        label: 'Delete', 
                        onClick: () => console.log('Delete storage'),
                        danger: true 
                      },
                    ]}
                  />
                </div>
                
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>Created</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(storage.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {storages.map((storage) => (
            <Card
              key={storage.id}
              hover
              onClick={() => navigate(`/storage/${storage.id}`)}
              className="group cursor-pointer"
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 
                    rounded-lg flex items-center justify-center text-xl group-hover:scale-110 
                    transition-transform">
                    💾
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 
                      group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {storage.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📱 {storage.telegram_channel_id} • Created {formatDate(storage.created_at)}
                    </p>
                  </div>
                </div>
                <span className="text-primary-600 dark:text-primary-400 group-hover:translate-x-1 
                  transition-transform text-xl">
                  →
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Storage Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Storage"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateStorage} 
              loading={creating}
              icon="✨"
            >
              Create Storage
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateStorage} className="space-y-4">
          <Input
            label="Storage Name"
            placeholder="e.g., My Personal Files"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          
          <Input
            label="Telegram Channel ID"
            placeholder="-1001234567890"
            value={formData.telegram_channel_id}
            onChange={(e) => setFormData({ ...formData, telegram_channel_id: e.target.value })}
            required
            helperText="💡 Forward a message from your channel to @userinfobot to get the ID"
          />
        </form>
      </Modal>

      {/* Storage Settings Modal */}
      {selectedStorage && (
        <StorageSettings
          storage={selectedStorage}
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            setSelectedStorage(null);
          }}
          onUpdate={loadStorages}
        />
      )}
    </div>
  );
}

export default Dashboard;
