"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Query our custom app_users table
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('username', username)
        .eq('password', password) // cleartext for prototype as requested
        .single();

      if (error || !data) {
        setError('Invalid credentials');
      } else {
        login(data.username, data.role);
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Face Attendance Login</h1>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="admin or kiosk"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-900/50 text-red-200 p-3 rounded text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login (Admin/Kiosk)'}
          </button>
        </form>

        <div className="my-6 flex items-center justify-between">
          <div className="h-px bg-gray-600 w-full"></div>
          <span className="text-gray-400 px-3 text-sm">OR</span>
          <div className="h-px bg-gray-600 w-full"></div>
        </div>

        <button
          onClick={() => router.push('/employee/login')}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded transition-colors flex items-center justify-center space-x-2"
        >
          <span>👤</span>
          <span>Go to Employee Portal</span>
        </button>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>Default Accounts:</p>
          <p>Admin: admin / admin123</p>
          <p>Kiosk: kiosk / kiosk123</p>
        </div>
      </div>
    </div>
  );
}
