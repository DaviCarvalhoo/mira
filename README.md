<p align="center">
  <img src="docs/banner.png" alt="Mira" width="100%" />
</p>

<p align="center">
  <strong>Copiloto de IA para reuniões e entrevistas, com respostas em tempo real.</strong>
</p>

<p align="center">
  <a href="https://github.com/DaviCarvalhoo/mira/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/DaviCarvalhoo/mira?style=flat-square&color=111111&label=release" /></a>
  <img alt="Plataformas" src="https://img.shields.io/badge/plataformas-Windows%20%7C%20macOS%20%7C%20Linux-111111?style=flat-square" />
  <img alt="Electron" src="https://img.shields.io/badge/Electron-44-111111?style=flat-square&logo=electron&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-111111?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Licença" src="https://img.shields.io/badge/licen%C3%A7a-MIT-FF5A1F?style=flat-square" />
</p>

<p align="center">
  <a href="#visão-geral">Visão geral</a> ·
  <a href="#funcionalidades">Funcionalidades</a> ·
  <a href="#instalação">Instalação</a> ·
  <a href="#configuração">Configuração</a> ·
  <a href="#arquitetura">Arquitetura</a> ·
  <a href="#desenvolvimento">Desenvolvimento</a>
</p>

---

## Visão geral

A Mira acompanha chamadas de vídeo em tempo real. Ela transcreve separadamente o que o interlocutor diz (áudio do sistema) e o que você diz (microfone), identifica quando uma pergunta foi feita e gera a resposta ideal em *streaming*, numa janela flutuante que fica sobre qualquer aplicativo.

A resposta é estruturada para leitura imediata: a primeira linha é a frase pronta para ser dita e, logo abaixo, vêm os pontos de apoio. O contexto vem do seu currículo, da descrição da vaga e das suas notas, então o conteúdo soa como você, e não como um texto genérico.

<p align="center">
  <img src="docs/screenshots/welcome.png" width="32%" alt="Tela inicial" />
  &nbsp;
  <img src="docs/screenshots/demo.png" width="32%" alt="Resposta ao vivo" />
  &nbsp;
  <img src="docs/screenshots/settings.png" width="32%" alt="Configurações" />
</p>

## Funcionalidades

| Recurso | Descrição |
|---|---|
| **Transcrição por interlocutor** | Captura separadamente o áudio do sistema (Meet, Zoom, Teams, Discord, Slack) e o microfone. |
| **Detecção de perguntas** | Identifica perguntas e pedidos em português e inglês, e ignora frases de cortesia como "tudo bem?". |
| **Respostas em streaming** | A resposta é exibida enquanto é gerada. Se o interlocutor continuar a pergunta, ela é regenerada. |
| **Contexto pessoal** | Usa currículo, descrição da vaga e notas. Responde em primeira pessoa e segue o formato STAR em perguntas comportamentais. |
| **Modos de uso** | Entrevista de emprego, entrevista técnica, vendas e reunião, cada um com instruções próprias. |
| **Análise de tela** | Captura a tela (sem a própria janela da Mira) e resolve o desafio ou a pergunta visível. |
| **Resumo e histórico** | Gera um resumo com pontos principais e próximos passos. As sessões são salvas com título gerado por IA e podem ser exportadas em Markdown. |
| **Multiprovedor** | Groq, OpenAI, Google Gemini, Anthropic Claude, OpenRouter, Ollama, LM Studio ou qualquer endpoint compatível com a API da OpenAI. |
| **Execução local** | Com Ollama ou LM Studio e um servidor Whisper local, tudo roda offline. |
| **Modo demonstração** | Simula uma entrevista completa sem microfone e sem chave de API. |

### Aplicativo nativo, independente do navegador

A Mira é um aplicativo desktop, e não uma extensão ou página web. Por isso, as restrições do navegador não se aplicam:

- **Rede no processo principal:** todas as chamadas de IA são feitas pelo Node.js, sem CORS, bloqueadores de anúncio ou políticas de extensão no caminho.
- **Áudio do sistema via loopback nativo:** a captura é concedida diretamente pelo sistema operacional, sem o seletor de compartilhamento do navegador.
- **Execução em segundo plano:** o *throttling* de janelas inativas fica desativado, então a escuta continua mesmo sem foco.
- **Credenciais protegidas:** as chaves de API são criptografadas pelo cofre do sistema (DPAPI no Windows, Keychain no macOS) e nunca são expostas à interface.

## Instalação

### Download

