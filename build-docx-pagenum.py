#!/usr/bin/env python3
"""Add centered page numbers to a pandoc-generated .docx (footer PAGE field).

pandoc leaves an empty <w:sectPr/>; we populate it with a footer reference plus
letter-size page geometry, add word/footer1.xml (a centered PAGE field), and wire
the relationship and content-type. Idempotent-ish: re-running on an already-
processed file just rewrites the same parts.
"""
import shutil
import sys
import zipfile

path = sys.argv[1]

FOOTER_XML = (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
    '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
    '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    '<w:r><w:t>1</w:t></w:r>'
    '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    '</w:p></w:ftr>'
)

SECTPR = (
    '<w:sectPr>'
    '<w:footerReference w:type="default" r:id="rIdFtr1"/>'
    '<w:pgSz w:w="12240" w:h="15840"/>'
    '<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" '
    'w:header="720" w:footer="720" w:gutter="0"/>'
    '</w:sectPr>'
)

REL = (
    '<Relationship Id="rIdFtr1" '
    'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" '
    'Target="footer1.xml"/>'
)

CT_OVERRIDE = (
    '<Override PartName="/word/footer1.xml" '
    'ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
)

zin = zipfile.ZipFile(path, "r")
items = {name: zin.read(name) for name in zin.namelist()}
zin.close()

# 1) document.xml: replace empty sectPr (populate) and add footer ref
doc = items["word/document.xml"].decode("utf-8")
if "<w:sectPr />" in doc:
    doc = doc.replace("<w:sectPr />", SECTPR, 1)
elif "<w:sectPr/>" in doc:
    doc = doc.replace("<w:sectPr/>", SECTPR, 1)
elif "rIdFtr1" not in doc:
    doc = doc.replace("</w:body>", SECTPR + "</w:body>", 1)
items["word/document.xml"] = doc.encode("utf-8")

# 2) footer part
items["word/footer1.xml"] = FOOTER_XML.encode("utf-8")

# 3) relationship
rels = items["word/_rels/document.xml.rels"].decode("utf-8")
if "rIdFtr1" not in rels:
    rels = rels.replace("</Relationships>", REL + "</Relationships>", 1)
items["word/_rels/document.xml.rels"] = rels.encode("utf-8")

# 4) content type override
ct = items["[Content_Types].xml"].decode("utf-8")
if "/word/footer1.xml" not in ct:
    ct = ct.replace("</Types>", CT_OVERRIDE + "</Types>", 1)
items["[Content_Types].xml"] = ct.encode("utf-8")

zout = zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED)
for name, data in items.items():
    zout.writestr(name, data)
zout.close()
print("page numbers added to", path)
