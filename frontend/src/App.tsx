import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import { useAuth } from './auth/AuthProvider';
import ChatPage from './components/ChatPage';
import AdminDashboard from './components/AdminDashboard';
import { Routes, Route, useNavigate } from 'react-router-dom';

function App() {
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to home on login
  useEffect(() => {
    if (!user) return;
    // Only redirect if we are currently on an auth-related page
    const authPaths = ['/login', '/signup'];
    if (authPaths.includes(location.pathname)) {
      navigate('/');
    }
  }, [user, location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/login" element={<LoginForm switchToSignUp={() => navigate('/signup')} />} />
      <Route path="/signup" element={<SignUpForm switchToLogin={() => navigate('/login')} />} />
      <Route path="/admin" element={<AdminDashboard />} />
    </Routes>
  );
}

export default App;
