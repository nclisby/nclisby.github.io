/* ==========================================================================
 * sampling-distribution.js
 *
 * App-specific logic for the "Sampling Distribution" interactive teaching app.
 * Visualises sampling distributions and the Central Limit Theorem by allowing
 * users to draw samples from various parent populations, build up the sampling
 * distribution of the sample mean, and compare to the normal approximation.
 *
 * Depends on:
 *   – teaching-app.js  (the TeachingApp engine — must be loaded first)
 *
 * This file is loaded from index.html and exposes a single global
 * initialiser:  SamplingDistribution.init()
 * ========================================================================== */

var SamplingDistribution = (function () {
  'use strict';

  var TA = TeachingApp;


  /* ======================================================================
   * POPULATION DEFINITIONS
   * ====================================================================== */

  // Each population has:
  //   name        — display name for dropdown
  //   sample()    — returns one random draw (mean zero)
  //   pdf(x)      — density/pmf (for plotting; normalised for visual appearance)
  //   variance    — population variance (null if infinite/undefined)
  //   discrete    — true if the distribution is discrete
  //   xRange      — [min, max] for the population plot domain
  //   cltApplies  — whether the CLT applies (finite variance)

  var populations = [];

  // Helper: standard normal random via Box-Muller
  function randn() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // Uniform(−1, 1)
  populations.push({
    name: 'Uniform',
    sample: function () { return Math.random() * 2 - 1; },
    pdf: function (x) { return (x >= -1 && x <= 1) ? 0.5 : 0; },
    variance: 1.0 / 3.0,
    discrete: false,
    xRange: [-2, 2],
    cltApplies: true,
    binEdges: [-1, 1]
  });

  // Exponential (shifted to mean zero) — rate 1, shifted by -1
  populations.push({
    name: 'Exponential',
    sample: function () { return -Math.log(1 - Math.random()) - 1; },
    pdf: function (x) { return (x >= -1) ? Math.exp(-(x + 1)) : 0; },
    variance: 1,
    discrete: false,
    xRange: [-2, 6],
    cltApplies: true
  });

  // Normal(0, 1)
  populations.push({
    name: 'Normal',
    sample: function () { return randn(); },
    pdf: function (x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); },
    variance: 1,
    discrete: false,
    xRange: [-4, 4],
    cltApplies: true
  });

  // Pareto (alpha=2.5), shifted to mean zero
  // X ~ Pareto(1, alpha), E[X] = alpha/(alpha-1), Var = alpha/((a-1)^2*(a-2))
  // For alpha=2.5: mean = 2.5/1.5 = 5/3, var = 2.5/(1.5^2*0.5) = 2.5/1.125 = 20/9
  (function () {
    var alpha = 2.5;
    var mu = alpha / (alpha - 1);                          // 5/3
    var v = alpha / ((alpha - 1) * (alpha - 1) * (alpha - 2)); // 20/9
    populations.push({
      name: 'Pareto (α = 2.5)',
      sample: function () {
        var u = Math.random();
        return Math.pow(1 - u, -1.0 / alpha) - mu;
      },
      pdf: function (x) {
        var xOrig = x + mu;
        return (xOrig >= 1) ? alpha * Math.pow(xOrig, -(alpha + 1)) : 0;
      },
      variance: v,
      discrete: false,
      xRange: [-3, 8],
      cltApplies: true
    });
  })();

  // Pareto (alpha=1.5), shifted to mean zero
  // E[X] = alpha/(alpha-1) = 3, Var = infinite (alpha <= 2)
  (function () {
    var alpha = 1.5;
    var mu = alpha / (alpha - 1);  // 3
    populations.push({
      name: 'Pareto (α = 1.5)',
      sample: function () {
        var u = Math.random();
        return Math.pow(1 - u, -1.0 / alpha) - mu;
      },
      pdf: function (x) {
        var xOrig = x + mu;
        return (xOrig >= 1) ? alpha * Math.pow(xOrig, -(alpha + 1)) : 0;
      },
      variance: null,   // infinite
      discrete: false,
      xRange: [-5, 30],
      cltApplies: false
    });
  })();

  // Cauchy — no mean, no variance
  populations.push({
    name: 'Cauchy',
    sample: function () { return Math.tan(Math.PI * (Math.random() - 0.5)); },
    pdf: function (x) { return 1.0 / (Math.PI * (1 + x * x)); },
    variance: null,
    discrete: false,
    xRange: [-8, 8],
    cltApplies: false
  });

  // ±1 discrete (Rademacher)
  populations.push({
    name: '±1 discrete',
    sample: function () { return Math.random() < 0.5 ? -1 : 1; },
    pdf: function (x) { return null; },       // handled specially in drawing
    variance: 1,
    discrete: true,
    discretePoints: [{ x: -1, p: 0.5 }, { x: 1, p: 0.5 }],
    xRange: [-2, 2],
    cltApplies: true
  });

  // Custom piecewise-uniform distribution
  // 8 bins from -1 to +1, each width 0.25. Heights set interactively.
  var CUSTOM_NBINS = 8;
  var CUSTOM_BIN_W = 2.0 / CUSTOM_NBINS;  // 0.25
  var customHeights = [1, 1, 1, 1, 1, 1, 1, 1]; // initial: uniform

  function customComputeDerived() {
    // Compute normalisation, mean, variance, and build sampling structures.
    // The raw density in bin i is customHeights[i] over [−1 + i*0.25, −1 + (i+1)*0.25].
    var totalArea = 0;
    for (var i = 0; i < CUSTOM_NBINS; i++) totalArea += customHeights[i] * CUSTOM_BIN_W;
    if (totalArea === 0) totalArea = 1; // avoid division by zero

    // Normalised density: h_i / totalArea in each bin
    // Mean of the distribution
    var mu = 0;
    for (var j = 0; j < CUSTOM_NBINS; j++) {
      var binCentre = -1 + (j + 0.5) * CUSTOM_BIN_W;
      mu += (customHeights[j] * CUSTOM_BIN_W / totalArea) * binCentre;
    }

    // Variance
    var v = 0;
    for (var k = 0; k < CUSTOM_NBINS; k++) {
      var bL = -1 + k * CUSTOM_BIN_W;
      var bR = bL + CUSTOM_BIN_W;
      var w = customHeights[k] * CUSTOM_BIN_W / totalArea; // probability weight
      if (w === 0) continue;
      // E[X^2] for uniform on [bL, bR] = (bL^2 + bL*bR + bR^2)/3
      var ex2 = (bL * bL + bL * bR + bR * bR) / 3;
      v += w * ex2;
    }
    v -= mu * mu;

    return { totalArea: totalArea, mu: mu, variance: v };
  }

  populations.push({
    name: 'Custom',
    sample: function () {
      var d = customComputeDerived();
      // Weighted sampling: pick a bin, then uniform within
      var totalW = 0;
      for (var i = 0; i < CUSTOM_NBINS; i++) totalW += customHeights[i];
      if (totalW === 0) return -d.mu; // degenerate
      var r = Math.random() * totalW;
      var cum = 0;
      for (var j = 0; j < CUSTOM_NBINS; j++) {
        cum += customHeights[j];
        if (r <= cum) {
          var bL = -1 + j * CUSTOM_BIN_W;
          return bL + Math.random() * CUSTOM_BIN_W - d.mu;
        }
      }
      // Fallback (shouldn't reach)
      var bL2 = -1 + (CUSTOM_NBINS - 1) * CUSTOM_BIN_W;
      return bL2 + Math.random() * CUSTOM_BIN_W - d.mu;
    },
    pdf: function (x) {
      // pdf of the shifted distribution (x is already shifted by -mu)
      var d = customComputeDerived();
      var xOrig = x + d.mu;
      if (xOrig < -1 || xOrig >= 1) return 0;
      var idx = Math.floor((xOrig + 1) / CUSTOM_BIN_W);
      if (idx < 0) idx = 0;
      if (idx >= CUSTOM_NBINS) idx = CUSTOM_NBINS - 1;
      return customHeights[idx] / d.totalArea;
    },
    get variance() {
      var d = customComputeDerived();
      return d.variance > 0 ? d.variance : 0.001;
    },
    discrete: false,
    xRange: [-2, 2],
    cltApplies: true,
    isCustom: true,
    get binEdges() {
      var d = customComputeDerived();
      var edges = [];
      for (var i = 0; i <= CUSTOM_NBINS; i++) {
        edges.push(-1 + i * CUSTOM_BIN_W - d.mu);
      }
      return edges;
    }
  });


  /* ======================================================================
   * CUSTOM DISTRIBUTION EDITOR
   * ====================================================================== */

  var customEditorCanvas = null;
  var customEditorCtx = null;
  var customEditorDragging = false;

  function drawCustomEditor() {
    var c = customEditorCanvas;
    var cx = customEditorCtx;
    if (!c || !cx) return;

    var dpr = window.devicePixelRatio || 1;
    var rect = c.getBoundingClientRect();
    var w = rect.width;
    var h = rect.height;
    c.width = w * dpr;
    c.height = h * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cx.clearRect(0, 0, w, h);

    var pad = 6;
    var barGap = 3;
    var plotW = w - 2 * pad;
    var plotH = h - 2 * pad;
    var barW = (plotW - (CUSTOM_NBINS - 1) * barGap) / CUSTOM_NBINS;

    for (var i = 0; i < CUSTOM_NBINS; i++) {
      var x = pad + i * (barW + barGap);
      var barH = customHeights[i] * plotH;
      var y = pad + plotH - barH;

      cx.fillStyle = 'rgba(100, 181, 246, 0.45)';
      cx.fillRect(x, y, barW, barH);
      cx.strokeStyle = 'rgba(100, 181, 246, 0.8)';
      cx.lineWidth = 1;
      cx.strokeRect(x, y, barW, barH);
    }

    // Baseline
    cx.beginPath();
    cx.moveTo(pad, pad + plotH);
    cx.lineTo(pad + plotW, pad + plotH);
    cx.strokeStyle = 'rgba(224, 226, 235, 0.3)';
    cx.lineWidth = 1;
    cx.stroke();
  }

  function customEditorSetFromPointer(e) {
    var c = customEditorCanvas;
    var rect = c.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;

    var pad = 6;
    var barGap = 3;
    var plotW = rect.width - 2 * pad;
    var plotH = rect.height - 2 * pad;
    var barW = (plotW - (CUSTOM_NBINS - 1) * barGap) / CUSTOM_NBINS;

    // Which bin?
    var localX = x - pad;
    var idx = -1;
    for (var i = 0; i < CUSTOM_NBINS; i++) {
      var bx = i * (barW + barGap);
      if (localX >= bx && localX <= bx + barW) { idx = i; break; }
    }
    if (idx < 0) return;

    // Height from y position
    var localY = y - pad;
    var frac = 1 - localY / plotH;
    // Snap to zero if clicking near or below baseline
    if (frac < 0.05) frac = 0;
    frac = Math.max(0, Math.min(1, frac));

    customHeights[idx] = frac;
    drawCustomEditor();
    resetSampling();
    draw();
  }

  function initCustomEditor() {
    customEditorCanvas = document.getElementById('customEditor');
    if (!customEditorCanvas) return;
    customEditorCtx = customEditorCanvas.getContext('2d');

    customEditorCanvas.addEventListener('pointerdown', function (e) {
      customEditorDragging = true;
      customEditorCanvas.setPointerCapture(e.pointerId);
      customEditorSetFromPointer(e);
    });
    customEditorCanvas.addEventListener('pointermove', function (e) {
      if (!customEditorDragging) return;
      customEditorSetFromPointer(e);
    });
    customEditorCanvas.addEventListener('pointerup', function () {
      customEditorDragging = false;
    });
    customEditorCanvas.addEventListener('pointercancel', function () {
      customEditorDragging = false;
    });

    drawCustomEditor();
  }

  function showCustomEditor(show) {
    var wrap = document.getElementById('customEditorWrap');
    if (wrap) {
      wrap.style.display = show ? 'block' : 'none';
      if (show) drawCustomEditor();
    }
  }


  /* ======================================================================
   * APPLICATION STATE
   * ====================================================================== */

  var state = {
    popIndex: 0,
    sampleSize: 5,
    showPopulation: true,
    showSampleLine: true,
    showSamplingDist: true,
    showNormal: false,
    showLabels: false,
    rescale: false,

    // Sampling data
    sampleMeans: [],         // accumulated sample means
    currentSample: [],       // latest sample values
    currentMean: null,       // latest sample mean
    totalSamples: 0,
    lastAction: null,        // last sampling action: 'animate', 1, 5, 100, 10000

    // Animation state
    animating: false,
    animPhase: 0,            // 0=dots, 1=mean, 2=drop
    animDotIndex: 0,
    animT: 0,
    animStartTime: 0,

    // Layout (computed in resize)
    canvasW: 0,
    canvasH: 0,

    // Rescale animation
    rescaleT: 0,             // 0 = population scale, 1 = natural scale
    rescaleTarget: 0,
    rescaleAnimating: false,

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
   * Heights adapt based on which are visible.
   * ====================================================================== */

  // Weights for each panel when visible
  var WEIGHT_POP = 2;
  var WEIGHT_SAMPLE = 1;
  var WEIGHT_HIST = 3;
  var VPAD = 16;             // vertical padding between panels
  var HPAD_FRAC = 0.06;     // horizontal padding as fraction of canvas width

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
    var bottomPad = 20;
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

  // Interpolate between two layout states for smooth transitions
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
        // Panel appearing: fade in by growing from zero height at target position
        result[k] = {
          x: b[k].x, y: b[k].y,
          w: b[k].w, h: b[k].h * t
        };
      } else if (a[k]) {
        // Panel disappearing: shrink to zero
        result[k] = {
          x: a[k].x, y: a[k].y,
          w: a[k].w, h: a[k].h * (1 - t)
        };
      } else {
        result[k] = null;
      }
    }
    return result;
  }


  /* ======================================================================
   * HORIZONTAL SCALE
   *
   * Two scales: population scale and "natural" (±3σ) scale.
   * Smoothly interpolate via state.rescaleT.
   * ====================================================================== */

  function getPopulationXRange() {
    return populations[state.popIndex].xRange;
  }

  function getNaturalXRange() {
    var pop = populations[state.popIndex];
    if (pop.variance != null && pop.variance > 0 && state.sampleSize > 0) {
      var sigma = Math.sqrt(pop.variance / state.sampleSize);
      var halfW = 3 * sigma;
      // Ensure at least some minimum width
      if (halfW < 1.e-8) halfW = 1.e-8;
      return [-halfW, halfW];
    }
    // Fallback to population range
    return pop.xRange;
  }

  function getEffectiveXRange() {
    var popRange = getPopulationXRange();
    var natRange = getNaturalXRange();
    var t = state.rescaleT;
    return [
      popRange[0] + (natRange[0] - popRange[0]) * t,
      popRange[1] + (natRange[1] - popRange[1]) * t
    ];
  }

  // Map data x to pixel x within a layout rect
  function xToPixel(x, rect) {
    var range = getEffectiveXRange();
    var frac = (x - range[0]) / (range[1] - range[0]);
    return rect.x + frac * rect.w;
  }


  /* ======================================================================
   * HISTOGRAM BINNING
   * ====================================================================== */

  function computeHistogram(data, xMin, xMax, nBins) {
    var pop = populations[state.popIndex];
    var binW, adjustedXMin, adjustedNBins;

    if (pop.binEdges && pop.binEdges.length >= 2) {
      // Choose bin width that cleanly divides every interval between edges.
      // Find the smallest interval between consecutive edges.
      var edges = pop.binEdges;
      var minInterval = Infinity;
      for (var e = 1; e < edges.length; e++) {
        var gap = edges[e] - edges[e - 1];
        if (gap > 1e-12 && gap < minInterval) minInterval = gap;
      }
      // Target bin width from nBins, then find nearest divisor of minInterval
      var targetW = (xMax - xMin) / nBins;
      // How many sub-bins per smallest interval?
      var subdiv = Math.max(1, Math.round(minInterval / targetW));
      binW = minInterval / subdiv;

      // Align grid to the first edge
      var refEdge = edges[0];
      // Extend left from refEdge to cover xMin
      var nLeft = Math.ceil((refEdge - xMin) / binW);
      adjustedXMin = refEdge - nLeft * binW;
      // Extend right to cover xMax
      adjustedNBins = Math.ceil((xMax - adjustedXMin) / binW) + 1;
    } else {
      // Default: centre a bin on zero
      binW = (xMax - xMin) / nBins;
      var halfBin = binW / 2;
      var nL = Math.ceil((-xMin + halfBin) / binW);
      adjustedXMin = -halfBin - nL * binW;
      adjustedNBins = nBins + 4;
      while (adjustedXMin + adjustedNBins * binW < xMax) adjustedNBins++;
    }

    var bins = new Float64Array(adjustedNBins);
    for (var i = 0; i < data.length; i++) {
      var idx = Math.floor((data[i] - adjustedXMin) / binW);
      if (idx >= 0 && idx < adjustedNBins) bins[idx]++;
    }
    // Normalise to density
    var total = data.length * binW;
    if (total > 0) {
      for (var j = 0; j < adjustedNBins; j++) bins[j] /= total;
    }
    return { bins: bins, binWidth: binW, xMin: adjustedXMin, xMax: adjustedXMin + adjustedNBins * binW, nBins: adjustedNBins };
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
      var elapsed = (performance.now() - state.panelTransitionStart) / 400; // 400ms
      var t = Math.min(1, elapsed);
      t = t * t * (3 - 2 * t); // smoothstep
      layout = lerpLayout(state.panelTransitionFrom, state.panelTransitionTo, t);
      if (t >= 1) state.panelTransitioning = false;
    } else {
      layout = computeLayout();
    }

    if (layout.pop && layout.pop.h > 5) drawPopulation(layout.pop);
    if (layout.sample && layout.sample.h > 5) drawSampleLine(layout.sample);
    if (layout.hist && layout.hist.h > 5) drawHistogram(layout.hist);
  }


  /* ── Population plot ── */

  function drawPopulation(rect) {
    var pop = populations[state.popIndex];
    var range = getEffectiveXRange();
    var xMin = range[0], xMax = range[1];

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    if (pop.discrete && pop.discretePoints) {
      // Draw bars for discrete distribution
      var maxP = 0;
      for (var k = 0; k < pop.discretePoints.length; k++) {
        if (pop.discretePoints[k].p > maxP) maxP = pop.discretePoints[k].p;
      }
      var barHFrac = 0.75;  // bars use 75% of panel height
      for (var i = 0; i < pop.discretePoints.length; i++) {
        var pt = pop.discretePoints[i];
        var px = xToPixel(pt.x, rect);
        var barH = (pt.p / maxP) * rect.h * barHFrac;
        var barW = Math.max(6, rect.w * 0.03);
        ctx.fillStyle = 'rgba(100, 181, 246, 0.5)';
        ctx.fillRect(px - barW / 2, rect.y + rect.h - barH, barW, barH);
        ctx.strokeStyle = '#64b5f6';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(px - barW / 2, rect.y + rect.h - barH, barW, barH);
      }
    } else {
      // Draw continuous density curve
      var nPts = Math.max(200, rect.w);
      var maxPdf = 0;

      // First pass: find max pdf for scaling
      for (var s = 0; s <= nPts; s++) {
        var x = xMin + (xMax - xMin) * s / nPts;
        var y = pop.pdf(x);
        if (y > maxPdf) maxPdf = y;
      }
      if (maxPdf === 0) maxPdf = 1;

      var scaleFrac = 0.85; // use 85% of panel height

      // Filled area
      ctx.beginPath();
      ctx.moveTo(rect.x, rect.y + rect.h);
      for (var s2 = 0; s2 <= nPts; s2++) {
        var x2 = xMin + (xMax - xMin) * s2 / nPts;
        var y2 = pop.pdf(x2);
        var px2 = rect.x + (s2 / nPts) * rect.w;
        var py2 = rect.y + rect.h - (y2 / maxPdf) * rect.h * scaleFrac;
        if (s2 === 0) ctx.lineTo(px2, py2);
        else ctx.lineTo(px2, py2);
      }
      ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
      ctx.closePath();
      ctx.fillStyle = 'rgba(100, 181, 246, 0.25)';
      ctx.fill();

      // Curve outline
      ctx.beginPath();
      for (var s3 = 0; s3 <= nPts; s3++) {
        var x3 = xMin + (xMax - xMin) * s3 / nPts;
        var y3 = pop.pdf(x3);
        var px3 = rect.x + (s3 / nPts) * rect.w;
        var py3 = rect.y + rect.h - (y3 / maxPdf) * rect.h * scaleFrac;
        if (s3 === 0) ctx.moveTo(px3, py3);
        else ctx.lineTo(px3, py3);
      }
      ctx.strokeStyle = '#64b5f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Thin baseline
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y + rect.h);
    ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.strokeStyle = 'rgba(224, 226, 235, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Labels
    if (state.showLabels) {
      var sigmaStr = (pop.variance != null && pop.variance > 0)
        ? Math.sqrt(pop.variance).toFixed(3) : '∞';
      ctx.font = '16px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.fillStyle = 'rgba(224, 226, 235, 0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('μ = 0   σ = ' + sigmaStr, rect.x + 8, rect.y + 6);
    }

    ctx.restore();
  }


  /* ── Sample number line ── */

  function drawSampleLine(rect) {
    var range = getEffectiveXRange();
    var xMin = range[0], xMax = range[1];
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

    // Draw sample dots
    if (state.currentSample.length > 0) {
      var nShow = state.animating && state.animPhase === 0
        ? Math.min(state.animDotIndex + 1, state.currentSample.length)
        : state.currentSample.length;

      for (var i = 0; i < nShow; i++) {
        var val = state.currentSample[i];
        var px = xToPixel(val, rect);
        if (px < rect.x || px > rect.x + rect.w) continue;

        var dotY = midY;
        // During animation, dots drop from top
        if (state.animating && state.animPhase === 0 && i === state.animDotIndex) {
          dotY = rect.y + (midY - rect.y) * state.animT;
        }

        ctx.beginPath();
        ctx.arc(px, dotY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(100, 181, 246, 0.8)';
        ctx.fill();
      }

      // Draw sample mean
      var showMean = false;
      var meanY = midY;
      if (state.animating) {
        if (state.animPhase >= 1) {
          showMean = true;
          if (state.animPhase === 1) {
            // Mean appearing — scale up
            var sz = state.animT;
            meanY = midY;
          }
        }
      } else if (state.currentMean !== null) {
        showMean = true;
      }

      if (showMean && state.currentMean !== null) {
        var mx = xToPixel(state.currentMean, rect);
        if (mx >= rect.x && mx <= rect.x + rect.w) {
          var radius = 7;
          if (state.animating && state.animPhase === 1) {
            radius = 7 * state.animT;
          }
          ctx.beginPath();
          ctx.arc(mx, meanY, radius, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }


  /* ── Sampling distribution histogram ── */

  function drawHistogram(rect) {
    var range = getEffectiveXRange();
    var xMin = range[0], xMax = range[1];
    var pop = populations[state.popIndex];

    var hasData = state.sampleMeans.length > 0;
    var hist = null;
    var maxBin = 0;

    if (hasData) {
      var nBins = chooseBinCount(state.sampleMeans.length);
      hist = computeHistogram(state.sampleMeans, xMin, xMax, nBins);
      for (var i = 0; i < hist.nBins; i++) {
        if (hist.bins[i] > maxBin) maxBin = hist.bins[i];
      }
    }

    // Normal peak for scaling (even when histogram is empty)
    var normalPeak = 0;
    if (state.showNormal && pop.cltApplies && pop.variance != null) {
      var sigma = Math.sqrt(pop.variance / state.sampleSize);
      normalPeak = 1.0 / (sigma * Math.sqrt(2 * Math.PI));
    }

    var scaleMax = Math.max(maxBin, normalPeak);
    if (scaleMax === 0) scaleMax = 1;

    var scaleFrac = 0.85;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    // Draw histogram bars
    if (hist) {
      for (var j = 0; j < hist.nBins; j++) {
        if (hist.bins[j] === 0) continue;
        var binXMin = hist.xMin + j * hist.binWidth;
        var binXMax = binXMin + hist.binWidth;
        var pxL = xToPixel(binXMin, rect);
        var pxR = xToPixel(binXMax, rect);
        var barH = (hist.bins[j] / scaleMax) * rect.h * scaleFrac;

        ctx.fillStyle = 'rgba(100, 181, 246, 0.4)';
        ctx.fillRect(pxL, rect.y + rect.h - barH, pxR - pxL, barH);
        ctx.strokeStyle = 'rgba(100, 181, 246, 0.7)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pxL, rect.y + rect.h - barH, pxR - pxL, barH);
      }
    }

    // Draw dropping mean during animation phase 2
    if (state.animating && state.animPhase === 2 && state.currentMean !== null) {
      var mx = xToPixel(state.currentMean, rect);
      var targetY = rect.y + rect.h;
      var startY = rect.y - 10;
      var dropY = startY + (targetY - startY) * state.animT;
      var radius = 7 * (1 - 0.5 * state.animT);

      ctx.beginPath();
      ctx.arc(mx, dropY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(244, 67, 54, ' + (0.9 - 0.5 * state.animT) + ')';
      ctx.fill();
    }

    // Normal approximation overlay
    if (state.showNormal && pop.cltApplies && pop.variance != null) {
      var sigmaN = Math.sqrt(pop.variance / state.sampleSize);
      var nPts = Math.max(200, rect.w);
      ctx.beginPath();
      for (var s = 0; s <= nPts; s++) {
        var x = xMin + (xMax - xMin) * s / nPts;
        var y = Math.exp(-0.5 * (x * x) / (sigmaN * sigmaN)) /
                (sigmaN * Math.sqrt(2 * Math.PI));
        var px = rect.x + (s / nPts) * rect.w;
        var py = rect.y + rect.h - (y / scaleMax) * rect.h * scaleFrac;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(244, 67, 54, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
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

      var histMuStr = '—';
      var histSigmaStr = '—';
      if (state.sampleMeans.length > 0) {
        var hSum = 0;
        for (var m = 0; m < state.sampleMeans.length; m++) hSum += state.sampleMeans[m];
        var hMean = hSum / state.sampleMeans.length;
        var hVar = 0;
        for (var m2 = 0; m2 < state.sampleMeans.length; m2++) {
          var dev = state.sampleMeans[m2] - hMean;
          hVar += dev * dev;
        }
        hVar /= state.sampleMeans.length;
        histMuStr = hMean.toFixed(4);
        histSigmaStr = Math.sqrt(hVar).toFixed(4);
      }

      // Predicted stdev: sigma/sqrt(n)
      var predictedStr = '';
      if (pop.variance != null && pop.variance > 0) {
        var popSigma = Math.sqrt(pop.variance);
        var predicted = popSigma / Math.sqrt(state.sampleSize);
        predictedStr = '   σ/√' + state.sampleSize + ' = ' + predicted.toFixed(4);
      }

      var line1 = 'n = ' + state.sampleSize + '   Samples: ' + state.totalSamples;
      var line2 = 'x\u0305 = ' + histMuStr + '   s = ' + histSigmaStr + predictedStr;
      ctx.fillText(line1, rect.x + 8, rect.y + 6);
      ctx.fillText(line2, rect.x + 8, rect.y + 24);
    }

    ctx.restore();
  }


  /* ======================================================================
   * SAMPLING
   * ====================================================================== */

  function generateSample() {
    var pop = populations[state.popIndex];
    var n = state.sampleSize;
    var sample = [];
    var sum = 0;
    for (var i = 0; i < n; i++) {
      var val = pop.sample();
      sample.push(val);
      sum += val;
    }
    return { values: sample, mean: sum / n };
  }

  // Flash a button briefly to show it was activated
  function flashButton(btn) {
    btn.classList.add('active');
    setTimeout(function () { btn.classList.remove('active'); }, 200);
  }

  function addSamples(count) {
    for (var i = 0; i < count; i++) {
      var s = generateSample();
      state.sampleMeans.push(s.mean);
      state.currentSample = s.values;
      state.currentMean = s.mean;
    }
    state.totalSamples += count;
    state.lastAction = count;
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
    state.sampleMeans = [];
    state.currentSample = [];
    state.currentMean = null;
    state.totalSamples = 0;
    state.animating = false;
    draw();
  }


  /* ======================================================================
   * ANIMATION
   * ====================================================================== */

  var animFrameId = null;

  function startAnimation() {
    if (state.animating) return;

    var s = generateSample();
    state.currentSample = s.values;
    state.currentMean = s.mean;
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
    var totalDuration = 1200; // ms
    var n = state.currentSample.length;

    // Phase timing:
    //   Phase 0 (dots appearing): 0–60% of duration
    //   Phase 1 (mean appearing): 60%–75%
    //   Phase 2 (mean dropping):  75%–100%
    var elapsed = now - state.animStartTime;
    var progress = elapsed / totalDuration;

    if (progress < 0.6) {
      // Phase 0: dots appearing one by one
      state.animPhase = 0;
      var dotProgress = progress / 0.6;
      state.animDotIndex = Math.min(n - 1, Math.floor(dotProgress * n));
      // Individual dot drop animation
      var dotFrac = (dotProgress * n) - state.animDotIndex;
      state.animT = Math.min(1, dotFrac * 3); // quick drop
    } else if (progress < 0.75) {
      // Phase 1: mean dot appearing
      state.animPhase = 1;
      state.animDotIndex = n - 1;
      state.animT = (progress - 0.6) / 0.15;
    } else if (progress < 1.0) {
      // Phase 2: mean dropping to histogram
      state.animPhase = 2;
      state.animT = (progress - 0.75) / 0.25;
    } else {
      // Done
      state.animating = false;
      state.sampleMeans.push(state.currentMean);
      state.totalSamples++;
      draw();
      return;
    }

    draw();
    animFrameId = requestAnimationFrame(animateFrame);
  }


  /* ======================================================================
   * RESCALE ANIMATION
   * ====================================================================== */

  var RESCALE_DURATION = 600; // ms — total time for rescale animation

  var rescaleAnimStart = 0;
  var rescaleT0 = 0;  // rescaleT at animation start

  function startRescaleAnimation() {
      rescaleAnimStart = performance.now();
      rescaleT0 = state.rescaleT;
      if (!state.rescaleAnimating) {
          state.rescaleAnimating = true;
          animateRescale();
      }
  }

  function animateRescale() {
      var now = performance.now();
      var elapsed = now - rescaleAnimStart;
      var progress = Math.min(1, elapsed / RESCALE_DURATION);

      // Exponential interpolation in log-space:
      // At progress=0 we're at rescaleT0, at progress=1 we're at rescaleTarget.
      // We map rescaleT values to half-widths, interpolate exponentially, then map back.
      //
      // Let w(t) = popHalf * (natHalf/popHalf)^t  where t is rescaleT (0=pop scale, 1=nat scale)
      // Exponential interp of w: w(progress) = w0 * (w1/w0)^progress
      // This is equivalent to linear interp of t in the exponent.
      //
      // So: rescaleT = rescaleT0 + (rescaleTarget - rescaleT0) * progress
      // BUT with an easing that makes the *visual* scale change exponential.
      //
      // Actually, since getEffectiveXRange already linearly interpolates the x-range
      // endpoints using rescaleT, and we want the WIDTH to change exponentially,
      // we need to remap progress through a log curve.

      var popRange = getPopulationXRange();
      var natRange = getNaturalXRange();
      var popW = popRange[1] - popRange[0];
      var natW = natRange[1] - natRange[0];
      if (natW <= 0 || popW <= 0) { state.rescaleT = state.rescaleTarget; draw(); return; }

      // Half-width at start and end of this animation
      var w0 = popW + (natW - popW) * rescaleT0;
      var w1 = popW + (natW - popW) * state.rescaleTarget;
      if (w0 <= 0 || w1 <= 0) { state.rescaleT = state.rescaleTarget; draw(); return; }

      // Exponentially interpolated width at current progress
      var wNow = w0 * Math.pow(w1 / w0, progress);

      // Map back to rescaleT: w = popW + (natW - popW) * t  =>  t = (w - popW) / (natW - popW)
      if (Math.abs(natW - popW) > 1e-12) {
          state.rescaleT = (wNow - popW) / (natW - popW);
      } else {
          state.rescaleT = state.rescaleTarget;
      }

      draw();
      if (progress < 1) {
          requestAnimationFrame(animateRescale);
      } else {
          state.rescaleT = state.rescaleTarget;
          state.rescaleAnimating = false;
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
   * NORMAL + RESCALE BUTTON STATE
   * ====================================================================== */

  function updateCLTButtons() {
    var pop = populations[state.popIndex];
    var btnN = dom.toggleNormal;
    var btnR = dom.toggleRescale;
    if (!pop.cltApplies) {
      btnN.classList.add('disabled-btn');
      btnN.classList.remove('active');
      state.showNormal = false;
      btnR.classList.add('disabled-btn');
      btnR.classList.remove('active');
      state.rescale = false;
      state.rescaleTarget = 0;
      state.rescaleT = 0;
    } else {
      btnN.classList.remove('disabled-btn');
      btnR.classList.remove('disabled-btn');
    }
  }


  /* ======================================================================
   * POPULATE DROPDOWN
   * ====================================================================== */

  function populateSelect() {
    dom.fnSelect.innerHTML = '';
    for (var i = 0; i < populations.length; i++) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = populations[i].name;
      dom.fnSelect.appendChild(opt);
    }
    dom.fnSelect.value = state.popIndex;
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
    dom.fnSelect = document.getElementById('fnSelect');
    dom.toggleNormal = document.getElementById('toggleNormal');
    dom.toggleRescale = document.getElementById('toggleRescale');

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

    // --- Population select ---
    populateSelect();
    dom.fnSelect.addEventListener('change', function () {
      state.popIndex = parseInt(dom.fnSelect.value);
      resetSampling();
      updateCLTButtons();
      showCustomEditor(!!populations[state.popIndex].isCustom);
      draw();
    });

    // --- Sample size radios ---
    document.querySelectorAll('input[name="sampleSize"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        state.sampleSize = parseInt(this.value);
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

    // --- Repeat button (in canvas area) ---
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

    // --- Normal overlay toggle ---
    dom.toggleNormal.addEventListener('click', function () {
      var pop = populations[state.popIndex];
      if (!pop.cltApplies) return;
      state.showNormal = !state.showNormal;
      this.classList.toggle('active', state.showNormal);
      draw();
    });

    // --- Rescale toggle ---
    dom.toggleRescale.addEventListener('click', function () {
      var pop = populations[state.popIndex];
      if (!pop.cltApplies) return;
      state.rescale = !state.rescale;
      this.classList.toggle('active', state.rescale);
      state.rescaleTarget = state.rescale ? 1 : 0;
      startRescaleAnimation();
    });

    // --- Labels toggle ---
    document.getElementById('toggleLabels').addEventListener('click', function () {
      state.showLabels = !state.showLabels;
      this.classList.toggle('active', state.showLabels);
      draw();
    });

    // --- Custom distribution editor ---
    initCustomEditor();

    // --- Initial render ---
    updateCLTButtons();
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
