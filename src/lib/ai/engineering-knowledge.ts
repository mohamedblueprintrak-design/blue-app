/**
 * Engineering Knowledge Base for UAE Construction
 * قاعدة المعرفة الهندسية للبناء في الإمارات
 * Real codes, standards, and regulations used by UAE engineers
 */

export const UAE_BUILDING_CODES = {
  // Abu Dhabi International Building Code (based on IBC)
  abuDhabi: {
    code: 'ADIBC-2013',
    name: 'Abu Dhabi International Building Code',
    authority: 'Abu Dhabi Department of Municipalities',
    keyRequirements: {
      STRUCTURAL: {
        windSpeed: '160 km/h basic wind speed (3-sec gust)',
        seismicZone: 'Seismic Design Category A-C depending on location',
        concreteGrade: 'Minimum C25/30 for structural elements',
        steelGrade: 'Grade 460B deformed bars (BS 4449)',
        coverRequirements: {
          interior: '20mm',
          exterior: '40mm (with waterproofing) to 50mm',
          foundations: '50-75mm',
          coastal: '65mm (increased for chloride exposure)',
        },
      },
      ELECTRICAL: {
        voltage: '400V 3-phase / 230V single phase',
        frequency: '50Hz',
        standard: 'IEC / BS 7671 (with AD modifications)',
      },
      MEP: {
        hvacStandard: 'ASHRAE 90.1 with Abu Dhabi amendments',
        fireProtection: 'NFPA codes adopted by Civil Defense',
        waterSupply: 'Abu Dhabi Distribution Company (ADDC) standards',
        drainage: 'Abu Dhabi Sewerage Services Company standards',
      },
    },
  },
  // Dubai Municipality Codes
  DUBAI: {
    code: 'Dubai Building Code 2017',
    name: 'Dubai Municipality Building Code',
    authority: 'Dubai Municipality',
    keyRequirements: {
      STRUCTURAL: {
        windSpeed: '155 km/h basic wind speed',
        seismicZone: 'UBC Zone 2A equivalent',
        concreteGrade: 'Minimum C30/37 for structural columns, C25/30 for slabs',
        fireRating: '2-hour for residential, 3-hour for commercial columns',
      },
      MEP: {
        hvacStandard: 'ASHRAE with Dubai Green Building Regulations',
        dewa: 'DEWA regulations for electrical connections',
        waterSupply: 'DEWA water supply standards',
      },
    },
  },
  // RAK Municipality (most relevant for this app)
  rasAlKhaimah: {
    code: 'RAK Building Code',
    name: 'Ras Al Khaimah Building Code',
    authority: 'RAK Municipality',
    keyRequirements: {
      STRUCTURAL: {
        windSpeed: '145 km/h basic wind speed',
        seismicZone: 'Low to moderate seismicity',
        concreteGrade: 'Minimum C25/30 for structural elements',
        soilBearing: '150 kN/m² default, 200+ kN/m² for spread footings',
      },
      MEP: {
        fewa: 'FEWA regulations for electrical and water connections',
        fireProtection: 'Civil Defense UAE codes (UAE Fire and Life Safety Code)',
      },
    },
  },
};

