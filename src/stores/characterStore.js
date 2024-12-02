import { defineStore } from 'pinia'

export const useCharacterStore = defineStore('character', {
  state: () => ({
    characterInfo: {
      name: '',
      spezies: '',
      kultur: '',
      profession: ''
    },

    stats: {
      attributes: {
        MU: 8,  // Mut
        KL: 8,  // Klugheit
        IN: 8,  // Intuition
        CH: 8,  // Charisma
        FF: 8,  // Fingerfertigkeit
        GE: 8,  // Gewandheit
        KO: 8,  // Konstitution
        KK: 8   // Körperkraft
      }
    },

    talents: {
      koerpertalente: [
        { name: 'Fliegen', value: 0, attributes: ['MU', 'IN', 'GE'] },
        { name: 'Gaukeleien', value: 0, attributes: ['MU', 'CH', 'FF'] },
        { name: 'Klettern', value: 0, attributes: ['MU', 'GE', 'KK'] },
        { name: 'Körperbeherrschung', value: 0, attributes: ['GE', 'GE', 'KO'] },
        { name: 'Kraftakt', value: 0, attributes: ['KO', 'KK', 'KK'] },
        { name: 'Reiten', value: 0, attributes: ['CH', 'GE', 'KK'] },
        { name: 'Schwimmen', value: 0, attributes: ['GE', 'KO', 'KK'] },
        { name: 'Selbstbeherrschung', value: 0, attributes: ['MU', 'MU', 'KO'] },
        { name: 'Singen', value: 0, attributes: ['KL', 'CH', 'KO'] },
        { name: 'Sinnesschärfe', value: 0, attributes: ['KL', 'IN', 'IN'] },
        { name: 'Tanzen', value: 0, attributes: ['KL', 'CH', 'GE'] },
        { name: 'Taschendiebstahl', value: 0, attributes: ['MU', 'FF', 'GE'] },
        { name: 'Verbergen', value: 0, attributes: ['MU', 'IN', 'GE'] },
        { name: 'Zechen', value: 0, attributes: ['KL', 'KO', 'KK'] }
      ],
      gesellschaftstalente: [
        { name: 'Bekehren und Überzeugen', value: 0, attributes: ['MU', 'KL', 'CH'] },
        { name: 'Betören', value: 0, attributes: ['MU', 'CH', 'CH'] },
        { name: 'Einschüchtern', value: 0, attributes: ['MU', 'IN', 'CH'] },
        { name: 'Etikette', value: 0, attributes: ['KL', 'IN', 'CH'] },
        { name: 'Gassenwissen', value: 0, attributes: ['KL', 'IN', 'CH'] },
        { name: 'Menschkenntnis', value: 0, attributes: ['KL', 'IN', 'CH'] },
        { name: 'Überreden', value: 0, attributes: ['MU', 'IN', 'CH'] },
        { name: 'Verkleiden', value: 0, attributes: ['IN', 'CH', 'GE'] },
        { name: 'Willenskraft', value: 0, attributes: ['MU', 'IN', 'CH'] }
      ],
      naturtalente: [
        { name: 'Fährtensuchen', value: 0, attributes: ['MU', 'IN', 'GE'] },
        { name: 'Fesseln', value: 0, attributes: ['KL', 'FF', 'KK'] },
        { name: 'Fischen/Angeln', value: 0, attributes: ['FF', 'GE', 'KO'] },
        { name: 'Orientierung', value: 0, attributes: ['KL', 'IN', 'IN'] },
        { name: 'Pflanzenkunde', value: 0, attributes: ['KL', 'FF', 'KO'] },
        { name: 'Tierkunde', value: 0, attributes: ['MU', 'MU', 'CH'] },
        { name: 'Wildnisleben', value: 0, attributes: ['MU', 'GE', 'KO'] }
      ],
      wissentalente: [
        { name: 'Brett-und Glücksspiel', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Geographie', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Geschichtswissen', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Götter und Kulte', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Kriegskunst', value: 0, attributes: ['MU', 'KL', 'IN'] },
        { name: 'Magiekunde', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Mechanik', value: 0, attributes: ['KL', 'KL', 'FF'] },
        { name: 'Rechnen', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Rechtskunde', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Sagen und Legenden', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Sphärenkunde', value: 0, attributes: ['KL', 'KL', 'IN'] },
        { name: 'Sternenkunde', value: 0, attributes: ['KL', 'KL', 'IN'] }
      ],
      handwerkstalente: [
        { name: 'Alchimie', value: 0, attributes: ['MU', 'KL', 'FF'] },
        { name: 'Boote und Schiffe', value: 0, attributes: ['FF', 'GE', 'KK'] },
        { name: 'Fahrzeuge', value: 0, attributes: ['CH', 'FF', 'KO'] },
        { name: 'Handel', value: 0, attributes: ['KL', 'IN', 'CH'] },
        { name: 'Heilkunde Gift', value: 0, attributes: ['MU', 'KL', 'IN'] },
        { name: 'Heilkunde Krankheiten', value: 0, attributes: ['MU', 'IN', 'KO'] },
        { name: 'Heilkunde Seele', value: 0, attributes: ['IN', 'CH', 'KO'] },
        { name: 'Heilkunde Wunden', value: 0, attributes: ['KL', 'FF', 'FF'] },
        { name: 'Holzbearbeitung', value: 0, attributes: ['FF', 'GE', 'KK'] },
        { name: 'Lebensmittelbearbeitung', value: 0, attributes: ['IN', 'FF', 'FF'] },
        { name: 'Lederbearbeitung', value: 0, attributes: ['FF', 'GE', 'KO'] },
        { name: 'Malen und Zeichnen', value: 0, attributes: ['IN', 'FF', 'FF'] },
        { name: 'Metallbearbeitung', value: 0, attributes: ['FF', 'KO', 'KK'] },
        { name: 'Musizieren', value: 0, attributes: ['CH', 'FF', 'KO'] },
        { name: 'Schlösserknacken', value: 0, attributes: ['IN', 'FF', 'FF'] },
        { name: 'Steinbearbeitung', value: 0, attributes: ['FF', 'FF', 'KK'] },
        { name: 'Stoffbearbeitung', value: 0, attributes: ['KL', 'FF', 'FF'] }
      ]
    }
  }),

  getters: {
    // Helper to find a talent by name across all categories
    getTalentByName: (state) => (talentName) => {
      for (const category of Object.values(state.talents)) {
        const talent = category.find(t => t.name === talentName)
        if (talent) return talent
      }
      return null
    },

    // Helper to get an attribute value
    getAttributeValue: (state) => (attributeName) => {
      return state.stats.attributes[attributeName]
    }
  },

  actions: {
    // Update base attribute values
    updateAttribute(name, value) {
      const validValue = Math.max(8, Math.min(20, value))
      this.stats.attributes[name] = validValue
    },

    // Update talent values
    updateTalentValue(talentName, value) {
      for (const category of Object.values(this.talents)) {
        const talent = category.find(t => t.name === talentName)
        if (talent) {
          talent.value = value
          break
        }
      }
    },

    // Update character info
    updateCharacterInfo(field, value) {
      this.characterInfo[field] = value
    }
  },

  // Enable persistence
  persist: true
})