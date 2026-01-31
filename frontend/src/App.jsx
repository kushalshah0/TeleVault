import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StorageView from './components/StorageView';
import RecentView from './components/RecentView';
import StarredView from './components/StarredView';
import ActivityView from './components/ActivityView';
import MainLayout from './components/layout/MainLayout';
import { ModernLoader } from './components/ModernLoader';
import { authAPI, storageAPI } from './api';

function App() {
  const [user, setUser] = useState(null);
  const [storages, setStorages] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(false);

  useEffect(() => {
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      loadStorages();
      loadUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const checkAuth = async () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const response = await authAPI.getMe();
        setUser(response.data);
      } catch (error) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    setLoading(false);
  };

  const loadStorages = async () => {
    try {
      const response = await storageAPI.list();
      setStorages(response.data.storages);
    } catch (error) {
      console.error('Failed to load storages:', error);
    }
  };

  const loadUsage = async () => {
    try {
      const response = await authAPI.getUsage();
      setUsage(response.data);
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setStorages([]);
    setUsage(null);
  };

  const handleSearchQueryChange = (query, shouldSearch = false) => {
    setSearchQuery(query);
    if (shouldSearch) {
      setSearchTrigger(prev => !prev); // Toggle to trigger search
    }
  };

  if (loading) {
    return <ModernLoader text="Loading TeleVault..." type="spinner" />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <MainLayout 
                user={user} 
                onLogout={handleLogout} 
                storages={storages} 
                usage={usage}
                searchQuery={searchQuery}
                onSearchQueryChange={handleSearchQueryChange}
              >
                <Dashboard onStorageCreated={loadStorages} />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/storage/:storageId"
          element={
            user ? (
              <MainLayout 
                user={user} 
                onLogout={handleLogout} 
                storages={storages} 
                usage={usage}
                searchQuery={searchQuery}
                onSearchQueryChange={handleSearchQueryChange}
              >
                <StorageView onFileOperation={loadUsage} searchQuery={searchQuery} searchTrigger={searchTrigger} />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/recent"
          element={
            user ? (
              <MainLayout 
                user={user} 
                onLogout={handleLogout} 
                storages={storages} 
                usage={usage}
                searchQuery={searchQuery}
                onSearchQueryChange={handleSearchQueryChange}
              >
                <RecentView />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/starred"
          element={
            user ? (
              <MainLayout 
                user={user} 
                onLogout={handleLogout} 
                storages={storages} 
                usage={usage}
                searchQuery={searchQuery}
                onSearchQueryChange={handleSearchQueryChange}
              >
                <StarredView />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/activity"
          element={
            user ? (
              <MainLayout 
                user={user} 
                onLogout={handleLogout} 
                storages={storages} 
                usage={usage}
                searchQuery={searchQuery}
                onSearchQueryChange={handleSearchQueryChange}
              >
                <ActivityView />
              </MainLayout>
            ) : (
              <Navigate to="/" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
