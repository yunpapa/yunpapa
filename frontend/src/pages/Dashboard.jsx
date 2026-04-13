import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { TrendingUp, FileText, Upload, ChevronRight } from 'lucide-react'
import { statsApi, receiptApi } from '../api/client'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function formatKRW(amount) {
  return (amount || 0).toLocaleString('ko-KR') + '원'
}

function StatCard({ icon: Icon, label, value, color = 'blue' }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${colorMap[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
  )
}

const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm">
        <p className="font-medium text-slate-700 mb-1">{label}</p>
        <p className="text-blue-600">{formatKRW(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-sm">
        <p className="font-medium text-slate-700">{payload[0].name}</p>
        <p style={{ color: payload[0].payload.fill }}>{formatKRW(payload[0].value)}</p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)
  const [recentReceipts, setRecentReceipts] = useState([])
  const [monthlyData, setMonthlyData] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split('T')[0]
      const today = now.toISOString().split('T')[0]

      // 이번 달 요약
      const summaryRes = await statsApi.summary({ start_date: startOfMonth, end_date: today })
      if (summaryRes.data.success) setSummary(summaryRes.data.data)

      // 최근 5건
      const listRes = await receiptApi.list({ page: 1, size: 5 })
      if (listRes.data.success) setRecentReceipts(listRes.data.data?.items || [])

      // 최근 6개월 월별 데이터
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = d.toISOString().split('T')[0]
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
        const label = `${d.getMonth() + 1}월`
        months.push({ start, end, label })
      }
      const monthlyResults = await Promise.all(
        months.map((m) => statsApi.summary({ start_date: m.start, end_date: m.end }))
      )
      setMonthlyData(
        months.map((m, i) => ({
          name: m.label,
          amount: monthlyResults[i].data?.data?.period_total || 0,
        }))
      )
    } catch (e) {
      console.error('대시보드 데이터 로드 실패', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  const categoryData = (summary?.category_totals || []).map((cat, i) => ({
    name: cat.category,
    value: cat.total,
    fill: COLORS[i % COLORS.length],
  }))

  const isEmpty = !summary || (summary.period_total === 0 && summary.receipt_count === 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">대시보드</h1>
        <p className="text-sm text-slate-500 mt-0.5">이번 달 지출 현황</p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={FileText}
          title="지출 내역이 없습니다"
          description="영수증을 업로드하면 AI가 자동으로 분석해드립니다."
          actionLabel="영수증 업로드"
          onAction={() => navigate('/upload')}
        />
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              icon={TrendingUp}
              label="이번 달 총 지출"
              value={formatKRW(summary?.period_total)}
              color="blue"
            />
            <StatCard
              icon={FileText}
              label="영수증 건수"
              value={`${(summary?.receipt_count || 0).toLocaleString('ko-KR')}건`}
              color="green"
            />
          </div>

          {/* 월별 지출 BarChart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">월별 지출 추이 (최근 6개월)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={monthlyData}
                onClick={(data) => {
                  if (data?.activePayload) {
                    const idx = data.activeTooltipIndex
                    if (idx !== undefined) {
                      const now = new Date()
                      const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
                      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                      navigate(`/receipts?month=${month}`)
                    }
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 10000 ? `${Math.round(v / 10000)}만` : v}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 카테고리별 PieChart */}
          {categoryData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">카테고리별 지출 (이번 달)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    onClick={(data) => navigate(`/receipts?category=${data.name}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 최근 지출 목록 */}
          {recentReceipts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">최근 지출</h2>
                <button
                  onClick={() => navigate('/receipts')}
                  className="flex items-center gap-0.5 text-xs text-blue-600 hover:text-blue-700"
                >
                  전체보기 <ChevronRight size={13} />
                </button>
              </div>
              <ul className="divide-y divide-slate-100">
                {recentReceipts.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/receipts/${r.id}`)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.store_name || '-'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.date} · {r.category || '-'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 ml-4 shrink-0">
                      {formatKRW(r.total_amount)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
