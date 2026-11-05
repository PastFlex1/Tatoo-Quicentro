/**
 * Catálogo del cuestionario de salud y de las declaraciones de la carta de consentimiento.
 * Las claves se guardan en la ficha; las etiquetas se muestran en pantalla y en la carta impresa.
 */

export interface CatalogItem {
  key: string;
  label: string;
  /** Contraindicación: exige evaluación y nota del artista antes de firmar */
  risk?: boolean;
  hint?: string;
}

export const ALLERGIES: CatalogItem[] = [
  { key: 'latex', label: 'Látex (guantes)', risk: true },
  { key: 'anestesicos', label: 'Anestésicos locales (lidocaína, benzocaína)', risk: true },
  { key: 'niquel', label: 'Níquel / metales (joyería)', risk: true },
  { key: 'pigmentos', label: 'Pigmentos o tintas (rojo, amarillo)', risk: true },
  { key: 'adhesivos', label: 'Adhesivos, apósitos o film plástico' },
  { key: 'antisepticos', label: 'Yodo, clorhexidina o alcohol' },
  { key: 'antibioticos', label: 'Antibióticos / pomadas (neomicina, bacitracina)' },
  { key: 'jabones', label: 'Jabones, cremas o perfumes' },
];

export const CONDITIONS: CatalogItem[] = [
  { key: 'diabetes', label: 'Diabetes', risk: true, hint: 'Cicatrización más lenta' },
  { key: 'coagulacion', label: 'Hemofilia o trastornos de coagulación', risk: true },
  { key: 'cardiaca', label: 'Enfermedad cardíaca / hipertensión', risk: true },
  { key: 'epilepsia', label: 'Epilepsia o convulsiones', risk: true },
  { key: 'desmayos', label: 'Desmayos, hipotensión o miedo a agujas' },
  { key: 'infecciosa', label: 'Hepatitis B/C, VIH u otra enfermedad infecciosa', risk: true },
  { key: 'inmunidad', label: 'Inmunodepresión o enfermedad autoinmune', risk: true },
  { key: 'queloides', label: 'Queloides o cicatrización anormal', risk: true },
  { key: 'piel', label: 'Psoriasis, dermatitis, vitíligo o lesiones en la zona', risk: true },
  { key: 'cancer', label: 'Cáncer / quimioterapia / radioterapia', risk: true },
  { key: 'asma', label: 'Asma o problemas respiratorios' },
  { key: 'cirugia', label: 'Cirugía reciente (últimos 3 meses)', risk: true },
];

export const MEDICATIONS: CatalogItem[] = [
  { key: 'anticoagulantes', label: 'Anticoagulantes o aspirina', risk: true },
  { key: 'isotretinoina', label: 'Isotretinoína (Roacután) en los últimos 6 meses', risk: true },
  { key: 'corticoides', label: 'Corticoides' },
  { key: 'antibioticos_actual', label: 'Antibióticos actualmente' },
  { key: 'inmunosupresores', label: 'Inmunosupresores', risk: true },
  { key: 'insulina', label: 'Insulina' },
];

export const CURRENT_STATE: CatalogItem[] = [
  { key: 'alcohol', label: 'Consumió alcohol o drogas en las últimas 24 h', risk: true },
  { key: 'ayuno', label: 'No ha comido en las últimas 4 h', risk: true },
  { key: 'sol', label: 'Exposición solar / quemadura en la zona', risk: true },
  { key: 'enfermo', label: 'Gripe, fiebre o malestar actual', risk: true },
  { key: 'sangre', label: 'Donó sangre en las últimas 48 h' },
];

export const PROCEDURE_TYPES = [
  { key: 'tattoo', label: 'Tatuaje' },
  { key: 'piercing', label: 'Perforación (piercing)' },
  { key: 'removal', label: 'Cover-up / retoque' },
  { key: 'other', label: 'Otro procedimiento' },
] as const;

