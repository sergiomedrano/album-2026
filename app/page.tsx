"use client";

import { useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../lib/firebase"
import StickerGrid from "../components/StickerGrid";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Escucha los cambios de sesión (si el usuario cierra la pestaña y vuelve, sigue logueado)
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 text-center border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Panini Tracker 2026 🏆</h1>
        
        {user ? (
          <div>
            <p className="text-gray-600 mb-6">¡Hola, {user.displayName}!</p>
            
            {/* Aquí más adelante inyectaremos el componente de la grilla de láminas */}
            <div className="mb-6">
              <StickerGrid userId={user.uid} />
            </div>

            <button 
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-6">Inicia sesión para gestionar tu álbum y tus láminas repetidas de forma rápida.</p>
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 py-3 px-4 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
            >
              {/* Ícono de Google en formato SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </button>
          </div>
        )}
      </div>
    </main>
  );
}