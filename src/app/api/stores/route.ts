import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { name, email, password, storeName, storeUrl } = await req.json();
  if (!name || !email || !password || !storeName)
    return Response.json({ error: 'Missing fields' }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return Response.json({ error: 'Email already in use' }, { status: 409 });

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, password: hashed } });

  const store = await prisma.store.create({
    data: {
      name: storeName,
      domain: storeUrl || null,
      ownerId: user.id,
      greeting: `Hi! I'm Navi, your ${storeName} shopping assistant. What are you looking for today?`,
    },
  });

  return Response.json({ apiKey: store.apiKey, storeId: store.id });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stores = await prisma.store.findMany({
    where: { ownerId: session.user.id },
    include: { _count: { select: { conversations: true, products: true } } },
  });

  return Response.json(stores);
}
