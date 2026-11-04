// ── Pheasant Hunt 2026 — default plan data ───────────────────────────────────
// Everything here is a default. Names, ages, dates and lists are editable in-page
// and persisted to localStorage (see store.ts).

export type Who = 'all' | 'adult' | 'kids' | 'pup' | 'grown'

export interface Person {
  id: string
  name: string
  age: string
  role: string
  gun: string
  shells: string
  adult: boolean
}

export interface Dog {
  id: string
  name: string
  breed: string
  age: string
  role: string
  pup: boolean
}

export interface ListItem {
  id: string
  label: string
  note?: string
  who?: Who
}

export interface Checklist {
  id: string
  title: string
  icon: string
  kind: 'people' | 'dogs' | 'single'
  blurb: string
  items: ListItem[]
}

export interface Region {
  id: string
  label: string
  lat: number
  lon: number
}

export const REGIONS: Region[] = [
  { id: 'wichita', label: 'Wichita area', lat: 37.69, lon: -97.34 },
  { id: 'central', label: 'Central KS (Great Bend)', lat: 38.36, lon: -98.76 },
  { id: 'nc', label: 'North Central KS (Concordia)', lat: 39.57, lon: -97.66 },
  { id: 'sw', label: 'Southwest KS (Dodge City)', lat: 37.75, lon: -100.02 },
  { id: 'west', label: 'Western KS (Garden City)', lat: 37.97, lon: -100.87 },
  { id: 'nw', label: 'Northwest KS (Colby)', lat: 39.39, lon: -101.05 },
]

export const DEFAULT_PEOPLE: Person[] = [
  { id: 'p1', name: 'Nate', age: 'Dad', role: 'Hunt Boss · Center of the line', gun: '12 ga', shells: '#5 · 2 boxes', adult: true },
  { id: 'p2', name: 'Noah', age: '14', role: 'Left flank', gun: '20 ga', shells: '#6 · 2 boxes', adult: false },
  { id: 'p3', name: 'Nathan', age: '12', role: 'Right flank', gun: '20 ga', shells: '#6 · 2 boxes', adult: false },
]

export const DEFAULT_DOGS: Dog[] = [
  { id: 'd1', name: 'Sage', breed: 'Silver Lab · American type', age: '7', role: 'Lead flusher · the veteran', pup: false },
  { id: 'd2', name: 'Duke', breed: 'Silver Lab · English type', age: '5', role: 'Retriever · steady as a rock', pup: false },
  { id: 'd3', name: 'Ace', breed: 'Vizsla', age: '6 mo', role: 'Rookie · exposure only, long lead', pup: true },
]

