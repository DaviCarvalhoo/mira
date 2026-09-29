import { useEffect, useState } from 'react'
import { AnswerFeed } from './components/AnswerFeed'
import { ControlBar } from './components/ControlBar'
import { HistoryPanel } from './components/HistoryPanel'
import { IconX } from './components/Icons'
import { SettingsPanel } from './components/SettingsPanel'
import { TitleBar } from './components/TitleBar'
import { TranscriptPanel } from './components/TranscriptPanel'
import { Waveform } from './components/Waveform'
import { Welcome } from './components/Welcome'
import { useCopilot } from './hooks/useCopilot'

type View = 'main' | 'settings' | 'history'

export default function App() {
  const copilot = useCopilot()
  const [view, setView] = useState<View>('main')
  const [clickThrough, setClickThrough] = useState(false)
  const { settings } = copilot

  useEffect(() => window.mira.window.onClickThrough(setClickThrough), [])

  if (!settings) return <div className="shell is-loading" />

  const showWelcome = !settings.onboarded && view === 'main'
  const finishOnboarding = async (demo: boolean) => {
    await copilot.saveSettings({ ...settings, onboarded: true, demoMode: demo || settings.demoMode })
    setView(demo ? 'main' : 'settings')
  }

  return (
    <div className={`shell ${copilot.listening ? 'is-live' : ''} ${clickThrough ? 'is-ghost' : ''}`}>
      <div className="aurora" />
      <TitleBar
        listening={copilot.listening}
        demo={settings.demoMode}
        startedAt={copilot.startedAt}
        clickThrough={clickThrough}
        onHistory={() => setView(view === 'history' ? 'main' : 'history')}
        onSettings={() => setView(view === 'settings' ? 'main' : 'settings')}
      />

      {view === 'settings' && <SettingsPanel copilot={copilot} onClose={() => setView('main')} />}
      {view === 'history' && <HistoryPanel onClose={() => setView('main')} />}

      {view === 'main' &&
        (showWelcome ? (
          <Welcome onSetup={() => void finishOnboarding(false)} onDemo={() => void finishOnboarding(true)} />
        ) : (
          <>
            <Waveform levels={copilot.levels} active={copilot.listening} />
            {!copilot.hasKey && !settings.demoMode && (
              <button className="banner-warn" onClick={() => setView('settings')}>
                Configure uma chave de API para receber respostas →
              </button>
            )}
            <main className="stage">
              <AnswerFeed cards={copilot.cards} onStop={copilot.stopAnswer} />
            </main>
            <TranscriptPanel transcript={copilot.transcript} listening={copilot.listening} onAnswer={copilot.answer} />
            <ControlBar
              listening={copilot.listening}
              starting={copilot.starting}
              demo={settings.demoMode}
              onToggle={copilot.toggle}
              onAnswer={() => copilot.answer()}
              onScreen={() => void copilot.analyzeScreen()}
              onRecap={copilot.recap}
              onReset={() => void copilot.reset()}
              onAsk={copilot.ask}
            />
          </>
        ))}

      {copilot.error && (
        <div className="toast" role="alert">
          <span>{copilot.error}</span>
          <button className="icon-btn icon-btn-sm" onClick={copilot.dismissError}>
            <IconX size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
