import type { BankColorPalette } from '../bankPaletteTypes'

export const EGHTESAD_NOVIN_BANK_ID = 'eghtesad-novin'

export const EGHTESAD_NOVIN_PALETTE: BankColorPalette = {
  bankId: EGHTESAD_NOVIN_BANK_ID,
  defaultColorId: 'lavender',
  variants: [
    {
      id: 'lavender',
      label: 'بنفش آرام',
      hex: '#C8B6D8',
      gradient: 'linear-gradient(145deg, #b5a0ca 0%, #C8B6D8 48%, #ddd0ea 100%)',
      accent: '#97199a',
      text: '#4a2d5c',
      pattern: 'radial-gradient(circle at 82% 18%, rgba(255,255,255,0.35) 0%, transparent 44%)'
    },
    {
      id: 'white',
      label: 'سفید',
      hex: '#FFFFFF',
      gradient: 'linear-gradient(145deg, #ffffff 0%, #faf8fc 55%, #f0eaf5 100%)',
      accent: '#97199a',
      text: '#97199a',
      pattern: 'radial-gradient(circle at 18% 78%, rgba(151,25,154,0.08) 0%, transparent 48%)'
    },
    {
      id: 'purple',
      label: 'بنفش',
      hex: '#97199A',
      gradient: 'linear-gradient(145deg, #7a1480 0%, #97199A 52%, #b33bb8 100%)',
      accent: '#ffffff',
      text: '#ffffff',
      pattern: 'radial-gradient(circle at 20% 24%, rgba(255,255,255,0.16) 0%, transparent 42%)'
    },
    {
      id: 'mauve',
      label: 'سرخابی روشن',
      hex: '#D9A8DC',
      gradient: 'linear-gradient(145deg, #c88fcd 0%, #D9A8DC 52%, #ecd4ef 100%)',
      accent: '#97199a',
      text: '#5c2d61',
      pattern: 'radial-gradient(circle at 78% 72%, rgba(255,255,255,0.24) 0%, transparent 48%)'
    },
    {
      id: 'plum',
      label: 'بنفش تیره',
      hex: '#6E1480',
      gradient: 'linear-gradient(145deg, #4f0f5c 0%, #6E1480 52%, #8a2a9c 100%)',
      accent: '#f0e6f2',
      text: '#ffffff',
      pattern: 'radial-gradient(circle at 85% 30%, rgba(255,255,255,0.12) 0%, transparent 45%)'
    }
  ]
}
