"use client";

import { useState } from "react";

// =============================================
// EDITE AQUI OS CONTATOS DA CLINICA
// =============================================
const WHATSAPP = "71999999999";
const EMAIL = "contato@clinicaabraco.com.br";
const INSTAGRAM = "clinicaabraco";
// =============================================

export function FloatingContact() {
  const [aberto, setAberto] = useState(false);

  function abrirWhatsApp() {
    window.open(`https://wa.me/55${WHATSAPP}`, "_blank");
  }

  function abrirEmail() {
    window.open(`mailto:${EMAIL}`, "_blank");
  }

  function abrirInstagram() {
    window.open(`https://instagram.com/${INSTAGRAM}`, "_blank");
  }

  function abrirYoutube() {
    window.open("https://youtube.com", "_blank");
  }

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2">

      {/* Botoes expandidos */}
      {aberto && (
        <div className="flex flex-col items-end gap-2 mb-1">

          {/* WhatsApp */}
          <div className="flex items-center gap-2">
            <span className="bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md border border-slate-100">
              WhatsApp
            </span>
            <button
              onClick={abrirWhatsApp}
              className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg flex items-center justify-center transition active:scale-95"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.849L0 24l6.302-1.506A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.896 0-3.67-.52-5.189-1.427l-.371-.221-3.742.894.939-3.648-.242-.384A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
            </button>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2">
            <span className="bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md border border-slate-100">
              E-mail
            </span>
            <button
              onClick={abrirEmail}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            </button>
          </div>

          {/* Instagram */}
          <div className="flex items-center gap-2">
            <span className="bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md border border-slate-100">
              Instagram
            </span>
            <button
              onClick={abrirInstagram}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 via-red-500 to-yellow-400 hover:opacity-90 text-white shadow-lg flex items-center justify-center transition active:scale-95"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </button>
          </div>

          {/* YouTube */}
          <div className="flex items-center gap-2">
            <span className="bg-white text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-md border border-slate-100">
              YouTube
            </span>
            <button
              onClick={abrirYoutube}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg flex items-center justify-center transition active:scale-95"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Botao principal */}
      <button
        onClick={() => setAberto(!aberto)}
        className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-95
          ${aberto ? "bg-slate-700 hover:bg-slate-800" : "bg-blue-900 hover:bg-blue-800"}`}
      >
        {aberto ? (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
        )}
      </button>
    </div>
  );
}