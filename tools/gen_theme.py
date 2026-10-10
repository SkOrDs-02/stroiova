#!/usr/bin/env python3
"""design/system/tokens.json -> src/theme/tokens.ts (конституція, принцип VI).

  python3 tools/gen_theme.py            # перегенерувати
  python3 tools/gen_theme.py --check    # вийти з 1, якщо файл застарів (CI)
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "design/system/tokens.json")
OUT = os.path.join(ROOT, "src/theme/tokens.ts")


def camel(name, prefix=""):
    if prefix and name.startswith(prefix + "-"):
        name = name[len(prefix) + 1:]
    parts = name.split("-")
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:])


def num(value, unit):
    m = re.fullmatch(r"(-?\d+(?:\.\d+)?)" + unit, value)
    if not m:
        raise ValueError(f"очікував {unit}: {value!r}")
    v = float(m.group(1))
    return int(v) if v.is_integer() else v


def block(name, entries, comment):
    lines = [f"/** {comment} */", f"export const {name} = {{"]
    for k, v in entries:
        lines.append(f"  {json.dumps(k) if '-' in k else k}: {json.dumps(v, ensure_ascii=False)},")
    lines.append("} as const;")
    return "\n".join(lines)


def render(d):
    tok = lambda group: d[group]["tokens"]
    out = [
        "// Згенеровано tools/gen_theme.py з design/system/tokens.json. Руками не правити.",
        f"// Дизайн-система «{d['name']}», версія {d['version']}.",
        "",
        block("color", [(camel(t["name"]), t["value"]) for t in tok("color")], "Кольори. Тема одна, темна."),
        "",
        block("space", [(camel(t["name"], "space"), num(t["value"], "px")) for t in tok("spacing")],
              "Відступи, px. space[8] = 8."),
        "",
        block("radius", [(camel(t["name"], "radius"), num(t["value"], "px")) for t in tok("radius")], "Радіуси, px."),
        "",
        block("size", [(camel(t["name"]), num(t["value"], "px")) for t in tok("size")], "Розміри, px."),
        "",
        block("duration", [(camel(t["name"], "dur"), num(t["value"], "ms")) for t in tok("duration")],
              "Тривалості анімацій, мс."),
        "",
        block("easing", [(camel(t["name"], "ease"), t["value"]) for t in tok("easing")], "Криві (CSS-запис)."),
        "",
        block("opacity", [(camel(t["name"], "opacity"), float(t["value"])) for t in tok("opacity")], "Прозорість."),
        "",
        block("zIndex", [(camel(t["name"], "z"), int(t["value"])) for t in tok("zIndex")], "Шари."),
        "",
        block("fontFamily", list(d["type"]["families"].items()), "Сімейства (CSS-стек із дизайн-системи)."),
        "",
    ]
    styles = []
    for g in d["type"]["groups"]:
        for s in g["styles"]:
            size = num(s["fontSize"], "px")
            st = {"family": g["family"], "fontSize": size, "lineHeight": round(size * s["lineHeight"], 2),
                  "fontWeight": str(s.get("fontWeight", 400))}
            if "letterSpacing" in s:
                st["letterSpacing"] = num(s["letterSpacing"], "px")
            styles.append((camel(s["name"]), st))
    out += [block("typeScale", styles, "Типографічна шкала; lineHeight у px."), ""]
    out += ["export type ColorToken = keyof typeof color;", "export type TypeStyle = keyof typeof typeScale;", ""]
    return "\n".join(out)


def main(argv):
    with open(SRC, encoding="utf-8") as f:
        txt = render(json.load(f))
    if argv[1:] == ["--check"]:
        cur = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
        if cur != txt:
            print("src/theme/tokens.ts застарів: python3 tools/gen_theme.py", file=sys.stderr)
            return 1
        print("ok tokens.ts")
        return 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(txt)
    print("ok", os.path.relpath(OUT, ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
