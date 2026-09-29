import { useEffect, useState, type ReactNode } from 'react'
import { LLM_PROVIDERS, STT_PROVIDERS } from '@shared/providers'
import { TEMPLATES } from '@shared/prompt'
import type { AnswerLength, LlmProviderId, Settings, SttProviderId, TemplateId } from '@shared/types'
import type { Copilot } from '../hooks/useCopilot'
import { modKey } from '../lib/util'
import { IconArrowLeft, IconCheck, IconUpload } from './Icons'

type Tab = 'ai' | 'profile' | 'behavior' | 'shortcuts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'ai', label: 'IA' },
  { id: 'profile', label: 'Perfil' },
  { id: 'behavior', label: 'Comportamento' },
  { id: 'shortcuts', label: 'Atalhos' }
]

const LANGS = [
  { v: 'pt', l: 'Português' },
  { v: 'en', l: 'Inglês' },
  { v: 'es', l: 'Espanhol' },
  { v: 'auto', l: 'Detectar automaticamente' }
]

function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button type="button" className="toggle-row" onClick={() => onChange(!checked)}>
      <span>
        <span className="toggle-label">{label}</span>
        {hint && <span className="field-hint">{hint}</span>}
      </span>
      <span className={`toggle ${checked ? 'is-on' : ''}`}>
        <span />
      </span>
    </button>
  )
}

function KeyInput({ provider, copilot }: { provider: LlmProviderId; copilot: Copilot }) {
  const info = LLM_PROVIDERS[provider]
  const saved = !!copilot.keys[provider]
  const [value, setValue] = useState('')
  const [ok, setOk] = useState(false)
  useEffect(() => setValue(''), [provider])

  if (!info.needsKey && provider !== 'custom') return null
  return (
    <Field
      label={`Chave de API — ${info.label.split(' (')[0]}`}
      hint={
        <>
          {saved ? '✓ Chave salva e criptografada no seu computador. ' : 'Guardada criptografada, nunca sai do seu PC. '}
          {info.keyUrl && (
            <a onClick={() => window.mira.openExternal(info.keyUrl!)} className="link">
              Pegar chave
            </a>
          )}
        </>
      }
    >
      <div className="key-row">
        <input
          type="password"
          value={value}
          placeholder={saved ? '•••••••••••••••• (salva)' : 'Cole sua chave aqui'}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
        <button
          type="button"
          className="btn btn-sm"
          disabled={!value.trim() && !saved}
          onClick={async () => {
            await copilot.saveKey(provider, value)
            setValue('')
            setOk(true)
            window.setTimeout(() => setOk(false), 1400)
          }}
        >
          {ok ? <IconCheck size={14} /> : value.trim() ? 'Salvar' : 'Remover'}
        </button>
      </div>
    </Field>
  )
}

