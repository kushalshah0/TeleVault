import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar({ storages = [], currentStorage, onStorageChange, usage, isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleNavigation = (callback) => {
    callback();
    onClose?.(); // Close mobile menu after navigation
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
      w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 
      flex flex-col h-screen 
      fixed lg:static top-0 left-0 z-50 lg:z-auto
      transition-transform duration-300 lg:transition-none
      ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      
      {/* Logo */}
      <div className="px-4 pt-4 pb-2 sm:pb-[14px] border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-2xl">☁️</span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 
            bg-clip-text text-transparent">
            TeleVault
          </h1>
        </div>
      </div>

      {/* Quick Actions */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase 
            tracking-wider px-3 mb-2">
            Quick Access
          </p>
          
          <button
            onClick={() => handleNavigation(() => navigate('/dashboard'))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
              ${isActive('/dashboard')
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            title="All Storages"
          >
            <span className="text-lg">📦</span>
            <span className="font-medium">All Storages</span>
          </button>

          <button
            onClick={() => handleNavigation(() => navigate('/recent'))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
              ${isActive('/recent')
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            title="Recent Files"
          >
            <span className="text-lg">🕐</span>
            <span className="font-medium">Recent</span>
          </button>

          <button
            onClick={() => handleNavigation(() => navigate('/starred'))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
              ${isActive('/starred')
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            title="Starred"
          >
            <span className="text-lg">⭐</span>
            <span className="font-medium">Starred</span>
          </button>

          <button
            onClick={() => handleNavigation(() => navigate('/activity'))}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
              ${isActive('/activity')
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            title="Activity Log"
          >
            <span className="text-lg">📋</span>
            <span className="font-medium">Activity</span>
          </button>
        </div>

        {/* Storages List */}
        {storages.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase 
              tracking-wider px-3 mb-2">
              My Storages
            </p>
            
            <div className="space-y-1">
              {storages.map((storage) => (
                <button
                  key={storage.id}
                  onClick={() => handleNavigation(() => {
                    navigate(`/storage/${storage.id}`);
                    onStorageChange?.(storage);
                  })}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                    ${currentStorage?.id === storage.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  title={storage.name}
                >
                  <span className="text-lg">💾</span>
                  <span className="font-medium truncate">{storage.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Storage Info */}
      {usage && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm font-bold">
            <span className="text-gray-900 dark:text-gray-100">
              {formatBytes(usage.used_bytes)}
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {usage.file_count} files
            </span>
          </div>
        </div>
      )}
    </aside>
    </>
  );
}

export default Sidebar;
