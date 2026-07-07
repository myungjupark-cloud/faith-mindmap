(function () {
  "use strict";

  var SKIP_ADMIN_PIN = true;

  var state = {
    data: null,
    centerId: null,
    explored: [],
    childrenOpen: false,
    admin: false,
    adminEditId: null
  };

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    appMain: $("app-main"),
    focusCard: $("focus-card"),
    outlineTreePanel: $("outline-tree-panel"),
    outlineTreeHeading: $("outline-tree-heading"),
    outlineTree: $("outline-tree"),
    btnBack: $("btn-back"),
    focusTitle: $("focus-title"),
    focusDesc: $("focus-desc"),
    focusScripture: $("focus-scripture"),
    expandWrap: $("expand-wrap"),
    btnExpand: $("btn-expand"),
    childrenPanel: $("children-panel"),
    childrenHeading: $("children-heading"),
    childrenList: $("children-list"),
    focusTrail: $("focus-trail"),
    focusDepth: $("focus-depth"),
    btnReset: $("btn-reset"),
    btnRefresh: $("btn-refresh"),
    btnAdmin: $("btn-admin"),
    adminOverlay: $("admin-overlay"),
    adminPin: $("admin-pin"),
    adminLogin: $("admin-login"),
    adminCancel: $("admin-cancel"),
    adminHint: $("admin-hint"),
    adminToolbar: $("admin-toolbar"),
    adminEditor: $("admin-editor"),
    adminEditorResizer: $("admin-editor-resizer"),
    adminResizeShield: $("admin-resize-shield"),
    editTitle: $("edit-title"),
    editDesc: $("edit-desc"),
    editScripture: $("edit-scripture"),
    aiQuestion: $("ai-question"),
    aiAnswer: $("ai-answer"),
    aiAnswerPreview: $("ai-answer-preview"),
    btnAiAsk: $("btn-ai-ask"),
    btnAiInsert: $("btn-ai-insert"),
    btnAiAppend: $("btn-ai-append"),
    moveParentRow: $("move-parent-row"),
    editLocation: $("edit-location"),
    editParent: $("edit-parent"),
    editMoveMode: $("edit-move-mode"),
    btnMoveParent: $("btn-move-parent"),
    btnAddChild: $("btn-add-child"),
    btnDeleteNode: $("btn-delete-node"),
    btnSave: $("btn-save"),
    btnExport: $("btn-export"),
    btnImport: $("btn-import"),
    importFile: $("import-file"),
    btnExitAdmin: $("btn-exit-admin"),
    toast: $("toast")
  };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { els.toast.hidden = true; }, 2800);
  }

  function nodeById(id) {
    if (!state.data) return null;
    return state.data.nodes.find(function (n) { return n.id === id; });
  }

  function isAtRoot() {
    return state.data && state.centerId === state.data.rootId;
  }

  function getDepth() {
    if (!state.data || isAtRoot()) return 0;
    var idx = state.explored.indexOf(state.centerId);
    if (idx > 0) return idx;
    return Math.max(0, state.explored.length - 1);
  }

  function nextTier() {
    return getDepth() + 1;
  }

  function normalizeMindmap(data) {
    if (!data || !data.nodes || !data.rootId) return data;
    var root = nodeByIdIn(data, data.rootId);
    if (!root) return data;
    if (!data.edges) data.edges = [];

    var hasFaith = data.nodes.some(function (n) { return n.id === "l1-faith"; });
    if (!hasFaith && (root.description || "").length > 40) {
      data.nodes.push({
        id: "l1-faith",
        title: root.title || "믿음",
        description: root.description || "",
        scripture: root.scripture || "",
        x: 0,
        y: 0
      });
      root.title = "믿음 여정";
      root.description = "아래 1단계 주제 중 하나를 선택해 여정을 이어가세요.";
      root.scripture = "";
      data.edges.push({
        id: "el1-faith",
        from: data.rootId,
        to: "l1-faith",
        type: "hierarchy"
      });
    }

    var incoming = {};
    data.edges.forEach(function (e) {
      if (e.type !== "cross") incoming[e.to] = true;
    });
    data.nodes.forEach(function (n) {
      if (n.id === data.rootId || incoming[n.id]) return;
      data.edges.push({
        id: "eorphan-" + n.id,
        from: data.rootId,
        to: n.id,
        type: "hierarchy"
      });
      incoming[n.id] = true;
    });
    return data;
  }

  function nodeByIdIn(data, id) {
    return data.nodes.find(function (n) { return n.id === id; });
  }

  function updateAdminButtons() {
    if (!state.admin || !els.btnAddChild) return;
    els.btnAddChild.textContent = isAtRoot()
      ? "1단계 주제 추가"
      : nextTier() + "단계 주제 추가";
  }

  function getEditNodeId() {
    return state.adminEditId || state.centerId;
  }

  function getEditNode() {
    return nodeById(getEditNodeId());
  }

  function parentOf(id) {
    if (!state.data || id === state.data.rootId) return null;
    var edge = state.data.edges.find(function (e) {
      return e.to === id && e.type !== "cross";
    });
    return edge ? edge.from : null;
  }

  function buildExploredPath(id) {
    var chain = [];
    var cur = id;
    var guard = 0;
    while (cur && guard < 64) {
      chain.unshift(cur);
      if (cur === state.data.rootId) break;
      cur = parentOf(cur);
      guard += 1;
    }
    if (chain[0] !== state.data.rootId) chain.unshift(state.data.rootId);
    return chain;
  }

  function childrenOf(parentId) {
    if (!state.data) return [];
    return state.data.edges
      .filter(function (e) { return e.from === parentId && e.type !== "cross"; })
      .map(function (e) { return e.to; })
      .map(function (id) { return nodeById(id); })
      .filter(Boolean);
  }

  function subtreeMaxTierFrom(nodeId, tier) {
    var kids = childrenOf(nodeId);
    if (!kids.length) return tier;
    return Math.max.apply(null, kids.map(function (child) {
      return subtreeMaxTierFrom(child.id, tier + 1);
    }));
  }

  function subtreeDescendantCount(nodeId) {
    var kids = childrenOf(nodeId);
    if (!kids.length) return 0;
    return kids.reduce(function (sum, child) {
      return sum + 1 + subtreeDescendantCount(child.id);
    }, 0);
  }

  function l1AdminMeta(nodeId) {
    var maxTier = subtreeMaxTierFrom(nodeId, 1);
    var descendants = subtreeDescendantCount(nodeId);
    if (maxTier <= 1) return "하위 없음";
    if (descendants > 0) {
      return maxTier + "단계까지 · 하위 " + descendants + "개";
    }
    return maxTier + "단계까지";
  }

  function descendantIds(nodeId) {
    var out = [];
    function walk(id) {
      childrenOf(id).forEach(function (child) {
        out.push(child.id);
        walk(child.id);
      });
    }
    walk(nodeId);
    return out;
  }

  function nodePathLabel(id) {
    return buildExploredPath(id).map(function (pid) {
      if (pid === state.data.rootId) return "홈";
      var n = nodeById(pid);
      return (n && n.title) || pid;
    }).join(" › ");
  }

  function nodeTier(id) {
    if (!state.data || id === state.data.rootId) return 0;
    return buildExploredPath(id).length - 1;
  }

  function parentOptionLabel(targetId, movingId) {
    if (targetId === state.data.rootId) return "홈 (1단계로)";
    var n = nodeById(targetId);
    var title = (n && n.title) || targetId;
    if (nodeTier(movingId) === 1 && nodeTier(targetId) === 1) {
      return "1단계 「" + title + "」 아래로 (→ 2단계)";
    }
    return nodePathLabel(targetId) + " 아래로";
  }

  function validParentOptions(nodeId) {
    var blocked = {};
    blocked[nodeId] = true;
    descendantIds(nodeId).forEach(function (id) { blocked[id] = true; });
    var options = state.data.nodes
      .filter(function (n) { return n.id !== state.data.rootId && !blocked[n.id]; })
      .map(function (n) {
        return {
          id: n.id,
          label: parentOptionLabel(n.id, nodeId),
          tier: nodeTier(n.id)
        };
      });
    options.sort(function (a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      return a.label.localeCompare(b.label, "ko");
    });
    options.unshift({ id: state.data.rootId, label: "홈 (1단계로)" });
    return options;
  }

  function setNodeParent(nodeId, newParentId) {
    var edge = state.data.edges.find(function (e) {
      return e.to === nodeId && e.type !== "cross";
    });
    if (edge) {
      edge.from = newParentId;
      return;
    }
    state.data.edges.push({
      id: "e" + nodeId,
      from: newParentId,
      to: nodeId,
      type: "hierarchy"
    });
  }

  function moveNodeToParent(nodeId, newParentId, mode) {
    if (!nodeId || nodeId === state.data.rootId) return false;
    if (newParentId === nodeId) return false;
    if (descendantIds(nodeId).indexOf(newParentId) >= 0) return false;
    if (!nodeById(newParentId)) return false;

    mode = mode || "sibling";
    var currentParent = parentOf(nodeId);

    if (mode === "insert") {
      var adoptKids = childrenOf(newParentId).filter(function (c) {
        return c.id !== nodeId;
      });
      setNodeParent(nodeId, newParentId);
      adoptKids.forEach(function (kid) {
        var childEdge = state.data.edges.find(function (e) {
          return e.from === newParentId && e.to === kid.id && e.type !== "cross";
        });
        if (childEdge) childEdge.from = nodeId;
      });
      return true;
    }

    if (currentParent === newParentId) return false;
    setNodeParent(nodeId, newParentId);
    return true;
  }

  var MOVE_NONE = "__none__";

  function fillMoveEditor(nodeId) {
    if (!els.moveParentRow || !els.editParent) return;
    if (!nodeId || nodeId === state.data.rootId) {
      els.moveParentRow.hidden = true;
      return;
    }
    els.moveParentRow.hidden = false;
    if (els.editLocation) els.editLocation.textContent = nodePathLabel(nodeId);
    var currentParent = parentOf(nodeId) || state.data.rootId;
    var options = validParentOptions(nodeId).filter(function (opt) {
      return opt.id !== currentParent;
    });
    var html = '<option value="' + MOVE_NONE + '" selected>이동 없음 (현재 유지)</option>';
    html += options.map(function (opt) {
      return (
        '<option value="' + esc(opt.id) + '">' + esc(opt.label) + "</option>"
      );
    }).join("");
    els.editParent.innerHTML = html;
  }

  function applyMoveParent() {
    var nodeId = getEditNodeId();
    if (!nodeId || nodeId === state.data.rootId) {
      toast("홈 노드는 이동할 수 없습니다");
      return;
    }
    var newParentId = els.editParent.value;
    var moveMode = (els.editMoveMode && els.editMoveMode.value) || "insert";
    if (!newParentId || newParentId === MOVE_NONE) {
      applyEditor();
      toast("이동하지 않았습니다");
      fillMoveEditor(nodeId);
      return;
    }
    applyEditor();
    if (!moveNodeToParent(nodeId, newParentId, moveMode)) {
      toast("이동할 수 없는 위치입니다");
      fillMoveEditor(nodeId);
      return;
    }
    if (state.centerId === nodeId) {
      state.explored = buildExploredPath(nodeId);
    }
    if (state.adminEditId === nodeId || state.centerId === nodeId) {
      state.adminEditId = nodeId;
    }
    fillMoveEditor(nodeId);
    renderFocus("static");
    var parentLabel = newParentId === state.data.rootId
      ? "1단계"
      : (nodeById(newParentId).title || "상위 주제");
    var moved = nodeById(nodeId);
    var tierMsg = newParentId === state.data.rootId
      ? "1단계로 옮겼습니다"
      : moveMode === "insert"
        ? nodeTier(newParentId) + "단계 「" + parentLabel + "」와 그 아래 사이(한 단계 밀기)로 옮겼습니다"
        : nodeTier(newParentId) + "단계 「" + parentLabel + "」 아래 형제(→ " + (nodeTier(newParentId) + 1) + "단계)로 옮겼습니다";
    toast("「" + (moved.title || "주제") + "」을(를) " + tierMsg);
  }

  var REVEAL_CHAR_S = 0.038;
  var REVEAL_CHUNK_S = 0.16;

  function splitChunks(text) {
    if (!text) return [];
    var lines = text.split(/\n/);
    var out = [];
    lines.forEach(function (line, li) {
      if (!line.trim()) {
        if (li < lines.length - 1) out.push({ text: "\n", block: true });
        return;
      }
      var sents = line.match(/[^.!?。…]+[.!?。…]?/g);
      if (!sents) sents = [line];
      sents.forEach(function (s) {
        var t = s.trim();
        if (t) out.push({ text: t, block: false });
      });
      if (li < lines.length - 1) out.push({ text: "", block: true, br: true });
    });
    return out.length ? out : [{ text: text, block: false }];
  }

  function setPlainText(el, text, className) {
    el.className = className;
    el.textContent = text || "";
  }

  function revealTitle(el, text) {
    el.className = "focus-title";
    el.textContent = "";
    if (!text) return 0;
    Array.from(text).forEach(function (ch, i) {
      var s = document.createElement("span");
      s.className = "reveal-unit";
      s.style.animationDelay = (i * REVEAL_CHAR_S) + "s";
      s.textContent = ch === " " ? "\u00a0" : ch;
      el.appendChild(s);
    });
    return text.length * REVEAL_CHAR_S + 0.35;
  }

  function renderDescription(el, text, animated, startDelay) {
    var rich = window.FaithMarkdown && FaithMarkdown.isRich(text);
    if (!text) {
      el.className = "focus-desc is-empty-static";
      el.innerHTML = "";
      el.textContent = "";
      return startDelay;
    }
    if (!rich) {
      if (!animated) {
        setPlainText(el, text, "focus-desc");
        return startDelay;
      }
      return revealDescription(el, text, startDelay);
    }
    var html = FaithMarkdown.toHtml(text);
    el.className = "focus-desc is-rich";
    if (!animated) {
      el.innerHTML = html;
      return startDelay;
    }
    el.innerHTML = "";
    var wrap = document.createElement("div");
    wrap.className = "reveal-block desc-rich-reveal";
    wrap.style.animationDelay = startDelay + "s";
    wrap.innerHTML = html;
    el.appendChild(wrap);
    return startDelay + 0.22;
  }

  function revealDescription(el, text, startDelay) {
    el.className = "focus-desc";
    el.textContent = "";
    if (!text) {
      el.classList.add("is-empty-static");
      return startDelay;
    }
    var delay = startDelay;
    splitChunks(text).forEach(function (chunk) {
      if (chunk.br) {
        el.appendChild(document.createElement("br"));
        return;
      }
      var s = document.createElement("span");
      s.className = chunk.block ? "reveal-block" : "reveal-chunk";
      s.style.animationDelay = delay + "s";
      s.textContent = chunk.text;
      el.appendChild(s);
      if (!chunk.text) return;
      delay += REVEAL_CHUNK_S;
    });
    return delay + 0.06;
  }

  function revealScripture(el, text, startDelay) {
    el.className = "focus-scripture";
    el.textContent = "";
    if (!text) return;
    var s = document.createElement("span");
    s.className = "reveal-block";
    s.style.animationDelay = startDelay + "s";
    s.textContent = text;
    el.appendChild(s);
  }

  function revealTitleFade(el, text, startDelay) {
    el.className = "focus-title";
    el.textContent = "";
    if (!text) return startDelay;
    var s = document.createElement("span");
    s.className = "reveal-block";
    s.style.animationDelay = startDelay + "s";
    s.textContent = text;
    el.appendChild(s);
    return startDelay + 0.42;
  }

  function pulseReveal(el) {
    if (!el) return;
    el.classList.remove("is-revealing");
    void el.offsetWidth;
    el.classList.add("is-revealing");
  }

  function renderDepthBadge(atHome) {
    if (!els.focusDepth) return;
    if (atHome) {
      els.focusDepth.textContent = "시작 · 1단계 목록";
      els.focusDepth.className = "focus-depth is-home";
      els.focusDepth.hidden = false;
      return;
    }
    els.focusDepth.textContent = getDepth() + "단계";
    els.focusDepth.className = "focus-depth";
    els.focusDepth.hidden = false;
  }

  function getBranchL1Id() {
    if (!state.data || isAtRoot()) return null;
    var path = buildExploredPath(state.centerId);
    return path.length > 1 ? path[1] : null;
  }

  function outlinePathSet(currentId) {
    var set = {};
    buildExploredPath(currentId).forEach(function (id) {
      set[id] = true;
    });
    return set;
  }

  function outlineLinkClasses(nodeId, currentId, pathSet) {
    var classes = ["outline-tree-link"];
    if (nodeId === currentId) classes.push("is-current");
    else if (pathSet[nodeId]) classes.push("is-on-path");
    else classes.push("is-off-path");
    return classes.join(" ");
  }

  function renderOutlineTreeLink(node, currentId, pathSet) {
    if (!node) return "";
    return (
      '<button type="button" class="' + outlineLinkClasses(node.id, currentId, pathSet) + '" data-id="' +
      esc(node.id) + '">' +
      '<span class="outline-tree-tier">' + nodeTier(node.id) + "단계</span>" +
      '<span class="outline-tree-title">' + esc(node.title) + "</span>" +
      "</button>"
    );
  }

  function renderOutlineTreeHtml(parentId, currentId, pathSet) {
    var kids = childrenOf(parentId);
    if (!kids.length) return "";
    return (
      '<ul class="outline-tree">' +
      kids.map(function (child) {
        return (
          '<li class="outline-tree-node">' +
          renderOutlineTreeLink(child, currentId, pathSet) +
          renderOutlineTreeHtml(child.id, currentId, pathSet) +
          "</li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  function scrollFocusToTop() {
    var scroller = document.querySelector(".focus-app");
    if (!scroller) return;
    scroller.scrollTop = 0;
    requestAnimationFrame(function () {
      scroller.scrollTop = 0;
    });
  }

  function scrollOutlineToCurrent() {
    if (!els.outlineTree || !els.outlineTreePanel) return;
    var panel = els.outlineTreePanel;
    requestAnimationFrame(function () {
      var cur = els.outlineTree.querySelector(".outline-tree-link.is-current");
      if (!cur) return;
      var curTop = cur.offsetTop;
      var curBottom = curTop + cur.offsetHeight;
      var viewTop = panel.scrollTop;
      var viewBottom = viewTop + panel.clientHeight;
      if (curTop < viewTop + 32) {
        panel.scrollTop = Math.max(0, curTop - 32);
      } else if (curBottom > viewBottom - 16) {
        panel.scrollTop = curBottom - panel.clientHeight + 16;
      }
    });
  }

  function renderOutlineTreePanel() {
    if (!els.outlineTreePanel || !els.outlineTree) return;
    var l1Id = getBranchL1Id();
    var show = !!l1Id && state.admin;
    els.outlineTreePanel.hidden = !show;
    if (!show) {
      els.outlineTree.innerHTML = "";
      return;
    }
    var currentId = state.centerId;
    var pathSet = outlinePathSet(currentId);
    var l1Node = nodeById(l1Id);
    var branchCount = subtreeDescendantCount(l1Id);
    if (els.outlineTreeHeading) {
      els.outlineTreeHeading.textContent =
        "구조 한눈에 보기 · 현재 " + getDepth() + "단계 (" + branchCount + "개)";
    }
    els.outlineTree.innerHTML =
      '<div class="outline-tree-root-item">' +
      renderOutlineTreeLink(l1Node, currentId, pathSet) +
      "</div>" +
      renderOutlineTreeHtml(l1Id, currentId, pathSet);
    scrollOutlineToCurrent();
  }

  function renderBreadcrumb() {
    if (!state.data) return;
    if (isAtRoot()) {
      els.focusTrail.innerHTML = "";
      els.focusTrail.hidden = true;
      return;
    }
    var parts = ['<span data-id="' + esc(state.data.rootId) + '">홈</span>'];
    state.explored.slice(1).forEach(function (id) {
      var n = nodeById(id);
      var name = (n && n.title) || id;
      parts.push('<span data-id="' + esc(id) + '">' + esc(name) + "</span>");
    });
    els.focusTrail.innerHTML = parts.join(" › ");
    els.focusTrail.hidden = false;
  }

  function renderFocus(viewMode) {
    if (!state.data || !state.centerId) return;
    var node = nodeById(state.centerId);
    if (!node) return;

    var atHome = isAtRoot();
    var title = node.title || "";
    var desc = node.description || "";
    var scripture = atHome ? "" : (node.scripture || "");
    var staticView = viewMode === "static";
    var navigate = viewMode === "navigate";
    var intro = viewMode === "intro";

    var kids = childrenOf(state.centerId);
    var hasKids = kids.length > 0;
    var revealEnd = 0;

    if (staticView) {
      setPlainText(els.focusTitle, title, "focus-title");
      renderDescription(els.focusDesc, desc, false, 0);
      setPlainText(els.focusScripture, scripture, "focus-scripture");
      els.focusCard.classList.remove("is-revealing");
      els.expandWrap.classList.remove("is-revealing");
    } else if (navigate) {
      pulseReveal(els.focusCard);
      var navTitleEnd = revealTitleFade(els.focusTitle, title, 0);
      var navDescEnd = renderDescription(els.focusDesc, desc, true, navTitleEnd + 0.04);
      revealScripture(els.focusScripture, scripture, navDescEnd);
      revealEnd = navDescEnd + (scripture ? 0.4 : 0);
    } else {
      pulseReveal(els.focusCard);
      var afterTitle = revealTitle(els.focusTitle, title);
      var afterDesc = renderDescription(els.focusDesc, desc, true, afterTitle + 0.06);
      revealScripture(els.focusScripture, scripture, afterDesc);
      revealEnd = afterDesc + (scripture ? 0.45 : 0);
    }

    var showChildren = hasKids && (atHome || state.childrenOpen || (state.admin && !atHome));

    els.focusCard.hidden = false;
    els.expandWrap.hidden = !hasKids || atHome;
    els.btnExpand.classList.toggle("is-open", state.childrenOpen && hasKids && !atHome);
    els.childrenPanel.hidden = !showChildren;
    els.childrenPanel.classList.toggle("is-home", atHome && hasKids);
    els.childrenPanel.classList.toggle("is-admin-home", atHome && hasKids && state.admin);
    if (els.childrenHeading) {
      if (atHome) {
        els.childrenHeading.textContent = hasKids
          ? (state.admin ? "1단계 주제 · 하위 단계 요약" : "1단계 주제를 선택하세요")
          : "1단계 주제가 없습니다";
      } else {
        els.childrenHeading.textContent = nextTier() + "단계 · 이어서 살펴보기";
      }
    }

    renderDepthBadge(atHome);

    if (intro && !staticView && hasKids && !atHome) {
      els.expandWrap.style.animationDelay = (revealEnd + 0.15) + "s";
      pulseReveal(els.expandWrap);
    } else {
      els.expandWrap.style.animationDelay = "";
      els.expandWrap.classList.remove("is-revealing");
    }

    if (showChildren) {
      var chipBase = staticView ? 0 : (navigate ? 0.05 : revealEnd + 0.2);
      var chipTier = atHome ? 1 : nextTier();
      var showL1AdminMeta = atHome && state.admin;
      els.childrenList.innerHTML = kids.map(function (child, i) {
        var adminMeta = showL1AdminMeta
          ? '<span class="chip-admin-meta">' + esc(l1AdminMeta(child.id)) + "</span>"
          : "";
        var chipBody = showL1AdminMeta
          ? '<span class="chip-body"><span class="chip-title">' + esc(child.title) + "</span>" + adminMeta + "</span>"
          : '<span class="chip-title">' + esc(child.title) + "</span>";
        return (
          '<button type="button" class="child-chip' + (atHome ? " is-l1" : "") +
          (showL1AdminMeta ? " has-admin-meta" : "") + '" data-id="' + esc(child.id) + '" ' +
          'style="animation-delay:' + (chipBase + i * 0.09) + 's">' +
          '<span class="chip-tier">' + chipTier + "단계</span>" +
          chipBody + "</button>"
        );
      }).join("");
    } else {
      els.childrenList.innerHTML = "";
    }

    els.btnBack.hidden = atHome;
    if (!atHome) {
      els.btnBack.textContent = getDepth() === 1 ? "← 1단계 목록" : "← 이전";
    }
    renderBreadcrumb();
    renderOutlineTreePanel();

    if (state.admin) fillEditor(getEditNode());
    updateAdminButtons();
    updateHash();
  }

  function openNode(id, pushTrail, viewMode) {
    if (!nodeById(id)) return;
    if (id === state.data.rootId) {
      state.explored = [state.data.rootId];
    } else if (pushTrail !== false) {
      if (isAtRoot()) {
        state.explored = [state.data.rootId, id];
      } else {
        var idx = state.explored.indexOf(id);
        if (idx >= 0) state.explored = state.explored.slice(0, idx + 1);
        else state.explored.push(id);
      }
    }
    state.centerId = id;
    state.adminEditId = null;
    if (id !== state.data.rootId) state.childrenOpen = false;
    renderFocus(viewMode || "navigate");
    scrollFocusToTop();
  }

  function goBack() {
    if (state.explored.length <= 1) return;
    state.explored.pop();
    state.centerId = state.explored[state.explored.length - 1];
    state.adminEditId = null;
    if (!isAtRoot()) state.childrenOpen = false;
    renderFocus("navigate");
    scrollFocusToTop();
  }

  function resetView() {
    if (!state.data) return;
    state.explored = [state.data.rootId];
    state.centerId = state.data.rootId;
    state.adminEditId = null;
    state.childrenOpen = false;
    renderFocus("navigate");
    scrollFocusToTop();
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }

  function toggleChildren() {
    if (isAtRoot() || !childrenOf(state.centerId).length) return;
    state.childrenOpen = !state.childrenOpen;
    renderFocus("static");
  }

  function setPanelVisible(el, visible) {
    if (!el) return;
    if (visible) {
      el.removeAttribute("hidden");
      el.setAttribute("aria-hidden", "false");
    } else {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
    }
  }

  function fillEditor(node) {
    if (!node) return;
    els.editTitle.value = node.title || "";
    els.editDesc.value = node.description || "";
    els.editScripture.value = node.scripture || "";
    fillMoveEditor(node.id);
    fillAiDraft(node);
  }

  function fillAiDraft(node) {
    if (!els.aiQuestion) return;
    if (els.aiQuestion.dataset.nodeId !== node.id) {
      els.aiQuestion.value = node.title
        ? "「" + node.title + "」에 대해 성경적 관점에서 쉽고 따뜻하게 설명해 주세요."
        : "";
      els.aiQuestion.dataset.nodeId = node.id;
      if (els.aiAnswer) els.aiAnswer.value = "";
      setAiAnswerActions(false);
      renderAiPreview();
    }
  }

  function renderAiPreview() {
    if (!els.aiAnswerPreview) return;
    var text = (els.aiAnswer && els.aiAnswer.value.trim()) || "";
    if (!text) {
      els.aiAnswerPreview.hidden = true;
      els.aiAnswerPreview.innerHTML = "";
      return;
    }
    els.aiAnswerPreview.hidden = false;
    if (window.FaithMarkdown && FaithMarkdown.isRich(text)) {
      els.aiAnswerPreview.className = "admin-ai-preview is-rich";
      els.aiAnswerPreview.innerHTML = FaithMarkdown.toHtml(text);
    } else {
      els.aiAnswerPreview.className = "admin-ai-preview";
      els.aiAnswerPreview.textContent = text;
    }
  }

  function setAiAnswerActions(enabled) {
    if (els.btnAiInsert) els.btnAiInsert.disabled = !enabled;
    if (els.btnAiAppend) els.btnAiAppend.disabled = !enabled;
  }

  var ADMIN_WIDTH_KEY = "faith-mindmap-admin-width";
  var ADMIN_WIDTH_MIN = 280;
  var ADMIN_MAIN_MIN = 120;
  var ADMIN_RESIZER_WIDTH = 24;

  function adminEditorMaxWidth() {
    return Math.max(ADMIN_WIDTH_MIN, window.innerWidth - ADMIN_MAIN_MIN - ADMIN_RESIZER_WIDTH);
  }

  function getAdminEditorPreferredWidth() {
    var raw = getComputedStyle(document.documentElement).getPropertyValue("--admin-editor-width");
    var preferred = parseInt(raw, 10);
    return isNaN(preferred) ? 520 : preferred;
  }

  function setAdminEditorWidth(width) {
    var w = clampAdminEditorWidth(width);
    document.documentElement.style.setProperty("--admin-editor-width", w + "px");
    return w;
  }

  function syncAdminEditorWidth() {
    setAdminEditorWidth(getAdminEditorPreferredWidth());
  }

  function getAdminEditorWidth() {
    if (els.adminEditor) return els.adminEditor.getBoundingClientRect().width;
    return clampAdminEditorWidth(getAdminEditorPreferredWidth());
  }

  function clampAdminEditorWidth(width) {
    return Math.min(Math.max(width, ADMIN_WIDTH_MIN), adminEditorMaxWidth());
  }

  function loadAdminEditorWidth() {
    var stored = parseInt(localStorage.getItem(ADMIN_WIDTH_KEY) || "", 10);
    if (!isNaN(stored)) {
      if (stored === 360) stored = 520;
      setAdminEditorWidth(stored);
    }
  }

  function bindAdminEditorResize() {
    if (!els.adminEditorResizer || !els.adminEditor) return;
    loadAdminEditorWidth();
    window.addEventListener("resize", syncAdminEditorWidth);

    function endResize() {
      els.adminEditorResizer.classList.remove("is-dragging");
      document.body.classList.remove("is-resizing-admin");
      if (els.adminResizeShield) els.adminResizeShield.setAttribute("hidden", "");
      localStorage.setItem(ADMIN_WIDTH_KEY, String(getAdminEditorPreferredWidth()));
      document.removeEventListener("mousemove", onResizeMove);
      document.removeEventListener("mouseup", onResizeEnd);
      window.removeEventListener("mouseup", onResizeEnd);
      document.removeEventListener("touchmove", onResizeTouchMove);
      document.removeEventListener("touchend", onResizeEnd);
    }

    var resizeStartX = 0;
    var resizeStartW = 0;

    function onResizeMove(e) {
      e.preventDefault();
      setAdminEditorWidth(resizeStartW + (e.clientX - resizeStartX));
    }

    function onResizeTouchMove(e) {
      if (!e.touches || !e.touches.length) return;
      e.preventDefault();
      setAdminEditorWidth(resizeStartW + (e.touches[0].clientX - resizeStartX));
    }

    function onResizeEnd() {
      endResize();
    }

    function beginResize(clientX) {
      if (window.innerWidth <= 600) return;
      resizeStartX = clientX;
      resizeStartW = getAdminEditorWidth();
      els.adminEditorResizer.classList.add("is-dragging");
      document.body.classList.add("is-resizing-admin");
      if (els.adminResizeShield) els.adminResizeShield.removeAttribute("hidden");
      document.addEventListener("mousemove", onResizeMove);
      document.addEventListener("mouseup", onResizeEnd);
      window.addEventListener("mouseup", onResizeEnd);
      document.addEventListener("touchmove", onResizeTouchMove, { passive: false });
      document.addEventListener("touchend", onResizeEnd);
    }

    els.adminEditorResizer.addEventListener("mousedown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      beginResize(e.clientX);
    });

    els.adminEditorResizer.addEventListener("touchstart", function (e) {
      if (window.innerWidth <= 600) return;
      if (!e.touches || !e.touches.length) return;
      e.preventDefault();
      beginResize(e.touches[0].clientX);
    }, { passive: false });

    els.adminEditorResizer.addEventListener("dblclick", function () {
      setAdminEditorWidth(520);
      localStorage.setItem(ADMIN_WIDTH_KEY, "520");
      toast("편집 패널 폭을 기본값으로 복원했습니다");
    });
  }

  function askLocalAi() {
    if (!els.aiQuestion || !els.btnAiAsk) return;
    var question = els.aiQuestion.value.trim();
    if (!question) {
      toast("질문을 입력하세요");
      return;
    }
    var node = getEditNode();
    var context = node ? nodePathLabel(node.id) : "";
    els.btnAiAsk.disabled = true;
    els.btnAiAsk.textContent = "생성 중…";
    fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question, context: context })
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.data || !result.data.ok) {
          throw new Error((result.data && result.data.error) || "AI 응답 실패");
        }
        if (els.aiAnswer) els.aiAnswer.value = result.data.answer || "";
        setAiAnswerActions(!!(result.data.answer || "").trim());
        renderAiPreview();
        var rag = result.data.rag || {};
        var ragMsg = "답변을 받았습니다";
        if (rag.sourceCount > 0) {
          ragMsg += " (search.db 자료 " + rag.sourceCount + "건)";
        } else if (rag.mode === "no_db") {
          ragMsg += " (search.db 없음 — 모델 지식만 사용)";
        } else if (rag.mode === "empty") {
          ragMsg += " (관련 자료 없음 — 모델 지식만 사용)";
        }
        ragMsg += " — 설명에 넣기를 누르세요";
        toast(ragMsg);
      })
      .catch(function (err) {
        if (els.aiAnswer) els.aiAnswer.value = "";
        setAiAnswerActions(false);
        renderAiPreview();
        toast(err.message || "AI 질문 실패");
      })
      .finally(function () {
        els.btnAiAsk.disabled = false;
        els.btnAiAsk.textContent = "질문하기";
      });
  }

  function insertAiAnswer(mode) {
    if (!els.aiAnswer) return;
    var answer = els.aiAnswer.value.trim();
    if (!answer) {
      toast("넣을 답변이 없습니다");
      return;
    }
    if (mode === "append" && els.editDesc.value.trim()) {
      els.editDesc.value = els.editDesc.value.trim() + "\n\n" + answer;
    } else {
      els.editDesc.value = answer;
    }
    applyEditor();
    toast(mode === "append" ? "설명에 추가했습니다" : "설명에 넣었습니다");
  }

  function ensureCenterNode() {
    if (!state.data) return null;
    if (!state.centerId || !nodeById(state.centerId)) {
      state.centerId = state.data.rootId;
    }
    if (!state.explored.length) state.explored = [state.centerId];
    return nodeById(state.centerId);
  }

  function enterAdmin() {
    if (!state.data) {
      toast("데이터가 없습니다 — 새로고침 후 다시 시도하세요");
      return false;
    }
    var node = ensureCenterNode();
    if (!node) {
      toast("노드 데이터 오류 — mindmap.json을 확인하세요");
      return false;
    }
    try {
      state.admin = true;
      setPanelVisible(els.adminOverlay, false);
      setPanelVisible(els.adminToolbar, true);
      setPanelVisible(els.adminEditor, true);
      setPanelVisible(els.adminEditorResizer, true);
      syncAdminEditorWidth();
      els.appMain.classList.add("is-admin");
      els.btnAdmin.textContent = "운영중";
      els.btnAdmin.setAttribute("aria-pressed", "true");
      fillEditor(node);
      state.adminEditId = null;
      renderFocus("static");
      toast("운영자 모드 — 편집 후 저장하세요");
      return true;
    } catch (err) {
      state.admin = false;
      console.error(err);
      toast("운영자 모드 진입 실패");
      return false;
    }
  }

  function exitAdmin() {
    state.admin = false;
    if (!isAtRoot()) state.childrenOpen = false;
    setPanelVisible(els.adminToolbar, false);
    setPanelVisible(els.adminEditor, false);
    setPanelVisible(els.adminEditorResizer, false);
    els.appMain.classList.remove("is-admin");
    els.btnAdmin.textContent = "운영";
    els.btnAdmin.setAttribute("aria-pressed", "false");
    applyEditor();
    renderFocus("static");
  }

  function applyEditor() {
    var id = getEditNodeId();
    if (!id) return;
    var node = nodeById(id);
    if (!node) return;
    node.title = els.editTitle.value.trim() || "제목 없음";
    node.description = els.editDesc.value.trim();
    node.scripture = els.editScripture.value.trim();
    renderFocus("static");
  }

  function newId() {
    return "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function addChild() {
    if (!state.centerId && !isAtRoot()) {
      toast("현재 노드가 없습니다");
      return;
    }
    var parentId = isAtRoot() ? state.data.rootId : state.centerId;
    var id = newId();
    state.data.nodes.push({
      id: id,
      title: "새 질문",
      description: "",
      scripture: "",
      x: 0,
      y: 0
    });
    state.data.edges.push({
      id: "e" + id,
      from: parentId,
      to: id,
      type: "hierarchy"
    });
    if (parentId === state.data.rootId) {
      state.centerId = state.data.rootId;
      state.adminEditId = id;
      fillEditor(nodeById(id));
      renderFocus("static");
      toast("1단계 주제가 추가되었습니다");
      return;
    }
    state.childrenOpen = true;
    var addedTier = getDepth() + 1;
    openNode(id, true, "navigate");
    toast(addedTier + "단계 주제가 추가되었습니다");
  }

  function deleteNode() {
    if (!state.centerId || state.centerId === state.data.rootId) {
      toast("루트 노드는 삭제할 수 없습니다");
      return;
    }
    var id = state.centerId;
    state.data.nodes = state.data.nodes.filter(function (n) { return n.id !== id; });
    state.data.edges = state.data.edges.filter(function (e) {
      return e.from !== id && e.to !== id;
    });
    state.explored = state.explored.filter(function (eid) { return eid !== id; });
    if (!state.explored.length) state.explored = [state.data.rootId];
    openNode(state.explored[state.explored.length - 1], false, "navigate");
    toast("노드가 삭제되었습니다");
  }

  function saveMindmap() {
    applyEditor();
    state.data.meta.updatedAt = new Date().toISOString();
    return fetch("/api/mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state.data)
    }).then(function (res) {
      if (!res.ok) throw new Error("save failed");
      return res.json();
    }).then(function () {
      toast("저장되었습니다");
    }).catch(function () {
      toast("저장 실패 — serve.bat(api.py) 실행이 필요합니다");
    });
  }

  function exportJson() {
    applyEditor();
    var blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "mindmap.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        if (!data.nodes || !data.rootId) throw new Error("invalid");
        state.data = normalizeMindmap(data);
        resetView();
        toast("가져오기 완료 — 저장을 눌러 반영하세요");
      } catch (e) {
        toast("잘못된 JSON 파일입니다");
      }
    };
    reader.readAsText(file);
  }

  function updateHash() {
    if (!state.centerId) return;
    var hash = "#n/" + encodeURIComponent(state.centerId);
    if (location.hash !== hash) history.replaceState(null, "", hash);
  }

  function parseHash() {
    var h = location.hash;
    if (h.indexOf("#n/") !== 0) return null;
    return decodeURIComponent(h.slice(3));
  }

  function loadPinFromConfig() {
    return fetch("config.local.json?_=" + Date.now())
      .then(function (res) {
        if (res.ok) return res.json();
        return fetch("config.example.json?_=" + Date.now()).then(function (r) {
          if (!r.ok) throw new Error("no config");
          return r.json();
        });
      })
      .then(function (cfg) {
        return String((cfg && cfg.adminPin) || "").trim();
      })
      .catch(function () { return ""; });
  }

  function checkApi() {
    return fetch("/api/health?_=" + Date.now())
      .then(function (res) { return res.ok; })
      .catch(function () { return false; });
  }

  function verifyPin(pin) {
    pin = String(pin || "").trim();
    return fetch("/api/admin/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pin })
    }).then(function (res) {
      if (!res.ok) throw new Error("bad_status");
      return res.json();
    }).then(function (data) {
      if (data.ok) return { ok: true, viaApi: true };
      return { ok: false, reason: "pin" };
    }).catch(function () {
      return loadPinFromConfig().then(function (expected) {
        if (expected && pin === expected) return { ok: true, viaApi: false };
        if (!expected) return { ok: false, reason: "server" };
        return { ok: false, reason: "pin" };
      });
    });
  }

  function formatUpdatedAt(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function loadMindmap(forceReload) {
    if (state.data && !forceReload) {
      ensureCenterNode();
      return Promise.resolve(state.data);
    }
    if (forceReload) state.data = null;
    return fetch("data/mindmap.json?_=" + Date.now())
      .then(function (res) {
        if (!res.ok) throw new Error("load failed");
        return res.json();
      })
      .then(function (data) {
        state.data = normalizeMindmap(data);
        var fromHash = parseHash();
        if (fromHash && nodeById(fromHash)) {
          state.explored = buildExploredPath(fromHash);
          state.centerId = fromHash;
        } else {
          state.explored = [data.rootId];
          state.centerId = data.rootId;
        }
        state.childrenOpen = false;
        renderFocus("intro");
        return data;
      })
      .catch(function () {
        toast("데이터 로드 실패 — serve.bat으로 http://localhost:8770/ 에 접속하세요");
        return null;
      });
  }

  function reloadMindmap() {
    var keepId = state.centerId;
    if (state.admin) exitAdmin();
    if (els.btnRefresh) els.btnRefresh.disabled = true;
    return loadMindmap(true)
      .then(function (data) {
        if (!data) return null;
        if (keepId && nodeById(keepId)) {
          state.explored = buildExploredPath(keepId);
          state.centerId = keepId;
        }
        renderFocus("static");
        updateHash();
        var label = formatUpdatedAt(data.meta && data.meta.updatedAt);
        toast(label ? "최신 데이터 반영 (" + label + ")" : "최신 데이터를 불러왔습니다");
        return data;
      })
      .finally(function () {
        if (els.btnRefresh) els.btnRefresh.disabled = false;
      });
  }

  function bindEvents() {
    els.btnReset.addEventListener("click", resetView);
    if (els.btnRefresh) els.btnRefresh.addEventListener("click", reloadMindmap);
    els.btnBack.addEventListener("click", goBack);
    els.btnExpand.addEventListener("click", toggleChildren);
    if (els.outlineTreePanel) {
      els.outlineTreePanel.addEventListener("click", function (e) {
        var btn = e.target.closest(".outline-tree-link");
        if (!btn) return;
        e.preventDefault();
        openNode(btn.dataset.id, true, "navigate");
      });
    }
    els.childrenList.addEventListener("click", function (e) {
      var btn = e.target.closest(".child-chip");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      openNode(btn.dataset.id, true, "navigate");
    });
    els.focusTrail.addEventListener("click", function (e) {
      var sp = e.target.closest("span[data-id]");
      if (!sp) return;
      var id = sp.dataset.id;
      if (id === state.data.rootId) {
        resetView();
        return;
      }
      var idx = state.explored.indexOf(id);
      if (idx < 0) return;
      state.explored = state.explored.slice(0, idx + 1);
      openNode(id, false, "navigate");
    });
    els.btnAdmin.addEventListener("click", function () {
      if (state.admin) {
        exitAdmin();
        return;
      }
      loadMindmap()
        .then(function (data) {
          if (!data) {
            toast("데이터 로드 후 다시 시도하세요");
            return;
          }
          enterAdmin();
        })
        .catch(function () {
          toast("운영자 모드 진입 오류 — 새로고침 후 다시 시도하세요");
        });
    });
    els.adminCancel.addEventListener("click", function () {
      els.adminOverlay.hidden = true;
    });
    els.adminLogin.addEventListener("click", function () {
      var btn = els.adminLogin;
      var pin = els.adminPin.value;
      btn.disabled = true;
      loadMindmap()
        .then(function (data) {
          if (!data) return null;
          return verifyPin(pin);
        })
        .then(function (result) {
          if (!result) return;
          if (result.ok) {
            enterAdmin();
            if (!result.viaApi) {
              toast("입장됨 — 편집 저장은 serve.bat(api.py) 실행이 필요합니다");
            }
            return;
          }
          if (result.reason === "server") {
            toast("설정을 읽을 수 없습니다 — serve.bat으로 실행하세요");
            return;
          }
          toast("PIN이 올바르지 않습니다");
        })
        .catch(function () {
          toast("로그인 오류 — 새로고침 후 다시 시도하세요");
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
    els.adminPin.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") els.adminLogin.click();
    });
    els.btnExitAdmin.addEventListener("click", exitAdmin);
    els.btnAddChild.addEventListener("click", addChild);
    els.btnDeleteNode.addEventListener("click", deleteNode);
    if (els.btnMoveParent) els.btnMoveParent.addEventListener("click", applyMoveParent);
    if (els.btnAiAsk) els.btnAiAsk.addEventListener("click", askLocalAi);
    if (els.btnAiInsert) els.btnAiInsert.addEventListener("click", function () { insertAiAnswer("replace"); });
    if (els.btnAiAppend) els.btnAiAppend.addEventListener("click", function () { insertAiAnswer("append"); });
    els.btnSave.addEventListener("click", saveMindmap);
    els.btnExport.addEventListener("click", exportJson);
    els.btnImport.addEventListener("click", function () { els.importFile.click(); });
    els.importFile.addEventListener("change", function () {
      if (els.importFile.files[0]) importJson(els.importFile.files[0]);
      els.importFile.value = "";
    });
    ["editTitle", "editDesc", "editScripture"].forEach(function (id) {
      $(id).addEventListener("input", applyEditor);
    });
    window.addEventListener("hashchange", function () {
      var id = parseHash();
      if (id && nodeById(id) && id !== state.centerId) {
        state.explored = buildExploredPath(id);
        openNode(id, false, "navigate");
      }
    });
  }

  if ("serviceWorker" in navigator) {
    var swReloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (swReloading) return;
      swReloading = true;
      window.location.reload();
    });
    navigator.serviceWorker.register("sw.js?v=41", { updateViaCache: "none" })
      .then(function (reg) {
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
        reg.update();
      })
      .catch(function () {});
  }

  bindEvents();
  bindAdminEditorResize();
  loadMindmap();
})();
