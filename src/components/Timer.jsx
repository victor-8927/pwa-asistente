import { useState, useEffect, useRef } from "react"
import styles from "./Timer.module.css"

const SLA = 10 * 60

export default function Timer({ startTs, onExpire }) {
  const [remaining, setRemaining] = useState(SLA)
  const [expired, setExpired]     = useState(false)
  const [overdue, setOverdue]     = useState(0)
  const expiredRef = useRef(false)

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(startTs).getTime()) / 1000)
      const rem     = SLA - elapsed
      if (rem > 0) { setRemaining(rem); setExpired(false) }
      else {
        setRemaining(0); setExpired(true); setOverdue(Math.abs(rem))
        if (!expiredRef.current) { expiredRef.current = true; onExpire?.() }
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startTs])

  const pct   = Math.max(0, (remaining / SLA) * 100)
  const urgent = remaining < 180 && !expired
  const color  = expired ? "#b83030" : urgent ? "#b07800" : "#1a5c36"
  const r = 44; const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  function fmt(s) {
    const m = String(Math.floor(Math.abs(s) / 60)).padStart(2, "0")
    const sec = String(Math.abs(s) % 60).padStart(2, "0")
    return `${m}:${sec}`
  }

  return (
    <div className={`${styles.wrap} ${expired ? styles.expired : urgent ? styles.urgent : ""}`}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke={expired ? "#fde8e8" : "#eaf5ef"} strokeWidth={8} />
        {!expired && (
          <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
            strokeLinecap="round" style={{ transition: "stroke-dasharray 1s linear" }} />
        )}
        <text x="50" y="46" textAnchor="middle" fill={color} fontSize={expired ? 13 : 16} fontWeight={700} fontFamily="system-ui">
          {expired ? "+" + fmt(overdue) : fmt(remaining)}
        </text>
        <text x="50" y="62" textAnchor="middle" fill={color} fontSize={9} fontFamily="system-ui">
          {expired ? "ATRASADO" : "restantes"}
        </text>
      </svg>
      <div className={styles.msg}>
        {expired
          ? <span className={styles.red}>⚠️ SLA excedido — justificativa obrigatória</span>
          : urgent
          ? <span className={styles.amber}>⏱ Menos de {Math.ceil(remaining / 60)} min</span>
          : <span className={styles.green}>Libere o carro dentro do prazo</span>}
      </div>
    </div>
  )
}
