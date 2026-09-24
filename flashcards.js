/*!
 * CARS Ham Exam Flashcards
 * https://github.com/JohnBThomas/cars-flashcards  (MIT License)
 *
 * Add to a page with:
 *   <div id="cars-flashcards"></div>
 *   <script src="https://cdn.jsdelivr.net/gh/JohnBThomas/cars-flashcards@v0.1.0/flashcards.js"></script>
 *
 * Optional attributes on the div:
 *   data-exam-link   URL for "Find an exam session"
 *   data-elmer-link  URL for "Ask an Elmer"
 *   data-base        where to load data/ and images/ from (defaults to this script's folder)
 */
(function () {
  'use strict';

  var SCRIPT = document.currentScript;
  var STORE_KEY = 'cars-flashcards-v1';
  var PASS_RATE = 0.74;
  var ROUND_SIZE = 10;
  var REQUEUE_GAP = 3;
  var DAY = 24 * 60 * 60 * 1000;
  // Days until a card is due again, by Leitner box after a correct answer.
  var INTERVALS = [0, 1, 3, 7, 16, 35];
  var MASTERED_BOX = 4;

  var root, base, cfg;
  var manifest = null;
  var pools = {};
  var state = { view: 'home' };

  // ---------- storage ----------

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || { cards: {}, prefs: {} };
    } catch (e) {
      return { cards: {}, prefs: {} };
    }
  }
  var progress = loadProgress();
  progress.cards = progress.cards || {};
  progress.prefs = progress.prefs || {};

  function saveProgress() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(progress)); } catch (e) { /* private mode */ }
  }

  function cardKey(poolId, qid) { return poolId + ':' + qid; }
  function cardOf(poolId, qid) { return progress.cards[cardKey(poolId, qid)]; }

  function record(poolId, qid, correct) {
    var key = cardKey(poolId, qid);
    var c = progress.cards[key] || { box: 0, due: 0, right: 0, wrong: 0 };
    if (correct) {
      c.box = Math.min(c.box + 1, INTERVALS.length - 1);
      c.right++;
    } else {
      c.box = 1;
      c.wrong++;
    }
    c.due = Date.now() + (correct ? INTERVALS[c.box] * DAY : 0);
    c.seen = Date.now();
    progress.cards[key] = c;
    saveProgress();
  }

  // 0..1 mastery for a list of questions.
  function mastery(poolId, questions) {
    if (!questions.length) return 0;
    var sum = 0;
    questions.forEach(function (q) {
      var c = cardOf(poolId, q.id);
      if (c) sum += Math.min(c.box, MASTERED_BOX) / MASTERED_BOX;
    });
    return sum / questions.length;
  }

  function isDue(poolId, q) {
    var c = cardOf(poolId, q.id);
    return c && c.due <= Date.now();
  }

  // ---------- helpers ----------

  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, child) {
    if (child == null || child === false) return;
    if (Array.isArray(child)) { child.forEach(function (c) { append(el, c); }); return; }
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Shuffle answer order, but keep "All these choices are correct" last.
  function shuffledChoices(q) {
    var idx = [0, 1, 2, 3];
    var pinned = idx.filter(function (i) { return /^all these choices/i.test(q.a[i]); });
    var loose = idx.filter(function (i) { return pinned.indexOf(i) < 0; });
    return shuffle(loose).concat(pinned);
  }

  function pct(x) { return Math.round(x * 100) + '%'; }

  function fetchJSON(path) {
    return fetch(base + path).then(function (r) {
      if (!r.ok) throw new Error(path + ': ' + r.status);
      return r.json();
    });
  }

  function loadPool(entry) {
    if (pools[entry.id]) return Promise.resolve(pools[entry.id]);
    return Promise.all([fetchJSON(entry.file)].concat((entry.notes || []).map(function (n) {
      return fetchJSON(n).catch(function () { return null; });
    }))).then(function (res) {
      var pool = res[0];
      pool.id = entry.id;
      pool.label = entry.name;
      pool.images = entry.images || {};
      pool.concepts = {};
      pool.conceptsByGroup = {};
      pool.explanations = {};
      res.slice(1).forEach(function (notes) {
        if (!notes) return;
        (notes.concepts || []).forEach(function (c) {
          pool.concepts[c.id] = c;
          (pool.conceptsByGroup[c.group] = pool.conceptsByGroup[c.group] || []).push(c);
        });
        Object.keys(notes.explanations || {}).forEach(function (id) {
          pool.explanations[id] = notes.explanations[id];
        });
      });
      pool.byGroup = {};
      pool.questions.forEach(function (q) {
        (pool.byGroup[q.group] = pool.byGroup[q.group] || []).push(q);
      });
      pools[entry.id] = pool;
      return pool;
    });
  }

  function subQuestions(pool, sub) {
    return pool.questions.filter(function (q) { return q.id.slice(0, 2) === sub.id; });
  }

  // ---------- rendering ----------

  function render() {
    root.textContent = '';
    var view = VIEWS[state.view] || VIEWS.home;
    root.appendChild(view());
    var focus = root.querySelector('[data-autofocus]') || root.querySelector('h2');
    if (!focus) return;
    if (focus.tagName === 'H2') focus.setAttribute('tabindex', '-1');
    focus.focus({ preventScroll: true });
    // Keep the reader's place for in-card updates; jump to the top for new screens.
    if (state.scroll !== false && root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' });
  }

  function go(view, extra) {
    state = Object.assign({ view: view }, extra || {});
    render();
  }

  function crumbs(items) {
    return h('nav', { class: 'cf-crumbs', 'aria-label': 'Breadcrumb' },
      items.map(function (it, i) {
        var last = i === items.length - 1;
        return [
          last ? h('span', { 'aria-current': 'page', text: it.label })
            : h('button', { type: 'button', class: 'cf-link', onclick: it.go, text: it.label }),
          last ? null : h('span', { class: 'cf-sep', 'aria-hidden': 'true', text: '›' })
        ];
      }));
  }

  function bar(value, label) {
    return h('div', { class: 'cf-bar', role: 'img', 'aria-label': label + ': ' + pct(value) + ' mastered' },
      h('span', { style: 'width:' + pct(value) }));
  }

  function draftBadge(item) {
    if (!item || item.status === 'reviewed') return null;
    return h('span', { class: 'cf-badge', title: 'Written for CARS and waiting for review by club Elmers', text: 'Draft, awaiting club review' });
  }

  function footer() {
    var links = [];
    if (cfg.examLink) links.push(h('a', { href: cfg.examLink, text: 'Find an exam session' }));
    if (cfg.elmerLink) links.push(h('a', { href: cfg.elmerLink, text: 'Ask an Elmer' }));
    return h('footer', { class: 'cf-footer' },
      links.length ? h('p', { class: 'cf-footer-links' }, links) : null,
      h('p', { class: 'cf-fine' },
        'Questions are from the public-domain NCVEC question pools. Your progress is saved only in this browser. ',
        h('button', { type: 'button', class: 'cf-link', onclick: resetProgress, text: 'Reset my progress' })));
  }

  function resetProgress() {
    if (!window.confirm('Erase all flashcard progress saved in this browser?')) return;
    progress = { cards: {}, prefs: progress.prefs };
    saveProgress();
    go('home');
  }

  var VIEWS = {};

  VIEWS.loading = function () {
    return h('div', { class: 'cf-card' }, h('p', { text: state.message || 'Loading…' }));
  };

  VIEWS.error = function () {
    return h('div', { class: 'cf-card' },
      h('h2', { text: 'The flashcards could not load' }),
      h('p', { text: 'Please check your connection and reload the page.' }),
      h('p', { class: 'cf-fine', text: String(state.error || '') }));
  };

  VIEWS.home = function () {
    return h('div', null,
      h('div', { class: 'cf-intro' },
        h('h2', { text: 'Study for your license' }),
        h('p', { text: 'Learn each topic first, then practice. Cards you miss come back sooner, and cards you know come back less often, so your study time goes where it helps most.' })),
      h('div', { class: 'cf-grid' }, manifest.pools.map(function (p) {
        var ready = !!p.file;
        return h('div', { class: 'cf-card cf-pool' + (ready ? '' : ' cf-soon') },
          h('h3', { text: p.name }),
          h('p', { class: 'cf-muted', text: p.blurb || '' }),
          ready
            ? h('button', { type: 'button', class: 'cf-btn', onclick: function () { openPool(p); }, text: 'Start studying' })
            : h('p', { class: 'cf-muted', text: 'Coming soon' }));
      })),
      footer());
  };

  function openPool(entry) {
    go('loading', { message: 'Loading ' + entry.name + ' questions…' });
    loadPool(entry).then(function (pool) {
      progress.prefs.lastPool = entry.id;
      saveProgress();
      go('pool', { pool: pool });
    }).catch(function (err) { go('error', { error: err }); });
  }

  VIEWS.pool = function () {
    var pool = state.pool;
    var due = pool.questions.filter(function (q) { return isDue(pool.id, q); });
    var overall = mastery(pool.id, pool.questions);
    return h('div', null,
      crumbs([{ label: 'All exams', go: function () { go('home'); } }, { label: pool.label }]),
      h('div', { class: 'cf-card' },
        h('h2', { text: pool.label + ' (' + pool.name.replace(/^\D+/, '') + ' pool)' }),
        h('p', { class: 'cf-muted', text: pool.questions.length + ' questions in ' + pool.subelements.length + ' topics. The exam has ' + pool.examSize + ' questions, one from each group, and you need ' + Math.ceil(pool.examSize * PASS_RATE) + ' correct to pass.' }),
        bar(overall, 'Overall'),
        h('p', { class: 'cf-muted', text: pct(overall) + ' mastered' }),
        h('div', { class: 'cf-actions' },
          due.length ? h('button', { type: 'button', class: 'cf-btn', onclick: function () { startPractice(pool, due, 'Review due cards'); }, text: 'Review ' + due.length + ' due card' + (due.length === 1 ? '' : 's') }) : null,
          h('button', { type: 'button', class: 'cf-btn cf-btn-quiet', onclick: function () { startExam(pool); }, text: 'Take a practice exam' }))),
      h('h3', { class: 'cf-section', text: 'Topics' }),
      h('ul', { class: 'cf-list' }, pool.subelements.map(function (s) {
        var qs = subQuestions(pool, s);
        var m = mastery(pool.id, qs);
        return h('li', null,
          h('button', { type: 'button', class: 'cf-row', onclick: function () { go('sub', { pool: pool, sub: s }); } },
            h('span', { class: 'cf-row-main' },
              h('strong', { text: s.id + ' ' + s.title }),
              h('span', { class: 'cf-muted', text: qs.length + ' questions · ' + s.examQuestions + ' on the exam' })),
            h('span', { class: 'cf-row-side' }, bar(m, s.title), h('span', { class: 'cf-muted', text: pct(m) }))));
      })),
      footer());
  };

  VIEWS.sub = function () {
    var pool = state.pool, sub = state.sub;
    return h('div', null,
      crumbs([
        { label: 'All exams', go: function () { go('home'); } },
        { label: pool.label, go: function () { go('pool', { pool: pool }); } },
        { label: sub.id + ' ' + sub.title }]),
      h('h2', { text: sub.id + ' ' + sub.title }),
      h('ul', { class: 'cf-list' }, sub.groups.map(function (g) {
        var qs = pool.byGroup[g.id] || [];
        var concepts = pool.conceptsByGroup[g.id] || [];
        var m = mastery(pool.id, qs);
        return h('li', { class: 'cf-card cf-group' },
          h('div', { class: 'cf-group-head' },
            h('strong', { text: g.id }),
            h('span', { class: 'cf-row-side' }, bar(m, g.id), h('span', { class: 'cf-muted', text: pct(m) }))),
          h('p', { text: g.title }),
          h('div', { class: 'cf-actions' },
            concepts.length
              ? h('button', { type: 'button', class: 'cf-btn', onclick: function () { go('learn', { pool: pool, sub: sub, group: g, index: 0 }); }, text: 'Learn (' + concepts.length + ' lesson cards)' })
              : h('span', { class: 'cf-muted', text: 'Lesson cards coming soon' }),
            h('button', { type: 'button', class: concepts.length ? 'cf-btn cf-btn-quiet' : 'cf-btn', onclick: function () { startPractice(pool, qs, g.id + ' practice', { sub: sub }); }, text: 'Practice ' + qs.length + ' questions' })));
      })),
      footer());
  };

  VIEWS.learn = function () {
    var pool = state.pool, sub = state.sub, g = state.group;
    var concepts = pool.conceptsByGroup[g.id] || [];
    var i = state.index;
    var c = concepts[i];
    var last = i === concepts.length - 1;
    return h('div', null,
      crumbs([
        { label: pool.label, go: function () { go('pool', { pool: pool }); } },
        { label: sub.id, go: function () { go('sub', { pool: pool, sub: sub }); } },
        { label: g.id + ' lessons' }]),
      h('article', { class: 'cf-card cf-lesson' },
        h('p', { class: 'cf-eyebrow', text: 'Lesson ' + (i + 1) + ' of ' + concepts.length }),
        h('h2', { text: c.title }),
        (c.body || []).map(paragraph),
        c.formula ? h('p', { class: 'cf-formula', text: c.formula }) : null,
        draftBadge(c)),
      h('div', { class: 'cf-actions' },
        i > 0 ? h('button', { type: 'button', class: 'cf-btn cf-btn-quiet', onclick: function () { go('learn', { pool: pool, sub: sub, group: g, index: i - 1 }); }, text: '‹ Previous' }) : null,
        last
          ? h('button', { type: 'button', class: 'cf-btn', 'data-autofocus': true, onclick: function () { startPractice(pool, pool.byGroup[g.id], g.id + ' practice', { sub: sub }); }, text: 'Practice these questions' })
          : h('button', { type: 'button', class: 'cf-btn', 'data-autofocus': true, onclick: function () { go('learn', { pool: pool, sub: sub, group: g, index: i + 1 }); }, text: 'Next ›' })));
  };

  function paragraph(text) {
    return /^•/.test(text) ? h('p', { class: 'cf-bullet', text: text.replace(/^•\s*/, '') }) : h('p', { text: text });
  }

  // ---------- practice ----------

  // Due cards first, then new cards, then the rest (least known first).
  function buildRound(pool, questions) {
    var now = Date.now();
    var due = [], fresh = [], later = [];
    shuffle(questions).forEach(function (q) {
      var c = cardOf(pool.id, q.id);
      if (!c) fresh.push(q);
      else if (c.due <= now) due.push(q);
      else later.push(q);
    });
    later.sort(function (a, b) { return cardOf(pool.id, a.id).box - cardOf(pool.id, b.id).box; });
    return due.concat(fresh, later).slice(0, ROUND_SIZE);
  }

  function startPractice(pool, questions, title, extra) {
    go('practice', Object.assign({
      pool: pool,
      title: title,
      source: questions,
      queue: buildRound(pool, questions),
      pos: 0,
      stage: recallPref() ? 'recall' : 'choose',
      order: null,
      picked: null,
      tally: { right: 0, wrong: 0 },
      missed: {}
    }, extra || {}));
  }

  function recallPref() { return progress.prefs.recall !== false; }

  function figureFor(pool, q) {
    if (!q.fig || !pool.images[q.fig]) return null;
    return h('figure', { class: 'cf-figure' },
      h('img', { src: base + pool.images[q.fig], alt: 'Figure ' + q.fig + ' schematic diagram', loading: 'lazy' }));
  }

  VIEWS.practice = function () {
    var s = state, pool = s.pool;
    if (s.pos >= s.queue.length) return roundDone();
    var q = s.queue[s.pos];
    if (!s.order) s.order = shuffledChoices(q);
    var answered = s.picked != null;
    var exp = pool.explanations[q.id];
    var concept = exp && pool.concepts[exp.concept];

    var back = s.sub
      ? { label: s.sub.id, go: function () { go('sub', { pool: pool, sub: s.sub }); } }
      : { label: pool.label, go: function () { go('pool', { pool: pool }); } };

    var body;
    if (s.stage === 'recall') {
      body = [
        h('p', { class: 'cf-hint', text: 'Think of the answer first, then show the choices.' }),
        h('div', { class: 'cf-actions' },
          h('button', { type: 'button', class: 'cf-btn', 'data-autofocus': true, onclick: function () { s.stage = 'choose'; s.scroll = false; render(); }, text: 'Show choices' }))
      ];
    } else {
      body = h('div', { class: 'cf-choices', role: 'group', 'aria-label': 'Answer choices' },
        s.order.map(function (ai, n) {
          var cls = 'cf-choice';
          if (answered) {
            if (ai === q.correct) cls += ' cf-right';
            else if (ai === s.picked) cls += ' cf-wrong';
          }
          return h('button', {
            type: 'button', class: cls, disabled: answered, 'data-autofocus': n === 0 && !answered,
            onclick: function () { answer(ai); }
          }, h('span', { class: 'cf-key', 'aria-hidden': 'true', text: String(n + 1) }), h('span', { text: q.a[ai] }));
        }));
    }

    var feedback = null;
    if (answered) {
      var ok = s.picked === q.correct;
      feedback = h('div', { class: 'cf-feedback ' + (ok ? 'cf-ok' : 'cf-no'), role: 'status' },
        h('p', { class: 'cf-verdict', text: ok ? 'Correct.' : 'Not quite. The answer is: ' + q.a[q.correct] }),
        exp ? h('p', { text: exp.why }) : h('p', { class: 'cf-muted', text: 'An explanation for this question has not been written yet.' }),
        exp && exp.work ? h('div', { class: 'cf-work' }, exp.work.map(function (line) { return h('div', { text: line }); })) : null,
        h('div', { class: 'cf-feedback-foot' },
          concept ? h('button', { type: 'button', class: 'cf-link', onclick: function () { showConcept(concept); }, text: 'Review the lesson: ' + concept.title }) : null,
          q.refs ? h('span', { class: 'cf-muted', text: 'FCC rule: §' + q.refs.replace(/,\s*/g, ', §') }) : null,
          draftBadge(exp)),
        h('div', { class: 'cf-actions' },
          h('button', { type: 'button', class: 'cf-btn', 'data-autofocus': true, onclick: next, text: s.pos === s.queue.length - 1 ? 'Finish round' : 'Next question ›' })));
    }

    return h('div', null,
      crumbs([{ label: pool.label, go: function () { go('pool', { pool: pool }); } }, back, { label: s.title }]),
      h('div', { class: 'cf-card cf-question' },
        h('div', { class: 'cf-qhead' },
          h('span', { class: 'cf-eyebrow', text: 'Card ' + (s.pos + 1) + ' of ' + s.queue.length }),
          h('label', { class: 'cf-toggle' },
            h('input', { type: 'checkbox', checked: recallPref(), onchange: function (e) { progress.prefs.recall = e.target.checked; saveProgress(); } }),
            ' Recall first')),
        h('h2', { class: 'cf-qtext', text: q.q }),
        figureFor(pool, q),
        body,
        feedback,
        h('p', { class: 'cf-qid cf-muted', text: q.id })));
  };

  function answer(ai) {
    var s = state;
    if (s.picked != null) return;
    var q = s.queue[s.pos];
    s.picked = ai;
    var ok = ai === q.correct;
    record(s.pool.id, q.id, ok);
    if (ok) s.tally.right++;
    else {
      s.tally.wrong++;
      s.missed[q.id] = true;
      // Bring a missed card back later in this same round.
      if (s.queue.indexOf(q, s.pos + 1) < 0) s.queue.splice(Math.min(s.pos + 1 + REQUEUE_GAP, s.queue.length), 0, q);
    }
    s.scroll = false;
    render();
  }

  function next() {
    var s = state;
    s.pos++;
    s.order = null;
    s.picked = null;
    s.stage = recallPref() ? 'recall' : 'choose';
    s.scroll = true;
    render();
  }

  function showConcept(c) {
    var dlg = h('dialog', { class: 'cf-dialog', 'aria-label': c.title },
      h('h2', { text: c.title }),
      (c.body || []).map(paragraph),
      c.formula ? h('p', { class: 'cf-formula', text: c.formula }) : null,
      draftBadge(c),
      h('div', { class: 'cf-actions' },
        h('button', { type: 'button', class: 'cf-btn', onclick: function () { dlg.close(); }, text: 'Back to the question' })));
    dlg.addEventListener('close', function () { dlg.remove(); });
    root.appendChild(dlg);
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }

  function roundDone() {
    var s = state, pool = s.pool;
    var missed = Object.keys(s.missed);
    var total = s.tally.right + s.tally.wrong;
    return h('div', null,
      h('div', { class: 'cf-card' },
        h('h2', { text: 'Round complete' }),
        h('p', { text: s.tally.right + ' of ' + total + ' answers correct' + (missed.length ? ', and ' + missed.length + ' card' + (missed.length === 1 ? '' : 's') + ' to review again soon.' : '. Nice work.') }),
        h('p', { class: 'cf-muted', text: 'Cards you missed will come back sooner. Cards you knew will come back in a few days to make sure they stick.' }),
        h('div', { class: 'cf-actions' },
          h('button', { type: 'button', class: 'cf-btn', 'data-autofocus': true, onclick: function () { startPractice(pool, s.source, s.title, { sub: s.sub }); }, text: 'Another round' }),
          s.sub ? h('button', { type: 'button', class: 'cf-btn cf-btn-quiet', onclick: function () { go('sub', { pool: pool, sub: s.sub }); }, text: 'Back to ' + s.sub.id }) : null,
          h('button', { type: 'button', class: 'cf-btn cf-btn-quiet', onclick: function () { go('pool', { pool: pool }); }, text: 'All topics' }))),
      footer());
  }

  // ---------- practice exam ----------

  function startExam(pool) {
    var questions = [];
    pool.subelements.forEach(function (s) {
      s.groups.forEach(function (g) {
        var qs = pool.byGroup[g.id];
        questions.push(qs[Math.floor(Math.random() * qs.length)]);
      });
    });
    go('exam', {
      pool: pool,
      questions: questions,
      orders: questions.map(shuffledChoices),
      answers: {},
      pos: 0
    });
  }

  VIEWS.exam = function () {
    var s = state, pool = s.pool;
    var q = s.questions[s.pos];
    var order = s.orders[s.pos];
    var done = Object.keys(s.answers).length;
    return h('div', null,
      crumbs([{ label: pool.label, go: function () { if (window.confirm('Leave the practice exam? Your answers will not be saved.')) go('pool', { pool: pool }); } }, { label: 'Practice exam' }]),
      h('div', { class: 'cf-card cf-question' },
        h('div', { class: 'cf-qhead' },
          h('span', { class: 'cf-eyebrow', text: 'Question ' + (s.pos + 1) + ' of ' + s.questions.length }),
          h('span', { class: 'cf-muted', text: done + ' answered' })),
        h('h2', { class: 'cf-qtext', text: q.q }),
        figureFor(pool, q),
        h('div', { class: 'cf-choices', role: 'radiogroup', 'aria-label': 'Answer choices' },
          order.map(function (ai, n) {
            var sel = s.answers[q.id] === ai;
            return h('button', {
              type: 'button', role: 'radio', 'aria-checked': sel ? 'true' : 'false',
              class: 'cf-choice' + (sel ? ' cf-selected' : ''),
              onclick: function () { s.answers[q.id] = ai; s.scroll = false; render(); }
            }, h('span', { class: 'cf-key', 'aria-hidden': 'true', text: String(n + 1) }), h('span', { text: q.a[ai] }));
          })),
        h('div', { class: 'cf-actions' },
          s.pos > 0 ? h('button', { type: 'button', class: 'cf-btn cf-btn-quiet', onclick: function () { s.pos--; s.scroll = true; render(); }, text: '‹ Previous' }) : null,
          s.pos < s.questions.length - 1
            ? h('button', { type: 'button', class: 'cf-btn', onclick: function () { s.pos++; s.scroll = true; render(); }, text: 'Next ›' })
            : h('button', { type: 'button', class: 'cf-btn', onclick: gradeExam, text: 'Grade my exam' }))));
  };

  function gradeExam() {
    var s = state;
    var blank = s.questions.length - Object.keys(s.answers).length;
    if (blank && !window.confirm(blank + ' question' + (blank === 1 ? ' is' : 's are') + ' unanswered and will be marked wrong. Grade anyway?')) return;
    s.questions.forEach(function (q) {
      if (s.answers[q.id] != null) record(s.pool.id, q.id, s.answers[q.id] === q.correct);
    });
    go('examResult', { pool: s.pool, questions: s.questions, answers: s.answers });
  }

  VIEWS.examResult = function () {
    var s = state, pool = s.pool;
    var right = s.questions.filter(function (q) { return s.answers[q.id] === q.correct; });
    var need = Math.ceil(s.questions.length * PASS_RATE);
    var passed = right.length >= need;
    var wrong = s.questions.filter(function (q) { return s.answers[q.id] !== q.correct; });
    return h('div', null,
      h('div', { class: 'cf-card' },
        h('h2', { text: passed ? 'You passed this practice exam' : 'Not a pass yet' }),
        h('p', { class: 'cf-score', text: right.length + ' of ' + s.questions.length + ' correct (' + need + ' needed)' }),
        h('p', { class: 'cf-muted', text: passed
          ? 'A few passes in a row means you are likely ready for the real exam.'
          : 'Focus on the topics below, then try another practice exam.' }),
        h('ul', { class: 'cf-list' }, pool.subelements.map(function (sub) {
          var qs = s.questions.filter(function (q) { return q.id.slice(0, 2) === sub.id; });
          var ok = qs.filter(function (q) { return s.answers[q.id] === q.correct; }).length;
          return h('li', { class: 'cf-result-row' },
            h('span', { text: sub.id + ' ' + sub.title }),
            h('span', { class: ok === qs.length ? 'cf-good' : 'cf-weak', text: ok + ' / ' + qs.length }));
        })),
        h('div', { class: 'cf-actions' },
          wrong.length ? h('button', { type: 'button', class: 'cf-btn', onclick: function () { startPractice(pool, wrong, 'Exam misses'); }, text: 'Study the ' + wrong.length + ' I missed' }) : null,
          h('button', { type: 'button', class: 'cf-btn cf-btn-quiet', onclick: function () { startExam(pool); }, text: 'New practice exam' }),
          h('button', { type: 'button', class: 'cf-btn cf-btn-quiet', onclick: function () { go('pool', { pool: pool }); }, text: 'All topics' }))),
      wrong.length ? h('h3', { class: 'cf-section', text: 'Questions to review' }) : null,
      wrong.map(function (q) {
        var exp = pool.explanations[q.id];
        var mine = s.answers[q.id];
        return h('div', { class: 'cf-card cf-review' },
          h('p', { class: 'cf-eyebrow', text: q.id }),
          h('p', { class: 'cf-qtext-sm', text: q.q }),
          mine != null ? h('p', { class: 'cf-wrong-text', text: 'Your answer: ' + q.a[mine] }) : h('p', { class: 'cf-wrong-text', text: 'Not answered' }),
          h('p', { class: 'cf-right-text', text: 'Correct answer: ' + q.a[q.correct] }),
          exp ? h('p', { text: exp.why }) : null,
          exp && exp.work ? h('div', { class: 'cf-work' }, exp.work.map(function (line) { return h('div', { text: line }); })) : null);
      }),
      footer());
  };

  // ---------- keyboard ----------

  function onKey(e) {
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (root.querySelector('dialog[open]')) return;
    if (state.view === 'practice' || state.view === 'exam') {
      var n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        var btns = root.querySelectorAll('.cf-choice:not([disabled])');
        if (btns[n - 1]) { e.preventDefault(); btns[n - 1].click(); }
      }
    }
  }

  // ---------- styles ----------

  // Colors use the CARS WordPress palette variables when present (they already
  // switch for dark mode), with the same values as fallbacks elsewhere.
  var CSS = [
    '.cf{--cf-page:var(--wp--preset--color--cars-page,#eef1f5);--cf-surface:var(--wp--preset--color--cars-surface,#f8fafc);--cf-ink:var(--wp--preset--color--cars-ink,#0f2747);--cf-muted:var(--wp--preset--color--cars-muted,#4a5563);--cf-line:var(--wp--preset--color--cars-line,#d3dbe6);--cf-gold:var(--wp--preset--color--cars-gold,#ffd21f);--cf-on-gold:var(--wp--preset--color--cars-on-gold,#0f2747);--cf-eyebrow:var(--wp--preset--color--cars-eyebrow,#6b5500);--cf-panel:var(--wp--preset--color--cars-panel,#0f2747);--cf-ok:#1c7c3c;--cf-ok-bg:rgba(28,124,60,.1);--cf-no:#b3261e;--cf-no-bg:rgba(179,38,30,.08);color:var(--cf-ink);font-size:1rem;line-height:1.55;max-width:760px;margin:0 auto;scroll-margin-top:80px}',
    '@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .cf{--cf-ok:#6fd08e;--cf-ok-bg:rgba(111,208,142,.12);--cf-no:#ff8a80;--cf-no-bg:rgba(255,138,128,.1)}}',
    ':root[data-theme="dark"] .cf{--cf-ok:#6fd08e;--cf-ok-bg:rgba(111,208,142,.12);--cf-no:#ff8a80;--cf-no-bg:rgba(255,138,128,.1)}',
    '.cf *{box-sizing:border-box}',
    '.cf h2{font-size:1.35rem;line-height:1.3;margin:0 0 .6rem}',
    '.cf h3{font-size:1.1rem;margin:0 0 .4rem}',
    '.cf p{margin:0 0 .7rem}',
    '.cf-card{background:var(--cf-surface);border:1px solid var(--cf-line);border-radius:10px;padding:1.1rem 1.25rem;margin:0 0 1rem}',
    '.cf-intro{margin:0 0 1rem}',
    '.cf-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem}',
    '.cf-soon{opacity:.75}',
    '.cf-muted{color:var(--cf-muted)}',
    '.cf-fine{color:var(--cf-muted);font-size:.85rem}',
    '.cf-eyebrow{color:var(--cf-eyebrow);font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin:0 0 .3rem}',
    '.cf-section{margin:1.4rem 0 .6rem}',
    '.cf-btn{font:inherit;font-weight:600;background:var(--cf-gold);color:var(--cf-on-gold);border:0;box-shadow:inset 0 0 0 1.5px var(--cf-panel);border-radius:8px;padding:.6rem 1.1rem;cursor:pointer;min-height:44px}',
    '.cf-btn:hover{filter:brightness(1.05)}',
    '.cf-btn-quiet{background:transparent;color:var(--cf-ink);box-shadow:inset 0 0 0 1.5px var(--cf-line)}',
    '.cf a{color:inherit;text-decoration:underline}',
    '.cf-link{font:inherit;background:none;border:0;padding:0;color:inherit;text-decoration:underline;cursor:pointer}',
    '.cf button:focus-visible,.cf input:focus-visible,.cf h2:focus-visible{outline:3px solid var(--cf-gold);outline-offset:2px}',
    '.cf h2:focus:not(:focus-visible){outline:none}',
    '.cf-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.8rem;align-items:center}',
    '.cf-crumbs{display:flex;flex-wrap:wrap;gap:.35rem;font-size:.9rem;margin:0 0 .8rem;color:var(--cf-muted)}',
    '.cf-bar{height:8px;background:var(--cf-line);border-radius:4px;overflow:hidden;min-width:80px}',
    '.cf-bar span{display:block;height:100%;background:var(--cf-gold)}',
    '.cf-list{list-style:none;margin:0;padding:0}',
    '.cf-row{font:inherit;color:inherit;width:100%;display:flex;gap:1rem;justify-content:space-between;align-items:center;text-align:left;background:var(--cf-surface);border:1px solid var(--cf-line);border-radius:10px;padding:.8rem 1rem;margin:0 0 .6rem;cursor:pointer}',
    '.cf-row:hover{border-color:var(--cf-muted)}',
    '.cf-row-main{display:flex;flex-direction:column}',
    '.cf-row-side{display:flex;align-items:center;gap:.5rem;flex:0 0 auto}',
    '.cf-row-side .cf-bar{width:90px}',
    '.cf-group-head{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.3rem}',
    '.cf-lesson p{font-size:1.05rem}',
    '.cf-bullet{padding-left:1.1rem;position:relative}',
    '.cf-bullet:before{content:"•";position:absolute;left:.2rem}',
    '.cf-formula{font-family:ui-monospace,Consolas,monospace;font-size:1.15rem;background:var(--cf-page);border-left:4px solid var(--cf-gold);padding:.5rem .8rem;border-radius:4px}',
    '.cf-badge{display:inline-block;font-size:.75rem;border:1px dashed var(--cf-muted);color:var(--cf-muted);border-radius:999px;padding:.1rem .6rem}',
    '.cf-qhead{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.4rem}',
    '.cf-toggle{font-size:.9rem;color:var(--cf-muted);display:flex;gap:.35rem;align-items:center;cursor:pointer}',
    '.cf-qtext{font-size:1.2rem;font-weight:600}',
    '.cf-hint{color:var(--cf-muted);font-style:italic}',
    '.cf-choices{display:flex;flex-direction:column;gap:.5rem;margin:.8rem 0}',
    '.cf-choice{font:inherit;color:inherit;text-align:left;display:flex;gap:.75rem;align-items:flex-start;background:var(--cf-page);border:1.5px solid var(--cf-line);border-radius:8px;padding:.7rem .9rem;cursor:pointer;min-height:44px}',
    '.cf-choice:hover:not([disabled]){border-color:var(--cf-muted)}',
    '.cf-choice[disabled]{cursor:default}',
    '.cf-key{flex:0 0 1.6rem;height:1.6rem;border-radius:50%;border:1px solid var(--cf-line);display:inline-flex;align-items:center;justify-content:center;font-size:.8rem;color:var(--cf-muted)}',
    '.cf-selected{border-color:var(--cf-ink);box-shadow:inset 0 0 0 1px var(--cf-ink)}',
    '.cf-right{border-color:var(--cf-ok);background:var(--cf-ok-bg)}',
    '.cf-wrong{border-color:var(--cf-no);background:var(--cf-no-bg)}',
    '.cf-feedback{border-radius:8px;padding:.9rem 1rem;margin-top:.4rem;border-left:5px solid}',
    '.cf-ok{border-color:var(--cf-ok);background:var(--cf-ok-bg)}',
    '.cf-no{border-color:var(--cf-no);background:var(--cf-no-bg)}',
    '.cf-verdict{font-weight:700}',
    '.cf-work{font-family:ui-monospace,Consolas,monospace;background:var(--cf-surface);border:1px solid var(--cf-line);border-radius:6px;padding:.5rem .8rem;margin:0 0 .7rem}',
    '.cf-feedback-foot{display:flex;flex-wrap:wrap;gap:.4rem 1rem;align-items:center;font-size:.9rem}',
    '.cf-qid{font-size:.8rem;margin:.6rem 0 0;text-align:right}',
    '.cf-figure{margin:.6rem 0;background:#fff;border:1px solid var(--cf-line);border-radius:8px;padding:.5rem}',
    '.cf-figure img{display:block;max-width:100%;max-height:340px;height:auto;margin:0 auto}',
    '.cf-score{font-size:1.4rem;font-weight:700}',
    '.cf-result-row{display:flex;justify-content:space-between;gap:1rem;padding:.35rem 0;border-bottom:1px solid var(--cf-line)}',
    '.cf-good{color:var(--cf-ok);font-weight:700}',
    '.cf-weak{color:var(--cf-no);font-weight:700}',
    '.cf-qtext-sm{font-weight:600}',
    '.cf-wrong-text{color:var(--cf-no)}',
    '.cf-right-text{color:var(--cf-ok);font-weight:600}',
    '.cf-footer{margin-top:1.5rem;border-top:1px solid var(--cf-line);padding-top:.8rem}',
    '.cf-footer-links{display:flex;gap:1.2rem;flex-wrap:wrap}',
    '.cf-dialog{max-width:640px;width:calc(100% - 32px);border:1px solid var(--cf-line);border-radius:12px;padding:1.2rem 1.4rem;background:var(--cf-surface);color:var(--cf-ink)}',
    '.cf-dialog::backdrop{background:rgba(0,0,0,.45)}',
    '@media (max-width:599px){.cf-card{padding:.9rem}.cf-row{flex-direction:column;align-items:flex-start}.cf-row-side .cf-bar{width:140px}.cf-qtext{font-size:1.1rem}}'
  ].join('\n');

  // ---------- start ----------

  function start() {
    root = document.getElementById('cars-flashcards');
    if (!root) return;
    cfg = {
      examLink: root.getAttribute('data-exam-link'),
      elmerLink: root.getAttribute('data-elmer-link')
    };
    base = root.getAttribute('data-base') || (SCRIPT ? SCRIPT.src.replace(/[^/]*$/, '') : '');
    if (base && !/\/$/.test(base)) base += '/';
    root.classList.add('cf');
    root.appendChild(h('style', { text: CSS }));
    root = root.appendChild(h('div', { class: 'cf-app' }));
    document.addEventListener('keydown', onKey);
    go('loading');
    fetchJSON('data/pools.json').then(function (m) {
      manifest = m;
      var last = m.pools.filter(function (p) { return p.id === progress.prefs.lastPool && p.file; })[0];
      if (last) openPool(last); else go('home');
    }).catch(function (err) { go('error', { error: err }); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
