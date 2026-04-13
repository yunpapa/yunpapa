import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Upload from './pages/Upload'
import ReceiptList from './pages/ReceiptList'
import ReceiptDetail from './pages/ReceiptDetail'
import Stats from './pages/Stats'
import { ToastProvider } from './components/common/Toast'

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="upload" element={<Upload />} />
            <Route path="receipts" element={<ReceiptList />} />
            <Route path="receipts/:id" element={<ReceiptDetail />} />
            <Route path="stats" element={<Stats />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}