export const UAE_GOVERNMENT_AUTHORITIES = {
  municipality: {
    nameAr: 'بلدية رأس الخيمة',
    nameEn: 'RAK Municipality',
    SERVICES: ['Building permits', 'Completion certificates', 'Inspections', 'Plot allocation'],
    typicalTimeline: '2-4 weeks for permit review',
    requiredDocuments: [
      'Site plan (مخطط الموقع)',
      'Structural drawings (مخططات إنشائية)',
      'MEP drawings (مخططات ميكانيكية وكهربائية)',
      'Architectural drawings (مخططات معمارية)',
      'Soil report (تقرير التربة)',
      'Civil Defense approval (موافقة الدفاع المدني)',
      'FEWA approval (موافقة الهيئة)',
    ],
  },
  civilDefense: {
    nameAr: 'الدفاع المدني',
    nameEn: 'UAE Civil Defense',
    SERVICES: ['Fire safety review', 'Emergency exits approval', 'Firefighting systems approval'],
    codes: ['UAE Fire and Life Safety Code of Practice', 'NFPA 13, 14, 20, 72, 101'],
    typicalTimeline: '1-3 weeks for review',
  },
  fewa: {
    nameAr: 'هيئة كهرباء ومياه الشارقة / FEWA',
    nameEn: 'Federal Electricity and Water Authority',
    SERVICES: ['Electrical connection permits', 'Water supply approval', 'Sewage connection'],
    typicalTimeline: '1-2 weeks',
  },
  dewa: {
    nameAr: 'هيئة كهرباء ومياه دبي',
    nameEn: 'Dubai Electricity and Water Authority',
    SERVICES: ['Electrical connection', 'Water supply', 'Green building compliance'],
  },
};

export const CONSTRUCTION_COSTS_RAK = {
  // Cost ranges per sqm in AED for RAK market (2024-2025)
  residential: {
    villaStandard: { min: 2200, max: 3200, avg: 2700 },
    villaLuxury: { min: 3500, max: 5500, avg: 4500 },
    apartmentMid: { min: 2500, max: 3800, avg: 3150 },
  },
  COMMERCIAL: {
    officeStandard: { min: 2800, max: 4200, avg: 3500 },
    retailStandard: { min: 3000, max: 5000, avg: 4000 },
  },
  costsBreakdown: {
    STRUCTURAL: { percentage: 35, description: 'Concrete, steel, foundations' },
    ARCHITECTURAL: { percentage: 25, description: 'Finishes, tiles, doors, windows' },
    MEP: { percentage: 25, description: 'HVAC, electrical, plumbing, fire fighting' },
    EXTERNAL: { percentage: 10, description: 'Landscaping, parking, boundary wall' },
    contingency: { percentage: 5, description: 'Contingency and preliminaries' },
  },
  materialPrices: {
    concreteC25: { unit: 'AED/m³', price: 280, range: '260-320' },
    concreteC30: { unit: 'AED/m³', price: 320, range: '300-360' },
    concreteC40: { unit: 'AED/m³', price: 380, range: '350-420' },
    steel460B: { unit: 'AED/ton', price: 3100, range: '2800-3500' },
    blockwork100mm: { unit: 'AED/m²', price: 35, range: '30-45' },
    blockwork200mm: { unit: 'AED/m²', price: 55, range: '45-70' },
    tilesCeramic: { unit: 'AED/m²', price: 45, range: '25-80' },
    tilesPorcelain: { unit: 'AED/m²', price: 80, range: '50-150' },
    doorsInternal: { unit: 'AED/each', price: 800, range: '500-2000' },
    windowsAluminum: { unit: 'AED/m²', price: 350, range: '250-600' },
    paintEmulsion: { unit: 'AED/m²', price: 18, range: '12-30' },
    waterproofing: { unit: 'AED/m²', price: 45, range: '30-80' },
    hvacSplit: { unit: 'AED/ton', price: 2800, range: '2200-4000' },
    hvacCentral: { unit: 'AED/ton', price: 4500, range: '3500-6000' },
    electricalPerPoint: { unit: 'AED/point', price: 150, range: '100-250' },
    plumbingPerPoint: { unit: 'AED/point', price: 200, range: '150-350' },
  },
};

