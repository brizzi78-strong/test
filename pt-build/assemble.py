import io, glob, os
parts=[]
for i in range(13):
    p="pt-build/chunks/chunk_%02d.pt.md"%i
    assert os.path.exists(p), "missing "+p
    parts.append(io.open(p,encoding="utf-8").read().rstrip("\n"))
out="\n\n".join(parts)+"\n"
io.open("The_Cardinals_Promise_PT.md","w",encoding="utf-8").write(out)
print("assembled words:", len(out.split()))
# sanity: count chapter headers
print("CAPÍTULO markers:", out.count("CAPÍTULO"))
