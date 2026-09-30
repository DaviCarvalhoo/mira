import { SpeechSegmenter, encodeWav, resample } from '@shared/audio'
import type { Speaker } from '@shared/types'

const TARGET_RATE = 16000

/** AudioWorklet mínimo: agrupa amostras em frames de ~32ms e envia para a thread principal. */
const WORKLET = `
class MiraTap extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(512); this.n = 0 }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        this.buf[this.n++] = ch[i]
        if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice(0)); this.n = 0 }
      }
    }
    return true
  }
}
registerProcessor('mira-tap', MiraTap)
`

let workletUrl: string | null = null
function getWorkletUrl(): string {
  if (!workletUrl) workletUrl = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
  return workletUrl
}

export interface CaptureCallbacks {
  onSegment: (wav: ArrayBuffer, speaker: Speaker) => void
  onLevel: (level: number, speaker: Speaker) => void
}

/**
 * Uma fonte de áudio (microfone = "você", sistema = "eles"),
 * com detecção de voz e corte em segmentos WAV de 16kHz.
 */
export class AudioSource {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private node: AudioWorkletNode | null = null
  private segmenter: SpeechSegmenter | null = null
  private rate = TARGET_RATE

  constructor(
    readonly speaker: Speaker,
    private readonly cb: CaptureCallbacks
  ) {}

  async start(): Promise<void> {
    this.stream = this.speaker === 'you' ? await getMic() : await getSystemAudio()
    try {
      this.ctx = new AudioContext({ sampleRate: TARGET_RATE })
    } catch {
      this.ctx = new AudioContext()
    }
    this.rate = this.ctx.sampleRate
    await this.ctx.audioWorklet.addModule(getWorkletUrl())
    const src = this.ctx.createMediaStreamSource(this.stream)
    this.node = new AudioWorkletNode(this.ctx, 'mira-tap')
    // o áudio do sistema vem mais "limpo": limiar menor e pausas um pouco maiores
    this.segmenter = new SpeechSegmenter({
      sampleRate: this.rate,
      silenceMs: this.speaker === 'them' ? 800 : 700,
      minThreshold: this.speaker === 'them' ? 0.008 : 0.014
    })
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => this.onFrame(e.data)
    src.connect(this.node)
    // não conecta no destino: nada de eco
  }

  private onFrame(frame: Float32Array): void {
    if (!this.segmenter) return
    const seg = this.segmenter.push(frame)
    this.cb.onLevel(Math.min(1, this.segmenter.level * 8), this.speaker)
    if (seg) this.emit(seg)
  }

  private emit(samples: Float32Array): void {
    const pcm = resample(samples, this.rate, TARGET_RATE)
    this.cb.onSegment(encodeWav(pcm, TARGET_RATE), this.speaker)
  }

  async stop(): Promise<void> {
    const last = this.segmenter?.flush()
    if (last) this.emit(last)
    this.node?.port.close()
    this.node?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    await this.ctx?.close().catch(() => undefined)
    this.cb.onLevel(0, this.speaker)
    this.ctx = null
    this.stream = null
    this.node = null
    this.segmenter = null
  }
}

async function getMic(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
    })
  } catch (err) {
    throw new Error(`Não consegui acessar o microfone. Verifique as permissões de privacidade do sistema. (${(err as Error).message})`)
  }
}

/** Áudio do sistema via loopback (o processo principal responde o pedido sem abrir seletor). */
async function getSystemAudio(): Promise<MediaStream> {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
  } catch (err) {
    throw new Error(`Não consegui capturar o áudio do sistema. (${(err as Error).message})`)
  }
  stream.getVideoTracks().forEach((t) => {
    t.stop()
    stream.removeTrack(t)
  })
  if (!stream.getAudioTracks().length) {
    throw new Error('O sistema não liberou o áudio do computador (loopback). Neste sistema, use só o microfone (⚙ → Comportamento).')
  }
  return stream
}
