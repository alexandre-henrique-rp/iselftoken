import { PrismaService } from '../../../../src/prisma/prisma.service';

/**
 * @description Limpa todos os artefatos do user de teste (User + todas as relations).
 * Ordem importa por causa das FKs (Prisma nao tem onDelete: Cascade em todos os models).
 */
export async function cleanupTestUser(
  prisma: PrismaService,
  email: string,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  // 1. AccessLog (FK user)
  await prisma.accessLog.deleteMany({ where: { userId: user.id } });

  // 2. EmailValidation (FK opcional userId)
  await prisma.emailValidation.deleteMany({ where: { userId: user.id } });
  await prisma.emailValidation.deleteMany({ where: { email: user.email } });

  // 3. BackupUser (FK user)
  await prisma.backupUser.deleteMany({ where: { userId: user.id } });

  // 4. Wallet, WalletTransaction, Payments, Subscriptions (FK user) - ANTES do User.delete
  await prisma.walletTransaction.deleteMany({
    where: { wallet: { userId: user.id } },
  });
  await prisma.wallet.deleteMany({ where: { userId: user.id } });
  await prisma.payment.deleteMany({ where: { userId: user.id } });
  await prisma.subscription.deleteMany({ where: { userId: user.id } });

  // 5. Tokens e Investments (FK user)
  await prisma.token.deleteMany({ where: { userId: user.id } });
  await prisma.investment.deleteMany({ where: { userId: user.id } });

  // 6. AuditLog (FK user)
  await prisma.auditLog.deleteMany({ where: { userId: user.id } });

  // 7. Final: User
  await prisma.user.delete({ where: { id: user.id } });
}

/**
 * @description Conta artefatos do user antes/depois do cleanup (verificar isolamento).
 */
export async function countUserArtifacts(
  prisma: PrismaService,
  userId: number,
) {
  return {
    user: await prisma.user.count({ where: { id: userId } }),
    wallet: await prisma.wallet.count({ where: { userId } }),
    payments: await prisma.payment.count({ where: { userId } }),
    subscriptions: await prisma.subscription.count({ where: { userId } }),
    accessLogs: await prisma.accessLog.count({ where: { userId } }),
    emailValidations: await prisma.emailValidation.count({ where: { userId } }),
    backups: await prisma.backupUser.count({ where: { userId } }),
  };
}
