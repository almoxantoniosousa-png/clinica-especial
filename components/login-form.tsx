"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginWithPassword } from "@/app/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const initialState = { error: null };

export function LoginForm() {
  const [state, formAction] = useFormState(loginWithPassword, initialState);

  return (
    <form action={formAction} className="space-y-4 w-full">
      
      {/* CAMPO: USUÁRIO / EMAIL */}
      <div className="space-y-1">
        <Label htmlFor="email" className="text-xs font-semibold text-slate-500 tracking-wide block ml-1">
          Usuário
        </Label>
        <Input 
          id="email" 
          name="email" 
          type="email" 
          placeholder="nome@clinicaabraco.com" 
          required 
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 text-sm text-slate-700 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* CAMPO: SENHA */}
      <div className="space-y-1">
        <Label htmlFor="senha" className="text-xs font-semibold text-slate-500 tracking-wide block ml-1">
          Senha
        </Label>
        <Input 
          id="senha" 
          name="senha" 
          type="password" 
          placeholder="••••••••" 
          required 
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 text-sm text-slate-700 transition-all placeholder:text-slate-400"
        />
      </div>

      {/* MENSAGEM DE ERRO SE HOUVER */}
      {state?.error && (
        <p className="rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs font-semibold text-red-600 text-center">
          {state.error}
        </p>
      )}

      {/* BOTÃO DE SUBMIT (ENTRAR) */}
      <SubmitButton />

    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="w-full bg-[#6b11d6] hover:bg-[#570cb3] text-white text-base font-bold py-3.5 px-4 rounded-2xl transition-all duration-200 shadow-md disabled:opacity-60 block mt-2"
    >
      {pending ? "Carregando..." : "Entrar"}
    </Button>
  );
}