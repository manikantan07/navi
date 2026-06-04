'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Compass, X, Maximize2, Minimize2, Square, Paperclip, Mic, MicOff,
  Send, Copy, Check, ShoppingBag, Headphones, ArrowRight, RotateCcw, Languages,
} from 'lucide-react';

// ── i18n ──────────────────────────────────────────────────────────────────

type LangCode = 'en' | 'ar' | 'fr' | 'es' | 'hi';

interface LangDef {
  label: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  placeholder: string;
  send: string;
  online: string;
  sessionEnded: string;
  endSession: string;
  endConfirm: string;
  cancel: string;
  endBtn: string;
  newSession: string;
  sessionEndedMsg: string;
  connectSupport: string;
  quickReplies: string[];
}

const LANGUAGES: Record<LangCode, LangDef> = {
  en: {
    label: 'EN', nativeName: 'English', dir: 'ltr',
    placeholder: 'Ask me anything…',
    send: 'Send', online: 'Online', sessionEnded: 'Session ended',
    endSession: 'End session', endConfirm: 'End this session?',
    cancel: 'Cancel', endBtn: 'End session',
    newSession: 'Start new session', sessionEndedMsg: 'Session ended. Thanks for chatting!',
    connectSupport: 'Connect with support',
    quickReplies: ["Show me what's available", 'I need a gift idea', "What's under $50?", 'Help with my order'],
  },
  ar: {
    label: 'AR', nativeName: 'العربية', dir: 'rtl',
    placeholder: 'اسألني أي شيء…',
    send: 'إرسال', online: 'متصل', sessionEnded: 'انتهت الجلسة',
    endSession: 'إنهاء الجلسة', endConfirm: 'هل تريد إنهاء هذه الجلسة؟',
    cancel: 'إلغاء', endBtn: 'إنهاء',
    newSession: 'بدء جلسة جديدة', sessionEndedMsg: 'انتهت الجلسة. شكراً للتواصل!',
    connectSupport: 'تواصل مع الدعم',
    quickReplies: ['اعرض المنتجات المتاحة', 'أحتاج فكرة هدية', 'ما هو أقل من 50$؟', 'مساعدة في طلبي'],
  },
  fr: {
    label: 'FR', nativeName: 'Français', dir: 'ltr',
    placeholder: 'Posez-moi une question…',
    send: 'Envoyer', online: 'En ligne', sessionEnded: 'Session terminée',
    endSession: 'Terminer la session', endConfirm: 'Terminer cette session ?',
    cancel: 'Annuler', endBtn: 'Terminer',
    newSession: 'Nouvelle session', sessionEndedMsg: 'Session terminée. Merci !',
    connectSupport: 'Contacter le support',
    quickReplies: ['Voir les produits', 'Idée cadeau', 'Moins de 50$ ?', 'Aide commande'],
  },
  es: {
    label: 'ES', nativeName: 'Español', dir: 'ltr',
    placeholder: 'Pregúntame algo…',
    send: 'Enviar', online: 'En línea', sessionEnded: 'Sesión terminada',
    endSession: 'Terminar sesión', endConfirm: '¿Terminar esta sesión?',
    cancel: 'Cancelar', endBtn: 'Terminar',
    newSession: 'Nueva sesión', sessionEndedMsg: '¡Sesión terminada. Gracias!',
    connectSupport: 'Contactar soporte',
    quickReplies: ['Ver productos', 'Idea de regalo', '¿Menos de $50?', 'Ayuda con pedido'],
  },
  hi: {
    label: 'HI', nativeName: 'हिन्दी', dir: 'ltr',
    placeholder: 'कुछ भी पूछें…',
    send: 'भेजें', online: 'ऑनलाइन', sessionEnded: 'सत्र समाप्त',
    endSession: 'सत्र समाप्त करें', endConfirm: 'यह सत्र समाप्त करें?',
    cancel: 'रद्द करें', endBtn: 'समाप्त करें',
    newSession: 'नया सत्र शुरू करें', sessionEndedMsg: 'सत्र समाप्त। धन्यवाद!',
    connectSupport: 'सहायता से जुड़ें',
    quickReplies: ['उत्पाद दिखाएं', 'उपहार सुझाएं', '$50 से कम?', 'ऑर्डर में सहायता'],
  },
};

const RTL_REGEX = /[؀-ۿݐ-ݿ֐-׿ࢠ-ࣿ]/;

interface Product { id: string; name: string; price: number; imageUrl?: string; url?: string; category?: string; description?: string; }
interface AttachedFile { name: string; type: string; dataUrl?: string; text?: string; }
interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  escalate?: string;
  file?: AttachedFile;
  ts?: number;
}

