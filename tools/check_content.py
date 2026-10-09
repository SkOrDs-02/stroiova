#!/usr/bin/env python3
"""Перевірка контенту: унікальність телеграм, кількість за рівнями, червоні лінії,
а також пули телеграм за схемою (tools/gen_tg.py --check).
Запуск: python3 tools/check_content.py"""
import json, re, sys, os, glob, collections

RED = re.compile(r"станці|(?-i:\bУПА\b|\bЗСУ\b)|загибл|поранен|полон|СЗЧ|ВЛК|ТЦК|куріння|курить|зброя|боєприпас|мобілізац", re.I)
SKIP_KEYS = {"source", "sources", "url", "fact"}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def tgs(path):
    d = json.load(open(path))
    return d["telegrams"] if isinstance(d, dict) else d

def strings(x, key=None):
    if isinstance(x, str):
        if key not in SKIP_KEYS:
            yield x
    elif isinstance(x, list):
        for v in x: yield from strings(v, key)
    elif isinstance(x, dict):
        for k, v in x.items(): yield from strings(v, k)

def main():
    os.chdir(ROOT)
    errors = []
    all_tg, ids, nos = [], collections.Counter(), collections.Counter()
    for f in ["content/telegrams.json"] + sorted(glob.glob("content/tg/*.json")):
        for t in tgs(f):
            all_tg.append(t); ids[t["id"]] += 1
            if t.get("no"): nos[t["no"]] += 1
    errors += [f"дубль id {k}" for k, v in ids.items() if v > 1]
    errors += [f"дубль no {k}" for k, v in nos.items() if v > 1]

    for f in sorted(glob.glob("content/**/*.json", recursive=True)):
        for s in strings(json.load(open(f))):
            m = RED.search(s)
            if m and "Це не смішно" not in s:
                errors.append(f"{f}: червона лінія «{m.group(0)}»: {s[:70]}")

    per = collections.Counter(t.get("level", 1) for t in all_tg if not t.get("schedule", {}).get("scripted"))
    print("Телеграм усього:", len(all_tg), "| за рівнями (без сценарних):", dict(sorted(per.items())))

    # пули телеграм: схема, перехресні посилання, пачки, ліміти (дублі й червоні слова вже пораховано вище)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import gen_tg
    tg_errors, tg_warnings, summary = gen_tg.check_pools()
    print(summary)
    for w in tg_warnings: print("УВАГА:", w)
    errors += [e for e in tg_errors if not e.startswith("дубль id ") and not e.startswith("дубль no ") and "червона лінія" not in e]

    for e in errors: print("ПОМИЛКА:", e)
    return 1 if errors else 0

if __name__ == "__main__":
    sys.exit(main())
