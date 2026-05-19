"""
Consolida múltipla escolha (4 disciplinas) + gabaritos_coletados.jsonl em um
único arquivo questoes.json para a aba "Questões" do index.html.

Saída: ../questoes.json (no diretório Projeto Sedes/)
Tamanho esperado: 2-4 MB
"""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent  # q concursos/
OUT_JS   = BASE.parent / "questoes-data.js"   # Projeto Sedes/questoes-data.js (uso pelo site)
OUT_JSON = BASE.parent / "questoes.json"      # Projeto Sedes/questoes.json   (backup p/ outros usos)

# 1) Mapa de gabaritos
gabaritos = {}
with open(BASE / "gabaritos_coletados.jsonl", encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            gab = obj.get("gabarito")
            if gab in ("A", "B", "C", "D", "E"):
                gabaritos[str(obj["id"])] = gab
        except Exception:
            pass

print(f"Gabaritos carregados: {len(gabaritos)}")

# 2) Disciplinas e arquivos (slug -> nome legível)
DISCIPLINAS = {
    "psicologia":             "Psicologia",
    "servico_social":         "Serviço Social (SUAS/LOAS)",
    "direito_constitucional": "Direito Constitucional",
    "portugues":              "Português",
}

questoes_out = []
stats = {}

for slug, nome in DISCIPLINAS.items():
    arq = BASE / "questoes_quadrix" / f"{slug}.json"
    if not arq.exists():
        continue
    qs = json.loads(arq.read_text(encoding="utf-8"))
    com_gab = 0
    for q in qs:
        qid = str(q.get("id"))
        gab = gabaritos.get(qid)
        if not gab:
            continue
        # Filtra alternativas: só texto, dropa 'gabarito':null que já está marcado
        alts = {}
        for letra, v in (q.get("alternativas") or {}).items():
            if isinstance(v, dict):
                alts[letra] = v.get("texto", "")
            else:
                alts[letra] = str(v)
        if not alts or gab not in alts:
            continue
        questoes_out.append({
            "id":           qid,
            "d":            slug,                   # disciplina slug
            "a":            q.get("assuntos") or [],
            "ano":          q.get("ano"),
            "org":          q.get("orgao") or "",
            "t":            q.get("textoBase") or "",
            "e":            q.get("enunciado") or "",
            "alt":          alts,
            "g":            gab,
        })
        com_gab += 1
    stats[slug] = (com_gab, len(qs))

# 3) Ordena: psicologia primeiro (foco do edital), depois por disciplina
ordem = {"psicologia": 0, "servico_social": 1, "direito_constitucional": 2, "portugues": 3}
questoes_out.sort(key=lambda x: (ordem.get(x["d"], 99), -(int(x.get("ano") or 0))))

# 4) Metadados
meta = {
    "gerado": "questoes.json — SEDES-DF 2026",
    "total": len(questoes_out),
    "disciplinas": {slug: {"nome": DISCIPLINAS[slug], "com_gabarito": c, "total_banco": t}
                    for slug, (c, t) in stats.items()},
}

payload = {"meta": meta, "questoes": questoes_out}
payload_str = json.dumps(payload, ensure_ascii=False)

# JS embedável (funciona via file://, sem servidor)
OUT_JS.write_text(f"window.QZ_DATA = {payload_str};\n", encoding="utf-8")
# JSON puro (uso futuro / scripts)
OUT_JSON.write_text(payload_str, encoding="utf-8")

size_js = OUT_JS.stat().st_size / (1024 * 1024)
print(f"\nGerado: {OUT_JS}")
print(f"Tamanho: {size_js:.2f} MB")
print(f"Total de questões: {len(questoes_out)}")
for slug, (c, t) in stats.items():
    print(f"  {slug}: {c}/{t}")
