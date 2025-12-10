import React from 'react';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  onLabel?: string;
  offLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  onChange,
  onLabel = 'On',
  offLabel = 'Off',
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      style={{
        WebkitTapHighlightColor: 'transparent',
      }}
      className={`relative inline-flex items-center h-7 rounded-full w-14 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-manipulation ${
        enabled ? 'bg-green-500' : 'bg-slate-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <span
        style={{
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        className={`inline-block w-5 h-5 transition-transform duration-200 ease-in-out bg-white rounded-full shadow-lg ${
          enabled ? 'translate-x-1' : 'translate-x-8'
        }`}
      />
      <span className="sr-only">
        {enabled ? onLabel : offLabel}
      </span>
    </button>
  );
};
