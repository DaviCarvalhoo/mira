/** Wordmark "mira": o pingo do i é o ponto de sinal (acende quando está ouvindo). */
export function Wordmark({ live = false, className = '' }: { live?: boolean; className?: string }) {
  return (
    <span className={`wordmark ${live ? 'is-live' : ''} ${className}`} aria-label="Mira">
      m<span className="wordmark-i">ı</span>ra
    </span>
  )
}
