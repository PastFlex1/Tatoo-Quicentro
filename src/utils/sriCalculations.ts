/**
 * sriCalculations.ts
 * Utilidades de criptografía, codificación y cálculo para comprobantes y firma electrónica SRI Ecuador.
 */

export const ECUADOR_CERTIFIERS = [
  'BANCO CENTRAL DEL ECUADOR (BCE)',
  'SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL',
  'CONSEJO DE LA JUDICATURA (ICERT-EC)',
  'ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.',
  'UANATACA ECUADOR',
  'FAD FIRMA DIGITAL ECUADOR',
  'DATIL MEDIA S.A.',
  'OTRA ENTIDAD CERTIFICADORA ACREDITADA',
];

/**
 * Convierte un archivo File (como certificado .p12 o .pfx) a base64 limpio.
 */
export async function convertFileToBase64(
  file: File
): Promise<{ base64: string; size: number; name: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve({
        base64: base64.trim(),
        size: file.size,
        name: file.name,
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Detecta automáticamente la entidad emisora autorizada del certificado en base al nombre del archivo.
 */
export function detectEcuadorianCertificateIssuer(fileName: string): string {
  const lower = (fileName || '').toLowerCase();

  if (lower.includes('bce') || lower.includes('central')) {
    return 'BANCO CENTRAL DEL ECUADOR (BCE)';
  }
  if (lower.includes('security') || lower.includes('secdata') || lower.includes('data')) {
    return 'SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL';
  }
  if (lower.includes('icert') || lower.includes('judicatura') || lower.includes('cj')) {
    return 'CONSEJO DE LA JUDICATURA (ICERT-EC)';
  }
  if (lower.includes('anfac')) {
    return 'ANFAC AUTORIDAD DE CERTIFICACION ECUADOR C.A.';
  }
  if (lower.includes('uanataca')) {
    return 'UANATACA ECUADOR';
  }
  if (lower.includes('fad') || lower.includes('fadigital')) {
    return 'FAD FIRMA DIGITAL ECUADOR';
  }
  if (lower.includes('datil')) {
    return 'DATIL MEDIA S.A.';
  }

  return 'BANCO CENTRAL DEL ECUADOR (BCE)';
}

/**
 * Genera un hash pseudo SHA-1 simple en hexadecimal para simulación de digest.
 */
function simpleSha1Hex(text: string): string {
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    h0 = ((h0 << 5) - h0 + charCode) & 0xffffffff;
    h1 = ((h1 << 5) - h1 + (charCode ^ h0)) & 0xffffffff;
    h2 = ((h2 << 5) - h2 + (charCode ^ h1)) & 0xffffffff;
    h3 = ((h3 << 5) - h3 + (charCode ^ h2)) & 0xffffffff;
    h4 = ((h4 << 5) - h4 + (charCode ^ h3)) & 0xffffffff;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return (toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)).substring(0, 40);
}

/**
 * Convierte un hex a Base64
 */
function hexToBase64(hexstring: string): string {
  const match = hexstring.match(/\w{2}/g);
  if (!match) return 'bW9ja0RpZ2VzdA==';
  return btoa(
    match.map((a) => String.fromCharCode(parseInt(a, 16))).join('')
  );
}

/**
 * Simula la firma electrónica en formato XAdES-BES según la Ficha Técnica de Comprobantes Electrónicos del SRI.
 */
export function simulateXadesBesXmlSigning(
  xml: string,
  base64Certificate?: string,
  password?: string
): { signedXml: string; signatureDigest: string; signingTime: string } {
  const signingTime = new Date().toISOString();
  const certSnippet = (base64Certificate || '').substring(0, 48) || 'MIAGCSqGSIb3DQEHAqCAMIACAQExCzAJBgUrDgMCGgUAMIAGCSqGSIb3DQEHA6CAMIACAQA=';
  const docDigestHex = simpleSha1Hex(xml + (password ? password.substring(0, 3) : ''));
  const signatureDigest = hexToBase64(docDigestHex);
  const signatureValueHex = simpleSha1Hex(docDigestHex + signingTime + certSnippet);
  const signatureValue = hexToBase64(signatureValueHex) + '==';

  const xadesSignatureBlock = `
  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature782163">
    <ds:SignedInfo Id="Signature-SignedInfo192847">
      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
      <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
      <ds:Reference Id="SignedPropertiesID491823" Type="http://uri.etsi.org/01903#SignedProperties" URI="#SignedPropertiesID491823">
        <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <ds:DigestValue>${signatureDigest}</ds:DigestValue>
      </ds:Reference>
      <ds:Reference URI="#comprobante">
        <ds:Transforms>
          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
        </ds:Transforms>
        <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
        <ds:DigestValue>${signatureDigest}</ds:DigestValue>
      </ds:Reference>
    </ds:SignedInfo>
    <ds:SignatureValue Id="SignatureValue782163">
      ${signatureValue}
    </ds:SignatureValue>
    <ds:KeyInfo Id="Certificate192847">
      <ds:X509Data>
        <ds:X509Certificate>
          ${base64Certificate ? base64Certificate.replace(/(.{76})/g, '$1\n          ') : certSnippet}
        </ds:X509Certificate>
      </ds:X509Data>
      <ds:KeyValue>
        <ds:RSAKeyValue>
          <ds:Modulus>AM7s5Xp3Zl9y6M...DEVOLUTION_INK_SECURE_KEY</ds:Modulus>
          <ds:Exponent>AQAB</ds:Exponent>
        </ds:RSAKeyValue>
      </ds:KeyValue>
    </ds:KeyInfo>
    <ds:Object Id="Signature782163-Object">
      <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature782163">
        <xades:SignedProperties Id="SignedPropertiesID491823">
          <xades:SignedSignatureProperties>
            <xades:SigningTime>${signingTime}</xades:SigningTime>
            <xades:SigningCertificate>
              <xades:Cert>
                <xades:CertDigest>
                  <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                  <ds:DigestValue>${signatureDigest}</ds:DigestValue>
                </xades:CertDigest>
                <xades:IssuerSerial>
                  <ds:X509IssuerName>CN=AC BANCO CENTRAL DEL ECUADOR,OU=ENTIDAD DE CERTIFICACION DE INFORMACION-ECIBCE,O=BANCO CENTRAL DEL ECUADOR,C=EC</ds:X509IssuerName>
                  <ds:X509SerialNumber>1312019482</ds:X509SerialNumber>
                </xades:IssuerSerial>
              </xades:Cert>
            </xades:SigningCertificate>
            <xades:SignaturePolicyIdentifier>
              <xades:SignaturePolicyId>
                <xades:SigPolicyId>
                  <xades:Identifier>https://www.sri.gob.ec/politica_firma_sri.pdf</xades:Identifier>
                  <xades:Description>Política de firma electrónica del SRI Ecuador</xades:Description>
                </xades:SigPolicyId>
              </xades:SignaturePolicyId>
            </xades:SignaturePolicyIdentifier>
          </xades:SignedSignatureProperties>
          <xades:SignedDataObjectProperties>
            <xades:DataObjectFormat ObjectReference="#SignedPropertiesID491823">
              <xades:Description>Comprobante Electrónico SRI</xades:Description>
              <xades:MimeType>text/xml</xades:MimeType>
            </xades:DataObjectFormat>
          </xades:SignedDataObjectProperties>
        </xades:SignedProperties>
      </xades:QualifyingProperties>
    </ds:Object>
  </ds:Signature>`;

  // Inyectar antes del cierre de etiqueta principal
  let signedXml = xml;
  const closingTags = ['</factura>', '</notaCredito>', '</notaDebito>', '</comprobanteRetencion>', '</guiaRemision>', '</liquidacionCompra>'];
  let injected = false;

  for (const tag of closingTags) {
    if (signedXml.includes(tag)) {
      signedXml = signedXml.replace(tag, `${xadesSignatureBlock}\n${tag}`);
      injected = true;
      break;
    }
  }

  if (!injected) {
    signedXml = `${xml}\n${xadesSignatureBlock}`;
  }

  return {
    signedXml,
    signatureDigest,
    signingTime,
  };
}

/**
 * Algoritmo Módulo 11 para cálculo del dígito verificador de la Clave de Acceso SRI (49 dígitos).
 */
export function calculateSriModulo11(key48: string): number {
  const digits = key48.replace(/\D/g, '');
  if (digits.length !== 48) return 0;

  const weights = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  let weightIdx = 0;

  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i], 10) * weights[weightIdx];
    weightIdx = (weightIdx + 1) % weights.length;
  }

  const remainder = sum % 11;
  const checkDigit = 11 - remainder;

  if (checkDigit === 11) return 0;
  if (checkDigit === 10) return 1;
  return checkDigit;
}

