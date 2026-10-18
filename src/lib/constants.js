// Default "standard drink" sizes, in millilitres and ABV fraction.
// These seed the quick-log buttons and can be edited in Setup.
export const DEFAULT_SIZES = {
  wine: { ml: 150, abv: 0.12 },
  beer: { ml: 330, abv: 0.05 },
  cava: { ml: 120, abv: 0.11 },
  liquor: { ml: 60, abv: 0.4 },
}

export const DRINK_TYPES = ['wine', 'beer', 'cava', 'liquor']

export const LABELS = {
  wine: 'Wine',
  beer: 'Beer',
  cava: 'Cava',
  liquor: 'Liquor',
}

// Glyph shown next to each drink type (log sheet tiles, log rows). Written as
// escapes so the file survives any editor/encoding round-trip.
export const DRINK_ICONS = {
  wine: '\u{1F377}',
  beer: '\u{1F37A}',
  cava: '\u{1F942}',
  liquor: '\u{1F943}',
}

// Common pour sizes per type, in cl. The user's configured default for the
// type is merged in by `sizeChips()` (lib/drinks.js) and pre-selected.
export const SIZE_PRESETS_CL = {
  wine: [12, 15, 18, 25],
  beer: [33, 40, 50],
  cava: [10, 12, 15],
  liquor: [2, 4, 6, 8],
}

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

// One "standard glass" is defined as 12 g of pure alcohol (Swedish standard).
export const STD_GLASS_GRAMS = 12

// Density of ethanol (g/ml).
export const ETHANOL_DENSITY = 0.789

// Alcohol burn-off rate used by the Widmark estimate (‰ per hour).
export const BURN_RATE = 0.15

// Body-water ratio (Widmark r) by sex.
export const WIDMARK_R = { M: 0.68, F: 0.55 }

export const DEFAULT_LIMIT = 3

// Plain-language BAC bands for the Today hero. `max` is exclusive except for
// sober, which is exactly 0 (after rounding to the 2 dp the UI shows). Each
// id maps to a `--zone-<id>` colour token in global.css. 0.2‰ is the Swedish
// legal driving limit, but the UI never claims fitness to drive — this is a
// Widmark estimate.
export const BAC_ZONES = [
  { id: 'sober', label: 'Sober', max: 0 },
  { id: 'light', label: 'Light', max: 0.2 },
  { id: 'tipsy', label: 'Tipsy', max: 0.5 },
  { id: 'drunk', label: 'Drunk', max: 1.0 },
  { id: 'heavy', label: 'Very drunk', max: Infinity },
]

// How long the "Logged … · Undo" toast stays up.
export const UNDO_TOAST_MS = 6000

// Default weekly goal, in standard glasses per week — the baseline the Insights
// trend is framed against. Editable in Setup.
export const DEFAULT_WEEKLY_TARGET = 10

// The logical day rolls at 05:00 local — a drink logged at 02:00 counts to the
// previous night, so a session that runs past midnight stays in one bucket.
export const DAY_START_HOUR = 5

// Default clock time for drinks backfilled onto a past day. Must stay ≥
// DAY_START_HOUR so the minted timestamp lands in the target logical day.
export const BACKFILL_HOUR = 20

// Selectable accent themes. The neon look is token-driven (see global.css):
// `:root` carries the blue default; every other id maps to a `[data-theme]`
// block that swaps --accent / --accent-hover. `swatch` is a solid preview
// colour for the picker (independent of the active theme). Danger/red and
// BAC-zone tokens are semantic and never themed.
export const THEMES = [
  { id: 'blue', label: 'Blue', swatch: 'oklch(0.72 0.155 255)' },
  { id: 'pink', label: 'Pink', swatch: 'oklch(0.72 0.23 350)' },
  { id: 'cyan', label: 'Cyan', swatch: 'oklch(0.72 0.14 195)' },
  { id: 'green', label: 'Green', swatch: 'oklch(0.72 0.18 150)' },
  { id: 'amber', label: 'Amber', swatch: 'oklch(0.72 0.17 75)' },
]

export const DEFAULT_THEME = 'blue'

export const DEFAULT_PROFILE = {
  weight: 75,
  sex: 'M',
  weeklyTarget: DEFAULT_WEEKLY_TARGET,
  theme: DEFAULT_THEME,
}

// Sober-day streak milestones (award badges).
export const MILESTONES = [
  {
    d: 1,
    icon: '1',
    label: 'First clear day',
    desc: 'A full day with nothing logged.',
  },
  { d: 3, icon: '3', label: 'Dry spell', desc: 'Three sober days in a row.' },
  {
    d: 7,
    icon: '7',
    label: 'One week clear',
    desc: 'A whole week off the drink.',
  },
  {
    d: 14,
    icon: '14',
    label: 'Two weeks strong',
    desc: '14 sober days back to back.',
  },
  { d: 30, icon: '30', label: 'Dry month', desc: 'A full month with none.' },
  { d: 90, icon: '90', label: '90-day legend', desc: 'A quarter year sober.' },
]

// Also read by the inline pre-paint script in index.html — keep in sync.
export const STORAGE_KEY = 'neontrk_v1'
