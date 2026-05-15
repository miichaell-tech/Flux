import { useState, useRef } from "react";

const RATIO = 41.35;

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'analyse des options QQQ pour le trading de futures NQ.

L'utilisateur va t'envoyer une ou deux images (screenshot Barchart ou InsiderFinance) avec les données options QQQ.

Extrait les niveaux suivants si présents (en strikes QQQ) :
- Call Wall (résistance gamma principale)
- Put Wall (support gamma principal)
- Zero Gamma (niveau neutre gamma)
- Max Pain
- HVL (High Volatility Level) si disponible
- GEX Flip si disponible
- Tout autre niveau clé (support/résistance secondaires)

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après. Format exact :
{
  "callWall": 485,
  "putWall": 475,
  "zeroGamma": 480,
  "maxPain": 478,
  "hvl": null,
  "gexFlip": null,
  "secondary": [{"label": "Résistance 2", "value": 488}],
  "rawDate": "2025-05-15",
  "notes": ""
}

Si une valeur est absente, mets null. Ne mets que des nombres pour les strikes QQQ.`;

const toNQ = (qqq) => {
  if (qqq == null || isNaN(qqq)) return null;
  return Math.round(parseFloat(qqq) * RATIO);
};

const FIELD_DEFS = [
  { key: "callWall",  label: "CALL WALL",  color: "#f87171", highlight: true  },
  { key: "zeroGamma", label: "ZERO GAMMA", color: "#fbbf24", highlight: true  },
  { key: "maxPain",   label: "MAX PAIN",   color: "#a78bfa", highlight: false },
  { key: "putWall",   label: "PUT WALL",   color: "#34d399", highlight: true  },
  { key: "hvl",       label: "HVL",        color: "#60a5fa", highlight: false },
  { key: "gexFlip",   label: "GEX FLIP",   color: "#fb923c", highlight: false },
];

function LevelRow({ label, qqq, color, highlight }) {
  if (qqq == null) return null;
  const val = parseFloat(qqq);
  if (isNaN(val)) return null;
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "1fr 100px 110px", alignItems: "center",
      padding: "10px 16px",
      background: highlight ? `${color}18` : "transparent",
      borderLeft: highlight ? `3px solid ${color}` : "3px solid transparent",
      borderBottom: "1px solid #1a1a2e",
    }}>
      <span style={{ color: "#8892a4", fontSize: 13, fontFamily: "'Space Mono', monospace" }}>{label}</span>
      <span style={{ color: "#c0c8d8", fontSize: 14, fontFamily: "'Space Mono', monospace", textAlign: "right" }}>{val.toFixed(1)}</span>
      <span style={{ color, fontSize: 15, fontFamily: "'Space Mono', monospace", textAlign: "right", fontWeight: 700 }}>
        {toNQ(val)?.toLocaleString()}
      </span>
    </div>
  );
}

function NQBar({ levels }) {
  if (!levels) return null;
  const pts = [levels.callWall, levels.putWall, levels.zeroGamma, levels.maxPain].filter(Boolean);
  if (pts.length < 2) return null;
  const min = Math.min(...pts) - 2, max = Math.max(...pts) + 2;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const markers = [
    { v: levels.callWall,  color: "#f87171", label: "CW" },
    { v: levels.zeroGamma, color: "#fbbf24", label: "ZG" },
    { v: levels.maxPain,   color: "#a78bfa", label: "MP" },
    { v: levels.putWall,   color: "#34d399", label: "PW" },
  ].filter(m => m.v != null);
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
  const [putsImg, setPutsImg]   = useState(null);
  const [levels, setLevels]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const callsRef = useRef(), putsRef = useRef();

  const loadImg = (file) => new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res({ base64: e.target.result.split(",")[1], mediaType: file.type, name: file.name });
    r.readAsDataURL(file);
  });

  const analyze = async () => {
    if (!callsImg && !putsImg) return;
    setLoading(true); setError(null); setLevels(null);
    try {
      const content = [];
      if (callsImg) {
        content.push({ type: "image", source: { type: "base64", media_type: callsImg.mediaType, data: callsImg.base64 } });
        content.push({ type: "text", text: "IMAGE CALLS - extrait Call Wall et résistances gamma" });
      }
      if (putsImg) {
        content.push({ type: "image", source: { type: "base64", media_type: putsImg.mediaType, data: putsImg.base64 } });
        content.push({ type: "text", text: "IMAGE PUTS - extrait Put Wall et supports gamma" });
      }
      content.push({ type: "text", text: "Retourne uniquement le JSON avec tous les niveaux QQQ trouvés." });

      const resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content }],
        }),
      });

      const data = await resp.json();
      if (data.error) throw new Error(data.error.message || data.error);
      const text = data.content?.find(b => b.type === "text")?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Pas de JSON dans la réponse");
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
          <div style={{ fontSize: 11, color: "#3b4a6b", marginTop: 4, letterSpacing: 2 }}>OPTIONS LEVELS ANALYZER · AI POWERED</div>
        </div>

        {!levels && (
          <div style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid #1a1a2e" }}>
              <ImageSlot label="IMAGE CALLS" sublabel="Call Wall · Résistances" color="#34d399" image={callsImg}
                onFile={async (e) => { const f = e.target.files[0]; if (f) setCallsImg(await loadImg(f)); }}
                inputRef={callsRef} />
              <ImageSlot label="IMAGE PUTS" sublabel="Put Wall · Supports" color="#f87171" image={putsImg}
                onFile={async (e) => { const f = e.target.files[0]; if (f) setPutsImg(await loadImg(f)); }}
                inputRef={putsRef} />
            </div>
            {error && (
              <div style={{ padding: "10px 16px", background: "#1a0a0a", borderBottom: "1px solid #7f1d1d", color: "#f87171", fontSize: 11 }}>{error}</div>
            )}
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
                <div style={{ fontSize: 13, color: "#60a5fa", marginTop: 2 }}>{levels.rawDate || new Date().toLocaleDateString("fr-FR")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2 }}>RATIO QQQ→NQ</div>
                <div style={{ fontSize: 13, color: "#a78bfa", marginTop: 2 }}>{RATIO}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px", padding: "8px 16px", borderBottom: "1px solid #1a1a2e", background: "#080812" }}>
              <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2 }}>NIVEAU</span>
              <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2, textAlign: "right" }}>QQQ $</span>
              <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2, textAlign: "right" }}>NQ pts</span>
            </div>
            {FIELD_DEFS.map(({ key, label, color, highlight }) => (
              <LevelRow key={key} label={label} qqq={levels[key]} color={color} highlight={highlight} />
            ))}
            {levels.secondary?.length > 0 && (
              <>
                <div style={{ padding: "8px 16px", background: "#080812", borderBottom: "1px solid #1a1a2e" }}>
                  <span style={{ fontSize: 10, color: "#2d3748", letterSpacing: 2 }}>NIVEAUX SECONDAIRES</span>
                </div>
                {levels.secondary.map((sec, i) => (
                  <LevelRow key={i} label={sec.label} qqq={sec.value} color="#64748b" highlight={false} />
                ))}
              </>
            )}
            <NQBar levels={levels} />
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
