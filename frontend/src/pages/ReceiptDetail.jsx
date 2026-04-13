import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, RotateCcw, Trash2, Plus, X, ZoomIn } from 'lucide-react'
import { receiptApi, categoryApi } from '../api/client'
import { useToast } from '../components/common/Toast'
import Modal from '../components/common/Modal'
import Spinner from '../components/common/Spinner'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const DEFAULT_CATEGORIES = ['식료품', '외식', '쇼핑', '교통', '의료', '문화/여가', '통신', '기타']

function formatKRW(v) {
  return (v || 0).toLocaleString('ko-KR') + '원'
}

export default function ReceiptDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [original, setOriginal] = useState(null)
  const [form, setForm] = useState(null)
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [imageModal, setImageModal] = useState(false)

  useEffect(() => {
    Promise.all([
      receiptApi.get(id),
      categoryApi.list(),
    ]).then(([rRes, cRes]) => {
      if (rRes.data.success) {
        const data = rRes.data.data
        setOriginal(data)
        setForm(deepClone(data))
      } else {
        toast({ type: 'error', message: '영수증을 찾을 수 없습니다.' })
        navigate('/receipts')
      }
      if (cRes.data.success) setCategories(cRes.data.data || DEFAULT_CATEGORIES)
    }).catch(() => {
      toast({ type: 'error', message: '데이터를 불러오지 못했습니다.' })
    }).finally(() => setLoading(false))
  }, [id])

  // ESC 키로 이미지 모달 닫기
  useEffect(() => {
    if (!imageModal) return
    const h = (e) => { if (e.key === 'Escape') setImageModal(false) }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [imageModal])

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj))
  }

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleItemChange = (idx, field, value) => {
    setForm((prev) => {
      const items = [...(prev.items || [])]
      items[idx] = { ...items[idx], [field]: value }
      // total_price 자동 계산
      if (field === 'quantity' || field === 'unit_price') {
        const qty = field === 'quantity' ? Number(value) : Number(items[idx].quantity)
        const price = field === 'unit_price' ? Number(value) : Number(items[idx].unit_price)
        items[idx].total_price = isNaN(qty * price) ? 0 : qty * price
      }
      return { ...prev, items }
    })
  }

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...(prev.items || []), { item_name: '', quantity: 1, unit_price: 0, total_price: 0 }],
    }))
  }

  const removeItem = (idx) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await receiptApi.update(id, form)
      if (res.data.success) {
        setOriginal(deepClone(form))
        toast({ type: 'success', message: '저장되었습니다.' })
      } else {
        throw new Error(res.data.error?.message)
      }
    } catch {
      toast({ type: 'error', message: '저장 중 오류가 발생했습니다.' })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setForm(deepClone(original))
    toast({ type: 'info', message: 'AI 추출 원본값으로 복원했습니다.' })
  }

  const handleDelete = async () => {
    try {
      const res = await receiptApi.delete(id)
      if (res.data.success) {
        toast({ type: 'success', message: '영수증이 삭제되었습니다.' })
        navigate('/receipts')
      } else {
        throw new Error(res.data.error?.message)
      }
    } catch {
      toast({ type: 'error', message: '삭제 중 오류가 발생했습니다.' })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!form) return null

  // image_path는 "uploads/uuid.ext" 형태이므로 그대로 사용
  const imageUrl = form.image_path
    ? `${BASE_URL}/${form.image_path}`
    : null

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* 상단 바 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/receipts')}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
          목록으로
        </button>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={15} />
          삭제
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 원본 이미지 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">원본 이미지</h2>
          </div>
          <div className="relative bg-slate-100 min-h-[280px] flex items-center justify-center">
            {imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt="영수증 원본"
                  className="max-h-96 max-w-full object-contain cursor-zoom-in"
                  onClick={() => setImageModal(true)}
                  onError={(e) => { e.target.style.display = 'none' }}
                />
                <button
                  onClick={() => setImageModal(true)}
                  className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1.5 bg-black/50 hover:bg-black/70 text-white text-xs rounded-lg transition-colors"
                >
                  <ZoomIn size={13} />
                  확대
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                <ZoomIn size={40} />
                <p className="text-sm">이미지 없음</p>
              </div>
            )}
          </div>
        </div>

        {/* 우측: 편집 폼 */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">기본 정보</h2>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">날짜</label>
                <input
                  type="date"
                  value={form.date || ''}
                  onChange={(e) => handleFieldChange('date', e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">상호명</label>
                <input
                  type="text"
                  value={form.store_name || ''}
                  onChange={(e) => handleFieldChange('store_name', e.target.value)}
                  placeholder="상호명 입력"
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">카테고리</label>
                <select
                  value={form.category || ''}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="">선택</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-500">합계 금액</label>
                <input
                  type="number"
                  value={form.total_amount || 0}
                  onChange={(e) => handleFieldChange('total_amount', Number(e.target.value))}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>
          </div>

          {/* 항목 목록 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">항목 목록</h2>
              <button
                onClick={addItem}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus size={13} />
                추가
              </button>
            </div>

            {(form.items || []).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">항목이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {(form.items || []).map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_60px_80px_80px_28px] gap-1.5 items-center text-xs">
                    <input
                      value={item.item_name || ''}
                      onChange={(e) => handleItemChange(idx, 'item_name', e.target.value)}
                      placeholder="항목명"
                      className="px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                    <input
                      type="number"
                      value={item.quantity || 0}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="수량"
                      className="px-2 py-1.5 border border-slate-200 rounded-lg text-center focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                    <input
                      type="number"
                      value={item.unit_price || 0}
                      onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                      placeholder="단가"
                      className="px-2 py-1.5 border border-slate-200 rounded-lg text-right focus:outline-none focus:ring-1 focus:ring-blue-300"
                    />
                    <p className="text-right text-slate-600 pr-1 font-medium">
                      {(item.total_price || 0).toLocaleString('ko-KR')}
                    </p>
                    <button
                      onClick={() => removeItem(idx)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 grid grid-cols-[1fr_60px_80px_80px_28px] gap-1.5 w-full">
                    <span className="text-slate-400">합계</span>
                    <span />
                    <span />
                    <span className="text-right font-semibold text-slate-700">
                      {(form.items || []).reduce((s, i) => s + (i.total_price || 0), 0).toLocaleString('ko-KR')}
                    </span>
                    <span />
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <RotateCcw size={14} />
              원본 복원
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {saving ? <Spinner size="sm" /> : <Save size={14} />}
              저장
            </button>
          </div>
        </div>
      </div>

      {/* 이미지 확대 모달 */}
      {imageModal && imageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImageModal(false)}
        >
          <button
            onClick={() => setImageModal(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <X size={24} />
          </button>
          <img
            src={imageUrl}
            alt="영수증 확대"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="영수증 삭제"
        message="이 영수증을 삭제하면 복구할 수 없습니다. 정말 삭제하시겠습니까?"
      />
    </div>
  )
}
