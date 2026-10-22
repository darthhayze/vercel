#!/usr/bin/env python3
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

root = Path(sys.argv[1])
pdf_dir = root / "site-v2/public/docs"
image_dir = root / "site-v2/public/docs-pages"
out_dir = root / "site-v2/src/content/docs/_extracted"
skip = "metabolites-transcriptome-preprint-original.pdf"

def run(*args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

def page_count(pdf):
    info = run("pdfinfo", str(pdf)).stdout.decode()
    return int(re.search(r"^Pages:\s+(\d+)", info, re.M).group(1))

def text_pages(pdf, n):
    raw = run("pdftotext", "-layout", "-f", "1", "-l", str(n), str(pdf), "-").stdout.decode("utf-8", "replace")
    return [p.rstrip() for p in raw.split("\f")[:n]]

def guesses(pages):
    headings, figures = [], []
    for page_no, page in enumerate(pages, 1):
        for line in page.splitlines():
            s = line.strip()
            if not s:
                continue
            if re.match(r"^(?:\d+(?:\.\d+)*\.?\s+)?[A-Z][A-Z0-9 ,:/()&-]{3,}$", s) and len(s) < 100:
                headings.append({"page": page_no, "text": s})
            if re.match(r"^(?:Fig(?:ure)?\.?|Table)\s*\d+", s, re.I):
                figures.append({"page": page_no, "text": s})
    return headings, figures

def source_lines(pages):
    # Join only obvious PDF soft-wraps in comments; code syntax remains line-for-line.
    raw = "\n".join(pages).replace("\f", "")
    lines = []
    for line in raw.splitlines():
        line = line.rstrip()
        if lines and lines[-1].lstrip().startswith("//") and line.strip() and not line.lstrip().startswith("//"):
            lines[-1] += " " + line.strip()
        elif lines and lines[-1].lstrip().startswith("//") and line.lstrip().startswith("//"):
            lines[-1] += " " + line.lstrip()[2:].strip()
        else:
            lines.append(line)
    # Strip only blank space around the extracted source, retaining internal blank lines.
    while lines and not lines[0].strip(): lines.pop(0)
    while lines and not lines[-1].strip(): lines.pop()
    return lines

for pdf in sorted(pdf_dir.glob("*.pdf")):
    if pdf.name == skip:
        continue
    n = min(page_count(pdf), 40)
    pages = text_pages(pdf, n)
    doc = pdf.stem
    dest = image_dir / doc
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as td:
        prefix = str(Path(td) / "page")
        run("pdftoppm", "-f", "1", "-l", str(n), "-scale-to-x", "1100", "-scale-to-y", "-1", "-png", str(pdf), prefix)
        for i in range(1, n + 1):
            src = Path(f"{prefix}-{i:02d}.png")
            # pdftoppm uses at least two digits for page numbering.
            if not src.exists():
                src = Path(f"{prefix}-{i}.png")
            run("ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-frames:v", "1", "-c:v", "libwebp", "-quality", "72", str(dest / f"p-{i:02d}.webp"))
    headings, figures = guesses(pages)
    # Record the first rendered page's pixel dimensions.
    probe = run("ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", str(dest / "p-01.webp"))
    stream = json.loads(probe.stdout)["streams"][0]
    payload = {"pages": n, "size": [stream["width"], stream["height"]], "page_text": pages, "headings": headings, "figures": figures}
    (out_dir / f"{doc}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    if doc in ("ecg-arduino-source", "ecg-processing-source"):
        lines = source_lines(pages)
        language = "arduino" if doc == "ecg-arduino-source" else "processing"
        (out_dir / f"{doc}.code.json").write_text(json.dumps({"language": language, "lines": [{"n": i, "text": line} for i, line in enumerate(lines, 1)]}, ensure_ascii=False, indent=2) + "\n")
        suffix = ".ino" if language == "arduino" else ".pde"
        (out_dir / f"{doc}{suffix}").write_text("\n".join(lines) + "\n")
