export function AdminUserHeader() {
  return (
    <header className="mb-6 space-y-3 md:mb-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-primary">
            Sistema Administrativo
          </span>
          <h1 className="text-4xl font-black leading-none tracking-tighter text-foreground sm:text-5xl lg:text-[3.25rem]">
            Gestão de Usuários
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Monitore e gerencie os perfis cadastrados no ecossistema iSelfToken.
          </p>
        </div>
      </div>
    </header>
  );
}
