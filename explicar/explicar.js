/* ===== EXPLICAR — Feature #2 do SEDES PsyRank =====
 *
 * Adiciona botão "Explica essa questão" no feedback de cada questão respondida.
 *
 * Fluxo:
 *   1. Clarissa responde questão → vê feedback (correto/errado)
 *   2. Vê botão "Explica essa questão"
 *   3. Clica → abre modal:
 *      - Se há cache → mostra explicação salva
 *      - Se não há → mostra prompt formatado pra copiar + textarea pra colar resposta
 *   4. Clarissa copia prompt → cola no Codex/Claude.ai/ChatGPT → recebe resposta
 *   5. Volta no app, cola resposta no textarea → clica "Salvar"
 *   6. Próxima vez que clicar nessa questão = grátis (cache)
 *
 * Cache: localStorage chave EXPLICACOES_KEY.
 * Export/import: botões no rodapé do modal.
 * Sem dependência de API paga, sem rede, 100% offline.
 */

(function() {
  'use strict';

  const EXPLICACOES_KEY = 'sedes_explicacoes_v1';
  const NOMES_DISC = {
    psicologia: 'Psicologia',
    servico_social: 'Serviço Social (SUAS/LOAS)',
    direito_constitucional: 'Direito Constitucional',
    portugues: 'Português',
  };

  // ---------- Cache em localStorage ----------

  function lerCache() {
    try { return JSON.parse(localStorage.getItem(EXPLICACOES_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function salvarCache(cache) {
    localStorage.setItem(EXPLICACOES_KEY, JSON.stringify(cache));
  }
  function getExplicacao(qid) {
    return lerCache()[qid] || null;
  }
  function setExplicacao(qid, texto, fonte) {
    const cache = lerCache();
    cache[qid] = {
      texto: texto.trim(),
      fonte: fonte || 'manual',
      salvo_em: new Date().toISOString(),
    };
    salvarCache(cache);
  }
  function deleteExplicacao(qid) {
    const cache = lerCache();
    delete cache[qid];
    salvarCache(cache);
  }

  // ---------- Geração do prompt ----------

  function gerarPrompt(q, letraEscolhida) {
    const disciplina = NOMES_DISC[q.d] || q.d;
    const assuntos = (q.a || []).join(' · ') || '(não classificado)';
    const errou = letraEscolhida && letraEscolhida !== q.g;
    const alts = ['A', 'B', 'C', 'D', 'E']
      .filter(L => q.alt[L] !== undefined)
      .map(L => `${L}) ${q.alt[L]}`)
      .join('\n');

    const linhaMarcacao = errou
      ? `A candidata marcou ${letraEscolhida}, mas o gabarito é ${q.g}.`
      : letraEscolhida
        ? `A candidata acertou (marcou ${letraEscolhida}, gabarito ${q.g}).`
        : `Gabarito: ${q.g}.`;

    return `Sou candidata do concurso SEDES-DF 2026, Cargo 409 EDAS Psicologia (vaga PCD, banca Quadrix, prova 06/09/2026). Sou psicóloga clínica formada, sem base prévia em assistência social (SUAS).

Questão Q${q.id} · ${disciplina} · ${q.ano || 's/data'} · ${q.org || 's/banca'}
Assunto: ${assuntos}

${q.t ? `Texto base:\n${q.t}\n\n` : ''}Enunciado:
${q.e}

Alternativas:
${alts}

${linhaMarcacao}

Explique a questão com a estrutura:
1. **Conceito teórico** — qual é o conteúdo que está sendo testado, em 2-3 frases.
2. **Por que ${q.g} é a resposta correta** — argumento direto, citando norma técnica quando aplicável (LOAS, PNAS, NOB-RH/SUAS, ECA, LBI, Maria da Penha, Código de Ética CFP, Lei Orgânica DF, etc).
${errou ? `3. **Por que ${letraEscolhida} está errada** — pegadinha específica que pode ter induzido o erro.\n4. **Padrão da Quadrix** — se houver, aponte armadilha típica dessa banca neste tópico.\n5. **O que decorar** — 1-2 pontos-chave para fixar na próxima revisão.` : `3. **Pegadinha típica da Quadrix** nesse tipo de questão, se houver.\n4. **O que decorar** — 1-2 pontos-chave para fixar.`}

Use português técnico brasileiro estrito. NÃO use vocabulário de social work americano (use "assistência social", "atendimento psicossocial", "rede intersetorial" — não "social services", "social work"). Não psicologize a pobreza nem reduza problemas estruturais a questões individuais. Resposta entre 200 e 400 palavras.`;
  }

  // ---------- Clipboard ----------

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (e) {
      // Fallback para browsers antigos / file:// sem clipboard
      const ta = document.createElement('textarea');
      ta.value = texto;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    }
  }

  // ---------- Modal ----------

  function escapar(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fecharModal() {
    const overlay = document.getElementById('expl-overlay');
    if (overlay) overlay.remove();
    document.body.style.overflow = '';
  }

  function abrirModal(q, letraEscolhida) {
    fecharModal(); // garante que não há duplicado
    document.body.style.overflow = 'hidden';

    const explExistente = getExplicacao(q.id);
    const prompt = gerarPrompt(q, letraEscolhida);
    const disciplina = NOMES_DISC[q.d] || q.d;

    const overlay = document.createElement('div');
    overlay.id = 'expl-overlay';
    overlay.className = 'expl-overlay';
    overlay.addEventListener('click', e => {
      if (e.target === overlay) fecharModal();
    });

    const corpo = explExistente
      ? blocoExplicacaoCacheada(q, explExistente)
      : blocoSemCache(q, prompt);

    overlay.innerHTML = `
      <div class="expl-modal" role="dialog" aria-modal="true">
        <div class="expl-header">
          <div class="expl-titulo">Explica essa questão</div>
          <button class="expl-close" aria-label="Fechar" id="expl-close-btn">×</button>
        </div>
        <div class="expl-body">
          <div class="expl-questao-resumo">
            <div class="label">Questão Q${escapar(q.id)} · ${escapar(disciplina)}</div>
            ${escapar(q.e).slice(0, 200)}${q.e.length > 200 ? '…' : ''}
          </div>
          ${corpo}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('expl-close-btn').onclick = fecharModal;

    if (explExistente) {
      bindCachedActions(q);
    } else {
      bindSemCacheActions(q, prompt);
    }
  }

  function blocoExplicacaoCacheada(q, expl) {
    const data = new Date(expl.salvo_em);
    const dataFmt = data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="expl-banner cached">✓ Explicação cacheada localmente. Sem custo de uso.</div>
      <div class="expl-explicacao-renderizada">${escapar(expl.texto)}</div>
      <div class="expl-meta-footer">
        <span>Salvo em ${escapar(dataFmt)} · fonte: ${escapar(expl.fonte || 'manual')}</span>
        <div class="acoes">
          <button class="expl-link-acao" id="expl-acao-refazer">Refazer</button>
          <button class="expl-link-acao danger" id="expl-acao-apagar">Apagar</button>
        </div>
      </div>
    `;
  }

  function blocoSemCache(q, prompt) {
    return `
      <div class="expl-banner sem-cache">Sem cache. Copie o prompt, cole numa IA externa (gratuita), e cole a resposta de volta aqui.</div>

      <div class="expl-secao">
        <h3>1. Prompt pronto</h3>
        <div class="expl-prompt-box" id="expl-prompt">${escapar(prompt)}</div>
        <div class="expl-btn-row">
          <button class="expl-btn expl-btn-primary" id="expl-btn-copiar">📋 Copiar prompt</button>
        </div>
      </div>

      <div class="expl-secao">
        <h3>2. Onde colar</h3>
        <div class="expl-onde">
          <strong>Codex CLI</strong> (assinatura ChatGPT Plus, dentro do projeto)<br>
          <strong>Claude.ai</strong> (assinatura ou free tier — <a href="https://claude.ai" target="_blank" rel="noopener">claude.ai</a>)<br>
          <strong>ChatGPT</strong> (free tier funciona pra isso — <a href="https://chat.openai.com" target="_blank" rel="noopener">chat.openai.com</a>)<br>
          <strong>Gemini</strong> (free tier — <a href="https://gemini.google.com" target="_blank" rel="noopener">gemini.google.com</a>)
        </div>
      </div>

      <div class="expl-secao">
        <h3>3. Cole a resposta aqui</h3>
        <textarea class="expl-textarea" id="expl-resposta" placeholder="Cole aqui a explicação que a IA gerou..."></textarea>
        <div class="expl-btn-row">
          <button class="expl-btn expl-btn-secondary" id="expl-btn-cancelar">Cancelar</button>
          <button class="expl-btn expl-btn-primary" id="expl-btn-salvar">Salvar explicação</button>
        </div>
      </div>
    `;
  }

  function bindSemCacheActions(q, prompt) {
    const btnCopiar = document.getElementById('expl-btn-copiar');
    btnCopiar.onclick = async () => {
      const ok = await copiarTexto(prompt);
      if (ok) {
        btnCopiar.classList.add('copied');
        btnCopiar.textContent = '✓ Copiado';
        setTimeout(() => {
          btnCopiar.classList.remove('copied');
          btnCopiar.textContent = '📋 Copiar prompt';
        }, 2200);
      } else {
        alert('Não foi possível copiar automaticamente. Selecione o texto manualmente.');
      }
    };

    document.getElementById('expl-btn-cancelar').onclick = fecharModal;

    document.getElementById('expl-btn-salvar').onclick = () => {
      const texto = document.getElementById('expl-resposta').value.trim();
      if (texto.length < 50) {
        alert('Cole uma explicação com pelo menos 50 caracteres antes de salvar.');
        return;
      }
      setExplicacao(q.id, texto, 'manual');
      abrirModal(q, null); // recarrega como cached
    };
  }

  function bindCachedActions(q) {
    document.getElementById('expl-acao-refazer').onclick = () => {
      if (!confirm('Apagar explicação cacheada e gerar novo prompt para refazer?')) return;
      deleteExplicacao(q.id);
      abrirModal(q, null);
    };
    document.getElementById('expl-acao-apagar').onclick = () => {
      if (!confirm('Apagar explicação dessa questão?')) return;
      deleteExplicacao(q.id);
      fecharModal();
      atualizarBotaoTrigger(q.id);
    };
  }

  // ---------- Botão trigger no feedback ----------

  function criarBotaoTrigger(q, letraEscolhida) {
    const btn = document.createElement('button');
    btn.className = 'expl-btn-trigger';
    btn.id = 'expl-btn-trigger-' + q.id;
    const cached = !!getExplicacao(q.id);
    if (cached) btn.classList.add('cached');
    btn.innerHTML = `
      <span class="expl-icon">💡</span>
      <span class="expl-texto">${cached ? 'Ver explicação cacheada' : 'Explica essa questão'}</span>
    `;
    btn.onclick = () => abrirModal(q, letraEscolhida);
    return btn;
  }

  function atualizarBotaoTrigger(qid) {
    const btn = document.getElementById('expl-btn-trigger-' + qid);
    if (!btn) return;
    const cached = !!getExplicacao(qid);
    btn.classList.toggle('cached', cached);
    btn.querySelector('.expl-texto').textContent = cached ? 'Ver explicação cacheada' : 'Explica essa questão';
  }

  // ---------- Integração com o app: MutationObserver no feedback ----------

  function injetarBotaoSeNecessario() {
    const feedback = document.getElementById('qz-feedback');
    if (!feedback || !feedback.classList.contains('show')) return;
    if (feedback.dataset.explBindado === '1') return;

    // Descobre a questão atual via QZ global
    if (!window.QZ || !window.QZ.fila || !window.QZ.fila[window.QZ.idx]) return;
    const q = window.QZ.fila[window.QZ.idx];

    // Última resposta dessa sessão pra essa questão
    const ultRespostas = window.QZ.respostas || [];
    const ultResposta = [...ultRespostas].reverse().find(r => r.qid === q.id);
    const letra = ultResposta ? ultResposta.escolha : null;

    const btn = criarBotaoTrigger(q, letra);
    feedback.parentNode.insertBefore(btn, feedback.nextSibling);
    feedback.dataset.explBindado = '1';
  }

  function observar() {
    const card = document.getElementById('qz-questao-card');
    if (!card) {
      setTimeout(observar, 500);
      return;
    }
    const obs = new MutationObserver(() => {
      // Quando o card é re-renderizado, o feedback antigo some — recria
      injetarBotaoSeNecessario();
    });
    obs.observe(card, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    // Tentativa inicial
    injetarBotaoSeNecessario();
  }

  // ---------- Export / import (backup entre dispositivos) ----------

  function exportarTodas() {
    const cache = lerCache();
    const n = Object.keys(cache).length;
    if (n === 0) {
      alert('Nenhuma explicação cacheada para exportar.');
      return;
    }
    const blob = new Blob([JSON.stringify(cache, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'explicacoes_sedes_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Exportado: ' + n + ' explicações');
  }

  function importarDeArquivo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          const cache = lerCache();
          let n = 0;
          for (const k in data) {
            if (data[k] && typeof data[k].texto === 'string') {
              cache[k] = data[k];
              n++;
            }
          }
          salvarCache(cache);
          alert('Importadas ' + n + ' explicações.');
        } catch (err) {
          alert('Arquivo inválido: ' + err.message);
        }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  // Exporta API global pra console / hooks futuros
  window.ExplicarSEDES = {
    exportar: exportarTodas,
    importar: importarDeArquivo,
    cache: () => lerCache(),
    stats: () => {
      const c = lerCache();
      return { total: Object.keys(c).length, chave: EXPLICACOES_KEY };
    },
  };

  // Inicia
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observar);
  } else {
    observar();
  }
})();
