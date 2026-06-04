'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', storeName: '', storeUrl: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong'); setLoading(false); return; }

      await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      router.push('/dashboard');
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🧭</div>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 text-sm mt-1">Get your AI shopping assistant in 60 seconds</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col gap-4">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
          <input required placeholder="Your name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
          <input required type="email" placeholder="Email address" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
          <input required type="password" placeholder="Password" minLength={8} value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
          <div className="border-t border-gray-100 pt-2">
            <p className="text-xs text-gray-400 mb-3">Your first store</p>
            <div className="flex flex-col gap-4">
              <input required placeholder="Store name" value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input placeholder="Store URL (optional)" value={form.storeUrl}
                onChange={(e) => setForm({ ...form, storeUrl: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? 'Creating account...' : 'Get started free →'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <a href="/login" className="text-indigo-600 font-medium hover:underline">Sign in</a>
          </p>
        </form>
      </div>
    </main>
  );
}
