'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Crosshair, QrCode, ArrowRight, ShieldAlert, Sparkles, Users, Zap } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  const [code, setCode] = useState('')

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim()) {
      router.push(`/join/${code.trim().toUpperCase()}`)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F1EA] flex flex-col justify-between relative overflow-hidden bg-grid-tactical">
      {/* Top Ticker Marquee */}
      <div className="bg-[#121212] text-[#CCFF00] font-mono-tactical text-xs font-bold py-2 overflow-hidden border-b-4 border-[#121212] select-none">
        <div className="animate-marquee whitespace-nowrap flex gap-8 tracking-widest uppercase">
          <span>🎯 SEEKR // SOCIAL PARTY GAME</span>
          <span>⚡ FIND PEOPLE IN THE ROOM</span>
          <span>🔍 MATCH ANSWERS TO QUESTIONS</span>
          <span>🏆 +100 PTS FOR FINDING // +50 PTS FOR BEING FOUND</span>
          <span>🎯 SEEKR // SOCIAL PARTY GAME</span>
          <span>⚡ FIND PEOPLE IN THE ROOM</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl mx-auto px-4 py-8 md:py-12 flex-1 flex flex-col justify-center space-y-8">

        {/* Title Header / Classified Dossier Badge */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#FFD600] border-3 border-[#121212] px-3.5 py-1 text-xs font-mono-tactical font-black uppercase shadow-hard-sm tracking-wider transform -rotate-1">
            <Users className="w-4 h-4 text-[#121212]" />
            LIVE MULTIPLAYER PARTY GAME
          </div>

          <div className="relative inline-block">
            <h1 className="text-5xl md:text-6xl font-display font-black tracking-tight text-[#121212] uppercase leading-none">
              <span className="bg-[#CCFF00] px-3 border-4 border-[#121212] shadow-hard inline-block transform rotate-1 mt-1">
                SEEKR
              </span>
            </h1>
          </div>

          <p className="font-body text-base md:text-lg font-semibold text-[#121212]/80 max-w-md mx-auto">
            Scan. Answer 5 personal clues. Find your secret target in the room.
          </p>
        </div>

        {/* Primary Action Console */}
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-6 md:p-8 space-y-6 relative">
          {/* Decorative Corner Bracket Crosshairs */}
          <div className="absolute top-2 left-2 font-mono-tactical text-xs font-bold text-[#121212] select-none">┌──</div>
          <div className="absolute top-2 right-2 font-mono-tactical text-xs font-bold text-[#121212] select-none">──┐</div>
          <div className="absolute bottom-2 left-2 font-mono-tactical text-xs font-bold text-[#121212] select-none">└──</div>
          <div className="absolute bottom-2 right-2 font-mono-tactical text-xs font-bold text-[#121212] select-none">──┘</div>

          {/* Quick Join With Code Form */}
          <form onSubmit={handleJoinSubmit} className="space-y-3">
            <label className="block font-mono-tactical text-xs font-bold uppercase tracking-wider text-[#121212]">
              ▸ HAVE A GAME CODE?
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ENTER CODE (E.G. HUNT99)"
                maxLength={8}
                className="flex-1 h-14 px-4 bg-[#F4F1EA] border-3 border-[#121212] font-mono-tactical text-xl font-bold uppercase tracking-widest placeholder:text-[#121212]/40 focus:outline-none focus:bg-white focus:shadow-hard-sm transition"
                required
              />
              <button
                type="submit"
                className="h-14 px-6 bg-[#FF4500] hover:bg-[#ff571a] text-white font-display font-black text-lg uppercase border-3 border-[#121212] btn-neo flex items-center justify-center gap-2 cursor-pointer"
              >
                JOIN <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t-3 border-dashed border-[#121212]/30" />
            <span className="absolute bg-white px-3 font-mono-tactical text-xs font-bold text-[#121212]/60 uppercase tracking-widest">
              OR ORGANIZE
            </span>
          </div>

          {/* Create Event CTA */}
          <div>
            <Link
              href="/create"
              className="w-full h-16 bg-[#CCFF00] hover:bg-[#d6ff1a] text-[#121212] font-display font-black text-xl uppercase border-4 border-[#121212] btn-neo flex items-center justify-center gap-3 cursor-pointer shadow-hard"
            >
              <Zap className="w-6 h-6 fill-[#121212]" />
              HOST A GAME ROOM
              <ArrowRight className="w-6 h-6" />
            </Link>
            <p className="text-center font-mono-tactical text-xs font-semibold text-[#121212]/60 mt-2">
              Generates venue QR Code & real-time big screen scoreboard
            </p>
          </div>
        </div>

        {/* How It Works Mini Blueprint Dossier */}
        <div className="bg-[#EAE5D9] border-3 border-[#121212] shadow-hard p-5 space-y-4">
          <div className="flex items-center justify-between border-b-2 border-[#121212] pb-2">
            <span className="font-mono-tactical text-xs font-black uppercase tracking-wider text-[#121212] flex items-center gap-1.5">
              <Crosshair className="w-4 h-4 text-[#FF4500]" />
              HOW IT WORKS
            </span>
            <span className="font-mono-tactical text-[10px] bg-[#121212] text-white px-2 py-0.5 font-bold uppercase">
              NO APP NEEDED
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono-tactical text-xs">
            <div className="bg-white p-3 border-2 border-[#121212] shadow-hard-sm">
              <span className="font-black text-[#FF4500] text-sm">01 //</span>
              <p className="font-bold text-[#121212] mt-1 uppercase">JOIN</p>
              <p className="text-[11px] text-[#121212]/70 font-sans mt-0.5">Scan QR code or enter game code</p>
            </div>
            <div className="bg-white p-3 border-2 border-[#121212] shadow-hard-sm">
              <span className="font-black text-[#00F0FF] text-sm">02 //</span>
              <p className="font-bold text-[#121212] mt-1 uppercase">ANSWER</p>
              <p className="text-[11px] text-[#121212]/70 font-sans mt-0.5">Answer 5 personal questions</p>
            </div>
            <div className="bg-white p-3 border-2 border-[#121212] shadow-hard-sm">
              <span className="font-black text-[#FFD600] text-sm">03 //</span>
              <p className="font-bold text-[#121212] mt-1 uppercase">FIND</p>
              <p className="text-[11px] text-[#121212]/70 font-sans mt-0.5">Match answers to find your person</p>
            </div>
            <div className="bg-white p-3 border-2 border-[#121212] shadow-hard-sm">
              <span className="font-black text-[#CCFF00] text-sm">04 //</span>
              <p className="font-bold text-[#121212] mt-1 uppercase">SCORE</p>
              <p className="text-[11px] text-[#121212]/70 font-sans mt-0.5">Submit guess and earn points</p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Tape */}
      <div className="bg-[#121212] text-white py-3 px-4 text-center border-t-4 border-[#121212] font-mono-tactical text-xs font-bold">
        <span>⚡ Seekr // PARTY GAME</span>
      </div>
    </main>
  )
}
