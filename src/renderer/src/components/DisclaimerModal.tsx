import React from 'react'

interface DisclaimerModalProps {
  isOpen: boolean
  onAccept: () => void
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onAccept }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-[100] backdrop-blur-sm">
      <div className="bg-card p-6 rounded-xl shadow-2xl w-11/12 max-w-lg border border-border-glass animate-in fade-in zoom-in duration-200">
        <div className="text-center mb-4">
          <span className="text-4xl">⚖️</span>
        </div>
        
        <h2 className="text-xl font-bold mb-4 text-center text-foreground">
          Important Legal Notice
        </h2>
        
        <div className="text-text-dim text-sm space-y-3 mb-6">
          <p>
            <strong className="text-foreground">Nebula Downloader</strong> is a tool that uses 
            yt-dlp to download videos from various platforms for personal, offline viewing.
          </p>
          
          <p>
            <strong className="text-yellow-400">⚠️ Your Responsibility:</strong>
          </p>
          
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Only download content you have the right to access</li>
            <li>Respect copyright laws in your jurisdiction</li>
            <li>Do not redistribute copyrighted content</li>
            <li>Some platforms prohibit downloading in their Terms of Service</li>
          </ul>
          
          <p className="text-xs text-text-dim mt-4">
            By using this application, you acknowledge that you are solely responsible 
            for ensuring your use complies with applicable laws and platform terms.
          </p>
        </div>
        
        <button
          onClick={onAccept}
          className="w-full py-3 bg-neon-blue text-white rounded-lg font-semibold hover:bg-neon-blue/90 transition-colors"
        >
          I Understand & Accept
        </button>
      </div>
    </div>
  )
}

export default DisclaimerModal
