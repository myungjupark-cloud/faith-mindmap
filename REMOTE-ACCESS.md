# 외출에서 집 PC처럼 운영하기

집 PC의 `serve.bat`(api.py + Ollama + search.db)를 밖에서도 쓰는 방법입니다.  
**thegospel.kr**은 읽기용 공개 사이트이고, **저장·AI는 집 서버**로 접속합니다.

## 준비 (공통)

1. 집 PC에서 **Ollama**가 실행 중인지 확인 (`gemma4:12b` 등 `config.local.json` 설정)
2. `serve.bat` 실행 → 콘솔에 접속 URL이 표시됨
3. 편집 후 **저장** → thegospel.kr 자동 FTP 배포 (`autoDeployOnSave`, 기본 켜짐)

---

## 방법 A — Tailscale (권장, 가장 간단)

집 PC와 폰을 **같은 가상 LAN**에 연결합니다. 코드 변경 없이 집과 동일하게 동작합니다.

### 1회 설정

1. 집 PC·폰에 [Tailscale](https://tailscale.com/download) 설치
2. **같은 계정**으로 로그인
3. 집 PC에서 `setup-tailscale.bat` 실행 → Tailscale IPv4 확인 (보통 `100.x.x.x`)

### 외출에서 사용

1. 집 PC 켜 두고 `serve.bat` 실행
2. 폰 Tailscale 앱이 **Connected** 상태인지 확인
3. 폰 브라우저: `http://100.x.x.x:8770/` (집 PC Tailscale IP)
4. **운영** → PIN 입력 (`config.local.json`의 `adminPin`)
5. 편집·저장·AI 초안 모두 집과 동일

### 팁

- 북마크 또는 홈 화면에 추가해 두면 편합니다
- Tailscale은 Windows 방화벽을 우회하는 경우가 많아 `allow-phone.bat` 없이도 될 수 있습니다
- Wi-Fi가 아닌 LTE에서도 동작합니다

---

## 방법 B — Cloudflare Tunnel (HTTPS 고정 주소)

`https://faith-edit.내도메인` 같은 주소로 집 `8770`을 노출합니다.

### 1회 설정

1. [Cloudflare](https://dash.cloudflare.com/)에서 도메인 연결
2. [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) Windows 설치
3. 터널 생성 (관리자 PowerShell 예시):

```powershell
cloudflared tunnel login
cloudflared tunnel create faith-mindmap
cloudflared tunnel route dns faith-mindmap faith-edit.내도메인
```

4. `cloudflared.config.example.yml`을 `config.cloudflared.yml`로 복사 후 터널 ID·호스트명 수정
5. `config.local.json`에 공개 URL 등록:

```json
"remoteAccess": {
  "publicUrl": "https://faith-edit.내도메인",
  "corsOrigins": ["https://thegospel.kr"]
}
```

6. (선택) Cloudflare Access로 이메일 OTP 등 추가 잠금

### 사용

1. `serve.bat` 실행
2. 다른 창에서 `start-cloudflare-tunnel.bat` 실행
3. 폰 브라우저: `https://faith-edit.내도메인/`
4. 운영 PIN으로 로그인

---

## 보안

| 항목 | 설명 |
|------|------|
| 운영 PIN | localhost가 아니면 **항상** PIN 필요 (thegospel.kr·Tailscale·Tunnel 포함) |
| Tailscale | 본인 계정 기기만 접속 가능 — URL을 공개하지 마세요 |
| Tunnel | Cloudflare Access 권장 |
| 공개 사이트 | thegospel.kr은 정적 읽기 전용 — API 없음 |

---

## 역할 정리

| 용도 | URL |
|------|-----|
| 일반 방문자 읽기 | https://thegospel.kr/faith-mindmap/ |
| 운영자 (집) | http://localhost:8770/ |
| 운영자 (외출) | Tailscale IP 또는 Tunnel HTTPS |
| 저장 후 공개 반영 | **저장** 버튼 (자동 FTP) 또는 `deploy-thegospel.bat` (전체 파일) |

---

## 문제 해결

| 증상 | 확인 |
|------|------|
| 저장 실패 | 집 PC에서 `serve.bat` 실행 중인지 |
| AI 실패 | Ollama 실행·모델명 (`config.local.json`) |
| Tailscale IP 없음 | `tailscale status`, 같은 계정 로그인 |
| Tunnel 502 | `serve.bat` 먼저 실행 후 tunnel |
| PIN 오류 | `config.local.json`의 `adminPin` |
