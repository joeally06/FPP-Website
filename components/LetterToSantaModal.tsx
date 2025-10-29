'use client';

import { useState, FormEvent } from 'react';

interface LetterToSantaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LetterToSantaModal({ isOpen, onClose }: LetterToSantaModalProps) {
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [letterContent, setLetterContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/santa/send-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          childName,
          childAge: childAge ? parseInt(childAge) : undefined,
          parentEmail,
          letterContent,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({
          type: 'success',
          message: data.message || "Santa has received your letter! 🎅✨",
        });
        // Reset form
        setChildName('');
        setChildAge('');
        setParentEmail('');
        setLetterContent('');
        
        // Auto-close after 5 seconds
        setTimeout(() => {
          onClose();
          setSubmitStatus({ type: null, message: '' });
        }, 5000);
      } else {
        setSubmitStatus({
          type: 'error',
          message: data.error || 'Failed to send letter. Please try again.',
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: 'Failed to send letter. Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-red-50 via-white to-green-50 rounded-2xl shadow-2xl border-4 border-red-600">
        {/* Snowflakes decoration */}
        <div className="absolute top-4 left-4 text-4xl animate-pulse">❄️</div>
        <div className="absolute top-4 right-4 text-4xl animate-pulse" style={{ animationDelay: '0.5s' }}>❄️</div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-600 hover:text-gray-900 text-3xl font-bold z-10"
          aria-label="Close"
        >
          ×
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-green-600 text-white p-8 text-center border-b-4 border-yellow-400">
          <h2 className="text-4xl font-bold mb-2" style={{ fontFamily: 'cursive' }}>
            🎅 Write to Santa! 🎄
          </h2>
          <p className="text-lg">Send your Christmas wishes to the North Pole!</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Success/Error Message */}
          {submitStatus.type && (
            <div
              className={`p-4 rounded-lg border-2 ${
                submitStatus.type === 'success'
                  ? 'bg-green-100 border-green-500 text-green-800'
                  : 'bg-red-100 border-red-500 text-red-800'
              }`}
            >
              <p className="font-semibold text-center">{submitStatus.message}</p>
            </div>
          )}

          {/* Child Name */}
          <div>
            <label htmlFor="childName" className="block text-lg font-semibold text-gray-800 mb-2">
              Child's Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              id="childName"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              required
              maxLength={100}
              className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 bg-white text-gray-900"
              placeholder="Enter child's name"
              disabled={isSubmitting}
            />
          </div>

          {/* Child Age */}
          <div>
            <label htmlFor="childAge" className="block text-lg font-semibold text-gray-800 mb-2">
              Child's Age (optional)
            </label>
            <input
              type="number"
              id="childAge"
              value={childAge}
              onChange={(e) => setChildAge(e.target.value)}
              min="1"
              max="18"
              className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 bg-white text-gray-900"
              placeholder="Enter child's age"
              disabled={isSubmitting}
            />
          </div>

          {/* Parent Email */}
          <div>
            <label htmlFor="parentEmail" className="block text-lg font-semibold text-gray-800 mb-2">
              Parent's Email <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              id="parentEmail"
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 bg-white text-gray-900"
              placeholder="Santa will send a reply here!"
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-600 mt-1">
              Santa will send a magical reply to this email! 📧✨
            </p>
          </div>

          {/* Letter Content */}
          <div>
            <label htmlFor="letterContent" className="block text-lg font-semibold text-gray-800 mb-2">
              Your Letter to Santa <span className="text-red-600">*</span>
            </label>
            <textarea
              id="letterContent"
              value={letterContent}
              onChange={(e) => setLetterContent(e.target.value)}
              required
              maxLength={2000}
              rows={8}
              className="w-full px-4 py-3 border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 bg-white text-gray-900 resize-none"
              placeholder="Dear Santa,&#10;&#10;This year I have been very good! I would like to tell you about..."
              disabled={isSubmitting}
            />
            <p className="text-sm text-gray-600 mt-1">
              {letterContent.length} / 2000 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-gradient-to-r from-red-600 to-green-600 text-white text-xl font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Sending to North Pole...
                </span>
              ) : (
                '🎁 Send to Santa! 🎁'
              )}
            </button>
          </div>

          {/* Footer note */}
          <div className="text-center text-sm text-gray-600 pt-4 border-t-2 border-red-200">
            <p>
              🎄 Santa reads every letter! You can send one letter per day. 🎄
            </p>
          </div>
        </form>

        {/* Decorative footer */}
        <div className="bg-gradient-to-r from-red-600 to-green-600 p-4 text-center text-white text-sm">
          ✨ Magical delivery powered by Santa's elves at the North Pole! ✨
        </div>
      </div>
    </div>
  );
}
