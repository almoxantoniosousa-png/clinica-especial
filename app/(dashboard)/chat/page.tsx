import { MessageCircle } from "lucide-react";

export default function ChatPage() {
  return (
    <section className="space-y-3">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-blue-900">
        <MessageCircle className="h-6 w-6" />
        Chat da Equipe
      </h1>
      <p className="text-slate-600">
        Canal para comunicacao entre administracao e atendentes.
      </p>
    </section>
  );
}