import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({ name: '', phone: '', agristack_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/farmers/agristack-login', {
        agristack_id: form.agristack_id || undefined,
        phone: form.phone || undefined,
      });
      localStorage.setItem('farmer', JSON.stringify(res.data.farmer));
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/farmers', {
        name: form.name,
        phone: form.phone,
      });
      localStorage.setItem('farmer', JSON.stringify(res.data.farmer));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-emerald-800">BHOOMI OS</h1>
          <p className="text-sm text-gray-500 mt-1">Verified Evidence Layer for Indian Agriculture</p>
        </div>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'login' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'
            }`}
          >
            AgriStack Login
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              mode === 'register' ? 'bg-white shadow text-emerald-700' : 'text-gray-500'
            }`}
          >
            New Farmer
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">AgriStack ID (try AGR-IND-88219)</label>
              <input
                name="agristack_id"
                value={form.agristack_id}
                onChange={handleChange}
                placeholder="AGR-IND-88219"
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="text-center text-xs text-gray-400">or</div>
            <div>
              <label className="text-sm text-gray-600">Phone Number</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="9876543210"
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-800 transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Login with AgriStack'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">Phone Number</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="w-full mt-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-700 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-800 transition disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}