import io, os
src=io.open("The_Cardinals_Promise_PT.md",encoding="utf-8").read()
lines=src.split("\n")
def boundary(l): return l.startswith("# ") or l.startswith("**CAPÍTULO")
secs,cur=[],[]
for l in lines:
    if boundary(l) and cur: secs.append(cur); cur=[l]
    else: cur.append(l)
if cur: secs.append(cur)
def wc(b): return len("\n".join(b).split())
buckets,b=[],[]
for s in secs:
    b.extend(s)
    if wc(b)>=3800: buckets.append(b); b=[]
if b: buckets.append(b)
tot=0
for i,bk in enumerate(buckets):
    t="\n".join(bk); tot+=len(t.split())
    io.open("ptpt-build/chunks/chunk_%02d.md"%i,"w",encoding="utf-8").write(t)
print("chunks:",len(buckets),"| words:",tot)
