import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../utils/axios';
import { Eye, EyeOff, User, Lock, Shield, CheckCircle } from 'lucide-react';
import LizzyMikeLogo from '../assets/LizzyMikeLogo.png';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  const submitCountRef = useRef(0);
  const { user, isLoading: authLoading, login } = useAuth();

  // Redirect authenticated users away from login page
  React.useEffect(() => {
    console.log('[Login] useEffect triggered - authLoading:', authLoading, 'user:', user ? user.username : 'null');
    if (!authLoading && user) {
      console.log('[Login] User authenticated, navigating to dashboard');
      navigate('/', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    submitCountRef.current += 1;
    
    if (isLoading) {
      return;
    }

    setError('');
    setIsLoading(true);
    console.log('[Login] Form submitted for user:', username);

    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[Login] Making login API call...');
      const response = await apiClient.post('/token/', {
        username: username.trim(),
        password
      });

      if (response.status !== 200) {
        throw new Error('Login failed');
      }

      const { access, refresh } = response.data;
      console.log('[Login] Login API successful, calling AuthContext login...');
      
      // Use the AuthContext login function and wait for it to complete
      await login(access, refresh);
      console.log('[Login] AuthContext login completed');
      
      // Navigation will be handled by the useEffect above when user state changes
      // No need to manually navigate here

    } catch (err: any) {
      console.log('[Login] Login error:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = username.trim() && password.trim() && !isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>
      
      {/* Main login card */}
      <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        {/* Header with logo and title */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 mb-4 rounded-2xl overflow-hidden shadow-lg">
            <img 
              src={LizzyMikeLogo} 
              alt="LizzyMike Pharma Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">LizzyMike Pharma</h1>
          <p className="text-gray-600 text-sm">Secure Healthcare Management</p>
        </div>

        {/* Error message with animation */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6 animate-shake">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username field */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username"
                type="text"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>

          {/* Login button */}
          <button
            type="submit"
            disabled={!isFormValid}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 transform ${
              isFormValid
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] shadow-lg hover:shadow-xl'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Signing you in...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Sign In
              </span>
            )}
          </button>
        </form>

        {/* Additional features */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">Secure access to your pharmacy management system</p>
            <div className="flex items-center justify-center space-x-4 text-xs">
              <span className="flex items-center">
                <Shield className="h-3 w-3 mr-1 text-green-500" />
                SSL Encrypted
              </span>
              <span className="flex items-center">
                <Lock className="h-3 w-3 mr-1 text-blue-500" />
                HIPAA Compliant
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer with copyright and designer info */}
      <div className="mt-8 text-center text-sm text-gray-500 space-y-1">
        <p>&copy; {new Date().getFullYear()} LizzyMike Pharma. All rights reserved.</p>
        <p className="text-xs">
          Design and built by <span className="font-medium text-blue-600">Kelorm DevTech Solutions</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;