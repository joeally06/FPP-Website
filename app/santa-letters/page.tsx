'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';

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

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Santa letters...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            🎅 Santa Letters Dashboard 🎄
          </h1>
          <p className="text-gray-600">Manage letters from children to Santa Claus</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200 shadow-sm">
            <div className="text-sm text-yellow-600 font-semibold">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">
              {letters.filter(l => l.status === 'pending').length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200 shadow-sm">
            <div className="text-sm text-blue-600 font-semibold">Approved</div>
            <div className="text-2xl font-bold text-blue-900">
              {letters.filter(l => l.status === 'approved').length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200 shadow-sm">
            <div className="text-sm text-green-600 font-semibold">Sent</div>
            <div className="text-2xl font-bold text-green-900">
              {letters.filter(l => l.status === 'sent').length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200 shadow-sm">
            <div className="text-sm text-red-600 font-semibold">Rejected</div>
            <div className="text-2xl font-bold text-red-900">
              {letters.filter(l => l.status === 'rejected').length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200 shadow-sm">
            <div className="text-sm text-purple-600 font-semibold">Total</div>
            <div className="text-2xl font-bold text-purple-900">{letters.length}</div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Filter:</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Letters</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="flex gap-2">
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                    <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLetters.map((letter) => (
                    <tr key={letter.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{letter.id}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{letter.child_name}</td>
                      <td className="px-4 py-3 text-sm">{letter.child_age || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm">{letter.parent_email}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(letter.status)}`}>
                          {letter.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(letter.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">
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
            <div className="p-8 text-center text-gray-500">
              No letters found for the selected filter.
            </div>
          )}
        </div>

        {/* Letter Detail Modal */}
        {selectedLetter && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-red-600 to-green-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Letter from {selectedLetter.child_name}</h2>
                  <button
                    onClick={() => setSelectedLetter(null)}
                    className="text-white hover:text-gray-200 text-3xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <p className="text-white/90 text-sm mt-1">
                  Received: {new Date(selectedLetter.created_at).toLocaleString()}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Letter Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Letter Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Child Name:</strong> {selectedLetter.child_name}</div>
                    <div><strong>Age:</strong> {selectedLetter.child_age || 'Not provided'}</div>
                    <div><strong>Parent Email:</strong> {selectedLetter.parent_email}</div>
                    <div><strong>IP Address:</strong> {selectedLetter.ip_address || 'Unknown'}</div>
                  </div>
                </div>

                {/* Letter Content */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Letter Content</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">
                    {selectedLetter.letter_content}
                  </div>
                </div>

                {/* Santa's Reply */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Santa's Reply</h3>
                  <textarea
                    value={editReply}
                    onChange={(e) => setEditReply(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  <h3 className="text-lg font-semibold mb-2">Admin Notes</h3>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Internal notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
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
                    className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-400 transition"
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
