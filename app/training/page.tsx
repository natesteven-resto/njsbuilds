'use client'

import { useState, useEffect } from 'react'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Criterion = { id: string; text: string }

type Skill = {
  id: string
  name: string
  emoji: string
  description: string
  tip: string
  criteria: Criterion[]
}

type Phase = {
  id: string
  title: string
  emoji: string
  subtitle: string
  ageRange: string
  dateRange: string
  accentColor: string
  skills: Skill[]
}

// ─── TRAINING DATA ────────────────────────────────────────────────────────────

const phases: Phase[] = [
  {
    id: 'welcome',
    title: 'Welcome Home',
    emoji: '🏠',
    subtitle: 'First days — building trust, safety, and routine',
    ageRange: '7–9 weeks',
    dateRange: 'May 22 – Jun 5',
    accentColor: '#e8a840',
    skills: [
      {
        id: 'first-night',
        name: 'First Night',
        emoji: '🌙',
        description: 'Survive night one with minimal trauma — his and yours.',
        tip: "Put a worn t-shirt in the crate. Keep it beside your bed the first week. Vizslas are velcro dogs — closeness is everything at this age.",
        criteria: [
          { id: 'fn1', text: 'Crate placed in your bedroom for first 1–2 weeks' },
          { id: 'fn2', text: "Worn t-shirt or breeder's blanket in crate for scent comfort" },
          { id: 'fn3', text: 'Settles without sustained panic (some whining is normal)' },
          { id: 'fn4', text: 'Nighttime cry = assume potty need — out, pee, back in crate (no lights, no talking, no play)' },
          { id: 'fn5', text: 'Morning started calmly — reward settles, not the crying' },
        ],
      },
      {
        id: 'crate-den',
        name: 'Crate = Safe Den',
        emoji: '🏕️',
        description: 'The crate must become his happy place. Never use it as punishment.',
        tip: "Feed every meal in the crate. Toss treats in randomly throughout the day. Let him go in and out freely. The goal: he walks in on his own because he wants to.",
        criteria: [
          { id: 'cd1', text: 'Enters crate willingly for meals — no hesitation' },
          { id: 'cd2', text: 'Will enter on own to investigate treats/toys' },
          { id: 'cd3', text: 'Settles within 5 minutes of being closed in' },
          { id: 'cd4', text: 'No sustained distress barking after 10 minutes' },
          { id: 'cd5', text: 'Naps in crate voluntarily 3+ times' },
        ],
      },
      {
        id: 'potty-basics',
        name: 'Potty Training',
        emoji: '🌿',
        description: 'Take him out constantly. You literally cannot do this too much.',
        tip: "Every 30–45 min during wake hours. Always after naps, meals, and play. Same spot. Same word. Big reward when he goes outside. Accidents = your fault — he wasn't supervised.",
        criteria: [
          { id: 'pb1', text: 'Taken outside every 30–45 minutes when awake' },
          { id: 'pb2', text: 'Taken out immediately after every nap, meal, and play session' },
          { id: 'pb3', text: 'Using a consistent command word every single time' },
          { id: 'pb4', text: 'Showing signals before accidents — sniffing, circling, squatting' },
          { id: 'pb5', text: '3+ consecutive days without an indoor accident' },
        ],
      },
      {
        id: 'name',
        name: 'Name Recognition',
        emoji: '👂',
        description: "His name = the foundation of every command you'll ever teach.",
        tip: "Say his name once. When he looks at you — ANY look — mark it and reward. Never repeat his name over and over. That teaches him to ignore it.",
        criteria: [
          { id: 'nr1', text: "Looks at you when name called — 5/5 times indoors" },
          { id: 'nr2', text: 'Looks at you when name called — 4/5 times outdoors' },
          { id: 'nr3', text: 'Responds within 2 seconds consistently' },
          { id: 'nr4', text: 'You only say his name ONCE per call (no repeating)' },
        ],
      },
      {
        id: 'family',
        name: 'Meet the Family',
        emoji: '👨‍👩‍👧‍👦',
        description: 'Every person in the house needs to be safe and trusted.',
        tip: "Let him approach on his own terms — don't force it. Kids especially need coaching: no grabbing, no screaming in his face, no chasing. Calm wins.",
        criteria: [
          { id: 'mf1', text: 'Comfortable with all household members — no hiding or fear' },
          { id: 'mf2', text: 'Kids coached on gentle interactions (no grabbing)' },
          { id: 'mf3', text: 'Approaches family members willingly for pets/play' },
          { id: 'mf4', text: 'Comfortable with gentle handling: ears, paws, mouth checked' },
        ],
      },
    ],
  },
  {
    id: 'foundation',
    title: 'Foundation Obedience',
    emoji: '🐾',
    subtitle: 'Core commands — the building blocks for everything',
    ageRange: '9–13 weeks',
    dateRange: 'Jun 5 – Jul 3',
    accentColor: '#c67c2e',
    skills: [
      {
        id: 'sit',
        name: 'Sit',
        emoji: '🎯',
        description: 'The cornerstone of impulse control. Everything builds from sit.',
        tip: "Lure with treat to nose, raise back over head — butt hits ground. Mark (\"yes!\") and reward instantly. 5–10 min sessions, twice a day. Always end on success.",
        criteria: [
          { id: 'sit1', text: 'Sits on hand signal (treat lure) — 8/10 times' },
          { id: 'sit2', text: 'Sits on verbal command alone — 8/10 times' },
          { id: 'sit3', text: 'Sits in 3+ different locations (kitchen, yard, living room)' },
          { id: 'sit4', text: 'Sits with mild distractions present' },
          { id: 'sit5', text: 'Holds sit for 3 seconds without moving' },
        ],
      },
      {
        id: 'come',
        name: 'Come / Recall',
        emoji: '💨',
        description: "The most critical safety command. Never punish a dog that comes to you — EVER.",
        tip: "Run AWAY from him — dogs chase things that flee. Drop to one knee. Wild celebration when he arrives. If he doesn't come, never repeat 'come come come' — go get him, reset closer.",
        criteria: [
          { id: 'cm1', text: 'Comes when called from 10 feet indoors — 4/5 times' },
          { id: 'cm2', text: 'Comes when called from 10 feet outdoors' },
          { id: 'cm3', text: 'RULE CONFIRMED: Never punished when he comes (even if he was naughty)' },
          { id: 'cm4', text: 'Comes with enthusiasm — running, not slinking' },
          { id: 'cm5', text: 'Reliable recall from 20 feet with mild distractions' },
        ],
      },
      {
        id: 'stay',
        name: 'Stay (1–5 sec)',
        emoji: '✋',
        description: 'Patience starts here. Short holds first, extend gradually.',
        tip: "Sit → 'Stay' → wait 1 second → 'yes!' → reward BEFORE he moves. Release word: 'OK' or 'Free.' Never release from a broken stay — reset and shorten.",
        criteria: [
          { id: 'st1', text: 'Holds stay 1 second — 5/5 times' },
          { id: 'st2', text: 'Holds stay 3 seconds — 4/5 times' },
          { id: 'st3', text: 'Holds stay 5 seconds — 3/5 times' },
          { id: 'st4', text: 'Understands release word (\'OK\' / \'Free\')' },
          { id: 'st5', text: 'Holds stay while you take 1 step backward' },
        ],
      },
      {
        id: 'leash',
        name: 'Leash Introduction',
        emoji: '🦮',
        description: 'No pulling, no panic. The leash means fun walks — not restriction.',
        tip: "Let him drag the leash first (supervised). Then pick it up and walk away — let him follow you. Reward when he's at your side. If he pulls, stop dead. No yanking ever.",
        criteria: [
          { id: 'ls1', text: 'Comfortable wearing collar/harness — not trying to remove it' },
          { id: 'ls2', text: 'Drags leash without panic for 5+ minutes' },
          { id: 'ls3', text: 'Walks on leash without pulling for 20+ steps' },
          { id: 'ls4', text: 'Checks in / looks at you during walks' },
          { id: 'ls5', text: 'Completed 3+ neighborhood walks calmly' },
        ],
      },
      {
        id: 'bird-scent',
        name: 'Bird Scent Intro',
        emoji: '🪶',
        description: 'First whiff of what he was born to do. Light, fun, zero pressure.',
        tip: "Pheasant or quail wings work great. Let him smell it, paw at it, carry it around. Don't do formal work — just let instinct wake up. Watch for the freeze/point even in play — that's the magic.",
        criteria: [
          { id: 'bs1', text: 'Introduced to pheasant or quail wing — showed curiosity/interest' },
          { id: 'bs2', text: 'Chases a tossed wing eagerly' },
          { id: 'bs3', text: 'Shows heightened excitement when bird scent is present' },
          { id: 'bs4', text: 'No fear/avoidance — curious, confident, not scared' },
          { id: 'bs5', text: '⭐ Showed natural "pause" or freeze near scent (first point instinct!)' },
        ],
      },
      {
        id: 'retrieve-basics',
        name: 'Retrieve Basics',
        emoji: '🎾',
        description: 'Chase it, grab it, bring it back. The hunting retrieve starts here.',
        tip: "Two toys: throw one, when he grabs it excite him with the other — he'll come back for toy two. Never chase him when he runs with it — you'll just teach him keep-away.",
        criteria: [
          { id: 'rb1', text: 'Chases thrown toy/bumper enthusiastically' },
          { id: 'rb2', text: 'Picks up object and carries it' },
          { id: 'rb3', text: 'Returns toward you with the object — 4/5 throws' },
          { id: 'rb4', text: 'Delivers to hand (or near hand) — 3/5 throws' },
          { id: 'rb5', text: 'Soft mouth confirmed — not crushing or shredding the object' },
        ],
      },
    ],
  },
  {
    id: 'obedience',
    title: 'Building Obedience',
    emoji: '🎯',
    subtitle: 'Adding duration, distance, and distraction',
    ageRange: '13–20 weeks',
    dateRange: 'Jul 3 – Aug 21',
    accentColor: '#5a8a3c',
    skills: [
      {
        id: 'sit-stay-30',
        name: 'Sit-Stay (30 sec)',
        emoji: '⏱️',
        description: 'Extend the stay to 30 seconds with you at 6 feet away.',
        tip: "Build slowly: 5 sec → 10 → 20 → 30. Add distance separately from duration (not at the same time). If he breaks, shorten — don't push through. Success breeds success.",
        criteria: [
          { id: 'ss1', text: 'Holds sit-stay 30 sec at 3 feet — 4/5 times' },
          { id: 'ss2', text: 'Holds sit-stay 20 sec at 6 feet — 3/5 times' },
          { id: 'ss3', text: 'Holds while you move sideways (not just backward)' },
          { id: 'ss4', text: 'Holds with mild auditory distractions — birds, kids nearby' },
        ],
      },
      {
        id: 'down',
        name: 'Down',
        emoji: '⬇️',
        description: 'Key for calm house behavior and field steadiness.',
        tip: "Lure from sit: bring treat from nose down to ground between paws. Mark the instant elbows hit. Never push him down — lure only. 'Down' is not a punishment.",
        criteria: [
          { id: 'dn1', text: 'Lies down on treat lure — 8/10 times' },
          { id: 'dn2', text: 'Downs on verbal "Down" alone — 6/10 times' },
          { id: 'dn3', text: 'Holds down-stay for 5 seconds' },
          { id: 'dn4', text: 'Downs in multiple locations' },
        ],
      },
      {
        id: 'heel',
        name: 'Heel',
        emoji: '🚶',
        description: 'Walking at your side — critical for field safety near roads and fences.',
        tip: "Walk briskly. Every time he's at your left side, mark and reward. Pulls → stop dead, call him back, reward at side, walk. Keep sessions short: 5 min focused heel, not the whole walk.",
        criteria: [
          { id: 'hl1', text: 'Walks at left side for 20+ steps without pulling' },
          { id: 'hl2', text: 'Sits automatically when you stop (auto-sit)' },
          { id: 'hl3', text: 'Heels through turns (left and right)' },
          { id: 'hl4', text: 'Heels with mild distractions present' },
          { id: 'hl5', text: 'Heels off-leash in enclosed area for 10+ steps' },
        ],
      },
      {
        id: 'leave-it',
        name: 'Leave It',
        emoji: '🚫',
        description: "Critical for managing prey drive around non-target animals and distractions.",
        tip: "'Leave it' means that thing literally doesn't exist. Start with treat on floor — cover it. Say 'leave it.' The moment he looks at you, reward with a DIFFERENT treat. Never give the item he was leaving.",
        criteria: [
          { id: 'lv1', text: 'Leaves covered treat on floor on command — 4/5 times' },
          { id: 'lv2', text: 'Leaves treat in open hand on command' },
          { id: 'lv3', text: 'Leaves bird wing/scented item on command' },
          { id: 'lv4', text: 'Leaves moving distractions (bouncing ball, running kid)' },
          { id: 'lv5', text: 'Responds on FIRST command (not the second or third)' },
        ],
      },
      {
        id: 'recall-30',
        name: 'Extended Recall (30 ft)',
        emoji: '🏃',
        description: '30+ feet, distractions present. This is the safety command that matters in the field.',
        tip: "Long line (20–30 ft) is your safety net — not a leash. Never let the first repetition be a failure. If he doesn't come at 30 ft, restart at 15. Recall = celebration, always, no exceptions.",
        criteria: [
          { id: 'rc1', text: 'Comes from 30+ feet in yard — 4/5 times' },
          { id: 'rc2', text: 'Comes from 30+ feet with distractions (birds, kids playing)' },
          { id: 'rc3', text: 'Comes on 50 ft long line — 3/5 times' },
          { id: 'rc4', text: 'Comes back from a sprint/chase when called' },
          { id: 'rc5', text: 'Recall is enthusiastic — running, not reluctant slinking' },
        ],
      },
      {
        id: 'bumper',
        name: 'Bumper Retrieve',
        emoji: '🟡',
        description: 'Transition from toys to training bumpers — closer to real bird work.',
        tip: "Orange canvas bumpers are great starters. Keep throws short — quality over distance. No keep-away allowed. Two-bumper drill still works great here.",
        criteria: [
          { id: 'bm1', text: 'Chases canvas bumper with enthusiasm' },
          { id: 'bm2', text: 'Retrieves bumper to hand — 4/5 throws' },
          { id: 'bm3', text: 'Holds bumper gently (soft mouth)' },
          { id: 'bm4', text: 'Waits for throw before breaking — basic steadiness' },
          { id: 'bm5', text: 'Retrieves from light cover (tall grass, brush)' },
        ],
      },
      {
        id: 'gunfire',
        name: 'Gunfire Desensitization',
        emoji: '💥',
        description: 'Gun-shy is hard to fix. Do this right — patience is everything.',
        tip: "Start FAR (100+ yards from a cap gun or starter pistol). At the sound, immediately play or treat. Build over weeks: further → closer. Gun = party. Never fire near a scared dog.",
        criteria: [
          { id: 'gf1', text: 'Comfortable with recorded gunshots at low volume (phone/speaker)' },
          { id: 'gf2', text: 'Cap gun fired 100+ yards away — no fear, stays focused' },
          { id: 'gf3', text: 'Cap gun at 50 yards during fetch — stays in the game' },
          { id: 'gf4', text: 'No flinching/hiding when cap gun fires at 30 yards' },
        ],
      },
    ],
  },
  {
    id: 'socialization',
    title: 'Big World Socialization',
    emoji: '🌍',
    subtitle: "A dog that isn't scared of anything will hunt anything",
    ageRange: '16–20 weeks',
    dateRange: 'Aug – Sep',
    accentColor: '#7a6abf',
    skills: [
      {
        id: 'strangers',
        name: 'New People & Strangers',
        emoji: '🤝',
        description: 'A family dog must be confident around anyone. No fear, no aggression.',
        tip: "Let strangers toss treats — he comes to them, they don't grab at him. Goal: 'I like new people' not 'I tolerate them.' Aim for 50+ unique people during this window.",
        criteria: [
          { id: 'sp1', text: 'Approaches strangers willingly — no cowering or hiding' },
          { id: 'sp2', text: 'Comfortable with men in hats/uniforms (common fear trigger)' },
          { id: 'sp3', text: 'Good with kids — gentle, not jumping/nipping' },
          { id: 'sp4', text: 'Has met 50+ different people in varied settings' },
        ],
      },
      {
        id: 'environments',
        name: 'Novel Environments',
        emoji: '🏪',
        description: 'Surfaces, sounds, crowds — he needs to have seen it all.',
        tip: "Post-vaccination (check with vet ~14–16 weeks): pet stores, parking lots, parks, farm. New surface = let him investigate, don't drag him. Reward curiosity.",
        criteria: [
          { id: 'ev1', text: 'Confident on all surfaces: grass, gravel, tile, metal grating' },
          { id: 'ev2', text: 'Comfortable in pet-friendly store — not overwhelmed' },
          { id: 'ev3', text: 'Handles urban noise: traffic, bikes, skateboards' },
          { id: 'ev4', text: 'Comfortable around farm animals — horses, cattle (key for hunting areas)' },
        ],
      },
      {
        id: 'dogs',
        name: 'Dog Socialization',
        emoji: '🐕',
        description: 'Hunting dogs work near other dogs. He needs to be steady around them.',
        tip: "Parallel walking beats face-to-face greetings. Puppy class is gold for this. Avoid dog parks — too chaotic, too risky at this age. Controlled interactions only.",
        criteria: [
          { id: 'ds1', text: 'Appropriate greeting with calm, known dogs' },
          { id: 'ds2', text: 'Not reactive to dogs seen on walks' },
          { id: 'ds3', text: 'Plays appropriately — knows when to stop' },
          { id: 'ds4', text: 'Can work basic commands near another dog without fixating on it' },
        ],
      },
      {
        id: 'water',
        name: 'Water Introduction',
        emoji: '💧',
        description: 'Vizslas are natural swimmers. Make the first experience great.',
        tip: "Shallow creek or pond edge first. Toss a bumper in ankle-deep water. Wade in yourself to show it's safe. Never throw a dog in water — that creates water-shy hunters.",
        criteria: [
          { id: 'wa1', text: 'Wades in shallow water willingly' },
          { id: 'wa2', text: 'Retrieves bumper from ankle-deep water' },
          { id: 'wa3', text: 'Has swum at least once — voluntarily, not forced' },
          { id: 'wa4', text: 'Enters water on command or independently' },
        ],
      },
    ],
  },
  {
    id: 'hunting-instincts',
    title: 'Hunting Instincts',
    emoji: '🌾',
    subtitle: 'The bird dog awakens — pointing, scenting, controlled drive',
    ageRange: '4–6 months',
    dateRange: 'Sep – Nov',
    accentColor: '#b8860b',
    skills: [
      {
        id: 'whoa',
        name: '"Whoa" Command',
        emoji: '🛑',
        description: 'The most important field command. Whoa = freeze in place and hold it.',
        tip: "Start completely off birds. An elevated surface (table, tailgate) works great — easier to hold. 'Whoa' → stop → treat → release. Build to 30 seconds. This becomes the pointing command in the field.",
        criteria: [
          { id: 'wh1', text: 'Stops on "Whoa" command — 4/5 times' },
          { id: 'wh2', text: 'Holds whoa for 10 seconds' },
          { id: 'wh3', text: 'Holds whoa for 30 seconds' },
          { id: 'wh4', text: 'Holds whoa with light distractions' },
          { id: 'wh5', text: 'Holds whoa while you walk slowly around him' },
        ],
      },
      {
        id: 'scent-trail',
        name: 'Scent Trailing',
        emoji: '👃',
        description: 'Follow the nose — structured scent work builds hunting drive.',
        tip: "Drag a pheasant wing along the ground 10–20 feet, toss it at the end. Let him track it by nose, not eyes. Build trail length as confidence grows. Pure instinct fuel.",
        criteria: [
          { id: 'sc1', text: 'Follows dragged wing trail 10 feet to find wing' },
          { id: 'sc2', text: 'Follows trail 20+ feet through light cover' },
          { id: 'sc3', text: 'Head goes down into hunting mode — using nose, not eyes' },
          { id: 'sc4', text: 'Follows trail with wind — learning crosswind scenting' },
          { id: 'sc5', text: 'Engages eagerly — this is clearly a game he loves' },
        ],
      },
      {
        id: 'point',
        name: 'Point Development',
        emoji: '🫵',
        description: "Let the instinct emerge — your job is to support it, not force it.",
        tip: "Plant a clip-winged quail in light cover. Walk him on long line. When he locks up, say 'Whoa' quietly and freeze. Let him hold it. Big quiet praise for holding. Don't release him to flush — just praise and exit.",
        criteria: [
          { id: 'pt1', text: 'Has shown spontaneous point (freeze) on scent during play' },
          { id: 'pt2', text: 'Points planted quail or pheasant in controlled setting' },
          { id: 'pt3', text: 'Holds point for 15+ seconds without breaking' },
          { id: 'pt4', text: 'Good form: tail up, body locked, nose on bird' },
          { id: 'pt5', text: '"Whoa" reinforces when he starts to creep' },
        ],
      },
      {
        id: 'bird-retrieve',
        name: 'Bird Retrieve',
        emoji: '🦅',
        description: 'Transition from bumpers to actual birds — soft mouth matters here.',
        tip: "Start with a frozen quail or pheasant wing. Let him pick it up, praise lavishly. Some dogs are briefly weird about feathers. Most Vizslas take to it immediately and you'll never look back.",
        criteria: [
          { id: 'br1', text: 'Picks up dead bird willingly — no dropping, no crushing' },
          { id: 'br2', text: 'Carries bird back toward you' },
          { id: 'br3', text: 'Delivers to hand without dropping mid-retrieve' },
          { id: 'br4', text: 'Soft mouth confirmed — bird arrives intact' },
          { id: 'br5', text: 'Retrieves tossed bird from 20+ feet' },
        ],
      },
    ],
  },
  {
    id: 'field-training',
    title: 'Formal Field Work',
    emoji: '🦅',
    subtitle: 'All pieces together — point, flush, retrieve on command',
    ageRange: '6–12 months',
    dateRange: 'Nov – Spring',
    accentColor: '#b04520',
    skills: [
      {
        id: 'steady-point',
        name: 'Steady Point',
        emoji: '🏹',
        description: "Holds point until released — no creeping, no breaking, no matter what.",
        tip: "Walk up to the bird slowly. If he creeps, 'Whoa.' If he breaks, replant and try again — never let a break result in flushing the bird. The point is the prize, not the flush.",
        criteria: [
          { id: 'sp1', text: 'Holds point 30+ seconds — 4/5 times' },
          { id: 'sp2', text: 'Holds as you walk up beside him slowly' },
          { id: 'sp3', text: "Holds as bird flushes — doesn't break on flush" },
          { id: 'sp4', text: 'Holds on planted quail in real field conditions' },
          { id: 'sp5', text: 'Holds on wild bird (when encountered)' },
        ],
      },
      {
        id: 'gun-field',
        name: 'Gun Introduction — Field',
        emoji: '🔫',
        description: 'Gun fires = bird opportunity. He should be excited, not afraid.',
        tip: ".22 blanks or starter pistol first. Fire at flush only, when he's focused on the bird. The bird is the event — the gun should be a footnote. Never fire over a nervous dog.",
        criteria: [
          { id: 'gun1', text: 'Starter pistol at flush — no gun shyness, stays focused' },
          { id: 'gun2', text: '20-gauge at 100 yards — no reaction' },
          { id: 'gun3', text: '20-gauge at 50 yards during retrieve — remains focused on bird' },
          { id: 'gun4', text: 'Shotgun over flushed bird — excited, not spooked' },
        ],
      },
      {
        id: 'flush-command',
        name: 'Flush on Command',
        emoji: '🐦',
        description: 'He flushes ONLY when you say — not on his own schedule.',
        tip: "'Hunt' or 'Get 'em' = flush command. Hold steady until you're ready, then send him. Requires a solid Whoa/Stay foundation. Don't rush this — it's built on everything before it.",
        criteria: [
          { id: 'fc1', text: 'Holds point until flush command given' },
          { id: 'fc2', text: 'Flushes bird confidently on command' },
          { id: 'fc3', text: 'Remains steady after flush — waits for retrieve command' },
          { id: 'fc4', text: 'Consistent over 5+ planted birds' },
        ],
      },
      {
        id: 'hunt-retrieve',
        name: 'Hunt Retrieve',
        emoji: '🏅',
        description: 'Shot bird → mark → retrieve → deliver to hand. The full loop.',
        tip: "Mark where the bird falls. Send on command. He marks with eyes (or nose if it's a runner). Deliver to hand — take it gently. Big praise every single time.",
        criteria: [
          { id: 'hr1', text: 'Marks fall of shot bird and retrieves on command' },
          { id: 'hr2', text: 'Retrieves from cover — tall grass, brush, weeds' },
          { id: 'hr3', text: 'Delivers to hand — not dropping at feet' },
          { id: 'hr4', text: 'Tracks a running (crippled) bird' },
          { id: 'hr5', text: 'Reliable across varied terrain: field, creek edge, light woods' },
        ],
      },
      {
        id: 'water-retrieve',
        name: 'Water Retrieve',
        emoji: '🌊',
        description: 'Birds fall in creeks and ponds. He needs to go get them.',
        tip: "Bumper in shallow water first. Build to deeper. Eventually shot birds. Always end on a success. Water retrieve is a skill that grows all season.",
        criteria: [
          { id: 'wr1', text: 'Enters water confidently to retrieve bumper' },
          { id: 'wr2', text: 'Swims 20+ feet to retrieve bumper' },
          { id: 'wr3', text: 'Retrieves dead bird from water' },
          { id: 'wr4', text: 'Delivers from water to hand — not dropping on shore' },
        ],
      },
    ],
  },
  {
    id: 'hunt-ready',
    title: 'Hunt Ready 🏆',
    emoji: '🏆',
    subtitle: 'First season — everything comes together',
    ageRange: '12+ months',
    dateRange: 'Fall Year 2',
    accentColor: '#2d8a5f',
    skills: [
      {
        id: 'conditioning',
        name: 'Physical Conditioning',
        emoji: '💪',
        description: 'A hunting Vizsla runs 2–3 hours hard. Build gradually.',
        tip: "Increase runs 4–6 weeks before season. Swimming is excellent cross-training. Toughen paws on hard ground. Feed high-protein food during season. Hydration check constantly.",
        criteria: [
          { id: 'cn1', text: 'Running 30+ min without tiring — 3x per week for a month' },
          { id: 'cn2', text: 'Paws toughened — no soreness after runs on hard/rough ground' },
          { id: 'cn3', text: 'Good muscle condition — ribs felt but not seen' },
          { id: 'cn4', text: 'Hydrates well in field — knows the water break routine' },
        ],
      },
      {
        id: 'honor',
        name: 'Honoring Another Dog\'s Point',
        emoji: '🤜',
        description: "When another dog points, yours freezes too — essential for hunting parties.",
        tip: "Train with a steady pointing dog first. When yours sees the other on point, 'Whoa' him. Over time he learns to back spontaneously. This is a mark of a finished bird dog.",
        criteria: [
          { id: 'hn1', text: 'Freezes on "Whoa" when seeing another dog on point' },
          { id: 'hn2', text: "Spontaneously backs another dog's point without command" },
          { id: 'hn3', text: "Holds honor even as bird flushes" },
        ],
      },
      {
        id: 'full-day',
        name: 'Full Day in the Field',
        emoji: '☀️',
        description: 'Mental and physical stamina for a real hunting day.',
        tip: "Work up to it — start with 2-hour sessions. A real day is 6–8 hours of on/off work. Watch for overheating (Vizslas run hot). Know when to kennel him for a rest. He'll tell you.",
        criteria: [
          { id: 'fd1', text: 'Handles 2-hour field session — skills sharp throughout' },
          { id: 'fd2', text: 'Handles 4-hour session — still performing at end' },
          { id: 'fd3', text: 'Kennels/rests calmly between sessions without anxiety' },
          { id: 'fd4', text: 'First full hunting day completed' },
        ],
      },
      {
        id: 'season-debut',
        name: 'Pheasant & Quail Season Debut',
        emoji: '🎉',
        description: 'First real wild birds. Everything you built leads here.',
        tip: "Relax. He'll make mistakes. So will you. First season is about experience, not perfection. Wild birds behave differently than planted — give him time. Be patient. Celebrate every single find.",
        criteria: [
          { id: 'sd1', text: 'Found and pointed first wild pheasant or quail' },
          { id: 'sd2', text: 'Held point on wild bird while hunter walked in' },
          { id: 'sd3', text: 'Retrieved shot bird in a real hunting scenario' },
          { id: 'sd4', text: 'Completed multiple hunts — learning and improving each time' },
          { id: 'sd5', text: '🥇 Has become a hunting partner you\'re proud of' },
        ],
      },
    ],
  },
]

