import { ArtistSettlement, SaleRecord } from '../types';

/**
 * Saldo de un artista calculado sobre todo el histórico.
 *
 * - Ganado: comisión (artistShare) + propinas de sus ventas no anuladas.
 * - Aplicado: lo que cada liquidación/anticipo descontó del saldo
 *   (commissionEarned + tipsEarned). Las deducciones (insumos, préstamos)
 *   reducen el efectivo entregado pero NO dejan deuda pendiente con el artista.
 * - Pendiente = Ganado − Aplicado. Si es negativo, el artista recibió
 *   anticipos por encima de lo ganado (saldo a favor del estudio).
 */
export interface ArtistBalance {
  earnedCommission: number;
  earnedTips: number;
  earnedTotal: number;
  appliedTotal: number;
  /** Saldo neto (puede ser negativo si hay anticipos por encima de lo ganado) */
  balance: number;
  /** Parte del saldo pendiente que corresponde a propinas */
  pendingTips: number;
  /** Parte del saldo pendiente que corresponde a comisiones */
  pendingCommission: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const settlementAppliedAmount = (st: ArtistSettlement): number =>
  (st.commissionEarned || 0) + (st.tipsEarned || 0);

export function computeArtistBalance(
  artistId: string,
  sales: SaleRecord[],
  settlements: ArtistSettlement[]
): ArtistBalance {
  const artistSales = sales.filter(s => s.artistId === artistId && s.status !== 'cancelled');
  const artistSettlements = settlements.filter(st => st.artistId === artistId);

  const earnedCommission = round2(artistSales.reduce((acc, s) => acc + (s.artistShare || 0), 0));
  const earnedTips = round2(artistSales.reduce((acc, s) => acc + (s.tipAmount || 0), 0));
  const earnedTotal = round2(earnedCommission + earnedTips);

  const appliedTips = artistSettlements.reduce((acc, st) => acc + (st.tipsEarned || 0), 0);
  const appliedTotal = round2(artistSettlements.reduce((acc, st) => acc + settlementAppliedAmount(st), 0));

  const balance = round2(earnedTotal - appliedTotal);
  const positive = Math.max(0, balance);
  const pendingTips = round2(Math.min(positive, Math.max(0, earnedTips - appliedTips)));
  const pendingCommission = round2(positive - pendingTips);

  return {
    earnedCommission,
    earnedTips,
    earnedTotal,
    appliedTotal,
    balance,
    pendingTips,
    pendingCommission,
  };
}
