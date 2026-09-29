# 🎬 Roteiro do vídeo de apresentação (~3 min)

Sugestão de roteiro para apresentar a Mira numa entrevista de emprego.

## 0:00 · Abertura (20s)
> "Esta é a Mira, um copiloto de IA para reuniões. Ela ouve a conversa, entende quando alguém faz uma pergunta e mostra a melhor resposta em tempo real."

Mostre o **banner** do README e a janela flutuando sobre o desktop.

## 0:20 · Demo ao vivo (60s)
1. Abra a Mira: a tela de boas-vindas mostra a identidade visual.
2. Clique em **Ver demonstração** → **Iniciar demo**.
3. Aponte na tela:
   - a **onda sonora** separando *Eles* (rosa) e *Você* (ciano);
   - o "tudo bem?" do começo **não** gera resposta (filtro de cortesia);
   - a pergunta real vira **resposta em streaming**, com a primeira linha pronta pra falar;
   - resposta comportamental em **STAR** (Situação, Ação, Resultado).
4. Aperte **Resumo** para gerar o resumo da conversa.

## 1:20 · Uso real (40s)
1. **⚙ → IA**: troque de provedor (Groq, OpenAI, Gemini, Claude, Ollama local…) e mostre que a chave fica criptografada.
2. **⚙ → Perfil**: cole currículo + vaga ("as respostas ficam com a minha cara").
3. **Ouvir** com um vídeo do YouTube tocando uma pergunta de entrevista: a Mira capta o áudio do sistema e responde.
4. `Ctrl+Shift+H`: análise de tela resolvendo um desafio de código.

## 2:00 · Por dentro (45s)
- App **nativo** em Electron: rede no processo principal, sem CORS ou bloqueio do navegador; loopback de áudio nativo.
- **VAD próprio** com AudioWorklet, que corta a fala nas pausas → WAV 16kHz → Whisper.
- Detecção de pergunta PT/EN, **anti-eco bidirecional** e filtro de alucinações do Whisper.
- Streaming SSE com parser próprio para OpenAI e Anthropic.
- **Testes** com Vitest em toda a lógica central (`npm test`).

## 2:45 · Fechamento (15s)
> "Construí a Mira de ponta a ponta, do processamento de áudio à identidade visual. O código está no meu GitHub."

---

### Dicas de gravação
- Deixe a opacidade em 100% (⚙ → Comportamento) para o vídeo ficar nítido.
- Preencha **seu nome** em ⚙ → Perfil: o modo demo usa o nome nas respostas.
- Grave a 1080p com a Mira no canto direito e um app de call aberto atrás.
