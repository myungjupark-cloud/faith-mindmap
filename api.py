#!/usr/bin/env python3

"""정적 파일 + 마인드맵 운영자 API 서버."""



from __future__ import annotations



import json

import os

import re

import socket

import sqlite3

import urllib.error

import urllib.request

from datetime import datetime, timezone

from http.server import HTTPServer, SimpleHTTPRequestHandler

from urllib.parse import urlparse



from rag_search import search_topic, search_topic_fts_only



ROOT = os.path.dirname(os.path.abspath(__file__))

MINDMAP_PATH = os.path.join(ROOT, "data", "mindmap.json")

CONFIG_PATH = os.path.join(ROOT, "config.local.json")

CONFIG_EXAMPLE = os.path.join(ROOT, "config.example.json")

DEFAULT_SEARCH_DB = os.path.join(os.path.dirname(ROOT), "bible-qna", "search.db")

SIBLING_TOPIC_MAP_CONFIG = os.path.join(os.path.dirname(ROOT), "bible-topic-map", "config.local.json")
BIBLE_QNA_API_PHP = os.path.join(os.path.dirname(ROOT), "bible-qna", "_RAG빌드", "구축스크립트", "api.php")

PORT = int(os.environ.get("PORT", "8770"))





def load_config() -> dict:

    path = CONFIG_PATH if os.path.isfile(CONFIG_PATH) else CONFIG_EXAMPLE

    try:

        with open(path, encoding="utf-8") as f:

            return json.load(f)

    except (OSError, json.JSONDecodeError):

        return {"adminPin": "4464572"}





def read_json_body(handler: SimpleHTTPRequestHandler) -> dict:

    length = int(handler.headers.get("Content-Length", 0))

    raw = handler.rfile.read(length) if length else b"{}"

    return json.loads(raw.decode("utf-8") or "{}")





def send_json(handler: SimpleHTTPRequestHandler, status: int, payload: dict) -> None:

    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    handler.send_response(status)

    handler.send_header("Content-Type", "application/json; charset=utf-8")

    handler.send_header("Content-Length", str(len(body)))

    handler.end_headers()

    handler.wfile.write(body)





def resolve_search_db(cfg: dict) -> str:

    path = str(cfg.get("searchDb") or cfg.get("search_db") or "").strip()

    if path and os.path.isfile(path):

        return os.path.abspath(path)

    if os.path.isfile(DEFAULT_SEARCH_DB):

        return os.path.abspath(DEFAULT_SEARCH_DB)

    return ""





def resolve_voyage_key(cfg: dict) -> str:

    key = str(cfg.get("voyage_key") or cfg.get("voyageKey") or "").strip()

    if key:

        return key

    key = os.environ.get("VOYAGE_API_KEY", "").strip()

    if key:

        return key

    if os.path.isfile(SIBLING_TOPIC_MAP_CONFIG):

        try:

            with open(SIBLING_TOPIC_MAP_CONFIG, encoding="utf-8") as f:

                sibling = json.load(f)

            key = str(sibling.get("voyage_key") or sibling.get("voyageKey") or "").strip()

            if key:

                return key

        except (OSError, json.JSONDecodeError, TypeError):

            pass

    if os.path.isfile(BIBLE_QNA_API_PHP):

        try:

            with open(BIBLE_QNA_API_PHP, encoding="utf-8") as f:

                src = f.read()

            m = re.search(r"\$VOYAGE_KEY\s*=\s*'([^']+)'", src)

            if m and m.group(1).strip():

                return m.group(1).strip()

        except OSError:

            pass

    return ""





def build_search_query(question: str, context: str = "") -> str:

    parts = [p.strip() for p in (context, question) if p and p.strip()]

    return " ".join(parts)





def build_rag_context(chunks: list[dict]) -> str:

    parts: list[str] = []

    for chunk in chunks[:8]:

        ref = chunk.get("ref") or ""

        src = chunk.get("source") or ""

        text = str(chunk.get("text") or "")[:1200]

        parts.append(f"({src} · {ref})\n{text}")

    return "\n\n".join(parts)





def rag_sources(chunks: list[dict]) -> list[dict]:

    out: list[dict] = []

    for chunk in chunks[:8]:

        out.append({

            "source": chunk.get("source") or "",

            "ref": chunk.get("ref") or "",

        })

    return out





