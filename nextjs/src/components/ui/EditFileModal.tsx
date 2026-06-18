'use client'

import { useState, FormEvent, useCallback } from 'react'
import { Check } from 'lucide-react'
import { fileAPI, folderAPI } from '@/utils/api-client'
import { Button, Input, Modal } from '.'
import toast from 'react-hot-toast'

interface ItemWithType {
  id: number
  name: string
  type: 'folder' | 'file'
  is_public?: boolean
  [key: string]: any
}

interface EditFileModalProps {
  isOpen: boolean
  onClose: () => void
  renameItem: ItemWithType | null
  storageId: number
  onSaved: () => Promise<void>
}

export const EditFileModal = ({ isOpen, onClose, renameItem, storageId, onSaved }: EditFileModalProps) => {
  const getInitialName = () => {
    if (!renameItem) return ''
    if (renameItem.type === 'file') {
      const lastDotIndex = renameItem.name.lastIndexOf('.')
      if (lastDotIndex > 0) return renameItem.name.substring(0, lastDotIndex)
    }
    return renameItem.name
  }

  const [newName, setNewName] = useState(getInitialName())
  const [isPublicInModal, setIsPublicInModal] = useState(renameItem?.is_public ?? false)
  const [renaming, setRenaming] = useState(false)

  const getOriginalNameWithoutExtension = () => {
    if (!renameItem) return ''
    if (renameItem.type === 'file') {
      const lastDotIndex = renameItem.name.lastIndexOf('.')
      if (lastDotIndex > 0) return renameItem.name.substring(0, lastDotIndex)
    }
    return renameItem.name
  }

  const hasNameChanged = () => {
    const orig = getOriginalNameWithoutExtension()
    return newName.trim() !== '' && newName.trim() !== orig
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !renameItem) return

    setRenaming(true)
    try {
      let finalName = newName.trim()
      const nameChanged = hasNameChanged()
      const publicChanged = isPublicInModal !== (renameItem?.is_public ?? false)

      if (renameItem.type === 'file') {
        const lastDotIndex = renameItem.name.lastIndexOf('.')
        if (lastDotIndex > 0) {
          finalName = finalName + renameItem.name.substring(lastDotIndex)
        }
      }

      if (renameItem.type === 'file') {
        await fileAPI.update(storageId, renameItem.id, {
          ...(nameChanged ? { name: finalName } : {}),
          ...(publicChanged ? { is_public: isPublicInModal } : {}),
        })
      } else {
        await folderAPI.rename(storageId, renameItem.id, finalName)
      }

      toast.success(renameItem.type === 'file' ? 'File updated successfully' : 'Folder updated successfully')
      onClose()
      await onSaved()
    } catch (error) {
      const err = error as any
      toast.error(err.message || err.response?.data?.detail || 'Failed to update')
    } finally {
      setRenaming(false)
    }
  }

  const handleClose = useCallback(() => {
    setNewName('')
    setIsPublicInModal(false)
    onClose()
  }, [onClose])

  const togglePublic = useCallback(() => {
    setIsPublicInModal((prev) => !prev)
  }, [])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={'Edit ' + (renameItem?.type === 'file' ? 'File' : 'Folder')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {renameItem?.type === 'file' && renameItem.name.includes('.') ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              File Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                autoFocus
                placeholder="Enter file name"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 
                  rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <input
                type="text"
                value={renameItem.name.substring(renameItem.name.lastIndexOf('.'))}
                disabled
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 
                  rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400
                  cursor-not-allowed"
              />
            </div>
          </div>
        ) : (
          <Input
            label="Name"
            placeholder="Enter name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            autoFocus
          />
        )}

        {renameItem?.type === 'file' && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Make Public
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Visible on the landing page
              </p>
            </div>
            <button
              type="button"
              onClick={togglePublic}
              className={
                'p-1 rounded border border-gray-200 dark:border-gray-700 transition-colors duration-150 focus:outline-none ' +
                (isPublicInModal
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400')
              }
              title={isPublicInModal ? 'Public' : 'Not public'}
            >
              <Check className={'w-5 h-5 transition-opacity duration-150 ' + (isPublicInModal ? 'opacity-100' : 'opacity-40')} />
            </button>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={renaming}
            disabled={!hasNameChanged() && isPublicInModal === (renameItem?.is_public ?? false)}
          >
            {renaming ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
