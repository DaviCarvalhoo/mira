import type { Profile, Speaker } from '@shared/types'

/**
 * Entrevista simulada para apresentar a Mira sem microfone nem chave de API.
 * As falas passam pelo mesmo pipeline do modo real (detecção de pergunta, auto-resposta).
 */
export interface DemoStep {
  speaker: Speaker
  text: string
  /** espera antes da fala (ms) */
  delay: number
}

export const DEMO_SCRIPT: DemoStep[] = [
  { speaker: 'them', text: 'Oi, tudo bem? Obrigado por participar do nosso processo seletivo.', delay: 900 },
  { speaker: 'you', text: 'Tudo ótimo! Eu que agradeço pelo convite.', delay: 2200 },
  { speaker: 'them', text: 'Pra começar, me fala um pouco sobre você e a sua trajetória?', delay: 1800 },
  { speaker: 'you', text: 'Claro! Eu trabalho com desenvolvimento full stack e nos últimos anos venho focando em produtos web.', delay: 9000 },
  { speaker: 'them', text: 'Legal. E qual foi o maior desafio técnico que você já resolveu?', delay: 4200 },
  { speaker: 'you', text: 'Um que eu gosto de contar foi quando o nosso app estava muito lento...', delay: 9500 },
  { speaker: 'them', text: 'Interessante. Como você lida quando discorda de alguém do time sobre uma decisão técnica?', delay: 4500 },
  { speaker: 'you', text: 'Eu costumo levar a discussão pra dados...', delay: 9500 },
  { speaker: 'them', text: 'E por que você quer trabalhar aqui com a gente?', delay: 4200 }
]

function first(p: Profile): string {
  return p.name.trim().split(/\s+/)[0] || 'Alex'
}

/** Respostas prontas usadas quando o modo demo roda sem chave de API. */
export function demoAnswer(question: string, profile: Profile): string {
  const q = question.toLowerCase()
  const role = profile.role.trim() || 'desenvolvedor full stack'

  if (/sobre voc|trajet|apresent|about yourself/.test(q)) {
    return `**Eu sou ${first(profile)}, ${role}, e gosto de transformar problema de negócio em produto que o usuário ama usar.**
- Mais de 4 anos com **React, TypeScript e Node.js**, do front ao deploy
- Último projeto: liderei a reescrita de um checkout que **aumentou a conversão em 18%**
- Hoje busco um time onde eu possa crescer em arquitetura e impacto de produto`
  }
  if (/desafio|problema|difícil|dificil|challenge/.test(q)) {
    return `**Reduzi o tempo de carregamento do nosso app em 60% migrando a renderização para o servidor.**
- **Situação:** páginas lentas derrubando a conversão no mobile
- **Ação:** medi com Lighthouse, apliquei SSR, cache na borda e code splitting
- **Resultado:** LCP de 4,1s para 1,6s e **+18% de conversão** em 2 meses`
  }
  if (/discord|conflit|desacordo|disagree/.test(q)) {
    return `**Eu tiro a discussão do campo da opinião e levo pra dados e para o objetivo do produto.**
- Escuto o argumento completo e repito com minhas palavras pra alinhar
- Proponho um critério objetivo: performance, custo, prazo ou um POC rápido
- Decidido, eu **apoio a decisão do time**, mesmo que não tenha sido a minha`
  }
  if (/por que|porque|aqui|empresa|why/.test(q)) {
    return `**Porque o produto de vocês resolve um problema real e o time tem a cultura de engenharia em que eu quero crescer.**
- Me identifico com o foco em qualidade e em ouvir o usuário
- Minha experiência em performance e front-end se conecta direto com os desafios da vaga
- Quero estar num lugar onde eu entregue impacto desde o primeiro trimestre`
  }
  return `**Boa pergunta. Eu responderia conectando com a minha experiência prática.**
- Dê um exemplo concreto de projeto
- Mostre o impacto com um número
- Feche ligando com a vaga`
}
