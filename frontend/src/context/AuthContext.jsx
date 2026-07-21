import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Configure axios to always send cookies (httpOnly access_token & refresh_token)
axios.defaults.withCredentials = true;

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Helper to append X-CSRF-Token header to axios requests
  const getAuthHeaders = useCallback(() => {
    if (!csrfToken) return {};
    return { 'X-CSRF-Token': csrfToken };
  }, [csrfToken]);

  // Initial check on app mount to check if active session cookie exists
  const checkAuth = useCallback(async () => {
    try {
      setAuthLoading(true);
      const res = await axios.get('/api/auth/me');
      if (res.data && res.data.id) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      // Try refresh flow if access_token expired
      try {
        const refreshRes = await axios.post('/api/auth/refresh');
        if (refreshRes.data && refreshRes.data.csrf_token) {
          setCsrfToken(refreshRes.data.csrf_token);
        }
        const meRes = await axios.get('/api/auth/me');
        setUser(meRes.data);
      } catch {
        setUser(null);
      }
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login action
  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    if (res.data && res.data.user) {
      setUser(res.data.user);
      if (res.data.csrf_token) {
        setCsrfToken(res.data.csrf_token);
      }
      return res.data;
    }
    throw new Error(res.data?.detail || 'Login failed.');
  };

  // Signup action
  const signup = async (fullName, email, password) => {
    const res = await axios.post('/api/auth/signup', {
      full_name: fullName,
      email,
      password
    });
    if (res.data && res.data.user) {
      setUser(res.data.user);
      if (res.data.csrf_token) {
        setCsrfToken(res.data.csrf_token);
      }
      return res.data;
    }
    throw new Error(res.data?.detail || 'Signup failed.');
  };

  // Logout action
  const logout = async () => {
    try {
      await axios.post('/api/auth/logout', {}, { headers: getAuthHeaders() });
    } catch {
      // Ignore logout API errors
    } finally {
      setUser(null);
      setCsrfToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        authLoading,
        csrfToken,
        getAuthHeaders,
        login,
        signup,
        logout,
        checkAuth
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
