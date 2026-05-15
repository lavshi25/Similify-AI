/* =====================================================
   Similify AI — script.js
   Pure vanilla JS. No libraries. No build step.
   Works standalone (client TF-IDF) or with Flask
   backend at POST /analyze
   ===================================================== */

"use strict";

// ── SVG gradient injection (can't be in external CSS) ──
(function injectRingGradient() {
  var svg = document.querySelector(".score-ring");
  if (!svg) return;
  var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML =
    '<linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#818cf8"/>' +
      '<stop offset="50%" stop-color="#38bdf8"/>' +
      '<stop offset="100%" stop-color="#a78bfa"/>' +
    '</linearGradient>';
  svg.prepend(defs);
})();

// ── Char counters ────────────────────────────────────
document.getElementById("text1").addEventListener("input", function () {
  document.getElementById("count1").textContent =
    this.value.length.toLocaleString() + " characters";
});

document.getElementById("text2").addEventListener("input", function () {
  document.getElementById("count2").textContent =
    this.value.length.toLocaleString() + " characters";
});

// ── Clear All ────────────────────────────────────────
function clearAll() {
  document.getElementById("text1").value = "";
  document.getElementById("text2").value = "";
  document.getElementById("count1").textContent = "0 characters";
  document.getElementById("count2").textContent = "0 characters";
  document.getElementById("resultsSection").classList.remove("visible");
  document.getElementById("loader").classList.remove("active");
}

// ── Main Entry ───────────────────────────────────────
function runAnalysis() {
  var t1 = document.getElementById("text1").value.trim();
  var t2 = document.getElementById("text2").value.trim();

  if (!t1 || !t2) {
    var btn = document.getElementById("analyzeBtn");
    btn.classList.remove("shake");
    // force reflow so animation restarts
    void btn.offsetWidth;
    btn.classList.add("shake");
    setTimeout(function () { btn.classList.remove("shake"); }, 400);
    return;
  }

  setLoading(true);
  document.getElementById("resultsSection").classList.remove("visible");

  // Try Flask backend; fall back to client TF-IDF after timeout
  var done = false;

  fetch("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text1: t1, text2: t2 })
  })
    .then(function (res) {
      if (!res.ok) throw new Error("Backend returned " + res.status);
      return res.json();
    })
    .then(function (data) {
      if (done) return;
      done = true;
      setLoading(false);
      renderResults(data, t1, t2);
    })
    .catch(function () {
      if (done) return;
      done = true;
      // Client-side fallback with simulated delay
      setTimeout(function () {
        setLoading(false);
        renderResults(clientAnalysis(t1, t2), t1, t2);
      }, 1000);
    });

  // Timeout safety net
  setTimeout(function () {
    if (!done) {
      done = true;
      setLoading(false);
      renderResults(clientAnalysis(t1, t2), t1, t2);
    }
  }, 7000);
}

// ── Loading ──────────────────────────────────────────
var _loaderTimer = null;
var _loaderPhases = [
  "Tokenizing corpus…",
  "Building TF-IDF matrix…",
  "Computing cosine similarity…",
  "Mapping sentence pairs…",
  "Finalizing results…"
];

function setLoading(on) {
  var loader = document.getElementById("loader");
  var btn    = document.getElementById("analyzeBtn");
  var loaderText = document.getElementById("loaderText");

  if (on) {
    loader.classList.add("active");
    btn.disabled = true;
    loaderText.textContent = _loaderPhases[0];
    var i = 0;
    _loaderTimer = setInterval(function () {
      i = (i + 1) % _loaderPhases.length;
      loaderText.textContent = _loaderPhases[i];
    }, 400);
  } else {
    loader.classList.remove("active");
    btn.disabled = false;
    clearInterval(_loaderTimer);
  }
}

