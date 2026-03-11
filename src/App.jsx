import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider, useData } from './context/DataContext'
import Sidebar from './components/Sidebar'
import Overview from './components/Overview'
import Profile from './components/Profile'
import BloodWork from './components/BloodWork'
import Genetics from './components/Genetics'
import Medications from './components/Medications'
import Insights from './components/Insights'
import Chat from './components/Chat'
import VitalDetail from './components/VitalDetail'
import Upload from './components/Upload'
import Login from './components/Login'
import PassphraseGate from './components/PassphraseGate'
import Settings from './components/Settings'
import About from './components/About'
import { Lock, Unlock } from 'lucide-react'
import { ToastProvider } from './components/Toast'

const tabs = [
  { id: 'overview', path: '/overview', label: 'Overview' },
  { id: 'profile', path: '/profile', label: 'Profile' },
  { id: 'bloodwork', path: '/blood-work', label: 'Blood Work' },
  { id: 'genetics', path: '/genomics', label: 'Genomics' },
  { id: 'medications', path: '/rx', label: 'Rx & Allergies' },
  { id: 'insights', path: '/insights', label: 'Insights' },
  { id: 'upload', path: '/upload', label: 'Upload Records' },
  { id: 'chat', path: '/ask-ai', label: 'Ask AI' },
  { id: 'settings', path: '/settings', label: 'Settings' },
]

function EncryptionIndicator() {
  const { isUnlocked, lock } = useData()
  return (
    <button
      onClick={isUnlocked ? lock : undefined}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        isUnlocked
          ? 'bg-accent-green/10 text-accent-green hover:bg-accent-green/20'
          : 'bg-accent-amber/10 text-accent-amber'
      }`}
      title={isUnlocked ? 'Click to lock' : 'Locked'}
    >
      {isUnlocked ? <Unlock size={12} strokeWidth={1.5} /> : <Lock size={12} strokeWidth={1.5} />}
      {isUnlocked ? 'Unlocked' : 'Locked'}
    </button>
  )
}

function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { isUnlocked, hasPassphrase, dataLoading } = useData()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const activeTab = tabs.find(t => location.pathname.startsWith(t.path))?.id || 'overview'

  const setActiveTab = (id) => {
    const tab = tabs.find(t => t.id === id)
    if (tab) navigate(tab.path)
    setMobileMenuOpen(false)
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="text-text-muted">Loading...</div>
      </div>
    )
  }

  if (location.pathname === '/about') {
    return <About />
  }

  if (!user) {
    return <Login />
  }

  // Passphrase gate
  if (hasPassphrase === false || (hasPassphrase === true && !isUnlocked)) {
    return <PassphraseGate />
  }

  if (hasPassphrase === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-primary">
        <div className="text-text-muted">Loading encryption settings...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-bg-primary overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs} />
      </div>

      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border-primary bg-bg-secondary shrink-0">
        <div className="flex items-center gap-0">
          <span className="text-lg text-text-primary" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>Med</span>
          <span className="text-lg font-semibold text-accent-blue mx-0.5" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>+</span>
          <span className="text-lg text-text-primary" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>Dash</span>
        </div>
        <div className="flex items-center gap-2">
          <EncryptionIndicator />
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-lg text-text-muted hover:bg-bg-hover">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {mobileMenuOpen ? (
                <><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></>
              ) : (
                <><line x1="3" y1="5" x2="17" y2="5"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="15" x2="17" y2="15"/></>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[53px] left-0 right-0 z-50 bg-bg-secondary border-b border-border-primary shadow-xl">
          <nav className="p-2 space-y-0.5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-accent-blue/10 text-accent-blue'
                    : 'text-text-secondary hover:bg-bg-hover'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="border-t border-border-primary my-1" />
            <button
              onClick={() => { navigate('/about'); setMobileMenuOpen(false) }}
              className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-bg-hover"
            >
              About Med+Dash
            </button>
          </nav>
        </div>
      )}

      <main className="flex-1 overflow-y-auto" onClick={() => mobileMenuOpen && setMobileMenuOpen(false)}>
        <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-text-muted">Decrypting your data...</div>
            </div>
          ) : (
            <Routes>
              <Route path="/overview" element={<Overview />} />
              <Route path="/vital/:vitalId" element={<VitalDetail />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/blood-work" element={<BloodWork />} />
              <Route path="/genomics" element={<Genetics />} />
              <Route path="/rx" element={<Medications />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/ask-ai" element={<Chat />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
