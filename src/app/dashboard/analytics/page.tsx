'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface DayActivity { date: string; count: number; }
interface RecentConvo { id: string; sessionId: string; createdAt: string; firstMessage: string; }
interface Analytics {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConvo: number;
  dailyActivity: DayActivity[];
  recentConversations: RecentConvo[];
}

function BarChart({ data }: { data: DayActivity[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full bg-indigo-200 rounded-t hover:bg-indigo-400 transition-colors"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? 4 : 0 }}
          />
          <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d.date}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId') ?? '';
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!storeId) return;
    fetch(`/api/analytics?storeId=${storeId}`).then((r) => r.json()).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <a href="/dashboard" className="text-gray-400 hover:text-gray-700 text-sm">← Dashboard</a>
        <span className="text-gray-200">/</span>
        <span className="text-sm font-medium text-gray-700">Analytics</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytics</h1>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : !data ? (
          <div className="text-center py-20 text-gray-400">Failed to load analytics</div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total conversations', value: data.totalConversations },
                { label: 'Total messages', value: data.totalMessages },
                { label: 'Avg messages / convo', value: data.avgMessagesPerConvo },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                  <div className="text-3xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-sm text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Conversations — last 30 days</h2>
              {data.dailyActivity.every((d) => d.count === 0) ? (
                <p className="text-gray-400 text-sm text-center py-8">No conversations yet</p>
              ) : (
                <BarChart data={data.dailyActivity} />
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-gray-900">Recent conversations</h2>
              </div>
              {data.recentConversations.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No conversations yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">First message</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Session</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.recentConversations.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{c.firstMessage || '—'}</td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400">{c.sessionId.slice(0, 8)}…</td>
                        <td className="px-4 py-3 text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense>
      <AnalyticsContent />
    </Suspense>
  );
}
