import io, subprocess
jobs = [
  ("The_Cardinals_Promise_sheff_pass.md", "# **COPYRIGHT**", "# **FOREWORD**",
   "cover/cardinal-front-v5.jpg", "The Cardinal's Promise", "The_Cardinals_Promise_Speechify.epub"),
  ("The_Cardinals_Promise_PT.md", "# **DIREITOS AUTORAIS**", "# **PREFÁCIO**",
   "cover/cardinal-front-pt.jpg", "A Promessa do Cardeal", "The_Cardinals_Promise_PT_Speechify.epub"),
]
for src, cbeg, cend, cover, title, out in jobs:
    s = io.open(src, encoding="utf-8").read()
    i, j = s.index(cbeg), s.index(cend)
    assert i < j, src
    trimmed = s[:i] + s[j:]           # drop copyright + contents block
    tmp = src.replace(".md", ".speechify.md")
    io.open(tmp, "w", encoding="utf-8").write(trimmed)
    subprocess.run(["pandoc", tmp,
        "-M", "title="+title, "-M", "author=Rob Brizzi",
        "--epub-cover-image="+cover, "--split-level=1", "-o", out], check=True)
    import os; os.remove(tmp)
    print("built:", out, "(%d words)" % len(trimmed.split()))
