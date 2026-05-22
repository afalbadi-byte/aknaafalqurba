import Image from 'next/image'

/**
 * Variants:
 *  - 'stamp'  : Full official stamp (box + license #). Best for letterhead/print.
 *  - 'emblem' : Just the circular emblem.
 *  - 'logo'   : Calligraphy + emblem — auto-switches to white in dark mode.
 *  - 'white'  : Same as 'logo' but always white ink — use on fixed dark backgrounds.
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
  // Aspect ratios: logo ≈ 680×334 (2.04), white ≈ 682×334, stamp ≈ 599×368 (1.63)
  const ratio = variant === 'emblem' ? 1
              : variant === 'stamp'  ? 599 / 368
              : variant === 'white'  ? 682 / 334
              : 680 / 334
  const w = Math.round(size * ratio)
  const wW = Math.round(size * (682 / 334)) // white variant width

  // For fixed variants (stamp, emblem, white) — render single image
  if (variant !== 'logo') {
    const src = variant === 'stamp'  ? '/brand/stamp.png'
              : variant === 'emblem' ? '/brand/emblem.png'
              : '/brand/logo-white.png'
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

  // variant === 'logo': show colored on light, white on dark
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Light mode logo */}
      <Image
        src="/brand/logo.png"
        alt="صندوق أكناف القربى - عائلة البادي"
        width={w * 2}
        height={size * 2}
        style={{ width: w, height: size }}
        className="dark:hidden"
        priority
      />
      {/* Dark mode logo (white variant) */}
      <Image
        src="/brand/logo-white.png"
        alt="صندوق أكناف القربى - عائلة البادي"
        width={wW * 2}
        height={size * 2}
        style={{ width: wW, height: size }}
        className="hidden dark:block"
        priority
      />
      {withText && (
        <div className="leading-tight">
          <div className="font-display text-lg font-bold text-brand-950 dark:text-white">
            أكناف القربى
          </div>
          <div className="text-[11px] font-bold text-gold-600 dark:text-gold-400">
            صندوق عائلة البادي
          </div>
        </div>
      )}
    </div>
  )
}