interface NaviWidgetProps {
  apiKey: string;
  apiUrl?: string;
  primaryColor?: string;
  greeting?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function parseProducts(text: string): { clean: string; products: Product[] } {
  const match = text.match(/<products>([\s\S]*?)(?:<\/products>|\]\/products>)/);
  if (!match) return { clean: text, products: [] };
  try {
    let json = match[1].trim();
    if (!json.startsWith('[')) json = '[' + json;
    if (!json.endsWith(']')) json = json.replace(/,?\s*$/, '') + ']';
    const products = JSON.parse(json);
    const clean = text.replace(/<products>[\s\S]*?(?:<\/products>|\]\/products>)/, '').trim();
    return { clean, products };
  } catch { return { clean: text.replace(/<products>[\s\S]*/, '').trim(), products: [] }; }
}

function parseEscalate(text: string) {
  return text.match(/<escalate reason="([^"]*)"\/>/)?.[1];
}

function stripTags(text: string) {
  return text
    .replace(/<escalate[^/]*\/>/g, '')
    .replace(/<\/?products>/g, '')
    .trim();
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ProductCard({ product, color }: { product: Product; color: string }) {
  return (
    <a href={product.url ?? '#'} target="_blank" rel="noreferrer"
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, border: '1px solid #e5e7eb', textDecoration: 'none', color: 'inherit', background: '#fafafa' }}>
      {product.imageUrl
        ? <img src={product.imageUrl} alt={product.name} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />
        : <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}><ShoppingBag size={20} /></div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</div>
        {product.category && <div style={{ fontSize: 11, color: '#9ca3af' }}>{product.category}</div>}
        <div style={{ fontSize: 13, fontWeight: 600, color }}>${product.price}</div>
      </div>
    </a>
  );
}

