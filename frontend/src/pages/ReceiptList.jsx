import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Trash2, Eye, ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { receiptApi, categoryApi } from '../api/client'
import { useToast } from '../components/common/Toast'
import Modal from '../components/common/Modal'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function formatKRW(amount) {
  return (amount || 0).toLocaleString('ko-KR') + '원'
}

export default function ReceiptList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const toast = useToast()

  const [receipts, setReceipts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [storeName, setStoreName] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const debounceRef = useRef(null)

  const PAGE_SIZE = 20
  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    categoryApi.list().then((res) => {
      if (res.data.success) setCategories(res.data.data || [])
    }).catch(() => {})
  }, [])

  const fetchList = useCallback(async (params) => {
    setLoading(true)
    try {
      const res = await receiptApi.list(params)
      if (res.data.success) {
        setReceipts(res.data.data?.items || [])
        setTotal(res.data.data?.total || 0)
      }
    } catch {
      toast({ type: 'error', message: '목록을 불러오지 못했습니다.' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // 필터 변경 시 디바운스 (상호명만)
  const triggerSearch = useCallback(() => {
    fetchList({
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      category: category || undefined,
      store_name: storeName || undefined,
      page,
      size: PAGE_SIZE,
    })
  }, [fetchList, startDate, endDate, category, storeName, page])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(triggerSearch, 300)
    return () => clearTimeout(debounceRef.current)
  }, [storeName])

  useEffect(() => {
    setPage(1)
    triggerSearch()
  }, [startDate, endDate, category])

  useEffect(() => {
    triggerSearch()
  }, [page])

  const handleDelete = async (id) => {
    try {
      const res = await receiptApi.delete(id)
      if (res.data.success) {
        toast({ type: 'success', message: '영수증이 삭제되었습니다.' })
        triggerSearch()
      } else {
        throw new Error(res.data.error?.message)
      }
    } catch {
      toast({ type: 'error', message: '삭제 중 오류가 발생했습니다.' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">지출 내역</h1>
        <p className="text-sm text-slate-500 mt-0.5">전체 {total.toLocaleString('ko-KR')}건</p>
      </div>

      {/* 검색/필터 바 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">시작일</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">종료일</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">카테고리</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              <option value="">전체</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-500">상호명</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="상호명 검색..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="검색 결과가 없습니다"
          description="필터 조건을 변경하거나 영수증을 새로 업로드해보세요."
          actionLabel="영수증 업로드"
          onAction={() => navigate('/upload')}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* 데스크탑 테이블 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">날짜</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">상호명</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">카테고리</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">금액</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">이미지</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {receipts.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/receipts/${r.id}`)}
                    >
                      <td className="px-4 py-3 text-slate-600">{r.date}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{r.store_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full">
                          {r.category || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800">
                        {formatKRW(r.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {r.image_path ? (
                          <img
                            src={`${BASE_URL}/${r.image_path}`}
                            alt="썸네일"
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 mx-auto"
                            onError={(e) => { e.target.style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded-lg mx-auto flex items-center justify-center">
                            <FileText size={14} className="text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => navigate(`/receipts/${r.id}`)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="상세보기"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 목록 */}
            <ul className="md:hidden divide-y divide-slate-100">
              {receipts.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                  onClick={() => navigate(`/receipts/${r.id}`)}
                >
                  {r.image_path ? (
                    <img
                      src={`${BASE_URL}/${r.image_path}`}
                      alt="썸네일"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 flex items-center justify-center">
                      <FileText size={18} className="text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{r.store_name || '-'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {r.date} · {r.category || '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-semibold text-slate-800">{formatKRW(r.total_amount)}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(r.id) }}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* 삭제 확인 모달 */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { handleDelete(deleteTarget); setDeleteTarget(null) }}
        title="영수증 삭제"
        message="이 영수증을 삭제하면 복구할 수 없습니다. 정말 삭제하시겠습니까?"
      />
    </div>
  )
}
