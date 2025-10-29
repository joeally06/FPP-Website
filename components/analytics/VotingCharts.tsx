'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface VotingTrendData {
  date: string;
  vote_count: number;
  upvotes: number;
  downvotes: number;
}

interface VotingByHourData {
  hour: number;
  vote_count: number;
  upvotes: number;
  downvotes: number;
}

interface VoteRatioData {
  sequence_name: string;
  upvotes: number;
  downvotes: number;
}

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export function VotingTrendChart({ data }: { data: VotingTrendData[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Voting Activity Trend (Last 30 Days)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="upvotes" 
            stroke="#10b981" 
            name="Upvotes"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="downvotes" 
            stroke="#ef4444" 
            name="Downvotes"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="vote_count" 
            stroke="#3b82f6" 
            name="Total Votes"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VotingByHourChart({ data }: { data: VotingByHourData[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Voting Activity by Hour</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="hour" 
            label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }}
          />
          <YAxis label={{ value: 'Votes', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="upvotes" stackId="a" fill="#10b981" name="Upvotes" />
          <Bar dataKey="downvotes" stackId="a" fill="#ef4444" name="Downvotes" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VoteRatioPieChart({ song }: { song: VoteRatioData }) {
  const data = [
    { name: 'Upvotes', value: song.upvotes, color: '#10b981' },
    { name: 'Downvotes', value: song.downvotes, color: '#ef4444' }
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-sm font-semibold mb-2 text-center truncate">{song.sequence_name}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry: any) => `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`}
            outerRadius={60}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center text-xs text-gray-600 mt-2">
        <span className="text-green-600 font-semibold">👍 {song.upvotes}</span>
        {' vs '}
        <span className="text-red-600 font-semibold">👎 {song.downvotes}</span>
      </div>
    </div>
  );
}

export function TopSongsVoteDistribution({ songs }: { songs: VoteRatioData[] }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Vote Distribution - Top 6 Songs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {songs.slice(0, 6).map((song, index) => (
          <VoteRatioPieChart key={index} song={song} />
        ))}
      </div>
    </div>
  );
}
