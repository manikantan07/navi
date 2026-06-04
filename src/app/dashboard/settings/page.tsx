'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface StoreSettings {
  id: string;
  name: string;
  domain: string | null;
  greeting: string;
  primaryColor: string;
  apiKey: string;
  openaiKey: string | null;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId') ?? '';

  const [form, setForm] = useState<StoreSettings | null>(null);
  const [openaiKey, setOpenaiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!storeId) return;
    fetch(`/api/stores`).then((r) => r.json()).then((stores) => {
      const store = Array.isArray(stores) ? stores.find((s: StoreSettings) => s.id === storeId) : null;
      if (store) { setForm(store); setOpenaiKey(''); }
      setLoading(false);
    });
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    const res = await fetch(`/api/stores/${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, openaiKey: openaiKey || undefined }),
    });
    if (!res.ok) { setError('Failed to save'); setSaving(false); return; }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading || !form) return <div className="text-center py-20 text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</a>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-medium text-gray-700">Settings</span>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Store settings</h1>

        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>}

          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900">Basic info</h2>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Store name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Store URL</label>
              <input value={form.domain ?? ''} onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="https://yourstore.com"
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
            </div>
          </div>

          {/* Widget appearance */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900">Widget appearance</h2>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Greeting message</label>
              <textarea rows={2} value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Brand color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-1" />
                <input value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                  className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400 font-mono w-36" />
                <div className="flex-1 h-10 rounded-lg" style={{ background: form.primaryColor }} />
              </div>
            </div>
          </div>

          {/* AI settings */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900">AI settings</h2>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">OpenAI API key</label>
              <input type="password" value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={form.openaiKey ? '••••••••••••••••••••••' : 'sk-... (uses server key if empty)'}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400 font-mono" />
              <p className="text-xs text-gray-400">Set a per-store key to use your own OpenAI quota. Leave blank to use the shared server key.</p>
            </div>
          </div>

          {/* Embed code */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-3">
            <h2 className="font-semibold text-gray-900">Embed code</h2>
            <div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400 break-all">
              {`<script src="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://navi.ai'}/widget.js" data-key="${form.apiKey}"></script>`}
            </div>
            <p className="text-xs text-gray-400">Paste this before the closing <code>&lt;/body&gt;</code> tag of your store.</p>
          </div>

          <button type="submit" disabled={saving}
            className="bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