/**
 * Genera la Clave de Acceso oficial de 49 dígitos para comprobantes electrónicos SRI Ecuador.
 */
export function generateSriClaveAcceso(params: {
  fechaEmision: Date | string; // DDMMYYYY o Date
  tipoComprobante: '01' | '04' | '05' | '06' | '07'; // 01=Factura, 04=Nota Crédito, etc.
  ruc: string;
  ambiente: '1' | '2'; // 1=Pruebas, 2=Producción
  serie: string; // 6 dígitos (estab + ptoEmi, ej '001001')
  secuencial: string | number; // 9 dígitos
  codigoNumerico?: string; // 8 dígitos aleatorios
  tipoEmision?: '1'; // 1=Normal
}): string {
  let fechaStr = '';
  if (params.fechaEmision instanceof Date) {
    const d = String(params.fechaEmision.getDate()).padStart(2, '0');
    const m = String(params.fechaEmision.getMonth() + 1).padStart(2, '0');
    const y = String(params.fechaEmision.getFullYear());
    fechaStr = `${d}${m}${y}`;
  } else {
    // Si viene en formato YYYY-MM-DD
    const parts = params.fechaEmision.split('-');
    if (parts.length === 3) {
      fechaStr = `${parts[2].substring(0, 2)}${parts[1]}${parts[0]}`;
    } else {
      fechaStr = params.fechaEmision.replace(/\D/g, '').substring(0, 8);
    }
  }

  const tipoComp = params.tipoComprobante.padStart(2, '0');
  const cleanRuc = params.ruc.replace(/\D/g, '').padStart(13, '0').substring(0, 13);
  const amb = params.ambiente === '2' ? '2' : '1';
  const cleanSerie = params.serie.replace(/\D/g, '').padStart(6, '0').substring(0, 6);
  const cleanSec = String(params.secuencial).replace(/\D/g, '').padStart(9, '0').substring(0, 9);
  const codNum = (params.codigoNumerico || '12345678').replace(/\D/g, '').padStart(8, '0').substring(0, 8);
  const tipoEmi = params.tipoEmision || '1';

  const base48 = `${fechaStr}${tipoComp}${cleanRuc}${amb}${cleanSerie}${cleanSec}${codNum}${tipoEmi}`;
  const verificador = calculateSriModulo11(base48);

  return `${base48}${verificador}`;
}

