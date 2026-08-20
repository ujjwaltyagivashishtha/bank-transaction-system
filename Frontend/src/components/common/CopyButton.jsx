import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function CopyButton({ text, label = 'Account ID', size = 14 }) {
  const [copied, setCopied] = useState(false);
  const { showSuccess } = useToast();

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showSuccess(`${label} copied to clipboard!`, 2000);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      showSuccess(`${label} copied to clipboard!`, 2000);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3px',
        borderRadius: '4px',
        color: copied ? '#10B981' : 'var(--text-tertiary)',
        transition: 'all 0.15s ease',
      }}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}