export const ENGINEERING_CALCULATIONS = {
  concrete: {
    slabThickness: {
      rule: 'Span / 30 for simply supported, Span / 35 for continuous',
      minimum: '125mm for residential slabs, 150mm for commercial',
      fireRating: {
        '0.5hr': '20mm cover + 75mm slab',
        '1hr': '20mm cover + 95mm slab',
        '2hr': '25mm cover + 125mm slab',
        '4hr': '25mm cover + 170mm slab',
      },
    },
    column: {
      minimumSize: '200mm x 200mm (recommend 300mm x 300mm minimum)',
      slenderness: 'Effective length / least dimension ≤ 50 (short column), else slender',
    },
    beam: {
      minimumDepth: 'Span / 10 to Span / 20',
      minimumWidth: '200mm or 1/3 to 1/2 of depth',
    },
    foundation: {
      isolatedPad: 'Bearing pressure ≤ allowable soil bearing capacity',
      matRaft: 'When total area of footings > 50% of building footprint',
      pile: 'When soil bearing < 100 kN/m² or high water table',
    },
  },
  steel: {
    rebarWeights: {
      T10: '0.617 kg/m',
      T12: '0.888 kg/m',
      T16: '1.580 kg/m',
      T20: '2.466 kg/m',
      T25: '3.854 kg/m',
      T32: '6.313 kg/m',
    },
    lapLength: '40 × bar diameter (tension), 35 × bar diameter (compression)',
    developmentLength: 'As per ACI 318 or BS 8110',
  },
  loadCalculations: {
    uaeTypicalLoads: {
      residentialFloor: '2.0 kN/m² + 1.5 kN/m² partition allowance',
      officeFloor: '2.5-4.0 kN/m² depending on usage',
      corridor: '4.0-5.0 kN/m²',
      roof: '0.75 kN/m² (maintenance) + 1.0 kN/m² (services)',
      villaRoof: '1.5 kN/m² (accessible) + water tank load',
      staircase: '4.0 kN/m² + 1.0 kN/m² for escape stairs',
    },
    windLoad: {
      method: 'ASCE 7-10 / AS/NZS 1170.2 / Local code',
      importanceFactor: '1.0 for residential, 1.15 for essential facilities',
    },
  },
};

// Topic detection for engineering-specific queries
export const ENGINEERING_TOPIC_PATTERNS = {
  STRUCTURAL: /إنشائي|إنشاء|خرسانة|حديد|أساس|عمود|كمرة|بلاطة|سقف|foundation|column|beam|slab|concrete|steel|rebar|structural/,
  MEP: /ميكانيكي|كهرباء|سباكة|تكييف|HVAC|MEP|electrical|plumbing|mechanical|fire fighting|إطفاء/,
  ARCHITECTURAL: /معماري|تشطيب|بلاط|دهان|أبواب|شبابيك|architectural|finishes|tiles|paint|doors|windows/,
  cost: /تكلفة|سعر|ميزانية|كلفة|cost|price|budget|تقدير|estimate|BOQ|كميات/,
  regulation: /بلدية|دفاع مدني|ترخيص|تصريح|كود|مواصفات|municipality|civil defense|permit|code|regulation|FEWA|DEWA|ADDC/,
  calculation: /حساب|حمل|إجهاد|تصميم|calculation|load|stress|design|dimension|بعد/,
  soil: /تربة|جيولوجيا|حفر|soil|geotechnical|excavation|borehole/,
  SAFETY: /سلامة|أمان|حريق|خطر|safety|fire|hazard|risk|PFD/,
  projectMgmt: /جدول|تخطيط|إدارة مشروع|تأخير|schedule|planning|project management|delay|critical path/,
  contract: /عقد|مقاول|مناقصة|عطاء|contract|tender|bid|contractor|specification/,
};