def search_rag_chunks(question: str, context: str, cfg: dict) -> tuple[list[dict], str]:

    db_path = resolve_search_db(cfg)

    if not db_path:

        return [], "no_db"



    query = build_search_query(question, context)

    voyage_key = resolve_voyage_key(cfg)

    try:

        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)

        try:

            if voyage_key:

                chunks = search_topic(conn, query, voyage_key, topk=8)

                mode = "voyage" if chunks else "empty"

            else:

                chunks = search_topic_fts_only(conn, query, topk=8)

                mode = "fts_only" if chunks else "empty"

        finally:

            conn.close()

        return chunks, mode

    except (sqlite3.Error, urllib.error.URLError, urllib.error.HTTPError, TimeoutError, KeyError, ValueError) as exc:

        print(f"[RAG] search failed: {exc}")

        return [], "error"





def rag_system_prompt() -> str:

    return (

        "당신은 회복역·라이프스터디·워치만 니·위트니스 리 등 자료에 정통한 기독교 신앙 조력자입니다. "

        "아래 [검색 자료]만 근거로 답하되, 답변 본문에는 출처 번호·각주·인용 표기를 넣지 마세요. "

        "[1], [2] 같은 번호, 「관련 근거」 열, 「출처」 열, 각주, 링크 형식 인용을 절대 쓰지 마세요. "

        "표를 쓸 때도 내용 열만 두고 근거·출처 열은 만들지 마세요. "

        "자료에 없는 내용은 추측하지 말고, "

        "「제공된 자료에서 명확히 확인되지 않습니다」라고 말하세요. "

        "한국어로 명확하고 따뜻하게 답하세요. "

        "아래 마크다운 형식으로 구조화해 답하세요. "

        "소제목은 ## 💡 제목 또는 ### 제목 형식을 사용하세요. "

        "비교·정리가 필요하면 마크다운 표(| 열1 | 열2 |)를 사용하세요. "

        "목록은 - 항목 형식, 섹션 구분은 --- 한 줄을 사용하세요. "

        "**굵게**는 꼭 필요할 때만 쓰고, 이모지(💡 ✨ 🙏 📖 등)는 적당히 사용하세요."

    )





def plain_system_prompt() -> str:

    return (

        "당신은 기독교 신앙 주제를 돕는 조력자입니다. "

        "성경에 기반해 명확하고 따뜻하게 답하세요. 한국어로 답변하세요. "

        "답변에 [1], [2] 같은 출처 번호나 「관련 근거」 열은 넣지 마세요. "

        "아래 마크다운 형식으로 구조화해 답하세요. "

        "소제목은 ## 💡 제목 또는 ### 제목 형식을 사용하세요. "

        "비교·정리가 필요하면 마크다운 표(| 열1 | 열2 |)를 사용하세요. "

        "목록은 - 항목 형식, 섹션 구분은 --- 한 줄을 사용하세요. "

        "**굵게**는 꼭 필요할 때만 쓰고, 이모지(💡 ✨ 🙏 📖 등)는 적당히 사용하세요."

    )





def clean_ai_answer(text: str) -> str:

    if not text:

        return text

    text = re.sub(r"\s*\[\d+\]", "", text)

    lines = text.splitlines()

    out: list[str] = []

    drop_last_col = False

    for line in lines:

        stripped = line.strip()

        if "|" not in stripped:

            drop_last_col = False

            out.append(line)

            continue

        cells = [c.strip() for c in stripped.strip("|").split("|")]

        if not cells:

            out.append(line)

            continue

        if any(re.search(r"관련\s*근거|^출처$", c) for c in cells):

            drop_last_col = True

            if len(cells) > 1:

                out.append("| " + " | ".join(cells[:-1]) + " |")

            continue

        if drop_last_col and len(cells) > 1:

            out.append("| " + " | ".join(cells[:-1]) + " |")

            continue

        out.append(line)

    return "\n".join(out).strip()





