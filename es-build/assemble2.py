import io, os, re
parts=[]
for i in range(13):
    p="es-build/chunks/chunk_%02d.es2.md"%i
    assert os.path.exists(p), "missing "+p
    parts.append(io.open(p,encoding="utf-8").read().rstrip("\n"))
out="\n\n".join(parts)+"\n"
# re-add ELOGIOS praise page (proofread chunks were pre-ELOGIOS)
praise=("# **ELOGIOS**\n\n"
"> *“Conozco a este hombre desde hace treinta y cinco años. Puedes confiar en lo que estás a punto de leer.”*\n>\n"
"> — DAVE MEYER, ex-quarterback de la NFL\n\n")
anchor="# **DERECHOS DE AUTOR**"
if "ELOGIOS" not in out and anchor in out:
    out=out.replace(anchor, praise+anchor, 1)
out=re.sub(r"\n{3,}","\n\n",out)
io.open("The_Cardinals_Promise_ES.md","w",encoding="utf-8").write(out)
print("assembled words:", len(out.split()), "| ELOGIOS:", out.count("ELOGIOS"))
# residual dialogue comillas check (rough)
print("stray double-quote lines:", len(re.findall(r'“', out)))
