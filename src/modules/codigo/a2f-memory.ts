// Armazenamento em memória para códigos A2F por e-mail de sessão
// Em produção, substitua por Redis/DB/cache distribuído

export type A2fRecord = {
  code: string;
  expiration: string; // ISO
  attempts: number;
  maxAttempts: number;
};

const store = new Map<string, A2fRecord>();

export const A2fMemory = {
  set(email: string, record: A2fRecord) {
    store.set(email, record);
  },
  get(email: string): A2fRecord | undefined {
    return store.get(email);
  },
  delete(email: string) {
    store.delete(email);
  },
  resetAttempts(email: string) {
    const rec = store.get(email);
    if (rec) {
      rec.attempts = 0;
      store.set(email, rec);
    }
  },
};
