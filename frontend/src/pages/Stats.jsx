import { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { TrendingUp, FileText, Calendar } from 'lucide-react'
import { statsApi } from '../api/client'
import Spinner from '../components/common/Spinner'
import EmptyState from '../components/common/EmptyState'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

function formatKRW(v) {
  return (v || 0).toLocaleString('ko-KR') + '원'
}

function getPreset(preset) {
  const now = new Date()
  const fmt = (d) => d.toISOString().split('T')[0]

  if (preset === 'this_month') {
    return {
      start: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: fmt(now),
    }
  }
  if (preset === 'last_month') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return { start: fmt(first), end: fmt(last) }
  }
  if (preset === '3months') {
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    return { start: fmt(start), end: fmt(now) }
  }
  return null
}

const CustomTooltip = ({ active, payload, label }) => {
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

export default function Stats() {
  const now = new Date()
  const [preset, setPreset] = useState('this_month')
  const [startDate, setStartDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(null)

  const handlePreset = (p) => {
    setPreset(p)
    if (p !== 'custom') {
      const range = getPreset(p)
      if (range) {
        setStartDate(range.start)
        setEndDate(range.end)
      }
    }
  }

  useEffect(() => {
    if (!startDate || !endDate) return
    setLoading(true)
    statsApi.summary({ start_date: startDate, end_date: endDate })
      .then((res) => {
        if (res.data.success) setSummary(res.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [startDate, endDate])

  const categoryData = summary?.by_category
    ? Object.entries(summary.by_category)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
    : []

  const dailyData = summary?.daily_amounts
    ? Object.entries(summary.daily_amounts)
        .map(([date, amount]) => ({ date: date.slice(5), amount }))
        .sort((a, b) => a.date.localeCompare(b.date))
    : []

  const isEmpty = !summary || (summary.total_amount === 0 && summary.receipt_count === 0)

  const presets = [
    { key: 'this_month', label: '이번 달' },
    { key: 'last_month', label: '지난 달' },
    { key: '3months', label: '최근 3개월' },
    { key: 'custom', label: '직접 입력' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">통계 분석</h1>
        <p className="text-sm text-slate-500 mt-0.5">기간별 지출 패턴을 분석합니다.</p>
      </div>

      {/* 기간 선택기 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePreset(p.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                preset === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <span className="text-slate-400 text-sm">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner size="lg" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={TrendingUp}
          title="해당 기간에 지출 내역이 없습니다"
          description="다른 기간을 선택하거나 영수증을 업로드해보세요."
        />
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">총 지출</p>
                <div className="flex items-center justify-center w-9 h-9 bg-blue-50 rounded-lg">
                  <TrendingUp size={18} className="text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{formatKRW(summary?.total_amount)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-500">영수증 건수</p>
                <div className="flex items-center justify-center w-9 h-9 bg-green-50 rounded-lg">
                  <FileText size={18} className="text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">
                {(summary?.receipt_count || 0).toLocaleString('ko-KR')}건
              </p>
            </div>
          </div>

          {/* 일별 지출 LineChart */}
          {dailyData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">일별 지출 추이</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 10000 ? `${Math.round(v / 10000)}만` : v}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 카테고리별 BarChart */}
          {categoryData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">카테고리별 지출</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 10000 ? `${Math.round(v / 10000)}만` : v}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 카테고리별 상세 테이블 */}
          {categoryData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">카테고리별 상세</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-5 py-2.5 text-xs font-semibold text-slate-500">카테고리</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500">지출액</th>
                    <th className="text-right px-5 py-2.5 text-xs font-semibold text-slate-500">비율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoryData.map((row, i) => {
                    const ratio = summary.total_amount > 0
                      ? ((row.amount / summary.total_amount) * 100).toFixed(1)
                      : '0.0'
                    return (
                      <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ background: COLORS[i % COLORS.length] }}
                            />
                            <span className="text-slate-700">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-slate-800">
                          {formatKRW(row.amount)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${ratio}%`,
                                  background: COLORS[i % COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-slate-500 w-10 text-right">{ratio}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
