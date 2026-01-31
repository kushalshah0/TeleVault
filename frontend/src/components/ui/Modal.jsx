import { useEffect } from 'react';
import Button from './Button';

function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md mx-4',
    md: 'max-w-2xl mx-4',
    lg: 'max-w-4xl mx-4',
    xl: 'max-w-6xl mx-4',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div className={`relative w-full ${sizes[size]} bg-white dark:bg-gray-800 
          rounded-xl shadow-soft-lg transform transition-all`}>
          
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b 
              border-gray-200 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 pr-4">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg 
                  transition-colors text-gray-500 hover:text-gray-700 
                  dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Body */}
          <div className="px-4 sm:px-6 py-4 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
          
          {/* Footer */}
          {footer && (
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center 
              justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t 
              border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Modal;
