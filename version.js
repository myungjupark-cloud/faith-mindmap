(function () {
  "use strict";

  /* 새 버전 배포 시 맨 위에 항목만 추가하세요. ver가 하단 버튼에 표시됩니다. */
  var FAITH_UPDATES = [
    {
      ver: "1.8",
      date: "2026-07-08",
      notes: [
        "운영 ▲/▼: 모든 단계에서 목록 순서 표시",
        "형제 1개인 체인에서도 위·아래 단계 교환 가능"
      ]
    },
    {
      ver: "1.7",
      date: "2026-07-08",
      notes: [
        "운영 편집: 입력마다 전체 재렌더 제거 (저장·멈춤 개선)",
        "저장 후 FTP 배포 백그round 처리",
        "설명에 넣기 후 AI preview 정리"
      ]
    },
    {
      ver: "1.6",
      date: "2026-07-07",
      notes: [
        "운영 저장 시 thegospel.kr 자동 FTP 배포",
        "운영 PIN: 서버 API로만 검증"
      ]
    },
    {
      ver: "1.5",
      date: "2026-07-07",
      notes: [
        "외출 접속: Tailscale·Cloudflare Tunnel 가이드",
        "원격(Tailscale 등) 운영 시 PIN 인증 필수"
      ]
    },
    {
      ver: "1.4",
      date: "2026-07-07",
      notes: [
        "글씨 크기 조절(가–/가＋) 추가",
        "화면 하단 버전·업데이트 내역 표시"
      ]
    },
    {
      ver: "1.3",
      date: "2026-07-07",
      notes: [
        "운영자: 같은 단계 주제 순서 ▲/▼ 이동",
        "운영자 편집 패널 폭 드래그 조절 수정"
      ]
    },
    {
      ver: "1.2",
      date: "2026-07-07",
      notes: [
        "홈 1단계 주제 여러 개 칩 탐색",
        "운영자 편집·저장·AI 초안·마크다운 설명"
      ]
    },
    {
      ver: "1.0",
      date: "2026-07-06",
      notes: [
        "믿음 여정 마인드맵 첫 공개",
        "단계별 질문·답 따라가기"
      ]
    }
  ];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function initVersionFoot() {
    var btn = document.getElementById("app-ver-btn");
    var modal = document.getElementById("app-update-modal");
    var list = document.getElementById("app-changelog");
    if (!btn || !modal || !list || !FAITH_UPDATES.length) return;

    btn.textContent = "Ver. " + FAITH_UPDATES[0].ver + " · 업데이트 내역";

    list.innerHTML = FAITH_UPDATES.map(function (u) {
      var notes = (u.notes || []).map(function (n) {
        return "<li>" + esc(n) + "</li>";
      }).join("");
      return (
        '<li class="app-changelog__item">' +
          '<div class="app-changelog__head">' +
            '<span class="app-changelog__ver">Ver. ' + esc(u.ver) + "</span>" +
            '<span class="app-changelog__date">' + esc(u.date) + "</span>" +
          "</div>" +
          '<ul class="app-changelog__notes">' + notes + "</ul>" +
        "</li>"
      );
    }).join("");

    function openModal() {
      modal.hidden = false;
    }

    function closeModal() {
      modal.hidden = true;
    }

    btn.addEventListener("click", openModal);
    modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) closeModal();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initVersionFoot);
  } else {
    initVersionFoot();
  }
})();
