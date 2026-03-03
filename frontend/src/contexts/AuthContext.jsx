
// createContext → Creates a global state container
//useContext → Used to access that global state
//useState → Stores state
//useEffect → Runs side effects (e.g. API calls) on component mount or when dependencies change
import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

//Wraps your entire app
//Provides authentication data to all child components

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadProfile = async () => {
    try {
      const { data } = await authAPI.getProfile();
      if (data.success) {
        setUser(data.user);
        setOrganization(data.user.organizationId);
      }
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setOrganization(data.organization);
    }
    return data;
  };

  const register = async (name, email, password, organizationName) => {
    const { data } = await authAPI.register({ name, email, password, organizationName });
    if (data.success && data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setOrganization(data.organization);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
