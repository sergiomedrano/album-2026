"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ALBUM_DATA, TOTAL_STICKERS } from "../constants/album";

interface StickerData {
  collected: boolean;
  duplicates: number;
}

type ViewMode = "all" | "missing" | "dupes";

const getFlag = (id: string): string => {
    const flags: Record<string, string> = {
        // SECCIONES ESPECIALES
        FWC: "🏆", // FIFA World Cup
        // CONMEBOL
        ARG: "🇦🇷", BRA: "🇧🇷", CHI: "🇨🇱", COL: "🇨🇴", URU: "🇺🇾",
        ECU: "🇪🇨", PAR: "🇵🇾", VEN: "🇻🇪", BOL: "🇧🇴", PER: "🇵🇪",
        // CONCACAF
        USA: "🇺🇸", MEX: "🇲🇽", CAN: "🇨🇦", CRC: "🇨🇷", PAN: "🇵🇦",
        HAI: "🇭🇹", HON: "🇭🇳", SLV: "🇸🇻", GUA: "🇬🇹",
        // UEFA (Europa)
        ESP: "🇪🇸", FRA: "🇫🇷", GER: "🇩🇪", ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", SWE: "🇸🇪",
        POR: "🇵🇹", NED: "🇳🇱", BEL: "🇧🇪", CRO: "🇭🇷", SUI: "🇨🇭",
        NOR: "🇳🇴", SRB: "🇷🇸", POL: "🇵🇱", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", BIH: "🇧🇦",
        AUT: "🇦🇹", TUR: "🇹🇷", CZE: "🇨🇿",
        // AFC (Asia)
        JPN: "🇯🇵", KOR: "🇰🇷", AUS: "🇦🇺", KSA: "🇸🇦", IRN: "🇮🇷",
        QAT: "🇶🇦", IRQ: "🇮🇶", UZB: "🇺🇿", JOR: "🇯🇴", CUW: "🇨🇼",
        // CAF (África)
        MAR: "🇲🇦", CPV: "🇨🇻", RSA: "🇿🇦", EGY: "🇪🇬", TUN: "🇹🇳",
        ALG: "🇩🇿", CMR: "🇨🇲", GHA: "🇬🇭", COD: "🇨🇩", CIV: "🇨🇮",
        // OFC (Oceanía)
        NZL: "🇳🇿",
    };

    return flags[id.toUpperCase()] || "🏳️";
  };

