import { describe, expect, it } from 'vitest'
import { SseParser, extractDelta } from '@shared/sse'
import { cleanTranscript, formatTranscript, isEcho, isQuestion, latestTheirTurn } from '@shared/question'
import { SpeechSegmenter, encodeWav, resample } from '@shared/audio'
import { buildAnswerMessages, buildSystemPrompt } from '@shared/prompt'
import { DEFAULT_SETTINGS, isModelNotFound, isReasoningModel, mergeSettings, pickFallbackModel } from '@shared/providers'
import type { TranscriptEntry } from '@shared/types'

describe('SseParser', () => {
  it('junta eventos quebrados em pedaços arbitrários', () => {
    const p = new SseParser()
    expect(p.push('data: {"a":')).toEqual([])
    expect(p.push('1}\n\ndata: [DO')).toEqual(['{"a":1}'])
    expect(p.push('NE]\r\n\r\n')).toEqual(['[DONE]'])
  })

  it('ignora linhas de evento e comentários', () => {
    const p = new SseParser()
    expect(p.push('event: ping\n: comment\ndata: x\n\n')).toEqual(['x'])
  })
})

describe('extractDelta', () => {
  it('lê deltas OpenAI', () => {
    expect(extractDelta('{"choices":[{"delta":{"content":"oi"}}]}', 'openai')).toEqual({ delta: 'oi', done: false })
    expect(extractDelta('[DONE]', 'openai').done).toBe(true)
  })
  it('lê deltas Anthropic', () => {
    const d = '{"type":"content_block_delta","delta":{"type":"text_delta","text":"olá"}}'
    expect(extractDelta(d, 'anthropic')).toEqual({ delta: 'olá', done: false })
    expect(extractDelta('{"type":"message_stop"}', 'anthropic').done).toBe(true)
  })
  it('propaga erros do provedor', () => {
    expect(extractDelta('{"error":{"message":"bad key"}}', 'openai').error).toBe('bad key')
  })
})

describe('isQuestion', () => {
  it.each([
    'Me fala um pouco sobre você',
    'Qual foi seu maior desafio no último projeto',
    'Por que você quer trabalhar aqui?',
    'Ok, legal. Como você lidaria com um conflito no time',
    'Tell me about yourself',
    'walk me through your resume'
  ])('detecta: %s', (q) => expect(isQuestion(q)).toBe(true))

  it.each([
    'Legal, entendi.',
    'Contexto é importante no projeto',
    'ok',
    'A gente usa React aqui',
    'Oi, tudo bem? Obrigado por participar do nosso processo seletivo.',
    'Consegue me ouvir?',
    'Bom dia, como vai você?'
  ])(
    'ignora: %s',
    (q) => expect(isQuestion(q)).toBe(false)
  )
})

describe('cleanTranscript', () => {
  it('remove alucinações do whisper', () => {
    expect(cleanTranscript('Obrigado.')).toBe('')
    expect(cleanTranscript('Legendas pela comunidade Amara.org')).toBe('')
    expect(cleanTranscript('[Música]')).toBe('')
    expect(cleanTranscript('  Eu trabalho   com React ')).toBe('Eu trabalho com React')
  })
})

const t = (speaker: 'them' | 'you', text: string, ts: number): TranscriptEntry => ({ id: String(ts), speaker, text, ts })

describe('transcript helpers', () => {
  it('pega o último turno do interlocutor juntando segmentos', () => {
    const tr = [t('them', 'Oi', 0), t('you', 'Oi, tudo bem', 1000), t('them', 'Então,', 2000), t('them', 'qual sua stack?', 3000)]
    expect(latestTheirTurn(tr)).toBe('Então, qual sua stack?')
  })
  it('formata respeitando o limite de caracteres', () => {
    const tr = [t('them', 'a'.repeat(50), 0), t('you', 'curta', 1)]
    expect(formatTranscript(tr, 20)).toBe('Eu: curta')
  })
})

