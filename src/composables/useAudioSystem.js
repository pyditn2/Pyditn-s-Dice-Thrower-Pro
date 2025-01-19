import { ref } from 'vue'

// Sound configuration
// Sound configuration
const SOUND_CONFIG = {
  DICE_COLLISION: {
    path: '/public/sounds/dice-collision.mp3',
    options: {
      baseVolume: 0.7,      // Reduced base volume
      velocityScale: 40,    // Increased scaling factor to make soft collisions quieter
      minVolume: 0.05,      // Much lower minimum volume
      maxVolume: 1.0,
      pitchVariation: 0.2,
      attack: 0.005,
      release: 0.1
    }
  },
  BOWL_COLLISION: {
    path: '/public/sounds/dice-bowl.mp3',
    options: {
      baseVolume: 0.8,      // Bowl collisions can be slightly louder
      velocityScale: 35,    // Different scaling for bowl
      minVolume: 0.05,      // Same low minimum
      maxVolume: 1.0,
      pitchVariation: 0.1,
      attack: 0.005,
      release: 0.15
    }
  }
}

// Sound types enum
export const SoundType = {
  DICE_COLLISION: 'DICE_COLLISION',
  BOWL_COLLISION: 'BOWL_COLLISION'
}

export const useAudioSystem = () => {
  // Create singleton instance
  if (window._audioSystemInstance) {
    return window._audioSystemInstance
  }

  const audioContext = ref(new (window.AudioContext || window.webkitAudioContext)())
  const soundBuffers = new Map()
  const isMuted = ref(false)
  const isInitialized = ref(false)
  
  // Queue management
  const audioQueue = []
  const MAX_SIMULTANEOUS_SOUNDS = 3
  let isProcessingQueue = false
  let activeSourceCount = 0

  const loadAudioFile = async (soundType) => {
    const config = SOUND_CONFIG[soundType]
    if (!config) {
      console.error(`No configuration found for sound type: ${soundType}`)
      return null
    }

    try {
      const response = await fetch(config.path)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
      console.log(`Loaded sound: ${soundType}`, {
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      })
      return audioBuffer
    } catch (error) {
      console.error(`Failed to load sound: ${soundType}`, error)
      return null
    }
  }

  const initAudio = async () => {
    if (isInitialized.value) return

    try {
      if (audioContext.value.state === 'suspended') {
        await audioContext.value.resume()
      }

      // Load all sounds in parallel
      const loadPromises = Object.keys(SOUND_CONFIG).map(async (soundType) => {
        const buffer = await loadAudioFile(soundType)
        if (buffer) {
          soundBuffers.set(soundType, buffer)
        }
      })

      await Promise.all(loadPromises)

      if (soundBuffers.size !== Object.keys(SOUND_CONFIG).length) {
        throw new Error('Not all sounds were loaded successfully')
      }

      isInitialized.value = true
      console.log('Audio system initialized with sounds:', Array.from(soundBuffers.keys()))
    } catch (error) {
      console.error('Audio initialization failed:', error)
      isInitialized.value = false
    }
  }

  const playSound = async (soundType, collisionSpeed) => {
    if (isMuted.value || !audioContext.value) return

    const buffer = soundBuffers.get(soundType)
    const config = SOUND_CONFIG[soundType]
    if (!buffer || !config) return

    try {
      if (audioContext.value.state === 'suspended') {
        await audioContext.value.resume()
      }

      const source = audioContext.value.createBufferSource()
      const gainNode = audioContext.value.createGain()

      source.buffer = buffer

      // Simple but effective variation based on sound type
      const variation = soundType === SoundType.DICE_COLLISION ? 
        0.7 + Math.random() * 0.6 :  // Dice: 0.8 to 1.2
        0.7 + Math.random() * 0.6    // Bowl: 0.9 to 1.1
      
      source.playbackRate.value = variation

      // Volume based on collision speed with configured scaling
      const volume = Math.min(
        Math.max(collisionSpeed / config.options.velocityScale, config.options.minVolume),
        config.options.maxVolume
      ) * config.options.baseVolume

      gainNode.gain.setValueAtTime(0, audioContext.value.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.value.currentTime + config.options.attack)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.value.currentTime + config.options.attack + config.options.release)

      source.connect(gainNode)
      gainNode.connect(audioContext.value.destination)

      activeSourceCount++

      source.onended = () => {
        activeSourceCount--
        source.disconnect()
        gainNode.disconnect()
        processAudioQueue()
      }

      source.start(0)
    } catch (error) {
      console.error(`Error playing sound: ${soundType}`, error)
      activeSourceCount--
    }
  }

  const processAudioQueue = async () => {
    if (isProcessingQueue || audioQueue.length === 0 || activeSourceCount >= MAX_SIMULTANEOUS_SOUNDS) {
      return
    }

    isProcessingQueue = true

    while (audioQueue.length > 0 && activeSourceCount < MAX_SIMULTANEOUS_SOUNDS) {
      const { soundType, velocity } = audioQueue.shift()
      await playSound(soundType, velocity)
    }

    isProcessingQueue = false
  }

  const queueSound = (soundType, velocity) => {
    if (audioQueue.length < 10) {
      audioQueue.push({ soundType, velocity })
      if (!isProcessingQueue) {
        processAudioQueue()
      }
    }
  }

  // Public methods for playing specific sounds
  const playCollisionSound = (velocity, isBowlCollision) => {
    const soundType = isBowlCollision ? SoundType.BOWL_COLLISION : SoundType.DICE_COLLISION
    queueSound(soundType, velocity)
  }

  // Create the instance
  const instance = {
    initAudio,
    playCollisionSound,
    isMuted,
    toggleMute: () => {
      isMuted.value = !isMuted.value
      console.log('Audio ' + (isMuted.value ? 'muted' : 'unmuted'))
    },
    initPromise: null,
    isInitialized
  }

  // Initialize and store the instance
  instance.initPromise = initAudio()
  window._audioSystemInstance = instance

  return instance
}