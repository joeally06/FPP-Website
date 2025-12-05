'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Upload, Zap, Cable, Info, Power, File, X, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import StatCard from '@/components/ui/StatCard';
import GlassCard from '@/components/ui/GlassCard';
import EditModelModal from '@/components/EditModelModal';
import { gradients, glassStyles } from '@/lib/theme';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [expandedModels, setExpandedModels] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleModelExpansion = (id: number) => {
    setExpandedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models');
      const data = await res.json();
      setModels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching models:', error);
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('Please select an Excel file (.xlsx or .xls)');
        return;
      }
      setSelectedFile(file);
    }
  };

  const importModels = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    if (!confirm(`Import ${selectedFile.name}? This will replace all existing model data.`)) {
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetch('/api/models/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        alert(`✅ ${result.message}`);
        setShowUploadModal(false);
        setSelectedFile(null);
        fetchModels();
      } else {
        alert(`❌ Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('❌ Import failed: Network error');
    } finally {
      setImporting(false);
    }
  };

  const deleteModel = async (id: number, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/models/${id}`, {
        method: 'DELETE',
      });

      const result = await res.json();

      if (result.success) {
        alert('✅ Model deleted successfully');
        fetchModels();
      } else {
        alert(`❌ Delete failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('❌ Delete failed: Network error');
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
      <AdminLayout title="⚙️ Model Configuration">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-white/70">Loading models...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="⚙️ Model Configuration"
      subtitle="Your yearly setup reference guide - Never forget a connection again!"
    >
      <div className="space-y-6">
      
      {/* Import Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowUploadModal(true)}
          className={`flex items-center gap-2 px-6 py-3 ${glassStyles.button}`}
        >
          <Upload className="w-5 h-5" />
          Import Excel File
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50">
          <GlassCard className="max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Import Models from Excel</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedFile(null);
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-white/80">
                Upload your <strong className="text-white">Export Models.xlsx</strong> file from xLights to import your model configuration.
              </p>

              {/* File Input */}
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-white/30 transition-colors bg-white/5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <File className="w-12 h-12 text-green-400 mx-auto" />
                    <p className="font-medium text-white">{selectedFile.name}</p>
                    <p className="text-sm text-white/60">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-white/40 mx-auto mb-2" />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Click to select file
                    </button>
                    <p className="text-sm text-white/60 mt-1">
                      Accepts .xlsx and .xls files
                    </p>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-sm text-amber-300">
                  ⚠️ This will replace all existing model data
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setSelectedFile(null);
                  }}
                  className={`flex-1 px-4 py-2 ${glassStyles.button}`}
                  disabled={importing}
                >
                  Cancel
                </button>
                <button
                  onClick={importModels}
                  disabled={!selectedFile || importing}
                  className="flex-1 px-4 py-2 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
          <input
            type="text"
            placeholder="Search models, controllers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 ${glassStyles.input}`}
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`px-4 py-2 min-w-[200px] ${glassStyles.input}`}
        >
          <option value="all" className="bg-gray-800 text-white">All Controllers</option>
          {controllers.map(controller => (
            <option key={controller} value={controller} className="bg-gray-800 text-white">{controller}</option>
          ))}
        </select>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          icon={File}
          label="Total Models"
          value={models.length}
          gradient={gradients.blue}
        />
        <StatCard
          icon={Cable}
          label="Total Channels"
          value={totalChannels}
          gradient={gradients.purple}
        />
        <StatCard
          icon={Zap}
          label="Total Nodes"
          value={models.reduce((sum, m) => sum + (m.node_count || 0), 0)}
          gradient={gradients.green}
        />
        <StatCard
          icon={Power}
          label="Est. Power"
          value={`${totalAmps.toFixed(1)}A`}
          gradient={gradients.orange}
        />
        <StatCard
          icon={Info}
          label="Controllers"
          value={controllers.length}
          gradient={gradients.indigo}
        />
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {filteredModels.map(model => {
          const isExpanded = expandedModels.has(model.id);
          return (
          <GlassCard key={model.id} hover className="p-4">
            {/* Header - Always Visible */}
            <div 
              className="cursor-pointer"
              onClick={() => toggleModelExpansion(model.id)}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{model.model_name}</h3>
                  <p className="text-sm text-white/70">{model.display_as}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="px-2 py-1 bg-white/10 text-white/90 text-xs rounded whitespace-nowrap border border-white/20">
                    {model.string_type}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-white/50 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-white/50 flex-shrink-0" />
                  )}
                </div>
              </div>

              {/* Compact Info - Always Visible */}
              <div className="space-y-2">
                {/* Channel Range */}
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Cable className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="font-medium">Ch {model.start_channel_no?.toLocaleString()}-{model.end_channel_no?.toLocaleString()}</span>
                  <span className="ml-auto px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30">
                    {model.channel_count} ch
                  </span>
                </div>

                {/* Controller */}
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span className="font-medium truncate">{model.controller_name}</span>
                  {model.controller_ports && (
                    <span className="px-2 py-0.5 bg-white/10 text-white/90 text-xs rounded flex-shrink-0 border border-white/20">
                      P{model.controller_ports}
                    </span>
                  )}
                </div>

                {/* Nodes */}
                <div className="text-sm text-white/70">
                  {model.string_count} string{model.string_count > 1 ? 's' : ''} × {model.node_count} nodes = {(model.string_count * model.node_count).toLocaleString()} total
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                {/* IP & Protocol */}
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{model.controller_ip}</span>
                  <span className="ml-auto px-2 py-0.5 bg-white/10 text-white/90 text-xs rounded flex-shrink-0 border border-white/20">
                    {model.protocol}
                  </span>
                </div>

                {/* Power Consumption */}
                <div className="flex items-center gap-2 text-sm text-white/90">
                  <Power className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="font-medium">{model.est_current_amps?.toFixed(2)}A</span>
                  <span className="text-white/60 text-xs ml-auto">
                    @ {model.connection_protocol}
                  </span>
                </div>

                {/* Universe ID */}
                {model.universe_id && (
                  <div className="text-sm text-white/70">
                    <span className="text-white/50">Universe:</span> {model.universe_id}
                  </div>
                )}

                {/* Connection Attributes */}
                {model.connection_attributes && (
                  <div className="bg-black/30 rounded p-2 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">Connection Attributes:</p>
                    <p className="text-xs text-white/70 font-mono break-all">
                      {model.connection_attributes}
                    </p>
                  </div>
                )}

                {/* Edit/Delete Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingModel(model);
                    }}
                    className="flex-1 px-3 py-2 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteModel(model.id, model.model_name);
                    }}
                    className="flex-1 px-3 py-2 bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        )})}
      </div>

      {/* Empty State */}
      {filteredModels.length === 0 && (
        <GlassCard className="text-center py-12">
          <Upload className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2 text-white">
            {models.length === 0
              ? 'No models imported yet'
              : 'No models match your search'}
          </p>
          <p className="text-white/70">
            {models.length === 0
              ? 'Click "Import Excel File" to load your Export Models.xlsx file'
              : 'Try adjusting your search or filters'}
          </p>
        </GlassCard>
      )}

      {/* Edit Modal */}
      {editingModel && (
        <EditModelModal
          model={editingModel}
          onClose={() => setEditingModel(null)}
          onSave={fetchModels}
        />
      )}
      </div>
    </AdminLayout>
  );
}