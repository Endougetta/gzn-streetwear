import data from './catalog.json'

export const categories = [
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'sweatshirts', label: 'Sweatshirts' },
  { id: 't-shirts', label: 'T-Shirts' },
  { id: 'hosen', label: 'Hosen' },
]

export const products = data
export type Product = (typeof products)[number]
export const productById = new Map(products.map(product => [product.id, product]))
// Vor der Freischaltung mit den verfügbaren Größen abgleichen.
export const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
export const maxQuantity = 10
export const maxLines = 30

export type Line = { productId: string; size: string; quantity: number }
export const lineKey = (line: Line) => JSON.stringify([line.productId, line.size])

export function isLine(value: unknown): value is Line {
  if (typeof value !== 'object' || value === null) return false
  const line = value as Partial<Line>
  return typeof line.productId === 'string' && productById.has(line.productId)
    && typeof line.size === 'string' && sizes.includes(line.size)
    && typeof line.quantity === 'number' && Number.isInteger(line.quantity)
    && line.quantity >= 1 && line.quantity <= maxQuantity
}

const reviewAssets = (globalThis as typeof globalThis & { gznReviewAssets?: Record<string, string> }).gznReviewAssets

export const isOfflineReview = Boolean(reviewAssets)
export const isReviewPreview = isOfflineReview || import.meta.env.VITE_HOSTED_REVIEW === '1'
export const assetUrl = (path: string) => reviewAssets?.[path] ?? path

export const photo = (product: Product, view: string, width = 1120) =>
  assetUrl('/products/' + product.id + '/' + view + '-' + width + '.webp')

export function cardViews(product: Product) {
  const pick = (ids: string[]) => ids.find(id => product.images.some(img => img.id === id))
  const frontOrder = product.category === 't-shirts'
    ? ['gefaltet_front', 'lose_front', 'model_front']
    : ['lose_front', 'model_front', 'gefaltet_front']
  const front = pick(frontOrder) ?? product.images[0].id
  const back = pick(['lose_back', 'model_back', 'closeup_back'])
  return { front, back }
}
