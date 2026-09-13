import type { BankColorPalette } from '../bankPaletteTypes'

export const HIBANK_BANK_ID = 'hibank'

/** پالت رنگ کارت‌های های‌بانک — پاستلی‌های اپ (متمایز از رنگ سازمانی کارآفرین) */
export const HIBANK_PALETTE: BankColorPalette = {
  bankId: HIBANK_BANK_ID,
  defaultColorId: 'sky',
  variants: [
    {
      id: 'sky',
      label: 'آبی آسمانی',
      hex: '#89CFF0',
      gradient: 'linear-gradient(145deg, #6eb8e8 0%, #89CFF0 50%, #b3e0f7 100%)',
      accent: '#2F7747',
      text: '#1a4a6e',
      pattern: 'radial-gradient(circle at 84% 16%, rgba(255,255,255,0.35) 0%, transparent 44%)'
    },
    {
      id: 'pink',
      label: 'صورتی',
      hex: '#F4A6A0',
      gradient: 'linear-gradient(145deg, #e88f88 0%, #F4A6A0 50%, #f8c4c0 100%)',
      accent: '#2F7747',
      text: '#5c3a38',
      pattern: 'radial-gradient(circle at 18% 78%, rgba(255,255,255,0.28) 0%, transparent 46%)'
    },
    {
      id: 'purple',
      label: 'بنفش',
      hex: '#C5A3E0',
      gradient: 'linear-gradient(145deg, #b08fd4 0%, #C5A3E0 50%, #dcc8ef 100%)',
      accent: '#2F7747',
      text: '#4a3560',
      pattern: 'radial-gradient(circle at 78% 22%, rgba(255,255,255,0.3) 0%, transparent 42%)'
    },
    {
      id: 'turquoise',
      label: 'فیروزه‌ای',
      hex: '#6EC9C9',
      gradient: 'linear-gradient(145deg, #52b5b5 0%, #6EC9C9 50%, #94dede 100%)',
      accent: '#2F7747',
      text: '#1f4f4f',
      pattern: 'radial-gradient(circle at 82% 18%, rgba(255,255,255,0.26) 0%, transparent 44%)'
    },
    {
      id: 'lemon',
      label: 'زرد لیمویی',
      hex: '#F5E6A8',
      gradient: 'linear-gradient(145deg, #edd98a 0%, #F5E6A8 50%, #faf0c8 100%)',
      accent: '#2F7747',
      text: '#5c5230',
      pattern: 'radial-gradient(circle at 14% 82%, rgba(255,255,255,0.32) 0%, transparent 46%)'
    },
    {
      id: 'peach',
      label: 'هلویی',
      hex: '#F5B895',
      gradient: 'linear-gradient(145deg, #e9a07a 0%, #F5B895 50%, #f8d0b8 100%)',
      accent: '#2F7747',
      text: '#5c4030',
      pattern: 'radial-gradient(circle at 72% 20%, rgba(255,255,255,0.24) 0%, transparent 42%)'
    },
    {
      id: 'white',
      label: 'سفید',
      hex: '#FFFFFF',
      gradient: 'linear-gradient(145deg, #ffffff 0%, #f8f8f6 55%, #f0f0ec 100%)',
      accent: '#2F7747',
      text: '#2F7747',
      pattern: 'radial-gradient(circle at 20% 30%, rgba(137,207,240,0.12) 0%, transparent 45%)'
    },
    {
      id: 'dark',
      label: 'مشکی',
      hex: '#2A2A2A',
      gradient: 'linear-gradient(145deg, #141414 0%, #2A2A2A 52%, #3d3d3d 100%)',
      accent: '#89CFF0',
      text: '#ffffff',
      pattern: 'radial-gradient(circle at 75% 25%, rgba(137,207,240,0.12) 0%, transparent 44%)'
    }
  ]
}
