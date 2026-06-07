import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface ChatMessage { role: string; content: string; }


// ---------- Product search ----------
async function searchProducts(storeId: string, query?: string, maxPrice?: number, category?: string, limit = 6) {
  const where: Record<string, unknown> = { storeId, inStock: true };
  if (query) where.OR = [{ name: { contains: query, mode: 'insensitive' } }, { description: { contains: query, mode: 'insensitive' } }];
  if (maxPrice) where.price = { lte: maxPrice };
  if (category) where.category = { contains: category, mode: 'insensitive' };
  return prisma.product.findMany({ where, take: limit });
}

// ---------- Rule-based fallback ----------
async function ruleBasedResponse(query: string, storeId: string, greeting: string): Promise<string> {
  const q = query.toLowerCase();

  if (/^(hi|hello|hey|hola|sup|yo)\b/.test(q)) return greeting;

  const priceMatch = q.match(/under\s*[₹$rs]?\s*(\d+)|below\s*[₹$rs]?\s*(\d+)|less\s*than\s*[₹$rs]?\s*(\d+)/);
  if (priceMatch) {
    const maxPrice = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]);
    const products = await searchProducts(storeId, undefined, maxPrice);
    if (!products.length) return `No products found under ${maxPrice}. Try a higher budget!`;
    return `Here are products under ${maxPrice}:\n<products>${JSON.stringify(products)}</products>`;
  }

  if (/gift|recommend|suggest|best|popular|featured|trending/.test(q)) {
    const products = await searchProducts(storeId);
    if (!products.length) return "I couldn't find products right now. Try browsing the store!";
    return `Here are some great picks:\n<products>${JSON.stringify(products)}</products>`;
  }

  if (/refund|terrible|worst|awful|angry|frustrated|complaint/.test(q)) {
    return `I'm really sorry to hear that. Let me connect you with our support team.\n<escalate reason="${query.slice(0, 100)}"/>`;
  }

  const keywords = q.replace(/show|find|search|get|list|all|me|products?|items?|available|do|you|have|any|the|a|an/g, '').trim();
  if (keywords.length > 2) {
    const products = await searchProducts(storeId, keywords);
    if (products.length) return `Here's what I found for **"${keywords}"**:\n<products>${JSON.stringify(products)}</products>`;
  }

  const products = await searchProducts(storeId, undefined, undefined, undefined, 4);
  const productStr = products.length ? `\n\nHere are some products you might like:\n<products>${JSON.stringify(products)}</products>` : '';
  return `I can help you:\n• 🛍 **Find products** — describe what you need\n• 💰 **Filter by budget** — "show me products under $50"\n• 🎁 **Get recommendations** — "suggest a gift"${productStr}`;
}

// ---------- OpenAI streaming ----------
async function* openAIStream(
  messages: ChatMessage[],
  storeId: string,
  storeName: string,
  greeting: string,
  openaiKey: string,
): AsyncGenerator<string> {
  const products = await searchProducts(storeId, undefined, undefined, undefined, 30);
  const catalog = products.length
    ? products.map((p) => `- ${p.name} | $${p.price}${p.category ? ` | ${p.category}` : ''}${p.description ? ` | ${p.description}` : ''}`).join('\n')
    : 'No products in catalog yet.';

  const system = `You are Navi, an AI shopping assistant for ${storeName}. Be helpful, friendly, and concise. Respond in the same language the customer uses.

Your greeting: "${greeting}"

## Output rules — follow exactly

1. Whenever you show products, you MUST use this exact format (valid JSON array, tag on its own line):
<products>[{"id":"ID","name":"NAME","price":PRICE,"category":"CAT","description":"DESC","imageUrl":null,"url":null}]</products>

2. When a customer is angry or wants a refund, output:
<escalate reason="one-line reason"/>

3. Never write raw JSON outside the tags. Never mention the tag names in conversational text.

## Example

User: show me sneakers
Assistant: Here are some sneakers for you!
<products>[{"id":"1","name":"Classic White Sneakers","price":79,"category":"Footwear","description":"Clean everyday sneakers","imageUrl":null,"url":null}]</products>
Let me know if you'd like more options.

User: I need something under $40
Assistant: Here are affordable options under $40:
<products>[{"id":"4","name":"Yoga Mat","price":35,"category":"Sports","description":"Non-slip premium mat","imageUrl":null,"url":null}]</products>

Product catalog:
${catalog}`;

  const isGroq = openaiKey.startsWith('gsk_');
  const baseUrl = isGroq ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions';
  const model = isGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: system },
        ...messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      const data = line.replace(/^data: /, '').trim();
      if (!data || data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data) as { choices: Array<{ delta: { content?: string } }> };
        const token = parsed.choices[0]?.delta?.content;
        if (token) yield token;
      } catch { /* ignore malformed chunks */ }
    }
  }
}

// ---------- Route ----------
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') ?? req.nextUrl.searchParams.get('key');
  if (!apiKey) return Response.json({ error: 'Missing API key' }, { status: 401 });

  const store = await prisma.store.findUnique({ where: { apiKey } });
  if (!store) return Response.json({ error: 'Invalid API key' }, { status: 401 });
  const isDemo = false;

  // Trial enforcement
  const hasOwnKey = !!(store as { openaiKey?: string | null }).openaiKey;
  if (!hasOwnKey && store.trialChats >= store.trialLimit) {
    return Response.json({ error: 'trial_exhausted' }, { status: 402 });
  }

  const { messages, sessionId } = await req.json() as { messages: ChatMessage[]; sessionId: string };
  // Sanitise: keep only role + content (strip any file blobs that leaked through)
  const safeMessages = messages.map(({ role, content }) => ({ role, content }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (chunk: string) => controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
      try {
        const openaiKey = (!isDemo && (store as { openaiKey?: string | null }).openaiKey) || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

        if (openaiKey) {
          // Stream tokens directly to the client
          let fullText = '';
          for await (const token of openAIStream(safeMessages, store.id, store.name, store.greeting, openaiKey)) {
            fullText += token;
            send(JSON.stringify({ type: 'token', token }));
          }
          send(JSON.stringify({ type: 'done', text: fullText }));

          if (sessionId && !isDemo) {
            let convo = await prisma.conversation.findFirst({ where: { storeId: store.id, sessionId } });
            if (!convo) convo = await prisma.conversation.create({ data: { storeId: store.id, sessionId } });
            const last = messages[messages.length - 1];
            await prisma.message.createMany({
              data: [
                { conversationId: convo.id, role: last.role, content: last.content },
                { conversationId: convo.id, role: 'assistant', content: fullText },
              ],
            });
            // Count trial usage only when using platform key
            if (!hasOwnKey) {
              await prisma.store.update({ where: { id: store.id }, data: { trialChats: { increment: 1 } } });
            }
          }
        } else {
          // Rule-based fallback
          const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
          const text = await ruleBasedResponse(lastUserMsg, store.id, store.greeting);
          send(JSON.stringify({ type: 'done', text }));

          if (sessionId && !isDemo) {
            let convo = await prisma.conversation.findFirst({ where: { storeId: store.id, sessionId } });
            if (!convo) convo = await prisma.conversation.create({ data: { storeId: store.id, sessionId } });
            const last = messages[messages.length - 1];
            await prisma.message.createMany({
              data: [
                { conversationId: convo.id, role: last.role, content: last.content },
                { conversationId: convo.id, role: 'assistant', content: text },
              ],
            });
          }
        }
      } catch (err) {
        console.error('[navi chat]', err);
        send(JSON.stringify({ type: 'error', text: 'Something went wrong. Please try again.' }));
      } finally {
        send('[DONE]');
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}
