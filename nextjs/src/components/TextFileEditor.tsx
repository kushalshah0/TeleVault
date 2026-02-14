'use client'

import { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface FileExtension {
  value: string;
  label: string;
}

interface TextFileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => Promise<void>;
  editFile?: { name: string } | null;
  editContent?: string;
}

function TextFileEditor({ isOpen, onClose, onSave, editFile, editContent }: TextFileEditorProps) {
  const [fileName, setFileName] = useState('');
  const [fileExtension, setFileExtension] = useState('txt');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = !!editFile;

  const fileExtensions: FileExtension[] = [
    { value: 'txt', label: 'Text (.txt)' },
    { value: 'json', label: 'JSON (.json)' },
    { value: 'md', label: 'Markdown (.md)' },
    { value: 'csv', label: 'CSV (.csv)' },
    { value: 'xml', label: 'XML (.xml)' },
    { value: 'html', label: 'HTML (.html)' },
    { value: 'css', label: 'CSS (.css)' },
    { value: 'js', label: 'JavaScript (.js)' },
    { value: 'py', label: 'Python (.py)' },
    { value: 'log', label: 'Log (.log)' }
  ];

  // Initialize form when editing an existing file
  useEffect(() => {
    if (isOpen && editFile) {
      // Extract name and extension from the file
      const lastDotIndex = editFile.name.lastIndexOf('.');
      if (lastDotIndex > 0) {
        const name = editFile.name.substring(0, lastDotIndex);
        const ext = editFile.name.substring(lastDotIndex + 1);
        setFileName(name);
        setFileExtension(ext);
      } else {
        setFileName(editFile.name);
        setFileExtension('txt');
      }
      
      // Set content from editContent prop
      setContent(editContent || '');
    } else if (isOpen && !editFile) {
      // Reset for new file creation
      setFileName('');
      setFileExtension('txt');
      setContent('');
    }
  }, [isOpen, editFile, editContent]);

  const handleSave = async () => {
    if (!fileName.trim()) {
      alert('Please enter a file name');
      return;
    }

    if (!content.trim()) {
      alert('Please enter some content');
      return;
    }

    setIsSaving(true);
    try {
      const fullFileName = `${fileName}.${fileExtension}`;
      
      // Create a Blob from the text content
      const blob = new Blob([content], { type: 'text/plain' });
      
      // Create a File object
      const file = new File([blob], fullFileName, { type: 'text/plain' });
      
      await onSave(file);
      
      // Reset form
      setFileName('');
      setContent('');
      setFileExtension('txt');
      onClose();
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (content.trim() && !confirm('You have unsaved changes. Are you sure you want to close?')) {
      return;
    }
    setFileName('');
    setContent('');
    setFileExtension('txt');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? 'Edit Text File' : 'Create New Text File'}>
      <div className="space-y-4">
        {/* File Name Input */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              File Name
            </label>
            <Input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              className="w-full"
              autoFocus
            />
          </div>
          
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Extension
            </label>
            <select
              value={fileExtension}
              onChange={(e) => setFileExtension(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 
                dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {fileExtensions.map((ext) => (
                <option key={ext.value} value={ext.value}>
                  {ext.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preview of full filename */}
        {fileName && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            File will be saved as: <span className="font-medium text-gray-900 dark:text-gray-100">
              {fileName}.{fileExtension}
            </span>
          </div>
        )}

        {/* Content Editor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your content here..."
            rows={12}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 
              dark:border-gray-600 rounded-lg !text-gray-900 dark:!text-white
              placeholder:text-gray-400 dark:placeholder:text-gray-500
              focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm
              resize-none"
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {content.length} characters, {content.split('\n').length} lines
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create & Upload')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default TextFileEditor;
