import type { ArcanaClassId } from './types';

/**
 * High-definition Anime Cel-Shaded Vector SVG Portraits
 * Styled after the Twin Avatars / Elemental Masters animated aesthetic:
 * - Expressive large anime eyes with glowing spiritual energy (Avatar State)
 * - Stylized hair (swept fringe, twin braids, wild wind-blown locks)
 * - Vibrant color palettes: Coral, Turquoise, Saffron, Indigo, Emerald
 * - Surrounding dynamic elemental VFX: Swirling water ribbons, roaring fire vortex,
 *   whistling air cyclones, and floating iridescent crystals!
 */

function buildWaterTwinSvg(): string {
  // Nerys Maré-Lua: The Water Twin (matching Reference Images 1 & 2 & 3)
  // Dark violet-purple hair, ponytail with flower jewel, glowing cyan eyes, yellow cape collar, coral tunic, swirling 3D water ribbons & floating ice crystals.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
    <defs>
      <linearGradient id="w-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#071b2f"/>
        <stop offset="50%" stop-color="#0f3d59"/>
        <stop offset="100%" stop-color="#1b7a82"/>
      </linearGradient>
      <linearGradient id="w-water" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="25%" stop-color="#7fe3ff"/>
        <stop offset="70%" stop-color="#00a6fb"/>
        <stop offset="100%" stop-color="#006494"/>
      </linearGradient>
      <linearGradient id="w-skin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c99572"/>
        <stop offset="100%" stop-color="#9d6b49"/>
      </linearGradient>
      <linearGradient id="w-hair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4a3b69"/>
        <stop offset="60%" stop-color="#2d2244"/>
        <stop offset="100%" stop-color="#1a1329"/>
      </linearGradient>
      <linearGradient id="w-cape" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f4e04d"/>
        <stop offset="70%" stop-color="#e0b824"/>
        <stop offset="100%" stop-color="#b88f12"/>
      </linearGradient>
      <linearGradient id="w-tunic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f89269"/>
        <stop offset="100%" stop-color="#d65a31"/>
      </linearGradient>
      <filter id="glow-water" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <!-- Background Sky with subtle Aurora -->
    <rect width="256" height="256" fill="url(#w-bg)"/>
    <path d="M0,40 Q70,90 140,30 T256,60 L256,0 L0,0 Z" fill="#00f5d4" opacity="0.2" filter="blur(8px)"/>
    
    <!-- Background Water Swirl -->
    <path d="M10,210 C40,140 30,70 100,50 C180,30 230,80 220,160 C210,220 160,240 120,240" fill="none" stroke="url(#w-water)" stroke-width="14" stroke-linecap="round" opacity="0.45" filter="url(#glow-water)"/>
    <path d="M20,205 C50,135 40,75 105,55 C175,35 220,85 212,155" fill="none" stroke="#e0fbfc" stroke-width="4" stroke-linecap="round" opacity="0.8"/>

    <!-- Floating Ice/Rock Shards -->
    <polygon points="40,90 52,82 48,102 36,98" fill="#a0e9ff" opacity="0.85"/>
    <polygon points="215,75 228,85 220,100 208,90" fill="#a0e9ff" opacity="0.85"/>
    <polygon points="25,145 35,140 32,155 20,150" fill="#786c5e" opacity="0.9"/>
    
    <!-- Hair Back -->
    <path d="M75,100 C60,140 65,190 90,210 C100,190 95,160 90,135 Z" fill="url(#w-hair)"/>
    <path d="M181,100 C196,140 191,190 166,210 C156,190 161,160 166,135 Z" fill="url(#w-hair)"/>

    <!-- Tunic & Cape -->
    <path d="M80,256 L95,205 L161,205 L176,256 Z" fill="url(#w-tunic)"/>
    <!-- Yellow Capelet -->
    <path d="M60,256 C60,210 90,185 128,185 C166,185 196,210 196,256 C165,245 128,248 60,256 Z" fill="url(#w-cape)"/>
    <!-- Cape Brooch -->
    <circle cx="128" cy="198" r="9" fill="#00f5d4" stroke="#ffffff" stroke-width="2"/>
    <polygon points="128,191 133,198 128,205 123,198" fill="#ffffff"/>

    <!-- Neck -->
    <path d="M114,165 L114,190 C114,195 142,195 142,190 L142,165 Z" fill="url(#w-skin)"/>
    <path d="M114,178 C124,185 132,185 142,178 L142,190 L114,190 Z" fill="#87583a" opacity="0.3"/>

    <!-- Face Base -->
    <path d="M85,115 C85,160 105,188 128,188 C151,188 171,160 171,115 C171,85 151,75 128,75 C105,75 85,85 85,115 Z" fill="url(#w-skin)"/>
    <!-- Face Shadow (Cheek blush / shade) -->
    <path d="M86,130 C90,165 110,185 128,185 C146,185 166,165 170,130 C160,170 135,183 128,183 C121,183 96,170 86,130 Z" fill="#8a5334" opacity="0.4"/>
    <ellipse cx="102" cy="148" rx="8" ry="4" fill="#df6b5c" opacity="0.45"/>
    <ellipse cx="154" cy="148" rx="8" ry="4" fill="#df6b5c" opacity="0.45"/>

    <!-- Ears -->
    <path d="M80,125 C75,120 75,142 85,145 Z" fill="url(#w-skin)"/>
    <path d="M176,125 C181,120 181,142 171,145 Z" fill="url(#w-skin)"/>

    <!-- Anime Glowing Eyes (Avatar State Luminous Pure Cyan/White) -->
    <!-- Left Eye -->
    <path d="M96,128 C102,122 114,122 120,128" fill="none" stroke="#2a1d17" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="108" cy="135" rx="9" ry="11" fill="#003554"/>
    <ellipse cx="108" cy="135" rx="7.5" ry="9.5" fill="#00bbf9" filter="url(#glow-water)"/>
    <ellipse cx="108" cy="135" rx="5" ry="7" fill="#80ffdb"/>
    <ellipse cx="108" cy="135" rx="3" ry="4.5" fill="#ffffff"/>
    <circle cx="105" cy="131" r="2.5" fill="#ffffff"/>
    <!-- Right Eye -->
    <path d="M136,128 C142,122 154,122 160,128" fill="none" stroke="#2a1d17" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="148" cy="135" rx="9" ry="11" fill="#003554"/>
    <ellipse cx="148" cy="135" rx="7.5" ry="9.5" fill="#00bbf9" filter="url(#glow-water)"/>
    <ellipse cx="148" cy="135" rx="5" ry="7" fill="#80ffdb"/>
    <ellipse cx="148" cy="135" rx="3" ry="4.5" fill="#ffffff"/>
    <circle cx="145" cy="131" r="2.5" fill="#ffffff"/>

    <!-- Cute Nose & Mouth -->
    <path d="M127,150 L129,153 L126,154" fill="none" stroke="#683d25" stroke-width="2" stroke-linecap="round"/>
    <path d="M122,166 Q128,171 134,166" fill="none" stroke="#683d25" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Hair Bangs & Side Locks (Stylized Anime) -->
    <!-- Headband -->
    <path d="M88,96 Q128,82 168,96" fill="none" stroke="#ffd166" stroke-width="6" stroke-linecap="round"/>
    <path d="M80,85 C95,58 135,55 160,65 C180,75 185,100 178,135 C170,115 168,102 160,100 C150,98 145,108 140,115 C136,105 130,102 125,102 C120,102 115,108 112,118 C108,105 95,100 85,115 C82,125 80,135 78,135 C75,105 76,92 80,85 Z" fill="url(#w-hair)"/>
    <!-- Center Bang Curl -->
    <path d="M125,65 Q128,50 133,48 Q131,60 128,70 Z" fill="url(#w-hair)"/>
    <!-- Left Swept Bang -->
    <path d="M90,95 Q105,122 108,126 Q100,118 95,105 Z" fill="url(#w-hair)"/>
    <!-- Right Swept Bang -->
    <path d="M165,95 Q150,122 148,126 Q155,118 160,105 Z" fill="url(#w-hair)"/>

    <!-- Foreground Swirling Water Ribbon (Matching Image 3) -->
    <path d="M245,210 C210,250 130,255 70,230 C20,205 15,160 35,130 C50,110 75,105 85,120 C95,135 85,160 65,175 C45,190 55,220 95,235 C135,250 200,240 235,195 Z" fill="url(#w-water)" opacity="0.9" filter="url(#glow-water)"/>
    <path d="M235,205 C185,245 125,245 75,225 C45,210 30,180 40,150" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>
    <circle cx="55" cy="120" r="3.5" fill="#e0fbfc"/>
    <circle cx="85" cy="105" r="2.5" fill="#e0fbfc"/>
    <circle cx="215" cy="180" r="4" fill="#e0fbfc"/>

    <!-- Frame Rim -->
    <rect x="2" y="2" width="252" height="252" rx="20" fill="none" stroke="#00f5d4" stroke-width="3.5" opacity="0.85"/>
  </svg>`;
}

function buildFireTwinSvg(): string {
  // Iskra Cinza-Solar: The Fire Twin (matching Reference Images 2 & 3)
  // Dark violet-purple hair in double braids, luminous golden/white glowing eyes, turquoise ribbon, coral dress with saffron cape, dynamic swirling fire vortex & embers.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
    <defs>
      <linearGradient id="f-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2b0a1a"/>
        <stop offset="50%" stop-color="#4f1225"/>
        <stop offset="100%" stop-color="#7a1f28"/>
      </linearGradient>
      <linearGradient id="f-fire" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d00000"/>
        <stop offset="35%" stop-color="#ff5400"/>
        <stop offset="75%" stop-color="#ffb703"/>
        <stop offset="100%" stop-color="#ffffff"/>
      </linearGradient>
      <linearGradient id="f-skin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#cf9472"/>
        <stop offset="100%" stop-color="#a36b4a"/>
      </linearGradient>
      <linearGradient id="f-hair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#473359"/>
        <stop offset="60%" stop-color="#2a1e3b"/>
        <stop offset="100%" stop-color="#191124"/>
      </linearGradient>
      <linearGradient id="f-tunic" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2a9d8f"/>
        <stop offset="100%" stop-color="#1d6f65"/>
      </linearGradient>
      <linearGradient id="f-sash" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f77f00"/>
        <stop offset="100%" stop-color="#d62828"/>
      </linearGradient>
      <filter id="glow-fire" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <!-- Background Sky with Heat Waves -->
    <rect width="256" height="256" fill="url(#f-bg)"/>
    <circle cx="128" cy="110" r="95" fill="#f77f00" opacity="0.15" filter="blur(16px)"/>

    <!-- Background Swirling Flame Spiral (Image 3 style) -->
    <path d="M230,220 C240,150 200,70 140,50 C70,30 20,80 30,160 C40,220 90,250 145,240" fill="none" stroke="url(#f-fire)" stroke-width="14" stroke-linecap="round" opacity="0.45" filter="url(#glow-fire)"/>

    <!-- Floating Fire Embers -->
    <polygon points="35,80 42,72 40,88 32,85" fill="#ffba08" opacity="0.9"/>
    <polygon points="225,85 235,92 228,105 220,95" fill="#ffba08" opacity="0.9"/>
    <circle cx="50" cy="140" r="3" fill="#ffd166"/>
    <circle cx="215" cy="130" r="3.5" fill="#ffd166"/>
    <circle cx="185" cy="55" r="2.5" fill="#ffffff"/>

    <!-- Double Braids in Back -->
    <path d="M70,110 C50,140 45,185 60,220 C70,220 75,190 82,150 Z" fill="url(#f-hair)"/>
    <!-- Braid tie turquoise ribbon -->
    <rect x="52" y="180" width="16" height="6" rx="3" fill="#00f5d4"/>
    <path d="M186,110 C206,140 211,185 196,220 C186,220 181,190 174,150 Z" fill="url(#f-hair)"/>
    <rect x="188" y="180" width="16" height="6" rx="3" fill="#00f5d4"/>

    <!-- Green Tunic & Orange Sash (matching Image 2) -->
    <path d="M80,256 L95,205 L161,205 L176,256 Z" fill="url(#f-tunic)"/>
    <!-- White inner collar -->
    <polygon points="128,185 110,165 146,165" fill="#f8f9fa"/>
    <!-- Orange Sash -->
    <path d="M85,225 Q128,240 171,225 L168,250 Q128,260 88,250 Z" fill="url(#f-sash)"/>

    <!-- Neck -->
    <path d="M114,165 L114,190 C114,195 142,195 142,190 L142,165 Z" fill="url(#f-skin)"/>
    <path d="M114,178 C124,185 132,185 142,178 L142,190 L114,190 Z" fill="#8a5334" opacity="0.3"/>

    <!-- Face Base -->
    <path d="M85,115 C85,160 105,188 128,188 C151,188 171,160 171,115 C171,85 151,75 128,75 C105,75 85,85 85,115 Z" fill="url(#f-skin)"/>
    <!-- Face Shadow -->
    <path d="M86,130 C90,165 110,185 128,185 C146,185 166,165 170,130 C160,170 135,183 128,183 C121,183 96,170 86,130 Z" fill="#8a5334" opacity="0.4"/>
    <ellipse cx="102" cy="148" rx="8" ry="4" fill="#df6b5c" opacity="0.45"/>
    <ellipse cx="154" cy="148" rx="8" ry="4" fill="#df6b5c" opacity="0.45"/>

    <!-- Ears -->
    <path d="M80,125 C75,120 75,142 85,145 Z" fill="url(#f-skin)"/>
    <path d="M176,125 C181,120 181,142 171,145 Z" fill="url(#f-skin)"/>

    <!-- Anime Glowing Eyes (Avatar Fire State Luminous Gold/White) -->
    <!-- Left Eye -->
    <path d="M96,128 C102,122 114,122 120,128" fill="none" stroke="#2a1d17" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="108" cy="135" rx="9" ry="11" fill="#4a1803"/>
    <ellipse cx="108" cy="135" rx="7.5" ry="9.5" fill="#f77f00" filter="url(#glow-fire)"/>
    <ellipse cx="108" cy="135" rx="5" ry="7" fill="#ffd166"/>
    <ellipse cx="108" cy="135" rx="3" ry="4.5" fill="#ffffff"/>
    <circle cx="105" cy="131" r="2.5" fill="#ffffff"/>
    <!-- Right Eye -->
    <path d="M136,128 C142,122 154,122 160,128" fill="none" stroke="#2a1d17" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="148" cy="135" rx="9" ry="11" fill="#4a1803"/>
    <ellipse cx="148" cy="135" rx="7.5" ry="9.5" fill="#f77f00" filter="url(#glow-fire)"/>
    <ellipse cx="148" cy="135" rx="5" ry="7" fill="#ffd166"/>
    <ellipse cx="148" cy="135" rx="3" ry="4.5" fill="#ffffff"/>
    <circle cx="145" cy="131" r="2.5" fill="#ffffff"/>

    <!-- Nose & Confident Smile -->
    <path d="M127,150 L129,153 L126,154" fill="none" stroke="#683d25" stroke-width="2" stroke-linecap="round"/>
    <path d="M121,167 Q128,173 135,167" fill="none" stroke="#683d25" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Hair Bangs & High Ponytail -->
    <path d="M128,52 C120,35 140,25 145,45 Z" fill="url(#f-hair)"/>
    <rect x="122" y="46" width="14" height="6" rx="3" fill="#00f5d4"/>
    <path d="M80,85 C95,58 135,55 160,65 C180,75 185,100 178,135 C170,115 168,102 160,100 C150,98 145,108 140,115 C136,105 130,102 125,102 C120,102 115,108 112,118 C108,105 95,100 85,115 C82,125 80,135 78,135 C75,105 76,92 80,85 Z" fill="url(#f-hair)"/>

    <!-- Foreground Roaring Fire Vortex Ribbon (Image 3 style) -->
    <path d="M10,215 C40,255 125,260 185,235 C235,210 240,165 220,135 C205,115 180,110 170,125 C160,140 170,165 190,180 C210,195 200,225 160,240 C120,255 55,245 20,200 Z" fill="url(#f-fire)" opacity="0.92" filter="url(#glow-fire)"/>
    <path d="M20,205 C70,245 130,245 180,225 C210,210 225,180 215,150" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.85"/>

    <!-- Frame Rim -->
    <rect x="2" y="2" width="252" height="252" rx="20" fill="none" stroke="#ff5400" stroke-width="3.5" opacity="0.85"/>
  </svg>`;
}

