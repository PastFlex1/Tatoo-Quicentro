import React, { useState } from 'react';
import {
  Users,
  PlusCircle,
  DollarSign,
  Edit2,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { Artist } from '../../types';

export const ArtistsView: React.FC = () => {
  const {
    artists,
    filteredSales,
    settlements,
    settleArtistCommissions,
    addArtist,
    updateArtist,
    toggleArtistStatus,
    formatMoney,
  } = useStudio();

  const [settleArtistId, setSettleArtistId] = useState<string | null>(null);
  const [isNewArtistModalOpen, setIsNewArtistModalOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  const [settleAmount, setSettleAmount] = useState<number>(0);
  const [settleTips, setSettleTips] = useState<number>(0);
  const [settleDeductions, setSettleDeductions] = useState<number>(0);
  const [settleMethod, setSettleMethod] = useState<'cash' | 'transfer'>('transfer');
  const [settleNotes, setSettleNotes] = useState('');

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'Tatuador' | 'Tatuadora' | 'Piercer' | 'Residente' | 'Invitado / Guest'>('Tatuador');
  const [specialty, setSpecialty] = useState('');
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(60);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const openSettleModal = (artist: Artist, commission: number, tips: number) => {
    setSettleArtistId(artist.id);
    setSettleAmount(commission);
    setSettleTips(tips);
    setSettleDeductions(0);
    setSettleMethod('transfer');
    setSettleNotes(`Liquidación de comisiones para ${artist.name}`);
  };

  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleArtistId) return;

    settleArtistCommissions(
      settleArtistId,
      settleAmount,
      settleTips,
      settleDeductions,
      settleMethod,
      settleNotes
    );

    setSettleArtistId(null);
  };

  const handleSaveArtist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingArtist) {
      updateArtist(editingArtist.id, {
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        role,
        specialty: specialty.trim() || 'Tatuador Artístico',
        defaultCommissionRate,
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      setEditingArtist(null);
    } else {
      addArtist({
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        role,
        specialty: specialty.trim() || 'Tatuador Artístico',
        defaultCommissionRate,
        phone: phone.trim() || '+34 600 000 000',
        email: email.trim() || undefined,
        active: true,
        avatarColor: 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/30',
      });
      setIsNewArtistModalOpen(false);
    }

    setName('');
    setNickname('');
    setSpecialty('');
    setPhone('');
    setEmail('');
  };

  const startEdit = (artist: Artist) => {
    setEditingArtist(artist);
    setName(artist.name);
    setNickname(artist.nickname || '');
    setRole(artist.role);
    setSpecialty(artist.specialty);
    setDefaultCommissionRate(artist.defaultCommissionRate);
    setPhone(artist.phone);
    setEmail(artist.email || '');
    setIsNewArtistModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#24242A] pb-4">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Liquidación de Artistas & Porcentajes
          </h2>
          <p className="text-[11px] text-neutral-400">
            Control de comisiones acumuladas, propinas y pagos emitidos a tatuadores y piercers.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingArtist(null);
            setName('');
            setNickname('');
            setSpecialty('');
            setPhone('');
            setEmail('');
            setIsNewArtistModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs transition-all shadow-[0_0_12px_rgba(255,51,102,0.3)]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Añadir Artista / Guest</span>
        </button>
      </div>

      {/* Artist Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {artists.map(art => {
          const artistSales = filteredSales.filter(
            s => s.artistId === art.id && s.status !== 'cancelled'
          );
          const grossBilled = artistSales.reduce((acc, s) => acc + s.total, 0);
          const commissionEarned = artistSales.reduce((acc, s) => acc + s.artistShare, 0);
          const studioKept = artistSales.reduce((acc, s) => acc + s.studioShare, 0);
          const tipsEarned = artistSales.reduce((acc, s) => acc + s.tipAmount, 0);
          const totalEarned = commissionEarned + tipsEarned;

          const artistSettlements = settlements.filter(st => st.artistId === art.id);
          const alreadyPaid = artistSettlements.reduce((acc, st) => acc + st.amountPaid, 0);
          const pendingBalance = Math.max(0, totalEarned - alreadyPaid);

          return (
            <div
              key={art.id}
              className={`p-6 rounded-2xl border transition-all ${
                art.active
                  ? 'bg-[#18181D] border-[#272730]'
                  : 'bg-[#141418] border-[#202026] opacity-60'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#FF3366]/15 border border-[#FF3366]/40 flex items-center justify-center font-bold text-sm text-[#FF3366] shadow-[0_0_10px_rgba(255,51,102,0.15)] shrink-0">
                    {art.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{art.name}</h3>
                      {art.nickname && (
                        <span className="text-[11px] text-[#FF3366]">"{art.nickname}"</span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                      <span className="text-white font-semibold">{art.role}</span>
                      <span>·</span>
                      <span className="truncate max-w-[200px]">{art.specialty}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(art)}
                    className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleArtistStatus(art.id)}
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold ${
                      art.active
                        ? 'bg-[#FF3366]/20 text-[#FF3366] border border-[#FF3366]/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {art.active ? 'Activo' : 'Inactivo'}
                  </button>
                </div>
              </div>

              {/* Commission Stats Pill Grid */}
              <div className="grid grid-cols-3 gap-2.5 mb-4 text-xs">
                <div className="p-3 rounded-xl bg-[#121215] border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block mb-1">Facturación</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatMoney(grossBilled)}
                  </span>
                  <span className="text-[9px] text-neutral-500 block mt-1">{artistSales.length} citas</span>
                </div>

                <div className="p-3 rounded-xl bg-[#121215] border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block mb-1">Comisión {art.defaultCommissionRate}%</span>
                  <span className="font-mono font-bold text-[#FF3366] text-sm">
                    {formatMoney(commissionEarned)}
                  </span>
                  {tipsEarned > 0 && (
                    <span className="text-[9px] text-neutral-400 block mt-1">+{formatMoney(tipsEarned)} tips</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-[#121215] border border-[#272730]">
                  <span className="text-[10px] text-neutral-400 block mb-1">Casa ({100 - art.defaultCommissionRate}%)</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {formatMoney(studioKept)}
                  </span>
                  <span className="text-[9px] text-neutral-500 block mt-1">Retenido</span>
                </div>
              </div>

              {/* Payout Status Banner & Action */}
              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Pendiente de Liquidar:</span>
                  <span className="font-mono font-bold text-sm text-[#FF3366]">
                    {formatMoney(pendingBalance)}
                  </span>
                </div>

                <button
                  onClick={() => openSettleModal(art, pendingBalance, 0)}
                  disabled={pendingBalance <= 0}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${
                    pendingBalance > 0
                      ? 'bg-[#FF3366] hover:bg-[#E62557] text-white shadow-[0_0_12px_rgba(255,51,102,0.3)]'
                      : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Liquidar Pago</span>
                </button>
              </div>

              {/* Contact info footer */}
              <div className="mt-3.5 pt-2.5 border-t border-[#23232A] flex items-center justify-between text-[11px] text-neutral-500">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-[#FF3366]" /> {art.phone}
                </span>
                {art.email && (
                  <span className="flex items-center gap-1.5 truncate max-w-[180px]">
                    <Mail className="w-3 h-3 text-neutral-500" /> {art.email}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Past Settlements History */}
      {settlements.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-3">
          <div className="flex items-center justify-between border-b border-[#24242B] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Historial de Liquidaciones Emitidas
            </h3>
            <span className="text-[11px] text-neutral-400">{settlements.length} pagos registrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#24242B] text-neutral-400 font-medium">
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Artista</th>
                  <th className="py-2.5 px-3">Comisión Base</th>
                  <th className="py-2.5 px-3">Propinas</th>
                  <th className="py-2.5 px-3">Deducciones</th>
                  <th className="py-2.5 px-3 text-right">Neto Pagado</th>
                  <th className="py-2.5 px-3">Método</th>
                  <th className="py-2.5 px-3">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222228]">
                {settlements.map(st => (
                  <tr key={st.id} className="hover:bg-[#1E1E25]">
                    <td className="py-2.5 px-3 font-mono text-neutral-400">
                      {new Date(st.date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{st.artistName}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-300">
                      {formatMoney(st.commissionEarned)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-400">
                      {formatMoney(st.tipsEarned)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#FF3366]">
                      -{formatMoney(st.deductions)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {formatMoney(st.amountPaid)}
                    </td>
                    <td className="py-2.5 px-3 uppercase text-[10px] font-mono text-neutral-400">
                      {st.paymentMethod === 'cash' ? 'Efectivo' : 'Transf'}
                    </td>
                    <td className="py-2.5 px-3 text-neutral-400 text-[11px] truncate max-w-[200px]">
                      {st.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Settle Commission Modal matching reference Dialog */}
      {settleArtistId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">Liquidar Pago de Comisiones</h3>
              <button
                onClick={() => setSettleArtistId(null)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Comisión a Liquidar</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={e => setSettleAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Propinas Acumuladas</label>
                <input
                  type="number"
                  step="0.01"
                  value={settleTips}
                  onChange={e => setSettleTips(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Deducciones (Insumos propios o anticipos)</label>
                <input
                  type="number"
                  step="0.01"
                  value={settleDeductions}
                  onChange={e => setSettleDeductions(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-[#FF3366] font-mono focus:border-[#FF3366]/60"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Forma de Pago del Estudio</label>
                <select
                  value={settleMethod}
                  onChange={e => setSettleMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                >
                  <option value="transfer">Transferencia Bancaria / Bizum</option>
                  <option value="cash">Efectivo de la Caja (Deducir del Arqueo)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Notas / Justificante</label>
                <input
                  type="text"
                  value={settleNotes}
                  onChange={e => setSettleNotes(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-[#121215] border border-[#272730] flex justify-between items-center text-sm">
                <span className="font-semibold text-neutral-300">Neto a Pagar:</span>
                <span className="font-mono font-bold text-[#FF3366] text-base">
                  {formatMoney(settleAmount + settleTips - settleDeductions)}
                </span>
              </div>

              <div className="pt-4 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSettleArtistId(null)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#FF3366] hover:bg-[#E62557] text-white font-bold rounded-full shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all"
                >
                  Confirmar Pago & Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Artist Modal */}
      {isNewArtistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#25252E] pb-3">
              <h3 className="text-sm font-bold text-white tracking-wide">
                {editingArtist ? 'Editar Datos del Artista' : 'Registrar Nuevo Artista o Guest'}
              </h3>
              <button
                onClick={() => setIsNewArtistModalOpen(false)}
                className="p-1.5 rounded-full text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveArtist} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Roberto Méndez"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Apodo / Firma</label>
                  <input
                    type="text"
                    placeholder="Ej. Rob Ink"
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Rol</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value as any)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  >
                    <option value="Tatuador">Tatuador Residente</option>
                    <option value="Tatuadora">Tatuadora Residente</option>
                    <option value="Piercer">Piercer / Anillador</option>
                    <option value="Invitado / Guest">Artista Guest</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Especialidad</label>
                <input
                  type="text"
                  placeholder="Ej. Realismo sombras, Tradicional, Fine line"
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">% Comisión</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={defaultCommissionRate}
                    onChange={e => setDefaultCommissionRate(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-neutral-300 mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="+34 600..."
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-300 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="artista@estudio.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
                />
              </div>

              <div className="pt-4 border-t border-[#25252E] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewArtistModalOpen(false)}
                  className="px-4 py-2 text-neutral-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold shadow-[0_0_12px_rgba(255,51,102,0.3)] transition-all"
                >
                  {editingArtist ? 'Guardar Cambios' : 'Crear Artista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
