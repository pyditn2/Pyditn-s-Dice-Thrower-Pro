import type { AttributeId } from './attributes'

export const TALENT_CATEGORIES = [
  { id: 'koerper', name: 'Körpertalente', legacyKey: 'koerpertalente' },
  { id: 'gesellschaft', name: 'Gesellschaftstalente', legacyKey: 'gesellschaftstalente' },
  { id: 'natur', name: 'Naturtalente', legacyKey: 'naturtalente' },
  { id: 'wissen', name: 'Wissenstalente', legacyKey: 'wissentalente' },
  { id: 'handwerk', name: 'Handwerkstalente', legacyKey: 'handwerkstalente' },
] as const

export type TalentCategoryId = (typeof TALENT_CATEGORIES)[number]['id']

export interface TalentDefinition {
  id: string
  name: string
  category: TalentCategoryId
  attributes: readonly [AttributeId, AttributeId, AttributeId]
  /** Names this talent had in saves of the old app, when they differ from `name`. */
  legacyNames?: readonly string[]
}

function talent(
  category: TalentCategoryId,
  id: string,
  name: string,
  attributes: [AttributeId, AttributeId, AttributeId],
  legacyNames?: string[],
): TalentDefinition {
  return { id, name, category, attributes, legacyNames }
}

export const TALENTS: readonly TalentDefinition[] = [
  talent('koerper', 'fliegen', 'Fliegen', ['MU', 'IN', 'GE']),
  talent('koerper', 'gaukeleien', 'Gaukeleien', ['MU', 'CH', 'FF']),
  talent('koerper', 'klettern', 'Klettern', ['MU', 'GE', 'KK']),
  talent('koerper', 'koerperbeherrschung', 'Körperbeherrschung', ['GE', 'GE', 'KO']),
  talent('koerper', 'kraftakt', 'Kraftakt', ['KO', 'KK', 'KK']),
  talent('koerper', 'reiten', 'Reiten', ['CH', 'GE', 'KK']),
  talent('koerper', 'schwimmen', 'Schwimmen', ['GE', 'KO', 'KK']),
  talent('koerper', 'selbstbeherrschung', 'Selbstbeherrschung', ['MU', 'MU', 'KO']),
  talent('koerper', 'singen', 'Singen', ['KL', 'CH', 'KO']),
  talent('koerper', 'sinnesschaerfe', 'Sinnesschärfe', ['KL', 'IN', 'IN']),
  talent('koerper', 'tanzen', 'Tanzen', ['KL', 'CH', 'GE']),
  talent('koerper', 'taschendiebstahl', 'Taschendiebstahl', ['MU', 'FF', 'GE']),
  talent('koerper', 'verbergen', 'Verbergen', ['MU', 'IN', 'GE']),
  talent('koerper', 'zechen', 'Zechen', ['KL', 'KO', 'KK']),

  talent('gesellschaft', 'bekehren-ueberzeugen', 'Bekehren und Überzeugen', ['MU', 'KL', 'CH']),
  talent('gesellschaft', 'betoeren', 'Betören', ['MU', 'CH', 'CH']),
  talent('gesellschaft', 'einschuechtern', 'Einschüchtern', ['MU', 'IN', 'CH']),
  talent('gesellschaft', 'etikette', 'Etikette', ['KL', 'IN', 'CH']),
  talent('gesellschaft', 'gassenwissen', 'Gassenwissen', ['KL', 'IN', 'CH']),
  talent(
    'gesellschaft',
    'menschenkenntnis',
    'Menschenkenntnis',
    ['KL', 'IN', 'CH'],
    ['Menschkenntnis'],
  ),
  talent('gesellschaft', 'ueberreden', 'Überreden', ['MU', 'IN', 'CH']),
  talent('gesellschaft', 'verkleiden', 'Verkleiden', ['IN', 'CH', 'GE']),
  talent('gesellschaft', 'willenskraft', 'Willenskraft', ['MU', 'IN', 'CH']),

  talent('natur', 'faehrtensuchen', 'Fährtensuchen', ['MU', 'IN', 'GE']),
  talent('natur', 'fesseln', 'Fesseln', ['KL', 'FF', 'KK']),
  talent('natur', 'fischen-angeln', 'Fischen/Angeln', ['FF', 'GE', 'KO']),
  talent('natur', 'orientierung', 'Orientierung', ['KL', 'IN', 'IN']),
  talent('natur', 'pflanzenkunde', 'Pflanzenkunde', ['KL', 'FF', 'KO']),
  talent('natur', 'tierkunde', 'Tierkunde', ['MU', 'MU', 'CH']),
  talent('natur', 'wildnisleben', 'Wildnisleben', ['MU', 'GE', 'KO']),

  talent(
    'wissen',
    'brett-gluecksspiel',
    'Brett- und Glücksspiel',
    ['KL', 'KL', 'IN'],
    ['Brett-und Glücksspiel'],
  ),
  talent('wissen', 'geographie', 'Geographie', ['KL', 'KL', 'IN']),
  talent('wissen', 'geschichtswissen', 'Geschichtswissen', ['KL', 'KL', 'IN']),
  talent('wissen', 'goetter-kulte', 'Götter und Kulte', ['KL', 'KL', 'IN']),
  talent('wissen', 'kriegskunst', 'Kriegskunst', ['MU', 'KL', 'IN']),
  talent('wissen', 'magiekunde', 'Magiekunde', ['KL', 'KL', 'IN']),
  talent('wissen', 'mechanik', 'Mechanik', ['KL', 'KL', 'FF']),
  talent('wissen', 'rechnen', 'Rechnen', ['KL', 'KL', 'IN']),
  talent('wissen', 'rechtskunde', 'Rechtskunde', ['KL', 'KL', 'IN']),
  talent('wissen', 'sagen-legenden', 'Sagen und Legenden', ['KL', 'KL', 'IN']),
  talent('wissen', 'sphaerenkunde', 'Sphärenkunde', ['KL', 'KL', 'IN']),
  talent('wissen', 'sternenkunde', 'Sternenkunde', ['KL', 'KL', 'IN']),

  talent('handwerk', 'alchimie', 'Alchimie', ['MU', 'KL', 'FF']),
  talent('handwerk', 'boote-schiffe', 'Boote und Schiffe', ['FF', 'GE', 'KK']),
  talent('handwerk', 'fahrzeuge', 'Fahrzeuge', ['CH', 'FF', 'KO']),
  talent('handwerk', 'handel', 'Handel', ['KL', 'IN', 'CH']),
  talent('handwerk', 'heilkunde-gift', 'Heilkunde Gift', ['MU', 'KL', 'IN']),
  talent('handwerk', 'heilkunde-krankheiten', 'Heilkunde Krankheiten', ['MU', 'IN', 'KO']),
  talent('handwerk', 'heilkunde-seele', 'Heilkunde Seele', ['IN', 'CH', 'KO']),
  talent('handwerk', 'heilkunde-wunden', 'Heilkunde Wunden', ['KL', 'FF', 'FF']),
  talent('handwerk', 'holzbearbeitung', 'Holzbearbeitung', ['FF', 'GE', 'KK']),
  talent('handwerk', 'lebensmittelbearbeitung', 'Lebensmittelbearbeitung', ['IN', 'FF', 'FF']),
  talent('handwerk', 'lederbearbeitung', 'Lederbearbeitung', ['FF', 'GE', 'KO']),
  talent('handwerk', 'malen-zeichnen', 'Malen und Zeichnen', ['IN', 'FF', 'FF']),
  talent('handwerk', 'metallbearbeitung', 'Metallbearbeitung', ['FF', 'KO', 'KK']),
  talent('handwerk', 'musizieren', 'Musizieren', ['CH', 'FF', 'KO']),
  talent('handwerk', 'schloesserknacken', 'Schlösserknacken', ['IN', 'FF', 'FF']),
  talent('handwerk', 'steinbearbeitung', 'Steinbearbeitung', ['FF', 'FF', 'KK']),
  talent('handwerk', 'stoffbearbeitung', 'Stoffbearbeitung', ['KL', 'FF', 'FF']),
]

const talentsById = new Map(TALENTS.map((t) => [t.id, t]))

const talentsByAnyName = new Map<string, TalentDefinition>()
for (const t of TALENTS) {
  talentsByAnyName.set(t.name, t)
  for (const legacyName of t.legacyNames ?? []) talentsByAnyName.set(legacyName, t)
}

export function getTalent(id: string): TalentDefinition | undefined {
  return talentsById.get(id)
}

/** Resolves a talent by its current or any former display name (used when importing old saves). */
export function findTalentByName(name: string): TalentDefinition | undefined {
  return talentsByAnyName.get(name.trim())
}

export function talentsInCategory(category: TalentCategoryId): TalentDefinition[] {
  return TALENTS.filter((t) => t.category === category)
}
