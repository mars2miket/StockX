/**
 * workspace-toggle.js — classic script.
 * Manages the [Lists | Notes | Analytics] toggle and the dynamic dropdown below it.
 * The dropdown is a custom list (built from the hidden #view-select) where each
 * item has a pencil icon to rename it.
 */
(function () {
  'use strict';

  var toggle, viewSelect, dashBtn, vsBtn, vsList;
  var LOCKED = ['__MISSED_QUESTIONS__', '__TEST_RESULTS__'];

  // ─── Custom dropdown: self-contained (injects its own CSS + markup) ──────
  function injectStyles() {
    if (document.getElementById('vs-styles')) return;
    var s = document.createElement('style');
    s.id = 'vs-styles';
    s.textContent =
      '#view-select{display:none !important;}' +
      '.vs-dd{position:relative;flex:1;min-width:0;}' +
      '.vs-btn{width:100%;text-align:left;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.vs-list{display:none;position:absolute;left:0;right:0;top:calc(100% + 4px);max-height:240px;overflow-y:auto;' +
        'padding:4px;z-index:500;background:var(--bg-surface-2,#1e293b);border:1px solid var(--control-border,#475569);' +
        'border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.28);}' +
      '.vs-list.open{display:block;}' +
      '.vs-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;cursor:pointer;color:var(--text-primary);}' +
      '.vs-item:hover,.vs-item.active{background:var(--accent-soft,rgba(99,102,241,.2));}' +
      '.vs-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.vs-edit{border:none;background:transparent;color:var(--text-primary);font-size:16px;cursor:pointer;padding:4px 8px;}';
    document.head.appendChild(s);
  }

  function ensureCustomDropdown() {
    vsBtn = document.getElementById('vs-btn');
    vsList = document.getElementById('vs-list');
    if (vsBtn && vsList) return;

    var wrap = document.createElement('div');
    wrap.className = 'vs-dd';
    vsBtn = document.createElement('button');
    vsBtn.type = 'button';
    vsBtn.id = 'vs-btn';
    vsBtn.className = 'ctrl-select vs-btn';
    vsList = document.createElement('div');
    vsList.id = 'vs-list';
    vsList.className = 'vs-list';
    wrap.appendChild(vsBtn);
    wrap.appendChild(vsList);
    viewSelect.parentNode.insertBefore(wrap, viewSelect.nextSibling);
  }

  function buildCustom() {
    if (!vsBtn || !vsList) return;

    var cur = viewSelect.options[viewSelect.selectedIndex];
    vsBtn.textContent = cur ? cur.textContent : '';
    vsList.innerHTML = '';

    function pick(v) {
      viewSelect.value = v;
      viewSelect.dispatchEvent(new Event('change'));
      vsList.classList.remove('open');
    }

    Array.prototype.forEach.call(viewSelect.options, function (op) {
      var row = document.createElement('div');
      row.className = 'vs-item' + (op.value === viewSelect.value ? ' active' : '');

      var label = document.createElement('span');
      label.className = 'vs-label';
      label.textContent = op.textContent;
      row.appendChild(label);
      row.addEventListener('click', function () { pick(op.value); });

      if (LOCKED.indexOf(op.value) === -1) {
        var pen = document.createElement('button');
        pen.type = 'button';
        pen.className = 'vs-edit';
        pen.title = 'Rename';
        pen.textContent = '✎';
        pen.addEventListener('click', function (e) {
          e.stopPropagation();
          pick(op.value);
          var a = window.getState().viewMode === 'lists' ? window.listActions : window.noteActions;
          if (a && typeof a.rename === 'function') a.rename();
        });
        row.appendChild(pen);
      }
      vsList.appendChild(row);
    });
  }

  // ─── Init ────────────────────────────────────────────────────────────────
  function initWorkspaceToggle() {
    toggle     = document.getElementById('seg-toggle');
    viewSelect = document.getElementById('view-select');
    dashBtn    = document.getElementById('dashboard-toggle');
    if (!toggle || !viewSelect) return;

    injectStyles();
    ensureCustomDropdown();

    vsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      vsList.classList.toggle('open');
    });
    document.addEventListener('click', function () { vsList.classList.remove('open'); });

    // Wire toggle buttons
    toggle.querySelectorAll('.seg-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.dataset.mode);
      });
    });

    if (dashBtn) {
      dashBtn.addEventListener('click', function () {
        setMode('analytics');
      });
    }

    // Wire the (hidden) native dropdown
    viewSelect.addEventListener('change', onDropdownChange);

    // Wire management buttons — route by viewMode
    var mgmtNew    = document.getElementById('mgmt-new-btn');
    var mgmtDelete = document.getElementById('mgmt-delete-btn');
    var mgmtRename = document.getElementById('mgmt-rename-btn');
    if (mgmtRename) mgmtRename.remove(); // renaming now lives in the dropdown

    function runMgmt(action) {
      var mode = window.getState().viewMode;
      var actions = (mode === 'lists') ? window.listActions : window.noteActions;
      if (actions && typeof actions[action] === 'function') {
        actions[action]();
      }
    }

    if (mgmtNew)    mgmtNew.addEventListener('click',    function () { runMgmt('create'); });
    if (mgmtDelete) mgmtDelete.addEventListener('click', function () { runMgmt('remove'); });

    // Actions popup (⋯)
    var menuBtn = document.getElementById('mgmt-menu-btn');
    var menuGroup = document.getElementById('mgmt-group');
    function closeMenu() {
      if (!menuGroup) return;
      menuGroup.classList.remove('open');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    }
    if (menuBtn && menuGroup) {
      menuBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = menuGroup.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menuGroup.addEventListener('click', closeMenu);
      document.addEventListener('click', function (e) {
        if (!menuGroup.contains(e.target)) closeMenu();
      });
    }

    // React to state changes
    window.subscribe(function (state, prev) {
      if (state.viewMode !== prev.viewMode) {
        applyMode();
      }
      if (state.lists !== prev.lists
       || state.activeList !== prev.activeList
       || state.notes !== prev.notes
       || state.activeNote !== prev.activeNote
       || state.lang !== prev.lang) {
        refreshDropdown();
      }
    });

    // Initial render
    applyMode();
  }

  // ─── Mode switching ──────────────────────────────────────────────────────
  function setMode(mode) {
    var state = window.getState();
    if (state.viewMode === mode) return;

    if (mode === 'analytics' && typeof window.stopSpeech === 'function' &&
        (state.isSpeaking || state.isPaused)) {
      window.stopSpeech();
    }

    // Save the current grid into its list before leaving Lists mode
    if (state.viewMode === 'lists' && typeof window.serializeGrid === 'function') {
      var lists = Object.assign({}, state.lists);
      if (state.activeList) {
        lists[state.activeList] = window.serializeGrid();
        window.setState({ lists: lists });
      }
    }

    // Sync noteActive flag and update state layout keys
    if (mode === 'notes') {
      var lastNote = state.activeNote;
      var noteExists = lastNote && lastNote in state.notes;
      var targetNote = noteExists ? lastNote : Object.keys(state.notes)[0];
      window.setState({
        viewMode: 'notes',
        noteActive: !!targetNote,
        activeNote: targetNote || null
      });
    } else if (mode === 'analytics') {
      window.setState({
        viewMode: 'analytics',
        noteActive: false
      });
    } else {
      window.setState({
        viewMode: 'lists',
        noteActive: false
      });
    }

    applyMode();
  }

  function applyMode() {
    var state = window.getState();
    var mode = state.viewMode || 'lists';

    // Set the view mode on the body element so CSS rules can hide/show containers
    document.body.setAttribute('data-view-mode', mode);

    // Toggle active state on the segmented layout buttons
    toggle.querySelectorAll('.seg-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
    if (dashBtn) dashBtn.classList.toggle('active', mode === 'analytics');

    // Refresh dropdown options only if we are browsing structured content tiers
    if (mode !== 'analytics') {
      refreshDropdown();
    }

    // Refresh char count for the current view
    if (typeof window.updateCharCount === 'function') window.updateCharCount();
  }

  // ─── Dropdown ────────────────────────────────────────────────────────────
  function refreshDropdown() {
    var state = window.getState();
    var mode = state.viewMode || 'lists';

    if (!viewSelect) return;
    viewSelect.innerHTML = '';

    if (mode === 'lists') {
      var listNames = Object.keys(state.lists || {});
      listNames.forEach(function (name) {
        var op = document.createElement('option');
        op.value = name;

        if (name === 'Untitled List' || name === '__DEFAULT_LIST__') {
          op.textContent = (window.__i18n__ && window.__i18n__.t) ? window.__i18n__.t('dropdownLists') : 'Untitled List';
        } else if (name === '__MISSED_QUESTIONS__') {
          op.textContent = (window.__i18n__ && window.__i18n__.t) ? window.__i18n__.t('missedListName') : 'Missed Questions';
        } else {
          op.textContent = name;
        }

        viewSelect.appendChild(op);
      });

      viewSelect.value = state.activeList && state.activeList in state.lists
        ? state.activeList
        : (listNames[0] || '');

    } else if (mode === 'notes') {
      var noteNames = Object.keys(state.notes || {});
      noteNames.forEach(function (name) {
        var op = document.createElement('option');
        op.value = name;

        if (name === 'Untitled Note' || name === '__DEFAULT_NOTE__') {
          op.textContent = (window.__i18n__ && window.__i18n__.t) ? window.__i18n__.t('dropdownNotes') : 'Untitled Note';
        } else if (name === '__TEST_RESULTS__') {
          op.textContent = (window.__i18n__ && window.__i18n__.t) ? window.__i18n__.t('testResultsNote') : 'Test Results';
        } else {
          op.textContent = name;
        }

        viewSelect.appendChild(op);
      });

      viewSelect.value = state.activeNote && state.activeNote in state.notes
        ? state.activeNote
        : (noteNames[0] || '');
    }

    buildCustom();
  }

  function onDropdownChange() {
    var name = viewSelect.value;
    var state = window.getState();

    if (state.viewMode === 'lists') {
      if (!name || !(name in state.lists)) return;
      if (name === state.activeList) return;

      var lists = Object.assign({}, state.lists);
      if (state.activeList) {
        lists[state.activeList] = window.serializeGrid();
      }

      window.setState({
        lists: lists,
        activeList: name,
        rows: window.parseList ? window.parseList(lists[name]) : []
      });

      if (typeof window.__gridRerender__ === 'function') window.__gridRerender__();
      if (typeof window.updateCharCount === 'function') window.updateCharCount();
      if (typeof window.syncStartTestButton === 'function') window.syncStartTestButton();

    } else if (state.viewMode === 'notes') {
      if (!name || !(name in state.notes)) return;

      window.setState({
        noteActive: true,
        activeNote: name
      });

      var noteArea = document.getElementById('note-area');
      if (noteArea) noteArea.value = state.notes[name] || '';
    }
  }

  window.initWorkspaceToggle = initWorkspaceToggle;
})();
