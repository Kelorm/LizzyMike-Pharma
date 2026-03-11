import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
      <div className="relative inline-block w-10 align-middle select-none">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={() => onChange(!checked)}
          disabled={disabled}
        />
        <div className={`block w-10 h-6 rounded-full transition-colors ${
          checked 
            ? 'bg-blue-600' 
            : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}></div>
        <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
          checked ? 'transform translate-x-4' : ''
        }`}></div>
      </div>
    </div>
  );
};

export default ToggleSwitch;