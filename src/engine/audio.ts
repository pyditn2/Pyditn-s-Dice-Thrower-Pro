/** Collision sounds. The AudioContext is created on the first roll (a user gesture). */

type Sound = 'dice' | 'bowl'

const SOUNDS: Record<
  Sound,
  { url: string; baseVolume: number; velocityScale: number; release: number }
> = {
  dice: { url: 'sounds/dice-collision.mp3', baseVolume: 0.7, velocityScale: 40, release: 0.1 },
  bowl: { url: 'sounds/dice-bowl.mp3', baseVolume: 0.8, velocityScale: 35, release: 0.15 },
}

const MIN_VOLUME = 0.05
const ATTACK = 0.005
const MAX_VOICES = 3
const COOLDOWN_MS = 100
const MIN_SPEED = 0.05

export class CollisionAudio {
  muted = false
  private context: AudioContext | null = null
  private buffers = new Map<Sound, AudioBuffer>()
  private voices = 0
  private lastPlayed = 0

  constructor(private readonly baseUrl: string) {}

  /** Must be called from a user gesture at least once. */
  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext()
      void this.load()
    }
    if (this.context.state === 'suspended') await this.context.resume().catch(() => {})
  }

  private async load(): Promise<void> {
    const context = this.context!
    await Promise.all(
      (Object.keys(SOUNDS) as Sound[]).map(async (sound) => {
        try {
          const response = await fetch(this.baseUrl + SOUNDS[sound].url)
          this.buffers.set(sound, await context.decodeAudioData(await response.arrayBuffer()))
        } catch (error) {
          console.warn(`Sound ${sound} could not be loaded`, error)
        }
      }),
    )
  }

  /** `relativeSpeed` is the speed of the two bodies relative to each other. */
  collision(relativeSpeed: number, withBowl: boolean): void {
    const context = this.context
    const now = performance.now()
    if (this.muted || !context || relativeSpeed < MIN_SPEED) return
    if (now - this.lastPlayed < COOLDOWN_MS || this.voices >= MAX_VOICES) return
    const sound = withBowl ? 'bowl' : 'dice'
    const buffer = this.buffers.get(sound)
    if (!buffer) return
    this.lastPlayed = now

    const config = SOUNDS[sound]
    const intensity = Math.pow(relativeSpeed, 1.5) / 2
    const volume =
      Math.min(Math.max(intensity / config.velocityScale, MIN_VOLUME), 1) * config.baseVolume

    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = 0.7 + Math.random() * 0.6
    const gain = context.createGain()
    const t = context.currentTime
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(volume, t + ATTACK)
    gain.gain.exponentialRampToValueAtTime(0.001, t + ATTACK + config.release)
    source.connect(gain).connect(context.destination)
    this.voices++
    source.onended = () => {
      this.voices--
      source.disconnect()
      gain.disconnect()
    }
    source.start()
  }
}
