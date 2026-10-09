# Build the sandbox page (balance/sandbox/index.html): embed sim.js twice (worker source + direct script), no new Function.
import os
here = os.path.dirname(os.path.abspath(__file__))
os.chdir(here)
t = open('template.html').read()
sim = open('../sim.js').read()
assert '</script' not in sim
a = """  var lib = (new Function(SIM_SRC + '\\nreturn { DEFAULTS: DEFAULTS, SCENARIOS: SCENARIOS, simulate: simulate, waitStats: waitStats, stallStats: stallStats, withDefaults: withDefaults, levelStats: levelStats };'))();"""
assert a in t
t = t.replace(a, """  var lib = { DEFAULTS: DEFAULTS, SCENARIOS: SCENARIOS, simulate: simulate, waitStats: waitStats, stallStats: stallStats, withDefaults: withDefaults, levelStats: levelStats };""")
t = t.replace("""<script type="text/plain" id="sim-src">
/*SIM*/
</script>""", """<script type="text/plain" id="sim-src">
""" + sim + """
</script>
<script>
""" + sim + """
</script>""")
assert 'new Function' not in t and '/*SIM*/' not in t
open('index.html', 'w').write(t)
print(len(t))
