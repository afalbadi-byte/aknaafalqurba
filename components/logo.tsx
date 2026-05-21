import Image from 'next/image'

/**
 * Variants:
 *  - 'stamp'  : Full official stamp (box + license #). Best for letterhead/print.
 *  - 'emblem' : Just the circular emblem.
 *  - 'logo'   : Calligraphy + emblem (default). Goes in headers.
 */
type Variant = 'logo' | 'stamp' | 'emblem'

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
            : '/brand/logo.png'
  // Aspect ratio: clean logo is ~680×334 (≈2.04), stamp is ~599×368 (≈1.63), emblem is square
  const ratio = variant === 'emblem' ? 1
              : variant === 'stamp'  ? 599 / 368
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
          <div className="font-display text-lg font-bold text-brand-950">أكناف القربى</div>
          <div className="text-[11px] text-gold-600 font-bold">صندوق عائلة البادي</div>
        </div>
      )}
    </div>
  )
}
