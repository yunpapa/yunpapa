import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, Upload, List, BarChart2, Receipt } from 'lucide-react'

const navItems = [
  { to: '/', label: '대시보드', icon: Home, exact: true },
  { to: '/upload', label: '업로드', icon: Upload },
  { to: '/receipts', label: '내역', icon: List },
  { to: '/stats', label: '통계', icon: BarChart2 },
]

function NavItem({ item, mobile = false }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      className={({ isActive }) =>
        mobile
          ? `flex flex-col items-center gap-0.5 px-4 py-2 text-xs font-medium transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`
          : `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
            }`
      }
    >
      <Icon size={mobile ? 22 : 18} />
      <span>{item.label}</span>
    </NavLink>
  )
}

export default function Layout() {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* 좌측 사이드바 (데스크탑) */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <Receipt size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-tight">AI 영수증</p>
            <p className="text-xs text-slate-500">지출 관리</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} />
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-slate-100">
          <p className="text-xs text-slate-400">© 2026 AI Receipt Manager</p>
        </div>
      </aside>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* 상단 헤더 (모바일) */}
        <header className="md:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-lg">
            <Receipt size={15} className="text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800">AI 영수증 지출 관리</span>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>

        {/* 하단 탭바 (모바일) */}
        <nav className="md:hidden flex items-center justify-around bg-white border-t border-slate-200 safe-area-inset-bottom">
          {navItems.map((item) => (
            <NavItem key={item.to} item={item} mobile />
          ))}
        </nav>
      </div>
    </div>
  )
}
