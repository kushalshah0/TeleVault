'use client'

import { useState, useEffect } from 'react';
import { Button, Card, Input, Modal, Dropdown, DropdownItem } from './ui';

interface Member {
  id: number;
  user_id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  granted_at: string;
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
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const roles: Role[] = [
    { value: 'viewer', label: 'Viewer', description: 'Can view and download files' },
    { value: 'editor', label: 'Editor', description: 'Can upload, download, and delete files' },
    { value: 'admin', label: 'Admin', description: 'Full control over storage' },
  ];

  useEffect(() => {
    if (isOpen && storage) {
      setStorageName(storage.name)
    }
  }, [isOpen, storage])

  useEffect(() => {
    if (activeTab === 'access' && isOpen && storage) {
      fetchMembers()
    }
  }, [activeTab, isOpen, storage])

  const fetchMembers = async () => {
    if (!storage) return
    setLoadingMembers(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/storages/${storage.id}/permissions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch members')
      }
      
      const data = await response.json()
      setMembers(data)
    } catch (error) {
      console.error('Fetch members error:', error)
    } finally {
      setLoadingMembers(false)
    }
  }

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
    if (deleting || !storage) return;

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

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || inviting || !storage) return;

    setInviting(true);
    setInviteError('');
    
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/storages/${storage.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ email: inviteEmail.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite member')
      }

      setMembers(prev => [data, ...prev])
      setInviteEmail('')
    } catch (error: any) {
      console.error('Invite error:', error)
      setInviteError(error.message || 'Failed to invite member')
    } finally {
      setInviting(false)
    }
  };

  const handleRoleChange = async (memberId: number, newRole: string) => {
    if (!storage) return
    
    setUpdatingRoleId(memberId)
    try {
      const token = localStorage.getItem('accessToken')
      const member = members.find(m => m.id === memberId)
      
      const response = await fetch(`/api/storages/${storage.id}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ user_id: member?.user_id, role: newRole })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update role')
      }

      const updated = await response.json()
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: updated.role } : m))
    } catch (error: any) {
      console.error('Role change error:', error)
      alert(error.message || 'Failed to update role')
    } finally {
      setUpdatingRoleId(null)
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!storage || removingId) return
    if (!confirm('Remove this member from the storage?')) return

    const member = members.find(m => m.id === memberId)
    if (!member) return

    setRemovingId(memberId)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(`/api/storages/${storage.id}/permissions?user_id=${member.user_id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (error: any) {
      console.error('Remove member error:', error)
      alert(error.message || 'Failed to remove member')
    } finally {
      setRemovingId(null)
    }
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

        {activeTab === 'access' && (
          <div className="space-y-6">
            <Card>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Invite Members
                </h3>
                <form onSubmit={handleInvite} className="space-y-3">
                  <Input
                    placeholder="Enter email address"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value)
                      setInviteError('')
                    }}
                    className="flex-1"
                  />
                  {inviteError && (
                    <p className="text-sm text-red-500">{inviteError}</p>
                  )}
                  <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? 'Inviting...' : 'Invite'}
                  </Button>
                </form>
              </div>
            </Card>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Members ({members.length})
              </h3>
              {loadingMembers ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : members.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No members yet</div>
              ) : (
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
                              <button 
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 ${getRoleBadgeVariant(member.role)} ${updatingRoleId === member.id ? 'opacity-50' : ''}`}
                                disabled={updatingRoleId === member.id}
                              >
                                {member.role}
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
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

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removingId === member.id}
                          >
                            {removingId === member.id ? '...' : 'Remove'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

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
