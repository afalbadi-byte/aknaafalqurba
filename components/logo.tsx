export default function Logo({
  size = 44, withText = true, className = '',
}: { size?: number; withText?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo.svg"
        alt="صندوق أكناف القربى"
        style={{ width: size, height: size }}
        className="rounded-lg"
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
