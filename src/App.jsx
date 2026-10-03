import { useState, useEffect, useRef } from "react"
import CardLiberacao from "./components/CardLiberacao"
import { api, connectWS } from "./services/api"
import "./index.css"

const ASISTENTE = { id: "ryan-lima-id", nome: "Ryan Lima" }

const MOCK = [
  { id:"v1", vda:"VDA 80", rota:"ROTA 802", vehicle_type:"toco", motorista_name:"Jean Pinto", state:"liberado_producao", carga_fim_ts: new Date(Date.now() - 7 * 60 * 1000).toISOString() },
  { id:"v2", vda:"VDA 81", rota:"ROTA 805", vehicle_type:"toco", motorista_name:"Mirian",     state:"liberado_producao", carga_fim_ts: new Date(Date.now() - 13 * 60 * 1000).toISOString(), liberacao_atrasada: true },
]

export default function App() {
  const [aba, setAba]               = useState("liberacao")
  const [aguardando, setAguardando] = useState([])
  const [todos, setTodos]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [notif, setNotif]           = useState(null)
  const wsRef = useRef(null)

  const hora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  useEffect(() => {
    Promise.all([
      api.getCarrosAguardando().catch(() => MOCK),
      api.getTodosCarros().catch(() => MOCK),
    ]).then(([ag, td]) => {
      setAguardando(ag?.length ? ag : MOCK)
      setTodos(td?.length ? td : MOCK)
    }).finally(() => setLoading(false))

    wsRef.current = connectWS(ASISTENTE.id, (msg) => {
      if (msg.type === "STATE_CHANGE" && msg.newState === "liberado_producao") {
        setNotif(`🚛 VDA ${msg.vda} liberado pela produção — inicie a liberação!`)
        setTimeout(() => setNotif(null), 8000)
        api.getCarrosAguardando().then(ag => { if (ag?.length) setAguardando(ag) }).catch(() => {})
      }
    })
    return () => wsRef.current?.close()
  }, [])

  const handleLiberado = (vehicleId) => {
    setAguardando(prev => prev.filter(v => v.id !== vehicleId))
    setTodos(prev => prev.map(v => v.id === vehicleId ? { ...v, state: "liberado_portaria" } : v))
  }

  const STATE_LABEL = {
    aguardando_carga:       { label: "Aguardando",      color: "#6b8f7a", bg: "#f5faf7" },
    em_carga:               { label: "Em carga",        color: "#b07800", bg: "#fffbf0" },
    liberado_producao:      { label: "Lib. produção",   color: "#1558a8", bg: "#eef3ff" },
    liberado_portaria:      { label: "Lib. portaria",   color: "#1a5c36", bg: "#eaf5ef" },
    em_rota:                { label: "Em rota",         color: "#1a5c36", bg: "#eaf5ef" },
    retornado:              { label: "Retornado",       color: "#5a28b0", bg: "#f0ebff" },
    finalizado:             { label: "Finalizado",      color: "#1a2e22", bg: "#cde0d5" },
  }

  return (
    <div style={{ minHeight:"100dvh", background:"#f5faf7", display:"flex", flexDirection:"column" }}>

      {/* Header */}
      <div style={{ background:"#1a5c36", color:"#fff", padding:"14px 16px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:10, letterSpacing:2, opacity:0.7 }}>ASISTENTE</div>
          <div style={{ fontSize:17, fontWeight:700, marginTop:1 }}>{ASISTENTE.nome}</div>
        </div>
        <div style={{ fontSize:22, fontWeight:500, opacity:0.9 }}>{hora}</div>
      </div>

      {/* Notificação */}
      {notif && (
        <div style={{ background:"#1a2e22", color:"#fff", padding:"12px 16px", fontSize:13, fontWeight:500 }}>
          {notif}
        </div>
      )}

      {/* Abas */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"1px solid #cde0d5" }}>
        {["liberacao","geral"].map(a => (
          <button key={a} onClick={() => setAba(a)}
            style={{ flex:1, padding:14, fontSize:14, fontWeight:600,
              color: aba === a ? "#1a5c36" : "#6b8f7a",
              borderBottom: aba === a ? "2.5px solid #1a5c36" : "2.5px solid transparent",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            {a === "liberacao" ? "Liberação" : "Visão Geral"}
            {a === "liberacao" && aguardando.length > 0 && (
              <span style={{ background:"#b83030", color:"#fff", fontSize:10, fontWeight:700, padding:"2px 6px", borderRadius:10 }}>
                {aguardando.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#6b8f7a" }}>Carregando...</div>
        ) : aba === "liberacao" ? (
          aguardando.length === 0 ? (
            <div style={{ padding:"60px 24px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:36 }}>✅</div>
              <div style={{ fontSize:16, fontWeight:600, color:"#1a2e22" }}>Nenhum carro aguardando liberação</div>
              <div style={{ fontSize:13, color:"#6b8f7a" }}>Você receberá uma notificação quando a produção liberar</div>
            </div>
          ) : (
            <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>
              {aguardando.map(v => (
                <CardLiberacao key={v.id} vehicle={v} actorName={ASISTENTE.nome} onLiberado={handleLiberado} />
              ))}
            </div>
          )
        ) : (
          <div style={{ padding:16 }}>
            {/* KPIs */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
              {[
                { label:"Total", val: todos.length },
                { label:"Em rota", val: todos.filter(v => v.state === "em_rota").length },
                { label:"Atrasos", val: todos.filter(v => v.liberacao_atrasada).length },
              ].map(k => (
                <div key={k.label} style={{ background:"#fff", border:"1px solid #cde0d5", borderRadius:12, padding:14, textAlign:"center" }}>
                  <div style={{ fontSize:26, fontWeight:700, color: k.label === "Atrasos" && k.val > 0 ? "#b83030" : "#1a2e22" }}>{k.val}</div>
                  <div style={{ fontSize:10, color:"#6b8f7a", marginTop:3 }}>{k.label}</div>
                </div>
              ))}
            </div>
            {/* Lista */}
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {todos.map(v => {
                const st = STATE_LABEL[v.state] || { label: v.state, color:"#888", bg:"#f5f5f5" }
                return (
                  <div key={v.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"#fff", border:"1px solid #cde0d5", borderRadius:12 }}>
                    <div style={{ fontSize:11, color:"#6b8f7a", fontWeight:600, minWidth:22 }}>{v.sequence}º</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:700, color:"#1a2e22" }}>{v.vda}</div>
                      <div style={{ fontSize:11, color:"#6b8f7a", marginTop:2 }}>{v.motorista_name}</div>
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, padding:"3px 8px", borderRadius:6, color: st.color, background: st.bg }}>{st.label}</span>
                    {v.liberacao_atrasada && <span style={{ fontSize:11, color:"#b83030", fontWeight:600 }}>⚠️</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