def model_only_disclaimer(rag_mode: str) -> str:

    if rag_mode == "no_db":

        reason = "search.db를 찾을 수 없어"

    elif rag_mode == "error":

        reason = "search.db 검색 중 오류가 발생하여"

    else:

        reason = "search.db에서 관련 자료를 찾지 못해"

    return (

        f"> ⚠️ **{reason}** 아래 답변은 로컬 AI 모델의 일반 지식으로 작성되었습니다. "

        "자료 기반 답변이 아닐 수 있으니 확인이 필요합니다.\n\n---\n\n"

    )





def ollama_options(cfg: dict) -> dict:

    ollama = cfg.get("ollama") or {}

    num_predict = int(ollama.get("numPredict") or ollama.get("num_predict") or 4096)

    num_ctx = int(ollama.get("numCtx") or ollama.get("num_ctx") or 16384)

    temperature = float(ollama.get("temperature") or 0.35)

    return {

        "num_predict": max(1024, num_predict),

        "num_ctx": max(8192, num_ctx),

        "temperature": temperature,

    }





def ollama_chat_payload(model: str, system: str, user: str, cfg: dict) -> dict:

    body: dict = {

        "model": model,

        "messages": [

            {"role": "system", "content": system},

            {"role": "user", "content": user},

        ],

        "stream": False,

        "options": ollama_options(cfg),

    }

    if "gemma" in model.lower():

        body["think"] = False

    return body





def length_limit_notice() -> str:

    return (

        "\n\n---\n\n"

        "> ⚠️ **답변이 길이 제한에 도달해 여기서 잘렸을 수 있습니다.** "

        "같은 주제를 나눠서 다시 질문해 보세요."

    )





def ask_ollama(question: str, context: str = "", chunks: list[dict] | None = None, rag_mode: str = "") -> dict:

    question = str(question or "").strip()

    if not question:

        return {"ok": False, "error": "질문이 비어 있습니다"}



    cfg = load_config()

    ollama = cfg.get("ollama") or {}

    base_url = str(ollama.get("baseUrl", "http://127.0.0.1:11434")).rstrip("/")

    model = str(ollama.get("model", "gemma4:12b"))

    chunks = chunks or []

    use_rag = bool(chunks)

    system = rag_system_prompt() if use_rag else plain_system_prompt()



    user_parts: list[str] = []

    if context:

        user_parts.append(f"맥락: {context}")

    if use_rag:

        user_parts.append("=== 검색 자료 ===\n" + build_rag_context(chunks))

    user_parts.append(f"질문: {question}")

    user = "\n\n".join(user_parts)



    payload = json.dumps(ollama_chat_payload(model, system, user, cfg)).encode("utf-8")



    req = urllib.request.Request(

        f"{base_url}/api/chat",

        data=payload,

        headers={"Content-Type": "application/json"},

        method="POST",

    )

    try:

        with urllib.request.urlopen(req, timeout=300) as res:

            data = json.loads(res.read().decode("utf-8"))

    except urllib.error.HTTPError as exc:

        detail = exc.read().decode("utf-8", errors="replace")

        return {"ok": False, "error": f"Ollama 오류 ({exc.code})", "detail": detail[:300]}

    except urllib.error.URLError as exc:

        return {

            "ok": False,

            "error": "Ollama에 연결할 수 없습니다 — Ollama가 실행 중인지 확인하세요",

            "detail": str(exc.reason),

        }

    except TimeoutError:

        return {"ok": False, "error": "응답 시간이 초과되었습니다 — 잠시 후 다시 시도하세요"}



    message = data.get("message") or {}

    answer = clean_ai_answer(str(message.get("content", "")).strip())

    if not answer:

        return {"ok": False, "error": "빈 응답이 반환되었습니다"}



    if not use_rag:

        answer = model_only_disclaimer(rag_mode) + answer



    done_reason = str(data.get("done_reason") or "")

    if done_reason == "length":

        answer += length_limit_notice()



    result = {"ok": True, "answer": answer, "model": model, "doneReason": done_reason or "stop"}

    if use_rag:

        result["rag"] = {

            "mode": rag_mode,

            "sourceCount": len(chunks),

            "sources": rag_sources(chunks),

        }

    else:

        result["rag"] = {"mode": rag_mode or "model_only", "sourceCount": 0, "sources": []}

    return result





