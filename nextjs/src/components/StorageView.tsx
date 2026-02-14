'use client'

import { useState, useEffect, useRef, useCallback, ChangeEvent, DragEvent, FormEvent, MouseEvent } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { storageAPI, folderAPI, fileAPI } from '@/utils/api-client';
import { LoadingSkeleton, Spinner } from './ModernLoader';
import FilePreview from './FilePreview';
import { Button, Card, Modal, Input, EmptyState, Breadcrumbs, ContextMenu, FileIcon, Dropdown, ConfirmDialog, ViewModeToggle } from './ui';
import { BreadcrumbItem } from './ui/Breadcrumbs';
import { useFileUpload } from '../hooks/useFileUpload';
import { useContextMenu } from '../hooks/useContextMenu';
import { useFileSelection } from '../hooks/useFileSelection';
import { starredUtils, recentUtils } from '../utils/starred';
import { fileCache } from '../utils/fileCache';
import UploadProgress from './UploadProgress';
import TextFileEditor from './TextFileEditor';
import type { Storage, Folder, File as FileType } from '@/types';

type FolderPathItem = { id: number; label: string }
type ItemWithType = (Folder | FileType) & { type: 'file' | 'folder' }

interface StorageViewProps {
  onFileOperation?: () => void;
  searchQuery?: string;
  searchTrigger?: number;
  onClearSearch?: () => void;
}

interface ProgressState {
  current: number;
  total: number;
  itemName?: string;
}

interface SearchResults {
  folders: Folder[];
  files: FileType[];
}

interface UploadingFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

