"use client";

import { EscalaManager } from "@/components/escala-manager";

export default function EscalaAcompanhantesPage() {
  return (
    <EscalaManager
      rolesPermitidos={["atendente"]}
      titulo="Escala — Acompanhantes Terapêuticas"
      subtitulo="Cadastro semanal de atendimentos dos ATs"
    />
  );
}