// ── Render Results ───────────────────────────────────
function renderResults(data, t1, t2) {
  var pct = Math.round(data.similarity_score * 100);

  // Score number
  animateNumber("scoreNum", 0, pct, 900);

  // Bar
  setTimeout(function () {
    document.getElementById("scoreBarFill").style.width = pct + "%";
  }, 50);

  // Ring: circumference = 2 * PI * 66 ≈ 414.69
  var circ = 414.69;
  setTimeout(function () {
    document.getElementById("ringFill").style.strokeDashoffset =
      circ - (circ * pct / 100);
  }, 80);

  // Verdict
  var verdict = document.getElementById("scoreVerdict");
  if (pct >= 70) {
    verdict.textContent = "⚠ HIGH SIMILARITY — Likely Plagiarised";
    verdict.className = "score-verdict high";
  } else if (pct >= 40) {
    verdict.textContent = "◈ MODERATE SIMILARITY — Partial Overlap";
    verdict.className = "score-verdict medium";
  } else {
    verdict.textContent = "✓ LOW SIMILARITY — Mostly Original";
    verdict.className = "score-verdict low";
  }

  // Stats
  var w1      = wordCount(t1);
  var w2      = wordCount(t2);
  var pairs   = data.sentence_similarities || [];
  var highCnt = pairs.filter(function (p) { return p.score >= 0.7; }).length;

  animateNumber("statW1",    0, w1,         700);
  animateNumber("statW2",    0, w2,         700);
  animateNumber("statPairs", 0, pairs.length, 700);
  animateNumber("statHigh",  0, highCnt,    700);

  // Sentence list
  buildMatchList(pairs);

  // Show section
  var section = document.getElementById("resultsSection");
  section.classList.add("visible");
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Match List ───────────────────────────────────────
function buildMatchList(pairs) {
  var list = document.getElementById("matchList");
  list.innerHTML = "";

  if (!pairs || pairs.length === 0) {
    var empty = document.createElement("p");
    empty.style.cssText = "color:var(--text-muted);font-size:.85rem;padding:12px 0";
    empty.textContent = "No sentence-level data returned.";
    list.appendChild(empty);
    return;
  }

  pairs.forEach(function (pair, idx) {
    var pct  = Math.round(pair.score * 100);
    var tier = pct >= 70 ? "high" : pct >= 40 ? "medium" : "low";

    var card = document.createElement("div");
    card.className = "match-card " + tier;
    card.style.animationDelay = (idx * 0.04) + "s";

    var toggle = document.createElement("div");
    toggle.className = "match-toggle";
    toggle.innerHTML =
      '<span class="match-pair-label">PAIR #' + String(idx + 1).padStart(2, "0") + '</span>' +
      '<div class="match-minibar-wrap"><div class="match-minibar" style="width:' + pct + '%"></div></div>' +
      '<span class="match-pct-pill">' + pct + '% match</span>' +
      '<span class="match-chevron">▾</span>';

    var body = document.createElement("div");
    body.className = "match-body";
    body.innerHTML =
      '<div class="match-col">' +
        '<span class="match-col-label">Source Sentence</span>' +
        '<p>' + escapeHtml(pair.sentence1) + '</p>' +
      '</div>' +
      '<div class="match-col">' +
        '<span class="match-col-label">Comparison Sentence</span>' +
        '<p>' + escapeHtml(pair.sentence2) + '</p>' +
      '</div>';

    toggle.addEventListener("click", function () {
      card.classList.toggle("open");
    });

    card.appendChild(toggle);
    card.appendChild(body);
    list.appendChild(card);
  });
}

// ── Client-side TF-IDF + Cosine Similarity ───────────
function clientAnalysis(text1, text2) {
  var sents1 = splitSentences(text1);
  var sents2 = splitSentences(text2);

  // Overall score on full texts
  var overall = cosine(tfidf(text1, [text1, text2]), tfidf(text2, [text1, text2]));

  // Sentence pairs: best match for each sentence in text1
  var pairs = [];
  for (var i = 0; i < sents1.length; i++) {
    var s1 = sents1[i];
    if (s1.trim().length < 8) continue;
    var best = 0;
    var bestSent = sents2[0] || "";
    for (var j = 0; j < sents2.length; j++) {
      var sc = cosine(tfidf(s1, [s1, sents2[j]]), tfidf(sents2[j], [s1, sents2[j]]));
      if (sc > best) { best = sc; bestSent = sents2[j]; }
    }
    pairs.push({ sentence1: s1, sentence2: bestSent, score: best });
  }

  // Sort descending, cap at 12
  pairs.sort(function (a, b) { return b.score - a.score; });
  pairs = pairs.slice(0, 12);

  return { similarity_score: overall, sentence_similarities: pairs };
}

// ── TF-IDF helpers ────────────────────────────────────
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(function (w) { return w.length > 1 && !STOPWORDS[w]; });
}

function termFrequency(tokens) {
  var tf = {};
  var len = tokens.length || 1;
  for (var i = 0; i < tokens.length; i++) {
    tf[tokens[i]] = (tf[tokens[i]] || 0) + 1;
  }
  for (var k in tf) { tf[k] /= len; }
  return tf;
}

function tfidf(text, corpus) {
  var tokens = tokenize(text);
  var tf     = termFrequency(tokens);
  var N      = corpus.length;

  // Build vocab from corpus
  var vocab = {};
  for (var c = 0; c < corpus.length; c++) {
    var ctokens = tokenize(corpus[c]);
    for (var t = 0; t < ctokens.length; t++) { vocab[ctokens[t]] = true; }
  }

  var vec = {};
  for (var term in vocab) {
    var df = 0;
    for (var d = 0; d < corpus.length; d++) {
      if (tokenize(corpus[d]).indexOf(term) !== -1) df++;
    }
    var idf = Math.log((N + 1) / (df + 1)) + 1;
    vec[term] = (tf[term] || 0) * idf;
  }
  return vec;
}

function cosine(v1, v2) {
  var dot = 0, n1 = 0, n2 = 0;
  var keys = {};
  for (var k in v1) { keys[k] = true; }
  for (var k in v2) { keys[k] = true; }
  for (var k in keys) {
    var a = v1[k] || 0;
    var b = v2[k] || 0;
    dot += a * b;
    n1  += a * a;
    n2  += b * b;
  }
  if (!n1 || !n2) return 0;
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 6; });
}

// ── Utilities ─────────────────────────────────────────
function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function animateNumber(id, from, to, duration) {
  var el    = document.getElementById(id);
  var start = null;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / duration, 1);
    // ease out cubic
    var e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + e * (to - from)).toLocaleString();
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Stop-words ────────────────────────────────────────
var STOPWORDS = (function () {
  var words = ["a","an","the","and","or","but","in","on","at","to","for","of",
    "with","by","from","is","are","was","were","be","been","being","have","has",
    "had","do","does","did","will","would","could","should","may","might","shall",
    "this","that","these","those","it","its","they","them","their","we","our",
    "you","your","he","his","she","her","i","my","me","us","as","if","so","not",
    "no","nor","than","then","when","where","which","who","what","how","all",
    "each","both","more","most","other","some","such","into","through","during",
    "before","after","above","below","between","out","about","up","also","just",
    "only","very","too","here","there","can","any","every","s","t","re","ve","ll"];
  var map = {};
  for (var i = 0; i < words.length; i++) { map[words[i]] = true; }
  return map;
})();