function StorageView({ onFileOperation, searchQuery, searchTrigger, onClearSearch }: StorageViewProps) {
  const params = useParams();
  const rawStorageId = params.storageId;
  const storageIdStr = Array.isArray(rawStorageId) ? rawStorageId[0] : rawStorageId;
  const storageId = parseInt(storageIdStr);
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [storage, setStorage] = useState<Storage | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<FolderPathItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [previewFile, setPreviewFile] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<ProgressState>({ current: 0, total: 0 });
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<ProgressState>({ current: 0, total: 0, itemName: '' });
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const lastLoadedFolderRef = useRef<number | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResults>({ folders: [], files: [] });
  const [uploadQueue, setUploadQueue] = useState<ProgressState>({ current: 0, total: 0 });
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const hasInitialLoad = useRef(false);

  // Modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState<ItemWithType | null>(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Partial<Folder & FileType> | null>(null);
  const [deleteType, setDeleteType] = useState<'folder' | 'file' | null>(null);

  // Text file editor
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingFile, setEditingFile] = useState<FileType | null>(null);
  const [editingFileContent, setEditingFileContent] = useState('');

  // Custom hooks
  const { uploading, progress, uploadFile } = useFileUpload();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const { selectedItems, toggleSelection, clearSelection, isSelected, hasSelection, selectionCount } = useFileSelection();

  // Initial load - runs only once per storageId
  useEffect(() => {
    const init = async () => {
      hasInitialLoad.current = false; // Reset on storageId change
      setLoading(true);

      // Read folder from URL query params ONLY on initial load
      const folderIdFromUrl = searchParams.get('folder');
      const initialFolderId = folderIdFromUrl ? parseInt(folderIdFromUrl) : null;
      setCurrentFolder(initialFolderId);

      // Load storage data
      await loadStorage();

      // If we're in a subfolder, load its contents (otherwise loadStorage already has root files/folders)
      if (initialFolderId) {
        await loadContents(initialFolderId);
      }

      hasInitialLoad.current = true; // Mark as initialized
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageId]); // Only depend on storageId, NOT searchParams

  // Sync currentFolder with URL changes (for browser back/forward)
  useEffect(() => {
    if (!hasInitialLoad.current) return; // Skip until initialized

    const folderIdFromUrl = searchParams.get('folder');
    const urlFolderId = folderIdFromUrl ? parseInt(folderIdFromUrl) : null;

    // Only update if different from current state
    if (urlFolderId !== currentFolder) {
      setCurrentFolder(urlFolderId);

      // Update folder path to match
      if (urlFolderId === null) {
        setFolderPath([]);
      }
      // Note: For proper breadcrumb path reconstruction, we'd need folder data
      // For now, just update current folder
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Listen to URL changes

  useEffect(() => {
    // Load contents when folder changes (after initial load)
    // Skip if this is the initial load (already handled above) or if folder hasn't changed
    if (hasInitialLoad.current && storage && currentFolder !== lastLoadedFolderRef.current) {
      lastLoadedFolderRef.current = currentFolder;
      loadContents(currentFolder);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder]);

  // ⚡ OPTIMIZATION: Combined search effects to prevent duplicate renders
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 0 && searchTrigger) {
      performSearch(searchQuery);
    } else if (!searchQuery || searchQuery.trim().length === 0) {
      setIsSearching(false);
      setSearchResults({ folders: [], files: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger, searchQuery]);

  const performSearch = async (query: string) => {
    if (!query || query.trim().length === 0) {
      setIsSearching(false);
      setSearchResults({ folders: [], files: [] });
      return;
    }

    setIsSearching(true);
    setSearchLoading(true);
    try {
      const response = await storageAPI.search(storageId, query, currentFolder);

      const results: any[] = response.data.results;

      // Separate files and folders
      const searchedFolders = results.filter((r: any) => r.type === 'folder') as Folder[];
      const searchedFiles = results.filter((r: any) => r.type === 'file') as FileType[];

      setSearchResults({ folders: searchedFolders, files: searchedFiles });
    } catch (error) {
      setSearchResults({ folders: [], files: [] });
    } finally {
      setSearchLoading(false);
    }
  };

  const loadStorage = async () => {
    try {
      // ⚡ OPTIMIZATION: Fetch storage with folders and files in one call
      const response = await storageAPI.get(storageId);
      setStorage(response.data);

      // Use the data from storage response (avoid duplicate fetch)
      if (response.data.folders && response.data.files) {
        setFolders(response.data.folders);
        setFiles(response.data.files);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load storage:', error);
      setLoading(false);
      router.push('/dashboard');
    }
  };

  // Add a ref to track ongoing fetch requests
  const loadingRef = useRef(false);
  const lastLoadTime = useRef(0);

  const loadContents = async (folderId = currentFolder) => {
    // Prevent duplicate calls within 500ms
    const now = Date.now();
    if (loadingRef.current || (now - lastLoadTime.current < 500)) {
      console.log('🔄 Skipping duplicate loadContents call');
      return;
    }

    // Skip if at root level - loadStorage already has this data
    if (folderId === null || folderId === undefined) {
      return;
    }

    lastLoadTime.current = now;
    
    try {
      loadingRef.current = true;
      setNavigating(true);
      // ⚡ OPTIMIZATION: Parallel fetch of folders and files
      const [foldersRes, filesRes] = await Promise.all([
        folderAPI.list(storageId, folderId),
        fileAPI.list(storageId, folderId),
      ]);
      setFolders(foldersRes.data || []);
      setFiles(filesRes.data || []);
    } catch (error) {
      console.error('Failed to load contents:', error);
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
      setNavigating(false);
      loadingRef.current = false;
    }
  };

  // Helper to refresh data based on current folder
  const refreshData = async () => {
    if (currentFolder === null) {
      await loadStorage();
    } else {
      await loadContents(currentFolder);
    }
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    try {
      // Initialize all files with 0% progress
      const filesList: UploadingFile[] = files.map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending' // pending, uploading, completed, error
      }));

      setUploadingFiles(filesList);
      setUploadQueue({ current: 0, total: files.length });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Mark current file as uploading
        setUploadingFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading' } : f
        ));

        // Upload with progress callback
        await uploadFile(file, {
          storageId: storageId,
          folderId: currentFolder || undefined,
          onProgress: (prog) => {
            setUploadingFiles(prev => prev.map((f, idx) =>
              idx === i ? { ...f, progress: prog.percentage } : f
            ));
          }
        });

        // Mark as completed
        setUploadingFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, progress: 100, status: 'completed' } : f
        ));

        setUploadQueue({ current: i + 1, total: files.length });

        // Small delay between uploads
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Refresh content once after all uploads complete
      await refreshData();
      onFileOperation?.(); // Refresh usage
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + ((error as any).message || 'Unknown error'));
    } finally {
      // Clear upload list after a short delay
      setTimeout(() => {
        setUploadingFiles([]);
        setUploadQueue({ current: 0, total: 0 });
      }, 2000);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      // Initialize all files with 0% progress
      const filesList: UploadingFile[] = files.map((file, index) => ({
        id: `upload-${Date.now()}-${index}`,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'pending'
      }));

      setUploadingFiles(filesList);
      setUploadQueue({ current: 0, total: files.length });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Mark current file as uploading
        setUploadingFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading' } : f
        ));

        // Upload with progress callback
        await uploadFile(file, {
          storageId: storageId,
          folderId: currentFolder || undefined,
          onProgress: (prog) => {
            setUploadingFiles(prev => prev.map((f, idx) =>
              idx === i ? { ...f, progress: prog.percentage } : f
            ));
          }
        });

        // Mark as completed
        setUploadingFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, progress: 100, status: 'completed' } : f
        ));

        setUploadQueue({ current: i + 1, total: files.length });

        // Small delay between uploads
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Refresh content once after all uploads complete
      await refreshData();
      onFileOperation?.(); // Refresh usage
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + ((error as any).message || 'Unknown error'));
    } finally {
      // Clear upload list after a short delay
      setTimeout(() => {
        setUploadingFiles([]);
        setUploadQueue({ current: 0, total: 0 });
      }, 2000);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDownload = async (file: any, returnBlob = false) => {
    try {
      // Check cache first (especially for previews)
      if (returnBlob) {
        const cachedBlob = await fileCache.get(file.id);
        if (cachedBlob) {
          return cachedBlob;
        }
      }

      // Track in recent files when downloading (don't let this block the download)
      try {
        recentUtils.addRecent(file, storageId, storage?.name || 'Storage');
      } catch (err) {
        console.warn('Failed to add to recent:', err);
      }

      // Show downloading indicator
      if (!returnBlob) {
        setDownloading(true);
        setDownloadProgress({ current: 1, total: 1 });
      }

      const response = await fileAPI.download(storageId, file.id);
      // Get the blob from the response
      const blob = await response.blob();

      // Cache the blob for future use (if it's for preview or small enough)
      if (returnBlob || blob.size < 10 * 1024 * 1024) { // Cache files < 10MB
        await fileCache.set(file.id, file.name, blob);
      }

      if (returnBlob) {
        return blob;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();

      // Show success feedback
      setDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });

      // Show success toast
      toast.success(`Downloaded ${file.name}`, {
        duration: 3000,
        position: 'bottom-right',
        icon: '📥',
      });

      // Delay cleanup
      setTimeout(() => {
        link.remove();
        window.URL.revokeObjectURL(url);
      }, 100);

      return undefined;
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed');
      throw error;
    }
  };

  const confirmFileDelete = (fileId: number, fileName: string) => {
    setDeleteItem({ id: fileId, name: fileName });
    setDeleteType('file');
    setShowDeleteConfirm(true);
  };

  const handleFileDelete = async () => {
    if (!deleteItem || deleteItem.id === undefined) return;

    try {
      setDeleting(true);
      setDeleteProgress({ current: 1, total: 1, itemName: deleteItem.name ?? '' });

      await fileAPI.delete(storageId, deleteItem.id, currentFolder);

      // Clear delete progress and selection before loading
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, itemName: '' });
      clearSelection();

      await refreshData();
      onFileOperation?.(); // Refresh usage
    } catch (error) {
      alert('Failed to delete file');
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, itemName: '' });
    }
  };

  const handleCreateFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    // Close modal immediately
    setShowCreateFolderModal(false);
    setCreatingFolder(true);

    try {
      await folderAPI.create(storageId, newFolderName, currentFolder);
      setNewFolderName('');
      await refreshData();
    } catch (error) {
      console.error('Create folder error:', error);
      const err = error as any;
      const errorMessage = err.response?.data?.detail
        || err.response?.data?.message
        || err.message
        || 'Failed to create folder';
      alert('Failed to create folder: ' + errorMessage);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRename = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !renameItem) return;

    setRenaming(true);

    try {
      let finalName = newName.trim();

      // For files, append the original extension
      if (renameItem.type === 'file') {
        const lastDotIndex = renameItem.name.lastIndexOf('.');
        if (lastDotIndex > 0) {
          const extension = renameItem.name.substring(lastDotIndex);
          finalName = finalName + extension;
        }
      }

      if (renameItem.type === 'file') {
        await fileAPI.rename(storageId, renameItem.id, finalName);
      } else {
        await folderAPI.rename(storageId, renameItem.id, finalName);
      }
      
      toast.success(`${renameItem.type === 'file' ? 'File' : 'Folder'} renamed successfully`);
      setShowRenameModal(false);
      setNewName('');
      setRenameItem(null);
      clearSelection();
      await refreshData();
    } catch (error) {
      const err = error as any;
      toast.error(err.message || err.response?.data?.detail || 'Failed to rename');
    } finally {
      setRenaming(false);
    }
  };

  const showRenameDialog = (item: any, type: 'folder' | 'file') => {
    const itemWithType = { ...item, type };
    setRenameItem(itemWithType as (Folder | FileType) & { type: 'folder' | 'file' });

    // For files, extract name without extension
    if (type === 'file') {
      const lastDotIndex = item.name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        // Has extension, show only name part
        const nameWithoutExt = item.name.substring(0, lastDotIndex);
        setNewName(nameWithoutExt);
      } else {
        // No extension, show full name
        setNewName(item.name);
      }
    } else {
      // Folders don't have extensions
      setNewName(item.name);
    }

    setShowRenameModal(true);
  };

  const getOriginalNameWithoutExtension = () => {
    if (!renameItem) return '';

    if (renameItem.type === 'file') {
      const lastDotIndex = renameItem.name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        return renameItem.name.substring(0, lastDotIndex);
      }
    }
    return renameItem.name;
  };

  const hasNameChanged = () => {
    return newName.trim() !== '' && newName.trim() !== getOriginalNameWithoutExtension();
  };

  const handleFolderOpen = useCallback((folder: any) => {
    // Check if folder is already in path to prevent duplicates
    const isAlreadyInPath = folderPath.some(p => p.id === folder.id);
    if (isAlreadyInPath) {
      return;
    }

    setCurrentFolder(folder.id);
    setFolderPath(prev => [...prev, { id: folder.id, label: folder.name }]);

    // Update URL with folder query param
    router.push(`/storage/${storageId}?folder=${folder.id}`);
    clearSelection();
  }, [folderPath, clearSelection]);

  const handleBreadcrumbNavigate = (item: BreadcrumbItem) => {
    if (!item.id && item.id !== 0) {
      // Root (id is undefined or null)
      setCurrentFolder(null);
      setFolderPath([]);
      // Update URL to remove folder param
      router.push(`/storage/${storageId}`);
    } else {
      const folderId = Number(item.id);
      const index = folderPath.findIndex(p => p.id === folderId);
      setCurrentFolder(folderId);
      setFolderPath(folderPath.slice(0, index + 1));
      // Update URL with folder param
      router.push(`/storage/${storageId}?folder=${folderId}`);
    }
    clearSelection();
  };

  // Check if file is a text file that can be edited
  const isTextFile = (file: any) => {
    const textExtensions = ['txt', 'json', 'md', 'csv', 'xml', 'html', 'css', 'js', 'py', 'log', 'yml', 'yaml', 'ini', 'conf', 'sh', 'bat'];
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    return textExtensions.includes(extension);
  };

  const handleEditFile = async (file: any) => {
    try {
      // Download file content
      const response = await fileAPI.download(storageId, file.id);

      // Convert Response to Blob, then to text
      const blob = await response.blob();
      const content = await blob.text();

      setEditingFile(file);
      setEditingFileContent(content);
      setShowTextEditor(true);
    } catch (error) {
      console.error('Failed to load file for editing:', error);
      alert('Failed to load file content: ' + ((error as any).message || 'Unknown error'));
    }
  };

  const handleContextMenu = (e: MouseEvent, item: any, type: 'folder' | 'file') => {
    e.preventDefault();
    e.stopPropagation();
    const menuItems = [];

    if (type === 'file') {
      menuItems.push(
        {
          icon: '👁️', label: 'Preview', onClick: () => {
            // Track in recent files when previewing from context menu
            recentUtils.addRecent(item, storageId, storage?.name || 'Storage');
            setPreviewFile(item);
          }
        },
        { icon: '⬇️', label: 'Download', onClick: () => handleFileDownload(item) }
      );

      // Add Edit option for text files
      if (isTextFile(item)) {
        menuItems.push(
          { icon: '✏️', label: 'Edit', onClick: () => handleEditFile(item) }
        );
      }

      menuItems.push(
        { divider: true },
        { icon: '🗑️', label: 'Delete', onClick: () => confirmFileDelete(item.id, item.name), danger: true }
      );
    } else if (type === 'folder') {
      menuItems.push(
        { icon: '✏️', label: 'Rename', onClick: () => showRenameDialog(item, 'folder') },
        { icon: '👁️', label: 'Open', onClick: () => handleFolderOpen(item) },
        { divider: true },
        { icon: '🗑️', label: 'Delete', onClick: () => confirmFolderDelete(item.id, item.name), danger: true }
      );
    }

    showContextMenu(e, { item, type, menuItems });
  };

  const confirmFolderDelete = (folderId: number, folderName: string) => {
    setDeleteItem({ id: folderId, name: folderName });
    setDeleteType('folder');
    setShowDeleteConfirm(true);
  };

  const handleFolderDelete = async () => {
    if (!deleteItem) return;

    try {
      setDeleting(true);
      setDeleteProgress({ current: 1, total: 1, itemName: deleteItem.name ?? '' });

      if (deleteItem.id !== undefined) {
        await folderAPI.delete(storageId, deleteItem.id);
      }

      // Clear delete progress and selection before loading
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, itemName: '' });
      clearSelection();

      await refreshData();
      onFileOperation?.();
    } catch (error) {
      alert('Failed to delete folder');
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, itemName: '' });
    }
  };

  const handleConfirmDelete = async () => {
    // Close modal immediately
    setShowDeleteConfirm(false);

    try {
      if (deleteType === 'file') {
        await handleFileDelete();
      } else if (deleteType === 'folder') {
        await handleFolderDelete();
      }
      // Clean up state after successful deletion
      setDeleteItem(null);
      setDeleteType(null);
    } catch (error) {
      // Error handling is done in individual delete functions
      console.error('Delete failed:', error);
    }
  };

  const handleItemClick = (item: any, type: 'folder' | 'file', e: MouseEvent) => {
    e.stopPropagation();

    // Clear any existing timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }

    // Double-click/tap opens folder or file (works on both mobile and desktop)
    if (e.detail === 2) {
      if (type === 'folder') {
        clearSelection();
        handleFolderOpen(item);
      } else {
        // Track in recent files
        recentUtils.addRecent(item, storageId, storage?.name || 'Storage');
        setPreviewFile(item);
      }
      return;
    }

    // Single click/tap - wait to see if it's a double-click
    clickTimerRef.current = setTimeout(() => {
      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        // Multi-select with Ctrl/Cmd/Shift
        toggleSelection({ ...item, type });
      } else {
        // Single click selects the item
        clearSelection();
        toggleSelection({ ...item, type });
      }
      clickTimerRef.current = null;
    }, 200); // 200ms delay
  };

  const handleStarToggle = () => {
    if (selectedItems.length !== 1) return;

    const item = selectedItems[0];
    starredUtils.toggleStarred(item, item.type, storageId, storage?.name || 'Storage');
    // Force re-render by clearing and re-selecting
    const wasSelected = selectedItems[0];
    clearSelection();
    setTimeout(() => toggleSelection(wasSelected), 0);
  };

  const isItemStarred = (item: any) => {
    if (!item) return false;
    return starredUtils.isStarred(item.id, item.type);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { id: undefined, label: storage?.name || 'Storage' },
    ...folderPath,
  ];

  if (loading || !storage) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-primary-500 mb-4">
          <Spinner size="lg" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Loading storage...
        </p>
      </div>
    );
  }

  // Determine which folders and files to display
  const displayFolders = isSearching && searchResults.folders ? searchResults.folders : (folders || []);
  const displayFiles = isSearching && searchResults.files ? searchResults.files : (files || []);
  const hasContent = displayFolders.length > 0 || displayFiles.length > 0;

  const allItems = [
    ...displayFolders.map(f => ({ ...f, type: 'folder' })),
    ...displayFiles.map(f => ({ ...f, type: 'file' })),
  ];

  return (
    <div
      className="space-y-6"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={(e) => {
        // Click on background clears selection
        const target = e.target as HTMLElement;
        const clickedOnCard = target.closest('[data-card]');
        const clickedOnActionBar = target.closest('.selection-bar');
        if (!clickedOnCard && !clickedOnActionBar) {
          clearSelection();
        }
      }}
    >
      {/* Header with Breadcrumbs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-2">
            {/* Back Button (only show when inside a folder) */}
            {currentFolder !== null && (
              <button
                onClick={() => {
                  // Navigate back using folder path
                  if (folderPath.length > 1) {
                    const previousFolder = folderPath[folderPath.length - 2];
                    setCurrentFolder(previousFolder.id);
                    setFolderPath(folderPath.slice(0, -1));
                    router.push(`/storage/${storageId}?folder=${previousFolder.id}`);
                  } else {
                    // Go to root
                    setCurrentFolder(null);
                    setFolderPath([]);
                    router.push(`/storage/${storageId}`);
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-secondary hover:bg-accent rounded-lg transition-colors flex-shrink-0"
                title="Go back"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />

            {/* New Folder Button */}
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 
                hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors
                text-gray-700 dark:text-gray-300"
              title="New Folder"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span className="hidden sm:inline text-sm font-medium">New Folder</span>
            </button>

            {/* New Text File Button */}
            <button
              onClick={() => setShowTextEditor(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 
                hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors
                text-gray-700 dark:text-gray-300"
              title="New Text File"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden sm:inline text-sm font-medium">New Text File</span>
            </button>

            {/* Upload Files Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 bg-primary hover:opacity-90 
                rounded-lg transition-all text-primary-foreground 
                disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Upload Files"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="hidden sm:inline text-sm font-medium">Upload Files</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Search Results Banner */}
        {isSearching && searchQuery && (
          <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              {searchLoading ? (
                <svg className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <span className="text-2xl">🔍</span>
              )}
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {searchLoading ? 'Searching...' : `Found ${searchResults.folders.length + searchResults.files.length} results`}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Search: "<span className="font-semibold">{searchQuery}</span>"
                  {currentFolder && <span> (in current folder)</span>}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIsSearching(false);
                setSearchResults({ folders: [], files: [] });
                onClearSearch?.();
              }}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
              title="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Download Progress */}
        {downloading && (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 
            border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2 flex-1">
              <svg className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Downloading {downloadProgress.current} of {downloadProgress.total} files...
              </span>
            </div>
          </div>
        )}

        {/* Delete Progress */}
        {deleting && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 
            border border-red-200 dark:border-red-800 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="flex-1 min-w-0">
                <span className="text-xs sm:text-sm font-medium text-red-900 dark:text-red-100 block">
                  {deleteProgress.total > 1
                    ? `Deleting ${deleteProgress.current} of ${deleteProgress.total} items...`
                    : `Deleting "${deleteProgress.itemName}"...`
                  }
                </span>
                {deleteProgress.total > 1 && (
                  <div className="mt-1 w-full bg-red-200 dark:bg-red-900/40 rounded-full h-1.5">
                    <div
                      className="bg-red-600 dark:bg-red-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Google Drive-like Selection Bar */}
        {hasSelection && (
          <div className="selection-bar flex items-center justify-between bg-primary-50 dark:bg-primary-900/20 
            border border-primary-200 dark:border-primary-800 rounded-lg px-2 sm:px-4 py-1.5 sm:py-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <span className="text-xs sm:text-sm font-medium text-primary-900 dark:text-primary-100 whitespace-nowrap">
                {selectionCount} selected
              </span>
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
                {/* Download Button - For files (single or multiple) */}
                {selectedItems.filter(item => item.type === 'file').length > 0 && (
                  <button
                    onClick={async () => {
                      const files = selectedItems.filter(item => item.type === 'file');
                      setDownloading(true);
                      setDownloadProgress({ current: 0, total: files.length });

                      for (let i = 0; i < files.length; i++) {
                        try {
                          setDownloadProgress({ current: i + 1, total: files.length });
                          await handleFileDownload(files[i]);
                          // Add a small delay between downloads to avoid browser blocking
                          await new Promise(resolve => setTimeout(resolve, 300));
                        } catch (error) {
                          console.error(`Failed to download ${files[i].name}:`, error);
                        }
                      }

                      setDownloading(false);
                      setDownloadProgress({ current: 0, total: 0 });
                    }}
                    disabled={downloading}
                    className="p-1.5 sm:p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                      transition-colors text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                    title={`Download ${selectedItems.filter(item => item.type === 'file').length} file(s)`}
                  >
                    {downloading ? (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    )}
                  </button>
                )}

                {/* Preview Button - Only for single file */}
                {selectionCount === 1 && selectedItems[0].type === 'file' && (
                  <button
                    onClick={() => {
                      // Track in recent files when previewing
                      recentUtils.addRecent(selectedItems[0], storageId, storage?.name || 'Storage');
                      setPreviewFile(selectedItems[0]);
                    }}
                    className="p-1.5 sm:p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                      transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                    title="Preview"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}

                {/* Edit Button - Only for single text file */}
                {selectionCount === 1 && selectedItems[0].type === 'file' && isTextFile(selectedItems[0]) && (
                  <button
                    onClick={() => handleEditFile(selectedItems[0])}
                    className="p-1.5 sm:p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                      transition-colors text-gray-700 dark:text-gray-300 flex-shrink-0"
                    title="Edit"
                  >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                )}

                {/* Open Button - Only for single folder */}
                {selectionCount === 1 && selectedItems[0].type === 'folder' && (
                  <button
                    onClick={() => handleFolderOpen(selectedItems[0])}
                    className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                      transition-colors text-gray-700 dark:text-gray-300"
                    title="Open folder"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}

                {/* Rename Button - Only for single item */}
                {selectionCount === 1 && (
                  <button
                    onClick={() => showRenameDialog(selectedItems[0], selectedItems[0].type ?? 'file')}
                    className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                      transition-colors text-gray-700 dark:text-gray-300"
                    title="Rename"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}

                {/* Star/Unstar Button - Only for single item */}
                {selectionCount === 1 && (
                  <button
                    onClick={handleStarToggle}
                    className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                      transition-colors text-gray-700 dark:text-gray-300"
                    title={isItemStarred(selectedItems[0]) ? 'Remove from starred' : 'Add to starred'}
                  >
                    <span className="text-xl">
                      {isItemStarred(selectedItems[0]) ? '⭐' : '☆'}
                    </span>
                  </button>
                )}

                {/* Delete Button - For all selections */}
                <button
                  onClick={async () => {
                    // For bulk delete, delete each item with progress
                    if (selectionCount > 1) {
                      setDeleting(true);
                      setDeleteProgress({ current: 0, total: selectionCount, itemName: '' });

                      for (let i = 0; i < selectedItems.length; i++) {
                        const item = selectedItems[i];
                        setDeleteProgress({ current: i + 1, total: selectionCount, itemName: item.name });

                        try {
                          if (item.type === 'file') {
                            await fileAPI.delete(storageId, item.id, currentFolder);
                          } else {
                            await folderAPI.delete(storageId, item.id);
                          }
                          // Small delay to show progress
                          await new Promise(resolve => setTimeout(resolve, 100));
                        } catch (error) {
                          console.error(`Failed to delete ${item.name}:`, error);
                        }
                      }

                      // Clear delete progress and selection before loading
                      setDeleting(false);
                      setDeleteProgress({ current: 0, total: 0, itemName: '' });
                      clearSelection();

                      await refreshData();
                      onFileOperation?.();
                    } else {
                      // Single item - show confirmation modal
                      const firstItem = selectedItems[0];
                      if (firstItem.type === 'file') {
                        confirmFileDelete(firstItem.id, firstItem.name ?? '');
                      } else {
                        confirmFolderDelete(firstItem.id, firstItem.name ?? '');
                      }
                    }
                  }}
                  disabled={deleting}
                  className="p-1.5 sm:p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg 
                    transition-colors text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="Delete"
                >
                  {deleting ? (
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={clearSelection}
              className="p-1 sm:p-1.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg 
                transition-colors text-gray-600 dark:text-gray-400 flex-shrink-0 ml-2"
              title="Clear selection"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Upload Progress */}
        <UploadProgress
          uploadingFiles={uploadingFiles}
          uploadQueue={uploadQueue}
        />

        {/* Drag and Drop Overlay */}
        {isDragging && (
          <div className="fixed inset-0 bg-primary-500/20 backdrop-blur-sm z-40 
            flex items-center justify-center pointer-events-none">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft-lg p-8 
              border-4 border-dashed border-primary-500">
              <div className="text-6xl mb-4 text-center">📤</div>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Drop files to upload
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      {navigating ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-primary-500 mb-4">
            <Spinner size="lg" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Loading folder contents...
          </p>
        </div>
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={<span className="text-6xl">📂</span>}
          title="This folder is empty"
          description="Upload files or create folders to organize your content"
          action={
            <Button variant="primary" onClick={() => fileInputRef.current?.click()}>
              Upload Files
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4" style={{ overflow: 'visible' }}>
          {displayFolders.map((folder) => (
            <Card
              key={`folder-${folder.id}`}
              hover
              onClick={(e) => handleItemClick(folder, 'folder', e)}
              onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
              data-card
              className={`group cursor-pointer transition-all relative overflow-visible ${isSelected({ ...folder, type: 'folder' })
                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : ''
                }`}
            >
              <div className="p-4 flex flex-col items-center">
                <div className="mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform">
                  <FileIcon type="folder" size="lg" />
                </div>
                <div className="w-full min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 truncate text-center px-1"
                    title={folder.name}>
                    {folder.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    Folder
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {displayFiles.map((file) => (
            <Card
              key={`file-${file.id}`}
              hover
              onClick={(e) => handleItemClick(file, 'file', e)}
              onContextMenu={(e) => handleContextMenu(e, file, 'file')}
              data-card
              className={`group cursor-pointer transition-all relative overflow-visible ${isSelected({ ...file, type: 'file' })
                ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : ''
                }`}
            >
              <div className="p-4 flex flex-col items-center">
                <div className="mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform">
                  <FileIcon mimeType={file.mime_type} size="lg" />
                </div>
                <div className="w-full min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-gray-100 text-center px-1 break-words line-clamp-2"
                    title={file.name}
                    style={{ wordBreak: 'break-word', minHeight: '2rem' }}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Table Header - Hidden on mobile, shown on larger screens */}
            <div className="hidden sm:grid sm:grid-cols-10 sm:gap-4 sm:px-6 sm:py-3 bg-gray-50 dark:bg-gray-800/50 
              text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-6">Name</div>
              <div className="col-span-2">Size</div>
              <div className="col-span-2">Modified</div>
            </div>

            {/* Folders */}
            {displayFolders.map((folder) => (
              <div
                key={`folder-${folder.id}`}
                data-card
                className={`sm:grid sm:grid-cols-10 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 hover:bg-gray-50 
                  dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${isSelected({ ...folder, type: 'folder' })
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : ''
                  }`}
                onClick={(e) => handleItemClick(folder, 'folder', e)}
                onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
              >
                {/* Mobile Layout - Stack vertically */}
                <div className="sm:hidden flex items-center gap-2">
                  <FileIcon type="folder" size="md" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {folder.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Folder • {formatDate(folder.created_at)}
                    </div>
                  </div>
                </div>

                {/* Desktop Layout - Grid */}
                <div className="hidden sm:flex sm:col-span-6 items-center gap-3 min-w-0">
                  <FileIcon type="folder" size="lg" className="flex-shrink-0" />
                  <span className="font-medium text-base text-gray-900 dark:text-gray-100 truncate">
                    {folder.name}
                  </span>
                </div>
                <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-gray-500 dark:text-gray-400">
                  —
                </div>
                <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(folder.created_at)}
                </div>
              </div>
            ))}

            {/* Files */}
            {displayFiles.map((file) => (
              <div
                key={`file-${file.id}`}
                data-card
                className={`sm:grid sm:grid-cols-10 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 hover:bg-gray-50 
                  dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${isSelected({ ...file, type: 'file' })
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : ''
                  }`}
                onClick={(e) => handleItemClick(file, 'file', e)}
                onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                onDoubleClick={() => setPreviewFile(file)}
              >
                {/* Mobile Layout - Stack vertically */}
                <div className="sm:hidden flex items-center gap-2">
                  <FileIcon mimeType={file.mime_type} size="md" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(file.size)} • {formatDate(file.created_at)}
                    </div>
                  </div>
                </div>

                {/* Desktop Layout - Grid */}
                <div className="hidden sm:flex sm:col-span-6 items-center gap-3 min-w-0">
                  <FileIcon mimeType={file.mime_type} size="lg" className="flex-shrink-0" />
                  <span className="font-medium text-base text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </span>
                </div>
                <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </div>
                <div className="hidden sm:flex sm:col-span-2 items-center text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(file.created_at)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.data.menuItems}
          onClose={hideContextMenu}
        />
      )}

      {/* Create Folder Modal */}
      <Modal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        title="Create New Folder"
      >
        <form onSubmit={handleCreateFolder} className="space-y-6">
          <Input
            label="Folder Name"
            placeholder="Enter folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            required
            autoFocus
          />

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateFolderModal(false)} type="button">
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={creatingFolder}
            >
              📁 Create Folder
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false);
          setRenameItem(null);
          setNewName('');
        }}
        title={`Rename ${renameItem?.type === 'file' ? 'File' : 'Folder'}`}
      >
        <form onSubmit={handleRename} className="space-y-4">
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

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowRenameModal(false);
                setRenameItem(null);
                setNewName('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={renaming}
              disabled={!hasNameChanged()}
            >
              {renaming ? 'Renaming...' : 'Rename'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleFileDownload}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title={deleteType === 'folder' ? 'Delete Folder' : 'Delete File'}
        message={
          deleteType === 'folder'
            ? `Are you sure you want to delete "${deleteItem?.name}" and all its contents? This action cannot be undone.`
            : `Are you sure you want to delete "${deleteItem?.name}"? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        isLoading={deleting}
      />

      {/* Text File Editor */}
      <TextFileEditor
        isOpen={showTextEditor}
        onClose={() => {
          setShowTextEditor(false);
          setEditingFile(null);
          setEditingFileContent('');
        }}
        editFile={editingFile}
        editContent={editingFileContent}
        onSave={async (file) => {
          // Upload the text file using the same upload logic
          try {
            // If editing an existing file, delete the old one first
            if (editingFile) {
              await fileAPI.delete(storageId, editingFile.id);
            }

            await uploadFile(file, {
              storageId: storageId,
              folderId: currentFolder === null ? undefined : currentFolder
            });
            await refreshData();
            onFileOperation?.();

            // Clear editing state after successful save
            setEditingFile(null);
            setEditingFileContent('');
          } catch (error) {
            console.error('Failed to upload text file:', error);
            throw error;
          }
        }}
      />
    </div>
  );
}

export default StorageView;
