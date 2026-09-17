import io, re, os
src = io.open("The_Cardinals_Promise_sheff_pass.md", encoding="utf-8").read()
lines = src.split("\n")

def is_boundary(l):
    return l.startswith("# ") or l.startswith("**CHAPTER")

# collect sections
secs, cur = [], []
for l in lines:
    if is_boundary(l) and cur:
        secs.append(cur); cur=[l]
    else:
        cur.append(l)
if cur: secs.append(cur)

def wc(block): return len("\n".join(block).split())

# greedy pack to ~3800 words/bucket
buckets, b = [], []
for s in secs:
    b.extend(s)
    if wc(b) >= 3800:
        buckets.append(b); b=[]
if b: buckets.append(b)

os.makedirs("pt-build/chunks", exist_ok=True)
total=0
for i,bk in enumerate(buckets):
    txt="\n".join(bk)
    total+=len(txt.split())
    io.open("pt-build/chunks/chunk_%02d.md"%i,"w",encoding="utf-8").write(txt)
print("chunks:", len(buckets), "| total words:", total)
for i,bk in enumerate(buckets):
    head=next((l for l in bk if l.strip()), "")
    print("  %02d  %5dw  %s"%(i, wc(bk), head[:60]))
