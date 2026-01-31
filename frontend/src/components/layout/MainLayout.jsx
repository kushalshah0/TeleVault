import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

function MainLayout({ user, onLogout, storages = [], currentStorage, usage, children, searchQuery, onSearchQueryChange }) {
  const [selectedStorage, setSelectedStorage] = useState(currentStorage);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleStorageChange = (storage) => {
    setSelectedStorage(storage);
  };

  const handleSearch = (query, shouldSearch = false) => {
    if (onSearchQueryChange) {
      onSearchQueryChange(query, shouldSearch);
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        storages={storages}
        currentStorage={selectedStorage || currentStorage}
        onStorageChange={handleStorageChange}
        usage={usage}
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:w-auto">
        {/* Header */}
        <Header
          user={user}
          onLogout={onLogout}
          onSearch={handleSearch}
          onMenuToggle={toggleMobileMenu}
          searchValue={searchQuery || ''}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
