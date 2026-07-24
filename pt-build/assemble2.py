import io, os, re
parts=[]
for i in range(13):
    p="pt-build/chunks/chunk_%02d.pt2.md"%i
    assert os.path.exists(p), "missing "+p
    parts.append(io.open(p,encoding="utf-8").read().rstrip("\n"))
out="\n\n".join(parts)+"\n"
# Remove any line crediting Grace Nobrega (per author request)
lines=[l for l in out.split("\n") if "Grace Nobrega" not in l]
out="\n".join(lines)
# collapse any 3+ blank lines left behind
out=re.sub(r"\n{3,}","\n\n",out)
io.open("The_Cardinals_Promise_PT.md","w",encoding="utf-8").write(out)
print("assembled words:", len(out.split()))
print("Grace remaining:", out.count("Grace Nobrega"))
