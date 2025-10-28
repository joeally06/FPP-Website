'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface VoteData {
  sequence_name: string;
  upvotes: number;
  downvotes: number;
  total_votes: number;
  score: number;
}

export default function AdminAnalytics() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [voteData, setVoteData] = useState<VoteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || session.user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchAnalytics();
  }, [session, status, router]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        setVoteData(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen bg-gray-100 p-8">Loading...</div>;
  }

  if (!session || session.user?.role !== 'admin') {
    return null;
  }

  const totalVotes = voteData.reduce((sum, item) => sum + item.total_votes, 0);
  const averageScore = voteData.length > 0 ? voteData.reduce((sum, item) => sum + item.score, 0) / voteData.length : 0;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Analytics</h1>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Total Sequences</h3>
            <p className="text-3xl font-bold text-blue-600">{voteData.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Total Votes</h3>
            <p className="text-3xl font-bold text-green-600">{totalVotes}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Average Score</h3>
            <p className="text-3xl font-bold text-purple-600">{averageScore.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Sequence Voting Analytics</h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Sequence Name</th>
                  <th className="px-4 py-2 text-center">👍 Upvotes</th>
                  <th className="px-4 py-2 text-center">👎 Downvotes</th>
                  <th className="px-4 py-2 text-center">Total Votes</th>
                  <th className="px-4 py-2 text-center">Score</th>
                  <th className="px-4 py-2 text-center">Popularity</th>
                </tr>
              </thead>
              <tbody>
                {voteData
                  .sort((a, b) => b.score - a.score)
                  .map((item) => (
                    <tr key={item.sequence_name} className="border-t">
                      <td className="px-4 py-2 font-medium">{item.sequence_name}</td>
                      <td className="px-4 py-2 text-center text-green-600">{item.upvotes}</td>
                      <td className="px-4 py-2 text-center text-red-600">{item.downvotes}</td>
                      <td className="px-4 py-2 text-center">{item.total_votes}</td>
                      <td className="px-4 py-2 text-center font-semibold">
                        {item.score > 0 ? '+' : ''}{item.score}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${item.total_votes > 0 ? (item.upvotes / item.total_votes) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}