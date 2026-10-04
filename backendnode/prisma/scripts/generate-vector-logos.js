const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Definição de logotipos vetoriais corporativos reais para cada startup
const BRANDS = {
  neuralforge: {
    name: 'NEURAL FORGE',
    tagline: 'AI &amp; DEEP LEARNING',
    bg1: '#0f172a', bg2: '#1e3a8a', accent: '#3b82f6', text: '#ffffff',
    svgIcon: `<g stroke="#60a5fa" stroke-width="4" fill="none" stroke-linecap="round">
      <circle cx="200" cy="140" r="16" fill="#3b82f6"/>
      <circle cx="140" cy="220" r="14" fill="#60a5fa"/>
      <circle cx="260" cy="220" r="14" fill="#60a5fa"/>
      <circle cx="170" cy="280" r="12" fill="#93c5fd"/>
      <circle cx="230" cy="280" r="12" fill="#93c5fd"/>
      <line x1="200" y1="140" x2="140" y2="220"/>
      <line x1="200" y1="140" x2="260" y2="220"/>
      <line x1="140" y1="220" x2="170" y2="280"/>
      <line x1="260" y1="220" x2="230" y2="280"/>
      <line x1="140" y1="220" x2="260" y2="220"/>
      <line x1="170" y1="280" x2="230" y2="280"/>
    </g>`
  },
  payswift: {
    name: 'PAY SWIFT',
    tagline: 'PAYMENTS &amp; PIX',
    bg1: '#1e1b4b', bg2: '#4c1d95', accent: '#a855f7', text: '#ffffff',
    svgIcon: `<g>
      <rect x="140" y="140" width="120" height="120" rx="24" fill="url(#gradAccent)" transform="rotate(45 200 200)"/>
      <path d="M195 130 L160 205 L195 205 L180 270 L235 185 L195 185 Z" fill="#ffffff"/>
    </g>`
  },
  medicoreflex: {
    name: 'MEDICO REFLEX',
    tagline: 'HEALTHCARE &amp; TELEMEDICINE',
    bg1: '#042f2e', bg2: '#0f766e', accent: '#14b8a6', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#2dd4bf" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="200" cy="180" r="50" stroke="#14b8a6" stroke-width="10"/>
      <path d="M165 180 L185 180 L195 160 L205 205 L215 175 L225 180 L235 180"/>
    </g>`
  },
  edusphere: {
    name: 'EDU SPHERE',
    tagline: 'DIGITAL ACADEMY',
    bg1: '#172554', bg2: '#1d4ed8', accent: '#3b82f6', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#60a5fa" stroke-width="6">
      <path d="M200 130 L270 165 L200 200 L130 165 Z" fill="#2563eb" stroke="#93c5fd" stroke-width="4"/>
      <path d="M150 180 L150 220 C150 240, 250 240, 250 220 L250 180" stroke="#60a5fa" stroke-width="6"/>
      <line x1="270" y1="165" x2="270" y2="215" stroke="#fbbf24" stroke-width="6"/>
    </g>`
  },
  biogenix: {
    name: 'BIOGENIX',
    tagline: 'BIOTECHNOLOGY R&amp;D',
    bg1: '#022c22', bg2: '#047857', accent: '#10b981', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#34d399" stroke-width="6" stroke-linecap="round">
      <path d="M160 130 C240 170, 160 210, 240 250"/>
      <path d="M240 130 C160 170, 240 210, 160 250"/>
      <line x1="175" y1="150" x2="225" y2="150" stroke="#a7f3d0" stroke-width="4"/>
      <line x1="165" y1="190" x2="235" y2="190" stroke="#a7f3d0" stroke-width="4"/>
      <line x1="175" y1="230" x2="225" y2="230" stroke="#a7f3d0" stroke-width="4"/>
    </g>`
  },
  cloudpilot: {
    name: 'CLOUD PILOT',
    tagline: 'DEVOPS &amp; CLOUD',
    bg1: '#082f49', bg2: '#0369a1', accent: '#0284c7', text: '#ffffff',
    svgIcon: `<g fill="#38bdf8">
      <path d="M160 220 C140 220 130 200 140 180 C145 160 170 150 185 160 C195 140 230 140 240 160 C255 160 270 175 265 195 C275 210 260 220 250 220 Z"/>
      <polygon points="200,165 215,200 185,200" fill="#ffffff"/>
    </g>`
  },
  tokenvault: {
    name: 'TOKEN VAULT',
    tagline: 'ASSET TOKENIZATION',
    bg1: '#451a03', bg2: '#b45309', accent: '#f59e0b', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#fbbf24" stroke-width="6">
      <polygon points="200,130 255,160 255,220 200,250 145,220 145,160" fill="#78350f" stroke="#f59e0b" stroke-width="6"/>
      <circle cx="200" cy="190" r="22" fill="#d97706" stroke="#fef08a" stroke-width="4"/>
      <path d="M200 178 L200 202 M190 185 L210 185" stroke="#ffffff" stroke-width="4"/>
    </g>`
  },
  greenfleet: {
    name: 'GREEN FLEET',
    tagline: 'EV LOGISTICS',
    bg1: '#052e16', bg2: '#15803d', accent: '#22c55e', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#4ade80" stroke-width="6" stroke-linecap="round">
      <rect x="140" y="160" width="80" height="50" rx="6" fill="#166534"/>
      <path d="M220 175 L250 175 L260 195 L260 210 L220 210 Z" fill="#15803d"/>
      <circle cx="165" cy="215" r="14" fill="#052e16" stroke="#4ade80" stroke-width="4"/>
      <circle cx="235" cy="215" r="14" fill="#052e16" stroke="#4ade80" stroke-width="4"/>
      <path d="M190 140 L175 165 L195 165 L180 190" stroke="#facc15" stroke-width="5" fill="none"/>
    </g>`
  },
  aurorasaas: {
    name: 'AURORA SAAS',
    tagline: 'ENTERPRISE SAAS',
    bg1: '#3b0764', bg2: '#7e22ce', accent: '#a855f7', text: '#ffffff',
    svgIcon: `<g fill="none" stroke-linecap="round">
      <path d="M140 220 C170 150 200 240 230 160 C245 190 260 170 270 150" stroke="#c084fc" stroke-width="8"/>
      <path d="M140 240 C170 170 200 260 230 180 C245 210 260 190 270 170" stroke="#e9d5ff" stroke-width="4"/>
    </g>`
  },
  brainpath: {
    name: 'BRAIN PATH',
    tagline: 'NEUROSCIENCE &amp; AI',
    bg1: '#1e1b4b', bg2: '#3730a3', accent: '#6366f1', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#818cf8" stroke-width="5" stroke-linecap="round">
      <path d="M200 135 C170 135 145 155 145 185 C145 210 165 225 180 235 L220 235 C235 225 255 210 255 185 C255 155 230 135 200 135 Z" fill="#312e81"/>
      <line x1="180" y1="245" x2="220" y2="245" stroke="#a5b4fc" stroke-width="6"/>
      <circle cx="200" cy="180" r="10" fill="#a5b4fc"/>
    </g>`
  },
  clinilink: {
    name: 'CLINI LINK',
    tagline: 'CLINICAL MANAGEMENT',
    bg1: '#134e4a', bg2: '#0f766e', accent: '#14b8a6', text: '#ffffff',
    svgIcon: `<g fill="#2dd4bf">
      <rect x="185" y="135" width="30" height="90" rx="6"/>
      <rect x="155" y="165" width="90" height="30" rx="6"/>
      <circle cx="200" cy="180" r="55" fill="none" stroke="#99f6e4" stroke-width="6"/>
    </g>`
  },
  learnflow: {
    name: 'LEARN FLOW',
    tagline: 'ADAPTIVE EAD',
    bg1: '#431407', bg2: '#c2410c', accent: '#f97316', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#fb923c" stroke-width="7" stroke-linecap="round">
      <path d="M140 180 C140 150 170 150 200 180 C230 210 260 210 260 180 C260 150 230 150 200 180 C170 210 140 210 140 180 Z" fill="#7c2d12"/>
    </g>`
  },
  agroseed: {
    name: 'AGRO SEED',
    tagline: 'SUSTAINABLE AGROTECH',
    bg1: '#064e3b', bg2: '#047857', accent: '#10b981', text: '#ffffff',
    svgIcon: `<g fill="none" stroke-linecap="round">
      <path d="M200 240 C200 170 140 140 140 140 C140 140 210 140 200 240 Z" fill="#10b981" stroke="#6ee7b7" stroke-width="4"/>
      <path d="M200 240 C200 180 250 160 250 160 C250 160 200 160 200 240 Z" fill="#059669" stroke="#a7f3d0" stroke-width="4"/>
      <line x1="200" y1="240" x2="200" y2="260" stroke="#a7f3d0" stroke-width="6"/>
    </g>`
  },
  retailops: {
    name: 'RETAIL OPS',
    tagline: 'SMART RETAIL POS',
    bg1: '#701a75', bg2: '#a21caf', accent: '#e879f9', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#f0abfc" stroke-width="6" stroke-linecap="round">
      <rect x="150" y="160" width="100" height="90" rx="10" fill="#86198f"/>
      <path d="M170 160 C170 135 230 135 230 160"/>
      <circle cx="200" cy="205" r="12" fill="#f0abfc"/>
    </g>`
  },
  pixglobal: {
    name: 'PIX GLOBAL',
    tagline: 'CROSS-BORDER PAYMENTS',
    bg1: '#115e59', bg2: '#0f766e', accent: '#2dd4bf', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#99f6e4" stroke-width="6">
      <circle cx="200" cy="180" r="45" fill="#134e4a"/>
      <ellipse cx="200" cy="180" rx="45" ry="18"/>
      <line x1="200" y1="135" x2="200" y2="225"/>
    </g>`
  },
  datavision: {
    name: 'DATA VISION',
    tagline: 'AI BUSINESS INTELLIGENCE',
    bg1: '#1e3a8a', bg2: '#1d4ed8', accent: '#60a5fa', text: '#ffffff',
    svgIcon: `<g fill="#3b82f6">
      <rect x="150" y="200" width="20" height="40" rx="4"/>
      <rect x="180" y="170" width="20" height="70" rx="4"/>
      <rect x="210" y="140" width="20" height="100" rx="4"/>
      <rect x="240" y="180" width="20" height="60" rx="4"/>
      <path d="M145 190 L180 155 L210 130 L255 165" fill="none" stroke="#93c5fd" stroke-width="6" stroke-linecap="round"/>
    </g>`
  },
  safehome: {
    name: 'SAFE HOME',
    tagline: 'PROPTECH &amp; SMART IoT',
    bg1: '#0c4a6e', bg2: '#0369a1', accent: '#38bdf8', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#7dd3fc" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M145 185 L200 140 L255 185 L255 235 L145 235 Z" fill="#075985"/>
      <circle cx="200" cy="195" r="12" fill="#38bdf8"/>
    </g>`
  },
  logixchain: {
    name: 'LOGIX CHAIN',
    tagline: 'SUPPLY CHAIN BLOCKCHAIN',
    bg1: '#1e293b', bg2: '#334155', accent: '#94a3b8', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#cbd5e1" stroke-width="6">
      <rect x="145" y="150" width="50" height="60" rx="8" fill="#475569"/>
      <rect x="205" y="170" width="50" height="60" rx="8" fill="#475569"/>
      <line x1="175" y1="180" x2="225" y2="200" stroke="#38bdf8" stroke-width="6"/>
    </g>`
  },
  vibedeck: {
    name: 'VIBE DECK',
    tagline: 'CREATOR PITCH BUILDER',
    bg1: '#881337', bg2: '#be123c', accent: '#fb7185', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#fda4af" stroke-width="5">
      <rect x="140" y="140" width="90" height="65" rx="8" fill="#9f1239"/>
      <rect x="170" y="165" width="90" height="65" rx="8" fill="#e11d48" stroke="#fecdd3" stroke-width="4"/>
    </g>`
  },
  nestopay: {
    name: 'NESTO PAY',
    tagline: 'DIGITAL BANKING',
    bg1: '#312e81', bg2: '#4338ca', accent: '#818cf8', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#c7d2fe" stroke-width="6">
      <rect x="140" y="150" width="120" height="80" rx="12" fill="#3730a3"/>
      <line x1="140" y1="175" x2="260" y2="175" stroke="#818cf8" stroke-width="8"/>
      <rect x="160" y="195" width="25" height="18" rx="3" fill="#fbbf24"/>
    </g>`
  },
  techinnovate: {
    name: 'TECH INNOVATE',
    tagline: 'ENTERPRISE AGENTIC AI',
    bg1: '#0f172a', bg2: '#1e40af', accent: '#3b82f6', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#60a5fa" stroke-width="6">
      <rect x="150" y="150" width="100" height="100" rx="16" fill="#1e3a8a"/>
      <circle cx="200" cy="200" r="20" fill="#60a5fa"/>
      <line x1="200" y1="130" x2="200" y2="150" stroke="#93c5fd" stroke-width="6"/>
      <line x1="200" y1="250" x2="200" y2="270" stroke="#93c5fd" stroke-width="6"/>
      <line x1="130" y1="200" x2="150" y2="200" stroke="#93c5fd" stroke-width="6"/>
      <line x1="250" y1="200" x2="270" y2="200" stroke="#93c5fd" stroke-width="6"/>
    </g>`
  },
  greenenergy: {
    name: 'GREEN ENERGY',
    tagline: 'SOLAR &amp; CLEAN POWER',
    bg1: '#14532d', bg2: '#15803d', accent: '#84cc16', text: '#ffffff',
    svgIcon: `<g fill="none" stroke="#a3e635" stroke-width="5">
      <circle cx="200" cy="180" r="30" fill="#65a30d" stroke="#facc15" stroke-width="6"/>
      <path d="M200 120 L200 135 M200 225 L200 240 M140 180 L155 180 M245 180 L260 180 M158 138 L168 148 M232 212 L242 222 M158 222 L168 212 M232 148 L242 138" stroke="#facc15" stroke-width="5" stroke-linecap="round"/>
    </g>`
  },
  fintechpro: {
    name: 'FINTECH PRO',
    tagline: 'WEALTH MANAGEMENT',
    bg1: '#064e3b', bg2: '#047857', accent: '#34d399', text: '#ffffff',
    svgIcon: `<g stroke="#6ee7b7" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M140 230 L180 185 L210 205 L260 135" fill="none"/>
      <polygon points="260,135 240,140 255,155" fill="#34d399"/>
      <circle cx="140" cy="230" r="6" fill="#a7f3d0"/>
      <circle cx="180" cy="185" r="6" fill="#a7f3d0"/>
      <circle cx="210" cy="205" r="6" fill="#a7f3d0"/>
      <circle cx="260" cy="135" r="6" fill="#a7f3d0"/>
    </g>`
  }
};

