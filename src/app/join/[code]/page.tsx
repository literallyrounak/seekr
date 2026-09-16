'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserCheck, Shield, Sparkles, ArrowRight } from 'lucide-react'

export default function JoinEvent() {
  const params = useParams()
  const router = useRouter()
  const initialCode = (params.code as string)?.toUpperCase() || ''

  const [code, setCode] = useState(initialCode)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/events/${code}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to join event')
      }

      localStorage.setItem(`player_${code}`, data.player.id)
      localStorage.setItem(`username_${code}`, data.player.username)

      router.push(`/play/${code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F1EA] bg-grid-tactical p-4 flex flex-col justify-center items-center">
      <div className="w-full max-w-md space-y-6">

        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-white border-3 border-[#121212] px-3.5 py-1.5 font-mono-tactical text-xs font-black uppercase shadow-hard-sm btn-neo"
          >
            <ArrowLeft className="w-4 h-4" /> HOME
          </Link>
          <div className="bg-[#CCFF00] border-3 border-[#121212] px-3 py-1 font-mono-tactical text-xs font-black uppercase shadow-hard-sm">
            PLAYER REGISTRATION
          </div>
        </div>

        {/* Tactical Badge Card */}
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-6 md:p-8 space-y-6 relative">

          {/* Header */}
          <div className="border-b-3 border-[#121212] pb-4 space-y-1">
            <span className="font-mono-tactical text-[11px] font-bold text-[#FF4500] uppercase tracking-widest flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> PASSPORT // IN-VENUE GAME
            </span>
            <h1 className="text-3xl font-display font-black text-[#121212] uppercase tracking-tight">
              JOIN ROOM
            </h1>
          </div>

          {error && (
            <div className="bg-[#FF2E63] text-white p-3.5 border-3 border-[#121212] font-mono-tactical text-xs font-bold uppercase shadow-hard-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-5">
            {/* Event Code Field */}
            <div className="space-y-1.5">
              <label className="block font-mono-tactical text-xs font-black uppercase tracking-wider text-[#121212]">
                ROOM ACCESS CODE
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="E.G. DJ42"
                maxLength={8}
                className="w-full h-14 px-4 bg-[#F4F1EA] border-3 border-[#121212] font-mono-tactical text-2xl font-black uppercase tracking-widest text-center focus:outline-none focus:bg-white focus:shadow-hard-sm transition"
                required
              />
            </div>

            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="block font-mono-tactical text-xs font-black uppercase tracking-wider text-[#121212]">
                YOUR IN-GAME HANDLE (FIRST NAME / NICKNAME)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="E.G. ALEX, SAM, RAHUL"
                maxLength={30}
                className="w-full h-14 px-4 bg-[#F4F1EA] border-3 border-[#121212] font-mono-tactical text-xl font-black uppercase tracking-wider text-center focus:outline-none focus:bg-white focus:shadow-hard-sm transition"
                required
              />
              <p className="font-mono-tactical text-[11px] text-[#121212]/60 text-center font-bold">
                * Other players will search for this exact name in the venue!
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-[#CCFF00] hover:bg-[#d6ff1a] disabled:opacity-50 text-[#121212] font-display font-black text-xl uppercase border-4 border-[#121212] shadow-hard btn-neo flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <UserCheck className="w-6 h-6" />
              {loading ? 'CONNECTING...' : 'ENTER OPERATION'}
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Instructions pill */}
        <div className="bg-[#EAE5D9] border-2 border-[#121212] p-3 text-center font-mono-tactical text-xs font-bold text-[#121212]/80">
          KEEP YOUR SCREEN READY // QUESTIONS START WHEN HOST BEGINS
        </div>

      </div>
    </main>
  )
}