export const CHECKLISTS: Checklist[] = [
  {
    id: 'hunters',
    title: 'Hunter Gear',
    icon: '🎯',
    kind: 'people',
    blurb: 'One column per hunter. If it is not checked, it is not in the truck.',
    items: [
      { id: 'orange-hat', label: 'Blaze orange hat' },
      { id: 'orange-vest', label: 'Blaze orange vest w/ game bag + shell loops' },
      { id: 'shotgun', label: 'Shotgun — cased, unloaded, action open' },
      { id: 'shells', label: 'Shells — 2 boxes (#5–#6, 2¾")', note: 'Non-toxic where required' },
      { id: 'eyes', label: 'Shooting glasses' },
      { id: 'ears', label: 'Hearing protection (plugs or muffs)' },
      { id: 'brush-pants', label: 'Brush pants / upland chaps' },
      { id: 'boots', label: 'Waterproof boots — broken in' },
      { id: 'socks', label: 'Wool socks + a spare pair' },
      { id: 'base', label: 'Base layer (cold start, warm walk)' },
      { id: 'mid', label: 'Mid layer — fleece or vest' },
      { id: 'jacket', label: 'Shell / jacket for the wind' },
      { id: 'gloves', label: 'Shooting gloves' },
      { id: 'warmers', label: 'Hand warmers in the pockets' },
      { id: 'water', label: 'Water bottle in the vest' },
      { id: 'snacks', label: 'Vest snacks (jerky, bars)' },
      { id: 'chapstick', label: 'Chapstick + sunscreen' },
      { id: 'phone', label: 'Phone charged · onX / offline map', who: 'adult' },
      { id: 'knife', label: 'Knife / multitool', who: 'adult' },
      { id: 'whistle', label: 'Dog whistle + e-collar remote', who: 'adult' },
      { id: 'license', label: 'Kansas hunting license on phone / in wallet', who: 'adult' },
      { id: 'hunter-ed', label: 'Hunter ed card (if completed)', who: 'kids' },
      { id: 'hoodie', label: 'Favorite hoodie for the ride home', who: 'kids' },
    ],
  },
  {
    id: 'dogs',
    title: 'Dog Gear',
    icon: '🐾',
    kind: 'dogs',
    blurb: 'The dogs do the real work. Pack for them like it is their trip. It is.',
    items: [
      { id: 'd-vest', label: 'Blaze orange dog vest / collar' },
      { id: 'd-ecollar', label: 'E-collar — charged overnight', who: 'grown' },
      { id: 'd-gps', label: 'GPS collar — charged, paired', who: 'grown' },
      { id: 'd-bell', label: 'Bell or beeper on the collar' },
      { id: 'd-lead', label: '6-ft lead' },
      { id: 'd-checkcord', label: '30-ft check cord (stays on all day)', who: 'pup' },
      { id: 'd-bowl', label: 'Collapsible water bowl' },
      { id: 'd-water', label: '1 gallon of water per dog' },
      { id: 'd-food', label: 'Measured meals + high-value treats' },
      { id: 'd-crate', label: 'Crate / kennel strapped in the truck' },
      { id: 'd-towel', label: 'Towel + dog blanket' },
      { id: 'd-firstaid', label: 'Dog first aid: vet wrap, EMT gel, saline eye wash, hemostats, styptic' },
      { id: 'd-paws', label: 'Paw balm (Musher\u2019s Secret) · boots if rough ground' },
      { id: 'd-tick', label: 'Tick / flea prevention up to date' },
      { id: 'd-tags', label: 'Rabies tag on · vaccination records in glovebox' },
      { id: 'd-comb', label: 'Comb for burrs + cockleburs' },
      { id: 'd-skunk', label: 'Skunk kit: peroxide + baking soda + Dawn (just in case)' },
    ],
  },
  {
    id: 'truck',
    title: 'Truck & Tailgate',
    icon: '🛻',
    kind: 'single',
    blurb: 'Shared gear. Loaded the night before, not the morning of.',
    items: [
      { id: 't-cooler', label: 'Cooler with ice (birds + food, separate bags)' },
      { id: 't-bags', label: 'Gallon zip bags + game bags for birds' },
      { id: 't-cleankit', label: 'Bird cleaning kit: knife, game shears, nitrile gloves, paper towels, water jug' },
      { id: 't-trash', label: 'Trash bags' },
      { id: 't-firstaid', label: 'Human first aid kit' },
      { id: 't-cleaning-rod', label: 'Cleaning rod (barrel obstruction) + gun oil' },
      { id: 't-cases', label: 'Gun cases / lockable storage for the drive' },
      { id: 't-chairs', label: 'Tailgate chairs + folding table' },
      { id: 't-tarp', label: 'Tarp + bungees' },
      { id: 't-headlamps', label: 'Headlamps + flashlights (fresh batteries)' },
      { id: 't-power', label: 'Phone chargers + power bank' },
      { id: 't-radios', label: 'Walkie-talkies for the boys' },
      { id: 't-binos', label: 'Binoculars' },
      { id: 't-camera', label: 'Camera / GoPro — somebody document this' },
      { id: 't-map', label: 'WIHA atlas + offline maps downloaded' },
      { id: 't-tp', label: 'Toilet paper, wet wipes, hand sanitizer' },
      { id: 't-drybag', label: 'Dry bag: spare clothes + socks for everyone' },
      { id: 't-rain', label: 'Rain gear' },
      { id: 't-warmers', label: 'Bulk box of hand warmers' },
      { id: 't-recovery', label: 'Tow strap, jumper cables, tire plug kit, spare checked' },
      { id: 't-fuel', label: 'Full tank + extra fuel can' },
      { id: 't-cash', label: 'Cash + landowner thank-you (if private ground)' },
    ],
  },
  {
    id: 'food',
    title: 'Food & Fuel',
    icon: '🌯',
    kind: 'single',
    blurb: 'A hungry 12-year-old at 2 PM is a safety hazard. Plan accordingly.',
    items: [
      { id: 'f-breakfast', label: 'Breakfast on the road (burritos / donuts)' },
      { id: 'f-coffee', label: 'Thermos of coffee (Dad)' },
      { id: 'f-cocoa', label: 'Thermos of hot chocolate (the boys)' },
      { id: 'f-lunch', label: 'Tailgate lunch: sandwiches, chips, fruit' },
      { id: 'f-snacks', label: 'Snacks: jerky, granola bars, trail mix, candy (the boys voted)' },
      { id: 'f-water', label: 'Water — 1 gallon per person' },
      { id: 'f-electrolytes', label: 'Gatorade / electrolytes' },
      { id: 'f-dogwater', label: 'Dog water — separate from ours' },
      { id: 'f-dinner', label: 'Post-hunt dinner plan (the bragging venue)' },
    ],
  },
  {
    id: 'legal',
    title: 'Licenses & Legal',
    icon: '📜',
    kind: 'single',
    blurb: 'Kansas defaults. Verify current regs at ksoutdoors.gov before you roll.',
    items: [
      { id: 'l-license', label: 'Dad: Kansas resident hunting license — purchased' },
      { id: 'l-youth', label: 'Boys: under 16 — no KS license required, must be directly supervised by an adult (verify)' },
      { id: 'l-hed', label: 'Hunter ed: under-16 supervised exemption confirmed, or cards in hand' },
      { id: 'l-hours', label: 'Shooting hours: 30 min before sunrise → sunset (see Game Plan)' },
      { id: 'l-limit', label: 'Daily bag: 4 roosters per hunter · possession 16 · hens are off limits' },
      { id: 'l-land', label: 'Where: WIHA tracts picked, or landowner permission confirmed' },
      { id: 'l-nontoxic', label: 'Non-toxic shot check for the specific WIHA / federal tract' },
      { id: 'l-transport', label: 'Birds keep ID (feathered head, wing, or leg) until home' },
      { id: 'l-regs', label: 'Read the current KDWP upland regs summary — once, together' },
    ],
  },
]