Baixe a versão mais recente na página de [Releases](https://github.com/DaviCarvalhoo/mira/releases/latest):

| Arquivo | Uso |
|---|---|
| `Mira-Setup-<versão>.exe` | Instalador para Windows, com atalhos na área de trabalho e no menu Iniciar. |
| `Mira-Portable-<versão>.exe` | Versão portátil, que roda sem instalar. |

> O executável ainda não tem assinatura digital. Na primeira execução, o Windows SmartScreen pode exibir um aviso: selecione **Mais informações** e depois **Executar assim mesmo**.

### A partir do código-fonte

Requer Node.js 20 ou superior.

```bash
git clone git@github.com:DaviCarvalhoo/mira.git
cd mira
npm install
npm run dev
```

Para gerar os instaladores:

```bash
npm run dist        # Windows: instalador NSIS + versão portátil
npm run dist:mac    # macOS: .dmg
npm run dist:linux  # Linux: .AppImage
```

Os arquivos são gerados na pasta `release/`.

## Configuração

1. **Provedor de IA.** Em *Configurações > IA*, escolha o provedor e informe a chave de API. O [Groq](https://console.groq.com/keys) é a opção recomendada para começar: tem plano gratuito, baixa latência e a mesma chave cobre transcrição e geração de respostas.
2. **Perfil.** Em *Configurações > Perfil*, informe seu nome, o cargo, o currículo e a descrição da vaga. É possível importar arquivos `.txt` e `.md`.
3. **Comportamento.** Escolha o modo de uso, o tamanho e o idioma das respostas e as fontes de áudio.
4. **Escuta.** Clique em **Ouvir** e entre na chamada.

Recomenda-se o uso de fones de ouvido. Sem eles, o microfone capta o som da chamada. A Mira remove essas duplicações automaticamente, mas o áudio fica mais limpo com fone.

### Atalhos globais

Os atalhos funcionam em qualquer aplicativo, mesmo com a Mira em segundo plano. No macOS, use `Cmd` no lugar de `Ctrl`.

| Atalho | Ação |
|---|---|
| `Ctrl` `Shift` `Space` | Mostrar ou ocultar a janela |
| `Ctrl` `Shift` `L` | Iniciar ou parar a escuta |
| `Ctrl` `Shift` `Enter` | Responder imediatamente |
| `Ctrl` `Shift` `H` | Analisar a tela |
| `Ctrl` `Shift` `R` | Gerar resumo da conversa |
| `Ctrl` `Shift` `M` | Modo fantasma: cliques atravessam a janela |
| `Ctrl` `Alt` `Setas` | Mover a janela |

### Provedores suportados

| Provedor | Respostas | Transcrição | Observação |
|---|:---:|:---:|---|
| Groq | Sim | Sim | Recomendado. Plano gratuito e baixa latência. |
| OpenAI | Sim | Sim | Suporta análise de tela. |
| Google Gemini | Sim | — | Endpoint compatível com a API da OpenAI. |
| Anthropic Claude | Sim | — | Suporta análise de tela. |
| OpenRouter | Sim | — | Acesso a diversos modelos com uma única chave. |
| Ollama / LM Studio | Sim | — | Execução local e offline. |
| Personalizado | Sim | Sim | Qualquer servidor compatível com a API da OpenAI, incluindo Whisper local. |

### Plataformas

| Sistema | Situação |
|---|---|
| Windows 10/11 | Suporte completo, com áudio do sistema nativo. |
| macOS | Microfone, respostas e análise de tela funcionam. A captura do áudio do sistema depende do suporte a loopback da plataforma e ainda não foi validada. |
| Linux | Mesma situação do macOS. |

## Arquitetura

```
 Renderer (React)                                        Main (Electron / Node.js)
 ┌────────────────────────────────────────────────┐      ┌─────────────────────────────────────┐
 │ Microfone ─┐                                   │      │ desktopCapturer (loopback de áudio) │
 │            ├─ AudioWorklet ─ VAD adaptativo    │      │                                     │
 │ Sistema ───┘      └─ segmento WAV 16 kHz ──────┼─IPC─▶│ POST /audio/transcriptions          │
 │                                                │      │                                     │
 │ transcrição ─ filtro de eco ─ detector         │◀─────┼─ texto transcrito                   │
 │   de perguntas ─ montagem do prompt ───────────┼─IPC─▶│ POST /chat/completions (SSE)        │
 │                                                │      │ POST /messages (SSE, Anthropic)     │
 │ card de resposta em streaming ◀────────────────┼──────┼─ deltas do stream                   │
 └────────────────────────────────────────────────┘      │ safeStorage · atalhos · sessões     │
                                                         └─────────────────────────────────────┘
```

### Pipeline

1. **Captura.** Microfone e áudio do sistema são processados por um `AudioWorklet` em frames de aproximadamente 32 ms.
2. **Detecção de voz.** Um VAD por energia, com piso de ruído adaptativo, corta a fala nas pausas naturais. Segmentos longos são divididos a cada 12 segundos para manter a latência baixa.
3. **Transcrição.** Cada segmento é codificado em WAV mono de 16 kHz e enviado ao provedor, junto com o final da conversa como contexto.
4. **Limpeza.** Alucinações típicas do Whisper em trechos silenciosos são descartadas, e ecos do áudio da chamada captados pelo microfone são removidos nas duas direções.
5. **Detecção de perguntas.** Heurísticas em português e inglês, com espera de cerca de 900 ms após o fim da fala para não interromper o interlocutor.
6. **Geração.** O prompt reúne as instruções do modo de uso, o perfil, a descrição da vaga e a conversa recente. A resposta chega por SSE e é renderizada incrementalmente.

### Estrutura do projeto

```
src/
├── main/          Processo principal: janela, captura, rede, armazenamento
│   ├── index.ts   Janela overlay, atalhos globais, IPC, captura de tela
│   ├── ai.ts      Streaming de LLM (OpenAI e Anthropic) e transcrição
│   └── store.ts   Configurações, chaves criptografadas e sessões
├── preload/       Ponte tipada e isolada entre os processos
├── renderer/      Interface em React
│   └── src/
│       ├── hooks/useCopilot.ts   Orquestração: áudio, transcrição, respostas
│       ├── lib/                  Captura de áudio, cliente LLM, markdown, demo
│       └── components/           Componentes da interface
└── shared/        Lógica pura, sem dependências de plataforma
    ├── audio.ts      VAD, codificador WAV, reamostragem
    ├── question.ts   Detecção de perguntas, filtro de eco e alucinações
    ├── prompt.ts     Modos de uso e construção de prompts
    ├── sse.ts        Parser incremental de Server-Sent Events
    └── providers.ts  Catálogo de provedores e configurações padrão
```

### Decisões técnicas

- **Segmentação por VAD em vez de streaming contínuo.** Enviar frases completas reduz alucinações, melhora a pontuação e mantém o custo baixo.
- **Rede exclusivamente no processo principal.** Elimina problemas de CORS e mantém as chaves de API fora do contexto da interface.
- **Parser SSE próprio.** Um único parser incremental atende aos formatos da OpenAI e da Anthropic e tolera eventos fragmentados em qualquer ponto.
- **Markdown sem `innerHTML`.** As respostas do modelo viram elementos React, sem risco de injeção de HTML.
- **Lógica isolada em `src/shared`.** Todo o processamento central não depende do Electron nem do DOM e tem cobertura de testes.

## Privacidade

- As transcrições e as sessões ficam armazenadas apenas localmente, na pasta de dados do aplicativo.
- O áudio é enviado somente ao provedor de transcrição configurado, e o texto somente ao provedor de IA escolhido.
- Com provedores locais (Ollama, LM Studio e Whisper local), nenhum dado sai do computador.
- As chaves de API são armazenadas criptografadas pelo sistema operacional.

## Desenvolvimento

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o aplicativo com recarregamento automático |
| `npm run build` | Compila os processos main, preload e renderer |
| `npm test` | Executa a suíte de testes (Vitest) |
| `npm run typecheck` | Verifica os tipos em todos os projetos TypeScript |
| `npm run dist` | Gera os instaladores do Windows |
| `npm run art` | Regenera o ícone e o banner a partir do código |

### Testes

A suíte cobre os módulos centrais: segmentação de voz, codificação WAV, reamostragem, parser SSE (incluindo eventos fragmentados), detecção de perguntas, filtro de cortesia, remoção de eco, limpeza de alucinações e construção de prompts.

```bash
npm test
```

## Identidade visual

A identidade é monocromática, sobre fundo preto, com tipografia [Geist](https://vercel.com/font). Há uma única cor de acento, o laranja de sinal `#FF5A1F`, reservada para os elementos ao vivo: o indicador de escuta, o rótulo da resposta e o cursor de digitação.

- **Símbolo:** um retículo de precisão com o ponto de sinal ao centro.
- **Logotipo:** `mira` em minúsculas, com o pingo do "i" sendo o ponto de sinal, que pulsa enquanto a escuta está ativa.

O ícone é gerado por código em [`scripts/make-art.mjs`](scripts/make-art.mjs) e o banner em [`scripts/art/banner.html`](scripts/art/banner.html).

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE).
