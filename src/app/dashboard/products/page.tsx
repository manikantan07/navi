'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

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
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [csvError, setCsvError] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const csvRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!storeId) return;
    fetch(`/api/products?storeId=${storeId}`).then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setProducts(data);
      setLoading(false);
    });
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({ name: p.name, description: p.description ?? '', price: String(p.price), category: p.category ?? '', imageUrl: p.imageUrl ?? '', url: p.url ?? '' });
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (editingProduct) {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingProduct.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return; }
      setProducts((prev) => prev.map((p) => p.id === data.id ? data : p));
    } else {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed'); setSaving(false); return; }
      setProducts((prev) => [...prev, data]);
    }

    setForm(emptyForm);
    setShowForm(false);
    setEditingProduct(null);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const toggleStock = async (p: Product) => {
    const res = await fetch('/api/products', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, inStock: !p.inStock }),
    });
    const data = await res.json();
    if (res.ok) setProducts((prev) => prev.map((x) => x.id === data.id ? data : x));
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError('');
    setCsvImporting(true);

    const text = await file.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ''));

    const nameIdx = headers.findIndex((h) => h === 'name' || h === 'title' || h === 'productname');
    const priceIdx = headers.findIndex((h) => h === 'price' || h === 'cost');
    const descIdx = headers.findIndex((h) => h === 'description' || h === 'desc');
    const catIdx = headers.findIndex((h) => h === 'category' || h === 'cat' || h === 'type');
    const imgIdx = headers.findIndex((h) => h === 'imageurl' || h === 'image' || h === 'img' || h === 'photo');
    const urlIdx = headers.findIndex((h) => h === 'url' || h === 'link' || h === 'producturl');

    if (nameIdx === -1 || priceIdx === -1) {
      setCsvError('CSV must have "name" and "price" columns');
      setCsvImporting(false);
      e.target.value = '';
      return;
    }

    const rows = lines.slice(1).filter((l) => l.trim()).map((line) => {
      const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
      return {
        storeId,
        name: cols[nameIdx] ?? '',
        price: cols[priceIdx] ?? '0',
        description: descIdx >= 0 ? (cols[descIdx] ?? '') : '',
        category: catIdx >= 0 ? (cols[catIdx] ?? '') : '',
        imageUrl: imgIdx >= 0 ? (cols[imgIdx] ?? '') : '',
        url: urlIdx >= 0 ? (cols[urlIdx] ?? '') : '',
      };
    }).filter((r) => r.name && parseFloat(r.price) > 0);

    let imported = 0;
    for (const row of rows) {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      if (res.ok) imported++;
    }

    e.target.value = '';
    setCsvImporting(false);
    load();
    if (imported < rows.length) setCsvError(`Imported ${imported}/${rows.length} rows. Some failed.`);
  };

  const filtered = products.filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</a>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-medium text-gray-700">Products</span>
        <span className="ml-auto text-sm text-gray-400">{products.length} products</span>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 w-48"
            />
            <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
            <button onClick={() => csvRef.current?.click()} disabled={csvImporting}
              className="border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
              {csvImporting ? 'Importing...' : '⬆ Import CSV'}
            </button>
            <button onClick={openAdd}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">
              + Add product
            </button>
          </div>
        </div>

        {csvError && <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{csvError}</div>}

        {/* CSV format hint */}
        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
          <strong>CSV format:</strong> name, price, description, category, imageUrl, url — first row must be headers.
          <a href="#" onClick={(e) => { e.preventDefault(); const csv = 'name,price,description,category,imageUrl,url\nExample Product,29.99,A great product,Electronics,,'; const b = new Blob([csv], {type:'text/csv'}); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download='template.csv'; a.click(); }} className="ml-2 underline">Download template</a>
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 flex flex-col gap-4">
            <h2 className="font-semibold text-gray-900">{editingProduct ? 'Edit product' : 'New product'}</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required placeholder="Product name *" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input required type="number" step="0.01" min="0" placeholder="Price *" value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input placeholder="Category" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-indigo-400" />
              <input placeholder="Product page URL" value={form.url}
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
              <button type="button" onClick={() => { setShowForm(false); setEditingProduct(null); setForm(emptyForm); }}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingProduct ? 'Update product' : 'Save product'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📦</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{searchQuery ? 'No results found' : 'No products yet'}</h2>
            <p className="text-gray-500 mb-6">{searchQuery ? 'Try a different search' : 'Add products so Navi can recommend them to customers'}</p>
            {!searchQuery && <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">+ Add your first product</button>}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-500">In Stock</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} className="w-10 h-10 object-cover rounded-lg border border-gray-100 shrink-0" />
                          : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 shrink-0 text-lg">📦</div>}
                        <div>
                          <div className="font-medium text-gray-900">{p.name}</div>
                          {p.description && <div className="text-xs text-gray-400 truncate max-w-xs">{p.description}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{p.category ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleStock(p)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.inStock ? 'bg-green-500' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.inStock ? 'translate-x-4' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => openEdit(p)} className="text-xs text-indigo-500 hover:text-indigo-700">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                      </div>
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
