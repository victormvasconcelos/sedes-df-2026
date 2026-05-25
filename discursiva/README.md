# Discursiva — Feature #5 do SEDES PsyRank

Treinador de redação discursiva no padrão Quadrix EDAS. Página standalone com 10 casos canônicos do SUAS, editor de texto, e correção via IA externa com cache local.

## Por que é a feature mais decisiva

**70% da nota da discursiva vem de CONTEÚDO TÉCNICO** (CAC peso 7), não de redação bonita. E na nota total da Quadrix Cargo 409, a discursiva é onde **candidatos competentes se desempatam** — quem tem só técnica de redação perde para quem domina SUAS.

Risco específico identificado pela Helena na análise estratégica: como psicóloga clínica formada, a Clarissa tem **viés de psicologizar a pobreza** — reduzir problemas estruturais a questões individuais. É o erro mais cobrado e mais reprovador nessa banca. Esta feature combate isso diretamente:

- Os 10 casos foram desenhados com atravessamentos (pobreza × gênero / raça / idade / PCD / situação de rua) que **forçam** resposta psicossocial, não clínica.
- O prompt de correção contém restrição explícita: *"NÃO psicologize a pobreza. NÃO reduza problemas estruturais a questões individuais."*
- A grade verifica ponto por ponto se ela citou rede intersetorial, normas técnicas brasileiras, atribuição do psicólogo no SUAS, matricialidade sociofamiliar.

## Fluxo da Clarissa

```
1. Abre index.html → clica em 📝 Discursiva → vai pra página dedicada
2. Vê lista de 10 casos (com filtros: todos / não feitos / rascunhos / corrigidos)
3. Escolhe um caso → tela de redação
4. Lê: título, contexto (80-150 palavras), pergunta destacada
5. Escreve sua resposta no editor (autossalva como rascunho a cada tecla)
   Vê contador de linhas e palavras em tempo real
6. Clica "Pronta — corrigir"
7. Modal abre com:
   a. Prompt formatado contendo: caso completo + redação dela + grade + pontos esperados + armadilhas
   b. Botão "📋 Copiar prompt"
   c. Lista de onde colar (Codex / Claude.ai / ChatGPT / Gemini)
   d. Textarea pra colar a correção
   e. "Salvar correção"
8. Volta pra lista → caso aparece como ✓ Corrigido, nota média sobe nas stats
9. Pode reabrir o caso a qualquer momento → vê correção salva
```

## O prompt de correção (estrutura)

O template embute:

1. **Contexto da candidata** — PCD, Quadrix, EDAS Psicologia, formação clínica
2. **Caso completo** — título + contexto + pergunta (literais)
3. **Redação dela** — texto integral
4. **Grade Quadrix EDAS** — CAC/OT/DLP com pesos e critérios explícitos
5. **Pontos esperados** — vem do `pontos_obrigatorios` do caso (5-8 pontos técnicos específicos)
6. **Armadilhas testadas** — vem do `armadilhas_a_evitar` (pegadinhas típicas)
7. **Formato de resposta esperado** — NOTA PROVÁVEL X/100 + 3 PONTOS PERDIDOS + 1 PARÁGRAFO REESCRITO
8. **Restrições obrigatórias** — vocabulário SUAS BR (não social work americano), não psicologizar pobreza, normas técnicas específicas, ser brutal

Isso roda na IA externa (Codex, Claude.ai, ChatGPT, Gemini). O prompt é estruturado o suficiente que mesmo modelos com viés americanizante são forçados a entregar correção técnica brasileira.

## Os 10 casos do banco

| # | Título | Categoria | Dificuldade |
|---|---|---|---|
| 1 | Violência intrafamiliar contra criança | PAEFI / ECA / Conselho Tutelar | Média |
| 2 | Mulher em violência doméstica no CRAS | PAIF / Maria da Penha / rede mulher | Média |
| 3 | Pessoa em situação de rua com sofrimento psíquico | Centro POP / RAPS / Lei 10.216 | Alta |
| 4 | Adolescente em medida socioeducativa LA | SINASE / ECA / PIA | Alta |
| 5 | Pessoa idosa em situação de negligência | Estatuto Idoso / PAEFI / violência financeira | Média |
| 6 | Família em vulnerabilidade econômica | PAIF / matricialidade / Bolsa Família | Fácil |
| 7 | Pessoa com deficiência em família vulnerável | LBI / BPC / SCFV / Centro-Dia | Média |
| 8 | Conflito ético sobre sigilo profissional | Resolução CFP 010/2005 / trabalho em equipe | Média |
| 9 | Catador em vulnerabilidade extrema | LOAS / PNRS / cooperativa de catadores | Alta |
| 10 | Família atendida pelo Programa DF Social | Programas DF / Lei 7.484/2024 / PAIF | Média |

