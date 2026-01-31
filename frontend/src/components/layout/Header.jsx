import ThemeToggle from '../ThemeToggle';

function Header({ user, onLogout, onSearch, onMenuToggle, searchValue = '' }) {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 
      sticky top-0 z-40 backdrop-blur-lg bg-white/95 dark:bg-gray-900/95">
      <div className="flex items-center justify-between px-4 sm:px-6 py-2">
        {/* App Logo - Mobile Only (Clickable to open sidebar) */}
        <button
          onClick={onMenuToggle}
          className="flex items-center gap-2 lg:hidden hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">☁️</span>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 
            bg-clip-text text-transparent">
            TeleVault
          </h1>
        </button>
        
        {/* Search Bar */}
        <div className="flex-1 max-w-2xl hidden md:block mx-4">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">🔍</span>
              </div>
              <input
                type="search"
                placeholder="Search files and folders... (Press Enter)"
                value={searchValue}
                onChange={(e) => onSearch?.(e.target.value, false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onSearch?.(e.target.value, true);
                  }
                }}
                className="block w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 
                  border border-gray-200 dark:border-gray-700 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  text-gray-900 dark:text-gray-100 placeholder-gray-500"
              />
            </div>
            <button
              onClick={() => onSearch?.(searchValue, true)}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white 
                rounded-lg transition-colors font-medium"
              title="Search"
            >
              Search
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Menu */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-gray-200 dark:border-gray-700">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
            
            <div className="relative group">
              <button className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 
                rounded-full flex items-center justify-center text-white font-semibold
                hover:shadow-lg transition-all">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </button>
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 
                rounded-lg shadow-soft-lg border border-gray-200 dark:border-gray-700
                opacity-0 invisible group-hover:opacity-100 group-hover:visible
                transition-all duration-200">
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 
                    dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md
                    flex items-center gap-2">
                    <span>👤</span> Profile
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-gray-700 
                    dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md
                    flex items-center gap-2">
                    <span>⚙️</span> Settings
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button 
                    onClick={onLogout}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 
                      dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md
                      flex items-center gap-2">
                    <span>🚪</span> Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
