"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ALBUM_SECTIONS } from "../constants/album";

const TOTAL_STICKERS = 120; // Ajusta esto al total real del álbum

interface StickerData {
  collected: boolean;
  duplicates: number;
}

export default function StickerGrid({ userId }: { userId: string }) {
  const [stickers, setStickers] = useState<Record<string, StickerData>>({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(ALBUM_SECTIONS[0].id);

  // Cargar datos de Firebase
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
        console.error("Error al cargar láminas:", error);
      } finally {
        setLoading(false);
      }
    };
    loadStickers();
  }, [userId]);

  // Lógica para agregar/sumar repetida
  const toggleSticker = async (id: string) => {
    const current = stickers[id] || { collected: false, duplicates: 0 };
    let updated: StickerData;

    if (!current.collected) {
      updated = { collected: true, duplicates: 0 };
    } else {
      updated = { ...current, duplicates: current.duplicates + 1 };
    }

    updateLocalAndRemote(id, updated);
  };

  // Lógica para restar (Clic derecho o Long Press)
  const handleSubtract = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const current = stickers[id];
    if (!current || !current.collected) return;

    let updated: StickerData;
    if (current.duplicates > 0) {
      updated = { ...current, duplicates: current.duplicates - 1 };
    } else {
      updated = { collected: false, duplicates: 0 };
    }

    updateLocalAndRemote(id, updated);
  };

  const updateLocalAndRemote = async (id: string, data: StickerData) => {
    setStickers((prev) => ({ ...prev, [id]: data }));
    const docRef = doc(db, "users", userId);
    await updateDoc(docRef, { [`stickers.${id}`]: data });
  };

  // Generador de texto para WhatsApp
  const shareProgress = () => {
    const missing: string[] = [];
    const dupes: string[] = [];

    for (let i = 1; i <= TOTAL_STICKERS; i++) {
      const id = i.toString();
      const s = stickers[id];
      if (!s || !s.collected) missing.push(id);
      else if (s.duplicates > 0) dupes.push(`${id}(x${s.duplicates})`);
    }

    const text = `🏆 *Mundial 2026 - Mis Láminas*\n\n❌ *Faltan:* ${missing.join(", ")}\n\n✅ *Repes:* ${dupes.join(", ")}`;
    navigator.clipboard.writeText(text);
    alert("¡Lista copiada para WhatsApp!");
  };

  const collectedCount = Object.values(stickers).filter(s => s.collected).length;
  const progressPercent = Math.round((collectedCount / TOTAL_STICKERS) * 100);

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-400">Cargando álbum...</div>;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header de Progreso */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Tu Progreso</h3>
            <p className="text-xs text-gray-500">{collectedCount} de {TOTAL_STICKERS} láminas</p>
          </div>
          <span className="text-2xl font-black text-blue-600">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <button 
          onClick={shareProgress}
          className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
        >
          COPIAR LISTA PARA WHATSAPP
        </button>
      </div>

      {/* Navegación de Secciones */}
      <nav className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md py-3 mb-4 overflow-x-auto flex gap-2 no-scrollbar">
        {ALBUM_SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              setActiveSection(section.id);
              document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all
              ${activeSection === section.id 
                ? "bg-gray-800 text-white shadow-lg" 
                : "bg-white text-gray-500 border border-gray-200"}`}
          >
            {section.name}
          </button>
        ))}
      </nav>

      {/* Grillas por Sección */}
      <div className="space-y-8 pb-24">
        {ALBUM_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-20">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 px-1">
              {section.name}
            </h2>
            <div className="grid grid-cols-4 gap-2">
                {Array.from(
                    { length: section.end - section.start + 1 },
                    (_, i) => {
                    const globalId = (section.start + i).toString();
                    
                    // Lógica específica: FWC empieza en 0, el resto en 1
                    const relativeId = section.id === "FWC" ? i : i + 1;
                    const displayLabel = `${section.id}${relativeId}`;
                    
                    const data = stickers[globalId] || { collected: false, duplicates: 0 };
                    
                    return (
                        <button
                        key={globalId}
                        onClick={() => toggleSticker(globalId)}
                        onContextMenu={(e) => handleSubtract(e, globalId)}
                        className={`
                            relative h-12 flex items-center justify-center rounded-lg transition-all active:scale-95
                            ${data.collected 
                            ? "bg-blue-600 text-white shadow-md border-b-4 border-blue-800" 
                            : "bg-white text-gray-400 border border-gray-200 hover:border-blue-200"}
                        `}
                        >
                        {/* Formato COD12 (ej: FWC0, ARG10) */}
                        <span className="text-[10px] font-black uppercase tracking-tight">
                            {displayLabel}
                        </span>
                        
                        {data.duplicates > 0 && (
                            <span className="absolute -top-2 -right-1.5 bg-red-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white font-black shadow-sm">
                            {data.duplicates}
                            </span>
                        )}
                        </button>
                    );
                    }
                )}
                </div>
          </section>
        ))}
      </div>
    </div>
  );
}