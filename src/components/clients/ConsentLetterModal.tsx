import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { useStudio } from '../../context/StudioContext';
import { ConsentForm } from '../../types';
import {
  ALLERGIES,
  CONDITIONS,
  CURRENT_STATE,
  DECLARATIONS,
  MEDICATIONS,
  PROCEDURE_TYPES,
  CatalogItem,
  flagLabel,
} from '../../data/consentCatalog';

interface ConsentLetterModalProps {
  form: ConsentForm | null;
  justSigned?: boolean;
  onClose: () => void;
}

const fmtDate = (d?: string) =>
  d ? new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

/** Carta de consentimiento informado (A4) lista para imprimir y archivar. */
export const ConsentLetterModal: React.FC<ConsentLetterModalProps> = ({ form, justSigned, onClose }) => {
  const { settings } = useStudio();
  if (!form) return null;
  const h = form.health;

  const answers = (items: CatalogItem[], selected: string[], extra?: string) => {
    const list = [...items.filter(i => selected.includes(i.key)).map(i => i.label), extra].filter(Boolean);
    return list.length ? list.join('; ') : 'Ninguna';
  };

  const Row: React.FC<{ k: string; v?: React.ReactNode }> = ({ k, v }) => (
    <tr>
      <td className="border border-neutral-400 px-2 py-1 font-semibold bg-neutral-100 w-[32%] align-top">{k}</td>
      <td className="border border-neutral-400 px-2 py-1 align-top">{v || '—'}</td>
    </tr>
  );
  const H: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h3 className="font-bold uppercase text-[11px] mt-4 mb-1.5 border-b border-black pb-0.5">{children}</h3>
  );
  const Sig: React.FC<{ img?: string; name: string; role: string; dni?: string }> = ({ img, name, role, dni }) => (
    <div className="text-center">
      <div className="h-20 flex items-end justify-center">{img && <img src={img} alt={`Firma ${role}`} className="max-h-20 max-w-full object-contain" />}</div>
      <div className="border-t border-black pt-1">
        <div className="font-bold uppercase">{name}</div>
        <div>{role}</div>
        {dni && <div>C.I. {dni}</div>}
      </div>
    </div>
  );

  const procLabel = PROCEDURE_TYPES.find(p => p.key === form.procedureType)?.label || form.procedureType;
  const declarations = DECLARATIONS.filter(d => !d.minorOnly || form.isMinor);

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          #printable-receipt { padding: 0 !important; font-size: 10.5px !important; }
          #printable-receipt table, #printable-receipt h3 { break-inside: avoid; }
        }
      `}</style>
      <div className="bg-[#17171C] border border-[#2B2B36] rounded-2xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-3.5 border-b border-[#25252E] flex items-center justify-between bg-[#121215] shrink-0">
          <div className="flex items-center gap-2">
            {justSigned && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <h3 className="text-sm font-bold text-white">
              {justSigned ? 'Consentimiento firmado · ' : ''}Carta {form.number}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-[#25252E] cursor-pointer" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-neutral-700/30">
          <div id="printable-receipt" className="bg-white text-black mx-auto w-full max-w-[800px] p-6 sm:p-10 text-[11px] leading-snug font-sans shadow-xl">
            {/* Encabezado */}
            <div className="flex justify-between items-start gap-4 border-b-2 border-black pb-2">
              <div>
                <div className="font-bold text-[15px] uppercase">{settings.nombreComercial || settings.studioName}</div>
                {settings.razonSocial && <div>{settings.razonSocial}</div>}
                <div>RUC: {settings.ruc || settings.taxId || '—'}</div>
                <div>{settings.dirEstablecimiento || settings.address}</div>
                {settings.healthSanitaryRegistration && <div>Registro sanitario: {settings.healthSanitaryRegistration}</div>}
              </div>
              <div className="text-right">
                <div className="font-bold">N° {form.number}</div>
                <div>{fmtDate(form.signedAt)}</div>
                <div>{new Date(form.signedAt).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            <h2 className="text-center font-bold text-[14px] uppercase mt-3">Carta de consentimiento informado</h2>
            <p className="text-center">para procedimiento de {procLabel.toLowerCase()}</p>

            <H>1. Datos del cliente</H>
            <table className="w-full border-collapse">
              <tbody>
                <Row k="Nombre completo" v={form.clientName} />
                <Row k="Cédula / pasaporte" v={form.clientDni} />
                <Row k="Fecha de nacimiento / edad" v={`${fmtDate(form.clientBirthDate)}${form.clientAge !== undefined ? ` (${form.clientAge} años)` : ''}`} />
                <Row k="Teléfono / correo" v={[form.clientPhone, form.clientEmail].filter(Boolean).join(' · ')} />
                <Row k="Dirección" v={form.clientAddress} />
              </tbody>
            </table>

            {form.isMinor && form.guardian && (
              <>
                <H>Representante legal (cliente menor de edad)</H>
                <table className="w-full border-collapse">
                  <tbody>
                    <Row k="Nombre" v={form.guardian.name} />
                    <Row k="Cédula" v={form.guardian.dni} />
                    <Row k="Parentesco" v={form.guardian.relationship} />
                  </tbody>
                </table>
              </>
            )}

            <H>2. Procedimiento</H>
            <table className="w-full border-collapse">
              <tbody>
                <Row k="Tipo" v={procLabel} />
                <Row k="Descripción del diseño" v={form.procedureDescription} />
                <Row k="Zona del cuerpo" v={form.bodyZone} />
                {form.jewelryMaterial && <Row k="Material de la joya" v={form.jewelryMaterial} />}
                <Row k="Artista responsable" v={form.artistName} />
                <Row k="Fecha / sesiones estimadas" v={`${fmtDate(form.procedureDate)} · ${form.estimatedSessions || 1} sesión(es)`} />
                {form.estimatedPrice ? <Row k="Precio estimado" v={`$${form.estimatedPrice.toFixed(2)}`} /> : null}
              </tbody>
            </table>

            <H>3. Ficha de salud declarada por el cliente</H>
            <table className="w-full border-collapse">
              <tbody>
                <Row k="Alergias" v={answers(ALLERGIES, h.allergies, h.allergiesOther)} />
                <Row k="Condiciones médicas" v={answers(CONDITIONS, h.conditions, h.conditionsDetail)} />
                <Row k="Medicamentos" v={answers(MEDICATIONS, h.medications, h.medicationsDetail)} />
                <Row k="Estado actual" v={answers(CURRENT_STATE, h.currentState)} />
                <Row k="Embarazo o lactancia" v={h.pregnantOrNursing ? 'Sí' : 'No'} />
                <Row k="Tipo de sangre" v={h.bloodType || 'No sabe'} />
                <Row k="Reacciones anteriores" v={h.previousTattooReactions || 'Ninguna'} />
                {h.skinNotes && <Row k="Notas de la piel" v={h.skinNotes} />}
              </tbody>
            </table>

            {form.riskFlags.length > 0 && (
              <div className="mt-2 p-2 border border-black">
                <strong>Contraindicaciones evaluadas:</strong> {form.riskFlags.map(flagLabel).join('; ')}.
                <br />
                <strong>Evaluación del artista:</strong> {form.riskAssessmentNote}
              </div>
            )}

            <H>4. Declaraciones del cliente</H>
            <ol className="space-y-1">
              {declarations.map((d, i) => (
                <li key={d.key} className="flex gap-1.5">
                  <span className="font-mono">{form.acceptedDeclarations.includes(d.key) ? '☑' : '☐'}</span>
                  <span>
                    {i + 1}. {d.label}
                  </span>
                </li>
              ))}
              <li className="flex gap-1.5">
                <span className="font-mono">{form.photoAuthorization ? '☑' : '☐'}</span>
                <span>Autorizo la toma y publicación de fotografías del trabajo (portafolio / redes sociales).</span>
              </li>
            </ol>

            <p className="mt-3 text-justify">
              Habiendo leído y comprendido este documento, firmo de manera libre y voluntaria, y autorizo a{' '}
              <strong>{form.artistName}</strong> y a <strong>{settings.nombreComercial || settings.studioName}</strong> a realizar el
              procedimiento descrito. Los datos personales y de salud se tratan de forma confidencial conforme a la Ley Orgánica de
              Protección de Datos Personales del Ecuador y se usan únicamente para la atención y seguridad del cliente.
            </p>

            <div className={`grid ${form.isMinor ? 'grid-cols-3' : 'grid-cols-2'} gap-6 mt-8`}>
              <Sig img={form.clientSignature} name={form.clientName} role="Cliente" dni={form.clientDni} />
              {form.isMinor && form.guardian && (
                <Sig img={form.guardianSignature} name={form.guardian.name} role="Representante legal" dni={form.guardian.dni} />
              )}
              <Sig img={form.artistSignature} name={form.artistName} role="Artista responsable" />
            </div>

            <div className="mt-6 text-[9px] text-neutral-600 border-t border-neutral-300 pt-1 flex justify-between">
              <span>Registrado por: {form.registeredBy || '—'}</span>
              <span>Firmado digitalmente el {new Date(form.signedAt).toLocaleString('es-EC')}</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-[#25252E] bg-[#121215] flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer">
            Cerrar
          </button>
          <button onClick={() => window.print()} className="px-5 py-2 rounded-full bg-[#FF3366] hover:bg-[#E62557] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer">
            <Printer className="w-3.5 h-3.5" />
            Imprimir / guardar PDF
          </button>
        </div>
      </div>
    </div>
  );
};