def ask_with_rag(question: str, context: str = "") -> dict:

    cfg = load_config()

    chunks, rag_mode = search_rag_chunks(question, context, cfg)

    return ask_ollama(question, context, chunks=chunks, rag_mode=rag_mode)





class FaithMindmapHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):

        super().__init__(*args, directory=ROOT, **kwargs)



    def end_headers(self) -> None:

        path = urlparse(self.path).path

        if path.endswith((".html", ".js", ".css")) or path in ("/", ""):

            self.send_header("Cache-Control", "no-cache, must-revalidate")

        super().end_headers()



    def do_GET(self) -> None:

        path = urlparse(self.path).path

        if path == "/api/health":

            cfg = load_config()

            db_path = resolve_search_db(cfg)

            voyage_key = resolve_voyage_key(cfg)

            send_json(self, 200, {

                "ok": True,

                "service": "faith-mindmap",

                "rag": {

                    "searchDb": db_path or None,

                    "searchDbReady": bool(db_path),

                    "voyageKeyReady": bool(voyage_key),

                },

            })

            return

        super().do_GET()



    def do_POST(self) -> None:

        path = urlparse(self.path).path



        if path == "/api/admin/verify":

            data = read_json_body(self)

            pin = str(data.get("pin", "")).strip()

            expected = str(load_config().get("adminPin", "4464572")).strip()

            send_json(self, 200, {"ok": pin == expected})

            return



        if path == "/api/mindmap":

            data = read_json_body(self)

            if not isinstance(data.get("nodes"), list) or not data.get("rootId"):

                send_json(self, 400, {"error": "invalid mindmap"})

                return

            meta = data.setdefault("meta", {})

            meta["updatedAt"] = datetime.now(timezone.utc).astimezone().isoformat()

            os.makedirs(os.path.dirname(MINDMAP_PATH), exist_ok=True)

            with open(MINDMAP_PATH, "w", encoding="utf-8") as f:

                json.dump(data, f, ensure_ascii=False, indent=2)

                f.write("\n")

            send_json(self, 200, {"ok": True, "path": "data/mindmap.json"})

            return



        if path == "/api/ai/ask":

            data = read_json_body(self)

            result = ask_with_rag(

                str(data.get("question", "")),

                str(data.get("context", "")).strip(),

            )

            status = 200 if result.get("ok") else 502

            send_json(self, status, result)

            return



        self.send_error(404)



    def log_message(self, fmt: str, *args) -> None:

        print(f"[{self.log_date_time_string()}] {fmt % args}")





def lan_ip_addresses() -> list[str]:
    ips: list[str] = []
    try:
        probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        probe.connect(("8.8.8.8", 80))
        ip = probe.getsockname()[0]
        probe.close()
        if ip and ip not in ips:
            ips.append(ip)
    except OSError:
        pass
    try:
        host = socket.gethostname()
        for info in socket.getaddrinfo(host, None, socket.AF_INET):
            ip = info[4][0]
            if ip and not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except OSError:
        pass
    return ips


def print_access_urls(port: int) -> None:
    print(f"Faith Mindmap → http://localhost:{port}/")
    print("  같은 Wi-Fi 폰에서 접속:")
    lan_ips = lan_ip_addresses()
    if lan_ips:
        for ip in lan_ips:
            print(f"    http://{ip}:{port}/")
    else:
        print("    (PC IP를 찾지 못했습니다 — ipconfig 로 IPv4 확인)")
    print("  폰에서 최신 내용: 운영자 저장 후 [새로고침] 버튼")
    print("  폰 접속 안 되면 allow-phone.bat 을 관리자 권한으로 1회 실행")
    print("  API: POST /api/admin/verify, POST /api/mindmap, POST /api/ai/ask")


def main() -> None:

    cfg = load_config()

    db_path = resolve_search_db(cfg)

    voyage_key = resolve_voyage_key(cfg)

    server = HTTPServer(("", PORT), FaithMindmapHandler)

    print_access_urls(PORT)

    print(f"  RAG: search.db={'OK ' + db_path if db_path else 'missing'}")

    print(f"  RAG: voyage={'OK' if voyage_key else 'missing (FTS only fallback)'}")

    print("  Ctrl+C to stop")

    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print("\nStopped.")





if __name__ == "__main__":

    main()

