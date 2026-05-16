import { useState, useRef } from "react";

const RATIO = 41.35;

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse des options QQQ pour le trading NQ.

L'utilisateur t'envoie des screenshots de la chaîne d'options QQQ sur Barchart (puts et/ou calls).

Ton travail :
1. Lire tous les strikes visibles avec leur Open Interest (OI)
2. Identifier les TOP 3 strikes avec le plus gros OI côté PUTS → ce sont les supports
3. Identifier les TOP 3 strikes avec le plus gros OI côté CALLS → ce sont les résistances
4. Retourner ces niveaux en JSON

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks. Format exact :
{
  "date": "2026-05-16",
  "supports": [
    {"strike": 712, "oi": 44651, "label": "Support majeur"},
    {"strike": 710, "oi": 30104, "label": "Support 2"},
    {"strike": 709, "oi": 19221, "label": "Support 3"}
  ],
  "resistances": [
    {"strike": 715, "oi": 36956, "label": "Résistance majeure"},
    {"strike": 713, "oi": 25075, "label": "Résistance 2"},
    {"strike": 710, "oi": 20259, "label": "Résistance 3"}
  ],
  "notes": ""
}

Si tu vois seulement les puts, remplis supports. Si seulement calls, remplis resistances. Ne mets que des vrais chiffres lus sur les images.`;

const toNQ = (strike) => {
  if (!strike) return null;
  return Math.round(parseFloat(strike) * RATIO);
};

function LevelRow({ label, strike, oi, color, highlight }) {
  if (!strike) return null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 70px 90px 110px", alignItems: "center",
      padding: "10px 16px",
      background: highlight ? `${color}18` : "transparent",
      borderLeft: highlight ? `3px solid ${color}` : "3px solid transparent",
      borderBottom: "1px solid #1a1a2e",
    }}>
      <span style={{ color: "#8892a4", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>{label}</span>
      <span style={{ color: "#c0c8d8", fontSize: 13, fontFamily: "'Space Mono', monospace", textAlign: "right" }}>{strike}</span>
      <span style={{ color: "#4a5568", fontSize: 11, fontFamily: "'Space Mono', monospace", textAlign: "right" }}>{oi?.toLocaleString()}</span>
      <span style={{ color, fontSize: 15, fontFamily: "'Space Mono', monospace", textAlign: "right", fontWeight: 700 }}>
        {toNQ(strike)?.toLocaleString()}
      </span>
    </div>
  );
}

function NQBar({ supports, resistances }) {
  const all = [...(supports || []), ...(resistances || [])].map(l => l.strike).filter(Boolean);
  if (all.length < 2) return null;
  const min = Math.min(...all) - 2, max = Math.max(...all) + 2;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const markers = [
    ...(supports || []).map(s => ({ v: s.strike, color: "#34d399", label: "S" })),
    ...(resistances || []).map(r => ({ v: r.strike, color: "#f87171", label: "R" })),
  ];
  return (
    <div style={{ padding: "20px 20px 28px", borderBottom: "1px solid #1a1a2e" }}>
      <div style={{ fontSize: 10, color: "#4a5568", marginBottom: 16, letterSpacing: 2 }}>SPECTRE QQQ → NQ</div>
      <div style={{ position: "relative", height: 24, background: "#0d0d1a", borderRadius: 4 }}>
        {markers.map((m, i) => (
          <div key={i} style={{ position: "absolute", left: `${pct(m.v)}%`, top: 0, bottom: 0, width: 2, background: m.color, transform: "translateX(-50%)" }}>
            <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: m.color, fontFamily: "'Space Mono',monospace", whiteSpace: "nowrap" }}>{m.label}</div>
            <div style={{ position: "absolute", bottom: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: m.color, fontFamily: "'Space Mono',monospace", whiteSpace: "nowrap" }}>{toNQ(m.v)?.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageSlot({ label, sublabel, color, image, onFile, inputRef }) {
  return (
    <div onClick={() => inputRef.current.click()} style={{
      padding: "18px 14px", cursor: "pointer",
      background: image ? (color === "#34d399" ? "#0a1a12" : "#1a0a0a") : "#090915",
      borderRight: color === "#34d399" ? "1px solid #1a1a2e" : "none",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: image ? (color === "#34d399" ? "#14532d" : "#7f1d1d") : "#1a1a2e",
        border: `2px solid ${image ? color : "#2d3748"}`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
      }}>
        {image ? "✓" : (color === "#34d399" ? "📈" : "📉")}
      </div>
      <div style={{ fontSize: 10, letterSpacing: 2, color: image ? color : "#4a5568" }}>
        {image ? image.name.slice(0, 16) + (image.name.length > 16 ? "…" : "") : label}
      </div>
      <div style={{ fontSize: 9, color: "#2d3748" }}>{sublabel}</div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onFile} />
    </div>
  );
}

export default function App() {
  const [callsImg, setCallsImg] = useState(null);
  const [putsImg, setPutsImg] = useState(null);
  const [levels, setLevels] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const callsRef = useRef(), putsRef = useRef();

  const loadImg = (file) => new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX = 1024;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
      URL.revokeObjectURL(url);
      res({ base64, mediaType: 'image/jpeg', name: file.name });
    };
    img.onerror = () => rej(new Error("Image invalide"));
    img.src = url;
  });

  const analyze = async () => {
    if (!callsImg && !putsImg) return;
    setLoading(true); setError(null); setLevels(null);
    try {
      const content = [];
      if (callsImg) {
        content.push({ type: "image", source: { type: "base64", media_type: callsImg.mediaType, data: callsImg.base64 } });
        content.push({ type: "text", text: "IMAGE CALLS - identifie les strikes avec le plus gros OI (résistances)" });
      }
      if (putsImg) {
        content.push({ type: "image", source: { type: "base64", media_type: putsImg.mediaType, data: putsImg.base64 } });
        content.push({ type: "text", text: "IMAGE PUTS - identifie les strikes avec le plus gros OI (supports)" });
      }
      content.push({ type: "text", text: "Retourne le JSON avec les top 3 supports (puts OI max) et top 3 résistances (calls OI max)." });

      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
        }),
      });

      const data = await resp.json();
      if (data.error) throw new Error(JSON.stringify(data.error));
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Pas de JSON : " + text.slice(0, 100));
      setLevels(JSON.parse(match[0]));
    } catch (e) {
      setError("Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setCallsImg(null); setPutsImg(null); setLevels(null); setError(null); };

  return (
    <div style={{ minHeight: "100vh", background: "#070710", fontFamily: "'Space Mono',monospace", color: "#e2e8f0", display: "flex", justifyContent: "center", padding: "32px 16px" }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Orbitron:wght@500;700;900&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 560 }}>

        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: 4, color: "#3b4a6b", marginBottom: 6 }}>FLUX TRADING OPTIONS</div>
          <div style={{ fontFamily: "'Orbitron',sans-serif", fontSize: 22, fontWeight: 900, letterSpacing: 2, background: "linear-gradient(135deg,#60a5fa,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NQ PRE-SESSION</div>
          <div style={{ fontSize: 11, color: "#3b4a6b", marginTop: 4, letterSpacing: 2 }}>OI LEVELS ANALYZER · AI POWERED</div>
        </div>

        {!levels && (
          <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #1a1a2e" }}>
              <ImageSlot label="IMAGE CALLS" sublabel="Résistances OI" color="#f87171" image={callsImg}
                onFile={async (e) => { const f = e.target.files[0]; if (f) setCallsImg(await loadImg(f)); }}
                inputRef={callsRef} />
              <ImageSlot label="IMAGE PUTS" sublabel="Supports OI" color="#34d399" image={putsImg}
                onFile={async (e) => { const f = e.target.files[0]; if (f) setPutsImg(await loadImg(f)); }}
                inputRef={putsRef} />
            </div>
            {error && <div style={{ padding: "10px 16px", background: "#1a0a0a", borderBottom: "1px solid #7f1d1d", color: "#f87171", fontSize: 11 }}>{error}</div>}
            <div style={{ padding: "12px 16px" }}>
              <button onClick={analyze} disabled={loading || (!callsImg && !putsImg)} style={{
                width: "100%", padding: "12px",
                background: (callsImg || putsImg) && !loading ? "linear-gradient(135deg,#1d4ed8,#4f46e5)" : "#1a1a2e",
                border: "none", borderRadius: 6,
                color: (callsImg || putsImg) && !loading ? "#fff" : "#4a5568",
                fontFamily: "'Orbitron',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2,
                cursor: (callsImg || putsImg) && !loading ? "pointer" : "default",
              }}>
                {loading ? "ANALYSE EN COURS..." : "ANALYSER → CONVERTIR NQ"}
              </button>
            </div>
          </div>
        )}

        {levels && (
          <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #1a1a2e", display: "flex", justifyContent: "space-between", background: "#090915" }}>
              <div>
                <div style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2 }}>SESSION</div>
                <div style={{ fontSize: 13, color: "#60a5fa", marginTop: 2 }}>{levels.date || new Date().toLocaleDateString("fr-FR")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2 }}>RATIO QQQ→NQ</div>
                <div style={{ fontSize: 13, color: "#a78bfa", marginTop: 2 }}>{RATIO}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 110px", padding: "8px 16px", borderBottom: "1px solid #1a1a2e", background: "#080812" }}>
              <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2 }}>NIVEAU</span>
              <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2, textAlign: "right" }}>STRIKE</span>
              <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2, textAlign: "right" }}>OI</span>
              <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2, textAlign: "right" }}>NQ pts</span>
            </div>

            {levels.resistances?.length > 0 && (
              <>
                <div style={{ padding: "8px 16px", background: "#1a0808", borderBottom: "1px solid #1a1a2e" }}>
                  <span style={{ fontSize: 10, color: "#f87171", letterSpacing: 2 }}>▲ RÉSISTANCES (CALLS)</span>
                </div>
                {levels.resistances.map((r, i) => (
                  <LevelRow key={i} label={r.label} strike={r.strike} oi={r.oi} color="#f87171" highlight={i === 0} />
                ))}
              </>
            )}

            {levels.supports?.length > 0 && (
              <>
                <div style={{ padding: "8px 16px", background: "#081a0a", borderBottom: "1px solid #1a1a2e" }}>
                  <span style={{ fontSize: 10, color: "#34d399", letterSpacing: 2 }}>▼ SUPPORTS (PUTS)</span>
                </div>
                {levels.supports.map((s, i) => (
                  <LevelRow key={i} label={s.label} strike={s.strike} oi={s.oi} color="#34d399" highlight={i === 0} />
                ))}
              </>
            )}

            <NQBar supports={levels.supports} resistances={levels.resistances} />

            {levels.notes && (
              <div style={{ padding: "10px 16px", borderTop: "1px solid #1a1a2e" }}>
                <span style={{ fontSize: 11, color: "#4a5568" }}>NOTE: </span>
                <span style={{ fontSize: 11, color: "#64748b" }}>{levels.notes}</span>
              </div>
            )}

            <div style={{ padding: "12px 16px", borderTop: "1px solid #1a1a2e" }}>
              <button onClick={reset} style={{
                width: "100%", padding: "10px", background: "transparent",
                border: "1px solid #1a1a2e", borderRadius: 6, color: "#4a5568",
                fontFamily: "'Space Mono',monospace", fontSize: 11, letterSpacing: 2, cursor: "pointer",
              }}>← NOUVELLE ANALYSE</button>
            </div>
          </div>
        )}

        <div style={{ marginTop: 20, textAlign: "center", fontSize: 10, color: "#1a1a2e", letterSpacing: 2 }}>
          FLUX TRADING OPTIONS · NQ PRE-SESSION AGENT
        </div>
      </div>
    </div>
  );
}