function buildWindGuardianSvg(): string {
  // Kael Sopro-Alto: The Wind Master
  // Anime air guardian with soaring gale ribbons, pure white spiritual eyes, celestial tattoos, teal and white monastic attire, and whistling air vortex.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
    <defs>
      <linearGradient id="a-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0a192f"/>
        <stop offset="50%" stop-color="#172a45"/>
        <stop offset="100%" stop-color="#305073"/>
      </linearGradient>
      <linearGradient id="a-wind" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="50%" stop-color="#bbf2f6"/>
        <stop offset="100%" stop-color="#72efdd"/>
      </linearGradient>
      <linearGradient id="a-skin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f0d3b7"/>
        <stop offset="100%" stop-color="#cfab88"/>
      </linearGradient>
      <linearGradient id="a-hair" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#2d3748"/>
        <stop offset="100%" stop-color="#1a202c"/>
      </linearGradient>
      <linearGradient id="a-robe" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#e2e8f0"/>
        <stop offset="70%" stop-color="#cbd5e1"/>
        <stop offset="100%" stop-color="#94a3b8"/>
      </linearGradient>
      <filter id="glow-wind" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <!-- Background Sky with Wind Trails -->
    <rect width="256" height="256" fill="url(#a-bg)"/>
    
    <!-- Background Air Tornado Funnel (Image 3 style) -->
    <path d="M128,40 C190,70 210,120 180,180 C150,240 70,240 40,190 C10,140 50,70 128,40 Z" fill="none" stroke="url(#a-wind)" stroke-width="8" stroke-dasharray="16,8" opacity="0.35" filter="url(#glow-wind)"/>

    <!-- Floating Cloud & Wind Wisps -->
    <path d="M20,100 Q60,80 100,105 Q140,130 180,100" fill="none" stroke="#e0fbfc" stroke-width="2.5" opacity="0.6"/>
    <path d="M70,230 Q130,210 190,235" fill="none" stroke="#e0fbfc" stroke-width="2" opacity="0.5"/>

    <!-- Robe / Monastic Garb -->
    <path d="M75,256 L95,195 L161,195 L181,256 Z" fill="url(#a-robe)"/>
    <!-- Teal Celestial Scarf -->
    <path d="M90,195 Q128,215 166,195 L160,256 Q128,245 96,256 Z" fill="#00b4d8"/>

    <!-- Neck -->
    <path d="M114,160 L114,190 C114,195 142,195 142,190 L142,160 Z" fill="url(#a-skin)"/>

    <!-- Face Base -->
    <path d="M85,110 C85,155 105,182 128,182 C151,182 171,155 171,110 C171,80 151,70 128,70 C105,70 85,80 85,110 Z" fill="url(#a-skin)"/>
    <path d="M86,125 C90,160 110,180 128,180 C146,180 166,160 170,125 C160,165 135,178 128,178 C121,178 96,165 86,125 Z" fill="#9e7b5a" opacity="0.35"/>

    <!-- Celestial Arrow Tattoo (Glowing Cyan/Teal on Forehead) -->
    <polygon points="128,75 135,95 131,95 131,118 125,118 125,95 121,95" fill="#48cae4" opacity="0.9" filter="url(#glow-wind)"/>

    <!-- Glowing White Anime Eyes (Air Spirit State) -->
    <path d="M96,124 C102,118 114,118 120,124" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="108" cy="131" rx="9" ry="10" fill="#0077b6"/>
    <ellipse cx="108" cy="131" rx="7" ry="8" fill="#48cae4" filter="url(#glow-wind)"/>
    <ellipse cx="108" cy="131" rx="4" ry="5" fill="#ffffff"/>
    
    <path d="M136,124 C142,118 154,118 160,124" fill="none" stroke="#1f2937" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="148" cy="131" rx="9" ry="10" fill="#0077b6"/>
    <ellipse cx="148" cy="131" rx="7" ry="8" fill="#48cae4" filter="url(#glow-wind)"/>
    <ellipse cx="148" cy="131" rx="4" ry="5" fill="#ffffff"/>

    <!-- Nose & Serene Expression -->
    <path d="M127,146 L129,149 L126,150" fill="none" stroke="#78563c" stroke-width="2" stroke-linecap="round"/>
    <path d="M122,163 Q128,166 134,163" fill="none" stroke="#78563c" stroke-width="2.5" stroke-linecap="round"/>

    <!-- Wind-Swept Hair -->
    <path d="M78,80 C90,50 140,48 165,60 C182,70 186,95 180,125 C172,105 168,95 158,92 C148,90 140,100 135,108 C130,98 120,95 110,105 C100,95 88,95 82,110 C78,95 76,85 78,80 Z" fill="url(#a-hair)"/>

    <!-- Dynamic Foreground Cyclone Ribbon -->
    <path d="M15,225 C60,265 145,260 200,230 C240,205 245,160 220,130 C190,95 130,110 85,150 C55,180 70,225 128,245 C185,265 240,235 245,190" fill="none" stroke="url(#a-wind)" stroke-width="6" stroke-linecap="round" opacity="0.9" filter="url(#glow-wind)"/>
    <path d="M25,220 C70,255 145,250 195,220" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.9"/>

    <!-- Frame Rim -->
    <rect x="2" y="2" width="252" height="252" rx="20" fill="none" stroke="#80ffdb" stroke-width="3.5" opacity="0.85"/>
  </svg>`;
}

function buildEarthGuardianSvg(): string {
  // Borak Raiz-de-Ferro: The Earth & Crystal Titan (matching Image 1 crystals & earth)
  // Powerful anime earth warrior with glowing emerald/gold eyes, terracotta stone armor, floating iridescent crystal shards (cyan, magenta, gold like Image 1!) and seismic magma veins.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="100%" height="100%">
    <defs>
      <linearGradient id="e-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1f130b"/>
        <stop offset="50%" stop-color="#3d2212"/>
        <stop offset="100%" stop-color="#5a351b"/>
      </linearGradient>
      <linearGradient id="e-crystal-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="40%" stop-color="#00f5d4"/>
        <stop offset="100%" stop-color="#0077b6"/>
      </linearGradient>
      <linearGradient id="e-crystal-mag" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="40%" stop-color="#f72585"/>
        <stop offset="100%" stop-color="#7209b7"/>
      </linearGradient>
      <linearGradient id="e-skin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#c48f65"/>
        <stop offset="100%" stop-color="#94623c"/>
      </linearGradient>
      <linearGradient id="e-armor" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#6c584c"/>
        <stop offset="50%" stop-color="#3f322a"/>
        <stop offset="100%" stop-color="#28201a"/>
      </linearGradient>
      <filter id="glow-earth" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur"/>
        <feComposite in="SourceGraphic" in2="blur" operator="over"/>
      </filter>
    </defs>
    <!-- Background Terracotta & Crystals (matching Image 1) -->
    <rect width="256" height="256" fill="url(#e-bg)"/>
    
    <!-- Floating Levitating Boulders & Iridescent Crystals (Image 1 & 3 style) -->
    <polygon points="25,60 45,45 55,75 30,85" fill="#7f4f24" stroke="#a68a64" stroke-width="1.5"/>
    <polygon points="215,55 240,65 230,95 205,80" fill="#7f4f24" stroke="#a68a64" stroke-width="1.5"/>
    <!-- Floating Cyan Crystal -->
    <polygon points="40,140 55,105 65,145 50,165" fill="url(#e-crystal-cyan)" filter="url(#glow-earth)"/>
    <!-- Floating Magenta Crystal -->
    <polygon points="210,135 225,100 235,140 220,160" fill="url(#e-crystal-mag)" filter="url(#glow-earth)"/>

    <!-- Stone Shoulders & Pauldrons -->
    <path d="M50,256 L80,195 L176,195 L206,256 Z" fill="url(#e-armor)"/>
    <!-- Terracotta Plates -->
    <polygon points="70,225 100,205 128,215 100,245" fill="#a0522d"/>
    <polygon points="186,225 156,205 128,215 156,245" fill="#a0522d"/>
    <!-- Glowing Seismic Magma Veins -->
    <path d="M90,215 L128,225 L166,215" fill="none" stroke="#ffd166" stroke-width="3" filter="url(#glow-earth)"/>

    <!-- Neck -->
    <path d="M110,160 L110,195 C110,200 146,200 146,195 L146,160 Z" fill="url(#e-skin)"/>

    <!-- Face Base (Chiseled, Strong) -->
    <path d="M82,105 C82,155 102,185 128,185 C154,185 174,155 174,105 C174,75 154,65 128,65 C102,65 82,75 82,105 Z" fill="url(#e-skin)"/>
    <path d="M84,125 C88,160 108,182 128,182 C148,182 168,160 172,125 C162,165 135,178 128,178 C121,178 96,165 84,125 Z" fill="#734725" opacity="0.4"/>

    <!-- Glowing Emerald/Gold Anime Eyes (Earth Avatar State) -->
    <path d="M94,122 C100,116 114,116 120,122" fill="none" stroke="#1b120c" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="107" cy="130" rx="9" ry="10" fill="#1b4332"/>
    <ellipse cx="107" cy="130" rx="7.5" ry="8.5" fill="#52b788" filter="url(#glow-earth)"/>
    <ellipse cx="107" cy="130" rx="4.5" ry="5.5" fill="#ffd166"/>
    <ellipse cx="107" cy="130" rx="2.5" ry="3.5" fill="#ffffff"/>

    <path d="M136,122 C142,116 156,116 162,122" fill="none" stroke="#1b120c" stroke-width="3.5" stroke-linecap="round"/>
    <ellipse cx="149" cy="130" rx="9" ry="10" fill="#1b4332"/>
    <ellipse cx="149" cy="130" rx="7.5" ry="8.5" fill="#52b788" filter="url(#glow-earth)"/>
    <ellipse cx="149" cy="130" rx="4.5" ry="5.5" fill="#ffd166"/>
    <ellipse cx="149" cy="130" rx="2.5" ry="3.5" fill="#ffffff"/>

    <!-- Strong Jaw & Nose -->
    <path d="M126,145 L130,149 L125,151" fill="none" stroke="#523219" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M120,165 L136,165" fill="none" stroke="#523219" stroke-width="3" stroke-linecap="round"/>

    <!-- Dark Spiky Hair -->
    <path d="M76,85 C85,50 135,45 165,55 C185,68 188,95 182,125 C172,105 165,92 155,90 C145,88 138,98 132,105 C125,92 115,90 105,100 C95,90 85,92 80,105 C75,95 74,88 76,85 Z" fill="#261c14"/>

    <!-- Levitating Crystal Ring in Foreground (matching Image 1) -->
    <polygon points="128,215 138,190 144,220 134,235" fill="url(#e-crystal-cyan)" filter="url(#glow-earth)"/>
    <polygon points="80,240 95,215 105,245 90,260" fill="url(#e-crystal-mag)" filter="url(#glow-earth)"/>
    <polygon points="175,240 160,215 150,245 165,260" fill="#ffd166" filter="url(#glow-earth)"/>

    <!-- Frame Rim -->
    <rect x="2" y="2" width="252" height="252" rx="20" fill="none" stroke="#ffd166" stroke-width="3.5" opacity="0.85"/>
  </svg>`;
}

