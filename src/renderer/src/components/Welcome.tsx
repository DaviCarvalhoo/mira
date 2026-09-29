import mark from '../assets/mark.svg'
import { IconArrowRight, IconPlay } from './Icons'

export function Welcome({ onSetup, onDemo }: { onSetup: () => void; onDemo: () => void }) {
  return (
    <div className="welcome">
      <img src={mark} alt="" className="welcome-mark" />
      <span className="eyebrow">
        <span className="sig" /> Copiloto de IA · ao vivo
      </span>
      <h1>
        Ouve a conversa.
        <br />
        <span>Te diz o que responder.</span>
      </h1>
      <p className="welcome-sub">
        A Mira acompanha suas calls e entrevistas, entende quando alguém faz uma pergunta e mostra a resposta na hora.
      </p>

      <ol className="steps">
        <li>
          <span>
            <b>Escolha uma IA</b> e cole sua chave. O Groq é grátis e muito rápido.
          </span>
        </li>
        <li>
          <span>
            <b>Conte sobre você.</b> Currículo e vaga deixam as respostas com a sua cara.
          </span>
        </li>
        <li>
          <span>
            <b>Clique em Ouvir</b> e entre na call.
          </span>
        </li>
      </ol>

      <div className="welcome-actions">
        <button className="btn" onClick={onDemo}>
          <IconPlay size={12} /> Ver demo
        </button>
        <button className="btn btn-primary" onClick={onSetup}>
          Configurar <IconArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
