import React, { useState } from 'react'
import type { PlaylistItem } from '../../../main/types'

interface PlaylistModalProps {
  playlistItems: PlaylistItem[]
  onClose: () => void
  onDownloadSelected: (selectedUrls: string[]) => void
}

const PlaylistModal: React.FC<PlaylistModalProps> = ({
  playlistItems,
  onClose,
  onDownloadSelected
}) => {
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(
    playlistItems.reduce(
      (acc, item) => {
        acc[item.url] = true
        return acc
      },
      {} as Record<string, boolean>
    )
  )
  const [selectAll, setSelectAll] = useState(true)

  const handleCheckboxChange = (url: string, checked: boolean): void => {
    setSelectedItems((prev) => ({ ...prev, [url]: checked }))
    // If any item is unchecked, deselect "Select All"
    if (!checked) {
      setSelectAll(false)
    }
  }

  const handleSelectAllChange = (checked: boolean): void => {
    setSelectAll(checked)
    const newSelection: Record<string, boolean> = {}
    playlistItems.forEach((item) => {
      newSelection[item.url] = checked
    })
    setSelectedItems(newSelection)
  }

  const handleDownloadClick = (): void => {
    const urlsToDownload = playlistItems
      .filter((item) => selectedItems[item.url])
      .map((item) => item.url)
    onDownloadSelected(urlsToDownload)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-lg w-11/12 max-w-2xl max-h-[90vh] flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-foreground">Select Playlist Items</h2>
        <div className="flex items-center mb-4 border-b border-border-glass pb-2">
          <input
            type="checkbox"
            id="selectAll"
            checked={selectAll}
            onChange={(e) => handleSelectAllChange(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="selectAll" className="text-foreground font-semibold">
            Select All
          </label>
        </div>
        <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar">
          {playlistItems.map((item) => (
            <div
              key={item.url}
              className="flex items-center py-2 border-b border-border-glass last:border-b-0"
            >
              <input
                type="checkbox"
                id={item.url}
                checked={selectedItems[item.url] || false}
                onChange={(e) => handleCheckboxChange(item.url, e.target.checked)}
                className="mr-3"
              />
              <label htmlFor={item.url} className="text-foreground text-sm flex-1 cursor-pointer">
                {item.title}
                <br />
                <span className="text-muted-foreground text-xs">{item.url}</span>
              </label>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border-glass">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDownloadClick}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary-dark transition-colors"
          >
            Download Selected ({Object.values(selectedItems).filter(Boolean).length})
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlaylistModal
