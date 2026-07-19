import io, os
def sub(path, pairs, required=True):
    if not os.path.exists(path):
        print("skip (missing):", path); return
    s=io.open(path,encoding="utf-8").read(); orig=s
    for old,new,mustexist in pairs:
        c=s.count(old)
        if mustexist: assert c==1, "%s: '%s' count=%d"%(path,old,c)
        s=s.replace(old,new)
    if s!=orig: io.open(path,"w",encoding="utf-8").write(s); print("updated:",path)
    else: print("no change:",path)

# English
en=[("## **The Detour**","## **The Viagra of Diabetes Meds**",True),
    ("28. The Detour","28. The Viagra of Diabetes Meds",True)]
sub("The_Cardinals_Promise_sheff_pass.md", en)
sub("styled-sections/ch29.md", [("## **The Detour**","## **The Viagra of Diabetes Meds**",True)])

# Portuguese
pt=[("## **O Desvio**","## **O Viagra dos Remédios para Diabetes**",True),
    ("28. O Desvio","28. O Viagra dos Remédios para Diabetes",True)]
sub("The_Cardinals_Promise_PT.md", pt)
# keep the PT chunk source consistent for future reassembly
sub("pt-build/chunks/chunk_10.pt2.md", [("## **O Desvio**","## **O Viagra dos Remédios para Diabetes**",False)], required=False)
