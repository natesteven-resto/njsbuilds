'use client'

import { useState, useEffect } from 'react'

type Exercise = {
  id: string
  label: string
  instruction: string
  emoji: string
}

type Section = {
  title: string
  color: string
  bg: string
  exercises: Exercise[]
}

type DayPlan = {
  label: string
  shortLabel: string
  emoji: string
  tagline: string
  sections: Section[]
}

// ─── CORE / ABS (included in every day) ──────────────────────────────────────
const ABS_SECTION: Section = {
  title: '🔥 Core & Abs',
  color: 'text-red-400',
  bg: 'border-red-900',
  exercises: [
    {
      id: 'plank',
      label: 'Plank Hold — 2×30 seconds',
      instruction: 'Get into push-up position on your forearms. Keep your body a straight line from head to heels — no sagging hips, no raised butt. Squeeze your abs and glutes the whole time. 2 rounds of 30 seconds.',
      emoji: '🪨',
    },
    {
      id: 'dead_bug',
      label: 'Dead Bug — 2×8 each side',
      instruction: 'Lie on your back, arms straight up, knees at 90°. Slowly lower your right arm and left leg toward the floor AT THE SAME TIME — keep your lower back FLAT on the ground the whole time. Return and switch. 2 sets of 8 per side.',
      emoji: '🐛',
    },
    {
      id: 'bicycle_crunch',
      label: 'Bicycle Crunches — 2×20',
      instruction: 'Lie on your back, hands behind your head. Bring your right elbow to your left knee while extending the right leg. Alternate sides in a smooth pedaling motion. Don\'t yank your neck. 2 sets of 20 total.',
      emoji: '🚲',
    },
  ],
}

// ─── MONDAY: Plyometrics + Strength + Shooting ───────────────────────────────
const MONDAY: DayPlan = {
  label: 'Monday',
  shortLabel: 'MON',
  emoji: '⚡',
  tagline: 'Plyometrics · Strength · Shooting',
  sections: [
    {
      title: '⚡ Plyometrics',
      color: 'text-yellow-400',
      bg: 'border-yellow-900',
      exercises: [
        {
          id: 'mon_jump_rope',
          label: 'Jump Rope Warmup — 2 min',
          instruction: '2 minutes continuous at a steady pace. Focus on quick feet and light landings. Gets your calves and ankles primed to jump.',
          emoji: '🪢',
        },
        {
          id: 'mon_box_jumps',
          label: 'Box Jumps — 3×5',
          instruction: 'Stand in front of the box. Bend knees, swing arms, EXPLODE up. Land soft with both feet on the box, knees bent. Step down slowly. Full reset between every rep.',
          emoji: '📦',
        },
        {
          id: 'mon_band_jumps',
          label: 'Resistance Band Jumps — 3×8',
          instruction: 'Stand on the band, hold handles at shoulders. Jump as HIGH as you can against the resistance. Land soft, reset, go again.',
          emoji: '🔁',
        },
        {
          id: 'mon_single_hops',
          label: 'Single Leg Hops — 2×5 each',
          instruction: 'Balance on one leg. Push off hard and hop forward, landing on the same foot. Focus on a powerful push-off each time. 2 sets per leg.',
          emoji: '🦵',
        },
      ],
    },
    {
      title: '💪 Strength',
      color: 'text-blue-400',
      bg: 'border-blue-900',
      exercises: [
        {
          id: 'mon_goblet',
          label: 'Goblet Squats — 3×12',
          instruction: 'Hold one dumbbell at your chest. Squat as deep as you can, chest up. Drive through your heels. 3 sets of 12.',
          emoji: '🔻',
        },
        {
          id: 'mon_calf',
          label: 'Single Leg Calf Raises — 3×15 each',
          instruction: 'Stand on the edge of a step on one foot, heel hanging off. Lower slow, drive up to tiptoe. Slow and controlled the whole way. 3 sets of 15 per leg.',
          emoji: '👟',
        },
        {
          id: 'mon_glute',
          label: 'Glute Bridges — 3×12',
          instruction: 'Lie on your back, feet flat, knees bent. Drive hips up and SQUEEZE your glutes at the top for 2 seconds. Lower slow. 3 sets of 12.',
          emoji: '🌉',
        },
      ],
    },
    ABS_SECTION,
    {
      title: '🎯 Shooting Drills',
      color: 'text-green-400',
      bg: 'border-green-900',
      exercises: [
        {
          id: 'mon_form',
          label: 'Form Shooting — 25 makes',
          instruction: '5 feet from the basket. One hand only — perfect arc every time. Count makes only. Get 25 makes.',
          emoji: '🎯',
        },
        {
          id: 'mon_ft',
          label: 'Free Throws — 30 shots',
          instruction: 'Same routine every time — bounce, breathe, bend, follow through. Track your makes.',
          emoji: '🏀',
        },
        {
          id: 'mon_spots',
          label: 'Spot Shooting — 5 spots × 5 shots',
          instruction: '5 spots: left corner, left wing, top of key, right wing, right corner. 5 shots each = 25 total. Focus on footwork and catching in your pocket.',
          emoji: '📍',
        },
        {
          id: 'mon_pullups',
          label: 'Off-Dribble Pull-Ups — 20 reps',
          instruction: 'Drive hard, one hard dribble, pull up for a mid-range. 10 from the right, 10 from the left. Hold your follow-through.',
          emoji: '↗️',
        },
      ],
    },
  ],
}

