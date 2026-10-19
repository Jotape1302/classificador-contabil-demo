"""Gera os dados do modo demonstração a partir do backend real.

- web/src/demo/rules.generated.ts: regras nativas e fallback semântico de classifier_engine.py,
  para a demo classificar no navegador com a MESMA lógica do backend;
- web/src/demo/academy.generated.ts: course.json com o markdown das aulas embutido (o build
  Docker do web não enxerga api/).

Rode quando o motor ou o curso mudarem:  python3 web/scripts/gen-demo-rules.py
"""
import ast
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
ENGINE = ROOT / "api/zaeron_api/services/classifier_engine.py"
OUT = ROOT / "web/src/demo/rules.generated.ts"
COURSE_DIR = ROOT / "api/zaeron_api/content/ia_rotina_contabil"
COURSE_OUT = ROOT / "web/src/demo/academy.generated.ts"

tree = ast.parse(ENGINE.read_text(encoding="utf-8"))
consts, semantic = {}, None
for node in tree.body:
    if isinstance(node, ast.Assign) and isinstance(node.targets[0], ast.Name):
        name = node.targets[0].id
        if name in ("CATEGORIAS_PADRAO", "REGRAS_LOCAIS"):
            consts[name] = ast.literal_eval(node.value)
    if isinstance(node, ast.FunctionDef) and node.name == "inferir_categoria_semantica":
        semantic = node


def keyword_block(if_node):
    """`if any(w in d_norm for w in [...]): return (cat, conf, just)` -> dict."""
    test = if_node.test
    if not (isinstance(test, ast.Call) and getattr(test.func, "id", "") == "any"):
        return None
    words = ast.literal_eval(test.args[0].generators[0].iter)
    ret = if_node.body[0]
    cat, conf, just = ast.literal_eval(ret.value)
    return {"words": words, "category": cat, "confidence": conf, "justification": just}


def as_result(ret):
    return dict(zip(("category", "confidence", "justification"), ast.literal_eval(ret.value)))


income_block, expense_blocks, magnitude = None, [], None
for stmt in semantic.body:
    if not isinstance(stmt, ast.If):
        continue
    test = ast.unparse(stmt.test)
    if test == "valor > 0":  # receitas: transferência/aplicação ou venda
        income_block = {"transfer": keyword_block(stmt.body[0]), "default": as_result(stmt.body[1])}
    elif test.startswith("abs(valor) >"):  # despesa sem palavra-chave: faixa de valor
        low = stmt.orelse[0]
        magnitude = {
            "high": {"above": ast.literal_eval(stmt.test.comparators[0]), **as_result(stmt.body[0])},
            "low": {"below": ast.literal_eval(low.test.comparators[0]), **as_result(low.body[0])},
            "default": as_result(low.orelse[0]),
        }
    elif block := keyword_block(stmt):
        expense_blocks.append(block)
assert income_block and magnitude and expense_blocks, "formato de inferir_categoria_semantica mudou"

rules = [
    {"category": r["categoria"], "confidence": float(r.get("confianca", 1.0)),
     "justification": r.get("justificativa", "Regra nativa brasileira"), "patterns": r["padroes"]}
    for r in consts["REGRAS_LOCAIS"]
]
payload = {
    "CATEGORIES": consts["CATEGORIAS_PADRAO"],
    "NATIVE_RULES": rules,
    "SEMANTIC_INCOME": income_block,
    "SEMANTIC_EXPENSE": expense_blocks,
    "SEMANTIC_MAGNITUDE": magnitude,
}
lines = ["// GERADO por web/scripts/gen-demo-rules.py a partir de classifier_engine.py. Não editar à mão.", ""]
for key, value in payload.items():
    lines.append(f"export const {key} = {json.dumps(value, ensure_ascii=False, indent=2)} as const;")
    lines.append("")
OUT.write_text("\n".join(lines), encoding="utf-8")
print(f"{OUT.relative_to(ROOT)}: {len(rules)} regras, {sum(len(r['patterns']) for r in rules)} padrões, {len(expense_blocks)} blocos semânticos")

course = json.loads((COURSE_DIR / "course.json").read_text(encoding="utf-8"))
for module in course["modules"]:
    for lesson in module["lessons"]:
        lesson["content_markdown"] = (COURSE_DIR / lesson.pop("content_path")).read_text(encoding="utf-8")
COURSE_OUT.write_text(
    "// GERADO por web/scripts/gen-demo-rules.py a partir de content/ia_rotina_contabil. Não editar à mão.\n\n"
    f"export const COURSE = {json.dumps(course, ensure_ascii=False, indent=2)};\n",
    encoding="utf-8",
)
print(f"{COURSE_OUT.relative_to(ROOT)}: {sum(len(m['lessons']) for m in course['modules'])} aulas, {len(course['quiz']['questions'])} questões no quiz final")