export interface TimelineStop {
  time: string
  title: string
  detail: string
  icon: string
  key?: 'light' | 'sunset'
}

export const TIMELINE: TimelineStop[] = [
  { time: '5:00 AM', title: 'Boots on', detail: 'Dogs out, quick potty, light breakfast for them — full meal after the hunt. Layers on. Nobody is allowed to be grumpy yet.', icon: '⏰' },
  { time: '5:30 AM', title: 'Load the truck', detail: 'Guns cased and unloaded. Dogs crated. Coolers, water, vests. Run the checklist one last time — out loud.', icon: '🛻' },
  { time: '6:00 AM', title: 'Roll out', detail: 'Breakfast on the road. Boys pick the playlist. Dad drives. Ace rides where he cannot chew a seatbelt.', icon: '🛣️' },
  { time: '6:50 AM', title: 'Arrive · Tailgate brief', detail: 'Park. Collars on, vests on, radios on. Everyone recites The Code. Load only when the line is set and the field is called.', icon: '📍' },
  { time: 'Legal light', title: 'First field', detail: 'Walk into the wind so the dogs get scent. Line abreast — Dad center, boys on the flanks, 20 yards apart. Slow. Stop every 50 yards; birds hold tight and flush when you pause.', icon: '🌅', key: 'light' },
  { time: '9:30 AM', title: 'Water the dogs', detail: 'Check paws for cuts and burrs. Count shells. Swap fields. Birds move from roost grass toward feed by now — work the edges.', icon: '💧' },
  { time: '12:00 PM', title: 'Tailgate lunch', detail: 'Birds in the cooler. Sandwiches out. Log the Bird Board. Somebody tells the story of the one that got away — there is always one.', icon: '🥪' },
  { time: '1:00 PM', title: 'Afternoon push', detail: 'Midday birds loaf in heavy cover: CRP, plum thickets, cattail sloughs, shelterbelts. Work it slow. Ace stays on the check cord.', icon: '🌾' },
  { time: '3:30 PM', title: 'Last field', detail: 'Birds head back to roost cover near sunset — the best hour of the day. Milo stubble edges and grass. Finish strong, stay safe, no rushed shots.', icon: '🔥' },
  { time: 'Sunset', title: 'Guns down', detail: 'Unload at the truck. Case them. Water the dogs, full paw check, pull burrs. Collars off. Everybody breathes.', icon: '🌇', key: 'sunset' },
  { time: '+30 min', title: 'Clean birds', detail: 'Gloves on. Breast or whole-pluck, leave a feathered wing or leg on for ID. Zip bags, on ice. Boys learn this part — it is the job.', icon: '🔪' },
  { time: 'Home', title: 'The bragging venue', detail: 'Dogs fed their full meal and crashed on the couch. Hot shower. Dinner. Bird Board gets finalized. Photos get sent to everyone who was not invited.', icon: '🏠' },
]