export const BODY_ZONES = [
  'Antebrazo', 'Brazo', 'Hombro', 'Mano', 'Dedos', 'Cuello', 'Nuca', 'Espalda', 'Pecho', 'Costillas',
  'Abdomen', 'Cadera', 'Muslo', 'Pantorrilla', 'Tobillo', 'Pie', 'Oreja (lóbulo)', 'Oreja (hélix/cartílago)',
  'Nariz', 'Ceja', 'Labio', 'Lengua', 'Ombligo', 'Rostro', 'Otra',
];

/** Declaraciones de la carta. `required` deben aceptarse para poder firmar. */
export const DECLARATIONS: (CatalogItem & { required: boolean; minorOnly?: boolean })[] = [
  {
    key: 'veracidad',
    required: true,
    label:
      'Declaro que la información de salud proporcionada es verdadera y completa. Entiendo que ocultar o falsear información exime al estudio y al artista de responsabilidad por las consecuencias.',
  },
  {
    key: 'riesgos',
    required: true,
    label:
      'Se me explicaron los riesgos del procedimiento: dolor, sangrado, inflamación, infección, reacciones alérgicas a pigmentos o materiales, cicatrización anormal (queloides) y variaciones en el resultado según mi tipo de piel.',
  },
  {
    key: 'permanencia',
    required: true,
    label:
      'Comprendo que el procedimiento es permanente y que su eliminación es costosa, dolorosa y puede no ser completa.',
  },
  {
    key: 'diseno',
    required: true,
    label:
      'Revisé y aprobé el diseño, tamaño, ubicación, colores y la ortografía de cualquier texto antes de iniciar.',
  },
  {
    key: 'esterilidad',
    required: true,
    label:
      'Observé que se utilizan agujas y material desechables, estériles y de un solo uso, abiertos en mi presencia.',
  },
  {
    key: 'cuidados',
    required: true,
    label:
      'Recibí las instrucciones de cuidado posterior (curación) por escrito y verbalmente. Me comprometo a seguirlas y entiendo que el mal cuidado puede afectar el resultado o causar infecciones.',
  },
  {
    key: 'sobriedad',
    required: true,
    label: 'Declaro no encontrarme bajo los efectos del alcohol, drogas o medicamentos que alteren mi juicio.',
  },
  {
    key: 'edad',
    required: true,
    label:
      'Declaro ser mayor de 18 años, o contar con la autorización expresa y presencial de mi representante legal, quien firma esta carta.',
  },
  {
    key: 'representante',
    required: true,
    minorOnly: true,
    label:
      'Como representante legal del menor, autorizo el procedimiento descrito y asumo la responsabilidad de supervisar su cuidado posterior.',
  },
  {
    key: 'pagos',
    required: false,
    label:
      'Acepto la política del estudio: los anticipos no son reembolsables y los retoques gratuitos aplican solo si se siguieron los cuidados indicados.',
  },
];

export const ALL_HEALTH_ITEMS = [...ALLERGIES, ...CONDITIONS, ...MEDICATIONS, ...CURRENT_STATE];

export const labelFor = (key: string) => ALL_HEALTH_ITEMS.find(i => i.key === key)?.label || key;

export const riskFlagsOf = (h: { allergies: string[]; conditions: string[]; medications: string[]; currentState: string[]; pregnantOrNursing?: boolean }) => {
  const keys = [...h.allergies, ...h.conditions, ...h.medications, ...h.currentState];
  const flags = keys.filter(k => ALL_HEALTH_ITEMS.find(i => i.key === k)?.risk);
  if (h.pregnantOrNursing) flags.push('embarazo');
  return flags;
};

export const flagLabel = (key: string) => (key === 'embarazo' ? 'Embarazo o lactancia' : labelFor(key));

export const ageFrom = (birthDate?: string): number | undefined => {
  if (!birthDate) return undefined;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
};

export const emptyHealthSheet = () => ({
  allergies: [] as string[],
  allergiesOther: '',
  conditions: [] as string[],
  conditionsDetail: '',
  medications: [] as string[],
  medicationsDetail: '',
  currentState: [] as string[],
  bloodType: '',
  pregnantOrNursing: false,
  previousTattooReactions: '',
  skinNotes: '',
  updatedAt: new Date().toISOString(),
});
