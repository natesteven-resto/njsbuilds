'use client'

import { useState, useEffect, useRef } from 'react'

type Drill = {
  id: string
  label: string
  instruction: string
  emoji: string
  duration: number // seconds
  hasReps: boolean
  repsLabel?: string
}

type Section = {
  title: string
  color: string
  bg: string
  drills: Drill[]
}

type DayWorkout = {
  id: string
  label: string
  short: string
  emoji: string
  tagline: string
  sections: Section[]
}

// ─── MONDAY: Lower Body Power ─────────────────────────────────────────────────
const MONDAY: DayWorkout = {
  id: 'monday',
  label: 'Monday',
  short: 'Mon',
  emoji: '🦵',
  tagline: 'Lower Body Power — Quads · Hamstrings · Glutes',
  sections: [
    {
      title: '🔥 Warmup',
      color: 'text-yellow-400',
      bg: 'border-yellow-800',
      drills: [
        {
          id: 'mon_legswings',
          label: 'Leg Swings',
          instruction: 'Stand tall, hold onto a wall for balance. Swing one leg forward and back like a pendulum — 15 times, then side to side — 15 times. Switch legs. Loosens up your hips for everything that follows.',
          emoji: '🔄',
          duration: 60,
          hasReps: false,
        },
        {
          id: 'mon_bw_squat',
          label: 'Bodyweight Squat Warm-Up',
          instruction: 'Feet shoulder-width, toes slightly out. Squat slow — 3 counts down, pause, stand. This isn\'t the workout yet — just waking up your legs. Keep your chest up and knees tracking over your toes.',
          emoji: '⬇️',
          duration: 90,
          hasReps: false,
        },
        {
          id: 'mon_hip_circles',
          label: 'Hip Circle Openers',
          instruction: 'Hands on hips, make big circles with your hips — 10 each direction. Then do high knees for 20 reps. Gets the hip flexors ready to work.',
          emoji: '🔁',
          duration: 60,
          hasReps: false,
        },
      ],
    },
    {
      title: '💪 Strength Work',
      color: 'text-green-400',
      bg: 'border-green-800',
      drills: [
        {
          id: 'mon_goblet_squat',
          label: 'Goblet Squat — 3×12',
          instruction: 'Hold one dumbbell at your chest with both hands (15–20 lbs). Feet shoulder-width, toes slightly out. Squat deep — thighs parallel or below. Drive through your heels to stand. 3 sets of 12, rest 30 sec between. This is your single best soccer strength move.',
          emoji: '🏋️‍♀️',
          duration: 180,
          hasReps: true,
          repsLabel: 'Weight used (lbs)',
        },
        {
          id: 'mon_rdl',
          label: 'Romanian Deadlift — 3×10',
          instruction: 'Dumbbell in each hand (10–15 lbs). Stand tall, slight knee bend. Hinge at your hips — push your butt backward — and let the weights slide down your legs until you feel your hamstrings pull. Drive hips forward to stand. Slow and controlled. 3 sets of 10, rest 30 sec. Form over weight here.',
          emoji: '🔻',
          duration: 180,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'mon_reverse_lunge',
          label: 'Reverse Lunge — 3×8 each leg',
          instruction: 'Hold a dumbbell in each hand (8–12 lbs). Step ONE foot backward, lower your back knee toward the floor, front thigh parallel to floor. Push back to standing. Do 8 on the right, then 8 on the left = 1 set. Rest 30 sec. Fires every soccer muscle you have.',
          emoji: '🚶‍♀️',
          duration: 210,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'mon_lateral_lunge',
          label: 'Lateral Lunge — 2×10 each side',
          instruction: 'Hold one dumbbell at your chest (10 lbs) or go bodyweight. Step wide to the right, sit your hips back over that foot, keep the left leg straight. Push back to center. 10 each side = 1 set. Rest 20 sec. This builds the side-to-side agility you use in every game.',
          emoji: '↔️',
          duration: 150,
          hasReps: false,
        },
        {
          id: 'mon_calf_raises',
          label: 'Calf Raises — 3×15',
          instruction: 'Stand with dumbbells in each hand (10–15 lbs). Rise up on your toes as high as possible, then SLOW back down — 3 counts down. Stand on the edge of a step for extra range if you have one. 3 sets of 15, rest 20 sec. Soccer runs on your calves.',
          emoji: '⬆️',
          duration: 120,
          hasReps: false,
        },
      ],
    },
    {
      title: '🧱 Core Finisher',
      color: 'text-emerald-400',
      bg: 'border-emerald-800',
      drills: [
        {
          id: 'mon_plank',
          label: 'Plank Hold — 2×45 sec',
          instruction: 'Elbows under shoulders, body in a straight line from head to heels. Don\'t let your hips sag or poke up. Squeeze your abs and glutes. Two rounds, rest 15 sec between. Core stability = better touches, harder shots.',
          emoji: '🪵',
          duration: 150,
          hasReps: false,
        },
      ],
    },
  ],
}

// ─── TUESDAY: Upper Body & Core ───────────────────────────────────────────────
const TUESDAY: DayWorkout = {
  id: 'tuesday',
  label: 'Tuesday',
  short: 'Tue',
  emoji: '💪',
  tagline: 'Upper Body & Core — Shoulders · Rows · Stability',
  sections: [
    {
      title: '🔥 Warmup',
      color: 'text-yellow-400',
      bg: 'border-yellow-800',
      drills: [
        {
          id: 'tue_arm_circles',
          label: 'Arm Circles + Shoulder Rolls',
          instruction: 'Arms out to the side — big circles forward 15 times, backward 15 times. Then roll your shoulders forward 10, backward 10. Gets blood moving in your shoulders and upper back.',
          emoji: '🔄',
          duration: 60,
          hasReps: false,
        },
        {
          id: 'tue_warmup_row',
          label: 'Light Dumbbell Swing + Reach',
          instruction: 'Hold 5 lb dumbbells. Arms forward, swing to sides and back (like hugging motion), then overhead reach. 20 slow reps. This opens up your chest and shoulder joints before loading them.',
          emoji: '🤸‍♀️',
          duration: 60,
          hasReps: false,
        },
        {
          id: 'tue_torso_rotate',
          label: 'Torso Rotations',
          instruction: 'Stand with feet shoulder-width. Hold one dumbbell (5 lbs) at chest, rotate your torso left and right slowly. 20 total twists. Warms up your obliques and spine.',
          emoji: '↩️',
          duration: 60,
          hasReps: false,
        },
      ],
    },
    {
      title: '🏋️‍♀️ Upper Body',
      color: 'text-green-400',
      bg: 'border-green-800',
      drills: [
        {
          id: 'tue_shoulder_press',
          label: 'Dumbbell Shoulder Press — 3×12',
          instruction: 'Seated or standing. Dumbbells at shoulder height, palms forward. Press straight overhead until arms are fully extended. Lower slow — 2 counts down. Use 8–12 lbs each. Don\'t arch your back. 3 sets of 12, rest 30 sec. Shoulder strength = better throw-ins and physical play.',
          emoji: '🙋‍♀️',
          duration: 180,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'tue_bent_row',
          label: 'Bent-Over Dumbbell Row — 3×10',
          instruction: 'Hinge forward at your hips to about 45°, dumbbells hanging down (10–15 lbs each). Pull your elbows straight back — squeeze your shoulder blades together at the top. Slow down. 3 sets of 10, rest 30 sec. This builds posture strength that keeps you upright late in a game.',
          emoji: '🚣‍♀️',
          duration: 180,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'tue_bicep_curl',
          label: 'Bicep Curl — 3×12',
          instruction: 'Dumbbells in each hand (8–10 lbs). Curl up to shoulder, then SLOW back down — 3 full counts. Don\'t swing. Elbows stay at your sides. 3 sets of 12, rest 20 sec.',
          emoji: '💪',
          duration: 150,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'tue_tricep_ext',
          label: 'Overhead Tricep Extension — 3×12',
          instruction: 'Hold one dumbbell (8–10 lbs) with both hands overhead. Lower it behind your head, then press back up. Elbows stay close to your head — don\'t let them flare out. 3 sets of 12, rest 20 sec.',
          emoji: '🔑',
          duration: 150,
          hasReps: false,
        },
        {
          id: 'tue_lateral_raise',
          label: 'Lateral Raises — 2×12',
          instruction: 'Dumbbells at your sides (5–8 lbs). Lift arms out to the side until parallel with the floor — don\'t go higher. SLOW down — 3 counts. No swinging. 2 sets of 12, rest 20 sec. This is a feel-the-burn move — go lighter than you think.',
          emoji: '✈️',
          duration: 120,
          hasReps: false,
        },
      ],
    },
    {
      title: '🧱 Core',
      color: 'text-emerald-400',
      bg: 'border-emerald-800',
      drills: [
        {
          id: 'tue_russian_twist',
          label: 'Russian Twists — 3×20',
          instruction: 'Sit on the floor, lean back slightly, feet up or down. Hold one dumbbell (5–8 lbs) with both hands. Rotate side to side — right, left = 2 reps. Go controlled, not fast. 3 sets of 20 total twists, rest 20 sec. This is your rotational soccer core.',
          emoji: '🌀',
          duration: 180,
          hasReps: false,
        },
        {
          id: 'tue_dead_bug',
          label: 'Dead Bug — 2×30 sec',
          instruction: 'Lie on your back, arms reaching toward the ceiling, knees bent at 90° in the air. Slowly lower your right arm and left leg toward the floor at the same time — lower back stays flat on the ground. Return, switch sides. 2 rounds of 30 sec, rest 15 sec. Looks easy, isn\'t.',
          emoji: '🐛',
          duration: 120,
          hasReps: false,
        },
      ],
    },
  ],
}

// ─── WEDNESDAY: Explosive Power ───────────────────────────────────────────────
const WEDNESDAY: DayWorkout = {
  id: 'wednesday',
  label: 'Wednesday',
  short: 'Wed',
  emoji: '⚡',
  tagline: 'Explosive Power — First step · Sprints · Jump',
  sections: [
    {
      title: '🔥 Warmup',
      color: 'text-yellow-400',
      bg: 'border-yellow-800',
      drills: [
        {
          id: 'wed_high_knees',
          label: 'High Knees',
          instruction: 'Run in place, driving your knees up to hip height each step. Arms pumping. Go at 70% — this is warmup, not the workout. 30 seconds.',
          emoji: '🏃‍♀️',
          duration: 60,
          hasReps: false,
        },
        {
          id: 'wed_butt_kicks',
          label: 'Butt Kicks',
          instruction: 'Run in place, kicking your heels up toward your butt each step. Keeps your stride fast and short. 30 seconds.',
          emoji: '🦵',
          duration: 60,
          hasReps: false,
        },
        {
          id: 'wed_squat_stand',
          label: 'Squat to Stand',
          instruction: 'Stand with feet together. Hinge down, grab your toes, push your hips up to the sky, then squat down between your arms. Stand and repeat. 10 slow reps. Opens up everything.',
          emoji: '📐',
          duration: 75,
          hasReps: false,
        },
      ],
    },
    {
      title: '⚡ Power Work',
      color: 'text-green-400',
      bg: 'border-green-800',
      drills: [
        {
          id: 'wed_jump_squat',
          label: 'Jump Squat — 3×8',
          instruction: 'Bodyweight or hold light dumbbells (5–8 lbs). Squat to parallel, then EXPLODE upward as high as you can. Land SOFT with bent knees — absorb the impact. Pause one second, then go again. 3 sets of 8, rest 30 sec. This is how you build soccer first-step speed.',
          emoji: '🚀',
          duration: 150,
          hasReps: false,
        },
        {
          id: 'wed_step_up',
          label: 'Explosive Step-Up — 3×8 each leg',
          instruction: 'Use a sturdy chair, step, or stair (about 12–18 inches). Hold dumbbells (8–12 lbs each). Step up with your right foot, drive your left knee UP explosively at the top. Step back down controlled. 8 on the right, then 8 on the left. Rest 30 sec. Mimics the sprint drive position.',
          emoji: '⬆️',
          duration: 210,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'wed_single_leg_dl',
          label: 'Single-Leg Deadlift — 3×8 each leg',
          instruction: 'Stand on your right leg. Hold one dumbbell (10 lbs) in your left hand. Hinge forward on the right leg, left leg extends behind you for balance. Lower the weight toward the floor, then drive back up. 8 each leg, rest 30 sec. This is your balance + hamstring move — soccer players need this.',
          emoji: '🦩',
          duration: 210,
          hasReps: true,
          repsLabel: 'Weight used (lbs)',
        },
        {
          id: 'wed_dumbbell_swing',
          label: 'Dumbbell Swing — 3×10',
          instruction: 'Hold one dumbbell (10–15 lbs) with both hands. Feet shoulder-width. Hinge at hips, let the dumbbell swing between your legs, then drive your hips forward explosively to swing it to chest height. NOT a squat — it\'s a hip hinge snap. 3 sets of 10, rest 30 sec. Pure soccer hip power.',
          emoji: '🌪️',
          duration: 150,
          hasReps: true,
          repsLabel: 'Weight used (lbs)',
        },
        {
          id: 'wed_broad_jump',
          label: 'Broad Jump — 3×5',
          instruction: 'Stand with feet shoulder-width. Swing your arms back, bend your knees, then jump FORWARD as far as possible. Land soft and balanced — stick it. Walk back, reset, go again. 3 sets of 5. No weight needed. Measures raw explosive power.',
          emoji: '🦅',
          duration: 120,
          hasReps: false,
        },
      ],
    },
    {
      title: '🧱 Core Finisher',
      color: 'text-emerald-400',
      bg: 'border-emerald-800',
      drills: [
        {
          id: 'wed_mountain_climbers',
          label: 'Mountain Climbers — 3×30 sec',
          instruction: 'Start in a push-up/plank position. Drive your right knee to your chest, then switch fast — left knee drives in as right goes back. Keep your hips level. 3 rounds of 30 seconds, rest 15 sec. This burns. Push through it.',
          emoji: '⛰️',
          duration: 150,
          hasReps: false,
        },
      ],
    },
  ],
}

// ─── THURSDAY: Hip, Glute & Balance ──────────────────────────────────────────
const THURSDAY: DayWorkout = {
  id: 'thursday',
  label: 'Thursday',
  short: 'Thu',
  emoji: '🎯',
  tagline: 'Hip, Glute & Balance — Kicking power · Agility · Injury prevention',
  sections: [
    {
      title: '🔥 Warmup',
      color: 'text-yellow-400',
      bg: 'border-yellow-800',
      drills: [
        {
          id: 'thu_hip_flexor',
          label: 'Hip Flexor Stretch Series',
          instruction: 'Drop into a lunge position (right foot forward). Push your left hip toward the floor and hold 10 seconds. Reach your left arm overhead for extra stretch. Switch. Do each side twice. Tight hip flexors = the #1 injury risk for soccer players. This prevents that.',
          emoji: '🧘‍♀️',
          duration: 90,
          hasReps: false,
        },
        {
          id: 'thu_clamshell',
          label: 'Clamshells — Bodyweight',
          instruction: 'Lie on your side, hips and knees bent at 45°. Keeping feet together, lift your top knee as high as you can without rotating your hips. Hold 1 second at the top. 15 reps each side. Activates your glute medius — the stabilizer that protects your knee when you cut.',
          emoji: '🦪',
          duration: 90,
          hasReps: false,
        },
      ],
    },
    {
      title: '🍑 Hip & Glute Work',
      color: 'text-green-400',
      bg: 'border-green-800',
      drills: [
        {
          id: 'thu_glute_bridge',
          label: 'Glute Bridge with Dumbbell — 3×15',
          instruction: 'Lie on your back, knees bent, feet flat. Place a dumbbell on your hips (15–25 lbs). Drive your hips straight up — SQUEEZE your glutes at the top and hold 1 second. Slow down. 3 sets of 15, rest 20 sec. Your glutes power every shot and sprint you take.',
          emoji: '🌉',
          duration: 180,
          hasReps: true,
          repsLabel: 'Weight used (lbs)',
        },
        {
          id: 'thu_sumo_squat',
          label: 'Sumo Squat — 3×12',
          instruction: 'Wide stance, toes turned out about 45°. Hold one heavy dumbbell (20–30 lbs) hanging between your legs. Sit straight down — knees track over toes. Drive up through your heels. 3 sets of 12, rest 30 sec. Hits your inner thighs and glutes in a way regular squats don\'t.',
          emoji: '🏋️‍♀️',
          duration: 180,
          hasReps: true,
          repsLabel: 'Weight used (lbs)',
        },
        {
          id: 'thu_bulgarian',
          label: 'Bulgarian Split Squat — 3×8 each leg',
          instruction: 'Stand in front of a chair. Put your back foot up on the seat. Hold dumbbells in each hand (8–12 lbs). Lower your back knee toward the floor — front thigh parallel. Drive back up through your front heel. 8 reps each leg, rest 30 sec. This is the hardest one. It\'s also the most rewarding.',
          emoji: '🪑',
          duration: 210,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'thu_hip_abduction',
          label: 'Side-Lying Hip Abduction — 3×15 each',
          instruction: 'Lie on your side, body in a straight line. Lift your top leg to about 45° — don\'t roll your hip back. Slow up, slow down. Squeeze at the top. 3 sets of 15 each side, rest 15 sec. Add a dumbbell on your thigh for extra resistance if it\'s too easy.',
          emoji: '↗️',
          duration: 180,
          hasReps: false,
        },
      ],
    },
    {
      title: '🧱 Core',
      color: 'text-emerald-400',
      bg: 'border-emerald-800',
      drills: [
        {
          id: 'thu_bicycle',
          label: 'Bicycle Crunches — 3×20',
          instruction: 'Lie on your back, hands behind your head. Bring your right elbow to your left knee while extending your right leg — then switch. Slow and full rotation. Don\'t pull your neck. 3 sets of 20 total, rest 20 sec.',
          emoji: '🚲',
          duration: 150,
          hasReps: false,
        },
        {
          id: 'thu_plank_hip_dip',
          label: 'Plank Hip Dips — 2×30 sec',
          instruction: 'Start in a forearm plank. Rotate your hips to the right, dip them toward the floor, back to center, then left. Continuous rotation. 2 rounds of 30 sec, rest 15 sec. Builds rotational core stability — what you need to hold off a defender.',
          emoji: '🌊',
          duration: 120,
          hasReps: false,
        },
      ],
    },
  ],
}

// ─── FRIDAY: Full Body Circuit ────────────────────────────────────────────────
const FRIDAY: DayWorkout = {
  id: 'friday',
  label: 'Friday',
  short: 'Fri',
  emoji: '🔥',
  tagline: 'Full Body Circuit — Everything together · Conditioning + strength',
  sections: [
    {
      title: '🔥 Warmup',
      color: 'text-yellow-400',
      bg: 'border-yellow-800',
      drills: [
        {
          id: 'fri_star_jumps',
          label: 'Star Jumps',
          instruction: 'Start with feet together, arms at your sides. Jump and spread your arms and legs wide (star shape), then jump back together. 20 reps. Full warmup in under a minute.',
          emoji: '⭐',
          duration: 60,
          hasReps: false,
        },
        {
          id: 'fri_inchworm',
          label: 'Inchworm Walk-Outs',
          instruction: 'Stand tall. Hinge at hips, touch the floor, and WALK your hands out until you\'re in a push-up position. Hold 1 second. Walk your hands back, stand up. 8 slow reps. Opens your entire posterior chain before the circuit.',
          emoji: '🐛',
          duration: 75,
          hasReps: false,
        },
      ],
    },
    {
      title: '🔁 Circuit — 2 Rounds',
      color: 'text-green-400',
      bg: 'border-green-800',
      drills: [
        {
          id: 'fri_thruster',
          label: 'Dumbbell Thruster — 2×10',
          instruction: 'Hold dumbbells at your shoulders (8–12 lbs each). Squat to parallel, then stand and PRESS the weights overhead in one fluid motion. That\'s 1 rep. Drive from your legs into the press. 10 reps, then rest. Then do round 2 after all 5 exercises are complete.',
          emoji: '🚀',
          duration: 90,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'fri_renegade_row',
          label: 'Renegade Row — 2×8 each arm',
          instruction: 'Start in a push-up position with a dumbbell in each hand (8–10 lbs). Row your right dumbbell to your hip, set it down, row left. Keep your hips level — don\'t rotate. Core has to fire the whole time. 8 each arm, rest, repeat round 2.',
          emoji: '🚣',
          duration: 90,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'fri_lateral_curl',
          label: 'Lateral Lunge to Curl — 2×10 each side',
          instruction: 'Hold dumbbells in each hand (8 lbs). Step wide to the right into a lateral lunge, then as you push back to standing, curl both dumbbells. Step, lunge, curl. 10 each side. Combines lower body agility with arm work.',
          emoji: '🔀',
          duration: 90,
          hasReps: false,
        },
        {
          id: 'fri_db_deadlift',
          label: 'Dumbbell Deadlift — 2×12',
          instruction: 'Dumbbells in each hand (15–20 lbs), hanging at your sides. Feet hip-width. Hinge at hips, weight slides down legs, then drive through your heels to stand. Squeeze glutes at the top. Controlled down. 12 reps, rest 30 sec.',
          emoji: '⬇️',
          duration: 90,
          hasReps: true,
          repsLabel: 'Weight used each hand (lbs)',
        },
        {
          id: 'fri_pushup',
          label: 'Push-Up — 2×max (aim for 10)',
          instruction: 'Hands slightly wider than shoulders. Lower until your chest nearly touches the floor. Press back up. If you hit failure before 10, drop to knees and keep going. Full chest and tricep work. Rest 30 sec after your max set, then repeat round 2.',
          emoji: '👇',
          duration: 90,
          hasReps: true,
          repsLabel: 'Reps completed (total)',
        },
      ],
    },
    {
      title: '🧱 Core Finisher',
      color: 'text-emerald-400',
      bg: 'border-emerald-800',
      drills: [
        {
          id: 'fri_vups',
          label: 'V-Ups — 3×10',
          instruction: 'Lie flat on the floor, arms overhead. Simultaneously lift your arms and legs, reaching your hands toward your feet at the top — your body makes a V shape. Lower controlled. If too hard, do tuck-ups (knees bent). 3 sets of 10, rest 20 sec.',
          emoji: '✌️',
          duration: 150,
          hasReps: false,
        },
        {
          id: 'fri_hollow_hold',
          label: 'Hollow Body Hold — 2×20 sec',
          instruction: 'Lie on your back. Press your lower back into the floor — no gap. Lift your shoulders and legs a few inches off the floor. Hold it. Everything is tight. If your back lifts off the floor, raise your legs higher until it doesn\'t. 2 rounds of 20 sec, rest 15 sec.',
          emoji: '🎯',
          duration: 120,
          hasReps: false,
        },
      ],
    },
  ],
}

const DAYS: Record<string, DayWorkout> = {
  monday: MONDAY,
  tuesday: TUESDAY,
  wednesday: WEDNESDAY,
  thursday: THURSDAY,
  friday: FRIDAY,
}
const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

// ─── Timer Component ──────────────────────────────────────────────────────────
function DrillTimer({ duration, drillId, onComplete }: {
  duration: number
  drillId: string
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
        <span className="text-2xl font-black text-green-400 tabular-nums">
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
        <div className="flex-1 bg-gray-800 rounded-full h-2">
          <div
            className="bg-green-400 h-2 rounded-full transition-all"
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
              : 'bg-green-400 text-black'
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
export default function AddisonPage() {
  const [selectedDay, setSelectedDay] = useState<string>('monday')
  const [reps, setReps] = useState<Record<string, string>>({})
  const [completedDrills, setCompletedDrills] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const day = DAYS[selectedDay]

  function handleDayChange(id: string) {
    setSelectedDay(id)
    setReps({})
    setCompletedDrills({})
    setNotes('')
    setSubmitted(false)
    setError('')
  }

  function markDone(drillId: string) {
    setCompletedDrills(prev => ({ ...prev, [drillId]: true }))
  }

  function updateReps(drillId: string, val: string) {
    setReps(prev => ({ ...prev, [drillId]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/addison/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          day: selectedDay,
          dayLabel: day.label,
          dayEmoji: day.emoji,
          tagline: day.tagline,
          reps,
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

  const totalDrills = day.sections.flatMap(s => s.drills).length
  const doneDrills = Object.values(completedDrills).filter(Boolean).length

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 text-center">
        <div className="text-6xl mb-4">⚽</div>
        <h1 className="text-3xl font-black text-green-400 mb-2">Sent to Dad!</h1>
        <p className="text-gray-400 mb-8">Nice work, Addison. Consistency wins games.</p>
        <button
          onClick={() => { setSubmitted(false); setReps({}); setCompletedDrills({}); setNotes('') }}
          className="bg-green-400 text-black font-black py-4 px-8 rounded-2xl active:scale-95"
        >
          Do Another Workout
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white pb-12">
      {/* Header */}
      <div className="bg-black border-b border-green-900 px-4 pt-10 pb-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-black text-green-400 mb-0.5">⚽ Addison's Training</h1>
          <p className="text-gray-500 text-sm mb-4">Soccer Strength · Pick your day</p>

          {/* Day selector */}
          <div className="grid grid-cols-5 gap-1.5">
            {DAY_ORDER.map(id => {
              const d = DAYS[id]
              const isActive = selectedDay === id
              return (
                <button
                  key={id}
                  onClick={() => handleDayChange(id)}
                  className={`rounded-xl py-2.5 px-1 flex flex-col items-center gap-0.5 transition-all border ${
                    isActive
                      ? 'bg-green-400 border-green-300 text-black'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-green-800'
                  }`}
                >
                  <span className="text-base">{d.emoji}</span>
                  <span className="text-xs font-black">{d.short}</span>
                </button>
              )
            })}
          </div>

          {/* Selected day info */}
          <div className="mt-3 bg-gray-950 border border-green-900 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-black">{day.emoji} {day.label}</p>
                <p className="text-gray-500 text-sm">{day.tagline}</p>
              </div>
              {doneDrills > 0 && (
                <div className="text-right">
                  <p className="text-green-400 font-black text-lg">{doneDrills}/{totalDrills}</p>
                  <p className="text-gray-600 text-xs">done</p>
                </div>
              )}
            </div>
            {doneDrills > 0 && (
              <div className="mt-2 bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-green-400 h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.round((doneDrills / totalDrills) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drills */}
      <form onSubmit={handleSubmit} className="px-4 pt-6 max-w-lg mx-auto">
        {day.sections.map(section => {
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
                          ? 'bg-gray-900 border-gray-700 opacity-60'
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
                            onComplete={() => {}}
                          />
                          {drill.hasReps && (
                            <div className="mt-3">
                              <label className="text-green-400 text-sm font-black mb-1 block">
                                {drill.repsLabel || 'Reps / Weight'}
                              </label>
                              <input
                                type="text"
                                value={reps[drill.id] || ''}
                                onChange={e => updateReps(drill.id, e.target.value)}
                                placeholder="Enter value..."
                                className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-700 focus:border-green-400 focus:outline-none text-lg font-black"
                              />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => markDone(drill.id)}
                            className="mt-3 w-full py-3 rounded-xl font-black text-sm transition-all active:scale-95 bg-green-400 text-black"
                          >
                            Mark Done ✓
                          </button>
                        </>
                      )}

                      {isDone && drill.hasReps && reps[drill.id] && (
                        <p className="mt-2 text-green-400 font-black text-sm">
                          {drill.repsLabel || 'Logged'}: {reps[drill.id]}
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
            placeholder="How'd it go? Any exercises that felt hard or easy?"
            rows={3}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-800 focus:border-green-400 focus:outline-none placeholder-gray-600 resize-none text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-green-400 hover:bg-green-300 disabled:bg-gray-800 disabled:text-gray-600 text-black font-black text-lg py-5 rounded-2xl transition-all active:scale-95"
        >
          {submitting ? 'Sending...' : '📤 Send Results to Dad'}
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">njsbuilds.com/addison</p>
      </form>
    </div>
  )
}
