export interface SamplePin {
  word: string
  meaning: string
  regionLabel: string
  lat: number
  lng: number
}

export const SAMPLE_PINS: SamplePin[] = [
  { word: 'butty', meaning: 'A sandwich.', regionLabel: 'South Wales, UK', lat: 51.48, lng: -3.18 },
  { word: 'bairn', meaning: 'A child.', regionLabel: 'Edinburgh, Scotland, UK', lat: 55.95, lng: -3.19 },
  { word: 'youse', meaning: 'The plural form of you.', regionLabel: 'New York, NY, USA', lat: 40.71, lng: -74.01 },
  { word: 'hella', meaning: 'Very; extremely.', regionLabel: 'San Francisco, CA, USA', lat: 37.77, lng: -122.42 },
  { word: 'potholder', meaning: 'A small oven mitt or mitt-like cloth used to handle hot cookware.', regionLabel: 'Chicago, IL, USA', lat: 41.88, lng: -87.63 },
  { word: 'jumble', meaning: 'A sale of donated second-hand goods.', regionLabel: 'Bristol, England, UK', lat: 51.45, lng: -2.58 },
  { word: 'barbie', meaning: 'An outdoor barbecue or grill.', regionLabel: 'Sydney, NSW, Australia', lat: -33.87, lng: 151.21 },
  { word: 'jigger', meaning: 'A small measure of alcohol.', regionLabel: 'Dublin, Ireland', lat: 53.35, lng: -6.26 },
  { word: 'slip', meaning: 'An underskirt or lightweight garment worn beneath a dress.', regionLabel: 'Boston, MA, USA', lat: 42.36, lng: -71.06 },
]