// ─── STATE TYPES ──────────────────────────────────────────────────────────────

type AppState = {
  dogName: string
  checkedCriteria: Record<string, boolean>
  passedSkills: Record<string, boolean>
}

const STORAGE_KEY = 'vizsla-training-v2'
const BIRTH_DATE = new Date('2026-05-20')

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getDogAge() {
  const now = new Date()
  const diffMs = now.getTime() - BIRTH_DATE.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) {
    const daysUntil = Math.abs(diffDays)
    return `arrives in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`
  }
  const weeks = Math.floor(diffDays / 7)
  const days = diffDays % 7
  if (weeks === 0) return `${diffDays} day${diffDays === 1 ? '' : 's'} old`
  if (days === 0) return `${weeks} week${weeks === 1 ? '' : 's'} old`
  return `${weeks}w ${days}d old`
}

// ─── LOCK ICON ────────────────────────────────────────────────────────────────

function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 11V7A5 5 0 005 7v4H3v10h18V11h-4zm-6 7v-3a1 1 0 012 0v3h-2zm2-7H9V7a3 3 0 016 0v4z"/>
    </svg>
  )
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}

// ─── SKILL CARD ───────────────────────────────────────────────────────────────

function SkillCard({
  skill,
  unlocked,
  passed,
  checked,
  accentColor,
  onToggle,
  onPass,
}: {
  skill: Skill
  unlocked: boolean
  passed: boolean
  checked: Record<string, boolean>
  accentColor: string
  onToggle: (id: string) => void
  onPass: () => void
}) {
  const [open, setOpen] = useState(false)
  const allChecked = skill.criteria.every(c => checked[c.id])
  const checkedCount = skill.criteria.filter(c => checked[c.id]).length

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${passed ? accentColor + '60' : unlocked ? '#1e2530' : '#1a1f27'}`,
      background: passed ? accentColor + '08' : unlocked ? '#141920' : '#141920',
      marginBottom: 10,
      overflow: 'hidden',
      opacity: unlocked ? 1 : 0.45,
      transition: 'all 0.2s ease',
    }}>
      {/* Skill Header */}
      <button
        onClick={() => unlocked && setOpen(o => !o)}
        disabled={!unlocked}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          cursor: unlocked ? 'pointer' : 'default',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 22 }}>{skill.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: passed ? accentColor : unlocked ? '#F1F3F5' : '#6B7280',
            fontWeight: 600,
            fontSize: 15,
            marginBottom: 2,
          }}>
            {skill.name}
            {passed && <span style={{ marginLeft: 8, color: accentColor, fontSize: 12 }}>✓ Passed</span>}
          </div>
          {/* mini progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(checkedCount / skill.criteria.length) * 100}%`,
                background: passed ? accentColor : accentColor + 'aa',
                borderRadius: 99,
                transition: 'width 0.3s ease',
              }}/>
            </div>
            <span style={{ color: '#6B7280', fontSize: 11, whiteSpace: 'nowrap' }}>
              {checkedCount}/{skill.criteria.length}
            </span>
          </div>
        </div>
        {!unlocked && <LockIcon size={14} />}
        {unlocked && !passed && <ChevronIcon open={open} />}
        {passed && <span style={{ color: accentColor }}><CheckIcon size={16} /></span>}
      </button>

      {/* Expanded Content */}
      {open && unlocked && !passed && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Description */}
          <p style={{ color: '#8892a4', fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
            {skill.description}
          </p>

          {/* Tip */}
          <div style={{
            background: accentColor + '12',
            border: `1px solid ${accentColor}30`,
            borderRadius: 8,
            padding: '10px 12px',
            marginBottom: 14,
          }}>
            <div style={{ color: accentColor, fontSize: 11, fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🪙 Kelsier's Tip
            </div>
            <p style={{ color: '#c8d4e0', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
              {skill.tip}
            </p>
          </div>

          {/* Criteria */}
          <div style={{ marginBottom: 14 }}>
            {skill.criteria.map(c => (
              <label
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 0',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div
                  onClick={() => onToggle(c.id)}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    border: `2px solid ${checked[c.id] ? accentColor : 'rgba(255,255,255,0.15)'}`,
                    background: checked[c.id] ? accentColor : 'transparent',
                    flexShrink: 0,
                    marginTop: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer',
                  }}
                >
                  {checked[c.id] && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#07090D" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  )}
                </div>
                <span
                  onClick={() => onToggle(c.id)}
                  style={{
                    color: checked[c.id] ? '#6B7280' : '#c0ccd8',
                    fontSize: 13,
                    lineHeight: 1.4,
                    textDecoration: checked[c.id] ? 'line-through' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {c.text}
                </span>
              </label>
            ))}
          </div>

          {/* Pass Button */}
          {allChecked && (
            <button
              onClick={onPass}
              style={{
                width: '100%',
                padding: '12px',
                background: accentColor,
                border: 'none',
                borderRadius: 8,
                color: '#07090D',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              ✓ Mark as Passed — Unlock Next Skill
            </button>
          )}

          {!allChecked && (
            <div style={{ color: '#4a5568', fontSize: 12, textAlign: 'center' }}>
              Complete all criteria above to unlock "Pass Skill"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PHASE CARD ───────────────────────────────────────────────────────────────

function PhaseCard({
  phase,
  phaseIndex,
  unlocked,
  complete,
  state,
  onToggle,
  onPass,
}: {
  phase: Phase
  phaseIndex: number
  unlocked: boolean
  complete: boolean
  state: AppState
  onToggle: (id: string) => void
  onPass: (skillId: string) => void
}) {
  const [open, setOpen] = useState(phaseIndex === 0)
  const passedCount = phase.skills.filter(s => state.passedSkills[s.id]).length
  const pct = Math.round((passedCount / phase.skills.length) * 100)

  const isSkillUnlocked = (skillIndex: number) => {
    if (!unlocked) return false
    if (skillIndex === 0) return true
    return !!state.passedSkills[phase.skills[skillIndex - 1].id]
  }

  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${complete ? phase.accentColor + '80' : unlocked ? phase.accentColor + '35' : 'rgba(255,255,255,0.08)'}`,
      background: complete ? phase.accentColor + '06' : unlocked ? '#141920' : '#0f1318',
      marginBottom: 12,
      overflow: 'hidden',
      opacity: unlocked ? 1 : 0.5,
      transition: 'all 0.25s ease',
    }}>
      {/* Phase Header */}
      <button
        onClick={() => unlocked && setOpen(o => !o)}
        disabled={!unlocked}
        style={{
          width: '100%',
          padding: '18px 20px',
          background: 'none',
          border: 'none',
          cursor: unlocked ? 'pointer' : 'default',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Phase number + emoji */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: complete ? phase.accentColor : unlocked ? phase.accentColor + '20' : 'rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
            border: `1px solid ${complete ? phase.accentColor : phase.accentColor + '40'}`,
          }}>
            {complete ? '✓' : unlocked ? phase.emoji : <LockIcon size={20} />}
          </div>

          {/* Phase info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                color: complete ? phase.accentColor : unlocked ? '#F1F3F5' : '#4a5568',
                fontWeight: 700,
                fontSize: 16,
              }}>
                {phase.title}
              </span>
              <span style={{
                background: phase.accentColor + '20',
                color: phase.accentColor,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 99,
                border: `1px solid ${phase.accentColor}40`,
              }}>
                {phase.ageRange}
              </span>
            </div>
            <div style={{ color: '#6B7280', fontSize: 12 }}>{phase.dateRange} · {phase.subtitle}</div>
          </div>

          {/* Progress */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ color: complete ? phase.accentColor : '#6B7280', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              {passedCount}/{phase.skills.length}
            </div>
            {unlocked && <ChevronIcon open={open} />}
          </div>
        </div>

        {/* Phase progress bar */}
        {unlocked && (
          <div style={{ marginTop: 12, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: complete ? phase.accentColor : `linear-gradient(90deg, ${phase.accentColor}88, ${phase.accentColor})`,
              borderRadius: 99,
              transition: 'width 0.4s ease',
            }}/>
          </div>
        )}
      </button>

      {/* Skills */}
      {open && unlocked && (
        <div style={{ padding: '0 16px 16px' }}>
          {phase.skills.map((skill, skillIndex) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              unlocked={isSkillUnlocked(skillIndex)}
              passed={!!state.passedSkills[skill.id]}
              checked={state.checkedCriteria}
              accentColor={phase.accentColor}
              onToggle={onToggle}
              onPass={() => onPass(skill.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const [state, setState] = useState<AppState>({
    dogName: 'My Pup',
    checkedCriteria: {},
    passedSkills: {},
  })
  const [editingName, setEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setState(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }
  }, [state, mounted])

  const toggleCriterion = (id: string) => {
    setState(prev => ({
      ...prev,
      checkedCriteria: { ...prev.checkedCriteria, [id]: !prev.checkedCriteria[id] },
    }))
  }

  const passSkill = (skillId: string) => {
    setState(prev => ({
      ...prev,
      passedSkills: { ...prev.passedSkills, [skillId]: true },
    }))
  }

  const isPhaseUnlocked = (phaseIndex: number) => {
    if (phaseIndex === 0) return true
    const prev = phases[phaseIndex - 1]
    return prev.skills.every(s => state.passedSkills[s.id])
  }

  const isPhaseComplete = (phase: Phase) =>
    phase.skills.every(s => state.passedSkills[s.id])

  const totalSkills = phases.reduce((a, p) => a + p.skills.length, 0)
  const passedCount = Object.values(state.passedSkills).filter(Boolean).length
  const overallPct = Math.round((passedCount / totalSkills) * 100)

  const activePhase = phases.find((p, i) => isPhaseUnlocked(i) && !isPhaseComplete(p))

  if (!mounted) return null

  return (
    <div style={{
      minHeight: '100vh',
      background: '#07090D',
      color: '#F1F3F5',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      {/* ── HEADER ── */}
      <div style={{
        background: 'linear-gradient(180deg, #0d1117 0%, #07090D 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '32px 20px 24px',
      }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Dog name + age */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #c67c2e, #8b4513)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              boxShadow: '0 4px 20px rgba(198, 124, 46, 0.3)',
            }}>
              🐕
            </div>
            <div style={{ flex: 1 }}>
              {editingName ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    autoFocus
                    value={tempName}
                    onChange={e => setTempName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        setState(p => ({ ...p, dogName: tempName || p.dogName }))
                        setEditingName(false)
                      }
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    style={{
                      background: '#141920',
                      border: '1px solid #c67c2e',
                      borderRadius: 8,
                      color: '#F1F3F5',
                      fontSize: 22,
                      fontWeight: 700,
                      padding: '4px 10px',
                      outline: 'none',
                      width: 200,
                    }}
                  />
                  <button
                    onClick={() => {
                      setState(p => ({ ...p, dogName: tempName || p.dogName }))
                      setEditingName(false)
                    }}
                    style={{ color: '#c67c2e', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#F1F3F5' }}>
                    {state.dogName}
                  </h1>
                  <button
                    onClick={() => { setTempName(state.dogName); setEditingName(true) }}
                    style={{
                      background: 'none',
                      border: '1px solid #1e2530',
                      borderRadius: 6,
                      color: '#6B7280',
                      fontSize: 11,
                      padding: '2px 8px',
                      cursor: 'pointer',
                    }}
                  >
                    rename
                  </button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{
                  background: '#c67c2e20',
                  border: '1px solid #c67c2e40',
                  color: '#c67c2e',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 99,
                }}>
                  {getDogAge()}
                </span>
                <span style={{ color: '#6B7280', fontSize: 12 }}>
                  Vizsla · Born May 20, 2026 · Training started May 22
                </span>
              </div>
            </div>
          </div>

          {/* Overall progress */}
          <div style={{
            background: '#141920',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Overall Progress
              </span>
              <span style={{ color: '#c67c2e', fontWeight: 700, fontSize: 13 }}>
                {passedCount} / {totalSkills} skills passed · {overallPct}%
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${overallPct}%`,
                background: 'linear-gradient(90deg, #8b4513, #c67c2e, #e8a840)',
                borderRadius: 99,
                transition: 'width 0.5s ease',
              }}/>
            </div>
            {activePhase && (
              <div style={{ marginTop: 10, color: '#6B7280', fontSize: 12 }}>
                Currently working: <span style={{ color: '#c8d4e0' }}>{activePhase.title}</span> · {activePhase.dateRange}
              </div>
            )}
          </div>

          {/* Quick info pills */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            {[
              { icon: '🐦', label: 'Pheasant + Quail Bird Dog' },
              { icon: '🏡', label: 'Family Dog' },
              { icon: '📋', label: 'Sequential Skill Unlock' },
            ].map(pill => (
              <span key={pill.label} style={{
                background: '#141920',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#6B7280',
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 99,
              }}>
                {pill.icon} {pill.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW THIS WORKS ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 20px 0' }}>
        <div style={{
          background: '#141920',
          border: '1px solid #2d200e',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 20,
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>📋</span>
          <div>
            <div style={{ color: '#c8d4e0', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>How This Works</div>
            <div style={{ color: '#7a6040', fontSize: 12, lineHeight: 1.6 }}>
              Skills unlock sequentially — you can't move to the next until the current one is passed. Check off each criterion as you nail it, then hit <strong style={{ color: '#c67c2e' }}>Mark as Passed</strong> to unlock the next skill. Phases unlock when all skills in the previous phase are passed. Progress saves automatically.
            </div>
          </div>
        </div>

        {/* ── PHASES ── */}
        {phases.map((phase, phaseIndex) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            phaseIndex={phaseIndex}
            unlocked={isPhaseUnlocked(phaseIndex)}
            complete={isPhaseComplete(phase)}
            state={state}
            onToggle={toggleCriterion}
            onPass={passSkill}
          />
        ))}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0 40px', color: '#3a2d1a', fontSize: 12 }}>
          Vizsla training tracker · restoreports.com/training · built with 🪙
        </div>
      </div>
    </div>
  )
}
