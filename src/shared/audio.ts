/**
 * Processamento de áudio sem dependências de DOM (testável em Node).
 */

/** Codifica PCM float32 mono em um arquivo WAV 16-bit. */
export function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true) // tamanho do chunk fmt
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits por amostra
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  let offset = 44
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return buffer
}

/** Reamostragem linear simples (ex.: 48kHz -> 16kHz). */
export function resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input
  const ratio = fromRate / toRate
  const length = Math.floor(input.length / ratio)
  const out = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    const pos = i * ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(i0 + 1, input.length - 1)
    const frac = pos - i0
    out[i] = input[i0] * (1 - frac) + input[i1] * frac
  }
  return out
}

export function rms(frame: Float32Array): number {
  let sum = 0
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i]
  return Math.sqrt(sum / (frame.length || 1))
}

export interface SegmenterOptions {
  sampleRate: number
  /** silêncio (ms) que encerra uma fala */
  silenceMs?: number
  /** duração mínima de fala (ms) para virar segmento */
  minSpeechMs?: number
  /** corta segmentos longos (ms) para manter a transcrição "ao vivo" */
  maxSegmentMs?: number
  /** áudio anterior ao início da fala que é preservado (ms) */
  preRollMs?: number
  /** limiar mínimo absoluto de RMS */
  minThreshold?: number
}

/**
 * Detector de voz (VAD) por energia com piso de ruído adaptativo.
 * Alimente com frames; recebe de volta segmentos de fala prontos para transcrever.
 */
export class SpeechSegmenter {
  private readonly o: Required<SegmenterOptions>
  private noiseFloor = 0.004
  private speaking = false
  private chunks: Float32Array[] = []
  private preRoll: Float32Array[] = []
  private speechSamples = 0
  private silenceSamples = 0
  private totalSamples = 0
  level = 0

  constructor(opts: SegmenterOptions) {
    this.o = {
      silenceMs: 700,
      minSpeechMs: 350,
      maxSegmentMs: 12000,
      preRollMs: 300,
      minThreshold: 0.012,
      ...opts
    }
  }

  private ms(samples: number): number {
    return (samples / this.o.sampleRate) * 1000
  }

  get threshold(): number {
    return Math.max(this.o.minThreshold, this.noiseFloor * 3)
  }

  /** Processa um frame. Retorna um segmento finalizado, se houver. */
  push(frame: Float32Array): Float32Array | null {
    const energy = rms(frame)
    this.level = energy
    const voiced = energy > this.threshold

    if (!this.speaking) {
      // atualiza o piso de ruído só em silêncio
      this.noiseFloor = this.noiseFloor * 0.95 + energy * 0.05
      this.preRoll.push(frame)
      let preSamples = this.preRoll.reduce((a, f) => a + f.length, 0)
      while (this.ms(preSamples) > this.o.preRollMs && this.preRoll.length > 1) {
        preSamples -= this.preRoll.shift()!.length
      }
      if (voiced) {
        this.speaking = true
        this.chunks = [...this.preRoll]
        this.preRoll = []
        this.totalSamples = this.chunks.reduce((a, f) => a + f.length, 0)
        this.speechSamples = frame.length
        this.silenceSamples = 0
      }
      return null
    }

    this.chunks.push(frame)
    this.totalSamples += frame.length
    if (voiced) {
      this.speechSamples += frame.length
      this.silenceSamples = 0
    } else {
      this.silenceSamples += frame.length
    }

    if (this.ms(this.silenceSamples) >= this.o.silenceMs || this.ms(this.totalSamples) >= this.o.maxSegmentMs) {
      return this.finish()
    }
    return null
  }

  /** Força o fim do segmento atual (ex.: ao parar de ouvir). */
  flush(): Float32Array | null {
    return this.speaking ? this.finish() : null
  }

  private finish(): Float32Array | null {
    const enough = this.ms(this.speechSamples) >= this.o.minSpeechMs
    const out = enough ? concat(this.chunks) : null
    this.speaking = false
    this.chunks = []
    this.preRoll = []
    this.speechSamples = 0
    this.silenceSamples = 0
    this.totalSamples = 0
    return out
  }
}

export function concat(chunks: Float32Array[]): Float32Array {
  const total = chunks.reduce((a, c) => a + c.length, 0)
  const out = new Float32Array(total)
  let off = 0
  for (const c of chunks) {
    out.set(c, off)
    off += c.length
  }
  return out
}