Cada caso traz:
- Contexto realista (80-150 palavras)
- Pergunta clara com 20-30 linhas esperadas
- 6-8 pontos obrigatórios que a correção verifica
- 4-5 armadilhas comuns que a correção identifica se ela caiu

## Estratégia de uso recomendada (para a Clarissa)

- **Semanas 1-8 (estudo de conteúdo):** ignorar a aba. Estudar SUAS primeiro.
- **Semanas 9-11:** começar com 1 caso por semana — escolher casos fáceis primeiro. Cobrar correção rigorosa do Codex/Claude.
- **Semanas 12-14:** 2 casos por semana, alternando dificuldades. Ler todas as correções anteriores antes de cada nova redação (transferência de aprendizado).
- **Semana 15:** todos os 10 casos no histórico, refazer os 3 piores (apaga correção, reescreve, compara).
- **Semana 16 (última):** 1 caso aleatório como simulação real, cronometrado em 35-40 min.

Meta: chegar à prova com **média de 75/100** nas correções (CAC entre 70-80, OT/DLP entre 80-90).

## Cache e backup

- **Rascunhos:** localStorage `sedes_discursiva_rascunhos_v1` — autossalva a cada tecla
- **Correções:** localStorage `sedes_discursiva_correcoes_v1` — salva quando Clarissa cola e clica "Salvar"
- **Stats em tempo real:** contagem de rascunhos, corrigidos, nota média visível na lista

Backup entre dispositivos via console (F12):
```javascript
DiscursivaSEDES.exportar();  // baixa JSON com rascunhos + correções
DiscursivaSEDES.importar();  // abre file picker
DiscursivaSEDES.stats();     // { rascunhos: 3, correcoes: 7 }
```

## Arquivos

```
discursiva/
├── discursiva.html     UI completa com paleta sage/amber/coral + dark mode
├── casos.js            window.CASOS_DISCURSIVA com os 10 casos + grade
├── casos.json          fonte editável (mesma estrutura — edite aqui e regenere casos.js)
├── discursiva.js       lógica de listagem, edição, correção, cache
└── README.md           este arquivo
```

Reusa `../explicar/explicar.css` para o modal de correção (consistência visual com Feature #2).

## Regenerar casos.js após editar casos.json

```powershell
cd "C:\Users\d3sen\OneDrive\Desktop\Projeto Sedes\discursiva"
python -c "import json; d=json.load(open('casos.json',encoding='utf-8')); open('casos.js','w',encoding='utf-8').write('window.CASOS_DISCURSIVA = '+json.dumps(d,ensure_ascii=False,indent=2)+';\n')"
```

## Limitações conhecidas

1. **10 casos só** — cobre os arquétipos principais do edital, mas Clarissa vai treinar com cada caso 1-3 vezes. Adicionar 5-10 casos a mais é trabalho futuro (qualquer um pode escrever seguindo a estrutura do `casos.json`).
2. **Sem rotação automática** — ela escolhe o caso. Versão futura: priorizar casos relacionados aos blocos fracos do EVE.
3. **Correção depende de IA externa** — fricção de copy-paste. Quando houver chave API, substituir por chamada direta (estrutura do código já está preparada: campo `fonte` no cache).
4. **Sem revisão entre pares** — só auto-correção via IA. Pra prática avançada, Clarissa pode mostrar correções para uma colega humana antes da prova.
5. **Grade fixa** — peso CAC=7 / OT=1.5 / DLP=1.5 está hardcoded no prompt. Se a Quadrix mudar a grade do edital, ajustar `casos.json` no campo `_grade_avaliacao`.

## Status

| Item | Status |
|---|---|
| Banco de 10 casos canônicos com qualidade técnica | ✅ |
| Página discursiva.html com paleta consistente + dark mode | ✅ |
| Lista filtrada (todos/não feitos/rascunho/corrigidos) | ✅ |
| Editor com autossalvamento + contador linhas/palavras | ✅ |
| Modal de correção com prompt anti-viés (10 restrições) | ✅ |
| Cache de rascunhos e correções em localStorage | ✅ |
| Export/import JSON via console | ✅ |
| Link no index.html (aba 📝 Discursiva) | ✅ |
| Reuso de CSS do explicar/ pra modal | ✅ |
| Modo API direta (Anthropic/Gemini) | ⏳ quando houver chave |
| Mais 5-10 casos | ⏳ backlog |
| Priorização automática por bloco fraco do EVE | ⏳ futura |
| Botão visível de export na UI | ⏳ futura |

---

*Feature #5 implementada 2026-05-22 por Claude. Banco de casos baseado em literatura técnica CFP/CRESS + Tipificação Nacional de Serviços Socioassistenciais + análise estratégica Helena v2. Restrições anti-viés do prompt mitigam os 3 riscos identificados na migração de modelo (psicologização da pobreza, vocabulário americanizado, ausência de normas brasileiras).*
