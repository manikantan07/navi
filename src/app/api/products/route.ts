import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function verifyStoreOwner(storeId: string, userId: string) {
  return prisma.store.findFirst({ where: { id: storeId, ownerId: userId } });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get('storeId');
  if (!storeId) return Response.json({ error: 'storeId required' }, { status: 400 });

  const store = await verifyStoreOwner(storeId, session.user.id);
  if (!store) return Response.json({ error: 'Not found' }, { status: 404 });

  const products = await prisma.product.findMany({ where: { storeId }, orderBy: { name: 'asc' } });
  return Response.json(products);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { storeId, name, description, price, imageUrl, category, url } = body;
  if (!storeId || !name || price == null) return Response.json({ error: 'storeId, name, price required' }, { status: 400 });

  const store = await verifyStoreOwner(storeId, session.user.id);
  if (!store) return Response.json({ error: 'Not found' }, { status: 404 });

  const product = await prisma.product.create({
    data: { storeId, name, description, price: parseFloat(price), imageUrl, category, url },
  });
  return Response.json(product);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const productId = req.nextUrl.searchParams.get('id');
  if (!productId) return Response.json({ error: 'id required' }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return Response.json({ error: 'Not found' }, { status: 404 });

  const store = await verifyStoreOwner(product.storeId, session.user.id);
  if (!store) return Response.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.product.delete({ where: { id: productId } });
  return Response.json({ ok: true });
}