function generateSvgLogo(brand) {
  return `<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${brand.bg1}"/>
        <stop offset="100%" stop-color="${brand.bg2}"/>
      </linearGradient>
      <linearGradient id="gradAccent" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${brand.accent}"/>
        <stop offset="100%" stop-color="${brand.bg2}"/>
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000000" flood-opacity="0.4"/>
      </filter>
    </defs>

    <!-- Fundo de logotipo de alta qualidade -->
    <rect width="400" height="400" rx="32" fill="url(#bgGrad)"/>
    <circle cx="200" cy="200" r="180" fill="none" stroke="${brand.accent}" stroke-width="2" opacity="0.15"/>

    <!-- Ícone Vetorial Central -->
    <g filter="url(#shadow)">
      ${brand.svgIcon}
    </g>

    <!-- Nome da Startup em Tipografia Corporativa -->
    <text x="200" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="800" fill="${brand.text}" letter-spacing="3" text-anchor="middle">
      ${brand.name}
    </text>

    <!-- Subtítulo / Tagline da Categoria -->
    <rect x="100" y="342" width="200" height="22" rx="11" fill="${brand.accent}" opacity="0.25"/>
    <text x="200" y="357" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="10" font-weight="700" fill="${brand.accent}" letter-spacing="2" text-anchor="middle">
      ${brand.tagline}
    </text>
  </svg>`;
}

