import React from 'react'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false
}: ToggleSwitchProps): React.JSX.Element {
  return (
    <label
      className={`relative inline-flex items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <div
        className={`
          w-11 h-6 rounded-full
          bg-white/20 peer-checked:bg-neon-blue
          peer-focus:ring-2 peer-focus:ring-neon-blue/30
          after:content-[''] after:absolute after:top-0.5 after:left-[2px]
          after:bg-white after:rounded-full after:h-5 after:w-5
          after:transition-all after:duration-200
          peer-checked:after:translate-x-full
          transition-colors duration-200
        `}
      />
    </label>
  )
}
