import { useState } from "react"
import Timer from "./Timer"
import styles from "./CardLiberacao.module.css"

const JUSTIFICATIVAS = [
  "Aguardando documentação",
  "Problema no sistema Sankhya",
  "Motorista não estava disponível",
  "Aguardando OC ser gerada",
  "Outro motivo",
]

export default function CardLiberacao({ vehicle, actorName, onLiberado }) {
  const [justificativa, setJustificativa] = useState("")
  const [justLivre, setJustLivre]         = useState("")
  const [slaExpirou, setSlaExpirou]       = useState(false)
  const [loading, setLoading]             = useState(false)
  const [liberado, setLiberado]           = useState(false)
  const [erro, setErro]                   = useState("")

  const slaStart = vehicle.carga_fim_ts || new Date().toISOString()

  const handleLiberar = async () => {
    if (slaExpirou && !justificativa) { setErro("Selecione o motivo do atraso."); return }
    if (justificativa === "Outro motivo" && !justLivre.trim()) { setErro("Descreva o motivo."); return }
    setLoading(true); setErro("")
    try {
      const just = justificativa === "Outro motivo" ? justLivre : justificativa || null
      const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api"
      await fetch(`${BASE}/vehicles/${vehicle.id}/liberacao`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorName, justificativa: just }),
      })
      setLiberado(true)
      onLiberado?.(vehicle.id)
    } catch (e) {
      setErro(e.message || "Erro ao liberar.")
    } finally {
      setLoading(false)
    }
  }

  if (liberado) return (
    <div className={styles.card}>
      <div className={styles.liberadoIcon}>✅</div>
      <div className={styles.liberadoTitle}>VDA {vehicle.vda} liberado</div>
      <div className={styles.liberadoSub}>{vehicle.motorista_name} pode sair</div>
    </div>
  )

  return (
    <div className={`${styles.card} ${slaExpirou ? styles.cardUrg : ""}`}>
      <div className={styles.head}>
        <div>
          <div className={styles.vda}>{vehicle.vda}</div>
          <div className={styles.meta}>{vehicle.rota} · {vehicle.vehicle_type} · {vehicle.motorista_name}</div>
        </div>
        {slaExpirou && <div className={styles.badge}>ATRASADO</div>}
      </div>

      <Timer startTs={slaStart} onExpire={() => setSlaExpirou(true)} />

      {slaExpirou && (
        <div className={styles.justSection}>
          <div className={styles.justLabel}>Por que o carro está atrasado?</div>
          {JUSTIFICATIVAS.map(j => (
            <div key={j} className={`${styles.opt} ${justificativa === j ? styles.optSel : ""}`}
              onClick={() => { setJustificativa(j); setErro("") }}>
              <div className={styles.radio} />
              <span>{j}</span>
            </div>
          ))}
          {justificativa === "Outro motivo" && (
            <textarea className={styles.textarea} placeholder="Descreva o motivo..."
              value={justLivre} onChange={e => setJustLivre(e.target.value)} rows={3} />
          )}
        </div>
      )}

      {erro && <div className={styles.erro}>{erro}</div>}

      <button className={`${styles.btnLiberar} ${slaExpirou ? styles.btnUrg : ""}`}
        onClick={handleLiberar} disabled={loading}>
        {loading ? "Liberando..." : `🚛 Liberar VDA ${vehicle.vda} para portaria`}
      </button>
    </div>
  )
}
