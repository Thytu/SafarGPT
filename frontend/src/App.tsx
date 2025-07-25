import { useEffect } from 'react';
import LoginForm from './components/LoginForm';
import SignUpForm from './components/SignUpForm';
import { useAuth } from './auth/AuthProvider';
import ChatPage from './components/ChatPage';
import { Routes, Route, useNavigate } from 'react-router-dom';

function App() {
  const { user } = useAuth();

  const navigate = useNavigate();

  // Redirect to home on login
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/login" element={<LoginForm switchToSignUp={() => navigate('/signup')} />} />
      <Route path="/signup" element={<SignUpForm switchToLogin={() => navigate('/login')} />} />
    </Routes>
  );
}

export default App;
