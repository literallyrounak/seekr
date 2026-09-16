'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Users, Zap, ShieldCheck, HelpCircle } from 'lucide-react'

export default function CreateEvent() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [maxPlayers, setMaxPlayers] = useState<number | ''>(40)
  const [answerTime, setAnswerTime] = useState(120) // 2 minutes
  const [discoveryTime, setDiscoveryTime] = useState(300) // 5 minutes
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          max_players: typeof maxPlayers === 'number' && !isNaN(maxPlayers) ? maxPlayers : 40,
          answer_time_seconds: answerTime,
          discovery_time_seconds: discoveryTime
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create event')
      }

      localStorage.setItem(`host_${data.event.code}`, 'true')
      router.push(`/host/${data.event.code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F1EA] bg-grid-tactical p-4 md:p-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-xl space-y-6">

        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white border-3 border-[#121212] px-4 py-2 font-mono-tactical text-xs font-black uppercase shadow-hard-sm btn-neo"
          >
            <ArrowLeft className="w-4 h-4" /> ABORT // BACK
          </Link>
          <div className="bg-[#FFD600] border-3 border-[#121212] px-3 py-1 font-mono-tactical text-xs font-black uppercase shadow-hard-sm">
            HOST SETUP CONSOLE
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-6 md:p-8 space-y-6 relative">

          <div className="border-b-3 border-[#121212] pb-4">
            <h1 className="text-3xl md:text-4xl font-display font-black text-[#121212] uppercase tracking-tight">
              INITIALIZE ROOM
            </h1>
            <p className="font-mono-tactical text-xs text-[#121212]/70 font-bold uppercase mt-1">
              CONFIGURE YOUR REAL-WORLD SEEKING HUNT SESSION
            </p>
          </div>

          {error && (
            <div className="bg-[#FF2E63] text-white p-4 border-3 border-[#121212] font-mono-tactical text-xs font-bold uppercase shadow-hard-sm">
              ⚠️ ERROR: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Name */}
            <div className="space-y-2">
              <label className="block font-mono-tactical text-xs font-black uppercase tracking-wider text-[#121212]">
                01 // EVENT NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.G., FRIDAY BAR SOCIAL, TEAM OFF-SITE"
                className="w-full h-14 px-4 bg-[#F4F1EA] border-3 border-[#121212] font-mono-tactical text-base font-bold uppercase tracking-wide placeholder:text-[#121212]/40 focus:outline-none focus:bg-white focus:shadow-hard-sm transition"
                required
              />
            </div>

            {/* Max Players */}
            <div className="space-y-2">
              <label className="block font-mono-tactical text-xs font-black uppercase tracking-wider text-[#121212] flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#FF4500]" />
                02 // PLAYER CAPACITY LIMIT
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[20, 30, 40, 50].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setMaxPlayers(count)}
                    className={`h-12 border-3 border-[#121212] font-mono-tactical font-black text-sm uppercase transition cursor-pointer ${
                      maxPlayers === count
                        ? 'bg-[#CCFF00] shadow-hard text-[#121212]'
                        : 'bg-[#F4F1EA] hover:bg-white text-[#121212]/80'
                    }`}
                  >
                    {count} MAX
                  </button>
                ))}
              </div>
            </div>

            {/* Timers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Answer Phase Timer */}
              <div className="space-y-2">
                <label className="block font-mono-tactical text-xs font-black uppercase tracking-wider text-[#121212] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#00F0FF]" />
                  03 // ANSWER PHASE TIMER
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '1 MIN', val: 60 },
                    { label: '2 MIN (REC)', val: 120 },
                    { label: '3 MIN', val: 180 },
                    { label: '5 MIN', val: 300 }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setAnswerTime(item.val)}
                      className={`h-11 border-2 border-[#121212] font-mono-tactical font-bold text-xs uppercase transition cursor-pointer ${
                        answerTime === item.val
                          ? 'bg-[#00F0FF] shadow-hard-sm text-[#121212]'
                          : 'bg-[#F4F1EA] hover:bg-white text-[#121212]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discovery Phase Timer */}
              <div className="space-y-2">
                <label className="block font-mono-tactical text-xs font-black uppercase tracking-wider text-[#121212] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#FFD600]" />
                  04 // FINDING PHASE LIMIT
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '3 MIN', val: 180 },
                    { label: '5 MIN (REC)', val: 300 },
                    { label: '10 MIN', val: 600 },
                    { label: '15 MIN', val: 900 }
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setDiscoveryTime(item.val)}
                      className={`h-11 border-2 border-[#121212] font-mono-tactical font-bold text-xs uppercase transition cursor-pointer ${
                        discoveryTime === item.val
                          ? 'bg-[#FFD600] shadow-hard-sm text-[#121212]'
                          : 'bg-[#F4F1EA] hover:bg-white text-[#121212]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Questions Briefing */}
            <div className="bg-[#EAE5D9] border-3 border-[#121212] p-4 space-y-2.5">
              <div className="flex items-center justify-between font-mono-tactical text-xs font-black uppercase text-[#121212]">
                <span>📋 QUESTIONS (5 DEFAULT CLUES)</span>
                <span className="text-[#FF4500]">ACTIVE</span>
              </div>
              <ul className="font-mono-tactical text-xs text-[#121212]/80 space-y-1">
                <li>• 1. What is your favorite cuisine?</li>
                <li>• 2. What is your favorite movie of all time?</li>
                <li>• 3. What song is currently stuck in your head?</li>
                <li>• 4. What is one thing you can't live without?</li>
                <li>• 5. What is your dream vacation destination?</li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-[#CCFF00] hover:bg-[#d6ff1a] disabled:opacity-50 text-[#121212] font-display font-black text-xl uppercase border-4 border-[#121212] shadow-hard-lg btn-neo flex items-center justify-center gap-3 cursor-pointer"
            >
              <Zap className="w-6 h-6 fill-[#121212]" />
              {loading ? 'GENERATING VENUE QR...' : 'LAUNCH ROOM & GET QR CODE'}
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}
