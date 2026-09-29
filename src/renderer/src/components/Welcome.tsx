import logo from '../assets/logo.svg'
import { IconPlay, IconSettings } from './Icons'

export function Welcome({ onSetup, onDemo }: { onSetup: () => void; onDemo: () => void }) {
  return (
    <div className="welcome">
      <div className="welcome-logo">
        <img src={logo} alt="Mira" />
      </div>
      <h1>
        Olá, eu sou a <span className="grad-text">Mira</span>
      </h1>
      <p className="welcome-sub">Sua copiloto de IA para reuniões e entrevistas. Eu ouço a conversa e te mostro a resposta certa, na hora.</p>

      <ol className="steps">
        <li>
          <b>Escolha uma IA</b> e cole sua chave — o Groq é grátis e muito rápido.
        </li>
        <li>
          <b>Conte sobre você:</b> currículo e vaga deixam as respostas com a sua cara.
        </li>
        <li>
          <b>Clique em Ouvir</b> e entre na call. O resto é comigo.
        </li>
      </ol>

      <div className="welcome-actions">
        <button className="btn btn-primary" onClick={onSetup}>
          <IconSettings size={16} /> Configurar agora
        </button>
        <button className="btn" onClick={onDemo}>
          <IconPlay size={14} /> Ver demonstração
        </button>
      </div>
    </div>
  )
}
