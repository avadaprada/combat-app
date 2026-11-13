'use client'

export default function Modal({ isOpen, onClose, message, type = 'info' }) {
  if (!isOpen) return null

  // Warna teks berdasarkan tipe
  const textColor = type === 'error' ? 'text-[#f0b9a8]' : type === 'success' ? 'text-[#e3d0b3]' : 'text-[#e3d0b3]'
  const borderColor = type === 'error' ? 'border-[#85200c]' : 'border-[#e3d0b3]'

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity">
      <div className={`relative bg-[#1c222e] border ${borderColor} p-8 max-w-md w-full mx-4 shadow-2xl`}>
        
        {/* Ornamen Sudut */}
        <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 ${borderColor}`}></div>
        <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 ${borderColor}`}></div>

        {/* Pesan */}
        <div className={`text-sm font-bold leading-relaxed mb-8 ${textColor}`}>
          {message}
        </div>

        {/* Tombol OK */}
        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className={`border ${borderColor} px-8 py-2 text-xs font-bold tracking-widest uppercase transition-colors hover:bg-[#e3d0b3] hover:text-[#1c222e]`}
          >
            OK
          </button>
        </div>

      </div>
    </div>
  )
}