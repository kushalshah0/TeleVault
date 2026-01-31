import { useState } from 'react';
import { authAPI } from '../api';
import { Button, Input, Card } from './ui';

function Login({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await authAPI.login(formData.username, formData.password);
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        
        const userResponse = await authAPI.getMe();
        onLogin(userResponse.data);
      } else {
        await authAPI.register(formData.username, formData.email, formData.password);
        setIsLogin(true);
        setError('');
        alert('Registration successful! Please login.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br 
      from-primary-50 via-white to-secondary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 
      px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br 
            from-primary-500 to-secondary-500 rounded-2xl mb-4 text-3xl shadow-soft-lg">
            ☁️
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 
            bg-clip-text text-transparent mb-2">
            TeleVault
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isLogin ? 'Welcome back!' : 'Create your account'}
          </p>
        </div>

        {/* Login/Register Card */}
        <Card className="shadow-soft-lg">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 
                dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Username"
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter your username"
                icon="👤"
              />

              {!isLogin && (
                <Input
                  label="Email Address"
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                  icon="📧"
                />
              )}

              <Input
                label="Password"
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                icon="🔒"
              />

              <Button
                type="submit"
                className="w-full"
                loading={loading}
                icon={isLogin ? '🔐' : '✨'}
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                  className="font-medium text-primary-600 dark:text-primary-400 
                    hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          © {new Date().getFullYear()} TeleVault. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default Login;
