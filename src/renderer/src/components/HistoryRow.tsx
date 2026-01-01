import React from 'react'
import type { Download } from '../../../main/types'

interface HistoryRowProps {
  download: Download
  index: number
}

const HistoryRow: React.FC<HistoryRowProps> = ({ download, index }) => {
  const { title, totalSizeInBytes, outputPath, updatedAt } = download

  return (
    <div className="grid-row" style={{ gridTemplateColumns: '40px 3fr 1fr 2fr 1fr' }}>
      <div>{index + 1}</div>
      <div className="name-col">{title}</div>
      <div>{totalSizeInBytes ? `${(totalSizeInBytes / 1024 / 1024).toFixed(2)} MB` : 'N/A'}</div>
      <div className="text-sm text-zinc-400 break-all">{outputPath}</div>
      <div className="text-sm text-zinc-500">{new Date(updatedAt).toLocaleString()}</div>
    </div>
  )
}

export default HistoryRow
