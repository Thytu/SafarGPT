import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { FaGoogle, FaApple, FaWindows } from 'react-icons/fa';
import { BsPhone } from 'react-icons/bs';

interface OAuthButtonProps {
  icon: React.ReactNode;
  label: string;
}

const OAuthButton = ({ icon, label }: OAuthButtonProps) => (
  <button
    type="button"
    className="w-full flex items-center gap-3 border border-gray-300 rounded py-2 justify-center hover:bg-gray-50 transition"
  >
    {icon}
    <span className="text-sm font-medium">{label}</span>
  </button>
);

interface LoginFormProps {
  switchToSignUp: () => void;
}

const LoginForm = ({ switchToSignUp }: LoginFormProps) => {
  const { signIn, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Disable submit until both fields are populated
  const isDisabled = email.trim() === '' || password.trim() === '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisabled || isLoading) return;
    setIsLoading(true);
    await signIn(email, password);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Brand header */}
      <header className="p-6">
        <span className="font-semibold text-lg">SafarGPT</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4">
        <div className="w-full max-w-md mt-16">
          <h1 className="text-3xl font-semibold text-center mb-8">Welcome back</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-red-600 text-sm text-center">{error}</p>
            )}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
            {/* Password hidden for ChatGPT style but kept for Supabase password sign-in */}
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
            <button
              type="submit"
              disabled={isDisabled || isLoading}
              className={`w-full rounded py-3 font-medium flex items-center justify-center transition ${
                isDisabled || isLoading
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-black text-white hover:opacity-90'
              }`}
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 text-current"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              ) : (
                'Continue'
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-4">
            Don&apos;t have an account?{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                switchToSignUp();
              }}
              className="text-blue-600 hover:underline"
            >
              Sign up
            </a>
          </p>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-grow h-px bg-gray-200" />
            <span className="mx-3 text-xs text-gray-500">OR</span>
            <div className="flex-grow h-px bg-gray-200" />
          </div>

          <div className="space-y-3">
            <OAuthButton icon={<FaGoogle className="text-xl" />} label="Continue with Google" />
            <OAuthButton icon={<FaWindows className="text-xl" />} label="Continue with Microsoft Account" />
            <OAuthButton icon={<FaApple className="text-xl" />} label="Continue with Apple" />
            <OAuthButton icon={<BsPhone className="text-xl" />} label="Continue with phone" />
          </div>

          <p className="text-xs text-center text-gray-500 mt-10 space-x-1">
            <span>Terms of Use</span>
            <span className="inline-block border-l border-gray-300 h-3 mx-2" />
            <span>Privacy Policy</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginForm; 