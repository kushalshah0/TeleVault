import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageAPI, folderAPI, fileAPI } from '../api';
import { LoadingSkeleton, Spinner } from './ModernLoader';
import FilePreview from './FilePreview';
import { Button, Card, Modal, Input, EmptyState, Breadcrumbs, ContextMenu, FileIcon, Dropdown, ConfirmDialog } from './ui';
import { useFileUpload } from '../hooks/useFileUpload';
import { useContextMenu } from '../hooks/useContextMenu';
import { useFileSelection } from '../hooks/useFileSelection';
import { starredUtils, recentUtils } from '../utils/starred';
import UploadProgress from './UploadProgress';
import TextFileEditor from './TextFileEditor';

function StorageView({ onFileOperation, searchQuery, searchTrigger }) {
  const { storageId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [storage, setStorage] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [isDragging, setIsDragging] = useState(false);
  const clickTimerRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [deleting, setDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0, itemName: '' });
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [uploadQueue, setUploadQueue] = useState({ current: 0, total: 0 });
  const [uploadingFiles, setUploadingFiles] = useState([]);
  
  // Modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  
  // Text file editor
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [editingFileContent, setEditingFileContent] = useState('');
  
  // Custom hooks
  const { uploading, progress, uploadFile } = useFileUpload();
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const { selectedItems, toggleSelection, clearSelection, isSelected, hasSelection, selectionCount } = useFileSelection();

  useEffect(() => {
    const init = async () => {
      await loadStorage();
      await loadContents();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageId]);

  useEffect(() => {
    if (storage) {
      loadContents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder]);

  // Handle search - only trigger when searchTrigger changes
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 0) {
      performSearch(searchQuery);
    } else {
      setIsSearching(false);
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTrigger]);

  // Clear search when query is emptied
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      setIsSearching(false);
      setSearchResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const performSearch = async (query) => {
    if (!query || query.trim().length === 0) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await storageAPI.search(storageId, query, currentFolder);
      const results = response.data.results;
      
      // Separate files and folders
      const searchedFolders = results.filter(r => r.type === 'folder');
      const searchedFiles = results.filter(r => r.type === 'file');
      
      setSearchResults({ folders: searchedFolders, files: searchedFiles });
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ folders: [], files: [] });
    }
  };

  const loadStorage = async () => {
    try {
      const response = await storageAPI.get(storageId);
      setStorage(response.data);
    } catch (error) {
      console.error('Failed to load storage:', error);
      navigate('/dashboard');
    }
  };

  const loadContents = async () => {
    try {
      setNavigating(true);
      const [foldersRes, filesRes] = await Promise.all([
        folderAPI.list(storageId, currentFolder),
        fileAPI.list(storageId, currentFolder),
      ]);
      setFolders(foldersRes.data.folders);
      setFiles(filesRes.data.files);
    } catch (error) {
      console.error('Failed to load contents:', error);
    } finally {
      setLoading(false);
      setNavigating(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      // Initialize all files with 0% progress
      const filesList = files.map((file, index) => ({
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
        await fileAPI.upload(storageId, file, currentFolder, (progressValue) => {
          setUploadingFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, progress: progressValue } : f
          ));
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
      await loadContents();
      onFileOperation?.(); // Refresh usage
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error.message || 'Unknown error'));
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

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    try {
      // Initialize all files with 0% progress
      const filesList = files.map((file, index) => ({
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
        await fileAPI.upload(storageId, file, currentFolder, (progressValue) => {
          setUploadingFiles(prev => prev.map((f, idx) => 
            idx === i ? { ...f, progress: progressValue } : f
          ));
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
      await loadContents();
      onFileOperation?.(); // Refresh usage
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + (error.message || 'Unknown error'));
    } finally {
      // Clear upload list after a short delay
      setTimeout(() => {
        setUploadingFiles([]);
        setUploadQueue({ current: 0, total: 0 });
      }, 2000);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDownload = async (file, returnBlob = false) => {
    try {
      // Track in recent files when downloading
      recentUtils.addRecent(file, storageId, storage?.name || 'Storage');
      
      const response = await fileAPI.download(storageId, file.id);
      
      if (returnBlob) {
        return new Blob([response.data], { type: file.mime_type });
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Download failed');
      throw error;
    }
  };

  const confirmFileDelete = (fileId, fileName) => {
    setDeleteItem({ id: fileId, name: fileName });
    setDeleteType('file');
    setShowDeleteConfirm(true);
  };

  const handleFileDelete = async () => {
    try {
      setDeleting(true);
      setDeleteProgress({ current: 1, total: 1, itemName: deleteItem.name });
      
      await fileAPI.delete(storageId, deleteItem.id);
      
      // Clear delete progress and selection before loading
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, itemName: '' });
      clearSelection();
      
      await loadContents();
      onFileOperation?.(); // Refresh usage
    } catch (error) {
      alert('Failed to delete file');
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, itemName: '' });
    }
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      await folderAPI.create(storageId, newFolderName, currentFolder);
      setNewFolderName('');
      setShowCreateFolderModal(false);
      loadContents();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleRename = async (e) => {
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
      setNewName('');
      setRenameItem(null);
      setShowRenameModal(false);
      clearSelection();
      await loadContents();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to rename');
    } finally {
      setRenaming(false);
    }
  };

  const showRenameDialog = (item, type) => {
    const itemWithType = { ...item, type };
    setRenameItem(itemWithType);
    
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

  const handleFolderOpen = useCallback((folder) => {
    // Check if folder is already in path to prevent duplicates
    const isAlreadyInPath = folderPath.some(p => p.id === folder.id);
    if (isAlreadyInPath) {
      return;
    }
    
    setCurrentFolder(folder.id);
    setFolderPath(prev => [...prev, { id: folder.id, label: folder.name }]);
    clearSelection();
  }, [folderPath, clearSelection]);

  const handleBreadcrumbNavigate = (item) => {
    if (!item.id) {
      // Root
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const index = folderPath.findIndex(p => p.id === item.id);
      setCurrentFolder(item.id);
      setFolderPath(folderPath.slice(0, index + 1));
    }
    clearSelection();
  };

  // Check if file is a text file that can be edited
  const isTextFile = (file) => {
    const textExtensions = ['txt', 'json', 'md', 'csv', 'xml', 'html', 'css', 'js', 'py', 'log', 'yml', 'yaml', 'ini', 'conf', 'sh', 'bat'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    return textExtensions.includes(extension);
  };

  const handleEditFile = async (file) => {
    try {
      // Download file content
      const response = await fileAPI.download(storageId, file.id);
      
      // Convert Blob to text
      const blob = response.data;
      const content = await blob.text();
      
      setEditingFile(file);
      setEditingFileContent(content);
      setShowTextEditor(true);
    } catch (error) {
      console.error('Failed to load file for editing:', error);
      alert('Failed to load file content: ' + (error.message || 'Unknown error'));
    }
  };

  const handleContextMenu = (e, item, type) => {
    e.preventDefault();
    e.stopPropagation();
    const menuItems = [];

    if (type === 'file') {
      menuItems.push(
        { icon: '👁️', label: 'Preview', onClick: () => {
          // Track in recent files when previewing from context menu
          recentUtils.addRecent(item, storageId, storage?.name || 'Storage');
          setPreviewFile(item);
        }},
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
        { icon: '📂', label: 'Open', onClick: () => handleFolderOpen(item) },
        { divider: true },
        { icon: '🗑️', label: 'Delete', onClick: () => confirmFolderDelete(item.id, item.name), danger: true }
      );
    }

    showContextMenu(e, { item, type, menuItems });
  };

  const confirmFolderDelete = (folderId, folderName) => {
    setDeleteItem({ id: folderId, name: folderName });
    setDeleteType('folder');
    setShowDeleteConfirm(true);
  };

  const handleFolderDelete = async () => {
    try {
      setDeleting(true);
      setDeleteProgress({ current: 1, total: 1, itemName: deleteItem.name });
      
      await folderAPI.delete(storageId, deleteItem.id);
      
      // Clear delete progress and selection before loading
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, itemName: '' });
      clearSelection();
      
      await loadContents();
      onFileOperation?.();
    } catch (error) {
      alert('Failed to delete folder');
      setDeleting(false);
      setDeleteProgress({ current: 0, total: 0, itemName: '' });
    }
  };
  
  const handleConfirmDelete = async () => {
    if (deleteType === 'file') {
      await handleFileDelete();
    } else if (deleteType === 'folder') {
      await handleFolderDelete();
    }
  };

  const handleItemClick = (item, type, e) => {
    e.stopPropagation();
    
    // Clear any existing timer
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    
    // If it's a double-click (detail === 2), handle it immediately
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
    
    // Single click - wait a bit to see if it's a double-click
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

  const isItemStarred = (item) => {
    if (!item) return false;
    return starredUtils.isStarred(item.id, item.type);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const breadcrumbItems = [
    { id: null, label: storage?.name || 'Storage' },
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
  const displayFolders = isSearching && searchResults.folders ? searchResults.folders : folders;
  const displayFiles = isSearching && searchResults.files ? searchResults.files : files;
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
        const clickedOnCard = e.target.closest('[data-card]');
        const clickedOnActionBar = e.target.closest('.selection-bar');
        if (!clickedOnCard && !clickedOnActionBar) {
          clearSelection();
        }
      }}
    >
      {/* Header with Breadcrumbs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <Breadcrumbs items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
            {isSearching && searchQuery && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  🔍 Searching for "<span className="font-semibold text-gray-900 dark:text-gray-100">{searchQuery}</span>"
                  {currentFolder && <span> in current folder</span>}
                </span>
              </div>
            )}
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
              className="flex items-center gap-2 px-3 py-2 bg-primary-600 dark:bg-primary-500 
                hover:bg-primary-700 dark:hover:bg-primary-600 rounded-lg transition-colors
                text-white disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Rename Button - Only for single item */}
                {selectionCount === 1 && (
                  <button
                    onClick={() => showRenameDialog(selectedItems[0], selectedItems[0].type)}
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
                        d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
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
                            await fileAPI.delete(storageId, item.id);
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
                      
                      await loadContents();
                      onFileOperation?.();
                    } else {
                      // Single item - show confirmation modal
                      const firstItem = selectedItems[0];
                      if (firstItem.type === 'file') {
                        confirmFileDelete(firstItem.id, firstItem.name);
                      } else {
                        confirmFolderDelete(firstItem.id, firstItem.name);
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
          icon="📂"
          title="This folder is empty"
          description="Upload files or create folders to organize your content"
          action={() => fileInputRef.current?.click()}
          actionLabel="Upload Files"
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
              className={`group cursor-pointer transition-all relative overflow-visible ${
                isSelected({ ...folder, type: 'folder' })
                  ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : ''
              }`}
            >
              <div className="p-4 flex flex-col items-center">
                <div className="mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform">
                  <FileIcon type="folder" size="lg" className="sm:text-4xl" />
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
              className={`group cursor-pointer transition-all relative overflow-visible ${
                isSelected({ ...file, type: 'file' })
                  ? 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : ''
              }`}
            >
              <div className="p-4 flex flex-col items-center">
                <div className="mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform">
                  <FileIcon mimeType={file.mime_type} size="lg" className="sm:text-4xl" />
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
            {/* Table Header */}
            <div className="grid grid-cols-10 gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800/50 
              text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <div className="col-span-6 sm:col-span-6">Name</div>
              <div className="col-span-4 sm:col-span-2">Size</div>
              <div className="hidden sm:block sm:col-span-2">Modified</div>
            </div>

            {/* Folders */}
            {displayFolders.map((folder) => (
              <div
                key={`folder-${folder.id}`}
                data-card
                className={`grid grid-cols-10 gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 hover:bg-gray-50 
                  dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                  isSelected({ ...folder, type: 'folder' })
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : ''
                }`}
                onClick={(e) => handleItemClick(folder, 'folder', e)}
                onContextMenu={(e) => handleContextMenu(e, folder, 'folder')}
              >
                <div className="col-span-6 sm:col-span-6 flex items-center gap-2 sm:gap-3 min-w-0">
                  <FileIcon type="folder" size="sm" className="flex-shrink-0" />
                  <span className="font-medium text-xs sm:text-base text-gray-900 dark:text-gray-100 truncate">
                    {folder.name}
                  </span>
                </div>
                <div className="col-span-4 sm:col-span-2 flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  —
                </div>
                <div className="hidden sm:flex sm:col-span-2 items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(folder.created_at)}
                </div>
              </div>
            ))}

            {/* Files */}
            {displayFiles.map((file) => (
              <div
                key={`file-${file.id}`}
                data-card
                className={`grid grid-cols-10 gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 hover:bg-gray-50 
                  dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                  isSelected({ ...file, type: 'file' })
                    ? 'bg-primary-50 dark:bg-primary-900/20'
                    : ''
                }`}
                onClick={(e) => handleItemClick(file, 'file', e)}
                onContextMenu={(e) => handleContextMenu(e, file, 'file')}
                onDoubleClick={() => setPreviewFile(file)}
              >
                <div className="col-span-6 sm:col-span-6 flex items-center gap-2 sm:gap-3 min-w-0">
                  <FileIcon mimeType={file.mime_type} size="sm" className="flex-shrink-0" />
                  <span className="font-medium text-xs sm:text-base text-gray-900 dark:text-gray-100 truncate">
                    {file.name}
                  </span>
                </div>
                <div className="col-span-4 sm:col-span-2 flex items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(file.size)}
                </div>
                <div className="hidden sm:flex sm:col-span-2 items-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
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
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowCreateFolderModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              loading={creatingFolder}
              icon="📁"
            >
              Create Folder
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateFolder}>
          <Input
            label="Folder Name"
            placeholder="Enter folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            required
            autoFocus
          />
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
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowRenameModal(false);
              setRenameItem(null);
              setNewName('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleRename} 
              loading={renaming}
              disabled={!hasNameChanged()}
              icon="✏️"
            >
              Rename
            </Button>
          </>
        }
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
        danger={true}
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
            
            await fileAPI.upload(storageId, file, currentFolder);
            await loadContents();
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
