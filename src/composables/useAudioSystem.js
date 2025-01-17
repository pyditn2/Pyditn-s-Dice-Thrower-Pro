import { ref } from 'vue'

export const useAudioSystem = () => {
  const audioContext = ref(null)
  const diceCollisionBuffer = ref(null)
  const bowlCollisionBuffer = ref(null)
  
  const loadAudioFile = async (url, soundName) => {
    console.log(`Attempting to load ${soundName} from ${url}`)
    try {
      const response = await fetch(url)
      console.log(`${soundName} response status:`, response.status)
      console.log(`${soundName} response headers:`, Object.fromEntries(response.headers))
      
      const arrayBuffer = await response.arrayBuffer()
      console.log(`${soundName} file size:`, arrayBuffer.byteLength, 'bytes')
      
      // Log the first few bytes to check file header
      const firstBytes = new Uint8Array(arrayBuffer.slice(0, 16))
      console.log(`${soundName} first bytes:`, Array.from(firstBytes).map(b => b.toString(16).padStart(2, '0')).join(' '))
      
      const audioBuffer = await audioContext.value.decodeAudioData(arrayBuffer)
      console.log(`${soundName} successfully decoded:`, {
        duration: audioBuffer.duration,
        numberOfChannels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate
      })
      
      return audioBuffer
    } catch (error) {
      console.error(`Error loading ${soundName}:`, error)
      console.error('Error details:', error.message)
      return null
    }
  }
  
  const initAudio = async () => {
    console.log('Initializing audio system...')
    
    try {
      audioContext.value = new (window.AudioContext || window.webkitAudioContext)()
      console.log('AudioContext created:', audioContext.value.state)
      
      // Load dice collision sound
      diceCollisionBuffer.value = await loadAudioFile('/sounds/dice-collision.mp3', 'dice sound')
      
      // Load bowl collision sound
      bowlCollisionBuffer.value = await loadAudioFile('/sounds/dice-bowl.mp3', 'bowl sound')
      
      console.log('Audio initialization complete:', {
        diceSound: diceCollisionBuffer.value ? 'loaded' : 'failed',
        bowlSound: bowlCollisionBuffer.value ? 'loaded' : 'failed'
      })
      
    } catch (error) {
      console.error('Critical error in audio initialization:', error)
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

  const resumeAudioContext = () => {
    if (audioContext.value?.state === 'suspended') {
      audioContext.value.resume()
        .then(() => console.log('AudioContext resumed successfully'))
        .catch(error => console.error('Error resuming AudioContext:', error))
    }
  }
  
  return {
    initAudio,
    testPlayDiceSound,
    testPlayBowlSound,
    resumeAudioContext
  }
}