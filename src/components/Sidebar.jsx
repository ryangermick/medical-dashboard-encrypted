import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { Activity, Droplets, Dna, Pill, Lightbulb, MessageCircle, UserCircle, Upload, Calendar, Shield, Lock, Unlock, LogOut, Settings } from 'lucide-react'

const iconMap = {
  overview: Activity,
  profile: UserCircle,
  bloodwork: Droplets,
  genetics: Dna,
  medications: Pill,
  insights: Lightbulb,
  upload: Upload,
  chat: MessageCircle,
  settings: Settings,
}

export default function Sidebar({ activeTab, setActiveTab, tabs }) {
  const { patient, isUnlocked, lock } = useData()
  const { signOut, user } = useAuth()

  const displayName = patient?.name || user?.user_metadata?.full_name || 'User'
  const initials = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <aside className="w-72 bg-bg-secondary border-r border-border-primary flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="px-6 pt-6 pb-4 border-b border-border-primary flex items-center justify-between">
        <div className="flex items-center gap-0">
          <span className="text-2xl text-text-primary" style={{ fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif", fontWeight: 600, letterSpacing: '-0.02em' }}>Med</span>
          <span className="text-2xl font-semibold text-accent-blue mx-0.5" style={{ fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif" }}>+</span>
          <span className="text-2xl text-text-primary" style={{ fontFamily: "'Playfair Display', 'Georgia', 'Times New Roman', serif", fontWeight: 600, letterSpacing: '-0.02em' }}>Dash</span>
        </div>
        <button
          onClick={isUnlocked ? lock : undefined}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs ${
            isUnlocked ? 'text-accent-green bg-accent-green/10 hover:bg-accent-green/20' : 'text-accent-amber bg-accent-amber/10'
          } transition-all`}
          title={isUnlocked ? 'Click to lock' : 'Locked'}
        >
          {isUnlocked ? <Unlock size={11} /> : <Lock size={11} />}
        </button>
      </div>

      {/* Patient Card */}
      <div className="p-6 border-b border-border-primary">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-bg-tertiary flex items-center justify-center">
            {user?.user_metadata?.avatar_url ? (
              <img src={user.user_metadata.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-text-muted text-xl font-semibold">{initials}</span>
            )}
          </div>
          <div>
            <h2 className="text-text-primary font-semibold text-lg leading-tight">{displayName}</h2>
            {patient?.member_id && (
              <p className="text-text-muted text-xs font-mono">{patient.member_id}</p>
            )}
          </div>
        </div>
        {patient && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-bg-tertiary rounded-lg px-3 py-2">
              <span className="text-text-muted">Age</span>
              <p className="text-text-primary font-medium">{patient.age}y</p>
            </div>
            <div className="bg-bg-tertiary rounded-lg px-3 py-2">
              <span className="text-text-muted">Blood</span>
              <p className="text-text-primary font-medium">{patient.blood_type}</p>
            </div>
            <div className="bg-bg-tertiary rounded-lg px-3 py-2">
              <span className="text-text-muted">Height</span>
              <p className="text-text-primary font-medium">{patient.height}</p>
            </div>
            <div className="bg-bg-tertiary rounded-lg px-3 py-2">
              <span className="text-text-muted">Weight</span>
              <p className="text-text-primary font-medium">{patient.weight}</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {tabs.filter(t => t.id !== 'settings').map((tab) => {
          const Icon = iconMap[tab.id]
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              {Icon && <Icon size={18} strokeWidth={1.5} />}
              {tab.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-border-primary space-y-2">
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'settings' ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
          }`}
        >
          <Settings size={18} strokeWidth={1.5} />
          Settings
        </button>
        {patient?.next_checkup && (
          <div className="flex items-center gap-2 px-4 py-2">
            <Calendar size={14} strokeWidth={1.5} className="text-text-muted" />
            <span className="text-xs text-text-muted">Next: {patient.next_checkup}</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2">
          <Shield size={14} strokeWidth={1.5} className="text-accent-green" />
          <span className="text-xs text-accent-green">E2E Encrypted</span>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-muted hover:bg-bg-hover hover:text-text-primary transition-all"
        >
          <LogOut size={18} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
