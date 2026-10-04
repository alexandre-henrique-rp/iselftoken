import React from "react";
import { MessageSquare } from "lucide-react";

export function InvestorForum() {
  return (
    <section className="space-y-12 pb-12">
      <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-foreground">
        Investor Forum
      </h2>

      <div className="bg-accent/20 p-6 lg:p-8 rounded-3xl border border-primary/20 text-center space-y-3">
        <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto" />
        <p className="text-sm font-bold text-foreground">
          Fórum de perguntas em breve
        </p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          O canal de Q&amp;A entre investidores e o founder será habilitado em
          uma próxima sprint. Por enquanto, utilize o contato direto para tirar
          dúvidas.
        </p>
      </div>
    </section>
  );
}