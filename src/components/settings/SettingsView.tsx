import React, { useState } from 'react';
import { SlidersHorizontal, Save, CheckCircle } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useStudio();

  const [studioName, setStudioName] = useState(settings.studioName);
  const [taxId, setTaxId] = useState(settings.taxId);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [website, setWebsite] = useState(settings.website);
  const [currency, setCurrency] = useState(settings.currency);
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode);
  const [defaultTaxRate, setDefaultTaxRate] = useState<number>(settings.defaultTaxRate);
  const [defaultArtistCommission, setDefaultArtistCommission] = useState<number>(
    settings.defaultArtistCommission
  );
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(settings.receiptFooterMessage);
  const [healthSanitaryRegistration, setHealthSanitaryRegistration] = useState(
    settings.healthSanitaryRegistration
  );
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      studioName: studioName.trim(),
      taxId: taxId.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      currency: currency.trim() || '$',
      currencyCode: currencyCode.trim() || 'USD',
      defaultTaxRate,
      defaultArtistCommission,
      receiptFooterMessage: receiptFooterMessage.trim(),
      healthSanitaryRegistration: healthSanitaryRegistration.trim(),
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="border-b border-[#24242A] pb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">
          Configuración del Estudio y Parámetros
        </h2>
        <p className="text-[11px] text-neutral-400">
          Personaliza los datos de tu estudio de tatuajes y piercings, moneda de trabajo e impuestos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-[#18181D] border border-[#272730] space-y-6">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
            Identificación Comercial & Sanitaria
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">Nombre Comercial *</label>
              <input
                type="text"
                required
                value={studioName}
                onChange={e => setStudioName(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">NIF / CIF / RFC *</label>
              <input
                type="text"
                required
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">
                N° Registro Sanitario Oficial
              </label>
              <input
                type="text"
                value={healthSanitaryRegistration}
                onChange={e => setHealthSanitaryRegistration(e.target.value)}
                placeholder="REG-SAN-..."
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">Dirección</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white focus:border-[#FF3366]/60"
              />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="pt-4 border-t border-[#24242B]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
            Parámetros Financieros
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">Símbolo Moneda</label>
              <input
                type="text"
                required
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                placeholder="$ o USD"
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">Código ISO</label>
              <input
                type="text"
                value={currencyCode}
                onChange={e => setCurrencyCode(e.target.value)}
                placeholder="EUR, USD"
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">IVA por Defecto (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={defaultTaxRate}
                onChange={e => setDefaultTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-300 mb-1.5">Comisión Base Artista (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={defaultArtistCommission}
                onChange={e => setDefaultArtistCommission(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-white font-mono focus:border-[#FF3366]/60"
              />
            </div>
          </div>
        </div>

        {/* Receipt text */}
        <div className="pt-4 border-t border-[#24242B]">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">
            Mensaje al Pie del Ticket
          </h3>
          <textarea
            rows={3}
            value={receiptFooterMessage}
            onChange={e => setReceiptFooterMessage(e.target.value)}
            className="w-full px-3.5 py-2 bg-[#121215] border border-[#272730] rounded-xl text-xs text-white focus:border-[#FF3366]/60"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-[#24242B] flex items-center justify-between">
          <div>
            {isSaved && (
              <span className="text-xs text-[#FF3366] font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Configuración guardada correctamente</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(255,51,102,0.35)] transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </form>
    </div>
  );
};
