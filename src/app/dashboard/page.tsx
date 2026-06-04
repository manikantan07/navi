'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';

interface Store {
  id: string;
  name: string;
  apiKey: string;
  domain: string | null;
  primaryColor: string;
  plan: string;
  createdAt: string;
  _count: { conversations: number; products: number };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="text-xs text-indigo-600 hover:underline font-medium">
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function StoreCard({ store }: { store: Store }) {
  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://navi.ai'}/widget.js" data-key="${store.apiKey}"></script>`;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{store.name}</h3>
          {store.domain && <p className="text-sm text-gray-400">{store.domain}</p>}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${store.plan === 'FREE' ? 'bg-gray-100 text-gray-500' : 'bg-indigo-100 text-indigo-700'}`}>
          {store.plan}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-gray-50 rounded-xl py-3">
          <div className="text-2xl font-bold text-gray-900">{store._count.conversations}</div>
          <div className="text-xs text-gray-400 mt-0.5">Conversations</div>
        </div>
        <div className="bg-gray-50 rounded-xl py-3">
          <div className="text-2xl font-bold text-gray-900">{store._count.products}</div>
          <div className="text-xs text-gray-400 mt-0.5">Products</div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Embed code</span>
          <CopyButton text={embedCode} />
        </div>
        <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto whitespace-nowrap">
          {embedCode}
        </div>
      </div>

      <div className="flex gap-2">
        <a href={`/dashboard/products?storeId=${store.id}`}
          className="flex-1 text-center text-sm py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
          Products
        </a>
        <a href={`/dashboard/analytics?storeId=${store.id}`}
          className="flex-1 text-center text-sm py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
          Analytics
        </a>
        <a href={`/dashboard/settings?storeId=${store.id}`}
          className="flex-1 text-center text-sm py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors font-medium">
          Settings
        </a>
      </div>
    </div>
  );
}

function NewStoreModal({ onClose, onCreated }: { onClose: () => void; onCreated: (store: Store) => void }) {
  const [form, setForm] = useState({ storeName: '', storeUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stores/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create store'); setLoading(false); return; }
      onCreated(data);
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
        <h2 className="font-bold text-gray-900 text-lg">Add a new store</h2>
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input required placeholder="Store name" value={form.storeName}
            onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
          <input placeholder="Store URL (optional)" value={form.storeUrl}
            onChange={(e) => setForm({ ...form, storeUrl: e.target.value })}
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewStore, setShowNewStore] = useState(false);

  useEffect(() => {
    fetch('/api/stores').then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setStores(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-indigo-600">
          <span>🧭</span> Navi
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{session?.user?.email}</span>
          <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm text-gray-500 hover:text-gray-800">Sign out</button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your stores</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your Navi widgets and products</p>
          </div>
          <button onClick={() => setShowNewStore(true)}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors">
            + New store
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : stores.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🏪</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No stores yet</h2>
            <p className="text-gray-500 mb-6">Create your first store to get an embed code</p>
            <button onClick={() => setShowNewStore(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700">
              Create your first store
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => <StoreCard key={store.id} store={store} />)}
          </div>
        )}
      </div>

      {showNewStore && (
        <NewStoreModal
          onClose={() => setShowNewStore(false)}
          onCreated={(store) => { setStores((prev) => [...prev, store]); setShowNewStore(false); }}
        />
      )}
    </div>
  );
}
