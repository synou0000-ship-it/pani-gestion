import prisma from './prisma';

interface AuditLogParams {
  utilisateurId?: number;
  action: string;
  table: string;
  enregistrementId?: number;
  anciennesValeurs?: Record<string, unknown>;
  nouvellesValeurs?: Record<string, unknown>;
  adresseIp?: string;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await prisma.journalAudit.create({
      data: {
        utilisateurId: params.utilisateurId,
        action: params.action,
        table: params.table,
        enregistrementId: params.enregistrementId,
        anciennesValeurs: params.anciennesValeurs ? JSON.parse(JSON.stringify(params.anciennesValeurs)) : undefined,
        nouvellesValeurs: params.nouvellesValeurs ? JSON.parse(JSON.stringify(params.nouvellesValeurs)) : undefined,
        adresseIp: params.adresseIp,
      },
    });
  } catch (error) {
    console.error('[AuditLog] Erreur lors de l\'enregistrement:', error);
  }
}
