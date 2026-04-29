/* ==========================================================================
 * estimating-mean.js
 *
 * App-specific logic for the "Estimating the Mean" interactive teaching app.
 * Visualises the sampling distribution of the sample mean X̄ when sampling
 * from a standard normal population. Shows how a single sample can be used
 * to construct a t-based confidence interval for the population mean, and
 * compares it to the exact sampling distribution N(0, 1/n).
 *
 * Adapted from sampling-distribution-variance.js and sampling-distribution.js.
 * The parent population is fixed at N(0, 1). The accumulated statistic is the
 * sample mean X̄. The CI uses the t-distribution (n−1 df) since σ² is unknown
 * in practice.
 *
 * Depends on:
 *   – teaching-app.js  (the TeachingApp engine — must be loaded first)
 *
 * This file is loaded from index.html and exposes a single global
 * initialiser:  EstimatingMean.init()
 * ========================================================================== */

var EstimatingMean = (function () {
  'use strict';

  var TA = TeachingApp;


  /* ======================================================================
   * POPULATION (fixed: standard normal)
   * ====================================================================== */

  var POP_MU    = 0;
  var POP_SIGMA = 1;
  var POP_X_RANGE = [-4, 4];

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

  // Standard normal CDF via rational approximation (Abramowitz & Stegun 26.2.17)
  function normalCdf(x) {
    var t = 1 / (1 + 0.2316419 * Math.abs(x));
    var poly = t * (0.319381530 +
                t * (-0.356563782 +
                t * (1.781477937 +
                t * (-1.821255978 +
                t * 1.330274429))));
    var p = 1 - normalPdf(x, 0, 1) * poly;
    return x >= 0 ? p : 1 - p;
  }

  // Standard normal quantile via rational approximation (Peter Acklam's method)
  function normalQuantile(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    // Coefficients in rational approximation
    var a = [-3.969683028665376e+01,  2.209460984245205e+02,
             -2.759285104469687e+02,  1.383577518672690e+02,
             -3.066479806614716e+01,  2.506628277459239e+00];
    var b = [-5.447609879822406e+01,  1.615858368580409e+02,
             -1.556989798598866e+02,  6.680131188771972e+01,
             -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01,
             -2.400758277161838e+00, -2.549732539343734e+00,
              4.374664141464968e+00,  2.938163982698783e+00];
    var d = [ 7.784695709041462e-03,  3.224671290700398e-01,
              2.445134137142996e+00,  3.754408661907416e+00];
    var pLow = 0.02425, pHigh = 1 - pLow;
    var q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
             ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
             (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
  }


  /* ======================================================================
   * T-DISTRIBUTION MATHEMATICS
   *
   * t(df) pdf, CDF and quantile.
   * CDF uses the regularised incomplete beta function I_x(a, b).
   * Quantile is obtained by bisection on the CDF.
   * ====================================================================== */

  // Lanczos approximation for ln Γ(z), z > 0
  function logGamma(z) {
    var g = 7;
    var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
             771.32342877765313, -176.61502916214059, 12.507343278686905,
             -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) {
      return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
    }
    z -= 1;
    var x = c[0];
    for (var i = 1; i < g + 2; i++) x += c[i] / (z + i);
    var t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }

  // Regularised incomplete beta function I_x(a, b) using continued fraction
  // (Numerical Recipes algorithm, via Lentz's method)
  function betaInc(x, a, b) {
    if (x < 0 || x > 1) return 0;
    if (x === 0) return 0;
    if (x === 1) return 1;

    var logBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
    var front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - logBeta) / a;

    // Use symmetry relation to ensure convergence of the CF
    if (x > (a + 1) / (a + b + 2)) {
      return 1 - betaInc(1 - x, b, a);
    }

    // Lentz's continued fraction
    var TINY = 1e-300;
    var EPS = 1e-14;
    var ITMAX = 200;

    var qab = a + b;
    var qap = a + 1;
    var qam = a - 1;
    var c2 = 1;
    var d = 1 - qab * x / qap;
    if (Math.abs(d) < TINY) d = TINY;
    d = 1 / d;
    var h = d;

    for (var m = 1; m <= ITMAX; m++) {
      var m2 = 2 * m;
      // Even step
      var aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < TINY) d = TINY;
      c2 = 1 + aa / c2;
      if (Math.abs(c2) < TINY) c2 = TINY;
      d = 1 / d;
      h *= d * c2;
      // Odd step
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < TINY) d = TINY;
      c2 = 1 + aa / c2;
      if (Math.abs(c2) < TINY) c2 = TINY;
      d = 1 / d;
      var del = d * c2;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }

    return front * h;
  }

  // t(df) CDF: P(T <= t)
  function tCdf(t, df) {
    // Use the relation: CDF(t,df) = I_{x}(df/2, 1/2) * 0.5  where x = df/(df+t²)
    // For t < 0: CDF = 0.5 * I_x(df/2, 1/2)
    // For t > 0: CDF = 1 - 0.5 * I_x(df/2, 1/2)
    var x = df / (df + t * t);
    var p = 0.5 * betaInc(x, df / 2, 0.5);
    return t < 0 ? p : 1 - p;
  }

  // t(df) quantile: find t such that CDF(t; df) = p, via bisection
  function tQuantile(p, df) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    // Initial bounds — use normal quantile as a starting guess
    var zGuess = normalQuantile(p);
    var lo, hi;
    if (p > 0.5) {
      lo = 0;
      hi = Math.max(zGuess * 3, 10);
      // Expand hi until CDF exceeds p
      while (tCdf(hi, df) < p) hi *= 2;
    } else {
      hi = 0;
      lo = Math.min(zGuess * 3, -10);
      while (tCdf(lo, df) > p) lo *= 2;
    }

    for (var i = 0; i < 80; i++) {
      var mid = 0.5 * (lo + hi);
      if (mid === lo || mid === hi) break;
      if (tCdf(mid, df) < p) lo = mid; else hi = mid;
      if ((hi - lo) < 1e-10 * Math.max(1, Math.abs(mid))) break;
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
    showNormal: false,         // exact N(0, 1/n) sampling distribution overlay
    showLabels: false,
    rescale: false,
    showBinSlider: false,
    binSizeFactor: 1,
    showCI: false,             // t-based CI for μ from the current sample
    showWindow: false,         // central (1−α) interval of N(0, 1/n)
    showHistWindow: false,     // empirical (1−α) interval from accumulated means
    logY: false,
    logYT: 0,
    logYXExpandT: 0,
    logYAnimating: false,
    logYPhase: 0,
    ciLevel: '95',             // '50', '90', '95', '99'

    // Sampling data
    sampleMeans: [],
    currentSample: [],
    currentMean: null,
    currentSD: null,           // sample standard deviation S from the current sample
    totalSamples: 0,
    lastAction: null,
    empiricalHalfW: null,
    cachedSortedMeans: null,
    cachedHistMean: null,

    // Animation state
    animating: false,
    animPhase: 0,              // 0=dots, 1=mean appearing, 2=mean dropping
    animDotIndex: 0,
    animT: 0,
    animStartTime: 0,
    lastWasAnimate: false,

    // Layout
    canvasW: 0,
    canvasH: 0,

    // Rescale animation
    rescaleT: 0,
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
   * ====================================================================== */

  var WEIGHT_POP    = 2;
  var WEIGHT_SAMPLE = 1;
  var WEIGHT_HIST   = 3;
  var VPAD      = 16;
  var HPAD_FRAC = 0.06;

  function computeLayout() {
    var w = state.canvasW;
    var h = state.canvasH;

    var panels = [];
    if (state.showPopulation)   panels.push({ id: 'pop',    weight: WEIGHT_POP });
    if (state.showSampleLine)   panels.push({ id: 'sample', weight: WEIGHT_SAMPLE });
    if (state.showSamplingDist) panels.push({ id: 'hist',   weight: WEIGHT_HIST });

    if (panels.length === 0) return { pop: null, sample: null, hist: null };

    var totalPad  = VPAD * (panels.length - 1);
    var topPad    = 20;
    var extraBottom = (state.showWindow ? 16 : 0) + (state.showHistWindow ? 16 : 0);
    var bottomPad = 20 + extraBottom;
    var availH    = h - topPad - bottomPad - totalPad;
    var totalWeight = 0;
    for (var i = 0; i < panels.length; i++) totalWeight += panels[i].weight;

    var hPad    = Math.floor(w * HPAD_FRAC);
    var plotLeft  = hPad;
    var plotRight = w - hPad;
    var plotW   = plotRight - plotLeft;

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
   * HORIZONTAL SCALE
   *
   * Population x-range is always [-4, 4].
   * Histogram x-range interpolates from [-4, 4] (rescaleT=0) to the natural
   * ±3.1·σ/√n range (rescaleT=1), matching the sampling-distribution app.
   * ====================================================================== */

  function getNaturalXRange() {
    // Exact sampling distribution is N(0, 1/n), so σ_X̄ = 1/√n
    var sigma = 1 / Math.sqrt(state.sampleSize);
    var halfW = 3.1 * sigma;
    return [-halfW, halfW];
  }

  function getEffectiveXRange() {
    var popRange = POP_X_RANGE;
    var natRange = getNaturalXRange();
    var t = state.rescaleT;
    var range = [
      popRange[0] + (natRange[0] - popRange[0]) * t,
      popRange[1] + (natRange[1] - popRange[1]) * t
    ];
    // Apply logY x-expansion (doubles the interval, symmetrically)
    if (state.logYXExpandT > 0) {
      var e = state.logYXExpandT;
      range[0] *= (1 + e);
      range[1] *= (1 + e);
    }
    return range;
  }

  function xToPixel(x, rect) {
    var range = getEffectiveXRange();
    var frac = (x - range[0]) / (range[1] - range[0]);
    return rect.x + frac * rect.w;
  }


  /* ======================================================================
   * HISTOGRAM BINNING
   * ====================================================================== */

  function computeHistogram(data, xMin, xMax, nBins) {
    // Bins centred on zero so symmetric histograms look symmetric
    var binW = (xMax - xMin) / nBins;
    var halfBin = binW / 2;
    var nL = Math.ceil((-xMin + halfBin) / binW);
    var adjustedXMin = -halfBin - nL * binW;
    var adjustedNBins = nBins + 4;
    while (adjustedXMin + adjustedNBins * binW < xMax) adjustedNBins++;

    var bins = new Float64Array(adjustedNBins);
    for (var i = 0; i < data.length; i++) {
      var idx = Math.floor((data[i] - adjustedXMin) / binW);
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
    if (nSamples < 20)   return 15;
    if (nSamples < 50)   return 20;
    if (nSamples < 200)  return 30;
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

    if (layout.pop    && layout.pop.h    > 5) drawPopulation(layout.pop);
    if (layout.sample && layout.sample.h > 5) {
      drawSampleLine(layout.sample);
      var sampleMidY = layout.sample.y + layout.sample.h * 0.5;
      // Window and Hist Window always draw on the sample line when enabled
      if (state.showWindow || state.showHistWindow) {
        var savedCI = state.showCI; state.showCI = false;
        drawCIOnRect(layout.sample, sampleMidY, 10);
        state.showCI = savedCI;
      }
      // CI on sample line: hide during animation until mean appears (phase >= 1)
      if (state.showCI && !(state.animating && state.animPhase < 1)) {
        var savedW = state.showWindow; var savedHW = state.showHistWindow;
        state.showWindow = false; state.showHistWindow = false;
        drawCIOnRect(layout.sample, sampleMidY, 10);
        state.showWindow = savedW; state.showHistWindow = savedHW;
      }
    }
    if (layout.hist && layout.hist.h > 5) {
      drawHistogram(layout.hist);
      var histBaseY = layout.hist.y + layout.hist.h;
      // Window and Hist Window always draw on histogram baseline when enabled
      if (state.showWindow || state.showHistWindow) {
        var savedCI2 = state.showCI; state.showCI = false;
        drawCIOnRect(layout.hist, histBaseY, 10);
        state.showCI = savedCI2;
      }
      // CI on histogram: hide entirely during animation
      if (state.showCI && !state.animating) {
        var savedW2 = state.showWindow; var savedHW2 = state.showHistWindow;
        state.showWindow = false; state.showHistWindow = false;
        drawCIOnRect(layout.hist, histBaseY, 10);
        state.showWindow = savedW2; state.showHistWindow = savedHW2;
        // Red dot at current sample mean on histogram baseline
        if (state.currentMean !== null) {
          var dotX = xToPixel(state.currentMean, layout.hist);
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


  /* ── Population plot — fixed N(0,1) ── */

  function drawPopulation(rect) {
    var range = getEffectiveXRange();
    var xMin = range[0], xMax = range[1];

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    var nPts = Math.max(200, rect.w);
    var maxPdf = normalPdf(POP_MU, POP_MU, POP_SIGMA);
    var minPdf = Math.min(normalPdf(xMin, POP_MU, POP_SIGMA),
                          normalPdf(xMax, POP_MU, POP_SIGMA));
    if (minPdf <= 0) minPdf = 1e-6;

    var scaleFrac = 0.85;

    var logFloor, logCeil, logRange;
    if (state.logYT > 0) {
      logFloor = Math.log10(minPdf * 0.1);
      logCeil  = Math.log10(maxPdf);
      logRange = logCeil - logFloor;
      if (logRange < 1e-12) logRange = 1;
    }
    function pdfToFrac(v) {
      var linFrac = v / maxPdf;
      if (state.logYT <= 0) return linFrac;
      var logFrac = (v <= 0) ? 0 : Math.max(0, (Math.log10(v) - logFloor) / logRange);
      return linFrac + (logFrac - linFrac) * state.logYT;
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

    if (state.showLabels) {
      ctx.font = '16px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.fillStyle = 'rgba(224, 226, 235, 0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('μ = 0   σ = 1', rect.x + 8, rect.y + 6);
    }

    ctx.restore();
  }


  /* ── Sample number line ── */

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
      var nShow = (state.animating && state.animPhase === 0)
        ? Math.min(state.animDotIndex + 1, state.currentSample.length)
        : state.currentSample.length;

      // Sample dots
      for (var i = 0; i < nShow; i++) {
        var val = state.currentSample[i];
        var px = xToPixel(val, rect);
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

      // Sample mean dot (phase 1 and beyond, or when not animating)
      var showMean = false;
      if (state.animating) {
        if (state.animPhase >= 1) showMean = true;
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
          ctx.arc(mx, midY, radius, 0, 2 * Math.PI);
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

    var hasData = state.sampleMeans.length > 0;
    var hist = null;
    var maxBin = 0;

    if (hasData) {
      var nBins = Math.max(5, Math.round(chooseBinCount(state.sampleMeans.length) / state.binSizeFactor));
      hist = computeHistogram(state.sampleMeans, xMin, xMax, nBins);
      for (var i = 0; i < hist.nBins; i++) {
        if (hist.bins[i] > maxBin) maxBin = hist.bins[i];
      }
    }

    // Normal overlay peak (N(0, 1/n)) — used for y-scaling even before samples
    var normalPeak = 0;
    if (state.showNormal) {
      var sigmaN = 1 / Math.sqrt(state.sampleSize);
      normalPeak = 1.0 / (sigmaN * Math.sqrt(2 * Math.PI));
    }

    var scaleMax = Math.max(maxBin, normalPeak);
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
      hLogCeil  = Math.log10(scaleMax);
      hLogRange = hLogCeil - hLogFloor;
      if (hLogRange < 1e-12) hLogRange = 1;
    }
    function histToFrac(v) {
      var linFrac = v / scaleMax;
      if (state.logYT <= 0) return linFrac;
      var logFrac = (v <= 0) ? 0 : Math.max(0, (Math.log10(v) - hLogFloor) / hLogRange);
      return linFrac + (logFrac - linFrac) * state.logYT;
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
        var pxL = xToPixel(binXMin, rect);
        var pxR = xToPixel(binXMax, rect);
        var barH = histToFrac(hist.bins[j]) * rect.h * scaleFrac;

        ctx.fillStyle = 'rgba(100, 181, 246, 0.4)';
        ctx.fillRect(pxL, rect.y + rect.h - barH, pxR - pxL, barH);
        ctx.strokeStyle = 'rgba(100, 181, 246, 0.7)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pxL, rect.y + rect.h - barH, pxR - pxL, barH);
      }
    }

    // Dropping mean during animation phase 2
    if (state.animating && state.animPhase === 2 && state.currentMean !== null) {
      var mx = xToPixel(state.currentMean, rect);
      var targetY = rect.y + rect.h;
      var startY  = rect.y - 10;
      var dropY   = startY + (targetY - startY) * state.animT;

      ctx.beginPath();
      ctx.arc(mx, dropY, 7, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
      ctx.fill();
    }

    // Normal overlay: exact sampling distribution N(0, 1/n)
    if (state.showNormal) {
      var sigmaO = 1 / Math.sqrt(state.sampleSize);
      var nPts = Math.max(200, rect.w);
      var drawing = false;
      ctx.beginPath();
      for (var s = 0; s <= nPts; s++) {
        var x = xMin + (xMax - xMin) * s / nPts;
        var y = normalPdf(x, 0, sigmaO);
        var frac = histToFrac(y);
        if (state.logYT > 0 && frac <= 0) { drawing = false; continue; }
        var px = rect.x + (s / nPts) * rect.w;
        var py = rect.y + rect.h - frac * rect.h * scaleFrac;
        if (!drawing) { ctx.moveTo(px, py); drawing = true; }
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = 'rgba(244, 67, 54, 0.85)';
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

    // Labels
    if (state.showLabels) {
      ctx.font = '16px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.fillStyle = 'rgba(224, 226, 235, 0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      var histMuStr = '—', histSigmaStr = '—';
      if (state.sampleMeans.length > 0) {
        var hSum = 0;
        for (var m = 0; m < state.sampleMeans.length; m++) hSum += state.sampleMeans[m];
        var hMean = hSum / state.sampleMeans.length;
        var hVar  = 0;
        for (var m2 = 0; m2 < state.sampleMeans.length; m2++) {
          var dev = state.sampleMeans[m2] - hMean;
          hVar += dev * dev;
        }
        hVar /= state.sampleMeans.length;
        histMuStr    = hMean.toFixed(4);
        histSigmaStr = Math.sqrt(hVar).toFixed(4);
      }

      var predictedStr = '';
      var predicted = 1 / Math.sqrt(state.sampleSize);
      predictedStr = '   σ/√' + state.sampleSize + ' = ' + predicted.toFixed(4);

      var line1 = 'n = ' + state.sampleSize + '   Samples: ' + state.totalSamples;
      var line2 = 'x\u0305 = ' + histMuStr + '   s = ' + histSigmaStr + predictedStr;
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
   * ====================================================================== */

  function getCITailFraction() {
    switch (state.ciLevel) {
      case '50': return 0.25;
      case '90': return 0.05;
      case '99': return 0.005;
      default:   return 0.025;  // 95%
    }
  }

  // t-based CI for μ: X̄ ± t_{α/2, n−1} · S/√n
  function getTCIHalfWidth() {
    if (state.currentMean === null || state.currentSD === null) return null;
    var df = state.sampleSize - 1;
    if (df <= 0) return null;
    var tail = getCITailFraction();
    var tVal = tQuantile(1 - tail, df);
    return tVal * state.currentSD / Math.sqrt(state.sampleSize);
  }

  // Normal window half-width: z_{α/2} / √n  (uses known σ=1)
  function getNormWindowHalfWidth() {
    var tail = getCITailFraction();
    var z = normalQuantile(1 - tail);
    return z / Math.sqrt(state.sampleSize);
  }

  // Empirical percentile interval from accumulated means
  function getHistWindowRange() {
    if (state.cachedSortedMeans === null || state.cachedSortedMeans.length < 20) return null;
    var tail = getCITailFraction();
    var n = state.cachedSortedMeans.length;
    var iLo = Math.max(0, Math.floor(n * tail));
    var iHi = Math.min(n - 1, Math.floor(n * (1 - tail)));
    return { lo: state.cachedSortedMeans[iLo], hi: state.cachedSortedMeans[iHi] };
  }

  function updateHistWindowCache() {
    if (state.sampleMeans.length < 20) {
      state.cachedSortedMeans = null;
      state.cachedHistMean = null;
      return;
    }
    state.cachedSortedMeans = state.sampleMeans.slice().sort(function (a, b) { return a - b; });
    var sum = 0;
    for (var i = 0; i < state.sampleMeans.length; i++) sum += state.sampleMeans[i];
    state.cachedHistMean = sum / state.sampleMeans.length;
  }

  function drawWhiskeredLine(x1, x2, y, colour, clipRect) {
    var whiskerH = 6;
    var left  = Math.max(x1, clipRect.x);
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

  function drawCIOnRect(rect, baseY, offsetBelow) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h + 40);
    ctx.clip();

    // CI (red) — t-based, centred on sample mean
    if (state.showCI && state.currentMean !== null) {
      var halfW = getTCIHalfWidth();
      if (halfW !== null) {
        var ciLeft  = xToPixel(state.currentMean - halfW, rect);
        var ciRight = xToPixel(state.currentMean + halfW, rect);
        // Draw the bar
        drawWhiskeredLine(ciLeft, ciRight, baseY, 'rgba(244, 67, 54, 0.85)', rect);
        // Red dot at sample mean (on the baseline / number line)
        var mx = xToPixel(state.currentMean, rect);
        if (mx >= rect.x && mx <= rect.x + rect.w) {
          ctx.beginPath();
          ctx.arc(mx, baseY, 4, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(244, 67, 54, 0.9)';
          ctx.fill();
        }
      }
    }

    // Norm window (green) — central (1−α) interval of N(0, 1/n), centred on 0
    var windowOffset = 0;
    if (state.showWindow) {
      var normHalfW = getNormWindowHalfWidth();
      windowOffset = offsetBelow;
      var wLeft  = xToPixel(-normHalfW, rect);
      var wRight = xToPixel( normHalfW, rect);
      var wY = baseY + windowOffset;
      drawWhiskeredLine(wLeft, wRight, wY, 'rgba(76, 175, 80, 0.85)', rect);
      // Green dot at 0 (true population mean)
      var zeroX = xToPixel(0, rect);
      if (zeroX >= rect.x && zeroX <= rect.x + rect.w) {
        ctx.beginPath();
        ctx.arc(zeroX, wY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(76, 175, 80, 0.85)';
        ctx.fill();
      }
    }

    // Hist window (white) — empirical percentiles of accumulated means
    if (state.showHistWindow) {
      var hwin = getHistWindowRange();
      if (hwin !== null) {
        var hwY = baseY + (windowOffset > 0 ? windowOffset + offsetBelow : offsetBelow);
        var hwLeft  = xToPixel(hwin.lo, rect);
        var hwRight = xToPixel(hwin.hi, rect);
        drawWhiskeredLine(hwLeft, hwRight, hwY, '#ffffff', rect);
        if (state.cachedHistMean !== null) {
          var hmX = xToPixel(state.cachedHistMean, rect);
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
    var sd = (n > 1) ? Math.sqrt(ss / (n - 1)) : 0;
    return { values: values, mean: mean, sd: sd };
  }

  function flashButton(btn) {
    btn.classList.add('active');
    setTimeout(function () { btn.classList.remove('active'); }, 200);
  }

  function addSamples(count) {
    for (var i = 0; i < count; i++) {
      var s = generateSample();
      state.sampleMeans.push(s.mean);
      state.currentSample = s.values;
      state.currentMean   = s.mean;
      state.currentSD     = s.sd;
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
    state.sampleMeans = [];
    state.currentSample = [];
    state.currentMean   = null;
    state.currentSD     = null;
    state.totalSamples  = 0;
    state.empiricalHalfW = null;
    state.cachedSortedMeans = null;
    state.cachedHistMean    = null;
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
    state.currentMean   = s.mean;
    state.currentSD     = s.sd;
    state.lastAction    = 'animate';

    state.animating   = true;
    state.animPhase   = 0;
    state.animDotIndex = 0;
    state.animT       = 0;
    state.animStartTime = performance.now();

    animateFrame();
  }

  function animateFrame() {
    var now = performance.now();
    var totalDuration = 1200; // ms
    var n = state.currentSample.length;

    var elapsed  = now - state.animStartTime;
    var progress = elapsed / totalDuration;

    if (progress < 0.6) {
      // Phase 0: dots appearing sequentially
      state.animPhase = 0;
      var dotProgress = progress / 0.6;
      state.animDotIndex = Math.min(n - 1, Math.floor(dotProgress * n));
      var dotFrac = (dotProgress * n) - state.animDotIndex;
      state.animT = Math.min(1, dotFrac * 3);
    } else if (progress < 0.75) {
      // Phase 1: mean dot appearing
      state.animPhase = 1;
      state.animDotIndex = n - 1;
      state.animT = (progress - 0.6) / 0.15;
    } else if (progress < 1.0) {
      // Phase 2: mean dot drops into histogram
      state.animPhase = 2;
      state.animT = (progress - 0.75) / 0.25;
    } else {
      // Done — commit the mean to the histogram
      state.animating = false;
      state.lastWasAnimate = true;
      state.sampleMeans.push(state.currentMean);
      state.totalSamples++;
      updateHistWindowCache();
      draw();
      return;
    }

    draw();
    animFrameId = requestAnimationFrame(animateFrame);
  }


  /* ======================================================================
   * RESCALE (ZOOM X) ANIMATION
   * ====================================================================== */

  var RESCALE_DURATION = 600; // ms
  var rescaleAnimStart = 0;
  var rescaleT0 = 0;

  function startRescaleAnimation() {
    rescaleAnimStart = performance.now();
    rescaleT0 = state.rescaleT;
    if (!state.rescaleAnimating) {
      state.rescaleAnimating = true;
      animateRescale();
    }
  }

  function animateRescale() {
    var now     = performance.now();
    var elapsed = now - rescaleAnimStart;
    var progress = Math.min(1, elapsed / RESCALE_DURATION);

    // Exponential interpolation of the x-range width for smooth zoom feel
    var popRange = POP_X_RANGE;
    var natRange = getNaturalXRange();
    var popW = popRange[1] - popRange[0];
    var natW = natRange[1] - natRange[0];
    if (natW <= 0 || popW <= 0) { state.rescaleT = state.rescaleTarget; draw(); return; }

    var w0 = popW + (natW - popW) * rescaleT0;
    var w1 = popW + (natW - popW) * state.rescaleTarget;
    if (w0 <= 0 || w1 <= 0) { state.rescaleT = state.rescaleTarget; draw(); return; }

    var wNow = w0 * Math.pow(w1 / w0, progress);
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
   * LOG Y ANIMATION
   * ====================================================================== */

  var LOGY_PHASE_DURATION = 400; // ms per phase
  var LOGY_PAUSE = 100;          // ms pause between phases
  var logYAnimStart = 0;
  var logYEntering = true;

  function startLogYAnimation(entering) {
    logYEntering  = entering;
    logYAnimStart = performance.now();
    state.logYPhase = 0;
    if (!state.logYAnimating) {
      state.logYAnimating = true;
      animateLogY();
    }
  }

  function animateLogY() {
    var now     = performance.now();
    var elapsed = now - logYAnimStart;
    var totalDuration = LOGY_PHASE_DURATION * 2 + LOGY_PAUSE;
    var progress = Math.min(1, elapsed / totalDuration);

    var p0End   = LOGY_PHASE_DURATION / totalDuration;
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

    draw();
    if (progress < 1) {
      requestAnimationFrame(animateLogY);
    } else {
      state.logYT        = logYEntering ? 1 : 0;
      state.logYXExpandT = logYEntering ? 1 : 0;
      state.logYAnimating = false;
      draw();
    }
  }


  /* ======================================================================
   * PANEL VISIBILITY TRANSITIONS
   * ====================================================================== */

  function triggerPanelTransition(fromLayout) {
    var toLayout = computeLayout();
    state.panelTransitioning   = true;
    state.panelTransitionStart = performance.now();
    state.panelTransitionFrom  = fromLayout;
    state.panelTransitionTo    = toLayout;
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
    dom.panel      = document.getElementById('panel');
    dom.collapseBtn = document.getElementById('collapseBtn');
    dom.openBtn    = document.getElementById('openBtn');
    dom.canvasArea = document.getElementById('canvasArea');

    canvas = document.getElementById('canvas2d');
    ctx    = canvas.getContext('2d');

    // --- Sidebar ---
    TA.initSidebar({
      panel: dom.panel,
      collapseBtn: dom.collapseBtn,
      openBtn: dom.openBtn,
      onResize: function () { resize(); draw(); }
    });

    // --- Overlays ---
    TA.initOverlay({
      overlay:    document.getElementById('helpOverlay'),
      closeBtn:   document.getElementById('helpClose'),
      triggerBtn: document.getElementById('btnHelp')
    });
    TA.initOverlay({
      overlay:    document.getElementById('overviewOverlay'),
      closeBtn:   document.getElementById('overviewClose'),
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
        resetSampling();
        draw();
      });
    });

    // --- Sampling buttons ---
    document.getElementById('btnAnimate').addEventListener('click', function () {
      flashButton(this); startAnimation();
    });
    document.getElementById('btnSample1').addEventListener('click', function () {
      flashButton(this); addSamples(1);
    });
    document.getElementById('btnSample5').addEventListener('click', function () {
      flashButton(this); addSamples(5);
    });
    document.getElementById('btnSample100').addEventListener('click', function () {
      flashButton(this); addSamples(100);
    });
    document.getElementById('btnSample10000').addEventListener('click', function () {
      flashButton(this); addSamples(10000);
    });

    // --- Repeat ---
    document.getElementById('btnRepeat').addEventListener('click', function () {
      repeatLastAction();
    });

    // --- Reset ---
    document.getElementById('btnReset').addEventListener('click', function () {
      flashButton(this); resetSampling();
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

    // --- Normal overlay ---
    document.getElementById('toggleNormal').addEventListener('click', function () {
      state.showNormal = !state.showNormal;
      this.classList.toggle('active', state.showNormal);
      draw();
    });

    // --- Zoom x (rescale) ---
    document.getElementById('toggleRescale').addEventListener('click', function () {
      state.rescale = !state.rescale;
      this.classList.toggle('active', state.rescale);
      state.rescaleTarget = state.rescale ? 1 : 0;
      startRescaleAnimation();
    });

    // --- Log y ---
    document.getElementById('toggleLogY').addEventListener('click', function () {
      state.logY = !state.logY;
      this.classList.toggle('active', state.logY);
      startLogYAnimation(state.logY);
    });

    // --- Labels ---
    document.getElementById('toggleLabels').addEventListener('click', function () {
      state.showLabels = !state.showLabels;
      this.classList.toggle('active', state.showLabels);
      draw();
    });

    // --- Bin size slider ---
    var binSliderWrap  = document.getElementById('binSliderWrap');
    var binSlider      = document.getElementById('binSlider');
    var binSliderValue = document.getElementById('binSliderValue');
    var binToggleBtn   = document.getElementById('toggleBinSize');

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
      ciLevelRow.style.display =
        (state.showCI || state.showWindow || state.showHistWindow) ? 'grid' : 'none';
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
