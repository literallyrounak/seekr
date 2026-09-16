'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Event, Player, GameState, LeaderboardEntry } from '@/types'
import { formatTime } from '@/lib/game-logic'
import {
  Crosshair,
  Users,
  Trophy,
  Play,
  ArrowRight,
  Clock,
  CheckCircle2,
  Sparkles,
  Copy,
  Check,
  Zap,
  Radio
} from 'lucide-react'

export default function HostDashboard() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string)?.toUpperCase()

  const [event, setEvent] = useState<any>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [answersCount, setAnswersCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch initial data
  const fetchData = async () => {
    try {
      const res = await fetch(`/api/events/${code}/state`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to load event')
      }

      setEvent(data.event)
      setPlayers(data.event.players || [])
      setGameState(data.event.game_state)
      setTimeRemaining(data.event.game_state?.time_remaining || null)
      setAnswersCount(data.event.answers_submitted_count || 0)

      // Calculate leaderboard
      const scores = new Map<string, number>()
      data.event.players?.forEach((p: any) => {
        scores.set(p.id, p.total_points || 0)
      })

      const sortedLeaderboard = (data.event.players || [])
        .map((p: any) => ({
          player_id: p.id,
          username: p.username,
          total_points: scores.get(p.id) || 0
        }))
        .sort((a: any, b: any) => b.total_points - a.total_points)

      setLeaderboard(sortedLeaderboard)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // 2-second polling to ensure instant UI transitions across all clients
    const pollInterval = setInterval(() => {
      fetchData()
    }, 2000)

    // Real-time subscriptions
    const channel = supabase
      .channel(`host:${code}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_events' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'answers' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [code])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  const handleStartGame = async () => {
    setActionLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/events/${code}/start`, {
        method: 'POST'
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to start game')
      }

      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    } finally {
      setActionLoading(false)
    }
  }

  const handleTransition = async (targetPhase: 'discovery' | 'ended') => {
    setActionLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/events/${code}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_phase: targetPhase })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || `Failed to transition to ${targetPhase}`)
      }

      fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transition failed')
    } finally {
      setActionLoading(false)
    }
  }

  const copyJoinLink = () => {
    const url = `${window.location.origin}/join/${code}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Join link copied!', {
      description: 'Share this with your players'
    })
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1115] bg-blueprint flex items-center justify-center p-4">
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-8 text-center space-y-3 font-mono-tactical font-black text-lg">
          <div className="animate-spin text-3xl inline-block">⚡</div>
          <p>INITIALIZING COMMAND CENTER...</p>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center p-4">
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-8 text-center space-y-4 max-w-md">
          <p className="font-mono-tactical text-sm font-bold text-[#FF2E63] uppercase">{error || 'ROOM NOT FOUND'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#CCFF00] border-3 border-[#121212] font-display font-black uppercase btn-neo"
          >
            RETURN HOME
          </button>
        </div>
      </div>
    )
  }

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${code}`
  const phase = gameState?.current_phase || 'lobby'
  const foundCount = players.filter(p => p.found_at).length

  return (
    <main className="min-h-screen bg-[#0F1115] bg-blueprint text-[#F4F1EA] p-4 md:p-8 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full space-y-6">

        {/* Top Control Bar */}
        <div className="bg-[#181A20] border-4 border-white shadow-hard-white p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#CCFF00] border-3 border-white flex items-center justify-center text-[#121212] font-black text-2xl shadow-hard-sm">
              🎯
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono-tactical text-xs text-[#CCFF00] font-black uppercase flex items-center gap-1">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-[#CCFF00]" /> HOST DASHBOARD • LIVE
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-black text-white uppercase tracking-tight">
                {event?.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Phase Badge */}
            <div className={`px-4 py-2 border-3 border-white font-mono-tactical text-xs font-black uppercase shadow-hard-sm ${
              phase === 'lobby' ? 'bg-[#FFD600] text-[#121212]' :
              phase === 'answering' ? 'bg-[#00F0FF] text-[#121212]' :
              phase === 'discovery' ? 'bg-[#CCFF00] text-[#121212]' :
              'bg-[#FF2E63] text-white'
            }`}>
              PHASE: {phase}
            </div>

            {/* Timer Badge */}
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="bg-[#FF4500] text-white border-3 border-white px-4 py-2 font-mono-tactical text-base font-black shadow-hard-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formatTime(timeRemaining)}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-[#FF2E63] text-white border-3 border-white p-4 font-mono-tactical text-xs font-black uppercase shadow-hard">
            ⚠️ {error}
          </div>
        )}

        {/* 3-Column Command Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* COLUMN 1 (5 cols): QR Scanner Frame & Master Operation Buttons */}
          <div className="lg:col-span-5 space-y-6">

            {/* QR Card */}
            <div className="bg-[#181A20] border-4 border-white shadow-hard-white p-6 space-y-5 text-center relative">

              {/* Bracket Corners */}
              <div className="absolute top-2 left-2 font-mono-tactical text-xs font-bold text-[#CCFF00] select-none">┌──</div>
              <div className="absolute top-2 right-2 font-mono-tactical text-xs font-bold text-[#CCFF00] select-none">──┐</div>
              <div className="absolute bottom-2 left-2 font-mono-tactical text-xs font-bold text-[#CCFF00] select-none">└──</div>
              <div className="absolute bottom-2 right-2 font-mono-tactical text-xs font-bold text-[#CCFF00] select-none">──┘</div>

              <div className="space-y-1 pt-2">
                <span className="font-mono-tactical text-xs font-black uppercase text-[#CCFF00] tracking-wider">
                  SCAN TO JOIN
                </span>
                <p className="font-display font-black text-2xl text-white uppercase">
                  JOIN GAME
                </p>
              </div>

              {/* QR Code Container with High Contrast */}
              <div className="flex justify-center">
                <div className="p-4 bg-white border-4 border-[#121212] shadow-hard-lime inline-block">
                  <QRCodeSVG value={joinUrl} size={220} />
                </div>
              </div>

              {/* Oversized Code Box */}
              <div className="space-y-2">
                <span className="font-mono-tactical text-xs font-bold text-gray-400 uppercase">
                  OR ENTER CODE
                </span>
                <div className="bg-[#121212] border-3 border-white p-3 flex items-center justify-between shadow-hard-sm">
                  <span className="font-mono-tactical text-3xl font-black text-[#CCFF00] tracking-widest pl-2">
                    {code}
                  </span>
                  <button
                    onClick={copyJoinLink}
                    className="px-3 py-1.5 bg-white hover:bg-[#CCFF00] text-[#121212] font-mono-tactical text-xs font-black uppercase border-2 border-black flex items-center gap-1.5 cursor-pointer transition"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'COPIED' : 'LINK'}
                  </button>
                </div>
              </div>

              {/* Interactive Host Phase Triggers */}
              <div className="pt-2">
                {phase === 'lobby' && (
                  <button
                    onClick={handleStartGame}
                    disabled={actionLoading || players.length < 2}
                    className="w-full h-16 bg-[#CCFF00] hover:bg-[#d4ff1a] disabled:opacity-40 text-[#121212] font-display font-black text-xl uppercase border-4 border-white shadow-hard-lime btn-neo flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-6 h-6 fill-[#121212]" />
                    {actionLoading ? 'STARTING...' : `START GAME (${players.length} PLAYERS)`}
                  </button>
                )}

                {phase === 'answering' && (
                  <div className="space-y-3">
                    <div className="bg-[#121212] border-2 border-[#00F0FF] p-3 text-center">
                      <span className="font-mono-tactical text-xs font-bold text-[#00F0FF] uppercase">
                        ANSWER PROGRESS
                      </span>
                      <p className="font-mono-tactical text-3xl font-black text-white mt-1">
                        {answersCount} / {players.length} SUBMITTED
                      </p>
                    </div>

                    <button
                      onClick={() => handleTransition('discovery')}
                      disabled={actionLoading || players.length < 2}
                      className="w-full h-16 bg-[#00F0FF] hover:bg-[#1ae8ff] disabled:opacity-40 text-[#121212] font-display font-black text-lg uppercase border-4 border-white shadow-hard-cyan btn-neo flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Zap className="w-6 h-6 fill-[#121212]" />
                      {actionLoading ? 'ASSIGNING TARGETS...' : 'START FINDING PHASE'}
                    </button>
                  </div>
                )}

                {phase === 'discovery' && (
                  <div className="space-y-3">
                    <div className="bg-[#121212] border-2 border-[#CCFF00] p-3 text-center">
                      <span className="font-mono-tactical text-xs font-bold text-[#CCFF00] uppercase">
                        TARGETS IDENTIFIED
                      </span>
                      <p className="font-mono-tactical text-3xl font-black text-white mt-1">
                        {foundCount} / {players.length} FOUND
                      </p>
                    </div>

                    <button
                      onClick={() => handleTransition('ended')}
                      disabled={actionLoading}
                      className="w-full h-16 bg-[#FF2E63] hover:bg-[#ff4575] disabled:opacity-40 text-white font-display font-black text-lg uppercase border-4 border-white shadow-hard-orange btn-neo flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Trophy className="w-6 h-6" />
                      {actionLoading ? 'ENDING...' : 'END GAME & SHOW RESULTS'}
                    </button>
                  </div>
                )}

                {phase === 'ended' && (
                  <div className="bg-[#CCFF00] text-[#121212] border-3 border-white p-4 font-mono-tactical text-sm font-black uppercase shadow-hard-sm">
                    🏁 GAME OVER • FINAL SCORES
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 2 (3 cols): Player Roster */}
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-[#181A20] border-4 border-white shadow-hard-white p-5 space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between border-b-2 border-white/20 pb-3">
                <span className="font-mono-tactical text-xs font-black uppercase text-[#CCFF00] flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> PLAYERS ({players.length}/{event?.max_players || 40})
                </span>
                <span className="font-mono-tactical text-[10px] bg-white text-[#121212] px-2 py-0.5 font-black uppercase">
                  ROSTER
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto max-h-[520px] flex-1 pr-1">
                {players.length === 0 ? (
                  <div className="text-center py-12 font-mono-tactical text-xs text-gray-500 space-y-2">
                    <p>WAITING FOR PLAYERS...</p>
                  </div>
                ) : (
                  players.map((p, i) => (
                    <div
                      key={p.id}
                      className="bg-[#121212] border-2 border-white p-2.5 flex items-center justify-between shadow-hard-sm"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="font-mono-tactical text-xs text-gray-500 font-bold">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono-tactical text-sm font-black text-white truncate uppercase">
                          {p.username}
                        </span>
                      </div>

                      {p.found_at ? (
                        <span className="bg-[#CCFF00] text-[#121212] font-mono-tactical text-[10px] font-black px-2 py-0.5 uppercase border border-black">
                          FOUND!
                        </span>
                      ) : phase === 'discovery' ? (
                        <span className="bg-[#181A20] text-gray-400 font-mono-tactical text-[10px] font-bold px-2 py-0.5 uppercase border border-gray-700">
                          SEARCHING
                        </span>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#CCFF00] animate-pulse" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* COLUMN 3 (4 cols): Arcade Leaderboard */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#181A20] border-4 border-white shadow-hard-white p-5 space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between border-b-2 border-white/20 pb-3">
                <span className="font-mono-tactical text-xs font-black uppercase text-[#FFD600] flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" /> LIVE STANDINGS
                </span>
                <span className="font-mono-tactical text-[10px] bg-[#FFD600] text-[#121212] px-2 py-0.5 font-black uppercase">
                  SCOREBOARD
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[520px] flex-1 pr-1">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12 font-mono-tactical text-xs text-gray-500">
                    SCORES WILL POPULATE DURING DISCOVERY PHASE
                  </div>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div
                      key={entry.player_id}
                      className={`p-3 border-3 border-white flex items-center justify-between shadow-hard-sm transition ${
                        idx === 0
                          ? 'bg-[#FFD600] text-[#121212]'
                          : idx === 1
                          ? 'bg-white text-[#121212]'
                          : idx === 2
                          ? 'bg-[#FF4500] text-white'
                          : 'bg-[#121212] text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 flex items-center justify-center font-mono-tactical font-black text-xs border-2 border-current ${
                          idx === 0 ? 'bg-[#121212] text-[#FFD600]' : ''
                        }`}>
                          #{idx + 1}
                        </span>
                        <span className="font-display font-black text-base uppercase truncate">
                          {entry.username}
                        </span>
                      </div>

                      <span className="font-mono-tactical font-black text-lg tracking-tight">
                        {entry.total_points} <span className="text-xs">PTS</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto w-full pt-4 flex flex-col sm:flex-row items-center justify-between font-mono-tactical text-xs text-gray-400 gap-2 border-t border-white/20">
        <span>JOIN URL: <span className="text-white">{joinUrl}</span></span>
        <span>Seekr</span>
      </div>
    </main>
  )
}