export default function StickerGrid({ userId }: { userId: string }) {
  const [stickers, setStickers] = useState<Record<string, StickerData>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  useEffect(() => {
    const loadStickers = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStickers(docSnap.data().stickers || {});
        } else {
          await setDoc(docRef, { stickers: {} });
        }
      } catch (error) {
        console.error("Error al cargar:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStickers();
  }, [userId]);

  const collectedCount = Object.values(stickers).filter(s => s.collected).length;
  const progressPercent = Math.round((collectedCount / TOTAL_STICKERS) * 100);
  const totalDuplicates = Object.values(stickers).reduce((acc, s) => acc + (s.duplicates || 0), 0);

  const toggleExpand = (sectionId: string) => {
    setExpanded(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const updateLocalAndRemote = async (id: string, data: StickerData) => {
    setStickers((prev) => ({ ...prev, [id]: data }));
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, { [`stickers.${id}`]: data });
  };

  const toggleSticker = (id: string) => {
    const current = stickers[id] || { collected: false, duplicates: 0 };
    const updated = !current.collected 
      ? { collected: true, duplicates: 0 } 
      : { ...current, duplicates: current.duplicates + 1 };
    updateLocalAndRemote(id, updated);
  };

  const handleSubtract = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const current = stickers[id];
    if (!current || !current.collected) return;
    const updated = current.duplicates > 0 
      ? { ...current, duplicates: current.duplicates - 1 } 
      : { collected: false, duplicates: 0 };
    updateLocalAndRemote(id, updated);
  };

  const shareProgress = () => {
    let missingText = "";
    let duplicatesText = "";
    ALBUM_DATA.forEach((group) => {
      group.sections.forEach((section) => {
        const sectionMissing: string[] = [];
        const sectionDuplicates: string[] = [];
        for (let i = 0; i <= (section.end - section.start); i++) {
          const globalId = (section.start + i).toString();
          const relativeId = section.id === "FWC" ? i : i + 1;
          const displayLabel = `${section.id}${relativeId}`;
          const s = stickers[globalId];
          if (!s || !s.collected) sectionMissing.push(displayLabel);
          else if (s.duplicates > 0) sectionDuplicates.push(`${displayLabel}(x${s.duplicates})`);
        }
        const flag = getFlag(section.id);
        if (sectionMissing.length > 0) missingText += `${flag} *${section.name}:* ${sectionMissing.join(", ")}\n`;
        if (sectionDuplicates.length > 0) duplicatesText += `${flag} *${section.name}:* ${sectionDuplicates.join(", ")}\n`;
      });
    });
    const fullText = [
      `🏆 *MI ÁLBUM MUNDIAL 2026*`,
      `📊 *Progreso:* ${progressPercent}% (${collectedCount}/${TOTAL_STICKERS})`,
      `__________________________`,
      `❌ *ME FALTAN:*`,
      missingText || "¡Álbum completo! 🎉",
      `__________________________`,
      `🔄 *REPETIDAS:*`,
      duplicatesText || "Sin repetidas.",
      `__________________________`,
      `📱 _Generado con Álbum Mundial 2026_`
    ].join("\n");
    navigator.clipboard.writeText(fullText).then(() => alert("¡Lista copiada!"));
  };

  if (loading) return <div className="p-10 text-center animate-pulse text-emerald-500 font-black text-[10px] uppercase tracking-widest">Cargando...</div>;

  const allSections = ALBUM_DATA.flatMap(group => group.sections);

  return (
    <div className="w-full max-w-md mx-auto px-2 pb-28 select-none bg-gray-50 min-h-screen">
      
      {/* HEADER DE PROGRESO */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4 mt-4">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-lg font-black text-gray-800 tracking-tight leading-none mb-1">Tu Progreso</h3>
            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 font-bold uppercase">
                {collectedCount} de {TOTAL_STICKERS} láminas
              </span>
              {totalDuplicates > 0 && (
                <span className="text-[9px] text-gray-400 font-medium italic lowercase">
                  + {totalDuplicates} repetidas en total
                </span>
              )}
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-500 leading-none">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden mb-3">
          <div className="bg-emerald-500 h-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>
        <button onClick={shareProgress} className="w-full bg-emerald-500 text-white text-[10px] font-black py-3 rounded-xl shadow-md shadow-emerald-500/10 uppercase tracking-widest active:scale-95 transition-all">
          Copiar lista para WhatsApp
        </button>
      </div>

      {/* FILTROS DE MODO */}
      <div className="flex bg-gray-200/50 p-1 rounded-xl mb-4">
        {(["all", "missing", "dupes"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all
              ${viewMode === mode ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}
          >
            {mode === "all" ? "Todo" : mode === "missing" ? "Faltantes" : "Repetidas"}
          </button>
        ))}
      </div>

      {/* LISTADO DE PAÍSES */}
      <div className="space-y-2">
        {allSections.map((section) => {
          const totalInSection = section.end - section.start + 1;
          const sectionStickers = Array.from({ length: totalInSection }, (_, i) => {
            const globalId = (section.start + i).toString();
            const relativeId = section.id === "FWC" ? i : i + 1;
            const displayLabel = `${section.id}${relativeId}`;
            const data = stickers[globalId] || { collected: false, duplicates: 0 };
            return { globalId, displayLabel, data };
          });

          const filtered = sectionStickers.filter(s => {
            if (viewMode === "missing") return !s.data.collected;
            if (viewMode === "dupes") return s.data.duplicates > 0;
            return true;
          });

          if (filtered.length === 0) return null;

          const collectedCountSec = sectionStickers.filter(s => s.data.collected).length;
          const dupsCountSec = sectionStickers.reduce((acc, s) => acc + (s.data.duplicates || 0), 0);
          const sectionProgress = Math.round((collectedCountSec / totalInSection) * 100);
          const isExpanded = expanded[section.id];

          return (
            <section key={section.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
              <button onClick={() => toggleExpand(section.id)} className="w-full flex justify-between items-center p-3 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-sm leading-none">{getFlag(section.id)}</span>
                    <h2 className="text-[11px] font-black text-gray-700 uppercase tracking-tight">{section.name}</h2>
                  </div>
                  {dupsCountSec > 0 && (
                    <span className="text-[8px] text-gray-400 italic lowercase">{dupsCountSec} repetidas</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-0.5">
                    <div className="w-12 bg-gray-100 h-1 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${sectionProgress === 100 ? 'bg-emerald-500' : 'bg-emerald-500/50'}`} style={{ width: `${sectionProgress}%` }} />
                    </div>
                    <span className={`text-[9px] font-black ${sectionProgress === 100 ? 'text-emerald-700' : 'text-gray-400'}`}>
                      {collectedCountSec}/{totalInSection}
                    </span>
                  </div>
                  <svg className={`w-2.5 h-2.5 text-gray-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="p-3 pt-0 border-t border-gray-50">
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {filtered.map(({ globalId, displayLabel, data }) => (
                      <button
                        key={globalId}
                        onClick={() => toggleSticker(globalId)}
                        onContextMenu={(e) => handleSubtract(e, globalId)}
                        style={{ WebkitTouchCallout: 'none' }}
                        className={`relative h-12 flex items-center justify-center rounded-lg text-[9px] font-black transition-all active:scale-90 select-none touch-none
                          ${data.collected 
                            ? "bg-emerald-500 text-white shadow-md border-b-[3px] border-emerald-800" 
                            : "bg-white text-gray-400 border border-gray-100 shadow-sm"}`}
                      >
                        {displayLabel}
                        {data.duplicates > 0 && (
                          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] w-4 h-4 flex items-center justify-center rounded-full border border-white font-black shadow-sm">
                            {data.duplicates}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}