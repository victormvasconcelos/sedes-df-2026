/* ===== DISCURSIVA — Feature #5 do SEDES PsyRank =====
 *
 * Treinador de Discursiva EDAS/SUAS.
 *
 * Banco: casos.json (10 casos canônicos)
 * Rascunhos: localStorage chave 'sedes_discursiva_rascunhos_v1'
 * Correções: localStorage chave 'sedes_discursiva_correcoes_v1'
 *
 * Fluxo:
 *   1. Clarissa abre a página → vê lista de 10 casos
 *   2. Escolhe um → tela de redação com pergunta + editor
 *   3. Escreve 20-30 linhas → clica "Pronta — corrigir"
 *   4. Modal igual ao explicar.js: prompt formatado + copy + paste-back + save
 *   5. Volta pra lista, vê status atualizado (rascunho / corrigido)
 *
 * Prompt template embute as restrições anti-viés:
 *   - Grade CAC/OT/DLP com pesos corretos
 *   - Lista dos pontos obrigatórios E armadilhas a evitar (vem do casos.json)
 *   - Vocabulário SUAS brasileiro (não social work americano)
 *   - Output esperado: nota 0-100 + 3 pontos perdidos + 1 parágrafo reescrito
 */

(function() {
  'use strict';

  const RASCUNHOS_KEY = 'sedes_discursiva_rascunhos_v1';
  const CORRECOES_KEY = 'sedes_discursiva_correcoes_v1';

  let CASOS = null;
  let GRADE = null;
  let casoAtualId = null;

  // ---------- Storage ----------

  function lerRascunhos() {
    try { return JSON.parse(localStorage.getItem(RASCUNHOS_KEY) || '{}'); }
    catch(e) { return {}; }
  }
  function salvarRascunho(casoId, texto) {
    const r = lerRascunhos();
    if (texto.trim().length === 0) {
      delete r[casoId];
    } else {
      r[casoId] = { texto, salvo_em: new Date().toISOString() };
    }
    localStorage.setItem(RASCUNHOS_KEY, JSON.stringify(r));
  }
  function getRascunho(casoId) {
    return lerRascunhos()[casoId] || null;
  }

  function lerCorrecoes() {
    try { return JSON.parse(localStorage.getItem(CORRECOES_KEY) || '{}'); }
    catch(e) { return {}; }
  }
  function salvarCorrecao(casoId, texto, fonte) {
    const c = lerCorrecoes();
    c[casoId] = {
      texto: texto.trim(),
      fonte: fonte || 'manual',
      salvo_em: new Date().toISOString(),
    };
    localStorage.setItem(CORRECOES_KEY, JSON.stringify(c));
  }
  function getCorrecao(casoId) {
    return lerCorrecoes()[casoId] || null;
  }
  function deleteCorrecao(casoId) {
    const c = lerCorrecoes();
    delete c[casoId];
    localStorage.setItem(CORRECOES_KEY, JSON.stringify(c));
  }

  function statusCaso(caso) {
    if (getCorrecao(caso.id)) return 'feito';
    if (getRascunho(caso.id)) return 'rascunho';
    return 'nao_feito';
  }

  // ---------- Utilidades ----------

  function escapar(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDataLonga(d) {
    const dias = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
    const meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  }

  function contarPalavrasLinhas(texto) {
    const palavras = (texto.match(/\b\w+\b/g) || []).length;
    const linhas = texto ? texto.split('\n').length : 0;
    return { palavras, linhas };
  }

  // ---------- Geração do prompt ----------

  function gerarPromptCorrecao(caso, textoRedacao) {
    const pontosObrigatoriosFmt = caso.pontos_obrigatorios.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const armadilhasFmt = caso.armadilhas_a_evitar.map((a, i) => `${i + 1}. ${a}`).join('\n');

    return `Sou candidata do concurso SEDES-DF 2026, Cargo 409 EDAS Psicologia (vaga PCD, banca Quadrix, prova 06/09/2026). Escrevi uma resposta para a seguinte questão discursiva. Por favor, corrija com rigor técnico.

═══ CASO ═══
${caso.titulo}

CONTEXTO:
${caso.contexto}

PERGUNTA:
${caso.pergunta}

═══ MINHA RESPOSTA ═══
${textoRedacao}

═══ GRADE DE CORREÇÃO QUADRIX EDAS ═══

CAC (Conteúdo, Adequação e Coerência) — PESO 7 — avaliar:
- Respondeu tecnicamente à pergunta (não filosofou)?
- Citou rede intersetorial específica (não genérica)?
- Respeitou a atribuição do psicólogo no SUAS (escuta qualificada, plano de acompanhamento, articulação) — NÃO reduziu a clínica individual isolada?
- NÃO psicologizou a pobreza nem reduziu problemas estruturais a questões individuais?
- Citou ao menos uma norma técnica aplicável?
- Demonstrou compreensão da matricialidade sociofamiliar quando cabível?

OT (Organização Textual) — PESO 1.5 — avaliar:
- Introdução clara, desenvolvimento encadeado, conclusão com proposta de ação?
- Coesão entre parágrafos?

DLP (Domínio da Língua Portuguesa) — PESO 1.5 — avaliar:
- Português formal (sem gírias, sem 1ª pessoa do singular)?
- Concordância, regência, pontuação corretas?
- Vocabulário técnico apropriado?

═══ PONTOS QUE A QUESTÃO ESPERA — verificar UM A UM ═══
${pontosObrigatoriosFmt}

═══ ARMADILHAS QUE A QUESTÃO TESTA — verificar se a candidata caiu ═══
${armadilhasFmt}

═══ FORMATO DE RESPOSTA ESPERADA ═══

Responda EXATAMENTE neste formato:

NOTA PROVÁVEL: X/100
- CAC: x/100 (peso 7) — comentário curto
- OT: x/100 (peso 1.5) — comentário curto
- DLP: x/100 (peso 1.5) — comentário curto
- Cálculo: (CAC × 7 + OT × 1.5 + DLP × 1.5) / 10 = NOTA FINAL

3 PONTOS PERDIDOS (mais importantes para corrigir antes da prova):
1. [ponto técnico específico, com indicação de qual norma/conceito faltou]
2. [outro ponto]
3. [outro ponto]

1 PARÁGRAFO REESCRITO EXEMPLAR:
[Reescreva UM parágrafo problemático da redação dela, mostrando como deveria estar. Use português técnico brasileiro estrito — NÃO vocabulário de social work americano. NÃO psicologize pobreza.]

═══ RESTRIÇÕES OBRIGATÓRIAS NA SUA CORREÇÃO ═══
- Use vocabulário SUAS brasileiro: assistência social, psicossocial, rede intersetorial, matricialidade, PAIF, PAEFI, CRAS, CREAS, etc. NUNCA traduza para "social work", "case management", "social services".
- NÃO psicologize a pobreza. Mantenha as causas estruturais (econômicas, políticas) como tais.
- Cite normas técnicas brasileiras específicas: LOAS (Lei 8.742/93), PNAS, NOB-RH/SUAS, Tipificação Nacional, ECA, LBI, Lei 11.340/06 (Maria da Penha), Lei 12.594/12 (SINASE), Lei 10.741/03 (Idoso), Resolução CFP 010/2005.
- Seja brutal e específica — não suavize erros para "ser gentil". A candidata precisa saber exatamente onde perdeu pontos.
- Total da resposta: 350-500 palavras.`;
  }

  // Prompt para a BANCA MULTIAGENTE (skill /discursiva no Claude Code)
  function gerarPromptBanca(caso, textoRedacao) {
    const pontosObrigatoriosFmt = caso.pontos_obrigatorios.map((p, i) => `${i + 1}. ${p}`).join('\n');
    const armadilhasFmt = caso.armadilhas_a_evitar.map((a, i) => `${i + 1}. ${a}`).join('\n');

    return `/discursiva

Corrija minha redação rodando a BANCA MULTIAGENTE (workflow dinâmico: 3 avaliadores em paralelo — CAC/OT/DLP — + agente cético que remove notas infladas + síntese final). Cargo 409 EDAS Psicologia, SEDES-DF 2026. Workers em Haiku. Não invente normas.

═══ CASO ═══
${caso.titulo}

CONTEXTO:
${caso.contexto}

PERGUNTA:
${caso.pergunta}

═══ PONTOS OBRIGATÓRIOS (verificar um a um) ═══
${pontosObrigatoriosFmt}

═══ ARMADILHAS A EVITAR (verificar se caí) ═══
${armadilhasFmt}

═══ MINHA RESPOSTA ═══
${textoRedacao}`;
  }

  // ---------- Tela 1: Lista ----------

  function renderLista() {
    document.getElementById('tela-lista').classList.remove('hidden');
    document.getElementById('tela-redacao').classList.add('hidden');

    // Stats
    const totalCasos = CASOS.length;
    const corrigidos = CASOS.filter(c => statusCaso(c) === 'feito').length;
    const rascunhos = CASOS.filter(c => statusCaso(c) === 'rascunho').length;
    const notas = Object.values(lerCorrecoes())
      .map(c => {
        const m = c.texto.match(/NOTA\s+PROV[ÁA]VEL:\s*(\d+)/i);
        return m ? parseInt(m[1]) : null;
      })
      .filter(n => n !== null);
    const mediaNota = notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : null;

    document.getElementById('stats-row').innerHTML = `
      <div class="stat"><div class="v">${totalCasos}</div><div class="l">Casos no banco</div></div>
      <div class="stat"><div class="v">${corrigidos}</div><div class="l">Corrigidos</div></div>
      <div class="stat"><div class="v">${rascunhos}</div><div class="l">Rascunhos</div></div>
      <div class="stat"><div class="v">${mediaNota !== null ? mediaNota : '—'}</div><div class="l">Nota média</div></div>
    `;

    // Aplica filtro ativo
    const filtroAtivo = document.querySelector('.filtro-chip.ativo').dataset.filtro;
    const casosFiltrados = filtroAtivo === 'todos'
      ? CASOS
      : CASOS.filter(c => statusCaso(c) === filtroAtivo);

    const grade = document.getElementById('casos-grade');
    if (casosFiltrados.length === 0) {
      grade.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--texto-suave); padding: 32px;">Nenhum caso nesse filtro ainda.</div>`;
      return;
    }

    grade.innerHTML = casosFiltrados.map(caso => {
      const status = statusCaso(caso);
      const chipsStatus = {
        feito: '<span class="caso-chip status-feito">✓ Corrigido</span>',
        rascunho: '<span class="caso-chip status-rascunho">Rascunho</span>',
        nao_feito: '',
      };
      const dificuldadeClass = {
        'fácil': 'dif-facil', 'facil': 'dif-facil',
        'média': 'dif-media', 'media': 'dif-media',
        'alta': 'dif-alta',
      }[caso.dificuldade] || 'dif-media';

      return `
        <div class="caso-card" data-caso-id="${escapar(caso.id)}">
          <div class="caso-meta">
            <span class="caso-chip ${dificuldadeClass}">Dif. ${escapar(caso.dificuldade)}</span>
            <span class="caso-chip">${caso.tempo_estimado_min} min</span>
            ${chipsStatus[status]}
          </div>
          <div class="caso-titulo">${escapar(caso.titulo)}</div>
          <div class="caso-preview">${escapar(caso.contexto.slice(0, 140))}…</div>
        </div>
      `;
    }).join('');

    grade.querySelectorAll('.caso-card').forEach(card => {
      card.onclick = () => abrirCaso(card.dataset.casoId);
    });
  }

  // ---------- Tela 2: Redação ----------

  function abrirCaso(casoId) {
    const caso = CASOS.find(c => c.id === casoId);
    if (!caso) return;
    casoAtualId = casoId;

    document.getElementById('tela-lista').classList.add('hidden');
    document.getElementById('tela-redacao').classList.remove('hidden');
    window.scrollTo(0, 0);

    const detalhe = document.getElementById('caso-detalhe');
    const categorias = (caso.categoria_edital || []).join(' · ');
    detalhe.innerHTML = `
      <h2>${escapar(caso.titulo)}</h2>
      <div style="color: var(--texto-suave); font-size: 0.78rem;">${escapar(categorias)}</div>

      <div class="secao">Contexto</div>
      <p>${escapar(caso.contexto)}</p>

      <div class="secao">Pergunta discursiva</div>
      <div class="pergunta-box">${escapar(caso.pergunta)}</div>

      <div style="color: var(--texto-fraco); font-size: 0.78rem; margin-top: 12px;">
        Limite sugerido: ${caso.limite_linhas} linhas · Tempo recomendado: ${caso.tempo_estimado_min} min
      </div>
    `;

    // Correção existente?
    const correcao = getCorrecao(casoId);
    const correcaoBox = document.getElementById('correcao-existente');
    if (correcao) {
      const dt = new Date(correcao.salvo_em);
      const dtFmt = dt.toLocaleDateString('pt-BR') + ' às ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      correcaoBox.innerHTML = `
        <div class="correcao-cacheada">
          <h3>✓ Correção salva — ${escapar(dtFmt)}</h3>
          <div class="conteudo">${escapar(correcao.texto)}</div>
          <div class="acoes">
            <button class="acao-link" id="btn-refazer-corr">Refazer correção</button>
            <button class="acao-link danger" id="btn-apagar-corr">Apagar correção</button>
          </div>
        </div>
      `;
      correcaoBox.classList.remove('hidden');
      document.getElementById('btn-refazer-corr').onclick = () => {
        if (!confirm('Refazer a correção (apaga a atual e gera prompt novo)?')) return;
        deleteCorrecao(casoId);
        abrirCaso(casoId);
      };
      document.getElementById('btn-apagar-corr').onclick = () => {
        if (!confirm('Apagar a correção desse caso?')) return;
        deleteCorrecao(casoId);
        abrirCaso(casoId);
      };
    } else {
      correcaoBox.classList.add('hidden');
      correcaoBox.innerHTML = '';
    }

    // Rascunho
    const rascunho = getRascunho(casoId);
    const editor = document.getElementById('editor');
    editor.value = rascunho ? rascunho.texto : '';
    atualizarContador();
  }

  function atualizarContador() {
    const editor = document.getElementById('editor');
    const { palavras, linhas } = contarPalavrasLinhas(editor.value);
    document.getElementById('c-palavras').textContent = palavras;
    document.getElementById('c-linhas').textContent = linhas;
    const caso = CASOS.find(c => c.id === casoAtualId);
    const limite = caso ? caso.limite_linhas : 30;
    const contadorEl = document.getElementById('contador');
    if (linhas > limite + 2) contadorEl.classList.add('alerta');
    else contadorEl.classList.remove('alerta');
  }

  function corrigirAtual() {
    const caso = CASOS.find(c => c.id === casoAtualId);
    if (!caso) return;
    const texto = document.getElementById('editor').value.trim();
    if (texto.length < 200) {
      alert('Escreva pelo menos um parágrafo substancial (200 caracteres) antes de pedir correção.');
      return;
    }

    // Salva o rascunho final antes de gerar o prompt
    salvarRascunho(caso.id, texto);

    const prompt = gerarPromptCorrecao(caso, texto);

    // Modal igual ao explicar.js (overlay com prompt + paste-back)
    abrirModalCorrecao(caso, prompt);
  }

  function corrigirBanca() {
    const caso = CASOS.find(c => c.id === casoAtualId);
    if (!caso) return;
    const texto = document.getElementById('editor').value.trim();
    if (texto.length < 200) {
      alert('Escreva pelo menos um parágrafo substancial (200 caracteres) antes de pedir correção.');
      return;
    }
    salvarRascunho(caso.id, texto);
    const prompt = gerarPromptBanca(caso, texto);
    abrirModalCorrecao(caso, prompt, 'banca');
  }

  function abrirModalCorrecao(caso, prompt, modo) {
    const ehBanca = modo === 'banca';
    document.body.style.overflow = 'hidden';
    const old = document.getElementById('disc-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'disc-overlay';
    overlay.className = 'expl-overlay';
    overlay.onclick = e => { if (e.target === overlay) fecharModalCorrecao(); };

    overlay.innerHTML = `
      <div class="expl-modal" role="dialog" aria-modal="true">
        <div class="expl-header">
          <div class="expl-titulo">${ehBanca ? '🎯 Banca multiagente — /discursiva' : 'Corrigir discursiva'}</div>
          <button class="expl-close" id="disc-close">×</button>
        </div>
        <div class="expl-body">
          <div class="expl-questao-resumo">
            <div class="label">${escapar(caso.titulo)}</div>
            ${escapar(caso.pergunta.slice(0, 180))}${caso.pergunta.length > 180 ? '…' : ''}
          </div>

          <div class="expl-banner sem-cache">
            ${ehBanca
              ? 'Copie o prompt e cole no <strong>Claude Code (terminal)</strong>. A skill <code>/discursiva</code> roda a banca multiagente (3 avaliadores em paralelo + cético + síntese) e devolve a nota. Cole o resultado de volta aqui para salvar.'
              : 'Copie o prompt completo, cole numa IA externa (Codex / Claude.ai / ChatGPT / Gemini), cole a correção de volta aqui.'}
          </div>

          <div class="expl-secao">
            <h3>${ehBanca ? '1. Prompt pronto (chama /discursiva com sua redação + caso)' : '1. Prompt pronto (inclui sua redação + grade Quadrix)'}</h3>
            <div class="expl-prompt-box" id="disc-prompt">${escapar(prompt)}</div>
            <div class="expl-btn-row">
              <button class="expl-btn expl-btn-primary" id="disc-btn-copiar">📋 Copiar prompt</button>
            </div>
          </div>

          <div class="expl-secao">
            <h3>2. Onde colar</h3>
            <div class="expl-onde">
              ${ehBanca
                ? '<strong>Claude Code</strong> (terminal). Passo a passo:<br>1. Abra o Claude Code no terminal.<br>2. Cole o prompt acima e dê <strong>Enter</strong>.<br>3. Confirme quando ele perguntar <em>"dynamic workflow requested"</em>.<br>4. Acompanhe com <code>/workflows</code> (agentes, tokens, fases).<br>5. Quando terminar, cole a nota + feedback de volta aqui. 💡 Cheque o <code>/model</code> antes — os avaliadores já pedem Haiku para economizar.'
                : '<strong>Codex CLI</strong> (assinatura ChatGPT — gratuito dentro da assinatura)<br><strong>Claude.ai</strong> (free tier dá conta) — <a href="https://claude.ai" target="_blank" rel="noopener">claude.ai</a><br><strong>ChatGPT</strong> — <a href="https://chat.openai.com" target="_blank" rel="noopener">chat.openai.com</a><br><strong>Gemini</strong> (free tier generoso) — <a href="https://gemini.google.com" target="_blank" rel="noopener">gemini.google.com</a>'}
            </div>
          </div>

          <div class="expl-secao">
            <h3>3. Cole a correção aqui</h3>
            <textarea class="expl-textarea" id="disc-resposta" placeholder="Cole aqui a correção que a IA gerou (com NOTA PROVÁVEL, 3 PONTOS PERDIDOS, PARÁGRAFO REESCRITO)..."></textarea>
            <div class="expl-btn-row">
              <button class="expl-btn expl-btn-secondary" id="disc-btn-cancelar">Cancelar</button>
              <button class="expl-btn expl-btn-primary" id="disc-btn-salvar">Salvar correção</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('disc-close').onclick = fecharModalCorrecao;
    document.getElementById('disc-btn-cancelar').onclick = fecharModalCorrecao;
    document.getElementById('disc-btn-copiar').onclick = async () => {
      const btn = document.getElementById('disc-btn-copiar');
      const ok = await copiarTexto(prompt);
      if (ok) {
        btn.classList.add('copied');
        btn.textContent = '✓ Copiado';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = '📋 Copiar prompt';
        }, 2200);
      } else {
        alert('Não foi possível copiar automaticamente. Selecione o texto manualmente.');
      }
    };
    document.getElementById('disc-btn-salvar').onclick = () => {
      const texto = document.getElementById('disc-resposta').value.trim();
      if (texto.length < 100) {
        alert('Cole uma correção com pelo menos 100 caracteres antes de salvar.');
        return;
      }
      salvarCorrecao(caso.id, texto, 'manual');
      fecharModalCorrecao();
      abrirCaso(caso.id); // recarrega com correção exibida
    };
  }

  function fecharModalCorrecao() {
    const overlay = document.getElementById('disc-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
  }

  async function copiarTexto(texto) {
    try { await navigator.clipboard.writeText(texto); return true; }
    catch(e) {
      const ta = document.createElement('textarea');
      ta.value = texto; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  // ---------- Export / import ----------

  function exportarTudo() {
    const payload = {
      rascunhos: lerRascunhos(),
      correcoes: lerCorrecoes(),
      exportado_em: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'discursivas_sedes_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importarTudo() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.rascunhos) localStorage.setItem(RASCUNHOS_KEY, JSON.stringify(data.rascunhos));
          if (data.correcoes) localStorage.setItem(CORRECOES_KEY, JSON.stringify(data.correcoes));
          alert('Importado com sucesso.');
          renderLista();
        } catch(err) { alert('Arquivo inválido: ' + err.message); }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  window.DiscursivaSEDES = {
    exportar: exportarTudo,
    importar: importarTudo,
    stats: () => ({
      rascunhos: Object.keys(lerRascunhos()).length,
      correcoes: Object.keys(lerCorrecoes()).length,
    }),
  };

  // ---------- Bootstrap ----------

  function carregarCasos() {
    if (!window.CASOS_DISCURSIVA) {
      document.getElementById('casos-grade').innerHTML =
        '<div style="grid-column:1/-1;background:var(--coral-bg);color:var(--coral-texto);padding:14px;border-radius:10px;">' +
        'casos.js não carregou. Verifique que o arquivo está na mesma pasta de discursiva.html.</div>';
      return false;
    }
    CASOS = window.CASOS_DISCURSIVA.casos;
    GRADE = window.CASOS_DISCURSIVA._grade_avaliacao;
    return true;
  }

  function bindFiltros() {
    document.querySelectorAll('.filtro-chip').forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll('.filtro-chip').forEach(c => c.classList.remove('ativo'));
        chip.classList.add('ativo');
        renderLista();
      };
    });
  }

  function init() {
    document.getElementById('data-hoje').textContent = fmtDataLonga(new Date());
    const ok = carregarCasos();
    if (!ok) return;
    bindFiltros();
    renderLista();

    document.getElementById('editor').addEventListener('input', () => {
      atualizarContador();
      if (casoAtualId) salvarRascunho(casoAtualId, document.getElementById('editor').value);
    });
    document.getElementById('btn-voltar-lista').onclick = () => {
      casoAtualId = null;
      renderLista();
      window.scrollTo(0, 0);
    };
    document.getElementById('btn-corrigir').onclick = corrigirAtual;
    const btnBanca = document.getElementById('btn-banca');
    if (btnBanca) btnBanca.onclick = corrigirBanca;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
