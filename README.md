# 믿음 여정 마인드맵 PWA

「믿음이란 무엇인가?」에서 시작해, 운영자가 설계한 질문·답 마인드맵을 따라가며 바른 믿음으로 깊어지게 하는 PWA입니다.

## 폴더 구조

```
faith-mindmap/
├── index.html          # 앱 셸
├── app.js              # 마인드맵 렌더·상호작용·운영자 UI
├── app.css
├── manifest.json       # PWA 매니페스트
├── sw.js               # 서비스 워커 (오프라인 캐시)
├── icon.svg
├── serve.bat           # 로컬 서버 실행 (api.py)
├── api.py              # 정적 서버 + 운영자 API (저장, PIN)
├── config.example.json # 설정 템플릿
├── config.local.json   # 로컬 설정 (Git 제외) — PIN, AI 키 등
├── data/
│   └── mindmap.json    # 노드·엣지 데이터 (사용자용 게시본)
└── README.md
```

향후 추가 예정: `rag_search.py`, AI 초안 API, 교차 연결 UI 등.

## 데이터 스키마 (`data/mindmap.json`)

```json
{
  "version": 1,
  "rootId": "root",
  "meta": {
    "title": "믿음 여정 마인드맵",
    "updatedAt": "2026-07-06T00:00:00+09:00"
  },
  "nodes": [
    {
      "id": "root",
      "title": "믿음이란 무엇인가?",
      "description": "운영자가 편집하는 설명 텍스트",
      "scripture": "히브리서 11:1 — …",
      "x": 0,
      "y": 0
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "root",
      "to": "child-id",
      "type": "hierarchy"
    },
    {
      "id": "e2",
      "from": "node-a",
      "to": "node-b",
      "type": "cross"
    }
  ]
}
```

| 필드 | 설명 |
|------|------|
| `nodes[].id` | 고유 ID |
| `nodes[].title` | 노드에 표시되는 질문/제목 |
| `nodes[].description` | 설명 패널 본문 |
| `nodes[].scripture` | 성구 인용 |
| `nodes[].x`, `y` | 루트 기준 상대 좌표 (운영자 드래그 저장) |
| `edges[].type` | `hierarchy` (부모→자식) 또는 `cross` (교차 연결) |

## 로컬 실행

```bat
cd C:\Projects\faith-mindmap
serve.bat
```

→ http://localhost:8770/  (기본 포트 — `bible-topic-map` 8765와 충돌 방지)

**`config.local.json` 복사는 필요 없습니다.** PIN·API 키를 바꿀 때만 로컬 설정 파일을 만들면 됩니다 (`config.example.json`은 참고용 템플릿).

`python -m http.server`만 쓰면 **읽기 전용**입니다. 운영자 저장·PIN 검증은 `api.py`(또는 `serve.bat`)가 필요합니다.

## 사용법

### 일반 사용자

1. 첫 화면 중앙에 「믿음이란 무엇인가?」 노드가 표시됩니다.
2. 노드를 클릭하면 자식 노드가 360° 방사형으로 펼쳐집니다 (다시 클릭 시 접힘).
3. 오른쪽 설명 패널에서 운영자가 작성한 설명과 성구를 볼 수 있습니다.
4. **처음으로** 버튼으로 뷰를 초기화합니다.

### 운영자

1. 우측 상단 **운영** → PIN 입력.
2. 노드 선택 후 왼쪽 패널에서 제목·설명·성구 편집.
3. **자식 추가** / **삭제** (루트는 삭제 불가).
4. 노드를 드래그해 위치 조정.
5. **저장** → `data/mindmap.json`에 반영 (게시용 파일).
6. **보내기** / **가져오기**로 JSON 백업·복원.

## 설정 (선택)

PIN이나 AI 키를 바꿀 때만 `config.local.json`을 **직접** 만듭니다. Git에 올리지 않습니다.

```json
{
  "adminPin": "원하는PIN",
  "ollama": { "baseUrl": "http://127.0.0.1:11434", "model": "gemma4:12b" },
  "gemini": { "apiKey": "" },
  "searchDb": ""
}
```

- 파일이 없으면 `config.example.json`을 서버가 자동 사용합니다.
- `bible-topic-map` 등 다른 프로젝트에서 복사할 필요 없습니다.

## 배포

`index.html`, `app.*`, `manifest.json`, `sw.js`, `icon.svg`, `data/mindmap.json`을 정적 호스팅에 업로드합니다.  
운영자 편집은 로컬에서 JSON을 저장한 뒤 `mindmap.json`만 배포하는 워크플로를 권장합니다.

## 참고 프로젝트

데이터·RAG 참고만 (코드베이스 이어쓰기 금지):

- `C:\Projects\bible-topic-map` — `rag_search.py`, `build_summaries.py`

## Phase 1 (MVP) 완료 항목

- [x] repo 구조 + `mindmap.json` 시드 (루트 1노드)
- [x] 사용자 화면: 중앙 노드 + 360° 펼침 + 설명 패널
- [x] 운영자 모드 뼈대: 노드 추가·편집·저장 (로컬 API)
- [x] README 사용법

## Phase 2 예정

- AI 초안 (Ollama / Gemini + search.db RAG)
- 교차 연결(`cross`) 편집 UI
- 애니메이션 보강, PWA 설치 안내
