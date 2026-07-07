#!/usr/bin/env python3
"""faith-mindmap -> thegospel.kr/faith-mindmap FTP 배포."""
from __future__ import annotations

import json
import os
import sys
import ftplib
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOCAL = ROOT.parent / "thegospel-kr" / "faith-mindmap"
CFG = next(Path(r"C:\Projects\bible-qna").rglob("deploy.config.json"))
REMOTE = "/www/faith-mindmap"
FILES = [
    ".htaccess",
    "index.html",
    "app.js",
    "app.css",
    "sw.js",
    "manifest.json",
    "icon.svg",
    "markdown.js",
    "data/mindmap.json",
]


def ensure_dir(ftp: ftplib.FTP, path: str) -> None:
    parts = [p for p in path.split("/") if p]
    cur = ""
    for part in parts:
        cur += "/" + part
        try:
            ftp.mkd(cur)
        except ftplib.error_perm:
            pass


def main() -> int:
    if not LOCAL.is_dir():
        print("Local dir missing:", LOCAL, file=sys.stderr)
        return 1
    cfg = json.loads(CFG.read_text(encoding="utf-8"))
    print("=== faith-mindmap FTP deploy ===")
    print("Local:", LOCAL)
    print("Remote:", REMOTE)
    ftp = ftplib.FTP()
    ftp.connect(cfg["host"], cfg.get("port", 21), timeout=120)
    ftp.login(cfg["username"], cfg["password"])
    if cfg.get("usePassive", True):
        ftp.set_pasv(True)
    ensure_dir(ftp, REMOTE)
    ensure_dir(ftp, REMOTE + "/data")
    for rel in FILES:
        local = LOCAL / rel.replace("/", os.sep)
        if not local.is_file():
            print("Missing:", local, file=sys.stderr)
            return 1
        remote = REMOTE + "/" + rel.replace("\\", "/")
        with local.open("rb") as f:
            ftp.storbinary("STOR " + remote, f)
        print("OK:", rel, f"({local.stat().st_size:,} bytes)")
    ftp.quit()
    url = "https://thegospel.kr/faith-mindmap/"
    print("Verify:", url)
    try:
        with urllib.request.urlopen(url, timeout=30) as res:
            print("HTTP", res.status)
    except Exception as exc:
        print("Verify failed:", exc, file=sys.stderr)
        return 1
    print("=== Done ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
