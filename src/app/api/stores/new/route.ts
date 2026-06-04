import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { storeName, storeUrl } = await req.json();
  if (!storeName) return Response.json({ error: 'Store name is required' }, { status: 400 });

  const store = await prisma.store.create({
    data: {
      name: storeName,
      domain: storeUrl || null,
      ownerId: session.user.id,
      greeting: `Hi! I'm Navi, your ${storeName} shopping assistant. What are you looking for today?`,
    },
    include: { _count: { select: { conversations: true, products: true } } },
  });

  return Response.json(store);
}
