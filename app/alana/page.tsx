'use client'

import { useState, useEffect, useRef } from 'react'

type Drill = {
  id: string
  label: string
  instruction: string
  emoji: string
  duration: number // seconds
  hasMakes: boolean
  makesLabel?: string
}

type Section = {
  title: string
  color: string
  bg: string
  drills: Drill[]
}

type Workout = {
  id: string
  label: string
  emoji: string
  tagline: string
  sections: Section[]
}

// ─── WORKOUT 1: Layups & Dribbling ───────────────────────────────────────────
const WORKOUT_LAYUPS: Workout = {
  id: 'layups',
  label: 'Layups & Dribbling',
  emoji: '🏃‍♀️',
  tagline: 'Ball handling · Drives · Finishing at the rim',
  sections: [
    {
      title: '🔥 Warmup',
      color: 'text-yellow-400',
      bg: 'border-yellow-800',
      drills: [
        {
          id: 'ld_stationary_dribble',
          label: 'Stationary Dribble Series',
          instruction: 'Stay in one spot. Do 30 sec each: right hand low, left hand low, alternating hands. Keep your eyes up, not on the ball. Pound it hard.',
          emoji: '⬇️',
          duration: 90,
          hasMakes: false,
        },
        {
          id: 'ld_figure8',
          label: 'Figure 8 Dribble',
          instruction: 'Feet shoulder-width apart, knees bent. Weave the ball through your legs in a figure 8 pattern. Go as fast as you can without losing control.',
          emoji: '8️⃣',
          duration: 60,
          hasMakes: false,
        },
      ],
    },
    {
      title: '🎯 Ball Handling',
      color: 'text-amber-400',
      bg: 'border-amber-800',
      drills: [
        {
          id: 'ld_two_ball',
          label: 'Two-Ball Stationary Dribble',
          instruction: 'Dribble two balls at the same time — both together, then alternating. Stay in one spot. Eyes up. This will feel weird at first, push through it.',
          emoji: '🏀',
          duration: 60,
          hasMakes: false,
        },
        {
          id: 'ld_crossover',
          label: 'Crossover Attack Dribble',
          instruction: 'From the top of your slab, attack hard right with 2 dribbles, hard crossover, attack left. Hit the paint each time. Explode — don\'t jog.',
          emoji: '↔️',
          duration: 90,
          hasMakes: false,
        },
        {
          id: 'ld_hesitation',
          label: 'Hesitation Dribble',
          instruction: 'Dribble toward a spot on the ground (a crack, a line, anything). Slow down, pump fake with your shoulder (hesitation), then EXPLODE past it. 5 times each direction.',
          emoji: '⏸️',
          duration: 90,
          hasMakes: false,
        },
        {
          id: 'ld_behind_back',
          label: 'Behind the Back Dribble',
          instruction: 'Walk the length of the court doing behind-the-back dribbles. Switch hands smoothly each step. When comfortable, pick up the pace.',
          emoji: '🔄',
          duration: 60,
          hasMakes: false,
        },
      ],
    },
    {
      title: '🏀 Layups',
      color: 'text-gold-400',
      bg: 'border-yellow-700',
      drills: [
        {
          id: 'ld_right_layup',
          label: 'Right Hand Layups',
          instruction: 'Start at the right elbow. Drive to the basket, finish with your right hand off the backboard. Focus on the correct footwork: left foot plants, right knee up, right hand finishes.',
          emoji: '✅',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
        {
          id: 'ld_left_layup',
          label: 'Left Hand Layups',
          instruction: 'Start at the left elbow. Drive to the basket, finish with your LEFT hand. This is your weak side — slow it down and get the footwork right before going fast.',
          emoji: '🤚',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
        {
          id: 'ld_speed_layup',
          label: 'Speed Layups (Full Speed)',
          instruction: 'From as far back as your slab allows, go FULL SPEED, attack the basket, finish the layup. Alternate sides — right hand, then left hand. Push yourself.',
          emoji: '⚡',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
        {
          id: 'ld_euro_step',
          label: 'Euro Step Layups',
          instruction: 'Drive hard to the lane. Take a big step to one side, then step the opposite direction to finish. Throws defenders off balance. Try 5 each direction.',
          emoji: '🪄',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
        {
          id: 'ld_mikan',
          label: 'Mikan Drill',
          instruction: 'Stand just left of the basket. Alternate left-hand and right-hand layups without letting the ball touch the ground — catch, step, finish, catch, step, finish. Continuous.',
          emoji: '🔁',
          duration: 90,
          hasMakes: true,
          makesLabel: 'Makes',
        },
      ],
    },
    {
      title: '📝 Notes',
      color: 'text-gray-400',
      bg: 'border-gray-700',
      drills: [],
    },
  ],
}

// ─── WORKOUT 2: Full Mixture ──────────────────────────────────────────────────
const WORKOUT_MIX: Workout = {
  id: 'mix',
  label: 'Full Workout Mix',
  emoji: '⭐',
  tagline: 'Dribbling · Mid-range · Free throws · Defense',
  sections: [
    {
      title: '🔥 Warmup',
      color: 'text-yellow-400',
      bg: 'border-yellow-800',
      drills: [
        {
          id: 'mix_warmup_dribble',
          label: 'Two-Ball Dribble',
          instruction: 'Dribble both balls simultaneously — same time, then alternating. Keep eyes up. This will feel weird at first. Push through it.',
          emoji: '🏀',
          duration: 60,
          hasMakes: false,
        },
      ],
    },
    {
      title: '🎯 Dribble & Drive',
      color: 'text-amber-400',
      bg: 'border-amber-800',
      drills: [
        {
          id: 'mix_pullback',
          label: 'Pull-Back Crossover',
          instruction: 'Attack hard in one direction, pull the ball back, hard crossover, attack the other way. 5 reps each direction. The pullback freezes defenders — master it.',
          emoji: '↩️',
          duration: 90,
          hasMakes: false,
        },
        {
          id: 'mix_drive_finish',
          label: 'Drive & Finish Series',
          instruction: 'From the wing: 3 hard dribbles, attack the basket, finish strong. Alternate sides. Mix up your finish: right hand, left hand, reverse.',
          emoji: '🏃‍♀️',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
      ],
    },
    {
      title: '🏀 Mid-Range Game',
      color: 'text-yellow-500',
      bg: 'border-yellow-700',
      drills: [
        {
          id: 'mix_elbow_jumper',
          label: 'Elbow Jumpers',
          instruction: 'Catch at the right elbow, set your feet, shoot. Then left elbow. Focus on footwork — catch in your shooting pocket every time. Alternate sides.',
          emoji: '📐',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
        {
          id: 'mix_pull_up',
          label: 'Off-Dribble Pull-Up',
          instruction: '2 hard dribbles from the wing, pull up for a mid-range jumper. Hold your follow-through. 5 from the right, 5 from the left.',
          emoji: '↗️',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
      ],
    },
    {
      title: '🎯 Free Throws',
      color: 'text-green-400',
      bg: 'border-green-800',
      drills: [
        {
          id: 'mix_ft',
          label: 'Free Throws — Same Routine Every Time',
          instruction: 'Pick a routine: 2 bounces, deep breath, bend and shoot. Do it EXACTLY the same every time. Muscle memory is the whole point. Log every make.',
          emoji: '🏀',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes out of 20',
        },
      ],
    },
    {
      title: '🎯 More Free Throws',
      color: 'text-green-400',
      bg: 'border-green-800',
      drills: [
        {
          id: 'mix_ft2',
          label: 'Free Throw Streak Challenge',
          instruction: 'Try to hit 3 in a row. Every time you miss, start your streak over. Keep going until you hit 3 straight. Same routine every shot.',
          emoji: '🏀',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Total makes',
        },
      ],
    },
  ],
}

// ─── WORKOUT 3: Long Range & Free Throws ─────────────────────────────────────
const WORKOUT_RANGE: Workout = {
  id: 'range',
  label: 'Long Range & Free Throws',
  emoji: '🎯',
  tagline: 'Three-pointers · Free throws · Shooting off screens',
  sections: [
    {
      title: '🔥 Warmup',
      color: 'text-yellow-400',
      bg: 'border-yellow-800',
      drills: [
        {
          id: 'r_form_shot',
          label: 'Close Range Form Shooting',
          instruction: '5 feet from the basket. One hand on the ball, shooting hand only. Perfect arc, perfect follow-through. Make sure your form is locked in before going deep.',
          emoji: '✋',
          duration: 90,
          hasMakes: true,
          makesLabel: 'Makes',
        },
      ],
    },
    {
      title: '🎯 Free Throw Work',
      color: 'text-green-400',
      bg: 'border-green-800',
      drills: [
        {
          id: 'r_ft_routine',
          label: 'Free Throw Routine Block',
          instruction: 'Shoot 5 in a row, step away, reset, repeat. Same routine every single time. If you miss 2 in a row, stop and reset your form before continuing.',
          emoji: '🏀',
          duration: 150,
          hasMakes: true,
          makesLabel: 'Makes out of 25',
        },
      ],
    },
    {
      title: '🔥 Three-Point Shooting',
      color: 'text-yellow-500',
      bg: 'border-yellow-700',
      drills: [
        {
          id: 'r_spot_3s',
          label: 'Spot 3s — 5 Spots',
          instruction: 'Your court stops at the wings/slot area, so use 3 spots: left slot, top of key, right slot. 7 shots each = 21 total. Set your feet before every shot. Track your makes per spot.',
          emoji: '📍',
          duration: 180,
          hasMakes: true,
          makesLabel: 'Total makes out of 21',
        },
        {
          id: 'r_catch_shoot',
          label: 'Catch & Shoot 3s',
          instruction: 'Toss the ball out toward the slot or top of key, sprint to it, catch in your shooting pocket, shoot immediately. Your court is smaller so use the space you have — slot and top of key are your spots.',
          emoji: '🤸‍♀️',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
        {
          id: 'r_step_back',
          label: 'Step-Back 3s',
          instruction: 'Drive one dribble toward the basket from the slot, hard step back to your shooting spot, shoot. 5 from the right slot, 5 from the left slot. Create your own shot.',
          emoji: '⬅️',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes out of 10',
        },
        {
          id: 'r_transition_3',
          label: 'Transition 3s',
          instruction: 'Start under the basket. Sprint out to the slot or top of key, stop, toss the ball ahead and catch it, set your feet, shoot. Builds your shot under game-speed conditions on your court.',
          emoji: '⚡',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
      ],
    },
    {
      title: '🔁 Off-Screen Shooting',
      color: 'text-amber-400',
      bg: 'border-amber-800',
      drills: [
        {
          id: 'r_curl_cut',
          label: 'Curl Cut Shooter',
          instruction: 'Set up a cone as a "screen." Come off the screen curling toward the basket, catch and shoot mid-range or 3. Focus on catching in your pocket — footwork first.',
          emoji: '🌀',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
        {
          id: 'r_flare',
          label: 'Flare Cut 3s',
          instruction: 'Come off the screen flaring out toward the 3-point corner. Catch, set feet, shoot the corner 3. This is a real NBA-level move — learn it now.',
          emoji: '💫',
          duration: 120,
          hasMakes: true,
          makesLabel: 'Makes',
        },
      ],
    },
  ],
}

const WORKOUTS: Record<string, Workout> = {
  layups: WORKOUT_LAYUPS,
  mix: WORKOUT_MIX,
  range: WORKOUT_RANGE,
}
const WORKOUT_ORDER = ['layups', 'mix', 'range']

// ─── Timer Component ──────────────────────────────────────────────────────────
function DrillTimer({ duration, drillId, active, onComplete }: {
  duration: number
  drillId: string
  active: boolean
  onComplete: () => void
}) {
  const [timeLeft, setTimeLeft] = useState(duration)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setTimeLeft(duration)
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [drillId, duration])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current!)
            setRunning(false)
            onComplete()
            return 0
          }
          return t - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const pct = Math.round(((duration - timeLeft) / duration) * 100)
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl font-black text-yellow-400 tabular-nums">
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
        <div className="flex-1 bg-gray-800 rounded-full h-2">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setRunning(r => !r)}
          className={`flex-1 py-2 rounded-xl font-black text-sm transition-all active:scale-95 ${
            running
              ? 'bg-red-600 text-white'
              : timeLeft === 0
              ? 'bg-gray-700 text-gray-500'
              : 'bg-yellow-400 text-black'
          }`}
        >
          {running ? '⏸ Pause' : timeLeft === 0 ? '✓ Done' : timeLeft === duration ? '▶ Start Timer' : '▶ Resume'}
        </button>
        <button
          type="button"
          onClick={() => { setTimeLeft(duration); setRunning(false) }}
          className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 font-black text-sm active:scale-95"
        >
          ↺
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AlanaPage() {
  const [selectedWorkout, setSelectedWorkout] = useState<string>('layups')
  const [makes, setMakes] = useState<Record<string, string>>({})
  const [completedDrills, setCompletedDrills] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const workout = WORKOUTS[selectedWorkout]

  function handleWorkoutChange(id: string) {
    setSelectedWorkout(id)
    setMakes({})
    setCompletedDrills({})
    setNotes('')
    setSubmitted(false)
    setError('')
  }

  function markDone(drillId: string) {
    setCompletedDrills(prev => ({ ...prev, [drillId]: true }))
  }

  function updateMakes(drillId: string, val: string) {
    setMakes(prev => ({ ...prev, [drillId]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/alana/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workout: selectedWorkout,
          workoutLabel: workout.label,
          makes,
          completedDrills,
          notes,
          date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">🏀</div>
        <h1 className="text-3xl font-black text-yellow-400 mb-2">Sent to Dad!</h1>
        <p className="text-gray-400 mb-8">Great work, Alana. Keep putting in the reps.</p>
        <button
          onClick={() => { setSubmitted(false); setMakes({}); setCompletedDrills({}); setNotes('') }}
          className="bg-yellow-400 text-black font-black py-4 px-8 rounded-2xl active:scale-95"
        >
          Do Another Workout
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-12">
      {/* Header */}
      <div className="bg-black border-b border-yellow-900 px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-black text-yellow-400 mb-1">🏀 Alana's Workout</h1>
          <p className="text-gray-500 text-sm mb-4">Andale Indians · Pick your session</p>
          <div className="grid grid-cols-3 gap-2">
            {WORKOUT_ORDER.map(id => {
              const w = WORKOUTS[id]
              const isActive = selectedWorkout === id
              return (
                <button
                  key={id}
                  onClick={() => handleWorkoutChange(id)}
                  className={`rounded-xl py-3 px-2 flex flex-col items-center gap-1 transition-all border ${
                    isActive
                      ? 'bg-yellow-400 border-yellow-300 text-black'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-yellow-800'
                  }`}
                >
                  <span className="text-lg">{w.emoji}</span>
                  <span className="text-xs font-black text-center leading-tight">{w.label}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 bg-gray-950 border border-yellow-900 rounded-xl px-4 py-3">
            <p className="text-white font-black">{workout.emoji} {workout.label}</p>
            <p className="text-gray-500 text-sm">{workout.tagline}</p>
          </div>
        </div>
      </div>

      {/* Drills */}
      <form onSubmit={handleSubmit} className="px-4 pt-6 max-w-lg mx-auto">
        {workout.sections.map(section => {
          if (section.drills.length === 0) return null
          return (
            <div key={section.title} className="mb-8">
              <h2 className={`text-lg font-black mb-3 ${section.color}`}>{section.title}</h2>
              <div className="space-y-4">
                {section.drills.map(drill => {
                  const isDone = completedDrills[drill.id]
                  return (
                    <div
                      key={drill.id}
                      className={`rounded-2xl border p-4 transition-all ${
                        isDone
                          ? 'bg-gray-900 border-gray-700 opacity-70'
                          : `bg-gray-950 ${section.bg}`
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl mt-0.5">{drill.emoji}</span>
                        <div className="flex-1">
                          <p className={`font-bold text-base ${isDone ? 'line-through text-gray-500' : 'text-white'}`}>
                            {drill.label}
                          </p>
                          {!isDone && (
                            <p className="text-gray-400 text-sm mt-1 leading-relaxed">{drill.instruction}</p>
                          )}
                        </div>
                      </div>

                      {!isDone && (
                        <>
                          <DrillTimer
                            duration={drill.duration}
                            drillId={drill.id}
                            active={!isDone}
                            onComplete={() => {}}
                          />
                          {drill.hasMakes && (
                            <div className="mt-3">
                              <label className="text-yellow-400 text-sm font-black mb-1 block">
                                {drill.makesLabel || 'Makes'}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={makes[drill.id] || ''}
                                onChange={e => updateMakes(drill.id, e.target.value)}
                                placeholder="Enter your makes"
                                className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-yellow-400 focus:outline-none text-lg font-black tabular-nums"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => markDone(drill.id)}
                            className="mt-3 w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 bg-yellow-400 text-black"
                          >
                            Mark Done ✓
                          </button>
                        </>
                      )}

                      {isDone && drill.hasMakes && makes[drill.id] && (
                        <p className="mt-2 text-yellow-400 font-black text-sm">
                          {drill.makesLabel || 'Makes'}: {makes[drill.id]}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Notes */}
        <div className="mb-6">
          <h2 className="text-lg font-black mb-3 text-gray-400">📝 Notes for Dad</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How'd it feel? Anything clicking or struggling today?"
            rows={3}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-800 focus:border-yellow-400 focus:outline-none placeholder-gray-600 resize-none text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-yellow-400 hover:bg-yellow-300 disabled:bg-gray-800 disabled:text-gray-600 text-black font-black text-lg py-5 rounded-2xl transition-all active:scale-95"
        >
          {submitting ? 'Sending...' : '📤 Send Results to Dad'}
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">restoreports.com/alana</p>
      </form>
    </div>
  )
}
