'use client';

import { AlertTriangle } from 'lucide-react';

interface OfflineModeCardProps {
  title?: string;
  message?: string;
}

export default function OfflineModeCard({ 
  title = "Feature Unavailable",
  message = "This feature requires a connection to the FPP server."
}: OfflineModeCardProps) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
