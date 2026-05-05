"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ALBUM_DATA, TOTAL_STICKERS } from "../constants/album";

interface StickerData {
  collected: boolean;
  duplicates: number;
}

export default function StickerGrid({ userId }: { userId: string }) {
  const [stickers, setStickers] = useState<Record<string, StickerData>>({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // 1. Carga inicial de datos
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

  // 2. Cálculos de progreso global
  const collectedCount = Object.values(stickers).filter(s => s.collected).length;
  const progressPercent = Math.round((collectedCount / TOTAL_STICKERS) * 100);

  // 3. Funciones de actualización
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

  const toggleExpand = (sectionId: string) => {
    setExpanded(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // 4. Copiado a WhatsApp organizado
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

        if (sectionMissing.length > 0) missingText += `📍 *${section.name}:* ${sectionMissing.join(", ")}\n`;
        if (sectionDuplicates.length > 0) duplicatesText += `📍 *${section.name}:* ${sectionDuplicates.join(", ")}\n`;
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

  if (loading) return <div className="p-10 text-center animate-pulse text-green-600 font-black uppercase tracking-widest text-xs">Cargando Álbum...</div>;

  return (
    <div className="w-full max-w-md mx-auto px-2 pb-24">
      
      {/* CARD DE PROGRESO TOTAL */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 mb-8 mt-4">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">Tu Progreso</h3>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
              {collectedCount} de {TOTAL_STICKERS} láminas pegadas
            </p>
          </div>
          <span className="text-3xl font-black text-green-500 leading-none">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-5">
          <div className="bg-green-500 h-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>
        <button onClick={shareProgress} className="w-full bg-green-500 active:bg-green-600 text-white text-[11px] font-black py-3.5 rounded-2xl transition-colors shadow-lg shadow-green-500/20 uppercase tracking-widest">
          Copiar lista para WhatsApp
        </button>
      </div>

      {/* LISTADO POR GRUPOS */}
      <div className="space-y-10">
        {ALBUM_DATA.map((group) => (
          <div key={group.groupName} className="space-y-4">
            <h2 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
              {group.groupName}
            </h2>

            <div className="space-y-3">
              {group.sections.map((section) => {
                const isExpanded = expanded[section.id];
                const totalInSection = section.end - section.start + 1;
                let collectedInSection = 0;
                for (let i = section.start; i <= section.end; i++) {
                  if (stickers[i.toString()]?.collected) collectedInSection++;
                }
                const sectionProgress = Math.round((collectedInSection / totalInSection) * 100);
                const isComplete = sectionProgress === 100;

                return (
                  <section key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {/* Header Acordeón */}
                    <button onClick={() => toggleExpand(section.id)} className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex flex-col items-start gap-1">
                        <h3 className="text-[12px] font-black text-gray-700 uppercase leading-none">{section.name}</h3>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Indicador de láminas y barra */}
                        <div className="flex flex-col items-end gap-1">
                          <div className="w-16 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-green-400'}`} style={{ width: `${sectionProgress}%` }} />
                          </div>
                          <span className={`text-[10px] font-black ${isComplete ? 'text-green-600' : 'text-gray-400'}`}>
                            {collectedInSection}/{totalInSection} láminas
                          </span>
                        </div>
                        <svg className={`w-3 h-3 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Grilla Desplegable */}
                    {isExpanded && (
                      <div className="p-4 pt-0">
                        <div className="grid grid-cols-4 gap-2 border-t border-gray-50 pt-4">
                          {Array.from({ length: totalInSection }, (_, i) => {
                            const globalId = (section.start + i).toString();
                            const relativeId = section.id === "FWC" ? i : i + 1;
                            const displayLabel = `${section.id}${relativeId}`;
                            const data = stickers[globalId] || { collected: false, duplicates: 0 };
                            
                            return (
                              <button
                                key={globalId}
                                onClick={() => toggleSticker(globalId)}
                                onContextMenu={(e) => handleSubtract(e, globalId)}
                                className={`relative h-14 flex items-center justify-center rounded-xl text-[10px] font-black transition-all active:scale-95
                                  ${data.collected 
                                    ? "bg-green-500 text-white shadow-md border-b-4 border-green-700" 
                                    : "bg-white text-gray-400 border border-gray-100 shadow-sm"}`}
                              >
                                {displayLabel}
                                {data.duplicates > 0 && (
                                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-black">
                                    {data.duplicates}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}