'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { 
  AdminH1, 
  AdminH2, 
  AdminH3,
  AdminText, 
  AdminTextSmall,
  AdminTextTiny,
  AdminLabel,
  AdminValue,
  AdminValueMedium,
  AdminSuccess,
  AdminError,
  AdminWarning,
  AdminInfo
} from '@/components/admin/Typography';

interface SantaLetter {
  id: number;
  child_name: string;
  child_age: number | null;
  parent_email: string;
  letter_content: string;
  santa_reply: string | null;
  status: 'pending' | 'approved' | 'sent' | 'rejected';
  ip_address: string | null;
  created_at: string;
  sent_at: string | null;
  admin_notes: string | null;
  queue_status: 'queued' | 'processing' | 'completed' | 'failed';
  processing_started_at: string | null;
  processing_completed_at: string | null;
  retry_count: number;
  last_error: string | null;
}

export default function SantaLettersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [letters, setLetters] = useState<SantaLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedLetter, setSelectedLetter] = useState<SantaLetter | null>(null);
  const [editReply, setEditReply] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/');
    } else if (status === 'authenticated') {
      fetchLetters();
    }
  }, [status, session, router]);

  const fetchLetters = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/santa/admin-letters');
      if (response.ok) {
        const data = await response.json();
        setLetters(data);
      }
    } catch (error) {
      console.error('Error fetching letters:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLetterStatus = async (letterId: number, newStatus: string, notes?: string) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/santa/admin-letters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId, status: newStatus, adminNotes: notes }),
      });

      if (response.ok) {
        await fetchLetters();
        setSelectedLetter(null);
      }
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const updateReply = async (letterId: number, reply: string) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/santa/admin-letters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId, santaReply: reply }),
      });

      if (response.ok) {
        await fetchLetters();
        setSelectedLetter(null);
      }
    } catch (error) {
      console.error('Error updating reply:', error);
    } finally {
      setUpdating(false);
    }
  };

  const resendEmail = async (letterId: number) => {
    try {
      setUpdating(true);
      const response = await fetch('/api/santa/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId }),
      });

      if (response.ok) {
        alert('Email resent successfully!');
        await fetchLetters();
      } else {
        const data = await response.json();
        alert(`Failed to resend email: ${data.error}`);
      }
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Failed to resend email');
    } finally {
      setUpdating(false);
    }
  };

  const triggerQueueProcessing = async () => {
    try {
      setUpdating(true);
      const response = await fetch('/api/santa/trigger-queue', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert('Queue processing triggered! Check console for details.');
        await fetchLetters();
      } else {
        alert('Failed to trigger queue processing');
      }
    } catch (error) {
      console.error('Error triggering queue:', error);
      alert('Failed to trigger queue processing');
    } finally {
      setUpdating(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Child Name', 'Age', 'Email', 'Status', 'Created', 'Letter Excerpt', 'Reply Excerpt'];
    const rows = filteredLetters.map(letter => [
      letter.id,
      letter.child_name,
      letter.child_age || 'N/A',
      letter.parent_email,
      letter.status,
      new Date(letter.created_at).toLocaleDateString(),
      letter.letter_content.substring(0, 50) + '...',
      letter.santa_reply ? letter.santa_reply.substring(0, 50) + '...' : 'N/A',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `santa-letters-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredLetters = filterStatus === 'all'
    ? letters
    : letters.filter(letter => letter.status === filterStatus);

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-blue-100 text-blue-800 border-blue-300',
      sent: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getQueueBadge = (queueStatus: string) => {
    const badges = {
      queued: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      processing: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse',
      completed: 'bg-green-100 text-green-800 border-green-300',
      failed: 'bg-red-100 text-red-800 border-red-300',
    };
    return badges[queueStatus as keyof typeof badges] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
            <AdminText>Loading Santa letters...</AdminText>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <AdminH1 className="flex items-center gap-2">
            🎅 Santa Letters Dashboard 🎄
          </AdminH1>
          <AdminText>Manage letters from children to Santa Claus</AdminText>
        </div>

        {/* Simplified Stats - Two Rows */}
        <div className="space-y-4 mb-6">
          {/* Letter Overview */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <AdminH3 className="mb-4">📊 Letter Overview</AdminH3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-lg border border-white/10">
                <AdminTextSmall className="mb-2">Total Letters</AdminTextSmall>
                <AdminValueMedium>{letters.length}</AdminValueMedium>
              </div>
              <div className="text-center p-4 bg-yellow-500/20 rounded-lg border border-yellow-500/30">
                <AdminTextSmall className="mb-2 text-yellow-200">Pending Review</AdminTextSmall>
                <AdminValueMedium className="text-yellow-100">
                  {letters.filter(l => l.status === 'pending').length}
                </AdminValueMedium>
              </div>
              <div className="text-center p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                <AdminTextSmall className="mb-2 text-green-200">Sent Successfully</AdminTextSmall>
                <AdminValueMedium className="text-green-100">
                  {letters.filter(l => l.status === 'sent').length}
                </AdminValueMedium>
              </div>
              <div className="text-center p-4 bg-red-500/20 rounded-lg border border-red-500/30">
                <AdminTextSmall className="mb-2 text-red-200">Failed/Rejected</AdminTextSmall>
                <AdminValueMedium className="text-red-100">
                  {letters.filter(l => l.status === 'rejected' || l.queue_status === 'failed').length}
                </AdminValueMedium>
              </div>
            </div>
          </div>

          {/* Queue Status */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <AdminH3 className="mb-4">⚡ Queue Status</AdminH3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <AdminTextSmall className="mb-2 text-blue-200">In Queue</AdminTextSmall>
                <AdminValueMedium className="text-blue-100">
                  {letters.filter(l => l.queue_status === 'queued').length}
                </AdminValueMedium>
              </div>
              <div className="text-center p-4 bg-purple-500/20 rounded-lg border border-purple-500/30">
                <AdminTextSmall className="mb-2 text-purple-200">Processing</AdminTextSmall>
                <AdminValueMedium className="text-purple-100">
                  {letters.filter(l => l.queue_status === 'processing').length}
                </AdminValueMedium>
              </div>
              <div className="text-center p-4 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                <AdminTextSmall className="mb-2 text-emerald-200">Completed</AdminTextSmall>
                <AdminValueMedium className="text-emerald-100">
                  {letters.filter(l => l.queue_status === 'completed').length}
                </AdminValueMedium>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 mb-6 border border-white/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AdminLabel className="mb-0">Filter:</AdminLabel>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all" className="bg-gray-800">All Letters</option>
                <option value="pending" className="bg-gray-800">Pending</option>
                <option value="approved" className="bg-gray-800">Approved</option>
                <option value="sent" className="bg-gray-800">Sent</option>
                <option value="rejected" className="bg-gray-800">Rejected</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={triggerQueueProcessing}
                disabled={updating}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"
              >
                ⚡ Process Queue Now
              </button>
              <button
                onClick={fetchLetters}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                🔄 Refresh
              </button>
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                📥 Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Letters Table */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl shadow-lg border border-white/20 overflow-hidden">
          {filteredLetters.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-red-600 to-green-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Child</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Age</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Queue</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredLetters.map((letter) => (
                    <tr key={letter.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3"><AdminTextSmall>{letter.id}</AdminTextSmall></td>
                      <td className="px-4 py-3"><AdminTextSmall className="font-semibold text-white">{letter.child_name}</AdminTextSmall></td>
                      <td className="px-4 py-3"><AdminTextSmall>{letter.child_age || 'N/A'}</AdminTextSmall></td>
                      <td className="px-4 py-3"><AdminTextSmall>{letter.parent_email}</AdminTextSmall></td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(letter.status)}`}>
                          {letter.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getQueueBadge(letter.queue_status)}`}>
                            {letter.queue_status === 'processing' ? '⚙️ ' : ''}{letter.queue_status}
                          </span>
                          {letter.retry_count > 0 && (
                            <AdminTextTiny className="text-red-300">
                              Retries: {letter.retry_count}
                            </AdminTextTiny>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3"><AdminTextSmall>{new Date(letter.created_at).toLocaleString()}</AdminTextSmall></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => {
                            setSelectedLetter(letter);
                            setEditReply(letter.santa_reply || '');
                            setAdminNotes(letter.admin_notes || '');
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-blue-700 transition"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center">
              <AdminText>No letters found for the selected filter.</AdminText>
            </div>
          )}
        </div>

        {/* Letter Detail Modal */}
        {selectedLetter && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
              <div className="bg-gradient-to-r from-red-600 to-green-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <AdminH2 className="mb-0">Letter from {selectedLetter.child_name}</AdminH2>
                  <button
                    onClick={() => setSelectedLetter(null)}
                    className="text-white hover:text-gray-200 text-3xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <AdminTextSmall className="mt-1">
                  Received: {new Date(selectedLetter.created_at).toLocaleString()}
                </AdminTextSmall>
              </div>

              <div className="p-6 space-y-6">
                {/* Letter Details */}
                <div>
                  <AdminH3>Letter Details</AdminH3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><AdminTextSmall><strong className="text-white">Child Name:</strong> {selectedLetter.child_name}</AdminTextSmall></div>
                    <div><AdminTextSmall><strong className="text-white">Age:</strong> {selectedLetter.child_age || 'Not provided'}</AdminTextSmall></div>
                    <div><AdminTextSmall><strong className="text-white">Parent Email:</strong> {selectedLetter.parent_email}</AdminTextSmall></div>
                    <div><AdminTextSmall><strong className="text-white">IP Address:</strong> {selectedLetter.ip_address || 'Unknown'}</AdminTextSmall></div>
                  </div>
                </div>

                {/* Letter Content */}
                <div>
                  <AdminH3>Letter Content</AdminH3>
                  <div className="bg-white/5 p-4 rounded-lg border border-white/10 whitespace-pre-wrap">
                    <AdminText>{selectedLetter.letter_content}</AdminText>
                  </div>
                </div>

                {/* Santa's Reply */}
                <div>
                  <AdminH3>Santa's Reply</AdminH3>
                  <textarea
                    value={editReply}
                    onChange={(e) => setEditReply(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-white/20 bg-white/5 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-white/40"
                    placeholder="Edit Santa's reply..."
                  />
                  <button
                    onClick={() => updateReply(selectedLetter.id, editReply)}
                    disabled={updating}
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {updating ? 'Updating...' : 'Update Reply'}
                  </button>
                </div>

                {/* Admin Notes */}
                <div>
                  <AdminH3>Admin Notes</AdminH3>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-white/20 bg-white/5 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 placeholder:text-white/40"
                    placeholder="Internal notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
                  {selectedLetter.status === 'pending' && (
                    <>
                      <button
                        onClick={() => updateLetterStatus(selectedLetter.id, 'approved', adminNotes)}
                        disabled={updating}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => updateLetterStatus(selectedLetter.id, 'rejected', adminNotes)}
                        disabled={updating}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                  {(selectedLetter.status === 'approved' || selectedLetter.status === 'sent') && (
                    <button
                      onClick={() => resendEmail(selectedLetter.id)}
                      disabled={updating}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      📧 Resend Email
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedLetter(null)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
