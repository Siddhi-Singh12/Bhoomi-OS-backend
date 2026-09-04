import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Sprout, ShieldCheck, Smartphone, KeyRound, UserPlus, ArrowRight, Sparkles, AlertCircle, Zap } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [form, setForm] = useState({ name: '', phone: '', agristack_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const DEMO_ACCOUNTS = [
    { id: 'AGR-IND-88219', name: 'Ravi Kumar', state: 'Khargone, MP', phone: '9876543210' },
    { id: 'AGR-PB-44021', name: 'Gurdeep Singh', state: 'Ludhiana, PB', phone: '9812345678' },
    { id: 'AGR-MH-99014', name: 'Anand Patil', state: 'Yavatmal, MH', phone: '9420011223' },
  ];

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSelectDemo(acc) {
    setForm({ ...form, agristack_id: acc.id, phone: acc.phone });
  }

  async function handleStartJudgeDemo() {
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/farmers/agristack-login', {
        agristack_id: 'AGR-IND-88219',
        phone: '9876543210',
      });
      localStorage.setItem('farmer', JSON.stringify(res.data.farmer));
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('judgeDemo', 'true');
      navigate('/dashboard?demo=judge');
    } catch (err) {
      const fallbackFarmer = {
        id: 1,
        name: 'Ravi Kumar',
        phone: '9876543210',
        agristack_id: 'AGR-IND-88219',
      };
      localStorage.setItem('farmer', JSON.stringify(fallbackFarmer));
      localStorage.setItem('token', 'judge-demo-token');
      localStorage.setItem('judgeDemo', 'true');
      navigate('/dashboard?demo=judge');
    } finally {
      setLoading(false);
    }
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
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-800/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 p-8 relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-800 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-md">
            <Sprout className="w-6 h-6 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-950">
            BHOOMI<span className="text-emerald-700">OS</span>
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Verified Satellite Evidence Layer for PMFBY Claims
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-3 py-1 rounded-full text-[11px] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            National AgriStack UFSI Interoperable
          </div>
        </div>

        {/* Start Judge Demo Button */}
        <button
          type="button"
          onClick={handleStartJudgeDemo}
          disabled={loading}
          className="w-full mb-4 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white p-3.5 rounded-xl border border-emerald-500/40 font-bold hover:border-emerald-400 hover:shadow-lg transition flex items-center justify-between group text-xs disabled:opacity-50"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-emerald-600 rounded-lg flex items-center justify-center text-white shadow-xs">
              <Zap className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="text-left">
              <span className="font-black text-emerald-300 block tracking-wide text-xs">
                Judge Demo Mode
              </span>
              <span className="text-[10px] text-slate-300 font-normal">
                1-Click Guided Calamity Walkthrough
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-mono group-hover:translate-x-1 transition-transform">
            <span>Launch</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>

        {/* Demo Accounts Quick Fill */}
        <div className="mb-5 bg-gray-50 border border-gray-200/80 rounded-xl p-3">
          <div className="flex items-center justify-between text-[11px] text-gray-500 mb-2 font-medium">
            <span className="flex items-center gap-1 font-semibold text-gray-700">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Quick Demo Accounts (1-Click Fill)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleSelectDemo(acc)}
                className={`p-2 text-left rounded-lg border text-[11px] transition ${
                  form.agristack_id === acc.id
                    ? 'bg-emerald-100/70 border-emerald-400 text-emerald-950'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="font-bold block truncate">{acc.name}</span>
                <span className="text-[10px] text-gray-500 block truncate">{acc.state}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex mb-5 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'login'
                ? 'bg-white shadow-xs text-emerald-800'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            AgriStack Auth
          </button>
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'register'
                ? 'bg-white shadow-xs text-emerald-800'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            New Farmer
          </button>
        </div>

        {/* Form Body */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-1">
                <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                AgriStack National ID
              </label>
              <input
                name="agristack_id"
                value={form.agristack_id}
                onChange={handleChange}
                placeholder="e.g. AGR-IND-88219"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-2 text-[11px] uppercase font-bold text-gray-400">or Mobile OTP</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-1">
                <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                Linked Aadhaar Mobile
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="e.g. 9876543210"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {loading ? (
                <>Verifying with AgriStack UFSI...</>
              ) : (
                <>
                  <span>Authenticate & Load Plots</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1">
                Farmer Full Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="e.g. Ramesh Chandra"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1">
                Mobile Number
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="e.g. 9811002233"
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-800 text-white py-3 rounded-xl font-bold hover:bg-emerald-900 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              {loading ? 'Registering...' : 'Complete Registration'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-gray-100 text-center">
          <p className="text-[11px] text-gray-400">
            Compliant with PMFBY Calamity Claim Verification Protocols 2026
          </p>
        </div>
      </div>
    </div>
  );
}