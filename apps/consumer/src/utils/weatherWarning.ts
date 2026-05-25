export type StylistName = 'amara' | 'kofi'
export type WarningLevel = 1 | 2 | 3

export interface WeatherWarning {
  level: WarningLevel
  message: string
}

const RULES: Array<{
  conditions: string[]
  tags: string[]
  level: WarningLevel
  message: Record<StylistName, string>
}> = [
  {
    conditions: ['wind', 'windy'],
    tags: ['loose-skirt', 'wide-leg-trousers', 'oversized-shirt'],
    level: 1,
    message: {
      amara: "Bestie, this wind and that skirt are not friends.",
      kofi:  "That skirt has its own agenda today.",
    },
  },
  {
    conditions: ['rain', 'drizzle', 'thunderstorm'],
    tags: ['suede', 'white-linen', 'open-toe', 'flared-hem'],
    level: 2,
    message: {
      amara: "Girl, it's going to rain — put the suede away.",
      kofi:  "Rain's on the way. Suede and wet pavement don't mix.",
    },
  },
  {
    conditions: ['extreme', 'hot'],
    tags: ['heavy-layer', 'dark-colour', 'synthetic'],
    level: 1,
    message: {
      amara: "It's so hot today — those layers will have you melting.",
      kofi:  "It's scorching out there. Heavy layers will drain you.",
    },
  },
  {
    conditions: ['cold', 'snow', 'fog'],
    tags: ['bare-legs', 'thin-fabric'],
    level: 1,
    message: {
      amara: "It's chilly! You'll be freezing in those bare legs.",
      kofi:  "Cold out there — bare legs aren't the move today.",
    },
  },
  {
    conditions: ['humid'],
    tags: ['natural-hair-style', 'non-breathable'],
    level: 1,
    message: {
      amara: "Humidity alert! Linen is your best friend right now.",
      kofi:  "High humidity today. Breathable fabrics will keep you comfortable.",
    },
  },
]

export function getWeatherWarning(
  condition: string,
  clothingTags: string[],
  stylist: StylistName,
): WeatherWarning | null {
  const condLower = condition.toLowerCase()
  for (const rule of RULES) {
    if (!rule.conditions.some(c => condLower.includes(c))) continue
    if (clothingTags.some(t => rule.tags.includes(t))) {
      return { level: rule.level, message: rule.message[stylist] }
    }
  }
  return null
}
