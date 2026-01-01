import React from 'react'

interface SettingsRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

const SettingsRow: React.FC<SettingsRowProps> = ({ label, description, children }) => {
  return (
    <div className="grid grid-cols-3 gap-4 items-center border-b border-border-glass py-4">
      <div className="col-span-1">
        <h3 className="text-sm font-medium text-text-main">{label}</h3>
        {description && <p className="text-xs text-text-dim mt-1">{description}</p>}
      </div>
      <div className="col-span-2 flex justify-end">{children}</div>
    </div>
  )
}

export default SettingsRow
