export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-xl font-bold text-indigo-600">
          <span>🧭</span> Navi
        </div>
        <div className="flex items-center gap-6">
          <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-800">Pricing</a>
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-800">Sign in</a>
          <a href="/signup" className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Get started</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-8 py-24 text-center">
        <div className="inline-block bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">AI Shopping Assistant</div>
        <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-6">
          Add a smart chat widget<br />to your store in 60 seconds
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Navi helps your shoppers find products, track orders, and get recommendations — powered by AI, with zero setup complexity.
        </p>
        <div className="flex items-center justify-center gap-4">
          <a href="/signup" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors">
            Start free →
          </a>
          <a href="#how" className="text-gray-500 px-6 py-3 hover:text-gray-800">See how it works</a>
        </div>
      </section>

      {/* Embed code preview */}
      <section id="how" className="bg-gray-50 py-20">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">One line. That&apos;s it.</h2>
          <p className="text-gray-500 mb-8">Paste this into your store&apos;s HTML and Navi appears instantly.</p>
          <div className="bg-gray-900 rounded-xl p-6 text-left font-mono text-sm text-green-400 overflow-x-auto">
            {'<script src="https://navi.ai/widget.js" data-key="your-api-key"></script>'}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-8 py-20">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Everything your shoppers need</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: '🛍', title: 'Product search', desc: 'Shoppers describe what they want in plain English and Navi finds it.' },
            { icon: '📦', title: 'Order tracking', desc: 'Customers ask "where is my order?" and get a real-time answer.' },
            { icon: '🎁', title: 'Recommendations', desc: 'Navi suggests products based on budget, category, or occasion.' },
            { icon: '💬', title: 'Multi-turn chat', desc: 'Full conversation memory so follow-up questions just work.' },
            { icon: '🎨', title: 'Custom branding', desc: 'Match your store colors, name, and greeting message.' },
            { icon: '⚡', title: 'Works without AI', desc: 'Smart rule-based fallback means it works even without an API key.' },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">Simple pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              { name: 'Free', price: '$0', desc: '1 store, up to 500 conversations/mo', cta: 'Start free', highlight: false },
              { name: 'Pro', price: '$29/mo', desc: 'Unlimited stores, AI responses, analytics', cta: 'Start Pro', highlight: true },
            ].map((p) => (
              <div key={p.name} className={`p-8 rounded-2xl border ${p.highlight ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-gray-200 bg-white'}`}>
                <div className={`text-sm font-semibold mb-2 ${p.highlight ? 'text-indigo-200' : 'text-gray-400'}`}>{p.name}</div>
                <div className={`text-4xl font-bold mb-4 ${p.highlight ? 'text-white' : 'text-gray-900'}`}>{p.price}</div>
                <p className={`text-sm mb-6 ${p.highlight ? 'text-indigo-100' : 'text-gray-500'}`}>{p.desc}</p>
                <a href="/signup" className={`block text-center py-2 rounded-lg font-semibold transition-colors ${p.highlight ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                  {p.cta} →
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-sm text-gray-400 border-t border-gray-100">
        © 2025 Navi · AI shopping assistant for modern stores
      </footer>
    </main>
  );
}
