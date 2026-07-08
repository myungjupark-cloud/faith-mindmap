#!/usr/bin/env python3
"""faith-mindmap -> thegospel.kr FTP 배포 (공유 모듈)."""
from __future__ import annotations

import json
import os
import shutil
import ftplib
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LOCAL = ROOT.parent / "thegospel-kr" / "faith-mindmap"
REMOTE = "/www/faith-mindmap"
PUBLIC_URL = "https://thegospel.kr/faith-mindmap/"

ALL_FILES = [
    ".htaccess",
    "index.html",
    "app.js",
    "app.css",
    "sw.js",
    "manifest.json",
    "icon.svg",
    "markdown.js",
    "version.js",
    "data/mindmap.json",
]

MINDMAP_ONLY = ["data/mindmap.json"]


def find_deploy_config() -> Path | None:
    base = Path(r"C:\Projects\bible-qna")
    if not base.is_dir():
        return None
    matches = list(base.rglob("deploy.config.json"))
    return matches[0] if matches else None


def ensure_local_dir() -> None:
    LOCAL.mkdir(parents=True, exist_ok=True)
    (LOCAL / "data").mkdir(parents=True, exist_ok=True)


def sync_files(files: list[str]) -> list[str]:
    ensure_local_dir()
    synced: list[str] = []
    for rel in files:
        src = ROOT / rel.replace("/", os.sep)
        dst = LOCAL / rel.replace("/", os.sep)
        if not src.is_file():
            raise FileNotFoundError(f"Missing source file: {src}")
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dst)
        synced.append(rel)
    return synced


def ensure_dir(ftp: ftplib.FTP, path: str) -> None:
    parts = [p for p in path.split("/") if p]
    cur = ""
    for part in parts:
        cur += "/" + part
        try:
            ftp.mkd(cur)
        except ftplib.error_perm:
            pass


def upload_files(files: list[str]) -> dict:
    cfg_path = find_deploy_config()
    if not cfg_path:
        return {"ok": False, "error": "FTP 설정(deploy.config.json)을 찾을 수 없습니다"}

    if not LOCAL.is_dir():
        return {"ok": False, "error": "배포 로컬 폴더가 없습니다"}

    try:
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return {"ok": False, "error": f"FTP 설정 읽기 실패: {exc}"}

    uploaded: list[str] = []
    try:
        ftp = ftplib.FTP()
        ftp.connect(cfg["host"], cfg.get("port", 21), timeout=120)
        ftp.login(cfg["username"], cfg["password"])
        if cfg.get("usePassive", True):
            ftp.set_pasv(True)
        ensure_dir(ftp, REMOTE)
        ensure_dir(ftp, REMOTE + "/data")
        for rel in files:
            local = LOCAL / rel.replace("/", os.sep)
            if not local.is_file():
                ftp.quit()
                return {"ok": False, "error": f"업로드 파일 없음: {rel}"}
            remote = REMOTE + "/" + rel.replace("\\", "/")
            with local.open("rb") as f:
                ftp.storbinary("STOR " + remote, f)
            uploaded.append(rel)
        ftp.quit()
    except (ftplib.Error, OSError, KeyError) as exc:
        return {"ok": False, "error": f"FTP 업로드 실패: {exc}", "files": uploaded}

    verify_ok = False
    try:
        with urllib.request.urlopen(PUBLIC_URL, timeout=30) as res:
            verify_ok = res.status == 200
    except (OSError, urllib.error.URLError):
        pass

    return {
        "ok": True,
        "url": PUBLIC_URL,
        "files": uploaded,
        "verifyOk": verify_ok,
    }


def deploy_to_thegospel(files: list[str] | None = None) -> dict:
    files = list(files or ALL_FILES)
    try:
        sync_files(files)
    except FileNotFoundError as exc:
        return {"ok": False, "error": str(exc)}
    except OSError as exc:
        return {"ok": False, "error": f"로컬 동기화 실패: {exc}"}
    result = upload_files(files)
    return result


def deploy_mindmap_after_save() -> dict:
    return deploy_to_thegospel(MINDMAP_ONLY)
