import Image from 'next/image'

/**
 * Variants:
 *  - 'stamp'  : Full official stamp (box + license #). Best for letterhead/print.
 *  - 'emblem' : Just the circular emblem.
 *  - 'logo'   : Calligraphy + emblem on light bg (default). Goes in headers.
 *  - 'white'  : Same as 'logo' but with white ink — use over dark backgrounds.
 */
type Variant = 'logo' | 'stamp' | 'emblem' | 'white'

export default function Logo({
  size = 44,
  variant = 'logo',
  withText = false,
  className = '',
}: {
  size?: number
  variant?: Variant
  withText?: boolean
  className?: string
}) {
  const src = variant === 'stamp'  ? '/brand/stamp.png'
            : variant === 'emblem' ? '/brand/emblem.png'
            : variant === 'white'  ? '/brand/logo-white.png'
            : '/brand/logo.png'
  // Aspect ratios: logo ≈ 680×334 (2.04), white ≈ 682×334, stamp ≈ 599×368 (1.63)
  const ratio = variant === 'emblem' ? 1
              : variant === 'stamp'  ? 599 / 368
              : variant === 'white'  ? 682 / 334
              : 680 / 334
  const w = Math.round(size * ratio)

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src={src}
        alt="صندوق أكناف القربى - عائلة البادي"
        width={w * 2}
        height={size * 2}
        style={{ width: w, height: size }}
        priority
      />
      {withText && (
        <div className="leading-tight">
          <div className={`font-display text-lg font-bold ${variant === 'white' ? 'text-white' : 'text-brand-950'}`}>
            أكناف القربى
          </div>
          <div className={`text-[11px] font-bold ${variant === 'white' ? 'text-gold-400' : 'text-gold-600'}`}>
            صندوق عائلة البادي
          </div>
        </div>
      )}
    </div>
  )
}
