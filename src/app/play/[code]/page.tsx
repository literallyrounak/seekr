'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { Event, GameState, LeaderboardEntry } from '@/types'
import { formatTime } from '@/lib/game-logic'
import {
  Crosshair,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
  Send,
  Trophy,
  ArrowRight,
  HelpCircle,
  FileText
} from 'lucide-react'

export default function PlayView() {
  const params = useParams()
  const router = useRouter()
  const code = (params.code as string)?.toUpperCase()

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)

  // Phase-specific state
  const [answers, setAnswers] = useState<{ [key: number]: string }>({})
  const [submittedAnswers, setSubmittedAnswers] = useState(false)
  const [targetAnswers, setTargetAnswers] = useState<{ question_index: number; answer_text: string }[]>([])
  const [guess, setGuess] = useState('')
  const [guessResult, setGuessResult] = useState<{ correct: boolean; message: string } | null>(null)
  const [hasFound, setHasFound] = useState(false)
  const [showScorePopup, setShowScorePopup] = useState(false)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load player session from localStorage
  useEffect(() => {
    const storedPlayerId = localStorage.getItem(`player_${code}`)
    const storedUsername = localStorage.getItem(`username_${code}`)

    if (!storedPlayerId) {
      router.push(`/join/${code}`)
      return
    }

    setPlayerId(storedPlayerId)
    setUsername(storedUsername)
  }, [code, router])

  // Fetch full game state
  const fetchState = async () => {
    if (!playerId) return

    try {
      const res = await fetch(`/api/events/${code}/state`, {
        headers: { 'x-player-id': playerId }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to load game state')
      }

      setEvent(data.event)
      setGameState(data.event.game_state)
      setTimeRemaining(data.event.game_state?.time_remaining || null)

      // Check if player has found target
      const currentPlayer = data.event.players?.find((p: any) => p.id === playerId)
      if (currentPlayer?.found_at) {
        setHasFound(true)
      }

      // Load my answers
      if (data.my_state?.my_answers?.length > 0) {
        const answersMap: { [key: number]: string } = {}
        data.my_state.my_answers.forEach((a: any) => {
          answersMap[a.question_index] = a.answer_text
        })
        setAnswers(answersMap)
        setSubmittedAnswers(true)
      }

      // Load target answers (in discovery phase)
      if (data.my_state?.my_target_answers && data.my_state.my_target_answers.length > 0) {
        setTargetAnswers(data.my_state.my_target_answers)
      }

      // Calculate leaderboard
      const sortedLeaderboard = (data.event.players || [])
        .map((p: any) => ({
          player_id: p.id,
          username: p.username,
          total_points: p.total_points || 0
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
    if (!playerId) return

    fetchState()

    // 2-second background poll so phase transitions happen in real time across devices
    const pollInterval = setInterval(() => {
      fetchState()
    }, 2000)

    // Real-time subscriptions
    const channel = supabase
      .channel(`play:${code}:${playerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_state' },
        () => fetchState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'score_events' },
        () => fetchState()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players' },
        () => fetchState()
      )
      .subscribe()

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [code, playerId])

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev !== null && prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [timeRemaining])

  // Submit answers
  const handleSubmitAnswers = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId || !event) return

    setSubmitting(true)
    setError(null)

    const questions = (event.questions as any[]) || []
    const answersList = questions.map((_, index) => ({
      question_index: index,
      answer_text: answers[index] || ''
    }))

    // Validate all answered
    if (answersList.some(a => !a.answer_text.trim())) {
      setError('PLEASE ANSWER ALL 5 CLUES BEFORE LOCKING IN')
      setSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/events/${code}/answers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-id': playerId
        },
        body: JSON.stringify({ answers: answersList })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit answers')
      }

      setSubmittedAnswers(true)
      fetchState()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answers')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit guess
  const handleSubmitGuess = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerId || !guess.trim()) return

    setSubmitting(true)
    setGuessResult(null)

    try {
      const res = await fetch(`/api/events/${code}/guess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-player-id': playerId
        },
        body: JSON.stringify({ guessed_username: guess.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit guess')
      }

      setGuessResult({
        correct: data.correct,
        message: data.message
      })

      if (data.correct) {
        setHasFound(true)
        setShowScorePopup(true)
        // Toast notification for success
        toast.success('Target Found! +100 Points', {
          description: 'Excellent detective work, agent!'
        })
        // Fire celebration confetti!
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#CCFF00', '#FF4500', '#00F0FF', '#FFD600', '#121212']
        })
      } else {
        toast.error('Incorrect guess', {
          description: 'Keep investigating...'
        })
      }

      setGuess('')
      fetchState()
    } catch (err) {
      setGuessResult({
        correct: false,
        message: err instanceof Error ? err.message : 'Error submitting guess'
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] bg-grid-tactical flex items-center justify-center p-4">
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-8 text-center space-y-3 font-mono-tactical font-black text-base">
          <div className="animate-spin text-3xl inline-block">🎯</div>
          <p>INITIALIZING PLAYER INTERFACE...</p>
        </div>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen bg-[#F4F1EA] flex items-center justify-center p-4">
        <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-6 text-center space-y-4 max-w-sm">
          <p className="font-mono-tactical text-xs font-bold text-[#FF2E63] uppercase">{error}</p>
          <button
            onClick={() => router.push(`/join/${code}`)}
            className="w-full py-3 bg-[#CCFF00] border-3 border-[#121212] font-display font-black uppercase btn-neo"
          >
            RE-AUTHENTICATE
          </button>
        </div>
      </div>
    )
  }

  const phase = gameState?.current_phase || 'lobby'
  const questions = (event?.questions as any[]) || []
  const answeredCount = Object.values(answers).filter(a => a && a.trim()).length

  return (
    <main className="min-h-screen bg-[#F4F1EA] bg-grid-tactical flex flex-col justify-between pb-12">

      {/* Floating Tactical Top App Header */}
      <header className="bg-white border-b-4 border-[#121212] px-4 py-3 sticky top-0 z-20 shadow-hard-sm">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="w-8 h-8 bg-[#CCFF00] border-2 border-[#121212] flex items-center justify-center font-black text-sm"
            >
              🎯
            </motion.div>
            <div className="truncate">
              <span className="font-mono-tactical text-[10px] text-gray-500 font-bold block uppercase leading-none">
                PLAYER
              </span>
              <span className="font-display font-black text-base text-[#121212] uppercase truncate">
                {username}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {timeRemaining !== null && timeRemaining > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="bg-[#FF4500] text-white border-2 border-[#121212] px-2.5 py-1 font-mono-tactical text-xs font-black shadow-hard-sm flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5" />
                <span className="tabular-nums">{formatTime(timeRemaining)}</span>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
              className={`px-2.5 py-1 border-2 border-[#121212] font-mono-tactical text-xs font-black uppercase shadow-hard-sm ${
                phase === 'lobby' ? 'bg-[#FFD600] text-[#121212]' :
                phase === 'answering' ? 'bg-[#00F0FF] text-[#121212]' :
                phase === 'discovery' ? 'bg-[#CCFF00] text-[#121212]' :
                'bg-[#FF2E63] text-white'
              }`}
            >
              {phase}
            </motion.div>
          </div>
        </div>
      </header>

      {/* Main Interactive Stage */}
      <div className="flex-1 max-w-xl mx-auto w-full p-4 space-y-6">

        {/* ========================================================================= */}
        {/* PHASE 1: LOBBY (Tactical Waiting Room) */}
        {/* ========================================================================= */}
        {phase === 'lobby' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-6 text-center space-y-5 relative">
              <div className="inline-block bg-[#FFD600] border-3 border-[#121212] px-3.5 py-1 font-mono-tactical text-xs font-black uppercase shadow-hard-sm">
                WAITING FOR HOST
              </div>

              <div className="py-4 space-y-2">
                <div className="text-5xl animate-bounce">📡</div>
                <h2 className="text-3xl font-display font-black text-[#121212] uppercase tracking-tight">
                  WAITING FOR HOST
                </h2>
                <p className="font-body text-sm font-semibold text-[#121212]/80 max-w-xs mx-auto">
                  The game will start automatically once all players are ready.
                </p>
              </div>

              {/* Roster Badges */}
              <div className="border-t-3 border-dashed border-[#121212]/30 pt-4 space-y-2">
                <div className="flex items-center justify-between font-mono-tactical text-xs font-black uppercase text-[#121212]">
                  <span>PLAYERS IN LOBBY ({leaderboard.length})</span>
                  <span className="text-[#00F0FF] bg-[#121212] px-2 py-0.5">ROOM: {code}</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto p-1">
                  {leaderboard.map(p => (
                    <span
                      key={p.player_id}
                      className="bg-[#F4F1EA] border-2 border-[#121212] px-3 py-1 font-mono-tactical text-xs font-black uppercase shadow-hard-sm"
                    >
                      {p.username}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 2: INTEL ACQUISITION (5 Questions) */}
        {/* ========================================================================= */}
        {phase === 'answering' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            {/* Chunky Segmented Progress Header */}
            <div className="bg-white border-3 border-[#121212] p-3 shadow-hard-sm flex items-center justify-between font-mono-tactical text-xs font-black uppercase">
              <span>ANSWERS: {answeredCount} / 5</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(idx => (
                  <span
                    key={idx}
                    className={`w-4 h-4 border-2 border-[#121212] ${
                      answers[idx] && answers[idx].trim() ? 'bg-[#CCFF00]' : 'bg-[#EAE5D9]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-[#FF2E63] text-white p-3.5 border-3 border-[#121212] font-mono-tactical text-xs font-black uppercase shadow-hard-sm">
                ⚠️ {error}
              </div>
            )}

            {submittedAnswers ? (
              <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-8 text-center space-y-4">
                <div className="text-6xl animate-pulse">🔒</div>
                <div className="bg-[#CCFF00] border-3 border-[#121212] px-4 py-2 font-display font-black text-2xl uppercase inline-block shadow-hard">
                  INTEL LOCKED IN
                </div>
                <p className="font-body text-sm font-semibold text-[#121212]/80 max-w-sm mx-auto">
                  Your clues are encoded. Once all agents submit, you will receive your secret target dossier!
                </p>
                <div className="font-mono-tactical text-xs font-bold text-[#FF4500] uppercase pt-2 animate-pulse">
                  STANDBY FOR TARGET DERANGEMENT...
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitAnswers} className="space-y-4">
                <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-5 md:p-6 space-y-5">
                  <div className="border-b-2 border-[#121212] pb-2">
                    <span className="font-mono-tactical text-xs font-bold text-[#FF4500] uppercase">
                      STEP 1 // ANSWER QUESTIONS
                    </span>
                    <h2 className="text-2xl font-display font-black text-[#121212] uppercase">
                      ANSWER 5 QUESTIONS
                    </h2>
                    <p className="font-body text-xs font-semibold text-[#121212]/70 mt-0.5">
                      Your target will use these to find you!
                    </p>
                  </div>

                  <div className="space-y-4">
                    {questions.map((q, index) => (
                      <div key={index} className="space-y-1.5">
                        <label className="block font-mono-tactical text-xs font-black uppercase text-[#121212]">
                          Q{index + 1} // {q.text}
                        </label>
                        <input
                          type="text"
                          value={answers[index] || ''}
                          onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })}
                          placeholder="Your answer..."
                          maxLength={80}
                          className="w-full h-13 px-3.5 bg-[#F4F1EA] border-3 border-[#121212] font-mono-tactical text-sm font-bold uppercase focus:outline-none focus:bg-white focus:shadow-hard-sm transition"
                          required
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-16 bg-[#CCFF00] hover:bg-[#d4ff1a] disabled:opacity-50 text-[#121212] font-display font-black text-xl uppercase border-4 border-[#121212] shadow-hard btn-neo flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <Send className="w-6 h-6" />
                    {submitting ? 'SUBMITTING...' : 'SUBMIT ANSWERS'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 3: DISCOVERY (The Core Dossier Hook) */}
        {/* ========================================================================= */}
        {phase === 'discovery' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            {/* Target Clues Card */}
            <div className="bg-[#EAE5D9] border-4 border-[#121212] shadow-hard-xl relative overflow-hidden">

              {/* Header Tab */}
              <div className="bg-[#D9D3C3] border-b-4 border-[#121212] px-4 py-2 flex items-center justify-between">
                <span className="font-mono-tactical text-xs font-black uppercase text-[#121212] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#FF4500]" />
                  YOUR TARGET'S ANSWERS
                </span>
                <span className="bg-[#FF2E63] text-white font-mono-tactical text-[10px] font-black px-2 py-0.5 uppercase border border-black stamp-badge">
                  SECRET
                </span>
              </div>

              <div className="p-5 md:p-6 space-y-4">

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-[#121212] pb-3">
                  <div>
                    <span className="font-mono-tactical text-[11px] font-bold text-[#FF4500] uppercase">
                      FIND THIS PERSON
                    </span>
                    <h2 className="text-2xl font-display font-black text-[#121212] uppercase">
                      WHO GAVE THESE ANSWERS?
                    </h2>
                  </div>
                  <div className="bg-[#FFD600] border-2 border-[#121212] px-2.5 py-1 font-mono-tactical text-xs font-black text-center shadow-hard-sm self-start">
                    IDENTITY UNKNOWN
                  </div>
                </div>

                <p className="font-body text-xs font-bold text-[#121212]/80">
                  Talk to people and find who gave these 5 answers:
                </p>

                {/* 5 Clue Cards */}
                <div className="space-y-2.5">
                  {targetAnswers.length === 0 ? (
                    <div className="text-center py-6 font-mono-tactical text-xs font-bold text-gray-500">
                      Loading target answers...
                    </div>
                  ) : (
                    targetAnswers.map((item, index) => (
                      <div
                        key={index}
                        className="bg-white border-3 border-[#121212] shadow-hard-sm p-3.5 relative"
                      >
                        <span className="font-mono-tactical text-[11px] font-black text-[#FF4500] uppercase block">
                          Q{index + 1} // {questions[item.question_index]?.text || `Question ${index + 1}`}
                        </span>
                        <p className="font-mono-tactical text-base font-black text-[#121212] mt-1 uppercase tracking-wide">
                          "{item.answer_text}"
                        </p>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </div>

            {/* Guess Submission Action Box */}
            <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-5 md:p-6 space-y-4">

              <div className="flex items-center justify-between border-b-2 border-[#121212] pb-2">
                <h3 className="font-display font-black text-lg text-[#121212] uppercase flex items-center gap-2">
                  <Crosshair className="w-5 h-5 text-[#FF4500]" />
                  FOUND YOUR PERSON?
                </h3>
                <span className="font-mono-tactical text-xs font-bold text-[#CCFF00] bg-[#121212] px-2 py-0.5">
                  +100 PTS
                </span>
              </div>

              {hasFound ? (
                <div className="bg-[#CCFF00] border-4 border-[#121212] shadow-hard p-5 text-center space-y-2">
                  <div className="text-4xl animate-bounce">🎉</div>
                  <h4 className="text-2xl font-display font-black text-[#121212] uppercase">
                    FOUND!
                  </h4>
                  <p className="font-mono-tactical text-xs font-bold text-[#121212]">
                    +100 POINTS // YOU FOUND YOUR PERSON!
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitGuess} className="space-y-3">
                  <div className="space-y-1">
                    <label className="block font-mono-tactical text-xs font-bold uppercase text-[#121212]">
                      ENTER THEIR NAME / HANDLE
                    </label>
                    <input
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      placeholder="E.G. RAHUL, SARAH, ALEX"
                      className="w-full h-14 px-4 bg-[#F4F1EA] border-3 border-[#121212] font-mono-tactical text-lg font-black uppercase text-center focus:outline-none focus:bg-white focus:shadow-hard-sm transition"
                      required
                    />
                  </div>

                  {guessResult && (
                    <div className={`p-3.5 border-3 border-[#121212] font-mono-tactical text-xs font-black uppercase shadow-hard-sm text-center ${
                      guessResult.correct
                        ? 'bg-[#CCFF00] text-[#121212]'
                        : 'bg-[#FF2E63] text-white'
                    }`}>
                      {guessResult.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-15 bg-[#FF4500] hover:bg-[#ff571a] disabled:opacity-50 text-white font-display font-black text-xl uppercase border-4 border-[#121212] shadow-hard btn-neo flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Crosshair className="w-5 h-5" />
                    {submitting ? 'CHECKING...' : 'SUBMIT GUESS'}
                  </button>
                </form>
              )}

            </div>

            {/* Quick Leaderboard Glance */}
            <div className="bg-white border-3 border-[#121212] shadow-hard-sm p-4 space-y-3">
              <div className="flex items-center justify-between font-mono-tactical text-xs font-black uppercase text-[#121212]">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-[#FFD600]" /> LIVE SCOREBOARD
                </span>
                <Link href={`/leaderboard/${code}`} className="underline text-indigo-600">
                  FULL VIEW →
                </Link>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {leaderboard.slice(0, 5).map((entry, idx) => (
                  <div key={entry.player_id} className="flex items-center justify-between font-mono-tactical text-xs py-1 border-b border-gray-100">
                    <span className="font-bold uppercase truncate">
                      #{idx + 1} {entry.username}
                    </span>
                    <span className="font-black text-[#FF4500]">
                      {entry.total_points} PTS
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 4: ENDED (Arcade Debriefing & Podium) */}
        {/* ========================================================================= */}
        {phase === 'ended' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white border-4 border-[#121212] shadow-hard-xl p-6 md:p-8 text-center space-y-6">
              <div className="text-5xl">🏆</div>
              <div>
                <h2 className="text-4xl font-display font-black text-[#121212] uppercase tracking-tight">
                  GAME OVER
                </h2>
                <p className="font-mono-tactical text-xs font-bold text-gray-500 uppercase mt-1">
                  FINAL SCORES // ROOM {code}
                </p>
              </div>

              {/* Podium List */}
              <div className="space-y-2.5">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.player_id}
                    className={`p-3.5 border-3 border-[#121212] flex items-center justify-between shadow-hard-sm ${
                      index === 0
                        ? 'bg-[#FFD600] text-[#121212] scale-[1.02]'
                        : index === 1
                        ? 'bg-white text-[#121212]'
                        : index === 2
                        ? 'bg-[#FF4500] text-white'
                        : 'bg-[#F4F1EA] text-[#121212]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono-tactical font-black text-sm w-6">
                        #{index + 1}
                      </span>
                      <span className="font-display font-black text-lg uppercase truncate">
                        {entry.username}
                      </span>
                    </div>

                    <span className="font-mono-tactical font-black text-lg">
                      {entry.total_points} PTS
                    </span>
                  </div>
                ))}
              </div>

              <Link
                href="/"
                className="w-full h-14 bg-[#CCFF00] border-3 border-[#121212] font-display font-black text-lg uppercase shadow-hard btn-neo flex items-center justify-center gap-2"
              >
                PLAY AGAIN
              </Link>
            </div>
          </motion.div>
        )}

      </div>

      {/* Floating Confetti +100 PTS Score Banner */}
      <AnimatePresence>
        {showScorePopup && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
          >
            <div className="bg-[#CCFF00] border-5 border-[#121212] shadow-hard-xl p-8 text-center space-y-3 pointer-events-auto transform -rotate-2">
              <div className="text-5xl">🎯</div>
              <h2 className="text-4xl font-display font-black text-[#121212] uppercase">
                FOUND!
              </h2>
              <p className="font-mono-tactical text-3xl font-black text-[#FF4500]">
                +100 POINTS!
              </p>
              <button
                onClick={() => setShowScorePopup(false)}
                className="mt-4 px-6 py-2.5 bg-[#121212] text-white font-mono-tactical font-black text-sm uppercase border-2 border-white btn-neo cursor-pointer"
              >
                CONTINUE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  )
}
