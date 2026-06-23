import type { ItemCategory } from '@style-yangu/types'

export type ShowcaseMode = 'full_body' | 'face_neck' | 'studio'

const MODE_MAP: Record<ItemCategory, ShowcaseMode> = {
  top: 'full_body',
  bottom: 'full_body',
  dress: 'full_body',
  suit: 'full_body',
  outerwear: 'full_body',
  jumpsuit: 'full_body',
  hat: 'face_neck',
  headwrap: 'face_neck',
  shoe: 'studio',
  bag: 'studio',
  jewellery: 'studio',
  accessory: 'studio',
}

export function getShowcaseMode(category: ItemCategory): ShowcaseMode {
  return MODE_MAP[category] ?? 'studio'
}

export function useShowcaseMode(category: ItemCategory | null): ShowcaseMode | null {
  if (!category) return null
  return getShowcaseMode(category)
}
