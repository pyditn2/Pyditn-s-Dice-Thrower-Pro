import { ref } from 'vue'

export const useAudioSystem = () => {
  const audioContext = ref(new (window.AudioContext || window.webkitAudioContext)())
  const diceCollisionBuffer = ref(null)
  const bowlCollisionBuffer = ref(null)
  let lastPlayTime = 0
  let isInitialized = false
  const isMuted = ref(false)

  const getRandomVariation = (min, max) => {
    return Math.random() * (max - min) + min
  }
  
  const loadAudioFile = async (url, soundName) => {
    if (!audioContext.value) {
      console.error('AudioContext not available during loadAudioFile')
      return null
    }

    console.log(`Attempting to load ${soundName} from ${url}`)
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
      console.log(`${soundName} loaded:`, {
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      })
      return audioBuffer
    } catch (error) {
      console.error(`Error loading ${soundName}:`, error)
      return null
    }
  }
  
  const initAudio = async () => {
    if (isInitialized) return
    
    console.log('Initializing audio system...')
    console.log('AudioContext state:', audioContext.value.state)
    
    try {
      if (audioContext.value.state === 'suspended') {
        await audioContext.value.resume()
      }
      
      diceCollisionBuffer.value = await loadAudioFile('/sounds/dice-collision.mp3', 'dice sound')
      bowlCollisionBuffer.value = await loadAudioFile('/sounds/dice-bowl.mp3', 'bowl sound')
      
      isInitialized = true
      console.log('Audio initialization complete')
    } catch (error) {
      console.error('Error in audio initialization:', error)
      isInitialized = false
    }
  }
  
  const testPlayDiceSound = () => {
    console.log('Testing dice sound...')
    console.log('Dice buffer status:', !!diceCollisionBuffer.value)
    
    if (!audioContext.value || !diceCollisionBuffer.value) {
      console.error('Cannot play dice sound: audio not initialized')
      return
    }
    
    try {
      const source = audioContext.value.createBufferSource()
      const gainNode = audioContext.value.createGain()
      
      source.buffer = diceCollisionBuffer.value
      gainNode.gain.value = 0.5
      
      source.connect(gainNode)
      gainNode.connect(audioContext.value.destination)
      source.start()
      console.log('Dice sound playing...')
    } catch (error) {
      console.error('Error playing dice sound:', error)
    }
  }
  
  const testPlayBowlSound = () => {
    console.log('Testing bowl sound...')
    console.log('Bowl buffer status:', !!bowlCollisionBuffer.value)
    
    if (!audioContext.value || !bowlCollisionBuffer.value) {
      console.error('Cannot play bowl sound: audio not initialized')
      return
    }
    
    try {
      const source = audioContext.value.createBufferSource()
      const gainNode = audioContext.value.createGain()
      
      source.buffer = bowlCollisionBuffer.value
      gainNode.gain.value = 0.5
      
      source.connect(gainNode)
      gainNode.connect(audioContext.value.destination)
      source.start()
      console.log('Bowl sound playing...')
    } catch (error) {
      console.error('Error playing bowl sound:', error)
    }
  }

  const resumeAudioContext = async () => {
    if (!audioContext.value) return
    
    if (audioContext.value.state === 'suspended') {
      try {
        await audioContext.value.resume()
      } catch (error) {
        console.error('Failed to resume AudioContext:', error)
      }
    }
  }

  const playCollisionSound = async (volume, isBowlCollision = false) => {
    // Check mute state first and log it
    //console.log('Attempting to play sound. Muted:', isMuted.value)
    
    if (isMuted.value) {
      console.log('Sound is muted, skipping playback')
      return
    }

    await resumeAudioContext()
    
    if (!audioContext.value) {
      console.log('No audio context available')
      return
    }
    
    const buffer = isBowlCollision ? bowlCollisionBuffer.value : diceCollisionBuffer.value
    if (!buffer) {
      console.log('No buffer available')
      return
    }
    
    try {
      //console.log('Creating audio nodes...')
      const source = audioContext.value.createBufferSource()
      const gainNode = audioContext.value.createGain()
      
      // Add variations based on collision type
      if (isBowlCollision) {
        source.playbackRate.value = getRandomVariation(0.9, 1.1)
        source.detune.value = getRandomVariation(-100, 100)
      } else {
        source.playbackRate.value = getRandomVariation(0.8, 1.2)
        source.detune.value = getRandomVariation(-200, 200)
      }
      
      source.buffer = buffer
      
      // Volume envelope with attack and release
      const attack = 0.005
      const release = isBowlCollision ? 0.15 : 0.1
      
      gainNode.gain.setValueAtTime(0, audioContext.value.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.value.currentTime + attack)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.value.currentTime + attack + release)
      
      source.connect(gainNode)
      gainNode.connect(audioContext.value.destination)
      
      source.start(0)
      lastPlayTime = performance.now()
      
      //console.log('Sound played successfully')
    } catch (error) {
      console.error('Error playing collision sound:', error)
    }
  }

  const toggleMute = () => {
    isMuted.value = !isMuted.value
    console.log('Audio ' + (isMuted.value ? 'muted' : 'unmuted'))
  }

  initAudio()

  return {
    initAudio,
    testPlayDiceSound,
    testPlayBowlSound,
    resumeAudioContext,
    playCollisionSound,
    isMuted: isMuted,
    toggleMute
  }
}