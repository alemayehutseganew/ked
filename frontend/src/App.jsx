import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import CardSelection from './pages/CardSelection'
import GameScreen from './pages/GameScreen'
import Wallet from './pages/Wallet'
import AgentDashboard from './pages/AgentDashboard'
import Settings from './pages/Settings'
import GameHistory from './pages/GameHistory'
import Leaderboard from './pages/Leaderboard'
import { LanguageProvider } from './LanguageContext'
import { WalletProvider } from './WalletContext'
import SocketService from './services/socket'
import { fetchApi } from './services/api'
import AdminLogin from './admin/AdminLogin'
import AdminLayout from './admin/AdminLayout'
import AdminDashboard from './admin/AdminDashboard'
import AdminUsers from './admin/AdminUsers'
import AdminGames from './admin/AdminGames'
import AdminPayments from './admin/AdminPayments'
import { ErrorBoundary } from './components/ErrorBoundary'


export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ErrorBoundary>
  )
}

function getStoredActiveRoom() {
  const activeRoomData = localStorage.getItem('activeGameRoom')
  if (!activeRoomData) return null

  try {
    const { roomId, stake } = JSON.parse(activeRoomData)
    if (!roomId) return null
    return { roomId, stake: Number(stake) || 10 }
  } catch (err) {
    console.error('[App] Failed to parse active game data', err)
    localStorage.removeItem('activeGameRoom')
    return null
  }
}

function AppContent() {
  const navigate = useNavigate()
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    tg?.ready()
    tg?.expand()

    const existingToken = localStorage.getItem('token')
    if (existingToken) SocketService.connect(existingToken)

    const initData = tg?.initData || ''
    const searchParams = new URLSearchParams(window.location.search)
    const referralCode = searchParams.get('ref') || ''
    const stake = searchParams.get('stake') || '10'
    if (!initData) {
      const activeRoom = getStoredActiveRoom()
      if (existingToken && activeRoom) {
        navigate(
          `/game?roomId=${encodeURIComponent(activeRoom.roomId)}&stake=${encodeURIComponent(activeRoom.stake)}`,
          { replace: true }
        )
      }
      return
    }

    fetchApi('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, referralCode }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Authentication failed: ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (data.token) {
          localStorage.setItem('token', data.token)
          localStorage.setItem('dbUserId', data.user.id)
          localStorage.setItem('walletBalance', data.user.wallet_balance)
          if (data.user.username) localStorage.setItem('telegramUsername', data.user.username)
          else localStorage.removeItem('telegramUsername')
          localStorage.setItem('telegramId', String(data.user.telegram_id))
          SocketService.connect(data.token)
          window.dispatchEvent(new Event('wallet-refresh'))

          const activeRoom = getStoredActiveRoom()
          if (activeRoom) {
            navigate(
              `/game?roomId=${encodeURIComponent(activeRoom.roomId)}&stake=${encodeURIComponent(activeRoom.stake)}`,
              { replace: true }
            )
            return
          }
          navigate(`/select-card?stake=${encodeURIComponent(stake)}`, { replace: true })
        }
      })
      .catch((err) => console.error('[App] Authentication failed:', err))
  }, [navigate])

  return (
    <LanguageProvider>
      <WalletProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/select-card?stake=10" replace />} />
          <Route path="/card-selection" element={<CardSelection />} />
          <Route path="/select-card" element={<CardSelection />} />
          <Route path="/select-cards" element={<CardSelection />} />
          <Route path="/game" element={<GameScreen />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/agent" element={<AgentDashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/history" element={<GameHistory />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={localStorage.getItem('adminToken') ? <AdminLayout /> : <Navigate to="/admin/login" />}
          >
            <Route index element={<Navigate to="dashboard" />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="games" element={<AdminGames />} />
            <Route path="payments" element={<AdminPayments />} />
          </Route>
        </Routes>
      </WalletProvider>
    </LanguageProvider>
  )
}
