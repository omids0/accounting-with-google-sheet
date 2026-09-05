import { type ImgHTMLAttributes, useState } from 'react'

import { cn } from '../utils/cn'

type LazyImageProps = ImgHTMLAttributes<HTMLImageElement>

export default function LazyImage({
  className,
  loading,
  decoding,
  alt = '',
  onLoad,
  ...props
}: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)

  return (
    <img
      className={cn('lazy-image', className)}
      alt={alt}
      loading={loading ?? 'lazy'}
      decoding={decoding ?? 'async'}
      data-loaded={loaded ? 'true' : undefined}
      onLoad={event => {
        setLoaded(true)
        onLoad?.(event)
      }}
      {...props}
    />
  )
}
