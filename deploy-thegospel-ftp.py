#!/usr/bin/env python3
"""faith-mindmap -> thegospel.kr/faith-mindmap FTP 배포."""
from __future__ import annotations

import sys

from deploy_thegospel import ALL_FILES, LOCAL, PUBLIC_URL, deploy_to_thegospel


def main() -> int:
    if not LOCAL.is_dir():
        print("Local dir missing:", LOCAL, file=sys.stderr)
        print("Run deploy-thegospel.bat first or save once via serve.bat", file=sys.stderr)
    print("=== faith-mindmap FTP deploy ===")
    print("Local:", LOCAL)
    result = deploy_to_thegospel(ALL_FILES)
    if not result.get("ok"):
        print("Failed:", result.get("error"), file=sys.stderr)
        return 1
    for rel in result.get("files") or []:
        print("OK:", rel)
    print("Verify:", PUBLIC_URL)
    if result.get("verifyOk"):
        print("HTTP 200")
    else:
        print("Verify: skipped or failed")
    print("=== Done ===")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
