function FileIcon({ type, mimeType, className = '', size = 'md' }) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-6xl',
  };

  const getIcon = () => {
    // Folder
    if (type === 'folder') {
      return '📁';
    }

    // File types based on MIME type
    if (mimeType) {
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType.startsWith('video/')) return '🎥';
      if (mimeType.startsWith('audio/')) return '🎵';
      if (mimeType === 'application/pdf') return '📕';
      if (mimeType.startsWith('text/')) return '📝';
      if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
      if (mimeType.includes('word') || mimeType.includes('document')) return '📄';
      if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
      if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
      if (mimeType.includes('json') || mimeType.includes('javascript')) return '📋';
    }

    // Default file icon
    return '📄';
  };

  return (
    <span className={`${sizeClasses[size]} ${className}`} role="img" aria-label={type || 'file'}>
      {getIcon()}
    </span>
  );
}

export default FileIcon;
