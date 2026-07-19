import io, os, re
parts=[]
for i in range(13):
    p="ptpt-build/chunks/chunk_%02d.ptpt.md"%i
    assert os.path.exists(p), p
    parts.append(io.open(p,encoding="utf-8").read().rstrip("\n"))
out="\n\n".join(parts)+"\n"
out=re.sub(r"\n{3,}","\n\n",out)
io.open("The_Cardinals_Promise_PT_PT.md","w",encoding="utf-8").write(out)
print("assembled words:", len(out.split()))
