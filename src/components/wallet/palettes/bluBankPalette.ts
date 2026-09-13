import type { BankColorPalette } from '../bankPaletteTypes'

export const BLU_BANK_ID = 'blu'

export const BLU_BANK_PALETTE: BankColorPalette = {
  bankId: BLU_BANK_ID,
  defaultColorId: 'blue',
  variants: [
    {
      id: 'blue',
      label: 'آبی',
      hex: '#307FE2',
      gradient: 'linear-gradient(145deg, #1f6fd4 0%, #307FE2 52%, #5a9ef0 100%)',
      accent: '#ffffff',
      text: '#ffffff',
      pattern: 'radial-gradient(circle at 82% 18%, rgba(255,255,255,0.22) 0%, transparent 44%)'
    },
    {
      id: 'red',
      label: 'قرمز',
      hex: '#FF0D3B',
      gradient: 'linear-gradient(145deg, #d90a32 0%, #FF0D3B 52%, #ff3d62 100%)',
      accent: '#ffffff',
      text: '#ffffff',
      pattern: 'radial-gradient(circle at 14% 82%, rgba(255,255,255,0.16) 0%, transparent 46%)'
    },
    {
      id: 'green',
      label: 'سبز',
      hex: '#00AB84',
      gradient: 'linear-gradient(145deg, #008f6d 0%, #00AB84 52%, #2ec9a3 100%)',
      accent: '#ffffff',
      text: '#ffffff',
      pattern: 'radial-gradient(circle at 78% 72%, rgba(255,255,255,0.14) 0%, transparent 48%)'
    },
    {
      id: 'purple',
      label: 'بنفش',
      hex: '#6558B1',
      gradient: 'linear-gradient(145deg, #5248a0 0%, #6558B1 52%, #8578c8 100%)',
      accent: '#ffffff',
      text: '#ffffff',
      pattern: 'radial-gradient(circle at 20% 24%, rgba(255,255,255,0.18) 0%, transparent 42%)'
    },
    {
      id: 'yellow',
      label: 'زرد',
      hex: '#FFD100',
      gradient: 'linear-gradient(145deg, #e6bc00 0%, #FFD100 52%, #ffe566 100%)',
      accent: '#333333',
      text: '#333333',
      pattern: 'radial-gradient(circle at 85% 30%, rgba(255,255,255,0.35) 0%, transparent 45%)'
    },
    {
      id: 'rose',
      label: 'رزگلد',
      hex: '#E1A6AD',
      gradient: 'linear-gradient(145deg, #d08f98 0%, #E1A6AD 52%, #efc4ca 100%)',
      accent: '#5c3d42',
      text: '#4a2f33',
      pattern: 'radial-gradient(circle at 12% 78%, rgba(255,255,255,0.28) 0%, transparent 48%)'
    },
    {
      id: 'black',
      label: 'مشکی',
      hex: '#333333',
      gradient: 'linear-gradient(145deg, #1a1a1a 0%, #333333 52%, #4a4a4a 100%)',
      accent: '#ffffff',
      text: '#ffffff',
      pattern: 'radial-gradient(circle at 70% 20%, rgba(255,255,255,0.1) 0%, transparent 42%)'
    }
  ]
}
