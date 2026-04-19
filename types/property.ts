export type PropertyStatus = 'active' | 'back_on_market' | 'pending' | 'sold'

export type Property = {
  id: string
  address: string
  city: string
  state: string
  zip: string
  price: number
  beds: number
  baths: number
  sqft: number
  tags: string[]
  status: PropertyStatus
  daysOnMarket: number
  imageUrl?: string
  mlsNumber: string
}
