/* ==========================================================================
 * sampling-distribution-variance.js
 *
 * App-specific logic for the "Sampling Distribution of the Variance"
 * teaching app. Visualises the sampling distribution of the unbiased sample
 * variance S² when sampling from a standard normal population. Compares the
 * resulting histogram to the chi-squared distribution with n−1 degrees of
 * freedom (scaled to the S² axis), and to its large-df normal approximation.
 *
 * Adapted from the multi-population sampling-distribution.js. The parent
 * population is fixed at N(0, 1), so dropdown / custom-editor / multi-
 * population infrastructure has been removed. The accumulated statistic is
 * the per-sample S² (unbiased, n−1 divisor) rather than the sample mean.
 *
 * Depends on:
 *   – teaching-app.js  (the TeachingApp engine — must be loaded first)
 *
 * This file is loaded from index.html and exposes a single global
 * initialiser:  SamplingDistributionVariance.init()
 * ========================================================================== */

var SamplingDistributionVariance = (function () {
  'use strict';

  var TA = TeachingApp;


  /* ======================================================================
   * POPULATION (fixed: standard normal)
   * ====================================================================== */

  // Population mean and variance (fixed for this app)
  var POP_MU = 0;
  var POP_SIGMA2 = 1;
  var POP_SIGMA = 1;

  // Standard normal random via Box-Muller
  function randn() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Standard normal pdf
  function normalPdf(x, mu, sigma) {
    var z = (x - mu) / sigma;
    return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
  }

  // x-range for the population display panel
  var POP_X_RANGE = [-4, 4];


  /* ======================================================================
   * CHI-SQUARED MATHEMATICS
   *
   * χ²(k) density:    f(x; k) = x^(k/2−1) e^(−x/2) / (2^(k/2) Γ(k/2))
   * χ²(k) CDF:        F(x; k) = P(k/2, x/2)        (regularised incomplete Γ)
   * χ²(k) quantiles:  numerical inversion of F via bisection
   * ====================================================================== */

  // Lanczos approximation for ln Γ(z), z > 0
  function logGamma(z) {
    var g = 7;
    var c = [
      0.99999999999980993,
      676.5203681218851,
      -1259.1392167224028,
      771.32342877765313,
      -176.61502916214059,
      12.507343278686905,
      -0.13857109526572012,
      9.9843695780195716e-6,
      1.5056327351493116e-7
    ];
    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    }
    z -= 1;
    var x = c[0];
    for (var i = 1; i < g + 2; i++) x += c[i] / (z + i);
    var t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  // Regularised lower incomplete gamma function P(s, x) = γ(s, x) / Γ(s)
  // Uses the series expansion for x < s+1 and the continued fraction otherwise.
  function gammaP(s, x) {
    if (x < 0 || s <= 0) return 0;
    if (x === 0) return 0;
    var ITMAX = 200;
    var EPS = 1e-14;
    if (x < s + 1) {
      var ap = s;
      var sum = 1.0 / s;
      var del = sum;
      for (var n = 0; n < ITMAX; n++) {
        ap += 1;
        del *= x / ap;
        sum += del;
        if (Math.abs(del) < Math.abs(sum) * EPS) break;
      }
      return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
    } else {
      var b = x + 1 - s;
      var c2 = 1.0 / 1e-300;
      var d = 1.0 / b;
      var h = d;
      for (var i = 1; i <= ITMAX; i++) {
        var an = -i * (i - s);
        b += 2;
        d = an * d + b;
        if (Math.abs(d) < 1e-300) d = 1e-300;
        c2 = b + an / c2;
        if (Math.abs(c2) < 1e-300) c2 = 1e-300;
        d = 1.0 / d;
        var delta = d * c2;
        h *= delta;
        if (Math.abs(delta - 1) < EPS) break;
      }
      var Q = h * Math.exp(-x + s * Math.log(x) - logGamma(s));
      return 1 - Q;
    }
  }

  // χ²(k) PDF
  function chiSquaredPdf(x, k) {
    if (x < 0) return 0;
    if (x === 0) {
      if (k > 2) return 0;
      if (k === 2) return 0.5;
      return Infinity;
    }
    var halfK = k / 2;
    var logPdf = (halfK - 1) * Math.log(x) - x / 2 - halfK * Math.log(2) - logGamma(halfK);
    return Math.exp(logPdf);
  }

  // χ²(k) CDF
  function chiSquaredCdf(x, k) {
    if (x <= 0) return 0;
    return gammaP(k / 2, x / 2);
  }

  // χ²(k) quantile: find x such that CDF(x; k) = p, via bisection.
  function chiSquaredQuantile(p, k) {
    if (p <= 0) return 0;
    if (p >= 1) return Infinity;
    var lo = 0;
    var sd = Math.sqrt(2 * k);
    var hi = k + 12 * sd;
    if (hi < 1) hi = 50;
    while (chiSquaredCdf(hi, k) < p && hi < 1e8) hi *= 2;
    for (var i = 0; i < 80; i++) {
      var mid = 0.5 * (lo + hi);
      if (mid === lo || mid === hi) break;
      var c = chiSquaredCdf(mid, k);
      if (c < p) lo = mid; else hi = mid;
      if ((hi - lo) < 1e-9 * Math.max(1, Math.abs(mid))) break;
    }
    return 0.5 * (lo + hi);
  }


  /* ======================================================================
   * APPLICATION STATE
   * ====================================================================== */

  var state = {
    sampleSize: 5,
    showPopulation: true,
    showSampleLine: true,
    showSamplingDist: true,
    showChiSq: false,         // primary theoretical overlay
    showNormal: false,        // large-df normal approximation overlay
    showLabels: false,
    showBinSlider: false,
    binSizeFactor: 1,
    showCI: false,
    showWindow: false,
    showHistWindow: false,
    logY: false,
    logYT: 0,
    logYXExpandT: 0,
    logYAnimating: false,
    logYPhase: 0,
    ciLevel: '95',            // '50', '90', '95', '99'

    // Sampling data
    sampleVariances: [],
    currentSample: [],
    currentMean: null,
    currentVariance: null,
    totalSamples: 0,
    lastAction: null,
    cachedSortedVars: null,
    cachedHistMean: null,

    // Animation state
    animating: false,
    animPhase: 0,             // 0=dots, 1=mean+sd-bar, 2=drop S²
    animDotIndex: 0,
    animT: 0,
    animStartTime: 0,
    lastWasAnimate: false,

    // Layout
    canvasW: 0,
    canvasH: 0,

    // Panel transition animation
    panelTransitioning: false,
    panelTransitionStart: 0,
    panelTransitionFrom: {},
    panelTransitionTo: {},
  };


  /* ======================================================================
   * DOM REFERENCES
   * ====================================================================== */

  var dom = {};
  var canvas, ctx;


  /* ======================================================================
   * LAYOUT COMPUTATION
   *
   * Three vertically stacked regions: population, sample line, histogram.
   * Population and sample line share the population x-range [-4, 4];
   * histogram has its own x-range computed from χ² quantiles.
   * ====================================================================== */

  var WEIGHT_POP = 2;
  var WEIGHT_SAMPLE = 1;
  var WEIGHT_HIST = 3;
  var VPAD = 16;
  var HPAD_FRAC = 0.06;

  function computeLayout() {
    var w = state.canvasW;
    var h = state.canvasH;

    var panels = [];
    if (state.showPopulation) panels.push({ id: 'pop', weight: WEIGHT_POP });
    if (state.showSampleLine) panels.push({ id: 'sample', weight: WEIGHT_SAMPLE });
    if (state.showSamplingDist) panels.push({ id: 'hist', weight: WEIGHT_HIST });

    if (panels.length === 0) return { pop: null, sample: null, hist: null };

    var totalPad = VPAD * (panels.length - 1);
    var topPad = 20;
    var extraBottom = (state.showWindow ? 16 : 0) + (state.showHistWindow ? 16 : 0);
    var bottomPad = 20 + extraBottom;
    var availH = h - topPad - bottomPad - totalPad;
    var totalWeight = 0;
    for (var i = 0; i < panels.length; i++) totalWeight += panels[i].weight;

    var hPad = Math.floor(w * HPAD_FRAC);
    var plotLeft = hPad;
    var plotRight = w - hPad;
    var plotW = plotRight - plotLeft;

    var y = topPad;
    var layout = { pop: null, sample: null, hist: null };
    for (var j = 0; j < panels.length; j++) {
      var pH = Math.floor(availH * panels[j].weight / totalWeight);
      layout[panels[j].id] = { x: plotLeft, y: y, w: plotW, h: pH };
      y += pH + VPAD;
    }
    return layout;
  }

  function lerpLayout(a, b, t) {
    var result = {};
    var keys = ['pop', 'sample', 'hist'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (a[k] && b[k]) {
        result[k] = {
          x: a[k].x + (b[k].x - a[k].x) * t,
          y: a[k].y + (b[k].y - a[k].y) * t,
          w: a[k].w + (b[k].w - a[k].w) * t,
          h: a[k].h + (b[k].h - a[k].h) * t
        };
      } else if (b[k]) {
        result[k] = { x: b[k].x, y: b[k].y, w: b[k].w, h: b[k].h * t };
      } else if (a[k]) {
        result[k] = { x: a[k].x, y: a[k].y, w: a[k].w, h: a[k].h * (1 - t) };
      } else {
        result[k] = null;
      }
    }
    return result;
  }


  /* ======================================================================
   * HORIZONTAL SCALES
   *
   * Population panel and sample-line panel share the population x-range
   * (centred on μ=0). The histogram panel is centred on E[S²] = σ² = 1, with
   * half-width chosen so that the right edge of the central 99% χ² window
   * sits just inside the right edge of the view (5% margin). Because χ²(df)
   * is right-skewed, the resulting xMin is negative for small df: the visible
   * panel extends into x < 0 (where there's no data) but E[S²]=1 sits exactly
   * at screen-centre regardless of n.
   * ====================================================================== */

  function getPopulationXRange() {
    return POP_X_RANGE;
  }

  // Histogram x-range (cached; depends on n and logYXExpandT)
  var _histRangeCache = { key: null, range: null };
  function getHistogramXRange() {
    var n = state.sampleSize;
    var df = n - 1;
    var key = n + '|' + state.logYXExpandT;
    if (_histRangeCache.key === key) return _histRangeCache.range;

    // Right edge of the central 99% χ²(df) window, on the S² axis.
    // Central 99% means tails of 0.005 each side, so right end = q_{0.995}.
    var qHi = chiSquaredQuantile(0.995, df);
    var rightEdgeS2 = qHi / df;          // since σ² = 1
    var halfW = 1.05 * (rightEdgeS2 - 1); // 5% margin past q_{0.995}/df

    var xMin = 1 - halfW;
    var xMax = 1 + halfW;

    // Log-y x-expansion: widen symmetrically so x=1 stays at screen-centre.
    if (state.logYXExpandT > 0) {
      var f = 1 + 0.5 * state.logYXExpandT;
      xMin = 1 - halfW * f;
      xMax = 1 + halfW * f;
    }

    var range = [xMin, xMax];
    _histRangeCache = { key: key, range: range };
    return range;
  }

  // Map population-axis x to pixel x within a layout rect
  function popXToPixel(x, rect) {
    var range = getPopulationXRange();
    var frac = (x - range[0]) / (range[1] - range[0]);
    return rect.x + frac * rect.w;
  }

  // Map histogram-axis x (S² or scaled) to pixel x within a layout rect
  function histXToPixel(x, rect) {
    var range = getHistogramXRange();
    var frac = (x - range[0]) / (range[1] - range[0]);
    return rect.x + frac * rect.w;
  }

  // Convert raw S² to histogram-axis units. The histogram axis is now always
  // S² (the scaled-mode toggle was removed), so this is the identity. Kept as
  // a thin wrapper so future axis changes can plug in here.
  function sToHistAxis(s2) {
    return s2;
  }


  /* ======================================================================
   * HISTOGRAM BINNING
   * ====================================================================== */

  function computeHistogram(data, xMin, xMax, nBins) {
    // Bin width chosen from the visible range and target bin count, but
    // bin edges are anchored at 0 so bars don't wobble as the view shifts.
    // Bins in the negative region simply hold no data.
    var binW = (xMax - xMin) / nBins;
    // Walk a grid of bins anchored at 0, covering the full [xMin, xMax] span.
    var firstEdge = Math.floor(xMin / binW) * binW;
    var adjustedXMin = firstEdge;
    var adjustedNBins = Math.ceil((xMax - adjustedXMin) / binW) + 2;
    while (adjustedXMin + adjustedNBins * binW < xMax) adjustedNBins++;

    var bins = new Float64Array(adjustedNBins);
    for (var i = 0; i < data.length; i++) {
      var v = data[i];
      var idx = Math.floor((v - adjustedXMin) / binW);
      if (idx >= 0 && idx < adjustedNBins) bins[idx]++;
    }
    var total = data.length * binW;
    if (total > 0) {
      for (var j = 0; j < adjustedNBins; j++) bins[j] /= total;
    }
    return {
      bins: bins, binWidth: binW,
      xMin: adjustedXMin, xMax: adjustedXMin + adjustedNBins * binW,
      nBins: adjustedNBins
    };
  }

  function chooseBinCount(nSamples) {
    if (nSamples < 20) return 15;
    if (nSamples < 50) return 20;
    if (nSamples < 200) return 30;
    if (nSamples < 1000) return 45;
    if (nSamples < 5000) return 60;
    return 80;
  }


  /* ======================================================================
   * DRAWING
   * ====================================================================== */

  function draw() {
    if (!canvas || !ctx) return;

    var dims = TA.resizeCanvas(canvas, ctx, dom.canvasArea);
    state.canvasW = dims.width;
    state.canvasH = dims.height;

    ctx.clearRect(0, 0, dims.width, dims.height);

    var layout;
    if (state.panelTransitioning) {
      var elapsed = (performance.now() - state.panelTransitionStart) / 400;
      var t = Math.min(1, elapsed);
      t = t * t * (3 - 2 * t);
      layout = lerpLayout(state.panelTransitionFrom, state.panelTransitionTo, t);
      if (t >= 1) state.panelTransitioning = false;
    } else {
      layout = computeLayout();
    }

    if (layout.pop && layout.pop.h > 5) drawPopulation(layout.pop);
    if (layout.sample && layout.sample.h > 5) {
      drawSampleLine(layout.sample);
    }
    if (layout.hist && layout.hist.h > 5) {
      drawHistogram(layout.hist);
      var histBaseY = layout.hist.y + layout.hist.h;
      // χ² window and Hist window draw on histogram baseline
      if (state.showWindow || state.showHistWindow) {
        var savedCI = state.showCI; state.showCI = false;
        drawCIOnHistRect(layout.hist, histBaseY, 10);
        state.showCI = savedCI;
      }
      // CI on histogram: hide entirely during animation
      if (state.showCI && !state.animating) {
        var savedW = state.showWindow; var savedHW = state.showHistWindow;
        state.showWindow = false; state.showHistWindow = false;
        drawCIOnHistRect(layout.hist, histBaseY, 10);
        state.showWindow = savedW; state.showHistWindow = savedHW;
        // Red dot for current S² on histogram baseline
        if (state.currentVariance !== null) {
          var dotX = histXToPixel(sToHistAxis(state.currentVariance), layout.hist);
          if (dotX >= layout.hist.x && dotX <= layout.hist.x + layout.hist.w) {
            ctx.beginPath();
            ctx.arc(dotX, histBaseY, 7, 0, 2 * Math.PI);
            ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
            ctx.fill();
          }
        }
      }
    }
  }


  /* ── Population plot — fixed N(0,1) curve ── */

  function drawPopulation(rect) {
    var range = getPopulationXRange();
    var xMin = range[0], xMax = range[1];

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    var nPts = Math.max(200, rect.w);
    var maxPdf = normalPdf(POP_MU, POP_MU, POP_SIGMA);
    var minPdf = normalPdf(xMin, POP_MU, POP_SIGMA);
    if (minPdf <= 0) minPdf = 1e-6;

    var scaleFrac = 0.85;

    var logFloor, logCeil, logRange;
    if (state.logYT > 0) {
      logFloor = Math.log10(minPdf * 0.1);
      logCeil = Math.log10(maxPdf);
      logRange = logCeil - logFloor;
      if (logRange < 1e-12) logRange = 1;
    }
    function pdfToFrac(v) {
      var linFrac = v / maxPdf;
      if (state.logYT <= 0) return linFrac;
      var logFrac;
      if (v <= 0) { logFrac = 0; }
      else {
        var lv = Math.log10(v);
        logFrac = (lv < logFloor) ? 0 : (lv - logFloor) / logRange;
      }
      var t = state.logYT;
      return linFrac + (logFrac - linFrac) * t;
    }

    // Filled area
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.h);
    for (var s = 0; s <= nPts; s++) {
      var x = xMin + (xMax - xMin) * s / nPts;
      var y = normalPdf(x, POP_MU, POP_SIGMA);
      var px = rect.x + (s / nPts) * rect.w;
      var py = rect.y + rect.h - pdfToFrac(y) * rect.h * scaleFrac;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.closePath();
    ctx.fillStyle = 'rgba(100, 181, 246, 0.25)';
    ctx.fill();

    // Curve outline
    ctx.beginPath();
    for (var s2 = 0; s2 <= nPts; s2++) {
      var x2 = xMin + (xMax - xMin) * s2 / nPts;
      var y2 = normalPdf(x2, POP_MU, POP_SIGMA);
      var px2 = rect.x + (s2 / nPts) * rect.w;
      var py2 = rect.y + rect.h - pdfToFrac(y2) * rect.h * scaleFrac;
      if (s2 === 0) ctx.moveTo(px2, py2);
      else ctx.lineTo(px2, py2);
    }
    ctx.strokeStyle = '#64b5f6';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Baseline
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.h);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.strokeStyle = 'rgba(224, 226, 235, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels
    if (state.showLabels) {
      ctx.font = '16px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.fillStyle = 'rgba(224, 226, 235, 0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      var labelY = rect.y + 6 + (state.showBinSlider ? 36 : 0);
      ctx.fillText('μ = 0   σ² = 1', rect.x + 8, labelY);
    }

    ctx.restore();
  }


  /* ── Sample number line ──
   *
   * Shows the n raw values as dots, the sample mean X̄ as a marker, and a
   * horizontal whiskered bar from X̄−S to X̄+S (the ±1 s.d. interval).
   * During animation phase 2 the S² value drops to the histogram panel.
   */

  function drawSampleLine(rect) {
    var midY = rect.y + rect.h * 0.5;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    // Number line
    ctx.beginPath();
    ctx.moveTo(rect.x, midY);
    ctx.lineTo(rect.x + rect.w, midY);
    ctx.strokeStyle = 'rgba(224, 226, 235, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (state.currentSample.length > 0) {
      var nShow = state.animating && state.animPhase === 0
        ? Math.min(state.animDotIndex + 1, state.currentSample.length)
        : state.currentSample.length;

      // Sample dots (raw X_i values)
      for (var i = 0; i < nShow; i++) {
        var val = state.currentSample[i];
        var px = popXToPixel(val, rect);
        if (px < rect.x || px > rect.x + rect.w) continue;

        var dotY = midY;
        if (state.animating && state.animPhase === 0 && i === state.animDotIndex) {
          dotY = rect.y + (midY - rect.y) * state.animT;
        }

        ctx.beginPath();
        ctx.arc(px, dotY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(100, 181, 246, 0.8)';
        ctx.fill();
      }

      // Mean marker + ±1 s.d. bar (phases ≥ 1, or always if not animating)
      var showMean = false;
      if (state.animating) {
        if (state.animPhase >= 1) showMean = true;
      } else if (state.currentMean !== null) {
        showMean = true;
      }

      if (showMean && state.currentMean !== null) {
        var mx = popXToPixel(state.currentMean, rect);
        var sd = (state.currentVariance !== null && state.currentVariance >= 0)
          ? Math.sqrt(state.currentVariance) : 0;
        var leftX = popXToPixel(state.currentMean - sd, rect);
        var rightX = popXToPixel(state.currentMean + sd, rect);

        var grow = 1;
        if (state.animating && state.animPhase === 1) grow = state.animT;

        // ±1 s.d. bar (drawn above the number line so it doesn't overlap dots)
        var barY = midY - 12;
        ctx.strokeStyle = 'rgba(244, 67, 54, 0.6)';
        ctx.lineWidth = 2 * grow;
        var bL = Math.max(leftX, rect.x);
        var bR = Math.min(rightX, rect.x + rect.w);
        if (bR > bL) {
          ctx.beginPath();
          ctx.moveTo(bL, barY);
          ctx.lineTo(bR, barY);
          ctx.stroke();
          var whiskerH = 5 * grow;
          if (leftX >= rect.x && leftX <= rect.x + rect.w) {
            ctx.beginPath();
            ctx.moveTo(leftX, barY - whiskerH);
            ctx.lineTo(leftX, barY + whiskerH);
            ctx.stroke();
          }
          if (rightX >= rect.x && rightX <= rect.x + rect.w) {
            ctx.beginPath();
            ctx.moveTo(rightX, barY - whiskerH);
            ctx.lineTo(rightX, barY + whiskerH);
            ctx.stroke();
          }
        }

        // Sample mean dot
        if (mx >= rect.x && mx <= rect.x + rect.w) {
          var radius = 7 * grow;
          ctx.beginPath();
          ctx.arc(mx, midY, radius, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
          ctx.fill();
        }

        // Optional label: S² value next to the bar
        if (state.showLabels && state.currentVariance !== null && !state.animating) {
          ctx.font = '14px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
          ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          var labelText = 'S² = ' + state.currentVariance.toFixed(3);
          var labelX = Math.min(rightX + 8, rect.x + rect.w - 90);
          ctx.fillText(labelText, labelX, barY);
        }
      }
    }

    ctx.restore();
  }


  /* ── Sampling-distribution histogram ──
   *
   * x-axis: S² (default) or (n−1)S²/σ² (scaled mode).
   * Overlays:
   *   – χ²(df) density (state.showChiSq). On the S² axis we use the change
   *     of variables: if Y ~ χ²(df) then S² = Y/(n−1) has density
   *     (n−1) · f_χ²((n−1)·s², df).
   *   – Normal approximation: N(σ², 2σ⁴/df) on the S² axis,
   *                           N(df, 2df) on the scaled axis.
   */

  function drawHistogram(rect) {
    var range = getHistogramXRange();
    var xMin = range[0], xMax = range[1];
    var n = state.sampleSize;
    var df = n - 1;

    var hasData = state.sampleVariances.length > 0;
    var hist = null;
    var maxBin = 0;

    if (hasData) {
      var nBins = Math.max(5, Math.round(chooseBinCount(state.sampleVariances.length) / state.binSizeFactor));
      hist = computeHistogram(state.sampleVariances, xMin, xMax, nBins);
      for (var i = 0; i < hist.nBins; i++) {
        if (hist.bins[i] > maxBin) maxBin = hist.bins[i];
      }
    }

    // Theoretical peak of χ² density on the histogram axis (used for y-scaling
    // even if no histogram data yet). Histogram x-axis is S², so density on
    // the S² axis is df · f_χ²(df·s², df).
    var thPeak = 0;
    if (df >= 2) {
      var modeChi = (df === 2) ? 0 : (df - 2);
      thPeak = chiSquaredPdf(modeChi, df) * df;
    } else {
      // df=1: density diverges at 0; use a small positive evaluation point
      var smallChi = 0.05;
      thPeak = chiSquaredPdf(smallChi, df) * df;
      thPeak = Math.min(thPeak, 5);
    }

    var scaleMax = Math.max(maxBin, thPeak);
    if (scaleMax === 0) scaleMax = 1;

    var minBin = Infinity;
    if (state.logYT > 0 && hist) {
      for (var ib = 0; ib < hist.nBins; ib++) {
        if (hist.bins[ib] > 0 && hist.bins[ib] < minBin) minBin = hist.bins[ib];
      }
      if (minBin === Infinity) minBin = scaleMax;
    }

    var scaleFrac = 0.85;

    var hLogFloor, hLogCeil, hLogRange;
    if (state.logYT > 0) {
      hLogFloor = Math.log10(minBin * 0.1);
      hLogCeil = Math.log10(scaleMax);
      hLogRange = hLogCeil - hLogFloor;
      if (hLogRange < 1e-12) hLogRange = 1;
    }
    function histToFrac(v) {
      var linFrac = v / scaleMax;
      if (state.logYT <= 0) return linFrac;
      var logFrac;
      if (v <= 0) { logFrac = 0; }
      else {
        var lv = Math.log10(v);
        logFrac = (lv < hLogFloor) ? 0 : (lv - hLogFloor) / hLogRange;
      }
      var t = state.logYT;
      return linFrac + (logFrac - linFrac) * t;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    // Histogram bars
    if (hist) {
      for (var j = 0; j < hist.nBins; j++) {
        if (hist.bins[j] === 0) continue;
        var binXMin = hist.xMin + j * hist.binWidth;
        var binXMax = binXMin + hist.binWidth;
        var pxL = histXToPixel(binXMin, rect);
        var pxR = histXToPixel(binXMax, rect);
        var barH = histToFrac(hist.bins[j]) * rect.h * scaleFrac;

        ctx.fillStyle = 'rgba(100, 181, 246, 0.4)';
        ctx.fillRect(pxL, rect.y + rect.h - barH, pxR - pxL, barH);
        ctx.strokeStyle = 'rgba(100, 181, 246, 0.7)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pxL, rect.y + rect.h - barH, pxR - pxL, barH);
      }
    }

    // Dropping S² during animation phase 2
    if (state.animating && state.animPhase === 2 && state.currentVariance !== null) {
      var mx = histXToPixel(sToHistAxis(state.currentVariance), rect);
      var targetY = rect.y + rect.h;
      var startY = rect.y - 10;
      var dropY = startY + (targetY - startY) * state.animT;

      ctx.beginPath();
      ctx.arc(mx, dropY, 7, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
      ctx.fill();
    }

    // Theoretical density helpers, evaluated on the S² histogram axis.
    // Change of variables: if Y ~ χ²(df) then S² = Y/df has density
    // df · f_χ²(df·s², df) on the S² axis.
    function theoreticalChiSqDensity(s2) {
      return chiSquaredPdf(s2 * df, df) * df;
    }

    function theoreticalNormalDensity(s2) {
      // Normal approximation: N(σ²=1, 2σ⁴/df = 2/df)
      var sdS2 = Math.sqrt(2 / df);
      return normalPdf(s2, 1, sdS2);
    }

    function drawDensityCurve(densityFn, colour, lineWidth) {
      var nPts = Math.max(200, rect.w);
      var drawing = false;
      ctx.beginPath();
      for (var s = 0; s <= nPts; s++) {
        var x = xMin + (xMax - xMin) * s / nPts;
        var y = densityFn(x);
        if (!isFinite(y) || y < 0) { drawing = false; continue; }
        var frac = histToFrac(y);
        if (state.logYT > 0 && frac <= 0) { drawing = false; continue; }
        var px = rect.x + (s / nPts) * rect.w;
        var py = rect.y + rect.h - frac * rect.h * scaleFrac;
        if (!drawing) { ctx.moveTo(px, py); drawing = true; }
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = colour;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }

    // χ² overlay (primary)
    if (state.showChiSq) {
      drawDensityCurve(theoreticalChiSqDensity, 'rgba(244, 67, 54, 0.85)', 2);
    }

    // Normal approximation overlay
    if (state.showNormal) {
      drawDensityCurve(theoreticalNormalDensity, 'rgba(255, 193, 7, 0.85)', 2);
    }

    // Baseline
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.h);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.strokeStyle = 'rgba(224, 226, 235, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels (top-left of histogram panel)
    if (state.showLabels) {
      ctx.font = '16px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.fillStyle = 'rgba(224, 226, 235, 0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      var meanStr = '—';
      var sdStr = '—';
      if (state.sampleVariances.length > 0) {
        var hSum = 0;
        for (var m = 0; m < state.sampleVariances.length; m++) hSum += state.sampleVariances[m];
        var hMean = hSum / state.sampleVariances.length;
        meanStr = hMean.toFixed(4);
        if (state.sampleVariances.length > 1) {
          var hVar = 0;
          for (var m2 = 0; m2 < state.sampleVariances.length; m2++) {
            var dev = state.sampleVariances[m2] - hMean;
            hVar += dev * dev;
          }
          hVar /= state.sampleVariances.length;
          sdStr = Math.sqrt(hVar).toFixed(4);
        }
      }

      // Theoretical: E[S²] = σ² = 1, Var[S²] = 2σ⁴/(n−1) = 2/(n−1)
      var theoryMean = 1;
      var theorySd = (df > 0) ? Math.sqrt(2 / df) : Infinity;
      var theoryStr = '   E[S²] = ' + theoryMean.toFixed(4);

      var line1 = 'n = ' + state.sampleSize +
                  '   df = ' + df +
                  '   Samples: ' + state.totalSamples;
      var line2 = 'mean(S²) = ' + meanStr +
                  theoryStr;
      var histLabelY = rect.y + 6;
      if (state.showBinSlider && !state.showPopulation && !state.showSampleLine) {
        histLabelY += 36;
      }
      ctx.fillText(line1, rect.x + 8, histLabelY);
      ctx.fillText(line2, rect.x + 8, histLabelY + 18);
    }

    ctx.restore();
  }


  /* ======================================================================
   * CONFIDENCE INTERVAL / WINDOW DRAWING
   *
   * Three intervals, drawn on the histogram panel:
   *
   *   CI (red) — per-sample two-sided CI for σ²:
   *              [(n−1)S² / χ²_{1−α/2,df},  (n−1)S² / χ²_{α/2,df}]
   *
   *   χ² window (green) — central (1−α) interval of the theoretical χ²(df)
   *                       distribution, mapped to the current histogram axis.
   *                       A green dot marks the theoretical mean.
   *
   *   Hist window (white) — empirical α/2 to 1−α/2 quantiles of the
   *                         accumulated S² values. White dot at empirical mean.
   * ====================================================================== */

  function getCITailFraction() {
    switch (state.ciLevel) {
      case '50': return 0.25;
      case '90': return 0.05;
      case '99': return 0.005;
      default:   return 0.025;  // 95%
    }
  }

  // Per-sample CI for σ² (in S² units)
  function getCIRangeS2() {
    if (state.currentVariance === null) return null;
    var df = state.sampleSize - 1;
    if (df <= 0) return null;
    var tail = getCITailFraction();
    var qLo = chiSquaredQuantile(tail, df);
    var qHi = chiSquaredQuantile(1 - tail, df);
    if (qLo <= 0) return null;
    var s2 = state.currentVariance;
    return {
      lo: df * s2 / qHi,
      hi: df * s2 / qLo
    };
  }

  // Theoretical χ² central window — endpoints in S² units
  function getChiWindowRange() {
    var df = state.sampleSize - 1;
    if (df <= 0) return null;
    var tail = getCITailFraction();
    var qLo = chiSquaredQuantile(tail, df);
    var qHi = chiSquaredQuantile(1 - tail, df);
    return { lo: qLo / df, hi: qHi / df };
  }

  function getHistWindowRange() {
    if (state.cachedSortedVars === null || state.cachedSortedVars.length < 20) return null;
    var tail = getCITailFraction();
    var n = state.cachedSortedVars.length;
    var iLo = Math.max(0, Math.floor(n * tail));
    var iHi = Math.min(n - 1, Math.floor(n * (1 - tail)));
    var lo = state.cachedSortedVars[iLo];
    var hi = state.cachedSortedVars[iHi];
    return { lo: sToHistAxis(lo), hi: sToHistAxis(hi) };
  }

  function updateHistWindowCache() {
    if (state.sampleVariances.length < 20) {
      state.cachedSortedVars = null;
      state.cachedHistMean = null;
      return;
    }
    state.cachedSortedVars = state.sampleVariances.slice().sort(function (a, b) { return a - b; });
    var sum = 0;
    for (var i = 0; i < state.sampleVariances.length; i++) sum += state.sampleVariances[i];
    state.cachedHistMean = sum / state.sampleVariances.length;
  }

  function drawWhiskeredLine(x1, x2, y, colour, clipRect) {
    var whiskerH = 6;
    var left = Math.max(x1, clipRect.x);
    var right = Math.min(x2, clipRect.x + clipRect.w);
    if (left > clipRect.x + clipRect.w || right < clipRect.x) return;

    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();

    if (x1 >= clipRect.x && x1 <= clipRect.x + clipRect.w) {
      ctx.beginPath();
      ctx.moveTo(x1, y - whiskerH);
      ctx.lineTo(x1, y + whiskerH);
      ctx.stroke();
    }
    if (x2 >= clipRect.x && x2 <= clipRect.x + clipRect.w) {
      ctx.beginPath();
      ctx.moveTo(x2, y - whiskerH);
      ctx.lineTo(x2, y + whiskerH);
      ctx.stroke();
    }
  }

  function drawCIOnHistRect(rect, baseY, offsetBelow) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h + 40);
    ctx.clip();

    // CI (red) — per-sample CI for σ², asymmetric around current S²
    if (state.showCI) {
      var ci = getCIRangeS2();
      if (ci !== null) {
        var ciLoAx = sToHistAxis(ci.lo);
        var ciHiAx = sToHistAxis(ci.hi);
        var ciLeft = histXToPixel(ciLoAx, rect);
        var ciRight = histXToPixel(ciHiAx, rect);
        drawWhiskeredLine(ciLeft, ciRight, baseY, 'rgba(244, 67, 54, 0.85)', rect);
      }
    }

    // χ² window (green)
    var windowOffset = 0;
    if (state.showWindow) {
      var win = getChiWindowRange();
      if (win !== null) {
        windowOffset = offsetBelow;
        var wLeft = histXToPixel(win.lo, rect);
        var wRight = histXToPixel(win.hi, rect);
        var wY = baseY + windowOffset;
        drawWhiskeredLine(wLeft, wRight, wY, 'rgba(76, 175, 80, 0.85)', rect);
        // Green dot at theoretical mean (σ² = 1)
        var meanX = histXToPixel(1, rect);
        if (meanX >= rect.x && meanX <= rect.x + rect.w) {
          ctx.beginPath();
          ctx.arc(meanX, wY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(76, 175, 80, 0.85)';
          ctx.fill();
        }
      }
    }

    // Hist window (white)
    if (state.showHistWindow) {
      var hwin = getHistWindowRange();
      if (hwin !== null) {
        var hwY = baseY + (windowOffset > 0 ? windowOffset + offsetBelow : offsetBelow);
        var hwLeft = histXToPixel(hwin.lo, rect);
        var hwRight = histXToPixel(hwin.hi, rect);
        drawWhiskeredLine(hwLeft, hwRight, hwY, '#ffffff', rect);
        if (state.cachedHistMean !== null) {
          var hmAx = sToHistAxis(state.cachedHistMean);
          var hmX = histXToPixel(hmAx, rect);
          if (hmX >= rect.x && hmX <= rect.x + rect.w) {
            ctx.beginPath();
            ctx.arc(hmX, hwY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }
        }
      }
    }

    ctx.restore();
  }


  /* ======================================================================
   * SAMPLING
   * ====================================================================== */

  // Draw one sample of size n from N(0,1); return the values, mean, and
  // unbiased S² = (1/(n−1)) Σ (X_i − X̄)².
  function generateSample() {
    var n = state.sampleSize;
    var values = new Array(n);
    var sum = 0;
    for (var i = 0; i < n; i++) {
      values[i] = randn();
      sum += values[i];
    }
    var mean = sum / n;
    var ss = 0;
    for (var j = 0; j < n; j++) {
      var d = values[j] - mean;
      ss += d * d;
    }
    var variance = (n > 1) ? ss / (n - 1) : 0;
    return { values: values, mean: mean, variance: variance };
  }

  function flashButton(btn) {
    btn.classList.add('active');
    setTimeout(function () { btn.classList.remove('active'); }, 200);
  }

  function addSamples(count) {
    for (var i = 0; i < count; i++) {
      var s = generateSample();
      state.sampleVariances.push(s.variance);
      state.currentSample = s.values;
      state.currentMean = s.mean;
      state.currentVariance = s.variance;
    }
    state.totalSamples += count;
    state.lastAction = count;
    state.lastWasAnimate = false;
    updateHistWindowCache();
    draw();
  }

  function repeatLastAction() {
    if (state.lastAction === null) return;
    if (state.lastAction === 'animate') {
      startAnimation();
    } else {
      addSamples(state.lastAction);
    }
  }

  function resetSampling() {
    state.sampleVariances = [];
    state.currentSample = [];
    state.currentMean = null;
    state.currentVariance = null;
    state.totalSamples = 0;
    state.cachedSortedVars = null;
    state.cachedHistMean = null;
    state.animating = false;
    draw();
  }


  /* ======================================================================
   * ANIMATION
   *
   * Phase 0: dots (X_i values) appear sequentially on the sample line
   * Phase 1: sample mean X̄ marker and ±1 s.d. bar appear
   * Phase 2: S² value drops down into the histogram panel
   * ====================================================================== */

  var animFrameId = null;

  function startAnimation() {
    if (state.animating) return;

    var s = generateSample();
    state.currentSample = s.values;
    state.currentMean = s.mean;
    state.currentVariance = s.variance;
    state.lastAction = 'animate';

    state.animating = true;
    state.animPhase = 0;
    state.animDotIndex = 0;
    state.animT = 0;
    state.animStartTime = performance.now();

    animateFrame();
  }

  function animateFrame() {
    var now = performance.now();
    var totalDuration = 1200;
    var n = state.currentSample.length;

    var elapsed = now - state.animStartTime;
    var progress = elapsed / totalDuration;

    if (progress < 0.6) {
      state.animPhase = 0;
      var dotProgress = progress / 0.6;
      state.animDotIndex = Math.min(n - 1, Math.floor(dotProgress * n));
      var dotFrac = (dotProgress * n) - state.animDotIndex;
      state.animT = Math.min(1, dotFrac * 3);
    } else if (progress < 0.75) {
      state.animPhase = 1;
      state.animDotIndex = n - 1;
      state.animT = (progress - 0.6) / 0.15;
    } else if (progress < 1.0) {
      state.animPhase = 2;
      state.animT = (progress - 0.75) / 0.25;
    } else {
      state.animating = false;
      state.lastWasAnimate = true;
      state.sampleVariances.push(state.currentVariance);
      state.totalSamples++;
      updateHistWindowCache();
      draw();
      return;
    }

    draw();
    animFrameId = requestAnimationFrame(animateFrame);
  }


  /* ======================================================================
   * LOG Y ANIMATION
   * ====================================================================== */

  var LOGY_PHASE_DURATION = 400;
  var LOGY_PAUSE = 100;
  var logYAnimStart = 0;
  var logYEntering = true;

  function startLogYAnimation(entering) {
    logYEntering = entering;
    logYAnimStart = performance.now();
    state.logYPhase = 0;
    if (!state.logYAnimating) {
      state.logYAnimating = true;
      animateLogY();
    }
  }

  function animateLogY() {
    var now = performance.now();
    var elapsed = now - logYAnimStart;
    var totalDuration = LOGY_PHASE_DURATION * 2 + LOGY_PAUSE;
    var progress = Math.min(1, elapsed / totalDuration);

    var p0End = LOGY_PHASE_DURATION / totalDuration;
    var p1Start = (LOGY_PHASE_DURATION + LOGY_PAUSE) / totalDuration;

    var phaseProgress;
    if (progress <= p0End) {
      state.logYPhase = 0;
      phaseProgress = progress / p0End;
    } else if (progress < p1Start) {
      state.logYPhase = 0;
      phaseProgress = 1;
    } else {
      state.logYPhase = 1;
      phaseProgress = (progress - p1Start) / (1 - p1Start);
    }
    phaseProgress = phaseProgress * phaseProgress * (3 - 2 * phaseProgress);

    if (logYEntering) {
      if (state.logYPhase === 0) {
        state.logYXExpandT = phaseProgress;
        state.logYT = 0;
      } else {
        state.logYXExpandT = 1;
        state.logYT = phaseProgress;
      }
    } else {
      if (state.logYPhase === 0) {
        state.logYT = 1 - phaseProgress;
        state.logYXExpandT = 1;
      } else {
        state.logYT = 0;
        state.logYXExpandT = 1 - phaseProgress;
      }
    }

    // Histogram x-range depends on logYXExpandT — invalidate cache
    _histRangeCache.key = null;

    draw();
    if (progress < 1) {
      requestAnimationFrame(animateLogY);
    } else {
      state.logYT = logYEntering ? 1 : 0;
      state.logYXExpandT = logYEntering ? 1 : 0;
      _histRangeCache.key = null;
      state.logYAnimating = false;
      draw();
    }
  }


  /* ======================================================================
   * PANEL VISIBILITY TRANSITIONS
   * ====================================================================== */

  function triggerPanelTransition(fromLayout) {
    var toLayout = computeLayout();
    state.panelTransitioning = true;
    state.panelTransitionStart = performance.now();
    state.panelTransitionFrom = fromLayout;
    state.panelTransitionTo = toLayout;
    animatePanelTransition();
  }

  function animatePanelTransition() {
    draw();
    if (state.panelTransitioning) {
      requestAnimationFrame(animatePanelTransition);
    }
  }


  /* ======================================================================
   * RESIZE
   * ====================================================================== */

  function resize() {
    if (!canvas || !ctx || !dom.canvasArea) return;
    var dims = TA.resizeCanvas(canvas, ctx, dom.canvasArea);
    state.canvasW = dims.width;
    state.canvasH = dims.height;
  }


  /* ======================================================================
   * INITIALISATION
   * ====================================================================== */

  function init() {
    // DOM refs
    dom.panel = document.getElementById('panel');
    dom.collapseBtn = document.getElementById('collapseBtn');
    dom.openBtn = document.getElementById('openBtn');
    dom.canvasArea = document.getElementById('canvasArea');
    dom.toggleChiSq = document.getElementById('toggleChiSq');
    dom.toggleNormal = document.getElementById('toggleNormal');

    canvas = document.getElementById('canvas2d');
    ctx = canvas.getContext('2d');

    // --- Sidebar ---
    TA.initSidebar({
      panel: dom.panel,
      collapseBtn: dom.collapseBtn,
      openBtn: dom.openBtn,
      onResize: function () { resize(); draw(); }
    });

    // --- Overlays ---
    TA.initOverlay({
      overlay: document.getElementById('helpOverlay'),
      closeBtn: document.getElementById('helpClose'),
      triggerBtn: document.getElementById('btnHelp')
    });
    TA.initOverlay({
      overlay: document.getElementById('overviewOverlay'),
      closeBtn: document.getElementById('overviewClose'),
      triggerBtn: document.getElementById('btnOverview')
    });

    // --- Invert ---
    document.getElementById('toggleInvert').addEventListener('click', function () {
      this.classList.toggle('active');
      document.documentElement.classList.toggle('inverted');
    });

    // --- Sample size radios ---
    document.querySelectorAll('input[name="sampleSize"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.sampleSize = parseInt(this.value);
        _histRangeCache.key = null;
        resetSampling();
        draw();
      });
    });

    // --- Sampling buttons ---
    document.getElementById('btnAnimate').addEventListener('click', function () {
      flashButton(this);
      startAnimation();
    });
    document.getElementById('btnSample1').addEventListener('click', function () {
      flashButton(this);
      addSamples(1);
    });
    document.getElementById('btnSample5').addEventListener('click', function () {
      flashButton(this);
      addSamples(5);
    });
    document.getElementById('btnSample100').addEventListener('click', function () {
      flashButton(this);
      addSamples(100);
    });
    document.getElementById('btnSample10000').addEventListener('click', function () {
      flashButton(this);
      addSamples(10000);
    });

    // --- Repeat (in canvas area) ---
    document.getElementById('btnRepeat').addEventListener('click', function () {
      repeatLastAction();
    });

    // --- Reset ---
    document.getElementById('btnReset').addEventListener('click', function () {
      flashButton(this);
      resetSampling();
    });

    // --- Display toggles ---
    document.getElementById('togglePopulation').addEventListener('click', function () {
      var prevLayout = computeLayout();
      state.showPopulation = !state.showPopulation;
      this.classList.toggle('active', state.showPopulation);
      triggerPanelTransition(prevLayout);
    });
    document.getElementById('toggleSampleLine').addEventListener('click', function () {
      var prevLayout = computeLayout();
      state.showSampleLine = !state.showSampleLine;
      this.classList.toggle('active', state.showSampleLine);
      triggerPanelTransition(prevLayout);
    });
    document.getElementById('toggleSamplingDist').addEventListener('click', function () {
      var prevLayout = computeLayout();
      state.showSamplingDist = !state.showSamplingDist;
      this.classList.toggle('active', state.showSamplingDist);
      triggerPanelTransition(prevLayout);
    });

    // --- Chi-squared overlay toggle ---
    dom.toggleChiSq.addEventListener('click', function () {
      state.showChiSq = !state.showChiSq;
      this.classList.toggle('active', state.showChiSq);
      draw();
    });

    // --- Normal approximation overlay toggle ---
    dom.toggleNormal.addEventListener('click', function () {
      state.showNormal = !state.showNormal;
      this.classList.toggle('active', state.showNormal);
      draw();
    });

    // --- Log y toggle ---
    document.getElementById('toggleLogY').addEventListener('click', function () {
      state.logY = !state.logY;
      this.classList.toggle('active', state.logY);
      startLogYAnimation(state.logY);
    });

    // --- Labels toggle ---
    document.getElementById('toggleLabels').addEventListener('click', function () {
      state.showLabels = !state.showLabels;
      this.classList.toggle('active', state.showLabels);
      draw();
    });

    // --- Bin size toggle + slider ---
    var binSliderWrap = document.getElementById('binSliderWrap');
    var binSlider = document.getElementById('binSlider');
    var binSliderValue = document.getElementById('binSliderValue');
    var binToggleBtn = document.getElementById('toggleBinSize');

    binToggleBtn.addEventListener('click', function () {
      state.showBinSlider = !state.showBinSlider;
      this.classList.toggle('active', state.showBinSlider);
      binSliderWrap.style.display = state.showBinSlider ? 'flex' : 'none';
      if (!state.showBinSlider) {
        state.binSizeFactor = 1;
        binSlider.value = 0;
        binSliderValue.textContent = '1.00';
      }
      draw();
    });

    binSlider.addEventListener('input', function () {
      var raw = parseFloat(binSlider.value);
      if (Math.abs(raw) < 0.04) raw = 0;
      state.binSizeFactor = Math.pow(10, raw);
      binSliderValue.textContent = state.binSizeFactor.toFixed(2);
      draw();
    });

    // --- CI / window toggles ---
    var ciLevelRow = document.getElementById('ciLevelRow');

    function updateCILevelVisibility() {
      ciLevelRow.style.display = (state.showCI || state.showWindow || state.showHistWindow) ? 'grid' : 'none';
    }

    document.getElementById('toggleCI').addEventListener('click', function () {
      state.showCI = !state.showCI;
      this.classList.toggle('active', state.showCI);
      updateCILevelVisibility();
      draw();
    });

    document.getElementById('toggleWindow').addEventListener('click', function () {
      state.showWindow = !state.showWindow;
      this.classList.toggle('active', state.showWindow);
      updateCILevelVisibility();
      draw();
    });

    document.getElementById('toggleHistWindow').addEventListener('click', function () {
      state.showHistWindow = !state.showHistWindow;
      this.classList.toggle('active', state.showHistWindow);
      updateCILevelVisibility();
      draw();
    });

    document.querySelectorAll('[data-cilevel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.ciLevel = btn.dataset.cilevel;
        document.querySelectorAll('[data-cilevel]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        draw();
      });
    });

    // --- Initial render ---
    resize();
    draw();
    window.addEventListener('resize', function () { resize(); draw(); });

    // --- Teaching pointer (ALWAYS LAST) ---
    TA.initPointer();
  }


  /* ======================================================================
   * PUBLIC API
   * ====================================================================== */

  return { init: init };

})();
