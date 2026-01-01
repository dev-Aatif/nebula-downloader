import React, { useState, useEffect, useRef } from 'react'

interface AddDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (url: string) => void
}

const AddDownloadModal: React.FC<AddDownloadModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [url, setUrl] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      // Auto-paste from clipboard when modal opens
      window.api
        .readClipboard()
        .then((text) => {
          if (text.startsWith('http')) {
            setUrl(text)
          }
        })
        .catch((err) => console.error('Failed to read clipboard:', err))
      // Focus the input
      inputRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const handleAdd = (): void => {
    if (url) {
      onAdd(url)
      setUrl('')
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleAdd()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
        <h2 className="text-lg font-semibold mb-4">Add New Download</h2>
        <p className="text-sm text-text-dim mb-4">
          Enter a video or playlist URL. The content of your clipboard has been auto-pasted if it
          looks like a link.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full bg-bg-deep border border-border-glass rounded-md p-2 text-sm"
        />
        <div className="modal-actions">
          <button onClick={onClose} className="tool-btn btn-lg">
            Cancel
          </button>
          <button onClick={handleAdd} className="tool-btn primary btn-lg">
            Add Download
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddDownloadModal
