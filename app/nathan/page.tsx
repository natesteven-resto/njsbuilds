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
  taglinePower: string
  taglineShooting: string
  powerSections: Section[]
  shootingSections: Section[]
  birthday?: boolean
}

// ─── CORE (shared) ─────────────────────────────────────────────────────────
const CORE: Section = {
  title: '🔥 Core',
  color: 'text-red-400',
  bg: 'border-red-900',
  exercises: [
    {
      id: 'core_plank',
      label: 'Plank Hold — 3×45 sec',
      instruction: 'Forearms on ground, body a straight line from head to heels. No sagging hips, no raised butt. Squeeze abs AND glutes the whole time. Rest 30 sec between rounds.',
      emoji: '🪨',
    },
    {
      id: 'core_hollow',
      label: 'Hollow Hold — 3×30 sec',
      instruction: 'Lie on your back, arms overhead. Lift shoulders AND legs a few inches off the ground. Press your lower back completely flat against the floor the whole time. You should look like a slight banana shape. This is the core foundation that transfers force from your legs to your jump.',
      emoji: '🍌',
    },
    {
      id: 'core_russian',
      label: 'Russian Twists (30lb KB) — 3×20',
      instruction: 'Sit with knees bent, lean back slightly to engage your abs, hold the 30lb KB at your chest. Rotate side to side, touching the KB near the floor each side. 20 total reps = 10 per side. Keep your feet off the floor for extra difficulty.',
      emoji: '🔄',
    },
  ],
}

// ─── MONDAY — Lower Body Power ──────────────────────────────────────────────
const MONDAY: DayPlan = {
  label: 'Monday',
  shortLabel: 'MON',
  emoji: '🏋️',
  taglinePower: 'Smith Squats · Box Jumps · Calf Power',
  taglineShooting: 'Form Shooting · Free Throws · Spot Work',
  powerSections: [
    {
      title: '🔥 Warmup',
      color: 'text-orange-400',
      bg: 'border-orange-900',
      exercises: [
        {
          id: 'mon_warmup_swing',
          label: 'Dynamic Leg Swings — 2×10 each leg',
          instruction: 'Hold onto the Smith machine bar for balance. Swing one leg forward and back in a big controlled arc — stay loose in the hip. 10 per leg per round, 2 rounds. Gets the hip flexors and hamstrings warm before loading.',
          emoji: '🦵',
        },
        {
          id: 'mon_warmup_squat',
          label: 'Bodyweight Squats — 2×15',
          instruction: 'No weight. Full depth — thighs parallel or lower, chest up, knees track over toes. This is your movement check. If something feels off, don\'t load today. 2 sets of 15 reps.',
          emoji: '⬇️',
        },
      ],
    },
    {
      title: '🏋️ Smith Machine Strength',
      color: 'text-blue-400',
      bg: 'border-blue-900',
      exercises: [
        {
          id: 'mon_smith_squat',
          label: 'Smith Machine Back Squat — 4×8',
          instruction: 'Bar at shoulder height. Step under it — bar rests on your upper back (traps), not your neck. Feet shoulder-width apart. Squat to parallel or deeper. Drive through your WHOLE foot on the way up — think "push the floor away." Keep your chest up the whole time. This is the #1 exercise for vertical jump. Start light, build each set.',
          emoji: '🏋️',
        },
        {
          id: 'mon_kb_rdl',
          label: 'Single-Leg KB Deadlift (40lb) — 3×8 each',
          instruction: 'Stand on one leg, hold the 40lb KB in the opposite hand. Hinge at the hip — let the KB travel toward the floor as your free leg goes straight back behind you. Stop when your back is parallel to the floor. Drive through your heel to stand back up. Hamstrings and glutes = your jumping engine.',
          emoji: '🎯',
        },
        {
          id: 'mon_calf_raise',
          label: 'Single-Leg Calf Raises — 4×15 each',
          instruction: 'Stand on the edge of a step (or the box) on one foot, heel hanging off. Lower slow — 3 full seconds down. Then drive all the way up to tiptoes and hold 1 second. Full range of motion every rep. 4 sets of 15 per leg. Your calves are responsible for the final push-off in every jump — train them seriously.',
          emoji: '👟',
        },
      ],
    },
    {
      title: '⚡ Plyometrics',
      color: 'text-yellow-400',
      bg: 'border-yellow-900',
      exercises: [
        {
          id: 'mon_box_jump',
          label: 'Box Jumps — 4×5',
          instruction: 'Stand in front of the box. Full focus before every single rep. Bend deep, swing your arms back then forward, EXPLODE up. Land soft with both feet on the box — knees bent to absorb it. STEP down — never jump down. Full reset between reps. 4 sets of 5. These should feel maximal every time.',
          emoji: '📦',
        },
        {
          id: 'mon_band_jump',
          label: 'Resistance Band Jump Squats — 3×8',
          instruction: 'Stand on the band, hold the handles at shoulder height. Squat down, then jump as HIGH as possible against the resistance. Land soft, immediately reset your stance, go again. 3 sets of 8. The band overloads the upward drive — when you take it off, you jump higher.',
          emoji: '🔁',
        },
        {
          id: 'mon_broad_jump',
          label: 'Broad Jumps — 3×5',
          instruction: 'Two feet together. Bend deep, arms swing back then LAUNCH forward. Land soft on both feet, absorb in your knees. Walk back, full reset, go again. 3 sets of 5. Max distance on every single rep.',
          emoji: '💨',
        },
      ],
    },
    { ...CORE, exercises: CORE.exercises.map(e => ({ ...e, id: e.id + '_mon' })) },
  ],
  shootingSections: [
    {
      title: '🎯 Foundation',
      color: 'text-green-400',
      bg: 'border-green-900',
      exercises: [
        {
          id: 'mon_s_form',
          label: 'One-Hand Form Shooting — 25 makes',
          instruction: '5 feet from the basket, shooting hand only. Perfect arc every time — elbow under the ball, follow through and hold it until it goes through. Count makes ONLY. Get 25 makes before moving on.',
          emoji: '🎯',
        },
        {
          id: 'mon_s_ft',
          label: 'Free Throws — 30 shots',
          instruction: 'Same routine every single rep: bounce the ball, breathe, bend your knees, shoot, hold the follow-through. Track your makes. The goal is building a routine that won\'t break under pressure.',
          emoji: '🏀',
        },
      ],
    },
    {
      title: '📍 Spot Work',
      color: 'text-emerald-400',
      bg: 'border-emerald-900',
      exercises: [
        {
          id: 'mon_s_spots',
          label: 'Spot Shooting — 5 spots × 5 shots',
          instruction: '5 spots: left corner, left wing, top of key, right wing, right corner. 5 shots from each = 25 total. Catch in your pocket, set your feet, shoot. Track your makes from each spot — your weakest spot gets extra work later.',
          emoji: '📍',
        },
        {
          id: 'mon_s_pullup',
          label: 'Off-Dribble Pull-Ups — 20 reps',
          instruction: '1 hard dribble forward, pull up for a mid-range jumper. 10 from the right side, 10 from the left side. Hold your follow-through on every shot — don\'t drop your hand until you see the result.',
          emoji: '↗️',
        },
        {
          id: 'mon_s_catch',
          label: 'Catch & Shoot — 30 reps',
          instruction: 'Toss the ball off the backboard or wall to yourself, catch it moving, set your feet in ONE motion and shoot. 15 from left wing, 15 from right wing. The goal is catching and shooting as fast as possible while keeping your form clean.',
          emoji: '🤝',
        },
      ],
    },
  ],
}

// ─── TUESDAY — Upper Body Strength ─────────────────────────────────────────
const TUESDAY: DayPlan = {
  label: 'Tuesday',
  shortLabel: 'TUE',
  emoji: '💪',
  taglinePower: 'Bench Press · Cable Work · KB Swings',
  taglineShooting: 'Off-Movement Shots · Mid-Range · Pressure FTs',
  powerSections: [
    {
      title: '🏋️ Smith Machine Push',
      color: 'text-purple-400',
      bg: 'border-purple-900',
      exercises: [
        {
          id: 'tue_bench',
          label: 'Smith Machine Bench Press — 4×8',
          instruction: 'Lie on a bench under the bar. Bar starts directly over your chest. Lower with control — 2 seconds down — touch your chest lightly, then press up explosively. Feet flat on the floor, shoulder blades pinched together. Start light — first time on the machine. Build each set.',
          emoji: '🔼',
        },
        {
          id: 'tue_landmine',
          label: 'Landmine Press — 3×10 each arm',
          instruction: 'Load the landmine attachment. Hold the end of the bar at shoulder height with one hand. Press it up and slightly forward at an angle. This builds strength in the exact motion of a jump shot — shoulder, tricep, upper chest all fire together. Keep your core braced. 3 sets of 10 per arm.',
          emoji: '📐',
        },
        {
          id: 'tue_lateral_raise',
          label: 'Lateral Raises (bands or light weight) — 3×12',
          instruction: 'Arms at your sides. Raise both arms out to shoulder height — slight bend in the elbows throughout. Lower SLOW — 3 seconds down. Light weight, perfect form. Builds the shoulder width and stability needed for consistent shooting. 3 sets of 12.',
          emoji: '↔️',
        },
      ],
    },
    {
      title: '🦾 Cable Pull',
      color: 'text-cyan-400',
      bg: 'border-cyan-900',
      exercises: [
        {
          id: 'tue_lat_pull',
          label: 'Cable Lat Pulldown — 4×10',
          instruction: 'Set the cable crossover to the top, attach a straight bar or lat bar. Sit or kneel below it. Pull the bar down to your upper chest — drive your ELBOWS down and back, not your hands. Squeeze your lats at the bottom. Builds the V-taper and the pulling strength for rebounds.',
          emoji: '⬇️',
        },
        {
          id: 'tue_cable_row',
          label: 'Cable Row (standing) — 3×12',
          instruction: 'Set cable at belly height. Stand with a slight bend in your knees, pull the handle to your hip — drive your elbow back hard past your side. Squeeze your shoulder blade at the end. A strong back = a stronger rebounder. 3 sets of 12.',
          emoji: '🎣',
        },
        {
          id: 'tue_face_pull',
          label: 'Cable Face Pulls — 3×15',
          instruction: 'Cable at head height. Grab the rope attachment (or both cables), pull toward your face — elbows HIGH and flared out, hands end up by your ears. Squeeze your shoulder blades together hard at the end. Protects your shoulders long-term and fixes forward posture. 3 sets of 15.',
          emoji: '🎯',
        },
      ],
    },
    {
      title: '⚡ Explosive',
      color: 'text-yellow-400',
      bg: 'border-yellow-900',
      exercises: [
        {
          id: 'tue_kb_swing',
          label: '30lb KB Swings — 4×15',
          instruction: 'Hinge at the hip, swing the KB back between your legs. Then SNAP your hips forward explosively — the KB floats up to chest height from the hip power alone. Your arms are just holding on. It\'s NOT a squat. 4 sets of 15. The posterior chain this builds (hamstrings, glutes) is what powers everything explosive you do.',
          emoji: '⚡',
        },
        {
          id: 'tue_clap_push',
          label: 'Clapping Push-Ups — 3×6',
          instruction: 'Standard push-up but push off so hard at the top that your hands leave the floor. Clap, land with soft elbows, absorb and go into the next one. 3 sets of 6. If you can\'t get air yet, focus on pushing off as explosively as possible every rep — that\'s the training stimulus.',
          emoji: '👏',
        },
      ],
    },
    { ...CORE, exercises: CORE.exercises.map(e => ({ ...e, id: e.id + '_tue' })) },
  ],
  shootingSections: [
    {
      title: '🌀 Off-Movement',
      color: 'text-green-400',
      bg: 'border-green-900',
      exercises: [
        {
          id: 'tue_s_curl',
          label: 'Curl Cut Mid-Range — 15 each side',
          instruction: 'Start at the free-throw line extended. Curl tight around the elbow (imaginary screen), catch the ball, rise up for a mid-range jumper. 15 curling to the left, 15 curling to the right. One of the most real-game shots you can practice — you use this every single game.',
          emoji: '🌀',
        },
        {
          id: 'tue_s_flare',
          label: 'Flare Cut 3s — 20 reps',
          instruction: 'Opposite of the curl — you\'re fading AWAY from the basket off an imaginary screen. Catch the ball on the 3-point line in rhythm, your feet are already set. 10 from left wing, 10 from right wing. These are hard to make when you\'re tired — stay focused on foot position.',
          emoji: '📡',
        },
      ],
    },
    {
      title: '🏀 Mid-Range',
      color: 'text-emerald-400',
      bg: 'border-emerald-900',
      exercises: [
        {
          id: 'tue_s_elbow',
          label: 'Elbow Jumpers — 20 total',
          instruction: '10 from the left elbow (free throw line extended), 10 from the right. The most reliable mid-range spot in basketball. Catch, 1 dribble to set your feet, rise and fire. Hold your follow-through until it goes through.',
          emoji: '⬜',
        },
        {
          id: 'tue_s_drive_pull',
          label: 'Drive & Pull-Up — 20 reps',
          instruction: 'Drive hard from the wing with 1-2 hard dribbles toward the basket. Defense collapses — you stop and pull up at the free throw line. 10 from the right, 10 from the left. Get your footwork automatic.',
          emoji: '💨',
        },
        {
          id: 'tue_s_ft_pressure',
          label: 'Pressure Free Throws — 25 shots',
          instruction: 'Before every free throw attempt: do 5 push-ups, then immediately go shoot. Shooting with an elevated heart rate = game conditions. Track your makes. This is training your routine to hold under stress.',
          emoji: '💥',
        },
      ],
    },
  ],
}

// ─── WEDNESDAY — Explosive Plyometrics & Speed ──────────────────────────────
const WEDNESDAY: DayPlan = {
  label: 'Wednesday',
  shortLabel: 'WED',
  emoji: '⚡',
  taglinePower: 'Depth Jumps · Lateral Speed · Sprints',
  taglineShooting: 'Transition Finishes · 3PT Work · Fatigue FTs',
  powerSections: [
    {
      title: '📦 Depth Work',
      color: 'text-yellow-400',
      bg: 'border-yellow-900',
      exercises: [
        {
          id: 'wed_depth_jump',
          label: 'Depth Drops — 3×5',
          instruction: 'Stand ON the box. Step off with one foot (don\'t jump off — just step). The INSTANT your feet hit the ground, spring straight up as high as you can. The keyword is INSTANT — minimum ground contact time. Think of the ground as a hot stovetop. 3 sets of 5. This is the most effective vertical training drill that exists.',
          emoji: '📦',
        },
        {
          id: 'wed_box_max',
          label: 'Max Effort Box Jumps — 4×4',
          instruction: 'These are your absolute maximum. Rest 90 seconds between sets. Every single jump is full effort. If you find a higher surface to jump on, use it. Start tracking what height you\'re hitting — you\'re building a record to beat every week.',
          emoji: '🚀',
        },
        {
          id: 'wed_vest_jump',
          label: 'Weighted Vest Jump Squats — 3×6',
          instruction: 'Put on the lightest vest setting. Squat down quick, explode up as high as you can. Land soft. Reset. The extra weight trains your nervous system to recruit MORE muscle fibers. When you take the vest off, your body overcorrects and you jump higher than normal.',
          emoji: '🦺',
        },
      ],
    },
    {
      title: '↔️ Lateral Speed',
      color: 'text-violet-400',
      bg: 'border-violet-900',
      exercises: [
        {
          id: 'wed_lateral_bound',
          label: 'Lateral Bounds — 4×6 each',
          instruction: 'Push off one leg to the side, land on the OTHER leg, hold your balance for a full 1 second before going back. The hold is critical — it builds the single-leg landing mechanics that prevent ankle injuries and build lateral power. 4 sets of 6 per leg.',
          emoji: '↔️',
        },
        {
          id: 'wed_band_shuffle',
          label: 'Resistance Band Lateral Shuffle — 3×10 yards each way',
          instruction: 'Band around your ankles (or above knees). Stay in defensive stance — bent knees, chest up, butt down. Shuffle sideways 10 yards one way, then shuffle back. 3 trips each direction. This is the footwork that makes you defensively unguardable.',
          emoji: '🔁',
        },
        {
          id: 'wed_broad_vest',
          label: 'Broad Jumps with Vest — 3×4',
          instruction: 'Same broad jump as Monday — but with the weighted vest on. Jump as far as possible, land soft. Walk back, full reset, go again. 3 sets of 4. Max distance every rep.',
          emoji: '💪',
        },
      ],
    },
    {
      title: '💨 Sprint Work',
      color: 'text-pink-400',
      bg: 'border-pink-900',
      exercises: [
        {
          id: 'wed_sprint',
          label: 'Sprint Intervals — 4×20 yards',
          instruction: 'Find 20 yards of space. Sprint FULL SPEED — not 90%, not "pretty fast." Absolute max. Walk back, catch your breath, go again. 4 reps. 20 yards of full-speed work does more for basketball quickness than 20 minutes of jogging.',
          emoji: '💨',
        },
        {
          id: 'wed_band_sprint',
          label: 'Resistance Band Sprint — 3×15 yards',
          instruction: 'Anchor one end of the band low behind you, attach the other end around your waist. Sprint 15 yards against the resistance. Walk back. 3 reps. When the band comes off, you\'ll feel like you\'re flying.',
          emoji: '⚡',
        },
        {
          id: 'wed_bulgarian',
          label: 'Bulgarian Split Squats (30lb KB each hand) — 3×8 each',
          instruction: 'Back foot elevated on the box or a bench. Front foot forward. Lower your back knee toward the floor. Keep your front shin as vertical as possible. 30lb KB in each hand. One of the best single-leg strength builders in basketball — builds the specific leg power for jumping off one foot.',
          emoji: '🏋️',
        },
      ],
    },
    { ...CORE, exercises: CORE.exercises.map(e => ({ ...e, id: e.id + '_wed' })) },
  ],
  shootingSections: [
    {
      title: '🏃 Transition Game',
      color: 'text-green-400',
      bg: 'border-green-900',
      exercises: [
        {
          id: 'wed_s_sprint_finish',
          label: 'Sprint to Finish — 10 each side',
          instruction: 'Sprint from half court (or far baseline). Pick up the ball, take 2 hard dribbles, finish at the rim. 10 from the right side, 10 from the left. FULL speed every rep. Finishing when you\'re flying is a completely different skill from finishing when you\'re fresh.',
          emoji: '🏃',
        },
        {
          id: 'wed_s_sprint_3',
          label: 'Sprint to 3-Pointer — 10 reps',
          instruction: 'Sprint to the 3-point line, pick up the ball (or catch it), set your feet and shoot a 3. 10 reps from different spots. Footwork has to be automatic when you\'re winded — that\'s game basketball.',
          emoji: '🎯',
        },
      ],
    },
    {
      title: '3️⃣ 3-Point Work',
      color: 'text-emerald-400',
      bg: 'border-emerald-900',
      exercises: [
        {
          id: 'wed_s_spot_3',
          label: '3-Point Spot Shooting — 8 shots from 3 spots',
          instruction: '8 from the left slot, 8 from the top of the key, 8 from the right slot = 24 total. Track your makes and percentage from each spot. At 14 with real 3-point range, you become very hard to guard.',
          emoji: '3️⃣',
        },
        {
          id: 'wed_s_stepback',
          label: 'Step-Back 3s — 10 each side',
          instruction: 'Drive toward the basket, hard crossover + step BACK to create space, pull up for a 3. 10 from the right, 10 from the left. This is the shot every guard needs now. Focus on being under control on the step-back — no off-balance flails.',
          emoji: '↩️',
        },
        {
          id: 'wed_s_ft_fatigue',
          label: 'Fatigue Free Throws — 25 shots',
          instruction: 'Do this LAST — after everything else. You should be tired. 25 free throws with burning legs. Track your makes. The mental routine is the same whether you\'re fresh or gassed — that\'s the whole point.',
          emoji: '😤',
        },
      ],
    },
  ],
}

// ─── THURSDAY — Full Body Strength ─────────────────────────────────────────
const THURSDAY: DayPlan = {
  label: 'Thursday',
  shortLabel: 'THU',
  emoji: '🔥',
  taglinePower: 'Deadlifts · KB Power · Full Circuit',
  taglineShooting: 'Game Shots · Off-Screen · Finishing',
  powerSections: [
    {
      title: '🏋️ Big Compound Lifts',
      color: 'text-blue-400',
      bg: 'border-blue-900',
      exercises: [
        {
          id: 'thu_smith_dl',
          label: 'Smith Machine Deadlift — 4×8',
          instruction: 'Set the bar low (about 8-10 inches off the ground). Stand with feet hip-width, bar over your mid-foot. Grip the bar, push the floor away — keep your back FLAT and chest up as the bar travels. Drive your hips forward at the top. Start with the bar only and add weight as your form locks in. The king of posterior chain development.',
          emoji: '🏋️',
        },
        {
          id: 'thu_smith_ohp',
          label: 'Smith Machine Overhead Press — 4×8',
          instruction: 'Set the bar at upper chest height. Press straight up, lock out at the top. Lower controlled to the start position. Keep your core BRACED the entire time — don\'t arch your lower back to get the weight up. Builds the overhead strength for paint finishing, boxing out, and shot release over length.',
          emoji: '🔼',
        },
        {
          id: 'thu_landmine_row',
          label: 'Landmine Bent-Over Row — 3×10 each arm',
          instruction: 'One arm: brace yourself with the opposite hand on a bench. Row the landmine bar up toward your hip, drive your elbow back past your side. Full range of motion — arm fully extended at the bottom, elbow fully back at the top. Builds the pulling strength that equals more contested rebounds.',
          emoji: '🎣',
        },
      ],
    },
    {
      title: '⚡ KB Power',
      color: 'text-yellow-400',
      bg: 'border-yellow-900',
      exercises: [
        {
          id: 'thu_kb_50_swing',
          label: '50lb KB Swings — 4×10',
          instruction: 'Heavy day — the big kettlebell. Hinge hard, swing it back, then SNAP your hips forward. The KB should float to chest height from hip power alone — your arms just hold on. 4 sets of 10, rest 90 seconds between sets. The 50lb version tests if your technique is clean or if you were just muscling it with the lighter ones.',
          emoji: '⚡',
        },
        {
          id: 'thu_kb_goblet',
          label: '50lb KB Goblet Squat — 3×8',
          instruction: 'Hold the 50lb KB at your chest (by the horns or cupped under the bell). Squat as deep as you can, chest up. Drive through your heels on the way up. 3 sets of 8. Heavy goblet squats build the glutes and quads that power your vertical jump.',
          emoji: '🔻',
        },
        {
          id: 'thu_vest_box',
          label: 'Weighted Vest Box Jumps — 3×5',
          instruction: 'Vest on. Max height box jumps. These will be harder than Monday — that\'s the progression. 3 sets of 5, full reset between every rep. When you take the vest off for tomorrow\'s birthday workout, your body will overcorrect and recruit extra muscle. Enjoy the result.',
          emoji: '🦺',
        },
      ],
    },
    {
      title: '💨 Conditioning',
      color: 'text-pink-400',
      bg: 'border-pink-900',
      exercises: [
        {
          id: 'thu_resisted_sprint',
          label: 'Resisted Sprint — 4×20 yards',
          instruction: 'Band around your waist, anchored behind you. Sprint 20 yards against the resistance. Walk back, rest 60 seconds, go again. 4 reps. Tomorrow is the birthday workout — leave something on the floor today.',
          emoji: '💨',
        },
        {
          id: 'thu_burpee',
          label: 'Burpees — 3×10',
          instruction: 'Down to the floor, push-up, jump up and clap overhead. 10 reps, 3 sets. Not glamorous — but burpees build the cardio base that keeps you fresh in the 4th quarter when everyone else is dying.',
          emoji: '🔄',
        },
      ],
    },
    { ...CORE, exercises: CORE.exercises.map(e => ({ ...e, id: e.id + '_thu' })) },
  ],
  shootingSections: [
    {
      title: '🌀 Off-Screen',
      color: 'text-green-400',
      bg: 'border-green-900',
      exercises: [
        {
          id: 'thu_s_curl',
          label: 'Curl Cut Mid-Range — 15 each side',
          instruction: 'Curl tight around the elbow (imaginary screen), catch, rise up for a mid-range. 15 from the left, 15 from the right. By now this should start to feel automatic.',
          emoji: '🌀',
        },
        {
          id: 'thu_s_flare_3',
          label: 'Flare Cut 3-Pointer — 15 each side',
          instruction: 'Fade away off the imaginary screen, catch on the 3-point line, shoot in rhythm. 15 from left wing, 15 from right wing. Catch and shoot from your pocket — not from your shoulders.',
          emoji: '📡',
        },
      ],
    },
    {
      title: '🏀 Finishing Moves',
      color: 'text-emerald-400',
      bg: 'border-emerald-900',
      exercises: [
        {
          id: 'thu_s_euro',
          label: 'Euro Step Finish — 10 each side',
          instruction: 'Drive toward the basket, take a big step one way (away from the imaginary shot-blocker), plant, then step the other way and finish. 10 going right, 10 going left. The euro step beats anyone trying to take a charge.',
          emoji: '↗️',
        },
        {
          id: 'thu_s_floater',
          label: 'Floaters — 10 each side',
          instruction: '1-2 step off a drive, loft a soft one-handed shot over the big man\'s reach. 10 from the right, 10 from the left. The floater is your answer to shot-blockers in the paint.',
          emoji: '🎈',
        },
        {
          id: 'thu_s_ft',
          label: 'Free Throws — 25 shots',
          instruction: 'End every session with free throws. Same routine every rep. Track your makes. You want this to be a habit so locked in that you could shoot free throws in your sleep.',
          emoji: '🏀',
        },
      ],
    },
  ],
}

// ─── FRIDAY — 🎂 14th Birthday Workout ─────────────────────────────────────
const FRIDAY: DayPlan = {
  label: 'Friday — Happy 14th! 🎂',
  shortLabel: 'FRI',
  emoji: '🎂',
  taglinePower: 'Birthday Circuit — 14 Reps of Everything',
  taglineShooting: '14-Spot Birthday Challenge',
  birthday: true,
  powerSections: [
    {
      title: '🎂 Birthday Power Circuit',
      color: 'text-yellow-400',
      bg: 'border-yellow-900',
      exercises: [
        {
          id: 'fri_squat_14',
          label: 'Smith Machine Squats — 14 reps 🎂',
          instruction: 'One set of 14. Pick a weight that\'s challenging but doable for every rep. Go deep, come up strong. 14 for 14 years.',
          emoji: '🏋️',
        },
        {
          id: 'fri_box_jump_14',
          label: 'Box Jumps — 14 reps (MAX HEIGHT) 🚀',
          instruction: 'One set of 14 max-height box jumps. Full reset between every rep — these should be the best jumps you\'ve done all week. Your body has been building toward this since Monday.',
          emoji: '📦',
        },
        {
          id: 'fri_kb_swing_14',
          label: '50lb KB Swings — 14 reps ⚡',
          instruction: 'The big kettlebell. 14 full reps, hip snap every single one. Don\'t let your form break in the back half.',
          emoji: '⚡',
        },
        {
          id: 'fri_bench_14',
          label: 'Smith Machine Bench Press — 14 reps 🔼',
          instruction: 'One set of 14 on the bench. Moderate weight, perfect form, all 14 reps.',
          emoji: '🔼',
        },
        {
          id: 'fri_calf_14',
          label: 'Calf Raises — 14 each leg 👟',
          instruction: '14 slow-and-controlled reps on the right leg, then 14 on the left. Full range — all the way down, all the way up.',
          emoji: '👟',
        },
        {
          id: 'fri_bound_14',
          label: 'Lateral Bounds — 14 each leg ↔️',
          instruction: '14 bounds off the right leg, 14 off the left. Big, explosive, hold each landing for 1 second.',
          emoji: '↔️',
        },
        {
          id: 'fri_pushup_14',
          label: 'Push-Ups — 14 reps 💪',
          instruction: 'Perfect form, all 14. Chest to the floor, lock out at the top.',
          emoji: '💪',
        },
        {
          id: 'fri_broad_14',
          label: 'Broad Jumps — 14 reps 💨',
          instruction: 'Finish strong. 14 broad jumps — max distance every single one. Walk back between each rep. End of the circuit.',
          emoji: '💨',
        },
      ],
    },
    { ...CORE, exercises: CORE.exercises.map(e => ({ ...e, id: e.id + '_fri' })) },
  ],
  shootingSections: [
    {
      title: '🎂 14-Spot Birthday Challenge',
      color: 'text-yellow-400',
      bg: 'border-yellow-900',
      exercises: [
        {
          id: 'fri_s_1',
          label: '1 — Right-Hand Layup',
          instruction: 'Right-hand layup off the right side. Simple. Get it done.',
          emoji: '1️⃣',
        },
        {
          id: 'fri_s_2',
          label: '2 — Left-Hand Layup',
          instruction: 'Left-hand layup off the left side. Finish it clean.',
          emoji: '2️⃣',
        },
        {
          id: 'fri_s_3',
          label: '3 — Right Block',
          instruction: 'From the right block (low post on the right side). Short off-the-glass shot.',
          emoji: '3️⃣',
        },
        {
          id: 'fri_s_4',
          label: '4 — Left Block',
          instruction: 'From the left block. Short banker off glass.',
          emoji: '4️⃣',
        },
        {
          id: 'fri_s_5',
          label: '5 — Right Low Wing',
          instruction: 'About 10 feet out on the right wing. Pull-up jumper.',
          emoji: '5️⃣',
        },
        {
          id: 'fri_s_6',
          label: '6 — Left Low Wing',
          instruction: 'About 10 feet out on the left wing. Same shot, opposite side.',
          emoji: '6️⃣',
        },
        {
          id: 'fri_s_7',
          label: '7 — Free Throw',
          instruction: 'The free throw line. Routine. Breathe. Make it.',
          emoji: '7️⃣',
        },
        {
          id: 'fri_s_8',
          label: '8 — Right Elbow',
          instruction: 'Right elbow (free throw line extended, right side). Jump shot.',
          emoji: '8️⃣',
        },
        {
          id: 'fri_s_9',
          label: '9 — Left Elbow',
          instruction: 'Left elbow. Same shot. Hold your follow-through.',
          emoji: '9️⃣',
        },
        {
          id: 'fri_s_10',
          label: '10 — Right Wing 3',
          instruction: 'Right wing, behind the 3-point line. First 3 of the challenge.',
          emoji: '🔟',
        },
        {
          id: 'fri_s_11',
          label: '11 — Top-of-Key 3',
          instruction: 'Top of the key, 3-pointer. Middle of the floor.',
          emoji: '💫',
        },
        {
          id: 'fri_s_12',
          label: '12 — Left Wing 3',
          instruction: 'Left wing, behind the 3-point line. Getting tougher now.',
          emoji: '⭐',
        },
        {
          id: 'fri_s_13',
          label: '13 — Euro Step Finish',
          instruction: 'Drive hard, euro step, finish strong. Your call which side.',
          emoji: '✨',
        },
        {
          id: 'fri_s_14',
          label: '14 — Birthday Free Throw 🎂',
          instruction: 'One last free throw. Same routine you\'ve been building all week. Make it. That\'s 14.',
          emoji: '🎂',
        },
      ],
    },
  ],
}

// ─── REGISTRY ───────────────────────────────────────────────────────────────
const DAYS: Record<string, DayPlan> = {
  monday: MONDAY,
  tuesday: TUESDAY,
  wednesday: WEDNESDAY,
  thursday: THURSDAY,
  friday: FRIDAY,
}

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

// ─── VIDEO MAP ──────────────────────────────────────────────────────────────
// Keys match exercise IDs (or their base without _mon/_tue/etc suffix)
// id = specific YouTube video ID (embedded inline)
// search = fallback YouTube search query (opens new tab)
const VIDEO_MAP: Record<string, { id?: string; search: string }> = {
  // Smith Machine
  mon_smith_squat: { id: 'yoP29LtTdnQ', search: 'smith machine back squat proper form' },
  tue_bench:       { id: '7FyJdsXeta8', search: 'smith machine bench press tutorial' },
  thu_smith_dl:    { id: 'ONRRAgNLVac', search: 'smith machine deadlift proper form' },
  thu_smith_ohp:   { search: 'smith machine overhead press tutorial' },
  fri_squat_14:    { id: 'yoP29LtTdnQ', search: 'smith machine back squat form' },
  fri_bench_14:    { id: '7FyJdsXeta8', search: 'smith machine bench press' },

  // Kettlebell
  mon_kb_rdl:      { search: 'single leg kettlebell Romanian deadlift tutorial' },
  tue_kb_swing:    { id: 'pAWaNCsncZA', search: 'kettlebell swing tutorial beginners' },
  thu_kb_50_swing: { id: 'pAWaNCsncZA', search: 'kettlebell swing proper form' },
  thu_kb_goblet:   { search: 'kettlebell goblet squat tutorial' },
  wed_bulgarian:   { id: '72bspMLvOvg', search: 'kettlebell Bulgarian split squat' },
  fri_kb_swing_14: { id: 'pAWaNCsncZA', search: 'kettlebell swing' },

  // Calf / Lower
  mon_calf_raise: { id: 'u1Yc75YdiJA', search: 'single leg calf raise full range' },
  fri_calf_14:    { id: 'u1Yc75YdiJA', search: 'single leg calf raise' },

  // Plyometrics
  mon_box_jump:    { id: 'Bc_ycZFCEvQ', search: 'box jump technique plyometrics' },
  mon_band_jump:   { search: 'resistance band jump squat tutorial' },
  mon_broad_jump:  { search: 'broad jump form plyometrics' },
  wed_depth_jump:  { id: 'fL66hVKR89Q', search: 'depth drop jump plyometrics tutorial' },
  wed_box_max:     { id: 'Bc_ycZFCEvQ', search: 'box jump technique max height' },
  wed_vest_jump:   { search: 'weighted vest jump squat training' },
  wed_lateral_bound: { id: 'QtCYUohMzJY', search: 'lateral bounds vertical jump training' },
  wed_band_shuffle:  { search: 'resistance band lateral shuffle defensive footwork basketball' },
  wed_broad_vest:    { search: 'broad jump plyometrics form' },
  thu_vest_box:      { id: 'Bc_ycZFCEvQ', search: 'box jump technique' },
  fri_box_jump_14:   { id: 'Bc_ycZFCEvQ', search: 'box jump technique' },
  fri_bound_14:      { id: 'QtCYUohMzJY', search: 'lateral bounds vertical training' },
  fri_broad_14:      { search: 'broad jump form plyometrics' },

  // Cable
  tue_lat_pull:   { id: 'CAwf7n6Luuc', search: 'lat pulldown proper form tutorial' },
  tue_cable_row:  { search: 'standing cable row proper form tutorial' },
  tue_face_pull:  { id: 'uty8Gti1X9M', search: 'cable face pull proper form' },
  thu_landmine_row: { search: 'landmine row exercise tutorial' },

  // Upper Body
  tue_landmine:      { search: 'landmine press shoulder tutorial' },
  tue_lateral_raise: { search: 'lateral raise proper form shoulder' },
  tue_clap_push:     { search: 'clapping push up explosive plyometric tutorial' },

  // Sprint / Speed
  wed_sprint:      { search: 'sprint technique speed training basketball' },
  wed_band_sprint: { search: 'resistance band sprint overspeed training' },
  thu_resisted_sprint: { search: 'resistance band resisted sprint training' },

  // Conditioning
  thu_burpee: { search: 'proper burpee form tutorial' },

  // Core — keyed WITHOUT day suffix (stripped at lookup time)
  core_plank:   { search: 'perfect plank form proper technique' },
  core_hollow:  { search: 'hollow hold gymnastics core tutorial' },
  core_russian: { search: 'Russian twist kettlebell core tutorial' },
}

// Strip day suffix so core exercises (re-used across days) resolve via base key
function getVideoEntry(exerciseId: string) {
  const baseId = exerciseId.replace(/_(?:mon|tue|wed|thu|fri|bday)$/, '')
  return VIDEO_MAP[exerciseId] ?? VIDEO_MAP[baseId] ?? null
}

function getDefaultDay(): string {
  const dow = new Date().getDay()
  if (dow === 1) return 'monday'
  if (dow === 2) return 'tuesday'
  if (dow === 3) return 'wednesday'
  if (dow === 4) return 'thursday'
  if (dow === 5) return 'friday'
  return 'monday'
}

export default function NathanWorkout() {
  const [selectedDay, setSelectedDay] = useState<string>('monday')
  const [mode, setMode] = useState<'power' | 'shooting'>('power')
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [videoModal, setVideoModal] = useState<{ exerciseId: string; label: string } | null>(null)

  useEffect(() => {
    setSelectedDay(getDefaultDay())
  }, [])

  const plan = DAYS[selectedDay]
  const sections = mode === 'power' ? plan.powerSections : plan.shootingSections
  const allIds = sections.flatMap(s => s.exercises.map(e => e.id))
  const completedCount = allIds.filter(id => done[id]).length
  const totalCount = allIds.length
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

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

  const handleModeChange = (newMode: 'power' | 'shooting') => {
    setMode(newMode)
    setDone({})
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
          mode: mode === 'power' ? 'Strength & Plyometrics' : 'Basketball Shooting',
          exercises: sections.flatMap(s =>
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
          <div className="text-7xl mb-4">{plan.birthday ? '🎂' : '🏀'}</div>
          <h1 className="text-3xl font-black text-white mb-2">Work done.</h1>
          <p className="text-gray-400 text-lg">Dad got the report. See you next session.</p>
          {plan.birthday && (
            <p className="text-yellow-400 text-xl font-black mt-3">Happy 14th Birthday! 🎉</p>
          )}
        </div>
      </div>
    )
  }

  const accent = plan.birthday ? 'orange' : 'orange'
  const headerBg = plan.birthday
    ? 'bg-gradient-to-b from-yellow-600 to-yellow-900'
    : 'bg-gradient-to-b from-orange-600 to-orange-900'
  const btnColor = plan.birthday ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-orange-500 hover:bg-orange-600'
  const markDoneColor = plan.birthday ? 'bg-yellow-500' : 'bg-orange-500'

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      {/* Header */}
      <div className={`px-6 pt-10 pb-6 ${headerBg}`}>
        <div className="text-4xl mb-1">{plan.birthday ? '🎂' : '🏀'}</div>
        <h1 className="text-3xl font-black">Nathan&apos;s Workout</h1>
        {plan.birthday && (
          <p className="text-yellow-200 font-bold text-base mt-0.5">Happy 14th Birthday! 🎉</p>
        )}
        <p className="text-orange-200 text-sm mt-1">{today}</p>

        {/* Progress */}
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

      {/* Day + Mode Selectors */}
      <div className="px-4 pt-5 max-w-lg mx-auto">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Select Day</p>
        <div className="grid grid-cols-5 gap-1.5">
          {DAY_ORDER.map(day => {
            const d = DAYS[day]
            const isActive = selectedDay === day
            return (
              <button
                key={day}
                onClick={() => handleDayChange(day)}
                className={`rounded-xl py-3 flex flex-col items-center gap-1 transition-all border ${
                  isActive
                    ? d.birthday
                      ? 'bg-yellow-500 border-yellow-400 text-white'
                      : 'bg-orange-500 border-orange-400 text-white'
                    : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span className="text-base">{d.emoji}</span>
                <span className="text-xs font-black">{d.shortLabel}</span>
              </button>
            )
          })}
        </div>

        {/* Mode Toggle */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => handleModeChange('power')}
            className={`rounded-xl py-3 px-2 flex items-center justify-center gap-1.5 font-black text-sm transition-all border ${
              mode === 'power'
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'
            }`}
          >
            💪 Strength & Plyo
          </button>
          <button
            onClick={() => handleModeChange('shooting')}
            className={`rounded-xl py-3 px-2 flex items-center justify-center gap-1.5 font-black text-sm transition-all border ${
              mode === 'shooting'
                ? 'bg-green-600 border-green-500 text-white'
                : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-600'
            }`}
          >
            🏀 Shooting
          </button>
        </div>

        {/* Day summary card */}
        <div className="mt-3 bg-gray-950 border border-gray-800 rounded-xl px-4 py-3">
          <p className="text-white font-black">{plan.emoji} {plan.label}</p>
          <p className="text-gray-500 text-sm">
            {mode === 'power' ? plan.taglinePower : plan.taglineShooting}
          </p>
        </div>
      </div>

      {/* Workout */}
      <form onSubmit={handleSubmit} className="px-4 pt-6 max-w-lg mx-auto">
        {sections.map(section => (
          <div key={section.title} className="mb-8">
            <h2 className={`text-lg font-black mb-3 ${section.color}`}>{section.title}</h2>
            <div className="space-y-3">
              {section.exercises.map(ex => (
                <div
                  key={ex.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    done[ex.id]
                      ? 'bg-gray-900 border-gray-700 opacity-60'
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
                  <div className="mt-3 flex gap-2">
                    {!done[ex.id] && getVideoEntry(ex.id) && (
                      <button
                        type="button"
                        onClick={() => setVideoModal({ exerciseId: ex.id, label: ex.label })}
                        className="flex-none bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-sm py-3 px-4 rounded-xl transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        ▶ How to
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggle(ex.id)}
                      className={`flex-1 py-3 rounded-xl font-black text-sm transition-all active:scale-95 ${
                        done[ex.id] ? 'bg-gray-800 text-gray-500' : `${markDoneColor} text-white`
                      }`}
                    >
                      {done[ex.id] ? '✓ Done' : 'Mark Done'}
                    </button>
                  </div>
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
            placeholder="How'd it go? Anything feel hard or easy today?"
            rows={3}
            className="w-full bg-gray-900 text-white rounded-xl px-4 py-3 border border-gray-800 focus:border-orange-500 focus:outline-none placeholder-gray-600 resize-none text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full disabled:bg-gray-800 text-white font-black text-lg py-5 rounded-2xl transition-all active:scale-95 ${btnColor}`}
        >
          {submitting ? 'Sending...' : '📤 Send Results to Dad'}
        </button>
        <p className="text-center text-gray-600 text-xs mt-3">njsbuilds.com/nathan</p>
      </form>

      {/* Video Modal */}
      {videoModal && (() => {
        const entry = getVideoEntry(videoModal.exerciseId)
        if (!entry) return null
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/85"
              onClick={() => setVideoModal(null)}
            />
            {/* Bottom sheet */}
            <div className="relative bg-gray-950 rounded-t-3xl border-t border-gray-800 p-4 pb-10 max-h-[85vh] overflow-y-auto">
              {/* Handle */}
              <div className="w-10 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
              {/* Header */}
              <div className="flex items-start justify-between mb-4 gap-3">
                <p className="text-white font-black text-sm leading-snug flex-1">{videoModal.label}</p>
                <button
                  onClick={() => setVideoModal(null)}
                  className="text-gray-500 hover:text-white text-2xl leading-none flex-none mt-[-2px]"
                >
                  ×
                </button>
              </div>

              {entry.id ? (
                // Embedded YouTube video
                <div
                  className="relative w-full rounded-xl overflow-hidden bg-black"
                  style={{ paddingBottom: '56.25%', height: 0 }}
                >
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`https://www.youtube.com/embed/${entry.id}?rel=0&modestbranding=1&playsinline=1`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                // Search fallback
                <div className="text-center py-8">
                  <div className="text-5xl mb-4">▶</div>
                  <p className="text-gray-300 font-bold mb-1">Watch a tutorial</p>
                  <p className="text-gray-500 text-sm mb-6">Opens YouTube in a new tab — your workout progress is saved here</p>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(entry.search)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-red-600 hover:bg-red-700 text-white font-black px-8 py-4 rounded-xl text-sm active:scale-95 transition-all"
                  >
                    🔍 Search: {entry.search}
                  </a>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
