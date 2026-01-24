import React from 'react'
import type { Download } from '../../../main/types'

export default function ProgressBar({ download }: { download: Download }): React.JSX.Element {
  const { progress } = download
  const percentage = progress

  return (
    <div className="w-full bg-card-alt rounded-full">
      <div
        className="bg-primary text-xs font-medium text-foreground text-center p-0.5 leading-none rounded-full"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  )
}