export function getEngineeringContext(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  let context = '';

  for (const [topic, pattern] of Object.entries(ENGINEERING_TOPIC_PATTERNS)) {
    if (pattern.test(lower)) {
      switch (topic) {
        case 'structural':
          context += `\n\nStructural Engineering Context (UAE):
- Use Abu Dhabi IBC 2013 / Dubai Building Code / RAK Code
- Concrete: C25/30 minimum, C30/37 for columns
- Steel: Grade 460B deformed bars
- Cover: 40mm exterior, 50mm coastal, 75mm foundations
- Slab: Span/30 (simple), Span/35 (continuous), min 125mm residential
- Column: Min 300x300mm recommended, slenderness ratio ≤ 50
- Rebar weights: T16=1.58kg/m, T20=2.47kg/m, T25=3.85kg/m
- Lap length: 40×dia (tension), 35×dia (compression)
- Wind speed: 145-160 km/h depending on emirate
- Seismic: Low-moderate for RAK, higher for Abu Dhabi`;
          break;
        case 'mep':
          context += `\n\nMEP Engineering Context (UAE):
- Voltage: 400V 3-phase, 230V single phase, 50Hz
- HVAC: ASHRAE 90.1 with local amendments, split units 2200-4000 AED/ton
- Fire fighting: NFPA 13,14,20,72,101 adopted by Civil Defense
- Water: FEWA/ADDC/DEWA standards depending on emirate
- Drainage: Local sewerage company standards
- Electrical points: 100-250 AED/point typical`;
          break;
        case 'cost':
          context += `\n\nConstruction Cost Context (RAK 2024-2025, AED):
- Villa standard: 2,200-3,200 AED/m² (avg 2,700)
- Villa luxury: 3,500-5,500 AED/m² (avg 4,500)
- Cost breakdown: Structural 35%, Architectural 25%, MEP 25%, External 10%, Contingency 5%
- Concrete C25: 280 AED/m³, C30: 320 AED/m³
- Steel 460B: 3,100 AED/ton
- Blockwork 200mm: 55 AED/m²
- Ceramic tiles: 45 AED/m², Porcelain: 80 AED/m²
- Aluminum windows: 350 AED/m²
- Waterproofing: 45 AED/m²
- Central HVAC: 4,500 AED/ton`;
          break;
        case 'regulation':
          context += `\n\nUAE Regulation Context:
- RAK Municipality: Building permits, completion certificates, 2-4 weeks review
- Required docs: Site plan, structural/MEP/architectural drawings, soil report, CD+FEWA approvals
- Civil Defense: UAE Fire & Life Safety Code, NFPA standards, 1-3 weeks review
- FEWA: Electrical/water connections, 1-2 weeks
- Abu Dhabi: ADIBC 2013, ADDC for water, ADDC for sewage
- Dubai: DM Building Code 2017, DEWA for utilities, Green Building Regs`;
          break;
        case 'calculation':
          context += `\n\nEngineering Calculation References (UAE):
- Floor loads: Residential 2.0+1.5 kN/m², Office 2.5-4.0 kN/m²
- Roof loads: 0.75+1.0 kN/m² (non-accessible), 1.5 kN/m² (accessible)
- Wind: 145-160 km/h basic speed, importance factor 1.0-1.15
- Concrete grades: C25/30 min structural, C30/37 columns
- Steel lap: 40×dia tension, 35×dia compression
- Foundation: Isolated pad ≤ 150 kN/m² typical RAK soil, mat when footings > 50% footprint`;
          break;
        case 'soil':
          context += `\n\nGeotechnical Context (UAE/RAK):
- Typical RAK soil: Silty sand to dense sand, bearing 150-200 kN/m²
- High water table common in coastal areas - dewatering may be needed
- Aggressive soil/groundwater: Use sulfate-resistant cement (SRC) for DC-4
- Borehole spacing: 30m for buildings < 1000m², 15m for complex structures
- Foundation types: Isolated pads (good soil), Raft (poor soil), Piles (very poor soil)
- Ground improvement: Vibro compaction, stone columns common in UAE`;
          break;
        case 'safety':
          context += `\n\nSafety Context (UAE Construction):
- UAE Fire and Life Safety Code of Practice
- Civil Defense approval required before occupancy
- Fire rating: 2hr residential, 3hr commercial structural elements
- Emergency exits: Travel distance ≤ 45m (residential), ≤ 30m (commercial)
- Fire alarm: Required in all commercial and multi-residential buildings
- PFD requirements: Safety helmets, harnesses, scaffolding tags mandatory`;
          break;
      }
    }
  }

  return context;
}
