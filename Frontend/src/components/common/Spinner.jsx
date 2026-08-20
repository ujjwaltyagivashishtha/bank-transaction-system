import React from 'react';

export default function Spinner({ size = 20, color = 'currentColor' }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid rgba(0, 0, 0, 0.1)`,
        borderTopColor: color,
        animation: 'spin 0.8s linear infinite',
        display: 'inline-block',
      }}
    />
  );
}
