"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupTestUser = cleanupTestUser;
exports.countUserArtifacts = countUserArtifacts;
async function cleanupTestUser(prisma, email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return;
    await prisma.accessLog.deleteMany({ where: { userId: user.id } });
    await prisma.emailValidation.deleteMany({ where: { userId: user.id } });
    await prisma.emailValidation.deleteMany({ where: { email: user.email } });
    await prisma.backupUser.deleteMany({ where: { userId: user.id } });
    await prisma.walletTransaction.deleteMany({ where: { wallet: { userId: user.id } } });
    await prisma.wallet.deleteMany({ where: { userId: user.id } });
    await prisma.payment.deleteMany({ where: { userId: user.id } });
    await prisma.subscription.deleteMany({ where: { userId: user.id } });
    await prisma.token.deleteMany({ where: { userId: user.id } });
    await prisma.investment.deleteMany({ where: { userId: user.id } });
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
}
async function countUserArtifacts(prisma, userId) {
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
//# sourceMappingURL=db-cleanup.js.map