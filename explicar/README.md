# Explicar — Feature #2 do SEDES PsyRank

Botão "Explica essa questão" que aparece no feedback após cada resposta. Funciona **sem API paga**, **sem rede no momento do uso**, usando cache local crescente.

## Como funciona

```
┌─────────────────────────────────────────────────────────┐
│ 1. Clarissa responde questão Q123 — erra (gabarito D)   │
│ 2. Vê feedback "✗ Errada. Gabarito: D"                  │
│ 3. Vê botão "💡 Explica essa questão"                   │
│ 4. Clica                                                │
│                                                         │
│   Se cache existe →  Mostra explicação salva (grátis)   │
│   Se cache vazio  →  Modal:                             │
│      a. Prompt formatado pronto                         │
│      b. [Copiar prompt] → clipboard                     │
│      c. Cola no Codex / Claude.ai / ChatGPT / Gemini    │
│      d. Recebe explicação técnica                       │
│      e. Volta no app, cola no textarea                  │
│      f. [Salvar] → vai pro cache localStorage           │
│                                                         │
│ 5. Próxima vez = grátis (cache hit)                     │
└─────────────────────────────────────────────────────────┘
```

## O prompt que o app gera (template)

Cada questão produz um prompt formatado com:
- Contexto da candidata (PCD, Quadrix, Cargo 409, psicóloga clínica sem base SUAS)
- Enunciado completo + alternativas
- O que ela marcou + o gabarito correto
- Instrução estruturada de 5 partes:
  1. Conceito teórico em jogo
  2. Por que o gabarito é correto (com norma técnica)
  3. Por que a alternativa marcada está errada (pegadinha)
  4. Padrão típico da Quadrix nesse tópico
  5. O que decorar (1-2 pontos)
- **Restrições explícitas:** português técnico brasileiro, não usar vocabulário de social work americano, não psicologizar pobreza, 200-400 palavras.

Essas restrições no prompt mitigam o viés americanizante do GPT que a Helena identificou nos riscos da migração.

## Arquivos

```
explicar/
├── explicar.css     → estilos do modal + botão (paleta sage/amber/coral)
├── explicar.js      → módulo standalone (~440 linhas)
└── README.md        → este arquivo
```

Integração no `index.html` (raiz do projeto): **2 linhas** apenas.

- `<link rel="stylesheet" href="explicar/explicar.css">` antes de `</head>`
- `<script src="explicar/explicar.js"></script>` antes de `</body>`

O módulo se auto-injeta na aba Questões via MutationObserver no `#qz-questao-card` — sem alterar nenhuma função existente do `index.html`.

## Cache: estrutura

Chave localStorage: `sedes_explicacoes_v1`

```json
{
  "3772157": {
    "texto": "1. CONCEITO TEÓRICO\nDimensões da personalidade no modelo Big Five...",
    "fonte": "manual",
    "salvo_em": "2026-05-22T16:30:42.123Z"
  },
  "3749287": {
    "texto": "1. CONCEITO TEÓRICO\nLei 10.216/2001 (Lei da Reforma Psiquiátrica)...",
    "fonte": "manual",
    "salvo_em": "2026-05-22T17:12:08.456Z"
  }
}
```

## Export / import (backup entre dispositivos)

No console do navegador (F12):

```javascript
// Baixa JSON com todas as explicações cacheadas
ExplicarSEDES.exportar();

// Importa um JSON exportado (abre file picker)
ExplicarSEDES.importar();

// Estatísticas rápidas
ExplicarSEDES.stats();
// → { total: 47, chave: "sedes_explicacoes_v1" }
```

Use isso pra:
- Sincronizar PC ↔ celular (exporta de um, importa no outro)
- Backup antes de limpar dados do navegador
- Compartilhar com outra candidata (cuidado: o cache reflete suas dúvidas, pode ser revelador)

## Quando isso é uma boa ideia (estratégia de uso)

A Feature #2 brilha quando aplicada **só às questões erradas críticas**, não a todas. A meta-estratégia é:

1. **Erros em blocos prioritários do EVE** (Top 5) → SEMPRE clicar Explicar. Cache cresce no que mais importa.
2. **Erros em blocos não prioritários** → ignorar, não vale o tempo de copiar-colar.
3. **Acertos** → o botão também aparece (você pode querer entender melhor por que acertou), mas raramente vale.
4. **Após simulado** → revisar as 10-15 questões críticas erradas, gerando explicações para todas.

Com isso, ao longo de 16 semanas, o cache pode chegar a 300-500 explicações nos tópicos certos — vira um "manual personalizado" que cobre exatamente os pontos de fraqueza da Clarissa.

## Limitações conhecidas

1. **Fricção de copiar-colar** — não é zero. Cada explicação nova exige ~30 segundos de copy-paste-paste. Não usar pra todas as questões.
2. **Sem validação automática da explicação** — se a IA externa der uma resposta errada, o cache vai conter erro. Mitigação parcial: o prompt pede norma técnica + estrutura específica, isso ajuda calibração.
3. **Cache local apenas** — se ela limpar dados do navegador ou trocar de dispositivo sem exportar antes, perde tudo. **Solução**: rotina semanal de `ExplicarSEDES.exportar()` (ou criar um botão visível para isso — backlog).
4. **Sem deduplicação automática entre questões similares** — duas questões sobre o mesmo conceito geram dois prompts. Aceitável v1.

## Quando trocar pra API automática (futuro)

Quando você tiver crédito Anthropic OU Gemini free tier configurado:

1. Adicionar função `gerarViaAPI(prompt)` no `explicar.js`
2. Substituir o modal "copie e cole" por chamada direta + spinner
3. Resultado vai direto pro cache (fonte: `api-anthropic` ou `api-gemini`)
4. Manter modo manual como fallback

Estrutura do código já está preparada (campo `fonte` no cache).

## Status

| Item | Status |
|---|---|
| Módulo standalone (CSS + JS) | ✅ |
| Integração com index.html (2 linhas) | ✅ |
| Geração de prompt formatado com restrições anti-viés | ✅ |
| Clipboard API com fallback execCommand | ✅ |
| Cache localStorage com versionamento | ✅ |
| Export/import JSON via console | ✅ |
| Modal responsivo + dark mode | ✅ |
| Auto-injeção via MutationObserver | ✅ |
| Botão de export visível na UI | ⏳ backlog |
| Modo API automática (Anthropic/Gemini) | ⏳ quando houver chave |
| Validação cruzada da explicação (2ª IA confere) | ⏳ futura |

---

*Feature implementada 2026-05-22 por Claude. Estratégia anti-viés (vocabulário SUAS brasileiro, restrição contra psicologização da pobreza) integrada ao prompt template.*