export const ANIME_GUARDIAN_SVGS: Record<ArcanaClassId, string> = {
  chess: buildWaterTwinSvg(), // Nerys Maré-Lua (Guardiã da Maré)
  chaos: buildFireTwinSvg(), // Iskra Cinza-Solar (Guardiã da Chama)
  chrono: buildWindGuardianSvg(), // Kael Sopro-Alto (Guardião do Vento)
  rune: buildEarthGuardianSvg(), // Borak Raiz-de-Ferro (Guardião da Pedra)
};

export function getAnimeGuardianSvg(classId: ArcanaClassId): string {
  return ANIME_GUARDIAN_SVGS[classId] ?? ANIME_GUARDIAN_SVGS.chess;
}

export function renderAnimeGuardianBadge(
  classId: ArcanaClassId,
  sizePx = 64,
  borderCol = '#ffd166',
  active = false
): string {
  const svg = getAnimeGuardianSvg(classId);
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  const glow = active
    ? `box-shadow: 0 0 20px ${borderCol}, 0 0 40px ${borderCol}88;`
    : `box-shadow: 0 4px 14px rgba(0,0,0,0.6);`;

  return `<div style="width:${sizePx}px;height:${sizePx}px;min-width:${sizePx}px;min-height:${sizePx}px;aspect-ratio:1/1;border-radius:14px;border:2.5px solid ${borderCol};background-image:url('${dataUrl}');background-size:cover;background-position:center;${glow}flex-shrink:0;transition:transform 0.15s, box-shadow 0.15s;"></div>`;
}
