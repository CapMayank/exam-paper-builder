/**
 * Curated Registry of Standard Indian School Curriculum (NCERT/CBSE/ICSE) Educational Diagrams.
 * Each entry is crisp, high-contrast, black-and-white print-ready vector/SVG,
 * ensuring clean reproduction on school photocopiers and risographs.
 */

export interface CuratedDiagram {
  id: string;
  title: string;
  subject: "Biology" | "Physics" | "Chemistry" | "Mathematics" | "English" | "Social Science";
  classLevel: string; // e.g. "Class 10", "Class 12"
  chapterKeywords: string[];
  tags: string[];
  description: string;
  source: "NCERT Curated" | "CBSE Official" | "Wikimedia Commons (Public Domain)";
  license: "Public Domain" | "CC-BY-SA 4.0";
  hasUnlabelledCallouts: boolean; // Has A, B, C, D leader lines for identification questions
  spoilerParts?: string[]; // The parts labeled A, B, C, D
  svg: string; // Vector SVG string (640x400 viewBox)
}

export const CURATED_DIAGRAMS: CuratedDiagram[] = [
  // -------------------------------------------------------------------------
  // 1. BIOLOGY: Longitudinal Section of Flower (Sexual Reproduction in Plants)
  // -------------------------------------------------------------------------
  {
    id: "bio_flower_ls_callouts",
    title: "Longitudinal Section (L.S.) of a Flower with Parts (A), (B), (C), (D)",
    subject: "Biology",
    classLevel: "Class 10 / Class 12",
    chapterKeywords: ["flower", "flowering plants", "sexual reproduction in flowering plants", "sexual reproduction in plants", "angiosperm", "pistil", "stamen"],
    tags: ["flower", "petal", "sepal", "stigma", "style", "ovary", "anther", "filament", "carpel"],
    description: "Standard NCERT diagram of a flower cross-section with leader lines pointing to parts (A) Stigma/Carpel, (B) Anther/Stamen, (C) Petal/Corolla, and (D) Ovary.",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: true,
    spoilerParts: ["Stigma", "Anther", "Petal", "Ovary"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Receptacle & Pedicel -->
  <path d="M 320 370 L 320 320 C 310 310 290 300 290 280 C 290 260 350 260 350 280 C 350 300 330 310 320 320 Z" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
  <!-- Sepals (Calyx) -->
  <path d="M 290 270 Q 240 270 230 240 Q 260 250 295 260 Z" fill="#f1f5f9" stroke="#0f172a" stroke-width="2"/>
  <path d="M 350 270 Q 400 270 410 240 Q 380 250 345 260 Z" fill="#f1f5f9" stroke="#0f172a" stroke-width="2"/>
  <!-- Petals (Corolla) -->
  <path d="M 270 260 C 200 240 160 140 210 100 C 240 80 280 130 285 210 Z" fill="none" stroke="#0f172a" stroke-width="2"/>
  <path d="M 370 260 C 440 240 480 140 430 100 C 400 80 360 130 355 210 Z" fill="none" stroke="#0f172a" stroke-width="2"/>
  <path d="M 285 210 C 260 130 300 60 320 60 C 340 60 380 130 355 210 Z" fill="none" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="4,4"/>
  <!-- Pistil / Carpel (Ovary, Style, Stigma) -->
  <ellipse cx="320" cy="245" rx="35" ry="40" fill="#ffffff" stroke="#0f172a" stroke-width="2.5"/>
  <ellipse cx="320" cy="245" rx="14" ry="18" fill="none" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="320" cy="245" r="4" fill="#0f172a"/>
  <path d="M 314 205 L 314 120 Q 314 110 320 110 Q 326 110 326 120 L 326 205 Z" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  <!-- Stigma lobes -->
  <path d="M 308 108 C 308 95 332 95 332 108 Z" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  <!-- Stamens (Filaments and Anthers) Left -->
  <path d="M 280 250 Q 230 210 240 140" fill="none" stroke="#0f172a" stroke-width="1.8"/>
  <path d="M 233 135 C 230 125 245 125 242 135 C 238 145 252 145 248 135 Z" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  <!-- Stamens (Filaments and Anthers) Right -->
  <path d="M 360 250 Q 410 210 400 140" fill="none" stroke="#0f172a" stroke-width="1.8"/>
  <path d="M 393 135 C 390 125 405 125 402 135 C 398 145 412 145 408 135 Z" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  
  <!-- Leader Lines & Callout Labels -->
  <!-- Callout (A) -> Stigma -->
  <line x1="320" y1="100" x2="180" y2="60" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="320" cy="100" r="3" fill="#0f172a"/>
  <rect x="110" y="45" width="65" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="142" y="64" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">(A)</text>
  
  <!-- Callout (B) -> Anther -->
  <line x1="404" y1="135" x2="520" y2="110" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="404" cy="135" r="3" fill="#0f172a"/>
  <rect x="525" y="95" width="65" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="557" y="114" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">(B)</text>
  
  <!-- Callout (C) -> Petal -->
  <line x1="200" y1="160" x2="110" y2="180" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="200" cy="160" r="3" fill="#0f172a"/>
  <rect x="40" y="165" width="65" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="72" y="184" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">(C)</text>
  
  <!-- Callout (D) -> Ovary -->
  <line x1="340" y1="245" x2="480" y2="280" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="340" cy="245" r="3" fill="#0f172a"/>
  <rect x="485" y="265" width="65" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="517" y="284" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">(D)</text>
  
  <!-- Figure Caption -->
  <text x="320" y="388" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#334155">Fig: Longitudinal Section of a Flower (NCERT)</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 2. BIOLOGY: Human Nephron (Structure and Excretion)
  // -------------------------------------------------------------------------
  {
    id: "bio_nephron_structure_callouts",
    title: "Structure of a Nephron with Labeled Parts (A), (B), (C), (D)",
    subject: "Biology",
    classLevel: "Class 10 / Class 11",
    chapterKeywords: ["excretion", "kidney", "nephron", "bowman", "glomerulus", "life processes"],
    tags: ["nephron", "glomerulus", "bowman capsule", "pct", "dct", "henle", "collecting duct"],
    description: "Standard NCERT diagram of nephron showing Bowman's capsule (A), Glomerulus (B), Loop of Henle (C), and Collecting duct (D).",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: true,
    spoilerParts: ["Bowman's Capsule", "Glomerulus", "Henle's Loop", "Collecting Duct"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Bowman's Capsule Cup -->
  <path d="M 180 80 C 130 90 130 160 180 170 L 195 160 C 160 150 160 100 195 90 Z" fill="#f8fafc" stroke="#0f172a" stroke-width="2"/>
  <!-- Glomerulus Knot Inside Cup -->
  <path d="M 130 120 C 145 110 160 130 170 120 C 175 125 155 140 140 135" fill="none" stroke="#dc2626" stroke-width="2.5"/>
  <line x1="100" y1="105" x2="140" y2="120" stroke="#dc2626" stroke-width="2"/>
  <line x1="140" y1="135" x2="100" y2="150" stroke="#dc2626" stroke-width="2"/>
  
  <!-- Proximal Convoluted Tubule (PCT) -->
  <path d="M 195 160 Q 230 180 230 140 Q 230 100 270 110 Q 300 120 300 160 L 300 220" fill="none" stroke="#0f172a" stroke-width="3"/>
  <!-- Loop of Henle (Hairpin Loop) -->
  <path d="M 300 220 L 300 320 C 300 350 340 350 340 320 L 340 200" fill="none" stroke="#0f172a" stroke-width="2.5"/>
  <!-- Distal Convoluted Tubule (DCT) -->
  <path d="M 340 200 Q 360 160 380 180 Q 400 200 420 150 Q 440 120 470 140 L 490 140" fill="none" stroke="#0f172a" stroke-width="3"/>
  <!-- Collecting Duct -->
  <line x1="490" y1="70" x2="490" y2="350" stroke="#0f172a" stroke-width="4"/>
  <!-- Branching ducts into collecting duct -->
  <path d="M 450 90 L 490 100" stroke="#0f172a" stroke-width="2.5"/>
  <path d="M 450 220 L 490 230" stroke="#0f172a" stroke-width="2.5"/>
  <path d="M 450 300 L 490 310" stroke="#0f172a" stroke-width="2.5"/>

  <!-- Leader Lines & Callouts -->
  <!-- Callout (A) -> Bowman's Capsule -->
  <line x1="150" y1="85" x2="80" y2="50" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="150" cy="85" r="3" fill="#0f172a"/>
  <rect x="20" y="35" width="60" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="50" y="54" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">(A)</text>
  
  <!-- Callout (B) -> Glomerulus -->
  <line x1="160" y1="125" x2="80" y2="185" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="160" cy="125" r="3" fill="#0f172a"/>
  <rect x="20" y="170" width="60" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="50" y="189" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">(B)</text>
  
  <!-- Callout (C) -> Loop of Henle -->
  <line x1="320" y1="340" x2="220" y2="340" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="320" cy="340" r="3" fill="#0f172a"/>
  <rect x="155" y="325" width="60" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="185" y="344" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">(C)</text>
  
  <!-- Callout (D) -> Collecting Duct -->
  <line x1="490" y1="200" x2="560" y2="200" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="490" cy="200" r="3" fill="#0f172a"/>
  <rect x="565" y="185" width="60" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="595" y="204" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="#0f172a">(D)</text>

  <text x="320" y="388" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#334155">Fig: Schematic representation of a Nephron</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 3. BIOLOGY: Stomatal Pore (Open and Closed Guard Cells)
  // -------------------------------------------------------------------------
  {
    id: "bio_stomata_open_closed",
    title: "Structure of Open and Closed Stomatal Pore with Guard Cells",
    subject: "Biology",
    classLevel: "Class 10",
    chapterKeywords: ["stomata", "guard cells", "transpiration", "photosynthesis", "life processes"],
    tags: ["stomata", "pore", "chloroplast", "epidermal cells", "turgid", "flaccid"],
    description: "Standard diagram comparing open stomatal pore (turgid guard cells) and closed stomatal pore.",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: true,
    spoilerParts: ["Guard Cell", "Stomatal Pore", "Chloroplast", "Epidermal Cell"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Left Side: OPEN STOMATA -->
  <g transform="translate(160, 180)">
    <!-- Guard cell Left -->
    <path d="M 0 -80 C -60 -50 -60 50 0 80 C -25 50 -25 -50 0 -80 Z" fill="#f0fdf4" stroke="#15803d" stroke-width="2.5"/>
    <!-- Guard cell Right -->
    <path d="M 0 -80 C 60 -50 60 50 0 80 C 25 50 25 -50 0 -80 Z" fill="#f0fdf4" stroke="#15803d" stroke-width="2.5"/>
    <!-- Inner thick wall -->
    <path d="M 0 -70 C -20 -40 -20 40 0 70 C 20 40 20 -40 0 -70" fill="none" stroke="#0f172a" stroke-width="3.5"/>
    <!-- Nucleus & Chloroplasts -->
    <circle cx="-35" cy="0" r="7" fill="#0f172a"/>
    <circle cx="35" cy="0" r="7" fill="#0f172a"/>
    <circle cx="-30" cy="-40" r="3.5" fill="#15803d"/>
    <circle cx="-35" cy="40" r="3.5" fill="#15803d"/>
    <circle cx="30" cy="-40" r="3.5" fill="#15803d"/>
    <circle cx="35" cy="40" r="3.5" fill="#15803d"/>
    <!-- Caption -->
    <text x="0" y="115" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(a) Open Stomatal Pore</text>
  </g>

  <!-- Right Side: CLOSED STOMATA -->
  <g transform="translate(460, 180)">
    <!-- Guard cells touching -->
    <path d="M 0 -80 C -50 -50 -50 50 0 80 C -5 50 -5 -50 0 -80 Z" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
    <path d="M 0 -80 C 50 -50 50 50 0 80 C 5 50 5 -50 0 -80 Z" fill="#f8fafc" stroke="#334155" stroke-width="2.5"/>
    <line x1="0" y1="-80" x2="0" y2="80" stroke="#0f172a" stroke-width="3"/>
    <!-- Nucleus -->
    <circle cx="-25" cy="0" r="6" fill="#0f172a"/>
    <circle cx="25" cy="0" r="6" fill="#0f172a"/>
    <!-- Caption -->
    <text x="0" y="115" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(b) Closed Stomatal Pore</text>
  </g>

  <!-- Callouts -->
  <!-- Callout (A) -> Guard Cell -->
  <line x1="120" y1="180" x2="45" y2="180" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="120" cy="180" r="3" fill="#0f172a"/>
  <rect x="5" y="165" width="40" height="28" rx="4" fill="#ffffff" stroke="#0f172a" stroke-width="1.5"/>
  <text x="25" y="184" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(A)</text>
  
  <!-- Callout (B) -> Stomatal Pore -->
  <line x1="160" y1="180" x2="230" y2="100" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="160" cy="180" r="3" fill="#0f172a"/>
  <rect x="235" y="85" width="40" height="28" rx="4" fill="#ffffff" stroke="#0f172a" stroke-width="1.5"/>
  <text x="255" y="104" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(B)</text>

  <text x="320" y="375" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#334155">Fig: Open and Closed Stomatal Pores with Guard Cells</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 4. PHYSICS: Refraction of Light Through a Triangular Glass Prism
  // -------------------------------------------------------------------------
  {
    id: "phys_glass_prism_refraction",
    title: "Refraction of Light through Triangular Glass Prism with Angle of Deviation",
    subject: "Physics",
    classLevel: "Class 10 / Class 12",
    chapterKeywords: ["prism", "refraction", "human eye", "light", "deviation", "dispersion", "optics"],
    tags: ["incident ray", "refracted ray", "emergent ray", "angle of prism", "angle of deviation"],
    description: "Standard NCERT diagram showing monochromatic ray passing through glass prism with labeled incident, refracted, and emergent rays and angle of deviation (D).",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: true,
    spoilerParts: ["Angle of Deviation", "Emergent Ray", "Angle of Incidence", "Angle of Prism"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Prism Triangle ABC -->
  <polygon points="320,60 160,320 480,320" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5"/>
  <text x="320" y="48" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a">A</text>
  <text x="145" y="335" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a">B</text>
  <text x="495" y="335" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a">C</text>

  <!-- Incident Ray PE -->
  <line x1="70" y1="250" x2="235" y2="198" stroke="#0284c7" stroke-width="2.5"/>
  <polygon points="155,223 145,229 152,220" fill="#0284c7"/>
  <text x="90" y="240" font-family="sans-serif" font-size="13" font-weight="600" fill="#0284c7">Incident ray</text>

  <!-- Refracted Ray EF inside prism -->
  <line x1="235" y1="198" x2="405" y2="198" stroke="#0284c7" stroke-width="2.5"/>
  <polygon points="325,198 315,194 315,202" fill="#0284c7"/>

  <!-- Emergent Ray FS -->
  <line x1="405" y1="198" x2="570" y2="270" stroke="#0284c7" stroke-width="2.5"/>
  <polygon points="490,235 480,229 483,238" fill="#0284c7"/>
  <text x="510" y="275" font-family="sans-serif" font-size="13" font-weight="600" fill="#0284c7">Emergent ray</text>

  <!-- Normal NN' at AB -->
  <line x1="170" y1="110" x2="300" y2="280" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4"/>
  <!-- Normal MM' at AC -->
  <line x1="470" y1="110" x2="340" y2="280" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4"/>

  <!-- Straight extensions showing Angle of Deviation (D) -->
  <line x1="235" y1="198" x2="470" y2="123" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
  <line x1="405" y1="198" x2="330" y2="165" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="3,3"/>
  
  <!-- Deviation Arc (D) -->
  <path d="M 390 148 Q 405 148 400 162" fill="none" stroke="#dc2626" stroke-width="2"/>
  
  <!-- Callout (D) / (A) -> Angle of Deviation -->
  <line x1="400" y1="155" x2="460" y2="60" stroke="#dc2626" stroke-width="1.5"/>
  <circle cx="400" cy="155" r="3" fill="#dc2626"/>
  <rect x="465" y="45" width="75" height="28" rx="4" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
  <text x="502" y="64" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#dc2626">Angle (D)</text>

  <text x="320" y="380" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#334155">Fig: Refraction of light through a triangular glass prism</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 5. PHYSICS: Ray Diagram for Concave Mirror (Real & Inverted Image)
  // -------------------------------------------------------------------------
  {
    id: "phys_concave_mirror_ray_diagram",
    title: "Ray Diagram for Concave Mirror: Object Beyond C (Center of Curvature)",
    subject: "Physics",
    classLevel: "Class 10 / Class 12",
    chapterKeywords: ["light", "reflection", "concave mirror", "focal length", "ray diagram", "optics"],
    tags: ["concave mirror", "principal axis", "focus", "center of curvature", "real image"],
    description: "Standard NCERT ray diagram showing object AB placed beyond C forming real, inverted, diminished image A'B' between C and F.",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Principal Axis -->
  <line x1="40" y1="200" x2="580" y2="200" stroke="#334155" stroke-width="2"/>
  <!-- Concave Mirror Arc -->
  <path d="M 480 80 Q 450 200 480 320" fill="none" stroke="#0f172a" stroke-width="3"/>
  <!-- Silvering hatch marks -->
  <path d="M 482 90 L 492 85 M 478 120 L 488 115 M 473 160 L 483 155 M 472 200 L 482 200 M 473 240 L 483 245 M 478 280 L 488 285 M 482 310 L 492 315" stroke="#94a3b8" stroke-width="1.5"/>

  <!-- Pole P, Focus F, Center C -->
  <circle cx="470" cy="200" r="3" fill="#0f172a"/>
  <text x="470" y="222" font-family="serif" font-size="14" font-weight="bold" text-anchor="middle">P</text>
  
  <circle cx="340" cy="200" r="3" fill="#0f172a"/>
  <text x="340" y="222" font-family="serif" font-size="14" font-weight="bold" text-anchor="middle">F</text>
  
  <circle cx="210" cy="200" r="3" fill="#0f172a"/>
  <text x="210" y="222" font-family="serif" font-size="14" font-weight="bold" text-anchor="middle">C</text>

  <!-- Object AB at x=100 (Beyond C) -->
  <line x1="100" y1="200" x2="100" y2="100" stroke="#0284c7" stroke-width="2.5"/>
  <polygon points="100,95 95,108 105,108" fill="#0284c7"/>
  <text x="90" y="98" font-family="serif" font-size="14" font-weight="bold" fill="#0284c7">A</text>
  <text x="90" y="220" font-family="serif" font-size="14" font-weight="bold" fill="#0284c7">B</text>

  <!-- Ray 1: Parallel to Principal Axis -> Passes through F -->
  <line x1="100" y1="100" x2="470" y2="100" stroke="#dc2626" stroke-width="2"/>
  <polygon points="290,100 280,96 280,104" fill="#dc2626"/>
  <line x1="470" y1="100" x2="250" y2="280" stroke="#dc2626" stroke-width="2"/>
  <polygon points="380,174 374,166 383,164" fill="#dc2626"/>

  <!-- Ray 2: Passing through C -> Reflected along same path -->
  <line x1="100" y1="100" x2="475" y2="280" stroke="#16a34a" stroke-width="2"/>
  <polygon points="160,143 152,141 157,149" fill="#16a34a"/>

  <!-- Inverted Image A'B' between C and F (around x=280, y=200 to y=250) -->
  <line x1="280" y1="200" x2="280" y2="250" stroke="#7c3aed" stroke-width="2.5"/>
  <polygon points="280,255 275,242 285,242" fill="#7c3aed"/>
  <text x="295" y="258" font-family="serif" font-size="14" font-weight="bold" fill="#7c3aed">A'</text>
  <text x="290" y="194" font-family="serif" font-size="14" font-weight="bold" fill="#7c3aed">B'</text>

  <text x="320" y="380" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#334155">Fig: Image formation by a concave mirror when object is beyond C</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 6. CHEMISTRY: Electrolysis of Water (Acidified Water Setup)
  // -------------------------------------------------------------------------
  {
    id: "chem_electrolysis_of_water",
    title: "Experimental Setup for Electrolysis of Water with Cathode (H2) and Anode (O2)",
    subject: "Chemistry",
    classLevel: "Class 10",
    chapterKeywords: ["chemical reactions", "electrolysis", "water", "hydrogen", "oxygen", "decomposition"],
    tags: ["electrolysis", "anode", "cathode", "test tube", "battery", "acidified water"],
    description: "Standard NCERT setup showing plastic mug, carbon electrodes, test tubes with hydrogen and oxygen gas volume ratio (2:1).",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: true,
    spoilerParts: ["Oxygen (Anode)", "Hydrogen (Cathode)", "Graphite Rod", "6V Battery"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Plastic Mug / Beaker -->
  <path d="M 220 120 L 220 280 Q 220 300 240 300 L 400 300 Q 420 300 420 280 L 420 120" fill="#f8fafc" stroke="#0f172a" stroke-width="2.5"/>
  <!-- Water Level -->
  <path d="M 220 160 L 420 160" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="430" y="165" font-family="sans-serif" font-size="11" fill="#0284c7">Water Level</text>

  <!-- Left Inverted Test Tube (Anode - Oxygen 1 vol) -->
  <rect x="260" y="80" width="30" height="180" rx="15" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  <!-- Left Gas Space (Oxygen) -->
  <rect x="261" y="80" width="28" height="40" rx="14" fill="#e0f2fe" stroke="none"/>
  <!-- Left Electrode (Anode) -->
  <rect x="270" y="160" width="10" height="140" fill="#334155"/>

  <!-- Right Inverted Test Tube (Cathode - Hydrogen 2 vol) -->
  <rect x="350" y="80" width="30" height="180" rx="15" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  <!-- Right Gas Space (Hydrogen - twice the volume) -->
  <rect x="351" y="80" width="28" height="80" rx="14" fill="#e0f2fe" stroke="none"/>
  <!-- Right Electrode (Cathode) -->
  <rect x="360" y="190" width="10" height="110" fill="#334155"/>

  <!-- Battery & Circuit Connection -->
  <line x1="275" y1="300" x2="275" y2="350" stroke="#0f172a" stroke-width="2"/>
  <line x1="275" y1="350" x2="305" y2="350" stroke="#0f172a" stroke-width="2"/>
  <!-- Long/short battery plates -->
  <line x1="305" y1="340" x2="305" y2="360" stroke="#0f172a" stroke-width="3"/>
  <line x1="315" y1="345" x2="315" y2="355" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="325" y1="340" x2="325" y2="360" stroke="#0f172a" stroke-width="3"/>
  <line x1="335" y1="345" x2="335" y2="355" stroke="#0f172a" stroke-width="1.5"/>
  <!-- Right wire to Cathode -->
  <line x1="335" y1="350" x2="365" y2="350" stroke="#0f172a" stroke-width="2"/>
  <line x1="365" y1="350" x2="365" y2="300" stroke="#0f172a" stroke-width="2"/>
  <text x="320" y="375" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">6V Battery</text>

  <!-- Callouts -->
  <!-- Callout (A) -> Anode Gas (Oxygen) -->
  <line x1="275" y1="95" x2="160" y2="70" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="275" cy="95" r="3" fill="#0f172a"/>
  <rect x="85" y="55" width="70" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="120" y="74" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">Gas (A)</text>
  
  <!-- Callout (B) -> Cathode Gas (Hydrogen) -->
  <line x1="365" y1="120" x2="480" y2="70" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="365" cy="120" r="3" fill="#0f172a"/>
  <rect x="485" y="55" width="70" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="520" y="74" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">Gas (B)</text>

  <text x="320" y="392" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#334155">Fig: Electrolysis of Water (NCERT)</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 7. BIOLOGY: Plant Cell Structure with Parts (A), (B), (C), (D)
  // -------------------------------------------------------------------------
  {
    id: "bio_plant_cell_callouts",
    title: "Structure of a Plant Cell with Labeled Parts (A), (B), (C), (D)",
    subject: "Biology",
    classLevel: "Class 10 / Class 11 / Class 12",
    chapterKeywords: ["plant cell", "cell structure", "cell wall", "vacuole", "chloroplast", "nucleus", "organelle", "fundamental unit", "fundamental unit of life", "cell the unit of life"],
    tags: ["plant cell", "cell wall", "central vacuole", "chloroplast", "nucleus"],
    description: "Standard NCERT diagram of a plant cell with callouts pointing to (A) Cell Wall, (B) Central Vacuole, (C) Chloroplast, and (D) Nucleus.",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: true,
    spoilerParts: ["Cell Wall", "Central Vacuole", "Chloroplast", "Nucleus"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Cell Outer Wall (Hexagonal / Rounded Rectangular) -->
  <rect x="200" y="90" width="240" height="210" rx="28" fill="#f0fdf4" stroke="#15803d" stroke-width="3.5"/>
  <!-- Middle Lamella / Cell Membrane Inner Boundary -->
  <rect x="210" y="100" width="220" height="190" rx="20" fill="#ffffff" stroke="#16a34a" stroke-width="1.8"/>

  <!-- Large Central Vacuole (B) -->
  <path d="M 270 140 Q 370 130 380 190 Q 390 260 300 250 Q 250 240 270 140 Z" fill="#f8fafc" stroke="#0284c7" stroke-width="2"/>
  <text x="325" y="200" font-family="sans-serif" font-size="11" font-weight="600" fill="#0284c7" text-anchor="middle">Vacuole</text>

  <!-- Nucleus (D) -->
  <circle cx="250" cy="150" r="22" fill="#f1f5f9" stroke="#0f172a" stroke-width="2"/>
  <circle cx="250" cy="150" r="8" fill="#0f172a"/>

  <!-- Chloroplasts (C) -->
  <ellipse cx="370" cy="130" rx="16" ry="10" fill="#dcfce7" stroke="#15803d" stroke-width="1.5"/>
  <line x1="360" y1="130" x2="380" y2="130" stroke="#15803d" stroke-width="1.5"/>
  <ellipse cx="360" cy="265" rx="16" ry="10" fill="#dcfce7" stroke="#15803d" stroke-width="1.5"/>
  <ellipse cx="240" cy="245" rx="16" ry="10" fill="#dcfce7" stroke="#15803d" stroke-width="1.5"/>

  <!-- Mitochondria -->
  <ellipse cx="395" cy="210" rx="14" ry="8" fill="#fef2f2" stroke="#dc2626" stroke-width="1.2"/>

  <!-- Leader Lines & Callouts -->
  <!-- Callout (A) -> Outer Cell Wall -->
  <line x1="200" y1="110" x2="110" y2="90" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="200" cy="110" r="3" fill="#0f172a"/>
  <rect x="45" y="75" width="60" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="75" y="94" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(A)</text>

  <!-- Callout (B) -> Central Vacuole -->
  <line x1="330" y1="180" x2="520" y2="140" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="330" cy="180" r="3" fill="#0f172a"/>
  <rect x="525" y="125" width="60" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="555" y="144" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(B)</text>

  <!-- Callout (C) -> Chloroplast -->
  <line x1="375" y1="130" x2="520" y2="70" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="375" cy="130" r="3" fill="#0f172a"/>
  <rect x="525" y="55" width="60" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="555" y="74" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(C)</text>

  <!-- Callout (D) -> Nucleus -->
  <line x1="250" y1="150" x2="110" y2="200" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="250" cy="150" r="3" fill="#0f172a"/>
  <rect x="45" y="185" width="60" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="75" y="204" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(D)</text>

  <text x="320" y="380" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#334155">Fig: Schematic structure of a Plant Cell</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 8. BIOLOGY: Human Female Reproductive System
  // -------------------------------------------------------------------------
  {
    id: "bio_human_female_reproductive",
    title: "Human Female Reproductive System with Labeled Parts (A), (B), (C), (D)",
    subject: "Biology",
    classLevel: "Class 10 / Class 12",
    chapterKeywords: ["human reproduction", "reproductive health", "human reproductive system", "female reproductive system", "uterus", "ovary", "fallopian", "fertilisation", "gamete"],
    tags: ["ovary", "fallopian tube", "oviduct", "uterus", "cervix", "female reproductive system"],
    description: "Standard NCERT diagram of the female reproductive system with callouts pointing to (A) Ovary, (B) Oviduct (Fallopian Tube), (C) Uterus, and (D) Cervix/Vagina.",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: true,
    spoilerParts: ["Ovary", "Fallopian Tube", "Uterus", "Cervix"],
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Uterus (Inverted Pear Shape) -->
  <path d="M 280 150 C 260 160 250 200 270 240 L 290 280 L 350 280 L 370 240 C 390 200 380 160 360 150 C 340 140 300 140 280 150 Z" fill="#fff1f2" stroke="#e11d48" stroke-width="2.5"/>
  <!-- Endometrial Cavity -->
  <path d="M 295 165 C 285 175 280 200 295 230 L 310 250 L 330 250 L 345 230 C 360 200 355 175 345 165 C 330 155 310 155 295 165 Z" fill="#ffffff" stroke="#e11d48" stroke-width="1.5"/>
  
  <!-- Left Fallopian Tube (Oviduct) -->
  <path d="M 280 150 C 240 130 190 140 160 170 C 150 180 160 200 170 200 C 180 200 185 190 195 180 C 220 160 260 160 280 165" fill="none" stroke="#e11d48" stroke-width="2.5"/>
  <!-- Left Fimbriae -->
  <path d="M 160 170 Q 150 185 155 195 Q 165 200 175 195" fill="none" stroke="#e11d48" stroke-width="2"/>
  <!-- Left Ovary -->
  <ellipse cx="180" cy="220" rx="18" ry="25" fill="#fecdd3" stroke="#e11d48" stroke-width="2"/>

  <!-- Right Fallopian Tube (Oviduct) -->
  <path d="M 360 150 C 400 130 450 140 480 170 C 490 180 480 200 470 200 C 460 200 455 190 445 180 C 420 160 380 160 360 165" fill="none" stroke="#e11d48" stroke-width="2.5"/>
  <!-- Right Fimbriae -->
  <path d="M 480 170 Q 490 185 485 195 Q 475 200 465 195" fill="none" stroke="#e11d48" stroke-width="2"/>
  <!-- Right Ovary -->
  <ellipse cx="460" cy="220" rx="18" ry="25" fill="#fecdd3" stroke="#e11d48" stroke-width="2"/>

  <!-- Cervix & Vagina Canal -->
  <rect x="295" y="280" width="50" height="40" fill="#ffffff" stroke="#e11d48" stroke-width="2"/>
  <line x1="320" y1="280" x2="320" y2="320" stroke="#e11d48" stroke-width="1.5" stroke-dasharray="3,3"/>

  <!-- Leader Lines & Callouts -->
  <!-- Callout (A) -> Ovary (Left) -->
  <line x1="180" y1="220" x2="80" y2="240" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="180" cy="220" r="3" fill="#0f172a"/>
  <rect x="20" y="225" width="55" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="47" y="244" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(A)</text>

  <!-- Callout (B) -> Oviduct / Fallopian Tube -->
  <line x1="440" y1="150" x2="540" y2="120" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="440" cy="150" r="3" fill="#0f172a"/>
  <rect x="545" y="105" width="55" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="572" y="124" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(B)</text>

  <!-- Callout (C) -> Uterus -->
  <line x1="320" y1="190" x2="420" y2="80" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="320" cy="190" r="3" fill="#0f172a"/>
  <rect x="425" y="65" width="55" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="452" y="84" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(C)</text>

  <!-- Callout (D) -> Cervix -->
  <line x1="320" y1="300" x2="440" y2="330" stroke="#0f172a" stroke-width="1.5"/>
  <circle cx="320" cy="300" r="3" fill="#0f172a"/>
  <rect x="445" y="315" width="55" height="28" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5"/>
  <text x="472" y="334" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">(D)</text>

  <text x="320" y="380" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#334155">Fig: Human Female Reproductive System (NCERT)</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 9. BIOLOGY: Monohybrid Cross (Punnett Square)
  // -------------------------------------------------------------------------
  {
    id: "bio_monohybrid_cross_punnett",
    title: "Punnett Square for Mendelian Monohybrid Cross (TT x tt)",
    subject: "Biology",
    classLevel: "Class 10 / Class 12",
    chapterKeywords: ["principles of inheritance", "inheritance", "variation", "genetics", "mendel", "punnett", "monohybrid", "genotypic", "phenotypic", "cross"],
    tags: ["punnett square", "monohybrid cross", "genotypic ratio", "phenotypic ratio", "mendel", "alleles"],
    description: "Standard NCERT Punnett square diagram showing parental gametes T, t and F2 offspring TT, Tt, Tt, tt with 3:1 phenotypic and 1:2:1 genotypic ratios.",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <!-- Title -->
  <text x="320" y="45" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#0f172a">Punnett Square: F2 Generation of Monohybrid Cross</text>
  
  <!-- Parental Details -->
  <text x="320" y="80" font-family="sans-serif" font-size="13" text-anchor="middle" fill="#475569">Parents: Tall (Tt) × Tall (Tt)  |  Gametes: T, t and T, t</text>

  <!-- Gamete Headers -->
  <!-- Top Gametes -->
  <rect x="250" y="110" width="70" height="30" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5" rx="4"/>
  <text x="285" y="130" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#4338ca">T</text>

  <rect x="330" y="110" width="70" height="30" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5" rx="4"/>
  <text x="365" y="130" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#4338ca">t</text>

  <!-- Left Gametes -->
  <rect x="170" y="150" width="70" height="30" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5" rx="4"/>
  <text x="205" y="170" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#4338ca">T</text>

  <rect x="170" y="230" width="70" height="30" fill="#e0e7ff" stroke="#4338ca" stroke-width="1.5" rx="4"/>
  <text x="205" y="250" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#4338ca">t</text>

  <!-- Punnett Grid 2x2 -->
  <!-- Cell 1: TT -->
  <rect x="250" y="150" width="70" height="70" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <text x="285" y="180" font-family="serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#0f172a">TT</text>
  <text x="285" y="202" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#15803d">Tall (Pure)</text>

  <!-- Cell 2: Tt -->
  <rect x="330" y="150" width="70" height="70" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <text x="365" y="180" font-family="serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#0f172a">Tt</text>
  <text x="365" y="202" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#15803d">Tall (Hybrid)</text>

  <!-- Cell 3: Tt -->
  <rect x="250" y="230" width="70" height="70" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <text x="285" y="260" font-family="serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#0f172a">Tt</text>
  <text x="285" y="282" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#15803d">Tall (Hybrid)</text>

  <!-- Cell 4: tt -->
  <rect x="330" y="230" width="70" height="70" fill="#f8fafc" stroke="#334155" stroke-width="2"/>
  <text x="365" y="260" font-family="serif" font-size="17" font-weight="bold" text-anchor="middle" fill="#0f172a">tt</text>
  <text x="365" y="282" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#b91c1c">Dwarf (Pure)</text>

  <!-- Ratio Summary Box -->
  <rect x="110" y="325" width="420" height="40" rx="8" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5"/>
  <text x="320" y="348" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0f172a">
    Phenotypic Ratio: 3 Tall : 1 Dwarf  |  Genotypic Ratio: 1 TT : 2 Tt : 1 tt
  </text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 10. BIOLOGY: Ecological Trophic Energy Pyramid
  // -------------------------------------------------------------------------
  {
    id: "bio_ecological_trophic_pyramid",
    title: "Trophic Pyramid of Energy (Lindeman's 10% Law)",
    subject: "Biology",
    classLevel: "Class 10 / Class 12",
    chapterKeywords: ["ecosystem", "ecology", "pyramid", "trophic", "energy flow", "producers", "consumers", "10% law", "lindeman"],
    tags: ["trophic pyramid", "energy transfer", "ecosystem", "primary producers", "10% law"],
    description: "Standard NCERT pyramid of energy showing 4 trophic levels: primary producers (10,000 J), primary consumers (1,000 J), secondary consumers (100 J), tertiary consumers (10 J).",
    source: "NCERT Curated",
    license: "Public Domain",
    hasUnlabelledCallouts: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff"/>
  <text x="320" y="40" font-family="sans-serif" font-size="15" font-weight="bold" text-anchor="middle" fill="#0f172a">Trophic Pyramid of Energy (Lindeman's 10% Law)</text>

  <!-- Tier 4 (Top): Tertiary Consumers (10 J) -->
  <polygon points="260,80 380,80 410,130 230,130" fill="#fef2f2" stroke="#dc2626" stroke-width="2"/>
  <text x="320" y="105" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#991b1b">Tertiary Consumers (Top Carnivores) — 10 J</text>

  <!-- Tier 3: Secondary Consumers (100 J) -->
  <polygon points="230,130 410,130 450,190 190,190" fill="#fff7ed" stroke="#ea580c" stroke-width="2"/>
  <text x="320" y="165" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#c2410c">Secondary Consumers (Carnivores) — 100 J</text>

  <!-- Tier 2: Primary Consumers (1,000 J) -->
  <polygon points="190,190 450,190 490,260 150,260" fill="#fefce8" stroke="#ca8a04" stroke-width="2"/>
  <text x="320" y="230" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle" fill="#854d0e">Primary Consumers (Herbivores) — 1,000 J</text>

  <!-- Tier 1 (Base): Primary Producers (10,000 J) -->
  <polygon points="150,260 490,260 530,340 110,340" fill="#f0fdf4" stroke="#16a34a" stroke-width="2.5"/>
  <text x="320" y="305" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#15803d">Primary Producers (Phytoplankton / Green Plants) — 10,000 J</text>

  <!-- 10% Transfer Arrow on Right -->
  <line x1="560" y1="330" x2="560" y2="90" stroke="#0284c7" stroke-width="2.5"/>
  <polygon points="560,80 553,95 567,95" fill="#0284c7"/>
  <text x="575" y="210" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0284c7">Only 10%</text>
  <text x="575" y="225" font-family="sans-serif" font-size="10" fill="#0284c7">Transferred</text>

  <text x="320" y="375" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#64748b">90% of energy is lost as metabolic heat at each successive trophic level</text>
</svg>`,
  },

  // -------------------------------------------------------------------------
  // 11. ENGLISH / LANGUAGES: Visual Stimulus for Creative Writing & Article
  // -------------------------------------------------------------------------
  {
    id: "eng_visual_stimulus_environment",
    title: "Visual Stimulus: Save Trees, Conserve Water, Stop Plastic Pollution",
    subject: "English",
    classLevel: "Class 9 / Class 10 / Class 12",
    chapterKeywords: ["writing skills", "picture composition", "visual stimulus", "article writing", "paragraph writing", "composition", "poster", "report writing"],
    tags: ["environment", "save trees", "save water", "pollution", "poster", "visual input", "green planet"],
    description: "Standard NCERT/CBSE visual stimulus infographic showing tree plantation, water conservation, and recycling badges for creative paragraph/article writing.",
    source: "CBSE Official",
    license: "Public Domain",
    hasUnlabelledCallouts: false,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <rect width="640" height="400" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
  <!-- Top Banner -->
  <rect x="20" y="20" width="600" height="45" fill="#f8fafc" stroke="#0f172a" stroke-width="2" rx="6"/>
  <text x="320" y="50" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle" fill="#0f172a" letter-spacing="1">
    PROTECT OUR PLANET · CONSERVE RESOURCES
  </text>

  <!-- Panel 1: Save Trees / Plantation (Left) -->
  <rect x="35" y="85" width="175" height="235" fill="#f0fdf4" stroke="#16a34a" stroke-width="2" rx="8"/>
  <path d="M 122 240 L 122 280 L 112 280 L 112 240 Z" fill="#78350f" stroke="#0f172a" stroke-width="1.5"/>
  <path d="M 117 140 C 70 140 60 210 95 235 C 100 240 135 240 140 235 C 175 210 165 140 117 140 Z" fill="#22c55e" stroke="#15803d" stroke-width="2"/>
  <circle cx="117" cy="180" r="14" fill="#16a34a" opacity="0.3"/>
  <text x="117" y="270" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#14532d">PLANT TREES</text>
  <text x="117" y="295" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#166534">Stop Deforestation</text>

  <!-- Panel 2: Save Water (Center) -->
  <rect x="232" y="85" width="175" height="235" fill="#f0f9ff" stroke="#0284c7" stroke-width="2" rx="8"/>
  <path d="M 320 145 C 320 145 285 190 285 215 C 285 235 300 250 320 250 C 340 250 355 235 355 215 C 355 190 320 145 320 145 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/>
  <ellipse cx="310" cy="225" rx="5" ry="10" fill="#ffffff" opacity="0.6"/>
  <text x="320" y="270" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#0369a1">CONSERVE WATER</text>
  <text x="320" y="295" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#0284c7">Every Drop Counts</text>

  <!-- Panel 3: Reduce Waste / Plastic (Right) -->
  <rect x="430" y="85" width="175" height="235" fill="#fefce8" stroke="#ca8a04" stroke-width="2" rx="8"/>
  <g transform="translate(517, 195) scale(0.9)">
    <path d="M -25 -20 L 0 -45 L 25 -20 L 10 -20 L 10 10 L -10 10 L -10 -20 Z" fill="#eab308" stroke="#854d0e" stroke-width="1.5" transform="rotate(0)"/>
    <path d="M -25 -20 L 0 -45 L 25 -20 L 10 -20 L 10 10 L -10 10 L -10 -20 Z" fill="#eab308" stroke="#854d0e" stroke-width="1.5" transform="rotate(120)"/>
    <path d="M -25 -20 L 0 -45 L 25 -20 L 10 -20 L 10 10 L -10 10 L -10 -20 Z" fill="#eab308" stroke="#854d0e" stroke-width="1.5" transform="rotate(240)"/>
    <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#854d0e" stroke-width="1.5"/>
  </g>
  <text x="517" y="270" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle" fill="#854d0e">NO TO PLASTIC</text>
  <text x="517" y="295" font-family="sans-serif" font-size="11" text-anchor="middle" fill="#a16207">Reduce · Reuse · Recycle</text>

  <!-- Bottom Visual Prompt Banner -->
  <rect x="35" y="335" width="570" height="45" fill="#f8fafc" stroke="#334155" stroke-width="1.5" stroke-dasharray="4,4" rx="4"/>
  <text x="320" y="362" font-family="sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#1e293b">
    Prompt: Taking cues from the visual input above, write a paragraph/article on "Our Environmental Responsibility".
  </text>
</svg>`,
  },
];
