'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, ArrowLeft, Radio } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { LeaderboardEntry } from '@/types'

export default function LeaderboardPage() {
  const params = useParams()
  const code = (params.code as string)?.toUpperCase()

  const [eventName, setEventName] = useState<string>('')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`/api/events/${code}/state`)
      const data = await res.json()

      if (res.ok) {
        setEventName(data.event.name)
        const sorted = (data.event.players || [])
          .map((p: any) => ({
            player_id: p.id,
            username: p.username,
            total_points: p.total_points || 0
          }))
          .sort((a: any, b: any) => b.total_points - a.total_points)

        setLeaderboard(sorted)
      }
    } catch (err) {
      console.error('Error loading leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()

    const pollInterval = setInterval(fetchLeaderboard, 2000)

    // Real-time score updates
    const channel = supabase
      .channel(`leaderboard:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_events' },
        () => fetchLeaderboard()
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [code])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] bg-grid-tactical flex items-center justify-center p-4">
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-8 text-center space-y-3 font-mono-tactical font-black text-base">
          <div className="animate-spin text-3xl inline-block">🏆</div>
          <p>LOADING LIVE STANDINGS...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#F4F1EA] bg-grid-tactical p-4 md:p-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-lg space-y-6">

        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/play/${code}`}
            className="inline-flex items-center gap-2 bg-white border-3 border-[#121212] px-3.5 py-1.5 font-mono-tactical text-xs font-black uppercase shadow-hard-sm btn-neo"
          >
            <ArrowLeft className="w-4 h-4" /> BACK TO GAME
          </Link>
          <div className="bg-[#FFD600] border-3 border-[#121212] px-3 py-1 font-mono-tactical text-xs font-black uppercase shadow-hard-sm flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#FF4500] animate-pulse" /> LIVE LEADERBOARD
          </div>
        </div>

        {/* Leaderboard Card */}
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-6 md:p-8 space-y-6">
          <div className="border-b-3 border-[#121212] pb-4">
            <span className="font-mono-tactical text-xs font-bold text-[#FF4500] uppercase">
              ROOM CODE: {code}
            </span>
            <h1 className="text-3xl font-display font-black text-[#121212] uppercase tracking-tight">
              {eventName || 'LIVE STANDINGS'}
            </h1>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {leaderboard.length === 0 ? (
              <p className="font-mono-tactical text-center text-gray-500 py-12 text-sm uppercase">
                NO PLAYER SCORES RECORDED YET
              </p>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={entry.player_id}
                  className={`p-3.5 border-3 border-[#121212] flex items-center justify-between shadow-hard-sm transition ${
                    index === 0
                      ? 'bg-[#FFD600] text-[#121212] font-black'
                      : index === 1
                      ? 'bg-white text-[#121212] font-bold'
                      : index === 2
                      ? 'bg-[#FF4500] text-white font-bold'
                      : 'bg-[#F4F1EA] text-[#121212]'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="w-7 h-7 flex items-center justify-center font-mono-tactical font-black text-xs border-2 border-current">
                      #{index + 1}
                    </span>
                    <span className="font-display font-black text-base uppercase truncate">
                      {entry.username}
                    </span>
                  </div>

                  <span className="font-mono-tactical font-black text-lg tracking-tight pl-2">
                    {entry.total_points} <span className="text-xs font-bold">PTS</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
