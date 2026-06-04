'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  url: string | null;
  inStock: boolean;
}

const emptyForm = { name: '', description: '', price: '', category: '', imageUrl: '', url: '' };

function ProductsContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId') ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!storeId) return;
    fetch(`/api/products?storeId=${storeId}`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setProducts(data);
      setLoading(false);
    });
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, ...form }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return; }
    setProducts((prev) => [...prev, data]);
    setForm(emptyForm);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</a>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-medium text-gray-700">Products</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <button onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
            + Add product
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900">New product</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="Product name" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input required type="number" step="0.01" placeholder="Price" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input placeholder="Category" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input placeholder="Product URL" value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input placeholder="Image URL" value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400 md:col-span-2" />
              <textarea placeholder="Description" value={form.description} rows={2}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400 resize-none md:col-span-2" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save product'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No products yet</h2>
            <p className="text-gray-500 mb-6">Add products so Navi can recommend them to shoppers</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-9 h-9 object-cover rounded-lg border border-gray-100" />}
                        <div>
                          <div className="font-medium text-gray-900">{p.name}</div>
                          {p.description && <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.category ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}