export function SettingsPanel({ copilot, onClose }: { copilot: Copilot; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('ai')
  const [s, setS] = useState<Settings>(copilot.settings!)
  const mod = modKey()

  // salva automaticamente (com debounce) a cada alteração
  useEffect(() => {
    if (s === copilot.settings) return
    const t = window.setTimeout(() => void copilot.saveSettings(s), 350)
    return () => window.clearTimeout(t)
  }, [s])

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((cur) => ({ ...cur, [k]: v }))
  const setProfile = (k: keyof Settings['profile'], v: string) => setS((cur) => ({ ...cur, profile: { ...cur.profile, [k]: v } }))

  const llm = LLM_PROVIDERS[s.llm.provider]
  const stt = STT_PROVIDERS[s.stt.provider]
  const sttKeyMissing = s.stt.provider !== 'custom' && !copilot.keys[stt.keyFrom]

  const importFile = async (k: 'resume' | 'jobDescription' | 'notes', file: File | undefined) => {
    if (!file) return
    if (!/\.(txt|md|markdown|csv|json)$/i.test(file.name)) {
      alertInline(`Formato não suportado: ${file.name}. Use .txt ou .md (copie o texto do PDF).`)
      return
    }
    setProfile(k, (await file.text()).slice(0, 20000))
  }
  const [inlineMsg, setInlineMsg] = useState('')
  const alertInline = (m: string) => {
    setInlineMsg(m)
    window.setTimeout(() => setInlineMsg(''), 5000)
  }

  const FileBtn = ({ k }: { k: 'resume' | 'jobDescription' | 'notes' }) => (
    <label className="btn btn-sm btn-ghost file-btn">
      <IconUpload size={13} /> Importar .txt/.md
      <input type="file" accept=".txt,.md,.markdown" hidden onChange={(e) => void importFile(k, e.target.files?.[0])} />
    </label>
  )

  return (
    <div className="panel">
      <header className="panel-head">
        <button className="icon-btn" onClick={onClose} title="Voltar">
          <IconArrowLeft />
        </button>
        <h2>Configurações</h2>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="panel-body">
        {tab === 'ai' && (
          <>
            <h3 className="section-title">Modelo de linguagem</h3>
            <Field label="Provedor">
              <select
                value={s.llm.provider}
                onChange={(e) => {
                  const p = LLM_PROVIDERS[e.target.value as LlmProviderId]
                  set('llm', { provider: p.id, model: p.defaultModel, baseUrl: p.baseUrl })
                }}
              >
                {Object.values(LLM_PROVIDERS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Modelo">
              <input
                list="llm-models"
                value={s.llm.model}
                onChange={(e) => set('llm', { ...s.llm, model: e.target.value })}
                spellCheck={false}
              />
              <datalist id="llm-models">
                {llm.models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </Field>
            <KeyInput provider={s.llm.provider} copilot={copilot} />
            <Field label="Endpoint (avançado)">
              <input value={s.llm.baseUrl} onChange={(e) => set('llm', { ...s.llm, baseUrl: e.target.value })} spellCheck={false} />
            </Field>

            <h3 className="section-title">Transcrição (voz → texto)</h3>
            <Field label="Provedor">
              <select
                value={s.stt.provider}
                onChange={(e) => {
                  const p = STT_PROVIDERS[e.target.value as SttProviderId]
                  set('stt', { ...s.stt, provider: p.id, model: p.defaultModel, baseUrl: p.baseUrl })
                }}
              >
                {Object.values(STT_PROVIDERS).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            {sttKeyMissing && (
              <div className="notice">
                A transcrição usa a chave do <b>{LLM_PROVIDERS[stt.keyFrom].label.split(' (')[0]}</b>, que ainda não foi salva.
                {s.llm.provider !== stt.keyFrom && ' Selecione esse provedor acima para colar a chave (depois pode voltar).'}
              </div>
            )}
            <div className="grid-2">
              <Field label="Modelo">
                <input
                  list="stt-models"
                  value={s.stt.model}
                  onChange={(e) => set('stt', { ...s.stt, model: e.target.value })}
                  spellCheck={false}
                />
                <datalist id="stt-models">
                  {stt.models.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </Field>
              <Field label="Idioma da conversa">
                <select value={s.stt.language} onChange={(e) => set('stt', { ...s.stt, language: e.target.value })}>
                  {LANGS.map((l) => (
                    <option key={l.v} value={l.v}>
                      {l.l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {s.stt.provider === 'custom' && (
              <Field label="Endpoint de transcrição">
                <input value={s.stt.baseUrl} onChange={(e) => set('stt', { ...s.stt, baseUrl: e.target.value })} spellCheck={false} />
              </Field>
            )}
          </>
        )}

        {tab === 'profile' && (
          <>
            <p className="panel-intro">Quanto mais contexto, mais as respostas soam como você.</p>
            <div className="grid-2">
              <Field label="Seu nome">
                <input value={s.profile.name} onChange={(e) => setProfile('name', e.target.value)} placeholder="Ex.: Ana Souza" />
              </Field>
              <Field label="Cargo / objetivo">
                <input value={s.profile.role} onChange={(e) => setProfile('role', e.target.value)} placeholder="Ex.: Dev Front-end Pleno" />
              </Field>
            </div>
            <Field label="Currículo / experiências" hint={<FileBtn k="resume" />}>
              <textarea
                rows={6}
                value={s.profile.resume}
                onChange={(e) => setProfile('resume', e.target.value)}
                placeholder="Cole seu currículo, projetos, conquistas com números…"
              />
            </Field>
            <Field label="Descrição da vaga / contexto da reunião" hint={<FileBtn k="jobDescription" />}>
              <textarea
                rows={5}
                value={s.profile.jobDescription}
                onChange={(e) => setProfile('jobDescription', e.target.value)}
                placeholder="Requisitos da vaga, sobre a empresa, pauta da reunião…"
              />
            </Field>
            <Field label="Notas extras" hint={<FileBtn k="notes" />}>
              <textarea
                rows={3}
                value={s.profile.notes}
                onChange={(e) => setProfile('notes', e.target.value)}
                placeholder="Pretensão salarial, perguntas que quero fazer, detalhes do produto…"
              />
            </Field>
            {inlineMsg && <div className="notice">{inlineMsg}</div>}
          </>
        )}

        {tab === 'behavior' && (
          <>
            <h3 className="section-title">Modo</h3>
            <div className="templates">
              {Object.values(TEMPLATES).map((t) => (
                <button
                  key={t.id}
                  className={`template ${s.template === t.id ? 'is-active' : ''}`}
                  onClick={() => set('template', t.id as TemplateId)}
                >
                  <span className="template-emoji">{t.emoji}</span>
                  <span className="template-label">{t.label}</span>
                  <span className="template-desc">{t.description}</span>
                </button>
              ))}
            </div>

            <div className="grid-2">
              <Field label="Tamanho da resposta">
                <select value={s.answerLength} onChange={(e) => set('answerLength', e.target.value as AnswerLength)}>
                  <option value="short">Curta (ler em 5s)</option>
                  <option value="medium">Média</option>
                  <option value="detailed">Detalhada</option>
                </select>
              </Field>
              <Field label="Idioma da resposta">
                <select value={s.answerLanguage} onChange={(e) => set('answerLanguage', e.target.value)}>
                  <option value="auto">Mesmo da pergunta</option>
                  <option value="português do Brasil">Português</option>
                  <option value="inglês">Inglês</option>
                  <option value="espanhol">Espanhol</option>
                </select>
              </Field>
            </div>

            <h3 className="section-title">Escuta</h3>
            <Toggle
              checked={s.autoAnswer}
              onChange={(v) => set('autoAnswer', v)}
              label="Responder automaticamente"
              hint="Detecta perguntas e gera a resposta sem apertar nada."
            />
            <Toggle
              checked={s.captureSystem}
              onChange={(v) => set('captureSystem', v)}
              label="Ouvir o áudio do computador (eles)"
              hint="Captura o som da call: Meet, Zoom, Teams, Discord…"
            />
            <Toggle
              checked={s.captureMic}
              onChange={(v) => set('captureMic', v)}
              label="Ouvir o microfone (você)"
              hint="Use fone de ouvido para evitar eco."
            />
            <Toggle
              checked={s.demoMode}
              onChange={(v) => set('demoMode', v)}
              label="Modo demonstração"
              hint="Simula uma entrevista. Sem chave de API usa respostas prontas."
            />

            <h3 className="section-title">Aparência</h3>
            <Field label={`Opacidade da janela — ${Math.round(s.opacity * 100)}%`}>
              <input
                type="range"
                min={0.4}
                max={1}
                step={0.02}
                value={s.opacity}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  window.mira.window.setOpacity(v)
                  set('opacity', v)
                }}
              />
            </Field>
          </>
        )}

        {tab === 'shortcuts' && (
          <div className="shortcuts">
            {[
              [`${mod} Shift Space`, 'Mostrar / esconder a Mira'],
              [`${mod} Shift L`, 'Começar / parar de ouvir'],
              [`${mod} Shift Enter`, 'Responder agora'],
              [`${mod} Shift H`, 'Analisar a tela (print + IA)'],
              [`${mod} Shift R`, 'Resumo da conversa'],
              [`${mod} Shift M`, 'Modo fantasma (cliques atravessam)'],
              [`${mod} Alt ←↑→↓`, 'Mover a janela']
            ].map(([keys, label]) => (
              <div key={label} className="shortcut">
                <span className="shortcut-keys">
                  {keys.split(' ').map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </span>
                <span>{label}</span>
              </div>
            ))}
            <p className="field-hint">Os atalhos funcionam em qualquer app, mesmo com a Mira em segundo plano.</p>
          </div>
        )}
      </div>
    </div>
  )
}
