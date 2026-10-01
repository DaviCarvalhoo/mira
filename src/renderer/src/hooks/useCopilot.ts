import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LLM_PROVIDERS, STT_PROVIDERS } from '@shared/providers'
import {
  buildAnswerMessages,
  buildChatMessages,
  buildRecapMessages,
  buildScreenMessages,
  buildTitleMessages
} from '@shared/prompt'
import { cleanTranscript, formatTranscript, isEcho, isQuestion, latestTheirTurn } from '@shared/question'
import type {
  AnswerCard,
  CardKind,
  ChatMessage,
  LlmProviderId,
  Session,
  Settings,
  Speaker,
  TranscriptEntry
} from '@shared/types'
import { buildSttPrompt, buildVocabulary, fixMishearings } from '@shared/vocab'
import { AudioSource } from '../lib/audio-capture'
import { DEMO_SCRIPT, demoAnswer } from '../lib/demo'
import { abortChat, completeChat, streamChat } from '../lib/llm'
import { uid } from '../lib/util'

const AUTO_ANSWER_DELAY = 900

export type Levels = Record<Speaker, number>

export function useCopilot() {
  const [settings, setSettingsState] = useState<Settings | null>(null)
  const [keys, setKeys] = useState<Partial<Record<LlmProviderId, boolean>>>({})
  const [listening, setListening] = useState(false)
  const [starting, setStarting] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [cards, setCards] = useState<AnswerCard[]>([])
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [thinking, setThinking] = useState(false)

  const levels = useRef<Levels>({ them: 0, you: 0 })
  const settingsRef = useRef<Settings | null>(null)
  const keysRef = useRef(keys)
  const transcriptRef = useRef<TranscriptEntry[]>([])
  const cardsRef = useRef<AnswerCard[]>([])
  const sources = useRef<AudioSource[]>([])
  const sttQueue = useRef<Record<Speaker, Promise<void>>>({ them: Promise.resolve(), you: Promise.resolve() })
  const autoTimer = useRef<number | undefined>(undefined)
  const active = useRef<{ cardId: string; streamId: string; question: string } | null>(null)
  const lastAnswered = useRef('')
  const sessionId = useRef(uid())
  const sessionStart = useRef(Date.now())
  const demoTimers = useRef<number[]>([])

  settingsRef.current = settings
  keysRef.current = keys

  // ---------- carregamento ----------
  useEffect(() => {
    void Promise.all([window.mira.settings.get(), window.mira.keys.status()]).then(([s, k]) => {
      setSettingsState(s)
      setKeys(k)
    })
  }, [])

  const saveSettings = useCallback(async (s: Settings) => {
    setSettingsState(await window.mira.settings.set(s))
  }, [])

  const saveKey = useCallback(async (provider: LlmProviderId, key: string) => {
    await window.mira.keys.set(provider, key)
    setKeys(await window.mira.keys.status())
  }, [])

  const hasKey = useMemo(() => {
    if (!settings) return false
    const p = LLM_PROVIDERS[settings.llm.provider]
    return !p?.needsKey || !!keys[settings.llm.provider]
  }, [settings, keys])

  /** Em modo demo sem chave, a Mira usa respostas prontas. */
  const useFake = useCallback(() => {
    const s = settingsRef.current
    if (!s?.demoMode) return false
    const p = LLM_PROVIDERS[s.llm.provider]
    return p.needsKey && !keysRef.current[s.llm.provider]
  }, [])

  const showError = useCallback((msg: string) => {
    setError(msg)
    window.setTimeout(() => setError((cur) => (cur === msg ? null : cur)), 7000)
  }, [])

  // o modelo configurado saiu do ar: o processo principal trocou e salvou outro
  useEffect(
    () =>
      window.mira.llm.onModelSwitched(({ from, to, settings: next }) => {
        setSettingsState(next)
        const msg = `O modelo ${from} não está disponível na sua conta. Troquei para ${to}.`
        setInfo(msg)
        window.setTimeout(() => setInfo((cur) => (cur === msg ? null : cur)), 8000)
      }),
    []
  )

  // ---------- cards ----------
  const updateCards = useCallback((fn: (c: AnswerCard[]) => AnswerCard[]) => {
    cardsRef.current = fn(cardsRef.current)
    setCards(cardsRef.current)
  }, [])

  const patchCard = useCallback(
    (id: string, patch: Partial<AnswerCard> | ((c: AnswerCard) => Partial<AnswerCard>)) => {
      updateCards((list) => list.map((c) => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)))
    },
    [updateCards]
  )

  const runCard = useCallback(
    (kind: CardKind, question: string, messages: ChatMessage[], fake?: string, reuseId?: string) => {
      const cardId = reuseId ?? uid()
      if (reuseId) {
        patchCard(cardId, { question, answer: '', status: 'streaming', error: undefined, ts: Date.now() })
      } else {
        updateCards((list) => [{ id: cardId, kind, question, answer: '', ts: Date.now(), status: 'streaming' }, ...list])
      }
      setThinking(true)
      const streamId = streamChat(
        messages,
        {
          onDelta: (d) => patchCard(cardId, (c) => ({ answer: c.answer + d })),
          onEnd: (err) => {
            patchCard(cardId, err ? { status: 'error', error: err } : { status: 'done' })
            if (active.current?.cardId === cardId) active.current = null
            setThinking(false)
          }
        },
        { fake, maxTokens: kind === 'recap' || kind === 'screen' ? 1400 : 700 }
      )
      return { cardId, streamId }
    },
    [patchCard, updateCards]
  )

  // ---------- respostas ----------
  const answer = useCallback(
    (override?: string) => {
      const s = settingsRef.current
      if (!s) return
      const tr = transcriptRef.current
      const question =
        override?.trim() ||
        latestTheirTurn(tr) ||
        formatTranscript(tr.slice(-3), 800) ||
        ''
      if (!question) {
        showError('Ainda não ouvi nenhuma pergunta. Comece a ouvir ou digite abaixo.')
        return
      }
      lastAnswered.current = question

      // a pessoa continuou falando: reaproveita o card da mesma pergunta
      let reuseId: string | undefined
      const cur = active.current
      if (cur && question.startsWith(cur.question.slice(0, Math.min(24, cur.question.length)))) {
        abortChat(cur.streamId)
        reuseId = cur.cardId
      }
      const fake = useFake() ? demoAnswer(question, s.profile) : undefined
      const run = runCard('answer', question, buildAnswerMessages(s, tr, question), fake, reuseId)
      active.current = { ...run, question }
    },
    [runCard, showError, useFake]
  )

  const scheduleAutoAnswer = useCallback(() => {
    window.clearTimeout(autoTimer.current)
    autoTimer.current = window.setTimeout(() => {
      const s = settingsRef.current
      if (!s?.autoAnswer) return
      const q = latestTheirTurn(transcriptRef.current)
      if (!q || q === lastAnswered.current || !isQuestion(q)) return
      answer(q)
    }, AUTO_ANSWER_DELAY)
  }, [answer])

  const addEntry = useCallback(
    (speaker: Speaker, raw: string) => {
      const text = fixMishearings(cleanTranscript(raw))
      if (!text) return
      const now = Date.now()
      if (speaker === 'you' && isEcho(text, transcriptRef.current, now)) return
      const entry: TranscriptEntry = { id: uid(), speaker, text, ts: now }
      let base = transcriptRef.current
      if (speaker === 'them') {
        // o eco no microfone pode ter sido transcrito antes da fala original
        base = base.filter((e) => e.speaker !== 'you' || !isEcho(e.text, [entry], e.ts))
      }
      transcriptRef.current = [...base, entry]
      setTranscript(transcriptRef.current)
      if (speaker === 'them') scheduleAutoAnswer()
    },
    [scheduleAutoAnswer]
  )

  const ask = useCallback(
    (prompt: string) => {
      const s = settingsRef.current
      if (!s || !prompt.trim()) return
      const fake = useFake() ? demoAnswer(prompt, s.profile) : undefined
      runCard('chat', prompt.trim(), buildChatMessages(s, transcriptRef.current, prompt.trim()), fake)
    },
    [runCard, useFake]
  )

  const analyzeScreen = useCallback(async () => {
    const s = settingsRef.current
    if (!s) return
    try {
      const shot = await window.mira.screen.capture()
      const fake = useFake()
        ? '**Na tela há um desafio de código: inverter uma lista ligada.**\n- Percorra a lista guardando `prev`, `curr` e `next`\n- A cada passo aponte `curr.next = prev`\n```ts\nfunction reverse(head) {\n  let prev = null\n  while (head) {\n    const next = head.next\n    head.next = prev\n    prev = head\n    head = next\n  }\n  return prev\n}\n```\n- Complexidade: **O(n)** tempo, **O(1)** espaço'
        : undefined
      runCard('screen', 'Análise da tela', buildScreenMessages(s, transcriptRef.current, shot), fake)
    } catch (err) {
      showError(`Falha ao capturar a tela: ${(err as Error).message}`)
    }
  }, [runCard, showError, useFake])

  const recap = useCallback(() => {
    const s = settingsRef.current
    if (!s) return
    if (!transcriptRef.current.length) {
      showError('Nada para resumir ainda.')
      return
    }
    const fake = useFake()
      ? '**Resumo**\nEntrevista para vaga de desenvolvimento. Conversamos sobre trajetória, desafios técnicos e trabalho em time.\n\n**Pontos principais**\n- Experiência com React, TypeScript e Node.js\n- Case de performance: LCP de 4,1s para 1,6s\n- Resolução de conflitos baseada em dados\n\n**Próximos passos**\n- Aguardar retorno do recrutador\n- Preparar perguntas sobre o time'
      : undefined
    runCard('recap', 'Resumo da conversa', buildRecapMessages(s, transcriptRef.current), fake)
  }, [runCard, showError, useFake])

  // ---------- áudio ----------
  const onSegment = useCallback(
    (wav: ArrayBuffer, speaker: Speaker) => {
      sttQueue.current[speaker] = sttQueue.current[speaker].then(async () => {
        try {
          const recent = transcriptRef.current.slice(-3).map((e) => e.text).join(' ')
          const vocab = settingsRef.current ? buildVocabulary(settingsRef.current.profile) : []
          const res = await window.mira.stt.transcribe(wav, buildSttPrompt(vocab, recent))
          if (res.error) showError(`Transcrição: ${res.error}`)
          else addEntry(speaker, res.text)
        } catch (err) {
          // não deixa um erro travar a fila de transcrição
          showError(`Transcrição: ${(err as Error).message}`)
        }
      })
    },
    [addEntry, showError]
  )

  const onLevel = useCallback((level: number, speaker: Speaker) => {
    levels.current[speaker] = level
  }, [])

  // ---------- sessão ----------
  const persist = useCallback(async (title?: string) => {
    const tr = transcriptRef.current
    const cs = cardsRef.current
    if (!tr.length && !cs.length) return
    const s = settingsRef.current
    const session: Session = {
      id: sessionId.current,
      title: title ?? (latestTheirTurn(tr.slice(0, 6)) || cs[cs.length - 1]?.question || 'Sessão').slice(0, 60),
      startedAt: sessionStart.current,
      endedAt: Date.now(),
      template: s?.template ?? 'interview',
      transcript: tr,
      cards: cs.filter((c) => c.status !== 'streaming' || c.answer)
    }
    await window.mira.sessions.save(session)
  }, [])

  const finalizeSession = useCallback(async () => {
    await persist()
    const tr = transcriptRef.current
    if (tr.length < 2 || useFake()) return
    try {
      const title = await completeChat(buildTitleMessages(tr), { maxTokens: 20, temperature: 0.2 })
      if (title) await persist(title.replace(/^["'#\s]+|["'\s]+$/g, '').slice(0, 60))
    } catch {
      // título é opcional
    }
  }, [persist, useFake])

  // autosave enquanto a sessão está ativa
  useEffect(() => {
    if (!transcript.length && !cards.length) return
    const t = window.setTimeout(() => void persist(), 4000)
    return () => window.clearTimeout(t)
  }, [transcript, cards, persist])

  const stopDemo = useCallback(() => {
    demoTimers.current.forEach((t) => window.clearTimeout(t))
    demoTimers.current = []
  }, [])

  const startDemo = useCallback(() => {
    stopDemo()
    let at = 0
    for (const step of DEMO_SCRIPT) {
      at += step.delay
      const words = step.text.split(' ').length
      const talkMs = Math.min(4000, words * 180)
      // "fala" (anima o nível) e depois a transcrição chega
      demoTimers.current.push(
        window.setTimeout(() => {
          const iv = window.setInterval(() => (levels.current[step.speaker] = 0.25 + Math.random() * 0.6), 60)
          demoTimers.current.push(
            window.setTimeout(() => {
              window.clearInterval(iv)
              levels.current[step.speaker] = 0
              addEntry(step.speaker, step.text)
            }, talkMs)
          )
        }, at)
      )
      at += talkMs
    }
  }, [addEntry, stopDemo])

  const start = useCallback(async () => {
    const s = settingsRef.current
    if (!s || listening || starting) return
    setStarting(true)
    setError(null)
    sessionStart.current = transcriptRef.current.length ? sessionStart.current : Date.now()
    try {
      if (s.demoMode) {
        startDemo()
      } else {
        const stt = STT_PROVIDERS[s.stt.provider]
        if (stt.id !== 'custom' && !keysRef.current[stt.keyFrom]) {
          throw new Error(
            `Para transcrever a conversa, salve a chave do ${LLM_PROVIDERS[stt.keyFrom].label.split(' (')[0]} em ⚙ → IA. Ou ative o modo demonstração.`
          )
        }
        const wanted: Speaker[] = []
        if (s.captureSystem) wanted.push('them')
        if (s.captureMic) wanted.push('you')
        if (!wanted.length) throw new Error('Ative pelo menos uma fonte de áudio nas configurações.')
        const started: AudioSource[] = []
        const errors: string[] = []
        for (const sp of wanted) {
          const src = new AudioSource(sp, { onSegment, onLevel })
          try {
            await src.start()
            started.push(src)
          } catch (err) {
            errors.push((err as Error).message)
          }
        }
        if (!started.length) throw new Error(errors.join('\n'))
        if (errors.length) showError(errors.join('\n'))
        sources.current = started
      }
      setStartedAt(Date.now())
      setListening(true)
    } catch (err) {
      showError((err as Error).message)
    } finally {
      setStarting(false)
    }
  }, [listening, starting, onSegment, onLevel, showError, startDemo])

  const stop = useCallback(async () => {
    stopDemo()
    const srcs = sources.current
    sources.current = []
    await Promise.all(srcs.map((s) => s.stop()))
    levels.current = { them: 0, you: 0 }
    setListening(false)
    setStartedAt(null)
    // espera as últimas transcrições antes de salvar
    await Promise.all([sttQueue.current.them, sttQueue.current.you])
    void finalizeSession()
  }, [finalizeSession, stopDemo])

  const toggle = useCallback(() => (listening ? void stop() : void start()), [listening, start, stop])

  const reset = useCallback(async () => {
    if (listening) await stop()
    else await persist()
    window.clearTimeout(autoTimer.current)
    if (active.current) abortChat(active.current.streamId)
    active.current = null
    lastAnswered.current = ''
    transcriptRef.current = []
    cardsRef.current = []
    setTranscript([])
    setCards([])
    sessionId.current = uid()
    sessionStart.current = Date.now()
  }, [listening, persist, stop])

  const stopAnswer = useCallback(() => {
    if (active.current) abortChat(active.current.streamId)
    updateCards((list) => list.map((c) => (c.status === 'streaming' ? { ...c, status: 'done' } : c)))
    active.current = null
    setThinking(false)
  }, [updateCards])

  // atalhos globais
  const handlers = useRef({ answer, toggle, analyzeScreen, recap })
  handlers.current = { answer, toggle, analyzeScreen, recap }
  useEffect(
    () =>
      window.mira.onHotkey((action) => {
        const h = handlers.current
        if (action === 'answer') h.answer()
        else if (action === 'toggle-listen') h.toggle()
        else if (action === 'screen') void h.analyzeScreen()
        else if (action === 'recap') h.recap()
      }),
    []
  )

  return {
    settings,
    saveSettings,
    keys,
    saveKey,
    hasKey,
    listening,
    starting,
    thinking,
    startedAt,
    transcript,
    cards,
    levels,
    error,
    info,
    dismissError: () => {
      setError(null)
      setInfo(null)
    },
    start,
    stop,
    toggle,
    answer,
    ask,
    analyzeScreen,
    recap,
    reset,
    stopAnswer
  }
}

export type Copilot = ReturnType<typeof useCopilot>