// ─── WEDNESDAY & FRIDAY: Arms ────────────────────────────────────────────────
const ARMS_SECTIONS: Section[] = [
  {
    title: '💪 Upper Body — Push',
    color: 'text-purple-400',
    bg: 'border-purple-900',
    exercises: [
      {
        id: 'push_press',
        label: 'Dumbbell Alternating Shoulder Press — 3×8 each',
        instruction: 'Sit or stand, dumbbells at shoulder height. Press one arm up fully while keeping the other stable. Alternate arms. Builds the shoulder stability you need for consistent shooting. 3 sets of 8 per arm.',
        emoji: '🔼',
      },
      {
        id: 'lateral_raise',
        label: 'Lateral Raises — 3×12',
        instruction: 'Stand holding dumbbells at your sides. Raise both arms out to the side until shoulder height — keep a slight bend in your elbows. Lower SLOW. This builds your shooting shoulder. 3 sets of 12.',
        emoji: '↔️',
      },
      {
        id: 'pushup_plus',
        label: 'Push-Up Plus — 3×10',
        instruction: 'Get in push-up position. Do a push-up, but at the top, push your shoulder blades apart (round your upper back) and hold 1 second before lowering. This builds shoulder stability for shooting. 3 sets of 10.',
        emoji: '➕',
      },
    ],
  },
  {
    title: '🦾 Upper Body — Pull',
    color: 'text-cyan-400',
    bg: 'border-cyan-900',
    exercises: [
      {
        id: 'bent_row',
        label: 'Single Arm Dumbbell Row — 3×10 each',
        instruction: 'Place one knee and hand on a bench, back flat. Row the dumbbell up toward your hip — lead with your elbow, not your hand. Lower all the way down. A strong back = strong rebounder. 3 sets of 10 per arm.',
        emoji: '🎣',
      },
      {
        id: 'bicep_curl',
        label: 'Dumbbell Bicep Curls — 3×10',
        instruction: 'Stand with dumbbells at your sides, palms forward. Curl both arms up toward your shoulders — keep your elbows pinned to your sides. Squeeze at the top, lower slow. 3 sets of 10.',
        emoji: '💪',
      },
      {
        id: 'face_pull',
        label: 'Band Face Pulls — 3×12',
        instruction: 'Anchor a resistance band at head height. Hold both ends with palms down, pull toward your face — elbows high and flared out. Squeeze your shoulder blades together. Protects your shooting shoulder. 3 sets of 12.',
        emoji: '🎯',
      },
    ],
  },
  ABS_SECTION,
  {
    title: '🎯 Shooting Drills',
    color: 'text-green-400',
    bg: 'border-green-900',
    exercises: [
      {
        id: 'arms_form',
        label: 'Form Shooting — 25 makes',
        instruction: '5 feet from the basket. One hand. Perfect form, perfect arc. Tired arms = find out if your form is really locked in.',
        emoji: '🎯',
      },
      {
        id: 'arms_ft',
        label: 'Free Throws — 20 shots',
        instruction: 'Even with tired arms, locked-in routine. Your shot has to work when you\'re gassed.',
        emoji: '🏀',
      },
      {
        id: 'arms_catch_shoot',
        label: 'Catch & Shoot — 30 reps',
        instruction: 'Have someone pass to you (or toss to yourself off the wall). Catch, set your feet, shoot — as fast as you can get into rhythm. 15 from left wing, 15 from right wing.',
        emoji: '🤝',
      },
    ],
  },
]

