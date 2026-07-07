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

export const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// One "standard glass" is defined as 12 g of pure alcohol (Swedish standard).
export const STD_GLASS_GRAMS = 12

// Density of ethanol (g/ml).
export const ETHANOL_DENSITY = 0.789

// Alcohol burn-off rate used by the Widmark estimate (‰ per hour).
export const BURN_RATE = 0.15

// Body-water ratio (Widmark r) by sex.
export const WIDMARK_R = { M: 0.68, F: 0.55 }

export const DEFAULT_LIMIT = 5

export const DEFAULT_PROFILE = { weight: 75, sex: 'M' }

// Sober-day streak milestones (award badges).
export const MILESTONES = [
  { d: 1, icon: '1', label: 'First clear day', desc: 'A full day with nothing logged.' },
  { d: 3, icon: '3', label: 'Dry spell', desc: 'Three sober days in a row.' },
  { d: 7, icon: '7', label: 'One week clear', desc: 'A whole week off the drink.' },
  { d: 14, icon: '14', label: 'Two weeks strong', desc: '14 sober days back to back.' },
  { d: 30, icon: '30', label: 'Dry month', desc: 'A full month with none.' },
  { d: 90, icon: '90', label: '90-day legend', desc: 'A quarter year sober.' },
]

export const STORAGE_KEY = 'neontrk_v1'
