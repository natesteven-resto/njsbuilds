export type Member = {
  id: string;
  name: string;
  role: string;
  kind: "hunter" | "dog";
  note: string;
};

export type Item = {
  id: string;
  label: string;
  detail: string;
  category: string;
  owner: string;
  essential: boolean;
};

export type Trip = {
  destination: string;
  start: string;
  end: string;
  lodging: string;
  emergency: string;
  vet: string;
  notes: string;
};

export type PrepState = {
  version: 1;
  members: Member[];
  trip: Trip;
  checked: Record<string, boolean>;
  custom: Item[];
};

export const STORAGE_KEY = "njs-pheasant-prep-v1";

export const CATEGORIES = [
  { id: "paperwork", label: "Licenses & access", description: "The green light before the first mile." },
  { id: "personal", label: "Hunter essentials", description: "Three hunters. Each one ready." },
  { id: "dogs", label: "Dog essentials", description: "Look after the hardest workers in the field." },
  { id: "shared", label: "Shared field kit", description: "The things the whole crew counts on." },
  { id: "travel", label: "Truck & basecamp", description: "From the driveway to the last tailgate." },
  { id: "before", label: "Night before", description: "A little preparation. A better morning." },
  { id: "field", label: "In the field", description: "Stay together. Stay aware. Enjoy the day." },
] as const;

const MEMBERS: Member[] = [
  { id: "dad", name: "Dad", role: "Lead hunter", kind: "hunter", note: "Trip lead · adult supervision" },
  { id: "son14", name: "Son · 14", role: "Young hunter", kind: "hunter", note: "Age 14 · supervised youth hunter" },
  { id: "son12", name: "Son · 12", role: "Young hunter", kind: "hunter", note: "Age 12 · supervised youth hunter" },
  { id: "dog1", name: "Dog 1", role: "Bird dog", kind: "dog", note: "Add food, conditioning, and care notes" },
  { id: "dog2", name: "Dog 2", role: "Bird dog", kind: "dog", note: "Add food, conditioning, and care notes" },
  { id: "dog3", name: "Dog 3", role: "Bird dog", kind: "dog", note: "Add food, conditioning, and care notes" },
];

export const DEFAULT_STATE: PrepState = {
  version: 1,
  members: MEMBERS.map((member) => ({ ...member })),
  trip: { destination: "", start: "", end: "", lodging: "", emergency: "", vet: "", notes: "" },
  checked: {},
  custom: [],
};

type Template = Pick<Item, "id" | "label" | "detail" | "essential">;

const hunterPaperwork: Template[] = [
  { id: "license", label: "License & required permits", detail: "Verify requirements for this hunter's age, residency, destination, and dates. Keep the required documents accessible.", essential: true },
  { id: "education", label: "Hunter education & youth eligibility", detail: "Confirm hunter-education or apprentice requirements and adult-supervision rules with the destination's wildlife agency.", essential: true },
];

const hunterKit: Template[] = [
  { id: "blaze", label: "Blaze-orange vest & hat", detail: "Choose visible, properly fitting gear. Verify the destination's required color and coverage before leaving.", essential: true },
  { id: "boots", label: "Broken-in boots & spare socks", detail: "Comfortable boots with traction, moisture-managing socks, and a dry spare pair.", essential: true },
  { id: "layers", label: "Base layer & warm midlayer", detail: "Comfortable layers for the forecast and active walking. Check the boys' fit before packing.", essential: false },
  { id: "gloves", label: "Gloves & warm hat", detail: "Bring a warm pair and a backup; choose a fit that allows safe handling of equipment.", essential: false },
  { id: "shell", label: "Wind / rain shell", detail: "A packable weather layer, plus spare dry clothes back in the truck.", essential: false },
  { id: "brush", label: "Brush pants or chaps", detail: "Protection suited to the cover and weather. Check fit, freedom of movement, and comfort before leaving.", essential: false },
  { id: "protection", label: "Eye & hearing protection", detail: "Properly fitting protection for each hunter. Check the boys' comfort and fit in advance.", essential: true },
  { id: "water", label: "Personal water bottle", detail: "Fill before departure and carry enough for the route and conditions; keep extra water in the truck.", essential: true },
  { id: "snacks", label: "Field snacks & lunch", detail: "Pack familiar food, account for allergies, and plan breaks that work for both boys.", essential: false },
  { id: "medications", label: "Personal medications & care", detail: "Pack any prescribed medications, relevant care information, sunscreen, and lip balm. Mark complete if not applicable.", essential: false },
  { id: "firearm", label: "Firearm & protective case, if hunting", detail: "Only if this person will hunt and is eligible. Confirm appropriate fit, familiarity, and safe transport and storage.", essential: false },
];

