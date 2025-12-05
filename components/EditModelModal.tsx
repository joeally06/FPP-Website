'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { glassStyles } from '@/lib/theme';

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

interface EditModelModalProps {
  model: Model;
  onClose: () => void;
  onSave: () => void;
}

export default function EditModelModal({ model, onClose, onSave }: EditModelModalProps) {
  const [formData, setFormData] = useState(model);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof Model, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        alert('✅ Model updated successfully!');
        onSave();
        onClose();
      } else {
        alert(`❌ Update failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('❌ Update failed: Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <GlassCard className="p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">✏️ Edit Model</h2>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
            disabled={saving}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>📝</span> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Model Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.model_name}
                  onChange={(e) => handleChange('model_name', e.target.value)}
                  required
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Display As
                </label>
                <input
                  type="text"
                  value={formData.display_as || ''}
                  onChange={(e) => handleChange('display_as', e.target.value)}
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>
            </div>
          </div>

          {/* String Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🎄</span> String Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  String Type
                </label>
                <input
                  type="text"
                  value={formData.string_type || ''}
                  onChange={(e) => handleChange('string_type', e.target.value)}
                  placeholder="e.g., RGB Nodes"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  String Count
                </label>
                <input
                  type="number"
                  value={formData.string_count || 0}
                  onChange={(e) => handleChange('string_count', parseInt(e.target.value) || 0)}
                  min="0"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Node Count
                </label>
                <input
                  type="number"
                  value={formData.node_count || 0}
                  onChange={(e) => handleChange('node_count', parseInt(e.target.value) || 0)}
                  min="0"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>
            </div>
          </div>

          {/* Channel Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>📡</span> Channel Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Start Channel <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={formData.start_channel_no || 0}
                  onChange={(e) => handleChange('start_channel_no', parseInt(e.target.value) || 0)}
                  required
                  min="0"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  End Channel <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={formData.end_channel_no || 0}
                  onChange={(e) => handleChange('end_channel_no', parseInt(e.target.value) || 0)}
                  required
                  min="0"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Total Channels <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={formData.channel_count || 0}
                  onChange={(e) => handleChange('channel_count', parseInt(e.target.value) || 0)}
                  required
                  min="0"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>
            </div>
          </div>

          {/* Controller Info Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>⚡</span> Controller Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Controller Name
                </label>
                <input
                  type="text"
                  value={formData.controller_name || ''}
                  onChange={(e) => handleChange('controller_name', e.target.value)}
                  placeholder="e.g., F16v4"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Controller IP
                </label>
                <input
                  type="text"
                  value={formData.controller_ip || ''}
                  onChange={(e) => handleChange('controller_ip', e.target.value)}
                  placeholder="192.168.1.100"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Port(s)
                </label>
                <input
                  type="text"
                  value={formData.controller_ports || ''}
                  onChange={(e) => handleChange('controller_ports', e.target.value)}
                  placeholder="e.g., 1-16"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Protocol
                </label>
                <input
                  type="text"
                  value={formData.protocol || ''}
                  onChange={(e) => handleChange('protocol', e.target.value)}
                  placeholder="e.g., ws2811"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Universe ID
                </label>
                <input
                  type="text"
                  value={formData.universe_id || ''}
                  onChange={(e) => handleChange('universe_id', e.target.value)}
                  placeholder="e.g., 1"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Connection Protocol
                </label>
                <input
                  type="text"
                  value={formData.connection_protocol || ''}
                  onChange={(e) => handleChange('connection_protocol', e.target.value)}
                  placeholder="e.g., 12V"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>
            </div>
          </div>

          {/* Power & Advanced Section */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <span>🔋</span> Power & Advanced
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Est. Current (Amps)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.est_current_amps || 0}
                  onChange={(e) => handleChange('est_current_amps', parseFloat(e.target.value) || 0)}
                  min="0"
                  className={`${glassStyles.input} w-full px-3 py-2`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Connection Attributes
                </label>
                <textarea
                  value={formData.connection_attributes || ''}
                  onChange={(e) => handleChange('connection_attributes', e.target.value)}
                  rows={3}
                  placeholder="Additional connection details..."
                  className={`${glassStyles.input} w-full px-3 py-2 font-mono text-sm`}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/20">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-3 ${glassStyles.button} font-semibold`}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
