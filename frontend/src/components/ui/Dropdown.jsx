import { useState, useRef, useEffect } from 'react';

function Dropdown({ 
  trigger, 
  items = [], 
  align = 'right',
  className = '' 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div onClick={(e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}>
        {trigger}
      </div>

      {isOpen && (
        <div className={`absolute ${alignmentClasses[align]} mt-2 w-48 
          bg-white dark:bg-gray-800 rounded-lg shadow-lg 
          border border-gray-200 dark:border-gray-700 py-1`}
          style={{ zIndex: 1000 }}>
          {items.map((item, index) => (
            <div key={index}>
              {item.divider ? (
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
              ) : (
                <button
                  onClick={() => {
                    item.onClick?.();
                    setIsOpen(false);
                  }}
                  disabled={item.disabled}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3
                    transition-colors
                    ${item.danger 
                      ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                    ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dropdown;
