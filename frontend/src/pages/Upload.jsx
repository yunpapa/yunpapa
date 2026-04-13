import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload as UploadIcon, FileText, Image, X, Sparkles } from 'lucide-react'
import { receiptApi } from '../api/client'
import { useToast } from '../components/common/Toast'
import Spinner from '../components/common/Spinner'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function validateFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_TYPES.includes(file.type) || !ALLOWED_EXT.includes(ext)) {
    return 'jpg, jpeg, png, pdf 파일만 업로드할 수 있습니다.'
  }
  if (file.size > MAX_SIZE) {
    return '파일 크기는 최대 10MB까지 허용됩니다.'
  }
  return null
}

export default function Upload() {
  const navigate = useNavigate()
  const toast = useToast()
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)

  const selectFile = useCallback((f) => {
    if (!f) return
    const err = validateFile(f)
    if (err) {
      toast({ type: 'error', message: err })
      return
    }
    setFile(f)
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }, [toast])

  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) selectFile(f)
  }

  const onInputChange = (e) => {
    const f = e.target.files?.[0]
    if (f) selectFile(f)
    e.target.value = ''
  }

  const clearFile = () => {
    setFile(null)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const res = await receiptApi.upload(file)
      if (res.data.success) {
        toast({ type: 'success', message: '영수증이 성공적으로 분석되었습니다!' })
        navigate(`/receipts/${res.data.data.id}`)
      } else {
        throw new Error(res.data.error?.message || '업로드 실패')
      }
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.message || '업로드 중 오류가 발생했습니다.'
      toast({ type: 'error', message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">영수증 업로드</h1>
        <p className="text-sm text-slate-500 mt-0.5">이미지 또는 PDF를 업로드하면 AI가 자동으로 분석합니다.</p>
      </div>

      {!file ? (
        /* 드래그앤드롭 영역 */
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
            dragging
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-300 bg-white hover:border-blue-300 hover:bg-slate-50'
          }`}
        >
          <div className={`flex items-center justify-center w-16 h-16 rounded-full transition-colors ${dragging ? 'bg-blue-100' : 'bg-slate-100'}`}>
            <UploadIcon size={28} className={dragging ? 'text-blue-500' : 'text-slate-400'} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              {dragging ? '여기에 파일을 놓으세요' : '파일을 드래그하거나 클릭하여 선택'}
            </p>
            <p className="text-xs text-slate-400 mt-1">JPG, PNG, PDF · 최대 10MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      ) : (
        /* 파일 선택 후 미리보기 */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* 미리보기 */}
          <div className="relative bg-slate-100 flex items-center justify-center min-h-[220px]">
            {preview ? (
              <img
                src={preview}
                alt="미리보기"
                className="max-h-64 max-w-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-12">
                <FileText size={48} className="text-slate-400" />
                <p className="text-sm text-slate-500">PDF 파일</p>
              </div>
            )}
            <button
              onClick={clearFile}
              className="absolute top-3 right-3 flex items-center justify-center w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow text-slate-600 hover:text-red-500 transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* 파일 정보 */}
          <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-100">
            <div className="flex items-center justify-center w-9 h-9 bg-blue-50 rounded-lg shrink-0">
              <Image size={16} className="text-blue-500" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
            </div>
          </div>
        </div>
      )}

      {/* 업로드 버튼 */}
      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {loading ? (
          <>
            <Spinner size="sm" />
            <span>영수증을 분석하고 있습니다...</span>
          </>
        ) : (
          <>
            <Sparkles size={16} />
            <span>AI 분석 시작</span>
          </>
        )}
      </button>

      {loading && (
        <p className="text-center text-xs text-slate-400">
          AI가 영수증 내용을 인식하는 중입니다. 잠시만 기다려주세요.
        </p>
      )}
    </div>
  )
}