export interface Rule {
  n: number
  title: string
  detail: string
}

export const RULES: Rule[] = [
  { n: 1, title: 'Every gun is loaded.', detail: 'Always. Even when you just checked. Even when it is cased.' },
  { n: 2, title: 'Muzzle control.', detail: 'Never let it point at anything you are not willing to destroy. Up or down, never across the line.' },
  { n: 3, title: 'Walk the line.', detail: 'Know where every person and every dog is before the gun comes up. If you cannot see someone, you do not shoot.' },
  { n: 4, title: 'Your zone only.', detail: 'Shoot inside your own window. No low birds. No birds over the dogs. No swinging through the line — ever.' },
  { n: 5, title: 'Safety on. Finger off.', detail: 'Until the bird is in the air, clear, and you have called it. Then and only then.' },
  { n: 6, title: 'Unload to cross.', detail: 'Fences, ditches, creeks, the truck. Action open, hand it over, climb, hand it back.' },
  { n: 7, title: 'Blaze orange, all day.', detail: 'Hat and vest. No exceptions. The dogs wear theirs too.' },
  { n: 8, title: 'Eyes and ears on.', detail: 'Before you load. Not after the first shot.' },
  { n: 9, title: 'Call it loud.', detail: '"Bird!" · "Hen!" · "No shot!" · "Dog!" — the whole line hears it.' },
  { n: 10, title: 'When in doubt, do not shoot.', detail: 'There is always another rooster. There is not another brother.' },
]

export interface Tip {
  icon: string
  title: string
  body: string
}

export const FIELD_TIPS: Tip[] = [
  { icon: '🐓', title: 'Rooster or hen?', body: 'Rooster: long pointed tail, white neck ring, red face, green-black head, copper body, and he cackles when he flushes. Hen: mottled brown, shorter tail, quiet. No color, no cackle, no shot.' },
  { icon: '🌬️', title: 'Hunt into the wind', body: 'Dogs find birds with their nose. Walk fields so the wind is in your face and the scent comes to them. Plan each field from the truck before you step out.' },
  { icon: '🛑', title: 'Stop and stand', body: 'Pheasants run, then hold. Every 40–50 yards, stop for a ten-count. Nervous birds that were running will often flush right at your feet.' },
  { icon: '🌅', title: 'Where they are, when', body: 'Dawn: grassy roost cover near grain. Midday: the thick stuff — CRP, plum thickets, cattails, shelterbelts. Last hour: back in the stubble feeding, then to roost.' },
  { icon: '🐕', title: 'Trust the dog', body: 'Tail speed doubles, nose drops, body gets birdy — get ready and get your feet set. When Sage goes birdy, the bird is closer than you think.' },
  { icon: '🎯', title: 'Lead and follow through', body: 'A crossing rooster is faster than he looks. Head, beak, bang, keep swinging. Pick the head, not the whole bird.' },
]

export const HUNT_DEFAULTS = {
  huntDate: '2026-11-14', // Kansas opener — 2nd Saturday in November
  locationName: 'Kansas · Opening Weekend',
  regionId: 'central',
}
