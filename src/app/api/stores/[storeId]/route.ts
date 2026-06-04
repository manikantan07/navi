import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ storeId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { storeId } = await params;
  const store = await prisma.store.findFirst({ where: { id: storeId, ownerId: session.user.id } });
  if (!store) return Response.json({ error: 'Not found' }, { status: 404 });

  const { name, domain, greeting, primaryColor, openaiKey } = await req.json();

  const updated = await prisma.store.update({
    where: { id: storeId },
    data: {
      ...(name !== undefined && { name }),
      ...(domain !== undefined && { domain }),
      ...(greeting !== undefined && { greeting }),
      ...(primaryColor !== undefined && { primaryColor }),
      ...(openaiKey !== undefined && { openaiKey: openaiKey || null }),
    },
  });

  return Response.json(updated);
}