const dogKit: Template[] = [
  { id: "water", label: "Fresh water & travel bowl", detail: "Pack a dedicated bowl and enough clean water, with extra for the drive and breaks.", essential: true },
  { id: "food", label: "Usual food & measured meals", detail: "Bring the dog's normal food, extra for delays, and its usual feeding instructions.", essential: true },
  { id: "id", label: "ID collar, leash & contact details", detail: "Check tag contact information, collar fit, leash condition, and current microchip registration if chipped.", essential: true },
  { id: "tracking", label: "Tracking collar & charger, if used", detail: "Charge and pair the collar, label the correct dog, and bring its charging lead. Mark complete if not used.", essential: false },
  { id: "vest", label: "Properly fitted field vest, if used", detail: "Check fit and comfort before the trip; choose gear suited to the dog and conditions.", essential: false },
  { id: "kennel", label: "Secure travel crate & dry bedding", detail: "Provide a safe, properly secured travel setup with suitable ventilation and a dry place to rest.", essential: true },
  { id: "records", label: "Care instructions & medications", detail: "Bring any prescribed medications and relevant records. Review individual needs and readiness with your veterinarian.", essential: false },
  { id: "paws", label: "Paw / coat supplies & cleanup towel", detail: "Pack familiar paw-care supplies, a comb, tick-removal tool, and towel; include boots only if already suitable and comfortable for this dog.", essential: false },
];

function forMembers(kind: Member["kind"], category: string, templates: Template[]): Item[] {
  return MEMBERS.filter((member) => member.kind === kind).flatMap((member) =>
    templates.map((template) => ({ ...template, id: `${member.id}-${template.id}`, owner: member.id, category })),
  );
}

function shared(category: string, templates: Template[]): Item[] {
  return templates.map((template) => ({ ...template, category, owner: "shared" }));
}

