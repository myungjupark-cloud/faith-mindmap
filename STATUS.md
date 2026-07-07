# faith-mindmap 프로젝트 현황

**갱신:** 2026-07-07

## 개요

「믿음 여정」 계층형 마인드맵 PWA. 사용자는 설명을 읽고 ▼ 버튼으로 다음 단계만 펼치며 탐색하고, 운영자는 전체 구조 트리·편집·AI 초안을 사용합니다.

## 배포

| 환경 | URL | 비고 |
|------|-----|------|
| 로컬 | `http://localhost:8770/` | `serve.bat` → `api.py` |
| 공개 | https://thegospel.kr/faith-mindmap/ | FTP 정적 배포 (`deploy-thegospel-ftp.py`) |

## 주요 기능 (완료)

- 홈 포털 + 단계 배지 + breadcrumb 탐색
- 사용자 모드: 구조 트리 숨김, ▼로 하위 제목만 펼침
- 운영자 모드: outline 트리, 노드 편집·이동·삭제, 리사이즈 가능 편집 패널
- 마크다운 설명(소제목·표·굵게)
- 로컬 AI + RAG (`bible-qna/search.db`, Ollama, Voyage 임베딩)
- 검색 실패 시 모델 지식 경고, `[N]`·관련 근거 표 제거
- 폰 LAN 접속·저장 (`allow-phone.bat`)
- PWA 캐시 v41

## 로컬 실행

```bat
serve.bat          REM PC + API
allow-phone.bat    REM Wi-Fi IP 허용 (선택)
```

설정: `config.local.json` (Git 제외) — PIN, AI 키 등

## 데이터

- `data/mindmap.json` — 노드·엣지 (운영 저장본)
- 배포 시 thegospel-kr 복사본과 FTP 동기화

## 다음 예정 (README 참고)

- 교차 연결 UI, 추가 RAG 튜닝 등
