import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Workflows from './pages/Workflows';
import WorkflowCreate from './pages/WorkflowCreate';
import WorkflowDetail from './pages/WorkflowDetail';
import WorkflowEdit from './pages/WorkflowEdit';
import ExecutionLogs from './pages/ExecutionLogs';
import ExecutionLogDetail from './pages/ExecutionLogDetail';
import Settings from './pages/Settings';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loader">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
      />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/workflows" element={<Workflows />} />
        <Route path="/workflows/create" element={<WorkflowCreate />} />
        <Route path="/workflows/:id/edit" element={<WorkflowEdit />} />
        <Route path="/workflows/:id" element={<WorkflowDetail />} />
        <Route path="/logs" element={<ExecutionLogs />} />
        <Route path="/logs/:id" element={<ExecutionLogDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            borderRadius: '10px',
            fontSize: '14px',
          },
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}
