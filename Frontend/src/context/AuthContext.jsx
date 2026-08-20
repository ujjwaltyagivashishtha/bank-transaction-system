import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '../api/auth.api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('transact_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('transact_token') || null;
  });

  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Sync token and user to localStorage
  const setAuthData = useCallback((userData, jwtToken) => {
    setUser(userData);
    setToken(jwtToken);
    if (jwtToken) {
      localStorage.setItem('transact_token', jwtToken);
    } else {
      localStorage.removeItem('transact_token');
    }
    if (userData) {
      localStorage.setItem('transact_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('transact_user');
    }
  }, []);

  // Validate session on app launch
  useEffect(() => {
    let isMounted = true;

    async function verifySession() {
      const storedToken = localStorage.getItem('transact_token');
      if (!storedToken) {
        if (isMounted) setIsInitializing(false);
        return;
      }

      try {
        const data = await getCurrentUser();
        if (isMounted && data?.user) {
          setUser(data.user);
          localStorage.setItem('transact_user', JSON.stringify(data.user));
        }
      } catch (err) {
        console.warn('Session restoration failed:', err.response?.status);
        if (isMounted && err.response?.status === 401) {
          setAuthData(null, null);
        }
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    verifySession();

    return () => {
      isMounted = false;
    };
  }, [setAuthData]);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const data = await loginUser(credentials);
      setAuthData(data.user, data.token);
      return { success: true, data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData) => {
    setLoading(true);
    try {
      const data = await registerUser(formData);
      setAuthData(data.user, data.token);
      return { success: true, data };
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setAuthData(null, null);
      setLoading(false);
    }
  };

  // Listen for global unauthorized events (e.g. 401 token expiry)
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const isAuthenticated = Boolean(token && user);
  const isSystemUser = Boolean(user?.systemUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isSystemUser,
        loading,
        isInitializing,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