export const ITEMS: Item[] = [
  ...forMembers("hunter", "paperwork", hunterPaperwork),
  ...shared("paperwork", [
    { id: "rules", label: "Current destination rules", detail: "Use the official wildlife agency to verify season dates, shooting hours, limits, species identification, and all youth requirements.", essential: true },
    { id: "access", label: "Land permission & access maps", detail: "Confirm permission or public access, property boundaries, parking, and any site-specific restrictions.", essential: true },
    { id: "ammo-rules", label: "Ammunition & transport requirements", detail: "Check the rules for the specific land and every jurisdiction on your route, including any non-toxic-shot requirements.", essential: true },
    { id: "youth-supervision", label: "Verify supervision for both boys", detail: "Confirm adult qualifications and whether one adult may supervise both boys under the destination and property rules. Arrange another qualified adult if needed.", essential: true },
    { id: "itinerary", label: "Leave a trip & check-in plan", detail: "Share your route, hunting area, vehicle details, expected return, and check-in plan with someone at home.", essential: true },
    { id: "contacts", label: "Save emergency & veterinary contacts", detail: "Record the nearest emergency facility, local response information, and a veterinarian that can receive urgent cases; save them offline.", essential: true },
    { id: "lodging-rules", label: "Confirm lodging & three-dog policy", detail: "Verify reservation details, arrival instructions, dog limits, kennel arrangements, and any required records.", essential: false },
  ]),
  ...forMembers("hunter", "personal", hunterKit),
  ...forMembers("dog", "dogs", dogKit),
  ...shared("shared", [
    { id: "human-first-aid", label: "Human first-aid kit", detail: "Check contents and expiry dates; pack supplies you know how to use, plus individual care needs.", essential: true },
    { id: "dog-first-aid", label: "Dog first-aid kit", detail: "Prepare a field kit and emergency plan with your veterinarian. Keep care instructions and contact details together.", essential: true },
    { id: "navigation", label: "Offline maps & backup navigation", detail: "Download the hunt area and route before losing signal. Bring a reliable backup and know how to use it.", essential: true },
    { id: "communication", label: "Charged phones & communication plan", detail: "Agree on check-ins, meeting points, and what to do if separated; account for areas with no service.", essential: true },
    { id: "power", label: "Power bank & charging cables", detail: "Pack the right connections for phones, dog trackers, and other electronics.", essential: false },
    { id: "ammunition", label: "Correct, permitted ammunition", detail: "Only if hunting: match ammunition to each firearm and the destination rules; keep it organized and secured for transport.", essential: false },
    { id: "bird-bag", label: "Game bag / vest & bird transport kit", detail: "Bring a suitable carrier, gloves, bags, and labels as needed; confirm the destination's identification and transport rules.", essential: false },
    { id: "dog-water-reserve", label: "Extra dog water & spare bowl", detail: "Carry a reserve for all three dogs and plan reliable refills. Natural water sources are not your water plan.", essential: true },
    { id: "spare-leads", label: "Spare leashes & repair basics", detail: "A spare lead, collar hardware, and a small repair kit can save a long walk back.", essential: false },
    { id: "light", label: "Headlamp & backup light", detail: "Check batteries and pack spare power for early starts, late packing, or an unexpected delay.", essential: false },
    { id: "weather-kit", label: "Sun / insect protection & hand warmers", detail: "Choose products and layers appropriate for the crew, destination, and forecast; follow product labels.", essential: false },
    { id: "waste-kit", label: "Trash bags, wipes & cleanup kit", detail: "Pack out waste and leave gates, parking areas, and the field as you found them.", essential: false },
  ]),
  ...shared("travel", [
    { id: "truck-check", label: "Truck fuel, tires & fluids", detail: "Check the vehicle, spare tire, tools, fuel range, and access-road conditions before departure.", essential: true },
    { id: "road-kit", label: "Roadside emergency kit", detail: "Pack suitable roadside basics, weather protection, and a plan for a breakdown away from service.", essential: false },
    { id: "cargo", label: "Secure kennels & all cargo", detail: "Secure each travel crate and loose equipment; keep ventilation clear and access practical for all three dogs.", essential: true },
    { id: "secure-storage", label: "Safe firearm storage & transport", detail: "If bringing firearms, transport unloaded and secured; plan storage that prevents unauthorized access and meets applicable rules.", essential: true },
    { id: "cooler", label: "Cooler, ice & food storage", detail: "Pack food safely and plan appropriate cooling for harvested birds, separate from ready-to-eat food.", essential: false },
    { id: "camp-water", label: "Extra people water & meals", detail: "Include the drive, basecamp, and unexpected delays—not just time in the field.", essential: false },
    { id: "dry-clothes", label: "Dry clothes, shoes & boot tray", detail: "A full dry change for each person and somewhere to put muddy boots make the drive home better.", essential: false },
    { id: "dog-camp", label: "Dog rest, shade & cleanup setup", detail: "Plan a supervised, comfortable resting space, bedding, towels, and waste bags for three dogs.", essential: false },
    { id: "reservations", label: "Offline route & reservation details", detail: "Save addresses, entry instructions, fuel stops, and booking information where you can find them without service.", essential: false },
    { id: "recovery-comfort", label: "Tailgate chairs & after-hunt snacks", detail: "Make room for a relaxed break, a dog check, and a few good stories before heading home.", essential: false },
  ]),
  ...shared("before", [
    { id: "forecast", label: "Check forecast & adjust the plan", detail: "Review temperature, wind, precipitation, alerts, road access, and daylight. Change the route or timing when conditions call for it.", essential: true },
    { id: "youth-plan", label: "Confirm youth supervision & pace", detail: "Set a clear adult-supervision plan that meets local rules. Match walking distance and breaks to both boys' experience and energy.", essential: true },
    { id: "safety-brief", label: "Walk through the safety plan together", detail: "Review safe directions, spacing, boundaries, dog awareness, stop signals, and the separation plan. Everyone can call a stop.", essential: true },
    { id: "charge", label: "Charge, label & test electronics", detail: "Check phones, lights, tracker collars, receivers, and power banks; match each collar to the correct dog.", essential: false },
    { id: "water-prep", label: "Fill bottles, bowls & reserves", detail: "Load clean water for three people and three dogs, with extra for travel and delays.", essential: true },
    { id: "dog-ready", label: "Check each dog's readiness", detail: "Consider conditioning, paws, comfort, and individual care needs. Plan shorter work periods and rotations; contact your vet with concerns.", essential: true },
    { id: "load-check", label: "Do the six-member loadout check", detail: "Walk through every person's and dog's essentials, documents, dry gear, food, and travel setup before closing the tailgate.", essential: false },
    { id: "rest", label: "Set departure, breakfast & bedtime", detail: "Start with rested people and a realistic morning. Leave time for dog care and an unhurried gear check.", essential: false },
  ]),
  ...shared("field", [
    { id: "field-check-in", label: "Check in, legal hours & route", detail: "Follow property check-in instructions, confirm today's legal hours and boundaries, and tell your home contact the route and expected return.", essential: true },
    { id: "field-brief", label: "Reconfirm positions & stop signals", detail: "Keep the boys appropriately supervised. Know where every person and dog is, and stop whenever the situation is unclear.", essential: true },
    { id: "field-water", label: "Take water & rest breaks", detail: "Offer frequent breaks for the boys and dogs. Adapt the day to the weather and each member's condition.", essential: true },
    { id: "field-dog-rotation", label: "Rotate dogs & watch their condition", detail: "Give each dog recovery time, check comfort and behavior, and stop work if a dog seems unwell or injured; contact a vet as needed.", essential: true },
    { id: "field-weather", label: "Reassess conditions & daylight", detail: "Watch changing weather, visibility, footing, and fatigue. Leave enough time for an easy return.", essential: false },
    { id: "field-dog-check", label: "Post-hunt dog check & dry-down", detail: "Inspect paws, coat, and skin for issues, dry wet gear, and provide a comfortable rest. Ask your vet about anything concerning.", essential: false },
    { id: "field-pack-out", label: "Count the crew & pack out", detail: "Account for all three people, all three dogs, gear, and waste; handle any harvested birds according to current local rules.", essential: true },
    { id: "field-home", label: "Send the all-clear & save the memories", detail: "Let your home contact know you're safely back. Take a crew photo and note what to pack differently next time.", essential: false },
  ]),
];

export const SOURCES: { label: string; url: string }[] = [
  { label: "Find your official wildlife agency", url: "https://www.fishwildlife.org/landing/membership/member-list" },
  { label: "Minnesota DNR · pheasant preparation", url: "https://www.dnr.state.mn.us/hunting/pheasant/tips.html" },
  { label: "AVMA · traveling with pets", url: "https://avma.org/public/PetCare/Pages/Traveling-with-Your-Pet-FAQs.aspx" },
  { label: "Cornell · dog heat safety", url: "https://www.vet.cornell.edu/departments-centers-and-institutes/riney-canine-health-center/canine-health-topics/summer-heat-safety-tips-dogs" },
  { label: "Penn State Extension · game-bird care", url: "https://extension.psu.edu/proper-care-and-handling-of-game-birds-from-field-to-table" },
];

const CATEGORY_IDS = new Set<string>(CATEGORIES.map((category) => category.id));
const ITEM_IDS = new Set(ITEMS.map((item) => item.id));
const MEMBER_BY_ID = new Map(MEMBERS.map((member) => [member.id, member]));
const OWNERS = new Set(["shared", ...MEMBERS.map((member) => member.id)]);
const MAX_BACKUP_LENGTH = 1_000_000;

function record(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, field: string, max: number, required = false): string {
  if (typeof value !== "string") throw new Error(`${field} must be text.`);
  const result = value.trim();
  if (required && !result) throw new Error(`${field} cannot be empty.`);
  if (result.length > max) throw new Error(`${field} must be ${max.toLocaleString("en-US")} characters or fewer.`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(result)) {
    throw new Error(`${field} contains unsupported control characters.`);
  }
  return result;
}

function id(value: unknown, field: string): string {
  const result = text(value, field, 100, true);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(result)) {
    throw new Error(`${field} may only contain letters, numbers, hyphens, and underscores.`);
  }
  return result;
}

function date(value: unknown, field: string): string {
  const result = text(value, field, 10);
  if (!result) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${field} must use YYYY-MM-DD.`);
  const [year, month, day] = result.split("-").map(Number);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    throw new Error(`${field} must be a real calendar date.`);
  }
  return result;
}

/** Validate untrusted imports without mutating the current planner or its defaults. */
export function parseBackup(raw: string): PrepState {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("Choose a nonempty planner backup file.");
  if (raw.length > MAX_BACKUP_LENGTH) throw new Error("This backup is too large. Choose a planner backup smaller than 1 MB.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON. Choose an exported planner backup.");
  }

  const source = record(parsed, "Backup");
  if (source.version !== 1) throw new Error("Unsupported backup version. This planner accepts version 1 backups.");
  if (!Array.isArray(source.members) || source.members.length !== MEMBERS.length) {
    throw new Error("Backup must include the three hunters and three dogs.");
  }

  const importedMembers = new Map<string, Member>();
  source.members.forEach((value: unknown, index: number) => {
    const field = `Crew member ${index + 1}`;
    const member = record(value, field);
    const memberId = id(member.id, `${field} ID`);
    const expected = MEMBER_BY_ID.get(memberId);
    if (!expected) throw new Error(`${field} has an unknown member ID.`);
    if (importedMembers.has(memberId)) throw new Error(`The crew contains duplicate member ID "${memberId}".`);
    if (member.kind !== expected.kind) throw new Error(`${field} has an invalid member kind.`);
    const role = text(member.role, `${field} role`, 50, true);
    if (role !== expected.role) throw new Error(`${field} has an invalid role.`);
    importedMembers.set(memberId, {
      id: memberId,
      name: text(member.name, `${field} name`, 60, true),
      role: expected.role,
      kind: expected.kind,
      note: text(member.note, `${field} note`, 1_000),
    });
  });

  const tripSource = record(source.trip, "Trip");
  const trip: Trip = {
    destination: text(tripSource.destination, "Destination", 160),
    start: date(tripSource.start, "Start date"),
    end: date(tripSource.end, "End date"),
    lodging: text(tripSource.lodging, "Lodging", 300),
    emergency: text(tripSource.emergency, "Emergency contact", 300),
    vet: text(tripSource.vet, "Veterinary contact", 300),
    notes: text(tripSource.notes, "Trip notes", 4_000),
  };
  if (trip.end && !trip.start) {
    throw new Error("Set a start date before adding an end date.");
  }
  if (trip.start && trip.end && trip.end < trip.start) {
    throw new Error("End date cannot be before the start date.");
  }

  if (!Array.isArray(source.custom)) throw new Error("Custom checklist items must be a list.");
  if (source.custom.length > 250) throw new Error("A backup can contain at most 250 custom items.");
  const availableIds = new Set(ITEM_IDS);
  const custom: Item[] = source.custom.map((value: unknown, index: number) => {
    const field = `Custom item ${index + 1}`;
    const item = record(value, field);
    const itemId = id(item.id, `${field} ID`);
    if (itemId === "prototype" || Object.prototype.hasOwnProperty.call(Object.prototype, itemId)) {
      throw new Error(`${field} uses a reserved item ID.`);
    }
    if (availableIds.has(itemId)) throw new Error(`${field} duplicates an existing item ID.`);
    const category = text(item.category, `${field} category`, 40, true);
    if (!CATEGORY_IDS.has(category)) throw new Error(`${field} has an unknown category.`);
    const owner = text(item.owner, `${field} owner`, 100, true);
    if (!OWNERS.has(owner)) throw new Error(`${field} has an unknown crew member.`);
    if (typeof item.essential !== "boolean") throw new Error(`${field} essential flag must be true or false.`);
    const result: Item = {
      id: itemId,
      label: text(item.label, `${field} name`, 140, true),
      detail: text(item.detail, `${field} detail`, 500),
      category,
      owner,
      essential: item.essential,
    };
    availableIds.add(itemId);
    return result;
  });

  const checkedSource = record(source.checked, "Checklist progress");
  const checked: Record<string, boolean> = {};
  for (const [itemId, value] of Object.entries(checkedSource)) {
    if (!availableIds.has(itemId)) throw new Error("Checklist progress refers to an unknown item.");
    if (typeof value !== "boolean") throw new Error("Checklist progress values must be true or false.");
    checked[itemId] = value;
  }

  return {
    version: 1,
    members: MEMBERS.map((member) => importedMembers.get(member.id)!),
    trip,
    checked,
    custom,
  };
}
