/* ==========================================================================
 * sequences.js
 *
 * App-specific logic for the "Sequences" interactive teaching app.
 * Explores the epsilon-N (and B-N) definitions of limits of sequences,
 * across four behavioural categories: converges to a constant, diverges
 * to +infinity, bounded/divergent/irregular, and unbounded/divergent/
 * irregular.
 *
 * Depends on:
 *   - teaching-app.js  (the TeachingApp engine - must be loaded first)
 *
 * This file is loaded from index.html and exposes a single global
 * initialiser:  SequencesApp.init()
 * ========================================================================== */

var SequencesApp = (function () {
  'use strict';

  var TA = TeachingApp;

  /* ======================================================================
   * FORMATTING HELPERS
   * ====================================================================== */

  function fmtSci(x, digits) {
    var s = x.toExponential(digits === undefined ? 2 : digits);
    var parts = s.split('e');
    var exp = parseInt(parts[1], 10);
    return parts[0] + '\u00D710<sup>' + exp + '</sup>';
  }

  function fmtNum(x) {
    if (x === Infinity) return '\u221E';
    if (x === -Infinity) return '-\u221E';
    if (!isFinite(x)) return 'undefined';
    if (x === 0) return '0';
    var ax = Math.abs(x);
    if (ax >= 100000 || ax < 0.001) return fmtSci(x, 2);
    var str = x.toPrecision(4);
    if (str.indexOf('.') !== -1) {
      str = str.replace(/0+$/, '').replace(/\.$/, '');
    }
    return str;
  }

  function fmtNumPlain(x) {
    if (x === Infinity) return '\u221E';
    if (x === -Infinity) return '-\u221E';
    if (!isFinite(x)) return 'undefined';
    if (x === 0) return '0';
    var ax = Math.abs(x);
    if (ax >= 100000 || ax < 0.001) {
      var s = x.toExponential(2);
      var parts = s.split('e');
      var exp = parseInt(parts[1], 10);
      return parts[0] + '\u00D710' + toSuperscript(exp);
    }
    var str = x.toPrecision(4);
    if (str.indexOf('.') !== -1) {
      str = str.replace(/0+$/, '').replace(/\.$/, '');
    }
    return str;
  }

  var SUPER_DIGITS = { '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079', '-': '\u207B' };
  function toSuperscript(n) {
    return String(n).split('').map(function (ch) { return SUPER_DIGITS[ch] || ch; }).join('');
  }

  function fmtInt(n) {
    if (!isFinite(n)) return '\u221E';
    if (n >= 1e15) return fmtSci(n, 3);
    return Math.round(n).toLocaleString();
  }

  /* ======================================================================
   * SEQUENCE PRESETS
   *
   * category: 'conv'   - converges to 0
   *           'divInf' - diverges to +infinity
   * ====================================================================== */

  var presets = [
    {
      id: 'geom', label: 'a\u2099 = 2\u207B\u207F', group: 'Converges to a constant',
      category: 'conv', nStart: 1,
      fn: function (n) { return Math.pow(2, -n); }
    },
    {
      id: 'harmonic', label: 'a\u2099 = 1/n', group: 'Converges to a constant',
      category: 'conv', nStart: 1,
      fn: function (n) { return 1 / n; }
    },
    {
      id: 'altharmonic', label: 'a\u2099 = (\u22121)\u207F/\u221An', group: 'Converges to a constant',
      category: 'conv', nStart: 1,
      fn: function (n) { return Math.pow(-1, n) / Math.sqrt(n); }
    },
    {
      id: 'invln', label: 'a\u2099 = 1/(ln n)   (n\u22652)', group: 'Converges to a constant',
      category: 'conv', nStart: 2,
      fn: function (n) { return 1 / Math.log(n); }
    },
    {
      id: 'linear', label: 'a\u2099 = n', group: 'Diverges to +\u221E',
      category: 'divInf', nStart: 1,
      fn: function (n) { return n; }
    },
    {
      id: 'sqrtn', label: 'a\u2099 = \u221An', group: 'Diverges to +\u221E',
      category: 'divInf', nStart: 1,
      fn: function (n) { return Math.sqrt(n); }
    },
    {
      id: 'logn', label: 'a\u2099 = ln n', group: 'Diverges to +\u221E',
      category: 'divInf', nStart: 1,
      fn: function (n) { return Math.log(n); }
    }
  ];

        // '<p style="text-align:center">2<sup>\u2212N</sup> = \u03B5 &nbsp;\u21D2&nbsp; \u2212N = log\u2082 \u03B5 &nbsp;\u21D2&nbsp; N = -log\u2082 \u03B5</p>' +
  function presetById(id) {
    for (var i = 0; i < presets.length; i++) if (presets[i].id === id) return presets[i];
    return presets[0];
  }

  /* ======================================================================
   * FIND-N / PROOF / WHY-NO-N  (per sequence, hand-written derivations)
   * ====================================================================== */

  var MAX_SAFE_N = 1e20; // beyond this we don't attempt to plot or verify

  var FIND_N = {

    geom: function (eps) {
      var N = Math.ceil(Math.log2(1 / eps)) + 1;
      var html =
        '<p>The sequence aₙ=2<sup>\u2212n</sup> is strictly decreasing, so find the value of n at which it first drops to \u03B5, and then round up.</p>' +
        '<p style="text-align:center">2<sup>\u2212N</sup> = \u03B5</p>' +
        '<p style="text-align:center">\u21D2&nbsp; \u2212N = log\u2082 \u03B5 </p>' +
        '<p style="text-align:center">\u21D2&nbsp; N = -log\u2082 \u03B5</p>' +
        '<p>Take N = max(1,\u2308-log\u2082\u03B5\u2309) (round up N and ensure N≥1).</p>';
      return { N: N, html: html };
    },

    harmonic: function (eps) {
      var N = Math.ceil(1 / eps) + 1;
      var html =
        '<p>aₙ=1/n is strictly decreasing, so solve for the value of n at which it first drops to \u03B5.</p>' +
        '<p style="text-align:center">1/N = \u03B5 &nbsp;\u21D2&nbsp; N = 1/\u03B5</p>' +
        '<p>Take N = \u23081/\u03B5\u2309.</p>';
      return { N: N, html: html };
    },

    invln: function (eps) {
      var raw = Math.exp(1 / eps);
      var N = isFinite(raw) ? Math.ceil(raw) + 2 : Infinity;
      var html =
        '<p>aₙ=1/(ln n) is decreasing for n \u2265 2, so solve for the n at which it first drops to \u03B5.</p>' +
        '<p style="text-align:center">1/(ln N) = \u03B5 &nbsp;\u21D2&nbsp; ln N = 1/\u03B5 &nbsp;\u21D2&nbsp; N = e<sup>1/\u03B5</sup></p>' +
        '<p>Take N = \u2308e<sup>1/\u03B5</sup>\u2309 + 1 (ensures N≥2).</p>' +
        '<p>Because e<sup>1/\u03B5</sup> grows explosively as \u03B5 \u2192 0, N becomes astronomically large for very small \u03B5, but the formula remains valid for any \u03B5 &gt; 0.</p>';
      return { N: N, html: html };
    },

    altharmonic: function (eps) {
      var N = Math.ceil(1 / (eps * eps));
      var html =
        '<p>a\u2099 = (\u22121)\u207F/\u221An alternates in sign, but |a\u2099| = 1/\u221An is strictly decreasing, so solve for the n at which |a\u2099| first drops to \u03B5.</p>' +
        '<p style="text-align:center">1/\u221AN = \u03B5 &nbsp;\u21D2&nbsp; \u221AN = 1/\u03B5 &nbsp;\u21D2&nbsp; N = 1/\u03B5\u00B2</p>' +
        '<p>Take N = \u23081/\u03B5\u00B2\u2309.</p>';
      return { N: N, html: html };
    },

    linear: function (B) {
      var N = Math.ceil(B) + 1;
      var html =
        '<p>a\u2099 = n is already strictly increasing, so find the first value that exceeds B&gt;0.</p>' +
        '<p style="text-align:center">N = B</p>' +
        '<p>Take N = \u2308B\u2309.</p>';
      return { N: N, html: html };
    },

    logn: function (B) {
      var raw = Math.exp(B);
      var N = isFinite(raw) ? Math.ceil(raw) + 1 : Infinity;
      var html =
        '<p>aₙ=ln n is increasing, so solve for value of n that first reaches B&gt;0.</p>' +
        '<p style="text-align:center">ln N = B &nbsp;\u21D2&nbsp; N = e<sup>B</sup></p>' +
        '<p>Take N = \u2308e<sup>B</sup>\u2309.</p>' +
        '<p>ln n grows more slowly than any positive power of n, which is why reaching even a modest B needs enormous values for n.</p>';
      return { N: N, html: html };
    },

    sqrtn: function (B) {
      var N = Math.ceil(B * B);
      var html =
        '<p>a\u2099 = \u221An is strictly increasing, so solve for the value of n that first reaches B&gt;0.</p>' +
        '<p style="text-align:center">\u221AN = B &nbsp;\u21D2&nbsp; N = B\u00B2</p>' +
        '<p>Take N = \u2308B\u00B2\u2309.</p>';
      return { N: N, html: html };
    }
  };

  /* ======================================================================
   * FORMAL PROOFS
   *
   * Each follows the template:
   *   For a_n = ..., and given eps > 0 (or B > 0), set N = ... [and L = 0].
   *   Then, for n > N we have
   *     |a_n - L| = ...
   *              <= ...
   *              <  epsilon
   *   Thus a_n -> 0 (or a_n -> infinity).
   *   square
   * ====================================================================== */

  var PROOF = {

    geom: function () {
      return '<p>For a\u2099 = 2<sup>\u2212n</sup>, and given \u03B5 &gt; 0, set N = max(1,\u2308-log\u2082 \u03B5 \u2309) and L = 0.</p>' +
        '<p>Then, for n &gt; N we have</p>' +
        '<p style="text-align:center">' +
          '|a\u2099 \u2212 L| = |2<sup>\u2212n</sup>|<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 2<sup>\u2212n</sup><br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt; 2<sup>\u2212N</sup><br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 2<sup>\u2212\u2308\u2212log\u2082\u03B5\u2309</sup><br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\u2264 2<sup>log\u2082\u03B5</sup>&nbsp;&nbsp;(since \u2308\u2212log\u2082\u03B5\u2309 \u2265 \u2212log\u2082\u03B5)<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= \u03B5' +
        '</p>' +
        '<p>Thus a\u2099 \u2192 0.</p>' +
        '<p style="text-align:right">\u25A1</p>';
    },

    harmonic: function () {
      return '<p>For a\u2099 = 1/n, and given \u03B5 &gt; 0, set N = \u23081/\u03B5\u2309 and L = 0.</p>' +
        '<p>Then, for n &gt; N we have</p>' +
        '<p style="text-align:center">' +
          '|a\u2099 \u2212 L| = |1/n|<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 1/n<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt; 1/N<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 1/\u23081/\u03B5\u2309<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\u2264 1/(1/\u03B5)&nbsp;&nbsp;(since \u23081/\u03B5\u2309 \u2265 1/\u03B5)<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= \u03B5' +
        '</p>' +
        '<p>Thus a\u2099 \u2192 0.</p>' +
        '<p style="text-align:right">\u25A1</p>';
    },

    invln: function () {
      return '<p>For a\u2099 = 1/(ln n), and given \u03B5 &gt; 0, set N = \u2308e<sup>1/\u03B5</sup>\u2309 + 1 and L = 0.</p>' +
        '<p>Then, for n &gt; N we have</p>' +
        '<p style="text-align:center">' +
          '|a\u2099 \u2212 L| = |1/(ln n)|<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 1/(ln n)<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt; 1/(ln N)<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 1/(ln(\u2308e<sup>1/\u03B5</sup>\u2309+1))<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt; 1/(ln(e<sup>1/\u03B5</sup>))&nbsp;&nbsp;(since \u2308e<sup>1/\u03B5</sup>\u2309+1 &gt; e<sup>1/\u03B5</sup>)<br>' +
          '&nbsp;&nbsp;&nbsp;= \u03B5' +
        '</p>' +
        '<p>Thus a\u2099 \u2192 0.</p>' +
        '<p style="text-align:right">\u25A1</p>';
    },

    linear: function () {
      return '<p>For a\u2099 = n, and given B &gt; 0, set N = \u2308B\u2309.</p>' +
        '<p>Then, for n &gt; N we have</p>' +
        '<p style="text-align:center">' +
          'a\u2099 = n<br>' +
          '&nbsp;&nbsp;&nbsp;&gt; N<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= \u2308B\u2309<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\u2265 B&nbsp;&nbsp;(since \u2308B\u2309 \u2265 B)' +
        '</p>' +
        '<p>Thus a\u2099 \u2192 \u221E.</p>' +
        '<p style="text-align:right">\u25A1</p>';
    },

    logn: function () {
      return '<p>For a\u2099 = ln n, and given B &gt; 0, set N = \u2308e<sup>B</sup>\u2309+1.</p>' +
        '<p>Then, for n &gt; N we have</p>' +
        '<p style="text-align:center">' +
          'a\u2099 = ln n<br>' +
          '&nbsp;&nbsp;&nbsp;&gt; ln N<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= ln(\u2308e<sup>B</sup>\u2309+1)<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&gt; ln(e<sup>B</sup>)&nbsp;&nbsp;(since \u2308e<sup>B</sup>\u2309+1 &gt; e<sup>B</sup>)<br>' +
          '&nbsp;&nbsp;&nbsp;= B' +
        '</p>' +
        '<p>Thus a\u2099 \u2192 \u221E.</p>' +
        '<p style="text-align:right">\u25A1</p>';
    },

    altharmonic: function () {
      return '<p>For a\u2099 = (\u22121)\u207F/\u221An, and given \u03B5 &gt; 0, set N = \u23081/\u03B5\u00B2\u2309 and L = 0.</p>' +
        '<p>Then, for n &gt; N we have</p>' +
        '<p style="text-align:center">' +
          '|a\u2099 \u2212 L| = |(\u22121)\u207F/\u221An|<br>' +
          '&nbsp;&nbsp;&nbsp;= 1/\u221An<br>' +
          '&nbsp;&nbsp;&nbsp;&lt; 1/\u221AN<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 1/\u221A\u23081/\u03B5\u00B2\u2309<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\u2264 1/\u221A(1/\u03B5\u00B2)&nbsp;&nbsp;(since \u23081/\u03B5\u00B2\u2309 \u2265 1/\u03B5\u00B2)<br>' +
          '&nbsp;&nbsp;&nbsp;= \u03B5' +
        '</p>' +
        '<p>Thus a\u2099 \u2192 0.</p>' +
        '<p style="text-align:right">\u25A1</p>';
    },

    sqrtn: function () {
      return '<p>For a\u2099 = \u221An, and given B &gt; 0, set N = \u2308B\u00B2\u2309.</p>' +
        '<p>Then, for n &gt; N we have</p>' +
        '<p style="text-align:center">' +
          'a\u2099 = \u221An<br>' +
          '&nbsp;&nbsp;&nbsp;&gt; \u221AN<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= \u221A\u2308B\u00B2\u2309<br>' +
          '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\u2265 \u221A(B\u00B2)&nbsp;&nbsp;(since \u2308B\u00B2\u2309 \u2265 B\u00B2)<br>' +
          '&nbsp;&nbsp;&nbsp;= B' +
        '</p>' +
        '<p>Thus a\u2099 \u2192 \u221E.</p>' +
        '<p style="text-align:right">\u25A1</p>';
    }
  };

  /* ======================================================================
   * DEFINITION READOUT
   * ====================================================================== */

  function definitionHtml(preset, target) {
    if (preset.category === 'conv') {
      return '\u2200\u03B5&gt;0 \u2203N s.t. n&gt;N \u21D2 |a\u2099 \u2212 0| &lt; \u03B5' +
        '<br><span class="def-current">Currently: \u03B5 = ' + fmtNum(target) + '</span>';
    }
    return '\u2200B&gt;0 \u2203N s.t. n&gt;N \u21D2 a\u2099 &gt; B' +
      '<br><span class="def-current">Currently: B = ' + fmtNum(target) + '</span>';
  }

  /* ======================================================================
   * APPLICATION STATE
   * ====================================================================== */

  var CHALLENGE_EPS = [0.1, 0.001, 1e-6];
  var CHALLENGE_B = [10, 1000, 1e6];

  var state = {
    seqId: 'geom',
    mode: 'user',           // 'user' | 'challenge'
    challengeIndex: 0,
    epsilon: 0.1,
    B: 10,
    showDefinition: true,
    candidateN: null,       // raw text
    view: { xLo: null, xHi: null, yLo: null, yHi: null, nLo: null, nHi: null }
  };

  function kindOf(preset) {
    return preset.category === 'conv' ? 'eps' : 'B';
  }

  function currentTarget(preset) {
    if (state.mode === 'challenge') {
      var arr = kindOf(preset) === 'eps' ? CHALLENGE_EPS : CHALLENGE_B;
      return arr[state.challengeIndex];
    }
    return kindOf(preset) === 'eps' ? state.epsilon : state.B;
  }

  /* ======================================================================
   * DOM REFERENCES  (populated in init())
   * ====================================================================== */

  var dom = {};

  /* ======================================================================
   * SLIDER LOG-MAPPING
   * ====================================================================== */

  var EPS_MIN = 1e-10, EPS_MAX = 3;
  var B_MIN = 1, B_MAX = 1e12;
  var SLIDER_STEPS = 1000;

  function sliderToValue(t, lo, hi) {
    var logLo = Math.log10(lo), logHi = Math.log10(hi);
    return Math.pow(10, logLo + t * (logHi - logLo));
  }
  function valueToSlider(v, lo, hi) {
    var logLo = Math.log10(lo), logHi = Math.log10(hi);
    var t = (Math.log10(v) - logLo) / (logHi - logLo);
    return Math.max(0, Math.min(1, t));
  }

  /* ======================================================================
   * PRESET SELECT
   * ====================================================================== */

  function populateSelect() {
    dom.seqSelect.innerHTML = '';
    var groups = {};
    var order = [];
    presets.forEach(function (p) {
      if (!groups[p.group]) { groups[p.group] = []; order.push(p.group); }
      groups[p.group].push(p);
    });
    order.forEach(function (g) {
      var og = document.createElement('optgroup');
      og.label = g;
      groups[g].forEach(function (p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.innerHTML = p.label.replace(/<[^>]+>/g, '');
        og.appendChild(opt);
      });
      dom.seqSelect.appendChild(og);
    });
    dom.seqSelect.value = state.seqId;
  }

  /* ======================================================================
   * VIEW / ZOOM STATE
   *
   * state.view holds the current plot range in math coordinates.
   * xLo/xHi are the visible n-range; yLo/yHi are always kept symmetric
   * about zero (yLo = -yHi), since the vertical zoom is centred on 0.
   * The range persists across redraws so Zoom buttons can adjust it;
   * resetView() restores a fixed, modest default (a small, constant
   * number of n-values) whenever the sequence or mode changes, or when
   * "Reset" is pressed. The default does NOT grow to chase a small
   * epsilon or large B - finding the right N for a strict target is the
   * user's job, done by zooming out with Zoom n. The set of n-values
   * actually plotted is recomputed from the current view on every draw
   * (see sampleNs), so zooming always re-samples at the right density
   * rather than reusing a fixed, precomputed list of points.
   *
   * The n-axis always starts at 0 (state.view.xLo is fixed); only the
   * right-hand extent (xHi) is adjustable, by Zoom n. The a-axis is
   * always centred on 0 (state.view.yLo = -yHi); only the half-height
   * is adjustable, by Zoom a\u2099.
   * ====================================================================== */

  var MIN_X_HI = 2;
  var MIN_Y_HALFWIDTH = 1e-15;
  var DEFAULT_N_COUNT = 30; // default view always shows this many n-values

  function defaultNRange(preset) {
    var nStart = preset.nStart;
    return { nLo: nStart, nHi: nStart + DEFAULT_N_COUNT - 1 };
  }

  function computeDefaultYHalf(preset, target, nr) {
    var count = 200;
    var vals = [];
    for (var i = 0; i <= count; i++) {
      var n = Math.round(nr.nLo + (i / count) * (nr.nHi - nr.nLo));
      var a = preset.fn(n);
      if (isFinite(a)) vals.push(Math.abs(a));
    }
    vals.push(target);
    var maxAbs = Math.max.apply(null, vals);
    return maxAbs * 1.15 || 1;
  }

  function resetView() {
    var preset = presetById(state.seqId);
    var target = currentTarget(preset);
    var nr = defaultNRange(preset);
    state.view.nLo = nr.nLo; state.view.nHi = nr.nHi;
    state.view.xLo = 0;
    state.view.xHi = nr.nHi;
    var H = computeDefaultYHalf(preset, target, nr);
    state.view.yLo = -H;
    state.view.yHi = H;
  }

  function zoomX(factor) {
    var hi = Math.max(state.view.xHi * factor, MIN_X_HI);
    state.view.xHi = Math.min(hi, MAX_SAFE_N);
    draw();
  }

  function zoomY(factor) {
    // Always centred on zero: a single half-height H defines the range.
    var H = Math.max(state.view.yHi * factor, MIN_Y_HALFWIDTH);
    state.view.yLo = -H;
    state.view.yHi = H;
    draw();
  }

  /* ======================================================================
   * SAMPLING - choose which integer n values to plot (capped at 400,
   * regardless of zoom level or scale). Always recomputed from the
   * currently visible n-range, never from a fixed a-priori list.
   * ====================================================================== */

  var MAX_PLOT_POINTS = 400;

  function sampleNs(nLo, nHi) {
    nLo = Math.max(nLo, 1);
    if (nHi < nLo) nHi = nLo;
    var span = nHi - nLo; // number of integers in [nLo, nHi] is span + 1
    if (span < MAX_PLOT_POINTS) {
      var out = [];
      for (var n = nLo; n <= nHi; n++) out.push(n);
      return out;
    }
    // Sample at a single fixed integer stride, rather than rounding each
    // point's position independently. An even stride would only ever land
    // on n-values of one parity, which produces visual gaps for sequences
    // whose value depends on the parity of n (e.g. an alternating sequence
    // like (-1)^n/sqrt(n) would appear to show long runs of only positive
    // or only negative points, even though both are equally present).
    // Forcing the stride to be odd guarantees consecutive sampled points
    // always alternate parity, keeping both subsequences interlaced at
    // every zoom level.
    var rawStep = span / (MAX_PLOT_POINTS - 1);
    var step = Math.max(1, Math.round(rawStep));
    if (step % 2 === 0) step += 1;
    var result = [];
    for (var n = nLo; n < nHi; n += step) result.push(n);
    result.push(nHi);
    return result;
  }

  /* ======================================================================
   * VERIFY A CANDIDATE N
   * ====================================================================== */

  var CHECK_WINDOW = 200000;

  function verifyCandidate(preset, target, N) {
    if (!isFinite(N) || N < preset.nStart) {
      return { ok: false, detail: 'Enter a valid integer N \u2265 ' + preset.nStart + '.' };
    }
    N = Math.round(N);
    var end = Math.min(N + CHECK_WINDOW, N + 5e6);
    for (var n = N; n <= end; n++) {
      var a = preset.fn(n);
      var bad = (preset.category === 'conv') ? !(Math.abs(a) < target) : !(a > target);
      if (bad) {
        return {
          ok: false,
          detail: 'Fails at n = ' + fmtInt(n) + ' (a\u2099 = ' + fmtNum(a) + '). Try a larger N.',
          violationN: n
        };
      }
    }
    return { ok: true, detail: 'Correct! Bound is satisfied for all n&gt;' + fmtInt(N) + '.' };
  }

  /* ======================================================================
   * DRAWING
   * ====================================================================== */

  function resize() {
    draw(); // draw() itself calls TA.resizeCanvas first
  }

  // Colour scheme selection was removed for this app - always use the
  // suite's default palette.
  var DEFAULT_SCHEME = 'palette1';

  function baseColour() {
    var rgb = TA.sampleColourMap(DEFAULT_SCHEME, 0.55);
    return TA.colourToCSS(rgb);
  }

  function draw() {
    var preset = presetById(state.seqId);
    var target = currentTarget(preset);
    var dims = TA.resizeCanvas(dom.canvas2d, dom.ctx, dom.canvasArea);
    var ctx = dom.ctx;
    ctx.clearRect(0, 0, dims.width, dims.height);

    // pad.t clears the floating current-fn/definition labels (top:12px,
    // ~40px tall); pad.r/pad.b clear the fixed teaching-pointer toggle
    // button (bottom:30px, right:30px, ~44px diameter).
    var pad = { l: 80, r: 30, t: 74, b: 90 };
    var plotW = dims.width - pad.l - pad.r;
    var plotH = dims.height - pad.t - pad.b;
    if (plotW < 50 || plotH < 50) return;

    if (state.view.xLo === null) resetView();

    var xLo = state.view.xLo, xHi = state.view.xHi;
    var yMin = state.view.yLo, yMax = state.view.yHi;
    if (xHi <= xLo) xHi = xLo + 1;
    if (yMax <= yMin) yMax = yMin + 1;

    // Visible n-range, recomputed from the current view every draw so
    // zooming out always re-samples points at the right density rather
    // than reusing a fixed, precomputed list.
    var nLoVisible = Math.max(preset.nStart, Math.floor(xLo));
    var nHiVisible = Math.max(nLoVisible + 1, Math.ceil(xHi));
    nHiVisible = Math.min(nHiVisible, MAX_SAFE_N);
    var Ns = sampleNs(nLoVisible, nHiVisible);

    var rows = Ns.map(function (n) {
      var a = preset.fn(n);
      return { n: n, a: a };
    });

    // Coordinate transforms.
    function toPX(x) { return pad.l + (x - xLo) / (xHi - xLo) * plotW; }
    function toPY(y) { return pad.t + (1 - (y - yMin) / (yMax - yMin)) * plotH; }
    function inPlotY(py) { return py >= pad.t - 0.5 && py <= pad.t + plotH + 0.5; }

    // axes background
    ctx.strokeStyle = '#2a2d3a';
    ctx.lineWidth = 2;
    ctx.strokeRect(pad.l, pad.t, plotW, plotH);

    // y=0 axis
    if (yMin < 0 && yMax > 0) {
      ctx.strokeStyle = '#3a3d4a';
      ctx.beginPath();
      ctx.moveTo(pad.l, toPY(0));
      ctx.lineTo(pad.l + plotW, toPY(0));
      ctx.stroke();
    }

    // reference dashed lines
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e5b84b';
    drawHLineClipped(ctx, toPY(target), pad.l, plotW, inPlotY);
    if (preset.category !== 'divInf') {
      drawHLineClipped(ctx, toPY(-target), pad.l, plotW, inPlotY);
    }
    ctx.setLineDash([]);

    // candidate N vertical line
    var candN = parseCandidateN();
    if (candN !== null && candN >= preset.nStart) {
      var xN = candN;
      if (xN >= xLo && xN <= xHi) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#8b8fa3';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(toPX(xN), pad.t);
        ctx.lineTo(toPX(xN), pad.t + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // plot points
    var passColour = '#66bb6a';
    var failColour = '#e57373';
    var base = baseColour();

    var hitTest = []; // for click-to-select: {n, px, py}

    rows.forEach(function (r) {
      var px = toPX(r.n);
      var a = r.a;
      if (!isFinite(a)) return;
      var py = toPY(a);
      hitTest.push({ n: r.n, px: px, py: py });
      if (!inPlotY(py) || px < pad.l - 0.5 || px > pad.l + plotW + 0.5) return;

      var colour = base;
      if (candN !== null) {
        var within;
        if (preset.category === 'conv') {
          within = r.n < candN ? null : Math.abs(r.a) < target;
        } else {
          within = r.n < candN ? null : r.a > target;
        }
        if (within === true) colour = passColour;
        else if (within === false) colour = failColour;
        else colour = base;
      }

      var radius = (r.n === candN) ? 10 : 6;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, 2 * Math.PI);
      ctx.fillStyle = colour;
      ctx.fill();
      if (r.n === candN) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    });

    dom.lastHitTest = hitTest;
    dom.lastPlotRect = { l: pad.l, t: pad.t, w: plotW, h: plotH };

    // axis titles
    ctx.fillStyle = '#8b8fa3';
    ctx.font = '17px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('n', pad.l + plotW / 2, pad.t + plotH + 22);
    // a_n label: 3x the original 11px size, drawn upright (not rotated)
    // rather than sideways, centred in the widened left margin.
    ctx.font = '33px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('a\u2099', pad.l / 2, pad.t + plotH / 2);
    ctx.textBaseline = 'alphabetic';

    // Scale indicators: current y-axis extent near the top, current
    // n-axis extent near the right, in a larger font for quick reading.
    var accentColour = TA.colourToCSS(TA.sampleColourMap(DEFAULT_SCHEME, 0.75));
    ctx.font = '600 23px ui-monospace, monospace';

    var yLabel = '\u00B1' + fmtNumPlain(yMax);
    ctx.textAlign = 'right';
    var yLabelW = ctx.measureText(yLabel).width + 12;
    ctx.fillStyle = 'rgba(15,17,23,0.75)';
    ctx.fillRect(pad.l + plotW - yLabelW - 4, pad.t + 6, yLabelW, 32);
    ctx.fillStyle = accentColour;
    ctx.textBaseline = 'top';
    ctx.fillText(yLabel, pad.l + plotW - 10, pad.t + 15);

    var nLabel = fmtNumPlain(nHiVisible);
    var nLabelW = ctx.measureText(nLabel).width + 12;
    ctx.fillStyle = 'rgba(15,17,23,0.75)';
    ctx.fillRect(pad.l + plotW - nLabelW - 4, pad.t + plotH - 38, nLabelW, 32);
    ctx.fillStyle = accentColour;
    ctx.textBaseline = 'top';
    ctx.fillText(nLabel, pad.l + plotW - 10, pad.t + plotH - 29);

    // function label
    dom.currentFnLabel.innerHTML = preset.label;

    // info box
    var kind = kindOf(preset);
    var lines = [];
    lines.push((kind === 'eps' ? '\u03B5' : 'B') + ' = ' + fmtNum(target));
    if (candN !== null) {
      lines.push('Your N = ' + fmtInt(candN));
    }
    dom.infoBox.style.display = 'block';
    dom.infoBox.innerHTML = lines.join('\n');

    // definition box
    if (state.showDefinition) {
      dom.defBox.style.display = 'block';
      dom.defBox.innerHTML = definitionHtml(preset, target, state.mode);
    } else {
      dom.defBox.style.display = 'none';
    }
  }

  function drawHLineClipped(ctx, py, x0, w, inPlotY) {
    if (!inPlotY(py)) return;
    ctx.beginPath();
    ctx.moveTo(x0, py);
    ctx.lineTo(x0 + w, py);
    ctx.stroke();
  }

  function parseCandidateN() {
    var v = parseFloat(dom.nInput.value);
    if (!isFinite(v) || dom.nInput.value.trim() === '') return null;
    return v;
  }

  /* ======================================================================
   * UI UPDATES
   * ====================================================================== */

  function updateModeUI() {
    dom.btnModeUser.classList.toggle('active', state.mode === 'user');
    dom.btnModeChallenge.classList.toggle('active', state.mode === 'challenge');
    dom.challengeSection.style.display = state.mode === 'challenge' ? 'block' : 'none';
    dom.targetSection.style.display = state.mode === 'challenge' ? 'none' : 'block';
  }

  function updateChallengeButtons(preset) {
    var arr = kindOf(preset) === 'eps' ? CHALLENGE_EPS : CHALLENGE_B;
    var label = kindOf(preset) === 'eps' ? '\u03B5' : 'B';
    [dom.chal0, dom.chal1, dom.chal2].forEach(function (btn, i) {
      btn.textContent = label + '=' + fmtCompact(arr[i]);
      btn.classList.toggle('active', state.challengeIndex === i);
    });
  }

  function fmtCompact(x) {
    if (x >= 1) return x >= 1e6 ? x.toExponential(0) : String(x);
    return x.toExponential(0);
  }

  function updateTargetUI(preset) {
    var kind = kindOf(preset);
    dom.targetLabel.textContent = kind === 'eps' ? 'Epsilon (\u03B5)' : 'Bound (B)';
    var lo = kind === 'eps' ? EPS_MIN : B_MIN;
    var hi = kind === 'eps' ? EPS_MAX : B_MAX;
    var val = kind === 'eps' ? state.epsilon : state.B;
    dom.targetInput.value = fmtInputVal(val);
    dom.targetSlider.value = Math.round(valueToSlider(val, lo, hi) * SLIDER_STEPS);
    updateChallengeButtons(preset);
  }

  function fmtInputVal(x) {
    if (x < 0.0001 || x >= 100000) return x.toExponential(3);
    return String(x);
  }

  function updateAll() {
    var preset = presetById(state.seqId);
    updateModeUI();
    updateTargetUI(preset);
    dom.checkFeedback.textContent = '';
    resetView();
    draw();
  }

  /* ======================================================================
   * WORKING OVERLAY CONTENT
   * ====================================================================== */

  var overlays = {};

  function openWorking(kindLabel, html) {
    dom.workingTitle.textContent = kindLabel;
    dom.workingBody.innerHTML = html;
    overlays.working.show();
  }

  function showFindN() {
    var preset = presetById(state.seqId);
    var target = currentTarget(preset);
    var res = FIND_N[preset.id](target);
    openWorking('How to find N', res.html);
  }

  function showProof() {
    var preset = presetById(state.seqId);
    openWorking('Proof', PROOF[preset.id]());
  }

  /* ======================================================================
   * EVENT WIRING
   * ====================================================================== */

  function wireEvents() {
    dom.seqSelect.addEventListener('change', function () {
      state.seqId = dom.seqSelect.value;
      state.challengeIndex = 0;
      dom.nInput.value = '';
      updateAll();
    });

    dom.btnModeUser.addEventListener('click', function () {
      state.mode = 'user';
      updateAll();
    });
    dom.btnModeChallenge.addEventListener('click', function () {
      state.mode = 'challenge';
      state.challengeIndex = 0;
      updateAll();
    });

    [dom.chal0, dom.chal1, dom.chal2].forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        state.challengeIndex = i;
        dom.nInput.value = '';
        dom.checkFeedback.textContent = '';
        updateAll();
      });
    });

    dom.targetSlider.addEventListener('input', function () {
      var preset = presetById(state.seqId);
      var kind = kindOf(preset);
      var lo = kind === 'eps' ? EPS_MIN : B_MIN;
      var hi = kind === 'eps' ? EPS_MAX : B_MAX;
      var t = dom.targetSlider.value / SLIDER_STEPS;
      var v = sliderToValue(t, lo, hi);
      if (kind === 'eps') state.epsilon = v; else state.B = v;
      dom.targetInput.value = fmtInputVal(v);
      draw();
    });

    dom.targetInput.addEventListener('change', function () {
      var preset = presetById(state.seqId);
      var kind = kindOf(preset);
      var v = parseFloat(dom.targetInput.value);
      var lo = kind === 'eps' ? EPS_MIN : B_MIN;
      var hi = kind === 'eps' ? EPS_MAX : B_MAX;
      if (!isFinite(v) || v <= 0) return;
      v = Math.max(lo, Math.min(hi, v));
      if (kind === 'eps') state.epsilon = v; else state.B = v;
      dom.targetSlider.value = Math.round(valueToSlider(v, lo, hi) * SLIDER_STEPS);
      draw();
    });

    dom.nInput.addEventListener('input', function () {
      draw();
    });

    dom.btnCheck.addEventListener('click', function () {
      var preset = presetById(state.seqId);
      var target = currentTarget(preset);
      var N = parseCandidateN();
      var res = verifyCandidate(preset, target, N);
      dom.checkFeedback.innerHTML = res.detail;
      dom.checkFeedback.className = 'check-feedback ' + (res.ok ? 'ok' : 'bad');
      flashButton(dom.btnCheck);
    });

    TA.wireToggle(dom.toggleDefinition, state, 'showDefinition', draw);

    dom.zoomXIn.addEventListener('click', function () { zoomX(0.5); });
    dom.zoomXOut.addEventListener('click', function () { zoomX(2); });
    dom.zoomYIn.addEventListener('click', function () { zoomY(0.5); });
    dom.zoomYOut.addEventListener('click', function () { zoomY(2); });
    dom.btnResetView.addEventListener('click', function () { resetView(); draw(); });

    function handlePlotPick(clientX, clientY) {
      if (!dom.lastHitTest || !dom.lastHitTest.length) return;
      var rect = dom.canvas2d.getBoundingClientRect();
      var px = clientX - rect.left, py = clientY - rect.top;
      var r = dom.lastPlotRect;
      if (r && (px < r.l || px > r.l + r.w || py < r.t || py > r.t + r.h)) return;
      var best = null, bestDist = Infinity;
      for (var i = 0; i < dom.lastHitTest.length; i++) {
        var pt = dom.lastHitTest[i];
        var dx = pt.px - px, dy = pt.py - py;
        var d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; best = pt; }
      }
      if (best) {
        dom.nInput.value = String(best.n);
        draw();
      }
    }
    dom.canvas2d.addEventListener('pointerdown', function (e) {
      handlePlotPick(e.clientX, e.clientY);
    });

    dom.btnFindN.addEventListener('click', function () { flashButton(dom.btnFindN); showFindN(); });
    dom.btnProof.addEventListener('click', function () { flashButton(dom.btnProof); showProof(); });

    dom.toggleInvert.addEventListener('click', function () {
      document.documentElement.classList.toggle('inverted');
      dom.toggleInvert.classList.toggle('active');
    });

    window.addEventListener('resize', resize);
  }

  function flashButton(btn) {
    btn.classList.add('active');
    setTimeout(function () { btn.classList.remove('active'); }, 200);
  }

  /* ======================================================================
   * INIT
   * ====================================================================== */

  function init() {
    dom.panel = document.getElementById('panel');
    dom.collapseBtn = document.getElementById('collapseBtn');
    dom.openBtn = document.getElementById('openBtn');
    dom.canvasArea = document.getElementById('canvasArea');
    dom.canvas2d = document.getElementById('canvas2d');
    dom.ctx = dom.canvas2d.getContext('2d');
    dom.currentFnLabel = document.getElementById('currentFnLabel');
    dom.infoBox = document.getElementById('infoBox');
    dom.defBox = document.getElementById('defBox');

    dom.seqSelect = document.getElementById('seqSelect');

    dom.btnModeUser = document.getElementById('btnModeUser');
    dom.btnModeChallenge = document.getElementById('btnModeChallenge');

    dom.challengeSection = document.getElementById('challengeSection');
    dom.chal0 = document.getElementById('chal0');
    dom.chal1 = document.getElementById('chal1');
    dom.chal2 = document.getElementById('chal2');

    dom.targetSection = document.getElementById('targetSection');
    dom.targetLabel = document.getElementById('targetLabel');
    dom.targetInput = document.getElementById('targetInput');
    dom.targetSlider = document.getElementById('targetSlider');

    dom.nInput = document.getElementById('nInput');
    dom.btnCheck = document.getElementById('btnCheck');
    dom.checkFeedback = document.getElementById('checkFeedback');

    dom.toggleDefinition = document.getElementById('toggleDefinition');
    dom.toggleInvert = document.getElementById('toggleInvert');

    dom.zoomXIn = document.getElementById('zoomXIn');
    dom.zoomXOut = document.getElementById('zoomXOut');
    dom.zoomYIn = document.getElementById('zoomYIn');
    dom.zoomYOut = document.getElementById('zoomYOut');
    dom.btnResetView = document.getElementById('btnResetView');

    dom.btnFindN = document.getElementById('btnFindN');
    dom.btnProof = document.getElementById('btnProof');

    dom.workingTitle = document.getElementById('workingTitle');
    dom.workingBody = document.getElementById('workingBody');

    populateSelect();

    TA.initSidebar({ panel: dom.panel, collapseBtn: dom.collapseBtn, openBtn: dom.openBtn, onResize: resize });

    overlays.help = TA.initOverlay({ overlay: document.getElementById('helpOverlay'), closeBtn: document.getElementById('helpClose'), triggerBtn: document.getElementById('btnHelp') });
    overlays.overview = TA.initOverlay({ overlay: document.getElementById('overviewOverlay'), closeBtn: document.getElementById('overviewClose'), triggerBtn: document.getElementById('btnOverview') });
    overlays.working = TA.initOverlay({ overlay: document.getElementById('workingOverlay'), closeBtn: document.getElementById('workingClose'), triggerBtn: document.getElementById('btnFindN') });

    wireEvents();
    updateAll();
    TA.initPointer({ canvasAreaSelector: '#canvasArea' });
  }

  return { init: init };

})();