function FileBubble({ file }: { file: AttachedFile }) {
  if (file.type.startsWith('image/') && file.dataUrl) {
    return <img src={file.dataUrl} alt={file.name} style={{ maxWidth: 180, borderRadius: 8, marginBottom: 4 }} />;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.2)', borderRadius: 8, marginBottom: 4, fontSize: 12 }}>
      <Paperclip size={14} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{file.name}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      title="Copy"
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#9ca3af', opacity: 0, transition: 'opacity 0.15s', display: 'flex', alignItems: 'center' }}
      className="copy-btn">
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────

function NaviWidget({ apiKey, apiUrl = '', primaryColor = '#6366f1', greeting }: NaviWidgetProps) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => Math.random().toString(36).slice(2));
  const [sessionEnded, setSessionEnded] = useState(false);
  const [lang, setLang] = useState<LangCode>('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [pendingFile, setPendingFile] = useState<AttachedFile | null>(null);
  const [listening, setListening] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const color = primaryColor;
  const t = LANGUAGES[lang];
  const isRTL = t.dir === 'rtl';

  // Auto-detect RTL from user typing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);
    if (RTL_REGEX.test(val) && lang === 'en') setLang('ar');
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
  };

  const switchLang = (code: LangCode) => {
    setLang(code);
    setShowLangMenu(false);
  };

  useEffect(() => {
    if (messages.length === 0 && greeting) {
      setMessages([{ role: 'assistant', content: greeting, ts: Date.now() }]);
    }
  }, [greeting, messages.length]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Speech ──
  const toggleSpeech = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }

    if (listening) { recognitionRef.current?.stop(); return; }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setInput(transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  }, [listening]);

  // ── File pick ──
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      reader.onload = () => setPendingFile({ name: file.name, type: file.type, dataUrl: reader.result as string });
      reader.readAsDataURL(file);
    } else if (file.type === 'text/plain') {
      reader.onload = () => setPendingFile({ name: file.name, type: file.type, text: reader.result as string });
      reader.readAsText(file);
    } else {
      setPendingFile({ name: file.name, type: file.type });
    }
    e.target.value = '';
  };

  // ── End session ──
  const endSession = () => {
    setShowEndConfirm(false);
    setSessionEnded(true);
  };

  const newSession = () => {
    setMessages([{ role: 'assistant', content: greeting ?? "Hi! I'm Navi. How can I help?", ts: Date.now() }]);
    setSessionId(Math.random().toString(36).slice(2));
    setSessionEnded(false);
    setPendingFile(null);
    setInput('');
  };

  // ── Send ──
  const send = useCallback(async (overrideContent?: string) => {
    const content = (overrideContent ?? input).trim();
    if ((!content && !pendingFile) || loading || sessionEnded) return;
    setInput('');
    const file = pendingFile;
    setPendingFile(null);

    const fileContext = file
      ? file.type.startsWith('image/') ? `[User attached image: ${file.name}]`
      : file.text ? `[User attached file: ${file.name}]\n${file.text.slice(0, 800)}`
      : `[User attached file: ${file.name} (${file.type})]`
      : null;

    const fullContent = [content, fileContext].filter(Boolean).join('\n');
    const userMsg: Message = { role: 'user', content: content || '(file)', file: file ?? undefined, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '', ts: Date.now() }]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      history[history.length - 1].content = fullContent;

      const res = await fetch(`${apiUrl}/api/chat?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, sessionId }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buf = '';
      let streaming = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.replace(/^data: /, '').trim();
          if (line === '[DONE]' || !line) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'token') {
              streaming += parsed.token;
              const display = streaming.replace(/<(products|escalate)[^>]*>[\s\S]*/g, '').trim();
              setMessages((prev) => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], content: display }; return n; });
            } else if (parsed.type === 'done') {
              const { clean, products } = parseProducts(parsed.text);
              const escalate = parseEscalate(parsed.text);
              setMessages((prev) => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], content: stripTags(clean), products, escalate, ts: Date.now() }; return n; });
            } else if (parsed.type === 'error') {
              setMessages((prev) => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], content: parsed.text }; return n; });
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages((prev) => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], content: 'Something went wrong. Please try again.' }; return n; });
    } finally {
      setLoading(false);
    }
  }, [input, pendingFile, loading, sessionEnded, messages, apiKey, apiUrl, sessionId, greeting]);

  const w = expanded ? 560 : 360;
  const h = expanded ? 680 : 520;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', position: 'fixed', bottom: 20, right: 20, zIndex: 9999 }}>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .navi-msg { animation: fadeIn 0.2s ease; }
        .navi-msg:hover .copy-btn { opacity: 1 !important; }
        .navi-input:focus { outline: none; border-color: ${color} !important; box-shadow: 0 0 0 3px ${color}22; }
      `}</style>

      {open && (
        <div dir={t.dir} style={{ width: w, height: h, background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', marginBottom: 12, transition: 'width 0.2s, height 0.2s' }}>

          {/* Header */}
          <div style={{ background: color, color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Compass size={17} /></div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Navi</div>
                <div style={{ fontSize: 11, opacity: 0.8, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: sessionEnded ? '#fca5a5' : '#86efac', display: 'inline-block' }} />
                  {sessionEnded ? t.sessionEnded : t.online}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Language switcher */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowLangMenu((v) => !v)} title="Language"
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', height: 28, padding: '0 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
                  <Languages size={13} /> {t.label}
                </button>
                {showLangMenu && (
                  <div style={{ position: 'absolute', top: 34, right: 0, background: '#fff', borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', overflow: 'hidden', minWidth: 140, zIndex: 10 }}>
                    {(Object.entries(LANGUAGES) as [LangCode, LangDef][]).map(([code, def]) => (
                      <button key={code} onClick={() => switchLang(code)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '9px 14px', border: 'none', background: lang === code ? `${color}11` : '#fff', cursor: 'pointer', fontSize: 13, color: lang === code ? color : '#374151', fontWeight: lang === code ? 600 : 400, textAlign: 'left' }}>
                        <span>{def.nativeName}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{code.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setExpanded((v) => !v)} title={expanded ? 'Collapse' : 'Expand'}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              {!sessionEnded && (
                <button onClick={() => setShowEndConfirm(true)} title={t.endSession}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Square size={13} />
                </button>
              )}
              <button onClick={() => setOpen(false)} title="Close"
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', cursor: 'pointer', width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* End session confirm bar */}
          {showEndConfirm && (
            <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: '#991b1b' }}>{t.endConfirm}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setShowEndConfirm(false)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer', color: '#6b7280' }}>{t.cancel}</button>
                <button onClick={endSession} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>{t.endBtn}</button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }} onClick={() => setShowLangMenu(false)}>

            {/* Quick replies */}
            {messages.length === 1 && messages[0].role === 'assistant' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4, justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                {t.quickReplies.map((q) => (
                  <button key={q} onClick={() => send(q)}
                    style={{ fontSize: 12, padding: '5px 11px', borderRadius: 16, border: `1px solid ${color}44`, background: `${color}11`, color, cursor: 'pointer', fontWeight: 500 }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => {
              // Per-message RTL: detect from content
              const msgRTL = RTL_REGEX.test(msg.content) || isRTL;
              const isUser = msg.role === 'user';
              // In RTL layout, user bubbles go LEFT; in LTR they go RIGHT
              const bubbleAlign = isRTL
                ? (isUser ? 'flex-start' : 'flex-end')
                : (isUser ? 'flex-end' : 'flex-start');
              const bubbleRadius = isRTL
                ? (isUser ? '14px 14px 14px 4px' : '14px 14px 4px 14px')
                : (isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px');
              return (
                <div key={i} className="navi-msg" style={{ display: 'flex', flexDirection: 'column', alignItems: bubbleAlign, gap: 4 }}>
                  {msg.file && isUser && <FileBubble file={msg.file} />}
                  {msg.content && (
                    <div style={{ maxWidth: '85%', display: 'flex', alignItems: 'flex-end', gap: 4, flexDirection: isUser ? 'row-reverse' : 'row' }}>
                      <div dir={msgRTL ? 'rtl' : 'ltr'} style={{
                        padding: '8px 12px', borderRadius: bubbleRadius,
                        background: isUser ? color : '#f3f4f6',
                        color: isUser ? '#fff' : '#111',
                        fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap',
                        textAlign: msgRTL ? 'right' : 'left',
                      }}>
                        {msg.content}
                      </div>
                      {!isUser && <CopyButton text={msg.content} />}
                    </div>
                  )}
                  {msg.products && msg.products.length > 0 && (
                    <div style={{ width: '100%', maxWidth: expanded ? 420 : 280, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {msg.products.map((p) => <ProductCard key={p.id} product={p} color={color} />)}
                    </div>
                  )}
                  {msg.escalate && (
                    <a href={`mailto:support@example.com?subject=Support Request&body=${encodeURIComponent(msg.escalate)}`}
                      style={{ fontSize: 12, padding: '6px 12px', borderRadius: 8, background: '#fee2e2', color: '#dc2626', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      {t.connectSupport} <ArrowRight size={12} style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} />
                    </a>
                  )}
                  {msg.ts && (
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{formatTime(msg.ts)}</div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px', justifyContent: isRTL ? 'flex-end' : 'flex-start' }}>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: color, opacity: 0.5, animation: `bounce 1s ${i * 0.15}s infinite` }} />
                ))}
              </div>
            )}

            {sessionEnded && (
              <div style={{ textAlign: 'center', padding: '16px 12px' }}>
                <div style={{ marginBottom: 8, color: '#9ca3af', display: 'flex', justifyContent: 'center' }}><Headphones size={28} /></div>
                <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{t.sessionEndedMsg}</div>
                <button onClick={newSession}
                  style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10, border: 'none', background: color, color: '#fff', cursor: 'pointer', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <RotateCcw size={13} /> {t.newSession}
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Pending file preview */}
          {pendingFile && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8, background: '#fafafa', flexShrink: 0 }}>
              {pendingFile.type.startsWith('image/') && pendingFile.dataUrl
                ? <img src={pendingFile.dataUrl} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} alt="" />
                : <Paperclip size={18} style={{ color: '#6b7280', flexShrink: 0 }} />}
              <span style={{ fontSize: 12, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFile.name}</span>
              <button onClick={() => setPendingFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, display: 'flex' }}><X size={15} /></button>
            </div>
          )}

          {/* Input bar */}
          {!sessionEnded && (
            <div style={{ padding: '10px 12px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
              <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.csv" style={{ display: 'none' }} onChange={handleFilePick} />
              <button onClick={() => fileRef.current?.click()} title="Attach file"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: '#9ca3af', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                <Paperclip size={18} />
              </button>
              <button onClick={toggleSpeech} title={listening ? 'Stop' : 'Speak'}
                style={{ background: listening ? '#fee2e2' : 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8, color: listening ? '#ef4444' : '#9ca3af', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {listening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
              <textarea
                className="navi-input"
                value={input}
                rows={1}
                dir={isRTL ? 'rtl' : 'ltr'}
                onChange={handleInputChange}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t.placeholder}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 13, resize: 'none', overflow: 'hidden', lineHeight: 1.4, fontFamily: 'inherit', transition: 'border-color 0.15s, box-shadow 0.15s', textAlign: isRTL ? 'right' : 'left' }}
              />
              <button onClick={() => send()} disabled={loading || (!input.trim() && !pendingFile)}
                style={{ padding: '8px 12px', borderRadius: 10, background: color, color: '#fff', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, opacity: (loading || (!input.trim() && !pendingFile)) ? 0.5 : 1, fontSize: 13, fontWeight: 500 }}>
                <Send size={14} style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} /> {t.send}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Launcher button */}
      <button onClick={() => setOpen((v) => !v)}
        style={{ width: 56, height: 56, borderRadius: '50%', background: color, color: '#fff', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s' }}>
        {open ? <X size={22} /> : <Compass size={22} />}
      </button>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <NaviWidget
      apiKey={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('key') ?? 'demo' : 'demo'}
      apiUrl={process.env.NEXT_PUBLIC_APP_URL}
      primaryColor="#6366f1"
      greeting="Hi! I'm Navi — your shopping assistant. What are you looking for today?"
    />
  );
}
