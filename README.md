# 믿음 여정 마인드맵 PWA

하나님을 믿는 믿음에 궁금한 사람이 **단계별 질문·답**을 따라가며 바른 믿음으로 깊어지게 하는 PWA입니다.  
운영자가 마인드맵(노드·연결·설명)을 직접 설계하고, 사용자는 그 결과를 탐색합니다.

**정본:** 이 README보다 `app.js`·`data/mindmap.json`·`STATUS.md`가 우선합니다.

## 화면 구조

### 홈 (root)

- `rootId: "root"` — 제목·소개 문구 표시
- 바로 아래 **1단계 주제 칩 목록**이 펼쳐짐 (단일 항목이 아님)
- 배지: 「시작 · 1단계 목록」

### 1단계

- root의 자식 노드 여러 개 (운영자가 추가·편집)
- 예: 믿음이란 무엇인가?, 인류에게 죄가 들어온 이유는?, 천국, 왕국, 창조에 대한 탐구, 교회에 대한 이해 …
- 칩 클릭 → 해당 브랜치로 진입

### 2단계 이상

- ▼ 펼치기 → 「이어서 살펴보기」 칩 목록
- 단계 배지: 「2단계」→ 「3단계」→ …
- 「← 1단계 목록」으로 홈 복귀

### 운영자 모드

- 우상단 **운영** → PIN (`api.py`, `config.local.json`)
- 노드 편집(제목·설명·성구), 1단계/하위 단계 주제 추가·삭제
- **로컬 AI 초안:** Ollama `gemma4:12b` + `bible-qna/search.db` RAG (`/api/ai-ask`)
- 부모 이동, 보내기/가져오기, **저장** → `data/mindmap.json`
- 운영자 홈: 「1단계 주제 · 하위 단계 요약」 메타 표시

## 폴더 구조

```
faith-mindmap/
├── index.html, app.js, app.css   # PWA UI (칩 목록 탐색)
├── markdown.js                   # 설명 마크다운 렌더
├── manifest.json, sw.js, icon.svg
├── serve.bat                     # 로컬 실행 (기본 8770)
├── api.py                        # 정적 서버 + 저장·PIN·AI API
├── rag_search.py                 # search.db RAG 검색
├── config.example.json           # 설정 템플릿
├── config.local.json             # 로컬 설정 (Git 제외)
├── data/mindmap.json             # 게시용 마인드맵 데이터
├── deploy-thegospel-ftp.py       # thegospel.kr FTP 배포
├── STATUS.md                     # 프로젝트 현황·동기화 안내
└── README.md
```

## 데이터 스키마 (`data/mindmap.json`)

```json
{
  "version": 1,
  "rootId": "root",
  "meta": {
    "title": "믿음 여정 마인드맵",
    "updatedAt": "2026-07-06T23:38:21+09:00"
  },
  "nodes": [
    {
      "id": "root",
      "title": "하나님을 알고, 세상을 알면 인생의 의미와 목적이 보입니다. …",
      "description": "아래 1단계 주제 중 하나를 선택해 여정을 이어가세요.",
      "scripture": "",
      "x": 0,
      "y": 0
    },
    {
      "id": "l1-faith",
      "title": "믿음이란 무엇인가?",
      "description": "…",
      "scripture": "히브리서 11:1 — …",
      "x": 0,
      "y": 0
    }
  ],
  "edges": [
    { "id": "eroot-l1-faith", "from": "root", "to": "l1-faith", "type": "hierarchy" },
    { "id": "e-cross-1", "from": "node-a", "to": "node-b", "type": "cross" }
  ]
}
```

| 필드 | 설명 |
|------|------|
| `nodes[].id` | 고유 ID |
| `nodes[].title` | 질문/제목 |
| `nodes[].description` | 설명 본문 (마크다운 지원) |
| `nodes[].scripture` | 성구 인용 |
| `nodes[].x`, `y` | 좌표 (향후 시각화용; 현재 UI는 칩 목록) |
| `edges[].type` | `hierarchy` (부모→자식) 또는 `cross` (브랜치 간 교차 연결) |

## 로컬 실행

```bat
cd C:\Projects\faith-mindmap
serve.bat
```

→ http://localhost:8770/

`python -m http.server`만 쓰면 **읽기 전용**입니다. 운영자 저장·PIN·AI는 `api.py`(또는 `serve.bat`)가 필요합니다.

PIN·API 키를 바꿀 때만 `config.local.json`을 만듭니다 (`config.example.json` 참고). Git에 올리지 않습니다.

```json
{
  "adminPin": "원하는PIN",
  "ollama": { "baseUrl": "http://127.0.0.1:11434", "model": "gemma4:12b" },
  "gemini": { "apiKey": "" },
  "searchDb": ""
}
```

- `searchDb` 비우면 `../bible-qna/search.db`를 자동 탐색합니다.
- Ollama 모델: `gemma4:12b` (qwen 사용 안 함).

## 사용법

### 일반 사용자

1. 홈에서 소개 문구와 **1단계 주제 칩**을 확인합니다.
2. 칩을 누르면 해당 주제의 설명·성구를 읽습니다.
3. 하위가 있으면 **▼**로 「이어서 살펴보기」를 펼칩니다.
4. **처음으로** / **← 1단계 목록**으로 홈에 돌아갑니다.
5. **새로고침**으로 운영자가 저장한 최신 `mindmap.json`을 받습니다.

### 운영자

1. **운영** → PIN 입력.
2. 노드 선택 후 편집 패널에서 제목·설명·성구 수정.
3. **1단계 주제 추가** (홈) 또는 **N단계 주제 추가** (하위).
4. **로컬 AI 초안** → 질문 → 설명에 넣기/추가.
5. **부모 이동**으로 트리 구조 조정.
6. **저장** → `data/mindmap.json` 반영.
7. **보내기** / **가져오기**로 JSON 백업·복원.

## 배포

| 환경 | URL |
|------|-----|
| 로컬 | http://localhost:8770/ |
| 공개 | https://thegospel.kr/faith-mindmap/ |

정적 파일 + `data/mindmap.json`을 호스팅합니다. 운영 편집은 로컬에서 저장 후 JSON·정적 파일을 배포하는 워크플로를 권장합니다.

```bat
deploy-thegospel.bat
```

## 참고 (코드 재사용 금지)

- `C:\Projects\bible-topic-map` — 구 테스트용 각주 사전 (246개 목록). **사용 안 함.**
- `C:\Projects\bible-qna\search.db` — RAG 검색 DB (참고·연동만)

## 완료 / 예정

### 완료 (MVP)

- [x] 홈 + 다중 1단계 칩 목록 탐색
- [x] 단계별 ▼ 펼치기·breadcrumb·배지
- [x] 운영자 편집·저장·가져오기/보내기
- [x] 로컬 AI 초안 (Ollama + search.db RAG)
- [x] 마크다운 설명·PWA 캐시

### 예정

- [ ] 교차 연결(`cross`) 편집 UI
- [ ] (선택) 360° 방사형 그래프 시각화 — 현재는 칩 목록 UI
- [ ] RAG·AI 응답 품질 튜닝
