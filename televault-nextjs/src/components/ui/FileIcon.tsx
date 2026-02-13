'use client'

export interface FileIconProps {
  type?: 'folder' | 'file'
  mimeType?: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

function FileIcon({ type, mimeType, className = '', size = 'md' }: FileIconProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-16 h-16',
  }

  const getIconAndColor = () => {
    // Folder
    if (type === 'folder') {
      return {
        path: (
          <>
            <path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H11L9 5H5C3.89543 5 3 5.89543 3 7Z" />
          </>
        ),
        color: 'text-blue-500'
      }
    }

    // File types based on MIME type
    if (mimeType) {
      // Image files
      if (mimeType.startsWith('image/')) {
        return {
          path: (
            <>
              <path d="M4 16L8.586 11.414C9.367 10.633 10.633 10.633 11.414 11.414L16 16M14 14L15.586 12.414C16.367 11.633 17.633 11.633 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" />
            </>
          ),
          color: 'text-purple-500'
        }
      }
      
      // Video files
      if (mimeType.startsWith('video/')) {
        return {
          path: (
            <>
              <path d="M15 10L19.553 7.724C20.2364 7.38279 21 7.87479 21 8.618V15.382C21 16.1252 20.2364 16.6172 19.553 16.276L15 14M5 18H13C14.1046 18 15 17.1046 15 16V8C15 6.89543 14.1046 6 13 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18Z" />
            </>
          ),
          color: 'text-red-500'
        }
      }
      
      // Audio files
      if (mimeType.startsWith('audio/')) {
        return {
          path: (
            <>
              <path d="M9 19V6L21 3V16M9 19C9 20.1046 7.65685 21 6 21C4.34315 21 3 20.1046 3 19C3 17.8954 4.34315 17 6 17C7.65685 17 9 17.8954 9 19ZM21 16C21 17.1046 19.6569 18 18 18C16.3431 18 15 17.1046 15 16C15 14.8954 16.3431 14 18 14C19.6569 14 21 14.8954 21 16Z" />
            </>
          ),
          color: 'text-pink-500'
        }
      }
      
      // PDF files
      if (mimeType === 'application/pdf') {
        return {
          path: (
            <>
              <path d="M7 21H17C18.1046 21 19 20.1046 19 19V9L13 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" />
              <path d="M13 3V9H19" />
            </>
          ),
          color: 'text-red-600'
        }
      }
      
      // Text files
      if (mimeType.startsWith('text/')) {
        return {
          path: (
            <>
              <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" />
            </>
          ),
          color: 'text-gray-500'
        }
      }
      
      // Archive files
      if (mimeType.includes('zip') || mimeType.includes('compressed')) {
        return {
          path: (
            <>
              <path d="M5 8H7M7 8H9M7 8V6M7 8V10M9 10H7M7 10H5M7 10V12M7 12H9M7 12H5M7 12V14M9 8V6M5 10V12M9 12V14M7 21H17C18.1046 21 19 20.1046 19 19V9L13 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21Z" />
            </>
          ),
          color: 'text-yellow-600'
        }
      }
      
      // Word/Document files
      if (mimeType.includes('word') || mimeType.includes('document')) {
        return {
          path: (
            <>
              <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" />
            </>
          ),
          color: 'text-blue-600'
        }
      }
      
      // Excel/Spreadsheet files
      if (mimeType.includes('sheet') || mimeType.includes('excel')) {
        return {
          path: (
            <>
              <path d="M3 10H21M3 14H21M8 4V20M16 4V20M5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4Z" />
            </>
          ),
          color: 'text-green-600'
        }
      }
      
      // Presentation files
      if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
        return {
          path: (
            <>
              <path d="M7 4V20M17 4V20M3 8H21M3 12H21M3 16H21M5 4H19C20.1046 4 21 4.89543 21 6V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V6C3 4.89543 3.89543 4 5 4Z" />
            </>
          ),
          color: 'text-orange-600'
        }
      }
      
      // Code files (JSON, JavaScript)
      if (mimeType.includes('json') || mimeType.includes('javascript')) {
        return {
          path: (
            <>
              <path d="M10 20L14 4M18 8L22 12L18 16M6 16L2 12L6 8" />
            </>
          ),
          color: 'text-yellow-500'
        }
      }
    }

    // Default file icon
    return {
      path: (
        <>
          <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" />
        </>
      ),
      color: 'text-gray-400'
    }
  }

  const { path, color } = getIconAndColor()

  return (
    <svg
      className={`${sizeClasses[size]} ${color} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      role="img"
      aria-label={type || 'file'}
    >
      {path}
    </svg>
  )
}

export default FileIcon
