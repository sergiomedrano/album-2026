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
    let missingText = "";
    let duplicatesText = "";

    // Iteramos por cada sección para agrupar las láminas
    ALBUM_SECTIONS.forEach((section) => {
        const sectionMissing: string[] = [];
        const sectionDuplicates: string[] = [];

        // Recorremos el rango de la sección
        for (let i = 0; i <= (section.end - section.start); i++) {
        const globalId = (section.start + i).toString();
        const relativeId = section.id === "FWC" ? i : i + 1;
        const displayLabel = `${section.id}${relativeId}`;
        
        const s = stickers[globalId];

        if (!s || !s.collected) {
            sectionMissing.push(displayLabel);
        } else if (s.duplicates > 0) {
            sectionDuplicates.push(`${displayLabel}(x${s.duplicates})`);
        }
        }

        // Si la sección tiene faltantes, agregamos el encabezado de sección
        if (sectionMissing.length > 0) {
        missingText += `📍 *${section.name}:* ${sectionMissing.join(", ")}\n`;
        }

        // Si la sección tiene repetidas, agregamos el encabezado
        if (sectionDuplicates.length > 0) {
        duplicatesText += `📍 *${section.name}:* ${sectionDuplicates.join(", ")}\n`;
        }
    });

    // Construcción del mensaje final
    const fullText = [
        `🏆 *MI ÁLBUM MUNDIAL 2026*`,
        `📊 *Progreso:* ${progressPercent}% (${collectedCount}/${TOTAL_STICKERS})`,
        `__________________________`,
        `❌ *ME FALTAN:*`,
        missingText || "¡Ya no me falta ninguna! 🎉",
        `__________________________`,
        `🔄 *REPETIDAS:*`,
        duplicatesText || "No tengo repetidas para cambio.",
        `__________________________`,
        `📱 _Generado con mi App Mundial 2026_`
    ].join("\n");

    // Copiar al portapapeles
    if (navigator.clipboard) {
        navigator.clipboard.writeText(fullText)
        .then(() => alert("¡Lista organizada por equipos copiada!"))
        .catch((err) => console.error("Error al copiar:", err));
    }
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
      <nav className="sticky top-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md py-3 px-1 mb-4 overflow-x-auto flex gap-2 no-scrollbar border-b border-gray-200 dark:border-slate-800">
        {ALBUM_SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => {
              setActiveSection(section.id);
              document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all
                ${activeSection === section.id 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105" 
                : "bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400"}`}
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
                                relative h-14 flex items-center justify-center rounded-xl text-[10px] font-black transition-all active:scale-90
                                ${data.collected 
                                ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md border-b-4 border-blue-800 dark:border-blue-700" 
                                : "bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-slate-700 shadow-sm"}
                            `}
                        >
                            {displayLabel}
                            {data.duplicates > 0 && (
                                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-800 font-black">
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