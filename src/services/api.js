const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getCarrosAguardando: () => {
    const today = new Date().toISOString().slice(0, 10)
    return request("GET", `/plans/${today}/vehicles`)
      .then(v => v.filter(x => ["liberado_producao","em_liberacao_asistente"].includes(x.state)))
  },

  getTodosCarros: () => {
    const today = new Date().toISOString().slice(0, 10)
    return request("GET", `/plans/${today}/vehicles`)
  },

  liberarCarro: (vehicleId, actorName, justificativa) =>
    request("POST", `/vehicles/${vehicleId}/liberacao`, { actorName, justificativa }),
}

export function connectWS(actorId, onMessage) {
  const wsBase = (import.meta.env.VITE_API_URL || "http://localhost:3001")
    .replace("http", "ws").replace("/api", "")
  const ws = new WebSocket(`${wsBase}/ws?actorId=${actorId}`)
  ws.onmessage = (e) => { try { onMessage(JSON.parse(e.data)) } catch {} }
  const ping = setInterval(() => { if (ws.readyState === 1) ws.send(JSON.stringify({ type: "PING" })) }, 30000)
  ws.onclose = () => clearInterval(ping)
  return ws
}
