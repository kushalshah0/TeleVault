'use client'

import { useState } from 'react';
import { Button, Card, Input, Modal, Dropdown, DropdownItem, Badge } from './ui';

interface Member {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
}

interface Role {
  value: string;
  label: string;
  description: string;
}

interface Storage {
  id: number;
  name: string;
  telegram_channel_id: string;
}

interface StorageSettingsProps {
  storage: Storage;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

function StorageSettings({ storage, isOpen, onClose, onUpdate, onDelete }: StorageSettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'access'>('general');
  const [storageName, setStorageName] = useState(storage?.name || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [members, setMembers] = useState<Member[]>([
    { id: 1, username: 'john_doe', email: 'john@example.com', role: 'admin' },
    { id: 2, username: 'jane_smith', email: 'jane@example.com', role: 'editor' },
    { id: 3, username: 'bob_wilson', email: 'bob@example.com', role: 'viewer' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');

  const roles: Role[] = [
    { value: 'viewer', label: 'Viewer', description: 'Can view and download files' },
    { value: 'editor', label: 'Editor', description: 'Can upload, download, and delete files' },
    { value: 'admin', label: 'Admin', description: 'Full control over storage' },
  ];

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storageName.trim() || saving) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/storages/${storage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: storageName.trim() })
      })

      if (!response.ok) {
        throw new Error('Failed to rename storage')
      }

      onUpdate?.()
      onClose()
    } catch (error) {
      console.error('Rename error:', error)
    } finally {
      setSaving(false)
    }
  };

  const handleDelete = async () => {
    if (deleting) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/storages/${storage.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        throw new Error('Failed to delete storage')
      }

      onDelete?.()
      onClose()
    } catch (error) {
      console.error('Delete error:', error)
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  };

  const handleRoleChange = (memberId: number, newRole: string) => {
    setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole as 'admin' | 'editor' | 'viewer' } : m));
    // TODO: Call API to update role
  };

  const handleRemoveMember = (memberId: number) => {
    if (confirm('Remove this member from the storage?')) {
      setMembers(members.filter(m => m.id !== memberId));
      // TODO: Call API to remove member
    }
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setInviteEmail('');
    // TODO: Call API to send invite
  };

  const getRoleBadgeVariant = (role: string): string => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'editor': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'viewer': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Storage Settings: ${storage?.name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'general'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('access')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'access'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
            >
              Access Control
            </button>
          </nav>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <form onSubmit={handleRename} className="space-y-4">
              <Input
                label="Storage Name"
                value={storageName}
                onChange={(e) => setStorageName(e.target.value)}
                placeholder="Enter storage name"
              />
              <div className="flex gap-3">
                <Button type="submit" disabled={saving || !storageName.trim()}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Input
                label="Telegram Channel ID"
                value={storage?.telegram_channel_id}
                placeholder="-1001234567890"
                disabled
                helperText="Channel ID cannot be changed after creation"
              />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {!showDeleteConfirm ? (
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Storage
                </Button>
              ) : (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                    Are you sure you want to delete this storage? This action cannot be undone and all files will be permanently deleted.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Yes, Delete Storage'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Access Control Tab */}
        {activeTab === 'access' && (
          <div className="space-y-6">
            {/* Invite Member */}
            <Card>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Invite Members
                </h3>
                <form onSubmit={handleInvite} className="flex gap-3">
                  <Input
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="submit">
                    Invite
                  </Button>
                </form>
              </div>
            </Card>

            {/* Members List */}
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Members ({members.length})
              </h3>
              <Card>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map((member) => (
                    <div key={member.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 
                          rounded-full flex items-center justify-center text-white font-semibold">
                          {member.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {member.username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Dropdown
                          trigger={
                            <button className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getRoleBadgeVariant(member.role)}`}>
                              {member.role}
                              <span className="ml-1">▼</span>
                            </button>
                          }
                        >
                          {roles.map(role => (
                            <DropdownItem
                              key={role.value}
                              onClick={() => handleRoleChange(member.id, role.value)}
                            >
                              {role.label}
                            </DropdownItem>
                          ))}
                        </Dropdown>

                        {member.role !== 'admin' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Role Descriptions */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  Role Permissions
                </h4>
                <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  {roles.map(role => (
                    <div key={role.value}>
                      <span className="font-medium">{role.label}:</span> {role.description}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default StorageSettings;
