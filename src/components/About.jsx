import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Shield, Brain, Dna, Pill, Activity, Droplets, MessageCircle, Lightbulb, Lock } from 'lucide-react'

const features = [
  { icon: Upload, title: 'Upload Records', desc: 'Import medical documents — lab results, prescriptions, genomics — via AI-powered parsing that extracts structured data automatically.' },
  { icon: Activity, title: 'Vitals Dashboard', desc: 'Track blood pressure, heart rate, weight, temperature, and more with interactive charts and trend analysis over time.' },
  { icon: Droplets, title: 'Blood Work', desc: 'View lab panels with marker-level detail, reference ranges, and historical trends. Flag abnormalities for follow-up.' },
  { icon: Dna, title: 'Genomics', desc: 'Store and explore genetic data including traits, ancestry markers, and health-relevant variants in one secure place.' },
  { icon: Pill, title: 'Rx & Allergies', desc: 'Keep a current medication list with dosages and frequencies, plus documented allergies and reactions.' },
  { icon: Lightbulb, title: 'AI Insights', desc: 'Get personalized health observations generated from your records — connections across labs, vitals, and medications.' },
  { icon: MessageCircle, title: 'Ask AI', desc: 'Chat with an AI that has context on your health data. Ask questions, get explanations, explore your records conversationally.' },
  { icon: Shield, title: 'End-to-End Encryption', desc: 'All medical data is encrypted with your personal passphrase before it leaves your device. Not even the server can read it.' },
]

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors mb-8">
          <ArrowLeft size={16} strokeWidth={1.5} />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-0 mb-3">
            <span className="text-4xl text-text-primary" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, letterSpacing: '-0.02em' }}>Med</span>
            <span className="text-4xl font-semibold text-accent-blue mx-1" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>+</span>
            <span className="text-4xl text-text-primary" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, letterSpacing: '-0.02em' }}>Dash</span>
          </div>
          <p className="text-text-muted text-lg">Your encrypted personal health dashboard</p>
        </div>

        {/* How It Works */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-xs text-text-muted uppercase tracking-wider mb-5 flex items-center gap-2">
            <Lock size={14} strokeWidth={1.5} className="text-accent-blue" /> How It Works
          </h2>
          <ol className="space-y-4 text-sm text-text-secondary">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-semibold flex items-center justify-center shrink-0">1</span>
              <span><strong className="text-text-primary">Sign in</strong> with your Google account, then create an encryption passphrase. This passphrase never leaves your device.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-semibold flex items-center justify-center shrink-0">2</span>
              <span><strong className="text-text-primary">Upload</strong> medical records — PDFs, lab reports, prescriptions. AI parses them into structured, searchable data.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-semibold flex items-center justify-center shrink-0">3</span>
              <span><strong className="text-text-primary">Explore</strong> your health data across vitals, blood work, genomics, and medications — all encrypted end-to-end.</span>
            </li>
          </ol>
        </div>

        {/* Features */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-xs text-text-muted uppercase tracking-wider mb-5 flex items-center gap-2">
            <Activity size={14} strokeWidth={1.5} className="text-accent-green" /> Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-bg-tertiary rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Icon size={16} strokeWidth={1.5} className="text-accent-blue" />
                  <h3 className="text-sm font-medium text-text-primary">{title}</h3>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-xs text-text-muted uppercase tracking-wider mb-5 flex items-center gap-2">
            <Brain size={14} strokeWidth={1.5} className="text-accent-amber" /> Tips
          </h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex gap-2"><span className="text-accent-amber">•</span> Upload records right after each doctor visit for the most complete picture.</li>
            <li className="flex gap-2"><span className="text-accent-amber">•</span> Use "Ask AI" to get plain-language explanations of confusing lab values.</li>
            <li className="flex gap-2"><span className="text-accent-amber">•</span> Save your recovery code somewhere safe — if you forget your passphrase, it's the only way back in.</li>
            <li className="flex gap-2"><span className="text-accent-amber">•</span> Click any vital card on the Overview to see its full trend history.</li>
            <li className="flex gap-2"><span className="text-accent-amber">•</span> The dashboard auto-locks after 15 minutes of inactivity for security.</li>
          </ul>
        </div>

        {/* Your Data */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xs text-text-muted uppercase tracking-wider mb-5 flex items-center gap-2">
            <Shield size={14} strokeWidth={1.5} className="text-accent-green" /> Your Data
          </h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex gap-2"><span className="text-accent-green">•</span> All health data is encrypted with AES-GCM using your passphrase before storage.</li>
            <li className="flex gap-2"><span className="text-accent-green">•</span> Data is stored in Supabase — but only you can decrypt it.</li>
            <li className="flex gap-2"><span className="text-accent-green">•</span> Use <strong className="text-text-primary">Download my data</strong> from the sidebar menu to export everything as JSON.</li>
            <li className="flex gap-2"><span className="text-accent-green">•</span> Use <strong className="text-text-primary">Delete all data</strong> to permanently erase your records. This cannot be undone.</li>
            <li className="flex gap-2"><span className="text-accent-green">•</span> No data is shared with third parties. AI features send data to Google Gemini for processing but nothing is stored externally.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
