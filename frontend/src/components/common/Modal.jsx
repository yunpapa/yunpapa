import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'

export default function Modal({ isOpen, onClose, onConfirm, title, message }) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-full shrink-0">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">{message}</p>

        <div className="flex gap-2 px-6 pb-5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}
