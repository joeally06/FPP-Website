'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';

interface Model {
  id: number;
  model_name: string;
  display_as: string;
  string_type: string;
  string_count: number;
  node_count: number;
  channel_count: number;
  start_channel_no: number;
  end_channel_no: number;
  controller_name: string;
  controller_ip: string;
  controller_ports: string;
  protocol: string;
  connection_protocol: string;
  connection_attributes: string;
  est_current_amps: number;
  universe_id: string;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(data);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  const importModels = async () => {
    if (!confirm('This will replace existing model data. Continue?')) return;

    setImporting(true);
    try {
      const res = await fetch('/api/models/import', { method: 'POST' });
      const result = await res.json();
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        fetchModels();
      } else {
        alert(`❌ Import failed: ${result.error}`);
      }
    } catch (error) {
      alert('❌ Import failed');
    } finally {
      setImporting(false);
    }
  };

  const filteredModels = models.filter(model => {
    const matchesSearch = 
      model.model_name?.toLowerCase().includes(search.toLowerCase()) ||
      model.display_as?.toLowerCase().includes(search.toLowerCase()) ||
      model.controller_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      filter === 'all' || 
      model.controller_name === filter;
    
    return matchesSearch && matchesFilter;
  });

  const controllers = [...new Set(models.map(m => m.controller_name).filter(Boolean))];

  const totalChannels = models.reduce((sum, m) => sum + (m.channel_count || 0), 0);
  const totalAmps = models.reduce((sum, m) => sum + (m.est_current_amps || 0), 0);

  if (loading) {
    return (
      <AdminLayout title="Model Configuration" subtitle="Loading your setup reference...">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white/70">Loading models...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="🎄 Model Configuration" 
      subtitle="Your yearly setup reference guide - Never forget a connection again!"
    >
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="🔍 Search models, controllers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 pl-10 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/30 min-w-[200px]"
          >
            <option value="all">All Controllers</option>
            {controllers.map(controller => (
              <option key={controller} value={controller}>{controller}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={importModels} 
          disabled={importing}
          className="backdrop-blur-sm bg-green-500/80 hover:bg-green-600 disabled:bg-gray-500/50 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
        >
          <span className="text-xl">📥</span>
          {importing ? 'Importing...' : 'Import from Excel'}
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="backdrop-blur-md bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Total Models</span>
            <span className="text-3xl">🎄</span>
          </div>
          <p className="text-3xl font-bold text-white">{models.length}</p>
        </div>
        <div className="backdrop-blur-md bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-6 shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Total Channels</span>
            <span className="text-3xl">🔌</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalChannels.toLocaleString()}</p>
        </div>
        <div className="backdrop-blur-md bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Total Nodes</span>
            <span className="text-3xl">💡</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {models.reduce((sum, m) => sum + (m.node_count || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="backdrop-blur-md bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-6 shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Est. Power</span>
            <span className="text-3xl">⚡</span>
          </div>
          <p className="text-3xl font-bold text-white">{totalAmps.toFixed(1)}A</p>
        </div>
        <div className="backdrop-blur-md bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 shadow-xl border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/80 text-sm font-medium">Controllers</span>
            <span className="text-3xl">🎛️</span>
          </div>
          <p className="text-3xl font-bold text-white">{controllers.length}</p>
        </div>
      </div>

      {/* Models Grid */}
      {filteredModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.map(model => (
            <div key={model.id} className="backdrop-blur-md bg-white/10 rounded-xl p-6 shadow-xl border border-white/20 hover:shadow-2xl hover:scale-105 transition-all">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{model.model_name}</h3>
                  <p className="text-white/70 text-sm">{model.display_as}</p>
                </div>
                <span className="px-3 py-1 bg-white/20 rounded-full text-xs text-white font-medium">
                  {model.string_type}
                </span>
              </div>

              {/* Channel Info */}
              <div className="flex items-center gap-2 text-sm text-white mb-3 pb-3 border-b border-white/10">
                <span className="text-blue-300">🔌</span>
                <span className="font-medium">Ch {model.start_channel_no?.toLocaleString()}</span>
                <span className="text-white/50">→</span>
                <span className="font-medium">{model.end_channel_no?.toLocaleString()}</span>
                <span className="ml-auto px-2 py-1 bg-blue-500/30 rounded text-xs">
                  {model.channel_count} ch
                </span>
              </div>

              {/* Controller Info */}
              <div className="flex items-center gap-2 text-sm text-white mb-3">
                <span className="text-amber-300">⚡</span>
                <span className="font-medium">{model.controller_name}</span>
                {model.controller_ports && (
                  <span className="ml-auto px-2 py-1 bg-amber-500/30 rounded text-xs">
                    Port {model.controller_ports}
                  </span>
                )}
              </div>

              {/* IP & Protocol */}
              <div className="flex items-center gap-2 text-sm text-white/80 mb-3">
                <span>ℹ️</span>
                <span>{model.controller_ip}</span>
                <span className="ml-auto px-2 py-1 bg-purple-500/30 rounded text-xs">
                  {model.protocol}
                </span>
              </div>

              {/* Nodes & Strings */}
              <div className="text-sm text-white/60 mb-3 pb-3 border-b border-white/10">
                {model.string_count} string{model.string_count > 1 ? 's' : ''} × {model.node_count} nodes
              </div>

              {/* Power & Connection */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">🔋</span>
                  <span className="text-white font-medium">{model.est_current_amps?.toFixed(2)}A</span>
                </div>
                <span className="text-white/60 text-xs">
                  {model.connection_protocol}
                </span>
              </div>

              {/* Connection Attributes */}
              {model.connection_attributes && (
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-white/50 font-mono">
                  {model.connection_attributes}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 backdrop-blur-md bg-white/5 rounded-xl border border-white/10">
          <span className="text-6xl mb-4 block">📥</span>
          <p className="text-xl font-medium text-white mb-2">
            {models.length === 0 
              ? 'No models imported yet' 
              : 'No models match your search'}
          </p>
          <p className="text-white/70">
            {models.length === 0 
              ? 'Click "Import from Excel" to load your Export Models.xlsx file'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      )}
    </AdminLayout>
  );
}