// ─── THURSDAY: Legs ──────────────────────────────────────────────────────────
const LEGS_SECTIONS: Section[] = [
  {
    title: '🔥 Explosive Power',
    color: 'text-yellow-400',
    bg: 'border-yellow-900',
    exercises: [
      {
        id: 'leg_jump_rope',
        label: 'Jump Rope Warmup — 2 min',
        instruction: '2 minutes at a steady pace. Warms up the ankles, calves, and gets your heart rate up.',
        emoji: '🪢',
      },
      {
        id: 'lateral_bounds',
        label: 'Lateral Bounds — 3×6 each',
        instruction: 'Push off one leg sideways, land on the other, hold your balance for 1 second before going back. Builds lateral explosiveness for defensive slides and cuts. 3 sets of 6 per leg.',
        emoji: '↔️',
      },
      {
        id: 'broad_jump',
        label: 'Broad Jumps — 3×4',
        instruction: 'Two feet together. Bend deep, swing arms, jump as FAR forward as possible. Land soft on both feet. Walk back, reset, go again. 3 sets of 4.',
        emoji: '⬆️',
      },
    ],
  },
  {
    title: '🦵 Leg Strength',
    color: 'text-blue-400',
    bg: 'border-blue-900',
    exercises: [
      {
        id: 'bulgarian_split',
        label: 'Bulgarian Split Squats — 3×8 each',
        instruction: 'Back foot up on a bench, front foot forward. Lower your back knee toward the floor. Keep your front shin as vertical as possible. One of the best single-leg strength builders in basketball. 3 sets of 8 per leg.',
        emoji: '🏋️',
      },
      {
        id: 'sumo_squat',
        label: 'Dumbbell Sumo Squats — 3×10',
        instruction: 'Stand with feet wide, toes pointed out. Hold one dumbbell hanging between your legs. Squat deep, drive through your heels. Builds inner thighs and glutes — great for your defensive stance.',
        emoji: '🔻',
      },
      {
        id: 'wall_sit',
        label: 'Wall Sits — 2×45 seconds',
        instruction: 'Back flat against the wall, thighs parallel to the floor (90° angle). Hold for 45 seconds. No sliding down. Builds the quad endurance you need for the 4th quarter. 2 rounds.',
        emoji: '🧱',
      },
    ],
  },
  ABS_SECTION,
  {
    title: '🎯 Shooting Drills',
    color: 'text-green-400',
    bg: 'border-green-900',
    exercises: [
      {
        id: 'leg_form',
        label: 'Form Shooting — 25 makes',
        instruction: 'On tired legs. This is the POINT. If your shot still looks good when your legs are cooked, your form is real. 25 makes from 5 feet.',
        emoji: '🎯',
      },
      {
        id: 'leg_drive_shooting',
        label: 'Leg-Drive Shooting — 20 reps',
        instruction: 'Focus entirely on your LEG DRIVE. Dip deep before every shot — make your legs do the work, not your arms. 10 from each wing.',
        emoji: '🦵',
      },
      {
        id: 'leg_transition',
        label: 'Transition Finishing — 10 each side',
        instruction: 'Sprint from half court, receive a pass (or grab off the wall), go up STRONG for a layup. No slowing down. 10 from the right, 10 from the left. Finishing under fatigue.',
        emoji: '💨',
      },
    ],
  },
]

// ─── DAY PLANS ────────────────────────────────────────────────────────────────
const DAYS: Record<string, DayPlan> = {
  monday: {
    label: 'Monday',
    shortLabel: 'MON',
    emoji: '⚡',
    tagline: 'Plyometrics · Strength · Shooting',
    sections: MONDAY.sections,
  },
  wednesday: {
    label: 'Wednesday',
    shortLabel: 'WED',
    emoji: '💪',
    tagline: 'Arms · Core · Shooting',
    sections: ARMS_SECTIONS,
  },
  thursday: {
    label: 'Thursday',
    shortLabel: 'THU',
    emoji: '🦵',
    tagline: 'Legs · Core · Shooting',
    sections: LEGS_SECTIONS,
  },
  friday: {
    label: 'Friday',
    shortLabel: 'FRI',
    emoji: '🦾',
    tagline: 'Arms · Core · Shooting',
    sections: ARMS_SECTIONS.map(s => ({
      ...s,
      exercises: s.exercises.map(e => ({ ...e, id: e.id + '_fri' })),
    })),
  },
}

const DAY_ORDER = ['monday', 'wednesday', 'thursday', 'friday']

