export const SETTLE_THRESHOLD = 0.01

export const DICE_TYPES = {
  D4: 'd4',
  D6: 'd6',
  D8: 'd8',
  D10: 'd10',
  D12: 'd12',
  D20: 'd20',
  D100: 'd100'
}

// Check types for DSA
export const CHECK_TYPES = {
  ATTRIBUTE: 'attribute',
  TALENT: 'talent',
  CUSTOM: 'custom'
}

export const DICE_INITIAL_CONFIG = {
  heightRange: { 
    min: 6, 
    max: 8 
  },
  spacing: 2.5,
  initialVelocity: {
    x: { 
      min: -2, 
      max: 12 
    },
    y: { 
      base: 8 
    },
    z: { 
      min: -3, 
      max: 6 
    }
  },
  angularVelocity: {
    min: -7.5,
    max: 7.5
  }
}

// DSA specific configurations
export const CHECK_CONFIGURATIONS = {
  [CHECK_TYPES.ATTRIBUTE]: {
    diceCount: 1,
    diceType: DICE_TYPES.D20,
    label: 'Eigenschaftsprobe'
  },
  [CHECK_TYPES.TALENT]: {
    diceCount: 3,
    diceType: DICE_TYPES.D20,
    label: 'Talentprobe'
  }
}