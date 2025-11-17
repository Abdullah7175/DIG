import * as QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type GenerateQRCardOptions = {
  title?: string;
  issuedDate?: string; // already formatted human-readable string
  expiryDate?: string; // already formatted human-readable string
  logoPathRelative?: string; // relative to project root
  registrationNumber?: string; // printed inside the card footer
};

// Returns a data URL for an SVG image that contains the QR and branding
// Cache logo in memory to avoid repeated file reads
let cachedLogoDataUrl: string | null = null;

function loadLogoDataUrl(logoRelFromRoot: string): string {
  // Return cached logo if available
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  
  const projectRoot = path.join(__dirname, '..', '..');
  
  // Try multiple possible logo locations:
  // 1. Production path (dist/public/logo.png) - most likely in production
  // 2. Development path (client/public/logo.png)
  // 3. Original path provided
  // 4. Root path (logo.png)
  const possiblePaths = [
    path.resolve(projectRoot, 'dist', 'public', 'logo.png'),
    path.resolve(projectRoot, 'client', 'public', 'logo.png'),
    path.resolve(projectRoot, logoRelFromRoot),
    path.resolve(projectRoot, 'logo.png'),
  ];
  
  for (const logoAbs of possiblePaths) {
    try {
      if (fs.existsSync(logoAbs)) {
        const logoBuf = fs.readFileSync(logoAbs);
        const base64 = logoBuf.toString('base64');
        cachedLogoDataUrl = `data:image/png;base64,${base64}`;
        console.log(`Logo loaded from: ${logoAbs}`);
        return cachedLogoDataUrl;
      }
    } catch (error) {
      // Try next path
      continue;
    }
  }
  
  console.warn(`Logo not found in any of these locations: ${possiblePaths.join(', ')}`);
  // Cache empty string to avoid repeated file system checks
  cachedLogoDataUrl = '';
  return '';
}

export async function generateVehicleQRCard(publicUrl: string, opts: GenerateQRCardOptions = {}): Promise<string> {
  const title = opts.title || 'Registered Vehicle CVI-MS';

  // 1) Generate QR (SVG data URL for speed and crisp scaling)
  const qrSvg = await QRCode.toString(publicUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M'
  });
  const qrSvgBase64 = Buffer.from(qrSvg).toString('base64');
  const qrDataUrl = `data:image/svg+xml;base64,${qrSvgBase64}`;

  // 2) Load logo as base64 (PNG preferred)
  // Try dist/public/logo.png first (production), then client/public/logo.png (development)
  const logoRel = opts.logoPathRelative || path.join('dist', 'public', 'logo.png');
  const logoDataUrl = loadLogoDataUrl(logoRel);

  // 3) Compose SVG card: half A4 landscape at ~96dpi ≈ 1123 x 794
  const width = 1123;
  const height = 794;

  // Simple watermark pattern using the logo
  const watermark = logoDataUrl
    ? `<pattern id="wm" x="0" y="0" width="140" height="140" patternUnits="userSpaceOnUse">
         <image href="${logoDataUrl}" x="0" y="0" width="120" height="120" opacity="0.06" />
       </pattern>`
    : '';

  const issuedText = opts.issuedDate ? `Issued Date: ${opts.issuedDate}` : '';
  const expiryText = opts.expiryDate ? `Expiry Date: ${opts.expiryDate}` : '';

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    ${watermark}
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="18" ry="18" fill="#F7F7F7" stroke="#3A3A3A" stroke-width="10"/>
  ${logoDataUrl ? `<rect x="20" y="90" width="660" height="560" fill="url(#wm)"/>` : ''}

  <!-- Header -->
  <rect x="15" y="15" width="${width - 30}" height="90" rx="8" ry="8" fill="#111216"/>
  <text x="${width / 2}" y="75" fill="#FFFFFF" font-family="Segoe UI, Roboto, Arial" font-size="64" font-weight="700" text-anchor="middle">${title}</text>

  <!-- Left logo circle -->
  ${logoDataUrl ? `<circle cx="260" cy="410" r="240" fill="#FFFFFF" stroke="#D0D3D6" stroke-width="4"/>
  <clipPath id="logoClip"><circle cx="260" cy="410" r="230"/></clipPath>
  <image href="${logoDataUrl}" x="30" y="180" width="460" height="460" clip-path="url(#logoClip)"/>` : ''}

  <!-- QR on right -->
  <rect x="600" y="130" width="470" height="470" fill="#FFFFFF" stroke="#111216" stroke-width="16"/>
  <image href="${qrDataUrl}" x="616" y="146" width="438" height="438"/>

  <!-- Footer text moved under QR to avoid overlap with left logo -->
  <g font-family="Segoe UI, Roboto, Arial" font-size="32" font-weight="700" fill="#111216">
    ${issuedText ? `<text x="620" y="650">${issuedText}</text>` : ''}
    ${expiryText ? `<text x="620" y="690">${expiryText}</text>` : ''}
  </g>

  ${opts.registrationNumber ? `<text x="${width / 2}" y="740" text-anchor="middle" font-family="Segoe UI, Roboto, Arial" font-size="36" font-weight="700" fill="#2C3E50">${opts.registrationNumber}</text>` : ''}
</svg>`;

  const base64Svg = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64Svg}`;
}