async function main() {
  const baseDir = path.join(process.cwd(), 'uploads', 'startups');
  console.log('🎨 Renderizando Logotipos Vetoriais Corporativos de Alta Resolução via SVG/Sharp...');

  for (const [slug, brand] of Object.entries(BRANDS)) {
    const dir = path.join(baseDir, slug);
    fs.mkdirSync(dir, { recursive: true });

    const svg = generateSvgLogo(brand);
    const svgPath = path.join(dir, `${slug}_logo.svg`);
    const logoSlugFile = path.join(dir, `${slug}_logo.jpg`);
    const logoFile = path.join(dir, 'logo.jpg');

    fs.writeFileSync(svgPath, svg, 'utf-8');

    // Converte o SVG Vetorial para JPEG de alta definição (95% qualidade)
    const jpgBuffer = await sharp(Buffer.from(svg))
      .jpeg({ quality: 95 })
      .toBuffer();

    fs.writeFileSync(logoSlugFile, jpgBuffer);
    fs.writeFileSync(logoFile, jpgBuffer);

    console.log(`  ✓ ${slug}/ -> ${slug}_logo.jpg & logo.jpg (Logotipo Vetorial Limpo)`);
  }

  console.log('\n✅ Todos os 23 logotipos vetoriais foram renderizados e salvos com sucesso!');
}

main().catch(console.error);