function getDefaultDay(): string {
  const dow = new Date().getDay() // 0=Sun,1=Mon...6=Sat
  if (dow === 1) return 'monday'
  if (dow === 3) return 'wednesday'
  if (dow === 4) return 'thursday'
  if (dow === 5) return 'friday'
  return 'monday'
}

export default function NathanWorkout() {
  const [selectedDay, setSelectedDay] = useState<string>('monday') // overridden client-side below
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Detect the correct day in the browser (avoids static-build baking in wrong day)
  useEffect(() => {
    setSelectedDay(getDefaultDay())
  }, [])

  const plan = DAYS[selectedDay]
  const allIds = plan.sections.flatMap(s => s.exercises.map(e => e.id))
  const completedCount = allIds.filter(id => done[id]).length
  const totalCount = allIds.length
  const pct = Math.round((completedCount / totalCount) * 100)

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const toggle = (id: string) => setDone(prev => ({ ...prev, [id]: !prev[id] }))

  const handleDayChange = (day: string) => {
    setSelectedDay(day)
    setDone({})
    setNotes('')
    setSubmitted(false)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/nathan/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          done,
          notes,
          date: today,
          day: plan.label,
          exercises: plan.sections.flatMap(s =>
            s.exercises.map(e => ({ id: e.id, label: e.label, section: s.title }))
          ),
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
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-7xl mb-4">🏀</div>
          <h1 className="text-3xl font-black text-white mb-2">Work done.</h1>
          <p className="text-gray-400 text-lg">Dad got the report. See you next session.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      {/* Header */}
      <div className="bg-gradient-to-b from-orange-600 to-orange-900 px-6 pt-10 pb-6">
        <div className="text-4xl mb-1">🏀</div>
        <h1 className="text-3xl font-black">Nathan&apos;s Workout</h1>
        <p className="text-orange-200 text-sm mt-1">{today}</p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-orange-200">{completedCount} of {totalCount} done</span>
            <span className="text-orange-200 font-bold">{pct}%</span>
          </div>
          <div className="h-3 bg-orange-950 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Day Selector */}
      <div className="px-4 pt-5 max-w-lg mx-auto">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Select Day</p>
        <div className="grid grid-cols-4 gap-2">
          {DAY_ORDER.map(day => {
            const d = DAYS[day]
            const isActive = selectedDay === day
            return (
              <button
                key={day}
                onClick={() => handleDayChange(day)}
                className={`rounded-xl py-3 flex flex-col items-center gap-1 transition-all border ${
                  isActive
                    ? 'bg-orange-500 border-orange-400 text-white'
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span className="text-lg">{d.emoji}</span>
                <span className="text-xs font-black">{d.shortLabel}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3">
          <p className="text-white font-black">{plan.emoji} {plan.label} Workout</p>
          <p className="text-gray-500 text-sm">{plan.tagline}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pt-6 max-w-lg mx-auto">
        {plan.sections.map(section => (
          <div key={section.title} className="mb-8">
            <h2 className={`text-lg font-black mb-3 ${section.color}`}>{section.title}</h2>
            <div className="space-y-3">
              {section.exercises.map(ex => (
                <div
                  key={ex.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    done[ex.id]
                      ? 'bg-gray-900 border-gray-700 opacity-70'
                      : `bg-gray-950 ${section.bg}`
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{ex.emoji}</span>
                    <div className="flex-1">
                      <p className={`font-bold text-base ${done[ex.id] ? 'line-through text-gray-500' : 'text-white'}`}>
                        {ex.label}
                      </p>
                      {!done[ex.id] && (
                        <p className="text-gray-400 text-sm mt-1 leading-relaxed">{ex.instruction}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(ex.id)}
                    className={`mt-3 w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
                      done[ex.id]
                        ? 'bg-gray-800 text-gray-500'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {done[ex.id] ? '✓ Done' : 'Mark Done'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Notes */}
        <div className="mb-6">
          <h2 className="text-lg font-black mb-3 text-gray-400">📝 Notes for Dad</h2>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="How'd it go? Anything feel hard or good today?"
            rows={3}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-800 focus:border-orange-500 focus:outline-none placeholder-gray-600 resize-none text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-800 text-white font-black text-lg py-5 rounded-2xl transition-all active:scale-95"
        >
          {submitting ? 'Sending...' : '📤 Send Results to Dad'}
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">restoreports.com/nathan</p>
      </form>
    </div>
  )
}
