import { PrismaService } from '../../../../src/prisma/prisma.service';
export declare function cleanupTestUser(prisma: PrismaService, email: string): Promise<void>;
export declare function countUserArtifacts(prisma: PrismaService, userId: number): Promise<{
    user: number;
    wallet: number;
    payments: number;
    subscriptions: number;
    accessLogs: number;
    emailValidations: number;
    backups: number;
}>;