describe('audio', () => {
  it('gera WAV com cabeçalho válido', () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1]), 16000)
    const v = new DataView(wav)
    expect(wav.byteLength).toBe(44 + 8)
    expect(String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3))).toBe('RIFF')
    expect(v.getUint32(24, true)).toBe(16000)
    expect(v.getInt16(44 + 6, true)).toBe(0x7fff)
  })

  it('reamostra 48k -> 16k', () => {
    expect(resample(new Float32Array(4800), 48000, 16000).length).toBe(1600)
  })

  it('segmenta fala separada por silêncio', () => {
    const sr = 16000
    const seg = new SpeechSegmenter({ sampleRate: sr, silenceMs: 300, minSpeechMs: 200 })
    const frame = (amp: number) => Float32Array.from({ length: 1600 }, (_, i) => amp * Math.sin(i / 3))
    const segments: Float32Array[] = []
    const feed = (amp: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const s = seg.push(frame(amp))
        if (s) segments.push(s)
      }
    }
    feed(0.001, 10) // silêncio (1s)
    feed(0.3, 8) // fala (800ms)
    feed(0.001, 5) // silêncio (500ms) encerra
    expect(segments).toHaveLength(1)
    expect(segments[0].length).toBeGreaterThanOrEqual(8 * 1600)
    feed(0.3, 1) // estalo curto (100ms) não vira segmento
    feed(0.001, 5)
    expect(segments).toHaveLength(1)
  })
})

describe('prompt', () => {
  it('inclui currículo e vaga no system prompt', () => {
    const s = mergeSettings({ profile: { ...DEFAULT_SETTINGS.profile, resume: 'Dev React 3 anos', jobDescription: 'Vaga Front' } })
    const sys = buildSystemPrompt(s)
    expect(sys).toContain('Dev React 3 anos')
    expect(sys).toContain('Vaga Front')
  })
  it('monta mensagens com a pergunta', () => {
    const msgs = buildAnswerMessages(DEFAULT_SETTINGS, [t('them', 'Fale de você', 0)], 'Fale de você')
    expect(msgs[0].role).toBe('system')
    expect(String(msgs[1].content)).toContain('Pergunta a responder agora: "Fale de você"')
  })
  it('mergeSettings preenche campos novos', () => {
    const s = mergeSettings({ llm: { provider: 'openai' } as any })
    expect(s.llm.provider).toBe('openai')
    expect(s.llm.model).toBe(DEFAULT_SETTINGS.llm.model)
    expect(s.autoAnswer).toBe(true)
  })
})

describe('isEcho', () => {
  it('descarta no microfone o eco do que eles acabaram de falar', () => {
    const tr = [t('them', 'Qual foi o maior desafio técnico que você resolveu?', 1000)]
    expect(isEcho('qual foi o maior desafio técnico', tr, 3000)).toBe(true)
    expect(isEcho('Eu reescrevi o checkout inteiro em React', tr, 3000)).toBe(false)
    expect(isEcho('qual foi o maior desafio técnico', tr, 60000)).toBe(false)
  })
})

describe('fallback de modelo', () => {
  it('reconhece erro de modelo inexistente', () => {
    expect(isModelNotFound(404, '404: The model `llama-3.3-70b-versatile` does not exist')).toBe(true)
    expect(isModelNotFound(400, 'model_decommissioned')).toBe(true)
    expect(isModelNotFound(401, 'Invalid API Key')).toBe(false)
    expect(isModelNotFound(500, 'internal error')).toBe(false)
  })
  it('escolhe o substituto pela ordem de preferência', () => {
    const avail = ['whisper-large-v3', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b']
    expect(pickFallbackModel(avail, ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile'], 'llama-3.3-70b-versatile')).toBe('openai/gpt-oss-120b')
  })
  it('sem preferido disponível, pega um modelo de chat (nunca whisper)', () => {
    expect(pickFallbackModel(['whisper-large-v3', 'qwen/qwen3-32b'], ['x'], 'y')).toBe('qwen/qwen3-32b')
    expect(pickFallbackModel(['whisper-large-v3'], ['x'], 'y')).toBeNull()
  })
  it('identifica modelos de raciocínio', () => {
    expect(isReasoningModel('openai/gpt-oss-120b')).toBe(true)
    expect(isReasoningModel('o4-mini')).toBe(true)
    expect(isReasoningModel('llama-3.3-70b-versatile')).toBe(false)
    expect(isReasoningModel('gpt-4o-mini')).toBe(false)
  })
})
