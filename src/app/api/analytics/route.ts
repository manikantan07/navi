import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const storeId = req.nextUrl.searchParams.get('storeId');
  if (!storeId) return Response.json({ error: 'storeId required' }, { status: 400 });

  const store = await prisma.store.findFirst({ where: { id: storeId, ownerId: session.user.id } });
  if (!store) return Response.json({ error: 'Not found' }, { status: 404 });

  const [totalConversations, totalMessages, recentConversations] = await Promise.all([
    prisma.conversation.count({ where: { storeId } }),
    prisma.message.count({ where: { conversation: { storeId } } }),
    prisma.conversation.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } },
    }),
  ]);

  // Conversations per day for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyConvos = await prisma.conversation.groupBy({
    by: ['createdAt'],
    where: { storeId, createdAt: { gte: thirtyDaysAgo } },
    _count: true,
  });

  // Build a day-by-day map
  const dayMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayMap[d.toISOString().slice(0, 10)] = 0;
  }
  for (const row of dailyConvos) {
    const key = new Date(row.createdAt).toISOString().slice(0, 10);
    if (key in dayMap) dayMap[key] += row._count;
  }

  return Response.json({
    totalConversations,
    totalMessages,
    avgMessagesPerConvo: totalConversations ? Math.round(totalMessages / totalConversations) : 0,
    dailyActivity: Object.entries(dayMap).map(([date, count]) => ({ date, count })),
    recentConversations: recentConversations.map((c: { id: string; sessionId: string; createdAt: Date; messages: { content: string }[] }) => ({
      id: c.id,
      sessionId: c.sessionId,
      createdAt: c.createdAt,
      firstMessage: c.messages[0]?.content ?? '',
    })),
  });
}
