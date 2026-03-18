/* ==========================================================================
 * tangent.js
 *
 * App-specific logic for the "Tangents" interactive teaching app.
 * Demonstrates tangent lines (2D) and tangent planes (3D) to level sets
 * of scalar fields, together with the gradient vector.
 *
 * Depends on:
 *   – teaching-app.js  (the TeachingApp engine — must be loaded first)
 *   – Three.js r128     (loaded from CDN, must be loaded first)
 *
 * This file is loaded from index.html and exposes a single global
 * initialiser:  TangentApp.init()
 * ========================================================================== */

var TangentApp = (function () {
  'use strict';

  // Shorthand alias
  var TA = TeachingApp;


  /* ======================================================================
   * PRESET DEFINITIONS
   * ====================================================================== */

  /** 2D preset scalar fields with analytic gradients and domain/range info. */
  var presets2d = [
    { expr: 'x² + y²', label: 'φ(x,y) = x² + y²', fn: function(x,y){return x*x+y*y},
      gx: function(x,y){return 2*x}, gy: function(x,y){return 2*y},
      cMin: 0.01, cMax: 16, cDef: 2, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'x² − y²', label: 'φ(x,y) = x² − y²', fn: function(x,y){return x*x-y*y},
      gx: function(x,y){return 2*x}, gy: function(x,y){return -2*y},
      cMin: -8, cMax: 8, cDef: 1, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'xy', label: 'φ(x,y) = xy', fn: function(x,y){return x*y},
      gx: function(x,y){return y}, gy: function(x,y){return x},
      cMin: -4, cMax: 4, cDef: 1, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'sin(x) + sin(y)', label: 'φ(x,y) = sin(x) + sin(y)',
      fn: function(x,y){return Math.sin(x)+Math.sin(y)},
      gx: function(x,y){return Math.cos(x)}, gy: function(x,y){return Math.cos(y)},
      cMin: -2, cMax: 2, cDef: 0.5, xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    { expr: 'sin(xy)', label: 'φ(x,y) = sin(xy)', fn: function(x,y){return Math.sin(x*y)},
      gx: function(x,y){return y*Math.cos(x*y)}, gy: function(x,y){return x*Math.cos(x*y)},
      cMin: -1, cMax: 1, cDef: 0.5, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'x³ − 3xy²', label: 'φ(x,y) = x³ − 3xy²',
      fn: function(x,y){return x*x*x-3*x*y*y},
      gx: function(x,y){return 3*x*x-3*y*y}, gy: function(x,y){return -6*x*y},
      cMin: -8, cMax: 8, cDef: 2, xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
    { expr: 'eˣ cos(y)', label: 'φ(x,y) = eˣ cos(y)',
      fn: function(x,y){return Math.exp(x)*Math.cos(y)},
      gx: function(x,y){return Math.exp(x)*Math.cos(y)},
      gy: function(x,y){return -Math.exp(x)*Math.sin(y)},
      cMin: -3, cMax: 3, cDef: 1, xMin: -1.5, xMax: 1.5, yMin: -4.8, yMax: 4.8 },
    { expr: 'x² + 4y²', label: 'φ(x,y) = x² + 4y²', fn: function(x,y){return x*x+4*y*y},
      gx: function(x,y){return 2*x}, gy: function(x,y){return 8*y},
      cMin: 0.01, cMax: 16, cDef: 2, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
  ];

  /** 3D preset scalar fields with analytic gradients. */
  var presets3d = [
    { expr: 'x² + y² + z²', label: 'φ(x,y,z) = x² + y² + z²',
      fn: function(x,y,z){return x*x+y*y+z*z},
      gx: function(x,y,z){return 2*x}, gy: function(x,y,z){return 2*y}, gz: function(x,y,z){return 2*z},
      cMin: 0.01, cMax: 9, cDef: 4, xMin: -3, xMax: 3, yMin: -3, yMax: 3, zMin: -3, zMax: 3 },
    { expr: 'x² + y² − z²', label: 'φ(x,y,z) = x² + y² − z²',
      fn: function(x,y,z){return x*x+y*y-z*z},
      gx: function(x,y,z){return 2*x}, gy: function(x,y,z){return 2*y}, gz: function(x,y,z){return -2*z},
      cMin: -4, cMax: 3, cDef: 1, xMin: -4, xMax: 4, yMin: -4, yMax: 4, zMin: -3, zMax: 3 },
    { expr: 'x² + y² − z', label: 'φ(x,y,z) = x² + y² − z',
      fn: function(x,y,z){return x*x+y*y-z},
      gx: function(x,y,z){return 2*x}, gy: function(x,y,z){return 2*y}, gz: function(){return -1},
      cMin: -3.8, cMax: 3.8, cDef: 0, xMin: -3, xMax: 3, yMin: -3, yMax: 3, zMin: -4, zMax: 4 },
    { expr: 'xyz', label: 'φ(x,y,z) = xyz', fn: function(x,y,z){return x*y*z},
      gx: function(x,y,z){return y*z}, gy: function(x,y,z){return x*z}, gz: function(x,y,z){return x*y},
      cMin: -6, cMax: 6, cDef: 1, xMin: -3, xMax: 3, yMin: -3, yMax: 3, zMin: -3, zMax: 3 },
    { expr: 'x² + y²/4 + z²/9', label: 'φ(x,y,z) = x² + y²/4 + z²/9',
      fn: function(x,y,z){return x*x+y*y/4+z*z/9},
      gx: function(x,y,z){return 2*x}, gy: function(x,y,z){return y/2}, gz: function(x,y,z){return 2*z/9},
      cMin: 0.01, cMax: 2, cDef: 1, xMin: -4, xMax: 4, yMin: -4, yMax: 4, zMin: -4, zMax: 4 },
    { expr: 'sin(x) + sin(y) + sin(z)', label: 'φ(x,y,z) = sin(x)+sin(y)+sin(z)',
      fn: function(x,y,z){return Math.sin(x)+Math.sin(y)+Math.sin(z)},
      gx: function(x,y,z){return Math.cos(x)}, gy: function(x,y,z){return Math.cos(y)},
      gz: function(x,y,z){return Math.cos(z)},
      cMin: -2.99, cMax: 2.99, cDef: 0, xMin: -4, xMax: 4, yMin: -4, yMax: 4, zMin: -4, zMax: 4 },
  ];


  /* ======================================================================
   * APPLICATION STATE
   * ====================================================================== */

  var state = {
    dim: 2,
    fnIndex: 0,
    cParam: 100,           // slider raw value (0–600), mapped to real c
    showGradAll: false,
    showGradPt: false,
    showTangent: false,
    showLabels: false,
    showHeatmap: false,
    showContours: false,
    scheme: 'palette1',
    flipSign: false,
    isCustom: false,
    customFn: null,
    customGx: null,
    customGy: null,
    customGz: null,
    customExpr: '',
    customPreset: null,
    tangentPoint: null,    // {x,y} in 2D, {x,y,z} in 3D
    levelPoints: [],       // points on the current level set
  };

  // Field range for the c-slider mapping
  var cMin = -1, cMax = 1;

  // Per-dimension saved state (so switching 2D↔3D preserves settings)
  var savedDimState = { 2: null, 3: null };


  /* ======================================================================
   * DOM REFERENCES  (populated in init())
   * ====================================================================== */

  var dom = {};


  /* ======================================================================
   * THREE.JS STATE  (populated lazily on first 3D use)
   * ====================================================================== */

  var scene, camera, renderer;
  var threeInited = false;
  var isoMesh = null;
  var gradGroup = null;
  var tangentGroup = null;
  var pointGroup = null;
  var orbitControls = null;


  /* ======================================================================
   * PRESET HELPERS
   * ====================================================================== */

  function getPresets() { return state.dim === 2 ? presets2d : presets3d; }

  /**
   * Return the currently active preset, applying the −φ flip if active.
   */
  function getPreset() {
    var p;
    if (state.isCustom && state.customPreset) {
      p = state.customPreset;
    } else {
      p = getPresets()[state.fnIndex];
    }
    if (!state.flipSign) return p;

    // Build a flipped copy
    var baseExpr = state.isCustom ? state.customExpr : p.expr;
    if (state.dim === 2) {
      return Object.assign({}, p, {
        label: 'φ(x,y) = −(' + baseExpr + ')',
        fn: function(x,y){return -p.fn(x,y)},
        gx: function(x,y){return -p.gx(x,y)},
        gy: function(x,y){return -p.gy(x,y)},
      });
    } else {
      return Object.assign({}, p, {
        label: 'φ(x,y,z) = −(' + baseExpr + ')',
        fn: function(x,y,z){return -p.fn(x,y,z)},
        gx: function(x,y,z){return -p.gx(x,y,z)},
        gy: function(x,y,z){return -p.gy(x,y,z)},
        gz: function(x,y,z){return -p.gz(x,y,z)},
      });
    }
  }


  /* ======================================================================
   * C-SLIDER MAPPING
   * ====================================================================== */

  /** Map a raw slider value (0–600) to the real c value. */
  function mapC(raw) { return cMin + (raw / 600) * (cMax - cMin); }

  /** Inverse: given a real c, return the closest raw slider value. */
  function cSliderFromValue(c) {
    return Math.round((c - cMin) / (cMax - cMin) * 600);
  }

  /**
   * Recompute the field range (cMin/cMax) for a custom function,
   * by sampling on a coarse grid.
   */
  function computeCustomFieldRange() {
    var p = getPreset();
    var fmin = Infinity, fmax = -Infinity;
    if (state.dim === 2) {
      var n = 30;
      for (var j = 0; j < n; j++)
        for (var i = 0; i < n; i++) {
          var x = p.xMin + (p.xMax - p.xMin) * i / (n - 1);
          var y = p.yMin + (p.yMax - p.yMin) * j / (n - 1);
          var v = p.fn(x, y);
          if (isFinite(v)) { if (v < fmin) fmin = v; if (v > fmax) fmax = v; }
        }
    } else {
      var n3 = 15;
      for (var iz = 0; iz < n3; iz++)
        for (var iy = 0; iy < n3; iy++)
          for (var ix = 0; ix < n3; ix++) {
            var xx = p.xMin + (p.xMax - p.xMin) * ix / (n3 - 1);
            var yy = p.yMin + (p.yMax - p.yMin) * iy / (n3 - 1);
            var zz = p.zMin + (p.zMax - p.zMin) * iz / (n3 - 1);
            var vv = p.fn(xx, yy, zz);
            if (isFinite(vv)) { if (vv < fmin) fmin = vv; if (vv > fmax) fmax = vv; }
          }
    }
    if (!isFinite(fmin)) { fmin = -1; fmax = 1; }
    if (fmax - fmin < 1e-10) { fmin -= 1; fmax += 1; }
    cMin = fmin;
    cMax = fmax;
  }


  /* ======================================================================
   * DIM-STATE SAVE / RESTORE
   * ====================================================================== */

  function saveDimState() {
    savedDimState[state.dim] = {
      fnIndex: state.fnIndex,
      cParam: state.cParam,
      tangentPoint: state.tangentPoint,
      levelPoints: state.levelPoints,
      isCustom: state.isCustom,
      customPreset: state.customPreset,
      customExpr: state.customExpr,
      flipSign: state.flipSign,
      cachedcMin: cMin,
      cachedcMax: cMax,
      customInputValue: dom.customInput.value,
    };
  }

  function restoreDimState(d) {
    var s = savedDimState[d];
    if (!s) return false;
    state.fnIndex = s.fnIndex;
    state.cParam = s.cParam;
    state.tangentPoint = s.tangentPoint;
    state.levelPoints = s.levelPoints;
    state.isCustom = s.isCustom;
    state.customPreset = s.customPreset;
    state.customExpr = s.customExpr;
    state.flipSign = s.flipSign;
    cMin = s.cachedcMin;
    cMax = s.cachedcMax;
    dom.customInput.value = s.customInputValue || '';
    dom.toggleFlip.classList.toggle('active', state.flipSign);
    dom.fnSelect.value = state.isCustom ? '' : state.fnIndex;
    dom.cSlider.value = state.cParam;
    dom.cValue.textContent = mapC(state.cParam).toFixed(2);
    dom.currentFnLabel.textContent = getPreset().label;
    return true;
  }


  /* ======================================================================
   * POPULATE PRESET DROPDOWN
   * ====================================================================== */

  function populateSelect() {
    dom.fnSelect.innerHTML = '';
    getPresets().forEach(function (p, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.expr;
      dom.fnSelect.appendChild(opt);
    });
    dom.fnSelect.value = state.fnIndex;
  }


  /* ======================================================================
   * RESET FOR A NEW PRESET
   * ====================================================================== */

  function resetForPreset() {
    var p = getPreset();
    state.tangentPoint = null;
    state.levelPoints = [];
    dom.currentFnLabel.textContent = p.label;

    if (state.isCustom && state.customPreset) {
      computeCustomFieldRange();
      var midC = (cMin + cMax) / 2;
      var rawC = cSliderFromValue(midC);
      dom.cValue.textContent = midC.toFixed(2);
      dom.cSlider.value = rawC;
      state.cParam = rawC;
    } else {
      if (state.flipSign) {
        cMin = -p.cMax;
        cMax = -p.cMin;
        var raw2 = cSliderFromValue(-p.cDef);
        dom.cValue.textContent = (-p.cDef).toFixed(2);
        dom.cSlider.value = raw2;
        state.cParam = raw2;
      } else {
        cMin = p.cMin;
        cMax = p.cMax;
        var raw3 = cSliderFromValue(p.cDef);
        dom.cValue.textContent = p.cDef.toFixed(2);
        dom.cSlider.value = raw3;
        state.cParam = raw3;
      }
    }
  }


  /* ======================================================================
   * 2D RENDERING
   * ====================================================================== */

  /** Main 2D draw routine. */
  function draw2D() {
    var rect = dom.canvasArea.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    var ctx = dom.ctx;
    ctx.clearRect(0, 0, w, h);

    var p = getPreset();
    var XMIN = p.xMin, XMAX = p.xMax, YMIN = p.yMin, YMAX = p.yMax;

    // Square plot area (65% of shorter dimension), centred
    var size = Math.min(w, h) * 0.65;
    var ox = (w - size) / 2;
    var oy = (h - size) / 2;
    var T = TA.makeCoordTransforms(ox, oy, size, XMIN, XMAX, YMIN, YMAX);

    // Store transforms for the click handler
    dom._transforms = T;
    dom._plotOx = ox;
    dom._plotOy = oy;
    dom._plotSize = size;

    var c = mapC(state.cParam);

    // --- Heatmap / contour background ---
    var field = null;
    if (state.showHeatmap || state.showContours) {
      var hmRes = state.showHeatmap ? Math.min(300, Math.round(size)) : 200;
      field = TA.computeField(p.fn, hmRes, XMIN, XMAX, YMIN, YMAX);
    }

    if (state.showHeatmap && field) {
      TA.drawHeatmap(ctx, field, state.scheme, ox, oy, size);
    } else if (!state.showContours) {
      ctx.fillStyle = '#12141c';
      ctx.fillRect(ox, oy, size, size);
    }

    if (state.showContours && field) {
      if (!state.showHeatmap) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(ox, oy, size, size);
      }
      TA.drawContours(ctx, field, 15, state.scheme, state.showHeatmap, ox, oy, size);
    }

    // Colour bar visibility
    if (!state.showHeatmap && !state.showContours) {
      dom.colourbarWrap.style.display = 'none';
    } else {
      TA.drawColourbar(dom.cbCanvas, state.scheme);
      dom.colourbarWrap.style.display = 'flex';
    }

    // Plot border
    ctx.strokeStyle = '#3a3d4d';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, size, size);

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = '500 24px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('x', ox + size / 2, oy + size + 20);
    ctx.fillText('y', ox - 30, oy + size / 2 - 10);

    // --- Level curve (the selected φ = c) ---
    var curveData = TA.marchingSquares(p.fn, c, 300, XMIN, XMAX, YMIN, YMAX);
    state.levelPoints = curveData.points;

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (var si = 0; si < curveData.segments.length; si++) {
      var seg = curveData.segments[si];
      ctx.moveTo(T.toPixelX(seg[0].x), T.toPixelY(seg[0].y));
      ctx.lineTo(T.toPixelX(seg[1].x), T.toPixelY(seg[1].y));
    }
    ctx.stroke();

    if (state.levelPoints.length === 0) return;

    // --- Snap tangent point to nearest level-set point ---
    if (state.tangentPoint) {
      var bestDist = Infinity, bestPt = null;
      var old = state.tangentPoint;
      for (var qi = 0; qi < state.levelPoints.length; qi++) {
        var pt = state.levelPoints[qi];
        var d = (pt.x - old.x) ** 2 + (pt.y - old.y) ** 2;
        if (d < bestDist) { bestDist = d; bestPt = pt; }
      }
      if (bestPt) state.tangentPoint = bestPt;
    } else {
      state.tangentPoint = state.levelPoints[Math.floor(state.levelPoints.length / 2)];
    }
    var tp = state.tangentPoint;
    if (!tp) return;

    // Gradient at tangent point
    var gradX = p.gx(tp.x, tp.y);
    var gradY = p.gy(tp.x, tp.y);
    var gradMag = Math.sqrt(gradX * gradX + gradY * gradY);

    // --- Gradient arrows along the entire curve ---
    if (state.showGradAll) {
      var step = Math.max(1, Math.floor(state.levelPoints.length / 30));
      var arrowLen = size * 0.06;
      ctx.save();
      for (var gi = 0; gi < state.levelPoints.length; gi += step) {
        var gpt = state.levelPoints[gi];
        var gxi = p.gx(gpt.x, gpt.y);
        var gyi = p.gy(gpt.x, gpt.y);
        var mg = Math.sqrt(gxi * gxi + gyi * gyi);
        if (mg < 1e-10) continue;
        var nx = gxi / mg, ny = gyi / mg;
        var px1 = T.toPixelX(gpt.x), py1 = T.toPixelY(gpt.y);
        var px2 = px1 + nx * arrowLen;
        var py2 = py1 - ny * arrowLen;
        TA.drawArrow(ctx, px1, py1, px2, py2, 'rgba(255,255,255,0.8)', 1.8, 7);
      }
      ctx.restore();
    }

    // --- Gradient at the tangent point ---
    if (state.showGradPt && gradMag > 1e-10) {
      var gpArrowLen = size * 0.18;
      var gnx = gradX / gradMag, gny = gradY / gradMag;
      var gpx1 = T.toPixelX(tp.x), gpy1 = T.toPixelY(tp.y);
      var gpx2 = gpx1 + gnx * gpArrowLen;
      var gpy2 = gpy1 - gny * gpArrowLen;
      TA.drawArrow(ctx, gpx1, gpy1, gpx2, gpy2, '#ffffff', 3, 10);

      if (state.showLabels) {
        ctx.font = '500 20px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var lblGx = gpx2 + (gpx2 - gpx1) * 0.25;
        var lblGy = gpy2 + (gpy2 - gpy1) * 0.25;
        ctx.fillText('∇φ', lblGx, lblGy);
      }
    }

    // --- Tangent line ---
    if (state.showTangent && gradMag > 1e-10) {
      var tx = -gradY / gradMag, ty = gradX / gradMag;
      var ext = Math.max(XMAX - XMIN, YMAX - YMIN) * 0.4;
      var tx1 = tp.x - tx * ext, ty1 = tp.y - ty * ext;
      var tx2 = tp.x + tx * ext, ty2 = tp.y + ty * ext;
      ctx.strokeStyle = '#64b5f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(T.toPixelX(tx1), T.toPixelY(ty1));
      ctx.lineTo(T.toPixelX(tx2), T.toPixelY(ty2));
      ctx.stroke();
      ctx.setLineDash([]);

      // Generic point on the tangent line
      var genT = -0.525;
      var gp = { x: tp.x + tx * ext * genT, y: tp.y + ty * ext * genT };

      // Right-angle symbol
      if (state.showGradPt && gradMag > 1e-10) {
        var symbolSize = 12;
        var nxDir = gradX / gradMag, nyDir = gradY / gradMag;
        var scaleF = size / (XMAX - XMIN);
        var txPxS = -tx * scaleF, tyPxS = ty * scaleF;
        var nxPxS = nxDir * scaleF, nyPxS = -nyDir * scaleF;
        var tLen = Math.sqrt(txPxS * txPxS + tyPxS * tyPxS);
        var nLen = Math.sqrt(nxPxS * nxPxS + nyPxS * nyPxS);
        if (tLen > 0 && nLen > 0) {
          var txN = txPxS / tLen * symbolSize;
          var tyN = tyPxS / tLen * symbolSize;
          var nxN = nxPxS / nLen * symbolSize;
          var nyN = nyPxS / nLen * symbolSize;
          var cpx = T.toPixelX(tp.x), cpy = T.toPixelY(tp.y);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(cpx + txN, cpy + tyN);
          ctx.lineTo(cpx + txN + nxN, cpy + tyN + nyN);
          ctx.lineTo(cpx + nxN, cpy + nyN);
          ctx.stroke();
        }
      }

      // Labels
      if (state.showLabels) {
        ctx.font = '500 20px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
        var tpPx = T.toPixelX(tp.x), tpPy = T.toPixelY(tp.y);
        var gpPx = T.toPixelX(gp.x), gpPy = T.toPixelY(gp.y);
        var segLen = Math.sqrt((gpPx - tpPx) ** 2 + (gpPy - tpPy) ** 2) || 1;
        var dxSeg = (gpPx - tpPx) / segLen;
        var dySeg = (gpPy - tpPy) / segLen;
        var offset = 0.225 * segLen;

        // (x₀, y₀) label
        ctx.fillStyle = '#e53935';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('(x₀, y₀)', tpPx - dxSeg * offset, tpPy - dySeg * offset);

        // (x, y) label
        ctx.fillStyle = '#64b5f6';
        ctx.fillText('(x, y)', gpPx + dxSeg * offset, gpPy + dySeg * offset);

        // Generic point dot
        ctx.fillStyle = '#64b5f6';
        ctx.beginPath();
        ctx.arc(T.toPixelX(gp.x), T.toPixelY(gp.y), 4, 0, Math.PI * 2);
        ctx.fill();

        // Arrow from tangent point to generic point
        var xfinal = T.toPixelX(tp.x) + (T.toPixelX(gp.x) - T.toPixelX(tp.x)) * 0.95;
        var yfinal = T.toPixelY(tp.y) + (T.toPixelY(gp.y) - T.toPixelY(tp.y)) * 0.95;
        TA.drawArrow(ctx, T.toPixelX(tp.x), T.toPixelY(tp.y), xfinal, yfinal, '#64b5f6', 3, 10);
      }
    }

    // --- Tangent point dot ---
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(T.toPixelX(tp.x), T.toPixelY(tp.y), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    dom.infoBox.style.display = 'none';
  }


  /* ======================================================================
   * 3D RENDERING
   * ====================================================================== */

  function initThree() {
    if (threeInited) return;
    threeInited = true;

    var result = TA.initThreeScene(dom.container3d, dom.canvasArea, { axisLength: 4 });
    scene = result.scene;
    camera = result.camera;
    renderer = result.renderer;

    // Set up orbit controls with a hook for isosurface click detection
    orbitControls = TA.initOrbitControls(dom.container3d, camera, {
      azimuth: -Math.PI / 3,
      elevation: Math.PI / 5,
      radius: 10,
      onBeforeOrbit: function (e) {
        // Check if the click hit the isosurface
        if (state.dim === 3 && isoMesh) {
          var rect = dom.canvasArea.getBoundingClientRect();
          var mouse = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
          );
          var raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse, camera);
          var intersects = raycaster.intersectObject(isoMesh);
          if (intersects.length > 0) {
            var pt = intersects[0].point;
            state.tangentPoint = { x: pt.x, y: pt.y, z: pt.z };
            update3D();
            return false;  // cancel orbit
          }
        }
        // Allow orbit
      }
    });
  }

  /** Main 3D update routine. */
  function update3D() {
    if (!threeInited) return;
    var p = getPreset();
    var c = mapC(state.cParam);

    // Clean up previous objects
    TA.disposeObject(scene, isoMesh); isoMesh = null;
    TA.disposeObject(scene, gradGroup); gradGroup = null;
    TA.disposeObject(scene, tangentGroup); tangentGroup = null;
    TA.disposeObject(scene, pointGroup); pointGroup = null;

    // Build isosurface
    var result = TA.buildIsosurface(p, c, 50);
    state.levelPoints = result.levelPoints;
    var isoGeo = result.geometry;
    var idxCount = isoGeo.index ? isoGeo.index.count : 0;

    if (idxCount > 0) {
      var isoMat = new THREE.MeshPhongMaterial({
        color: 0xffffff, transparent: true, opacity: 0.55,
        side: THREE.DoubleSide, shininess: 40, depthWrite: false
      });
      isoMesh = new THREE.Mesh(isoGeo, isoMat);
      scene.add(isoMesh);
    }

    if (state.levelPoints.length === 0) return;

    // Snap tangent point to nearest isosurface vertex
    if (state.tangentPoint) {
      var bestDist = Infinity, bestPt = null;
      var old = state.tangentPoint;
      for (var qi = 0; qi < state.levelPoints.length; qi++) {
        var lp = state.levelPoints[qi];
        var d = (lp.x - old.x) ** 2 + (lp.y - old.y) ** 2 + (lp.z - old.z) ** 2;
        if (d < bestDist) { bestDist = d; bestPt = lp; }
      }
      if (bestPt) state.tangentPoint = bestPt;
    } else {
      state.tangentPoint = state.levelPoints[Math.floor(state.levelPoints.length / 2)];
    }
    var tp = state.tangentPoint;
    if (!tp) return;

    var gx = p.gx(tp.x, tp.y, tp.z);
    var gy = p.gy(tp.x, tp.y, tp.z);
    var gz = p.gz(tp.x, tp.y, tp.z);
    var gMag = Math.sqrt(gx * gx + gy * gy + gz * gz);

    // --- Gradient arrows on surface ---
    if (state.showGradAll && state.levelPoints.length > 0) {
      gradGroup = new THREE.Group();
      var arrowLen = 0.5;
      var boxVol = (p.xMax - p.xMin) * (p.yMax - p.yMin) * (p.zMax - p.zMin);
      var threshold = Math.cbrt(boxVol) / 10;
      var threshSq = threshold * threshold;
      var recent = [null, null, null];
      var recentIdx = 0;

      for (var gi = 0; gi < state.levelPoints.length; gi++) {
        var gpt = state.levelPoints[gi];
        // Skip points too close to recently drawn arrows
        var tooClose = false;
        for (var r = 0; r < 3; r++) {
          if (!recent[r]) continue;
          var ddx = gpt.x - recent[r].x, ddy = gpt.y - recent[r].y, ddz = gpt.z - recent[r].z;
          if (ddx * ddx + ddy * ddy + ddz * ddz < threshSq) { tooClose = true; break; }
        }
        if (tooClose) continue;

        var gxi = p.gx(gpt.x, gpt.y, gpt.z);
        var gyi = p.gy(gpt.x, gpt.y, gpt.z);
        var gzi = p.gz(gpt.x, gpt.y, gpt.z);
        var mg = Math.sqrt(gxi * gxi + gyi * gyi + gzi * gzi);
        if (mg < 1e-10) continue;

        recent[recentIdx] = gpt;
        recentIdx = (recentIdx + 1) % 3;

        var dir = new THREE.Vector3(gxi / mg, gyi / mg, gzi / mg);
        var origin = new THREE.Vector3(gpt.x, gpt.y, gpt.z);

        // Line segment
        var arrowGeo = new THREE.BufferGeometry().setFromPoints([
          origin, origin.clone().add(dir.clone().multiplyScalar(arrowLen))
        ]);
        gradGroup.add(new THREE.Line(arrowGeo, new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 })));

        // Small cone head
        var coneGeo = new THREE.CylinderGeometry(0, 0.06, 0.15, 6);
        var coneMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        var cone = new THREE.Mesh(coneGeo, coneMat);
        cone.position.copy(origin.clone().add(dir.clone().multiplyScalar(arrowLen)));
        cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        gradGroup.add(cone);
      }
      scene.add(gradGroup);
    }

    // --- Point marker ---
    pointGroup = new THREE.Group();
    var sphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
    var sphereMat = new THREE.MeshBasicMaterial({ color: 0xe53935 });
    var sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(tp.x, tp.y, tp.z);
    pointGroup.add(sphere);
    scene.add(pointGroup);

    // --- Gradient at point ---
    if (state.showGradPt && gMag > 1e-10) {
      if (!tangentGroup) tangentGroup = new THREE.Group();
      var gdir = new THREE.Vector3(gx / gMag, gy / gMag, gz / gMag);
      var gorigin = new THREE.Vector3(tp.x, tp.y, tp.z);
      TA.addArrow3D(tangentGroup, gorigin, gdir, 1.2, { color: 0xffffff });

      if (state.showLabels) {
        var gradLabel = TA.makeTextSprite('∇φ', '#ffffff', 0.5);
        gradLabel.position.copy(gorigin.clone().add(gdir.clone().multiplyScalar(1.2 * 1.225)));
        tangentGroup.add(gradLabel);
      }
    }

    // --- Tangent plane ---
    if (state.showTangent && gMag > 1e-10) {
      if (!tangentGroup) tangentGroup = new THREE.Group();
      var n = new THREE.Vector3(gx / gMag, gy / gMag, gz / gMag);
      var planeSize = 2.0;

      // Two tangent vectors perpendicular to normal
      var t1 = new THREE.Vector3(1, 0, 0);
      if (Math.abs(n.dot(t1)) > 0.9) t1 = new THREE.Vector3(0, 1, 0);
      t1.cross(n).normalize();
      var t2 = new THREE.Vector3().crossVectors(n, t1).normalize();

      // Plane quad corners
      var corners = [
        new THREE.Vector3(tp.x - t1.x*planeSize - t2.x*planeSize, tp.y - t1.y*planeSize - t2.y*planeSize, tp.z - t1.z*planeSize - t2.z*planeSize),
        new THREE.Vector3(tp.x + t1.x*planeSize - t2.x*planeSize, tp.y + t1.y*planeSize - t2.y*planeSize, tp.z + t1.z*planeSize - t2.z*planeSize),
        new THREE.Vector3(tp.x + t1.x*planeSize + t2.x*planeSize, tp.y + t1.y*planeSize + t2.y*planeSize, tp.z + t1.z*planeSize + t2.z*planeSize),
        new THREE.Vector3(tp.x - t1.x*planeSize + t2.x*planeSize, tp.y - t1.y*planeSize + t2.y*planeSize, tp.z - t1.z*planeSize + t2.z*planeSize),
      ];

      var planeGeo = new THREE.BufferGeometry();
      var verts = new Float32Array(12);
      for (var ci = 0; ci < 4; ci++) {
        verts[ci*3] = corners[ci].x; verts[ci*3+1] = corners[ci].y; verts[ci*3+2] = corners[ci].z;
      }
      planeGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      planeGeo.setIndex([0,1,2, 0,2,3]);
      planeGeo.computeVertexNormals();
      tangentGroup.add(new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
        color: 0x64b5f6, transparent: true, opacity: 0.2,
        side: THREE.DoubleSide, depthWrite: false
      })));

      // Plane border
      var borderGeo = new THREE.BufferGeometry().setFromPoints([corners[0], corners[1], corners[2], corners[3], corners[0]]);
      tangentGroup.add(new THREE.Line(borderGeo, new THREE.LineBasicMaterial({ color: 0x64b5f6, transparent: true, opacity: 0.5 })));

      // Generic point on tangent plane
      var genPt = new THREE.Vector3(
        tp.x + t1.x * planeSize * 0.6 + t2.x * planeSize * 0.45,
        tp.y + t1.y * planeSize * 0.6 + t2.y * planeSize * 0.45,
        tp.z + t1.z * planeSize * 0.6 + t2.z * planeSize * 0.45
      );

      // Right-angle symbol
      if (state.showGradPt) {
        var symLen = 0.2;
        var raRadius = 0.015;
        var toGen = genPt.clone().sub(new THREE.Vector3(tp.x, tp.y, tp.z)).normalize();
        var p1 = new THREE.Vector3(tp.x, tp.y, tp.z).add(toGen.clone().multiplyScalar(symLen));
        var p2 = p1.clone().add(n.clone().multiplyScalar(symLen));
        var p3 = new THREE.Vector3(tp.x, tp.y, tp.z).add(n.clone().multiplyScalar(symLen));
        var raMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        var upRA = new THREE.Vector3(0, 1, 0);
        // Segment p1 → p2
        var d1 = p2.clone().sub(p1);
        var len1 = d1.length();
        if (len1 > 1e-6) {
          var dir1 = d1.clone().normalize();
          var cyl1 = new THREE.Mesh(new THREE.CylinderGeometry(raRadius, raRadius, len1, 6), raMat);
          cyl1.position.copy(p1.clone().add(d1.clone().multiplyScalar(0.5)));
          cyl1.quaternion.setFromUnitVectors(upRA, dir1);
          tangentGroup.add(cyl1);
        }
        // Segment p2 → p3
        var d2 = p3.clone().sub(p2);
        var len2 = d2.length();
        if (len2 > 1e-6) {
          var dir2 = d2.clone().normalize();
          var cyl2 = new THREE.Mesh(new THREE.CylinderGeometry(raRadius, raRadius, len2, 6), raMat);
          cyl2.position.copy(p2.clone().add(d2.clone().multiplyScalar(0.5)));
          cyl2.quaternion.setFromUnitVectors(upRA, dir2);
          tangentGroup.add(cyl2);
        }
      }

      // Labels
      if (state.showLabels) {
        // Arrow from tangent point to generic point
        var tpVec = new THREE.Vector3(tp.x, tp.y, tp.z);
        var lineDir = genPt.clone().sub(tpVec);
        var lineLen = 0.90 * lineDir.length();
        if (lineLen > 1e-6) {
          var lineNorm = lineDir.clone().normalize();
          TA.addArrow3D(tangentGroup, tpVec, lineNorm, lineLen, {
            color: 0x64b5f6, shaftRadius: 0.03, headRadius: 0.08, headLength: 0.2
          });
        }

        // Generic point sphere
        var gpSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.07, 12, 12),
          new THREE.MeshBasicMaterial({ color: 0x64b5f6 })
        );
        gpSphere.position.copy(genPt);
        tangentGroup.add(gpSphere);

        // Label positions: along continuation of the tp→gp line
        var tpVec3 = new THREE.Vector3(tp.x, tp.y, tp.z);
        var segDir = genPt.clone().sub(tpVec3);
        var segLen3 = segDir.length() || 1;
        var segNorm = segDir.clone().normalize();
        var lblOffset = 0.225 * segLen3;

        var ptLabel = TA.makeTextSprite('(x₀,y₀,z₀)', '#e53935', 0.5);
        ptLabel.position.copy(tpVec3.clone().sub(segNorm.clone().multiplyScalar(lblOffset)));
        tangentGroup.add(ptLabel);

        var gpLabel = TA.makeTextSprite('(x,y,z)', '#64b5f6', 0.5);
        gpLabel.position.copy(genPt.clone().add(segNorm.clone().multiplyScalar(lblOffset)));
        tangentGroup.add(gpLabel);
      }
    }

    if (tangentGroup) scene.add(tangentGroup);
    dom.infoBox.style.display = 'none';
  }


  /* ======================================================================
   * MODE SWITCHING & MAIN UPDATE
   * ====================================================================== */

  function switchMode() {
    var is2d = (state.dim === 2);
    dom.toggleHeatmap.style.display = is2d ? '' : 'none';
    dom.toggleContours.style.display = is2d ? '' : 'none';
    dom.colourSection.style.display = is2d ? '' : 'none';

    if (is2d) {
      dom.canvas2d.style.display = 'block';
      dom.container3d.style.display = 'none';
    } else {
      dom.canvas2d.style.display = 'none';
      dom.container3d.style.display = 'block';
      dom.colourbarWrap.style.display = 'none';
      initThree();
      var rect = dom.canvasArea.getBoundingClientRect();
      if (renderer && rect.width > 0 && rect.height > 0) {
        renderer.setSize(rect.width, rect.height);
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
      }
    }
    dom.currentFnLabel.textContent = getPreset().label;
  }

  function resize() {
    TA.resizeCanvas(dom.canvas2d, dom.ctx, dom.canvasArea);
    if (renderer) {
      var rect = dom.canvasArea.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
  }

  function update() {
    if (state.dim === 2) { draw2D(); }
    else { update3D(); }
  }


  /* ======================================================================
   * INITIALISATION  (called from index.html)
   * ====================================================================== */

  function init() {

    // --- Gather DOM references ---
    dom.panel          = document.getElementById('panel');
    dom.collapseBtn    = document.getElementById('collapseBtn');
    dom.openBtn        = document.getElementById('openBtn');
    dom.fnSelect       = document.getElementById('fnSelect');
    dom.customInput    = document.getElementById('customExpr');
    dom.errorMsg       = document.getElementById('errorMsg');
    dom.cValue         = document.getElementById('cValue');
    dom.cSlider        = document.getElementById('cSlider');
    dom.toggleGradAll  = document.getElementById('toggleGradAll');
    dom.toggleGradPt   = document.getElementById('toggleGradPt');
    dom.toggleTangent  = document.getElementById('toggleTangent');
    dom.toggleLabels   = document.getElementById('toggleLabels');
    dom.toggleFlip     = document.getElementById('toggleFlip');
    dom.toggleHeatmap  = document.getElementById('toggleHeatmap');
    dom.toggleContours = document.getElementById('toggleContours');
    dom.colourbarWrap  = document.getElementById('colourbarWrap');
    dom.cbCanvas       = document.getElementById('colourbar');
    dom.canvasArea     = document.getElementById('canvasArea');
    dom.canvas2d       = document.getElementById('canvas2d');
    dom.ctx            = dom.canvas2d.getContext('2d');
    dom.container3d    = document.getElementById('container3d');
    dom.currentFnLabel = document.getElementById('currentFnLabel');
    dom.infoBox        = document.getElementById('infoBox');
    dom.colourSection  = document.getElementById('colourSection');

    // --- Sidebar collapse/expand ---
    TA.initSidebar({
      panel: dom.panel,
      collapseBtn: dom.collapseBtn,
      openBtn: dom.openBtn,
      onResize: function () { resize(); update(); }
    });

    // --- Help overlay ---
    TA.initOverlay({
      overlay:    document.getElementById('helpOverlay'),
      closeBtn:   document.getElementById('helpClose'),
      triggerBtn: document.getElementById('btnHelp'),
    });

    // --- Overview overlay ---
    TA.initOverlay({
      overlay:    document.getElementById('overviewOverlay'),
      closeBtn:   document.getElementById('overviewClose'),
      triggerBtn: document.getElementById('btnOverview'),
    });

    // --- 2D / 3D dimension switcher ---
    document.querySelectorAll('[data-dim]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var d = parseInt(btn.dataset.dim);
        if (d === state.dim) return;
        saveDimState();
        state.dim = d;
        document.querySelectorAll('[data-dim]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        dom.customInput.placeholder = d === 2 ? 'e.g. x^2 + y^2' : 'e.g. x^2 + y^2 + z^2';
        populateSelect();
        if (!restoreDimState(d)) {
          state.fnIndex = 0;
          state.isCustom = false;
          state.flipSign = false;
          dom.toggleFlip.classList.remove('active');
          dom.customInput.value = '';
          dom.errorMsg.textContent = '';
          dom.customInput.classList.remove('error');
          resetForPreset();
        }
        switchMode();
        update();
      });
    });

    // --- Preset select ---
    dom.fnSelect.addEventListener('change', function () {
      state.fnIndex = parseInt(dom.fnSelect.value);
      state.isCustom = false;
      dom.customInput.value = '';
      dom.errorMsg.textContent = '';
      dom.customInput.classList.remove('error');
      resetForPreset();
      update();
    });

    // --- Custom expression input ---
    dom.customInput.addEventListener('input', function () {
      var val = dom.customInput.value.trim();
      if (!val) {
        dom.errorMsg.textContent = '';
        dom.customInput.classList.remove('error');
        if (state.isCustom) {
          state.isCustom = false;
          state.fnIndex = 0;
          dom.fnSelect.value = 0;
          resetForPreset();
          update();
        }
        return;
      }
      try {
        var preset = TA.makeCustomPreset(val, state.dim);
        state.customFn = preset.fn;
        state.customGx = preset.gx;
        state.customGy = preset.gy;
        if (state.dim === 3) state.customGz = preset.gz;
        state.customExpr = val;
        state.customPreset = preset;
        state.isCustom = true;
        dom.errorMsg.textContent = '';
        dom.customInput.classList.remove('error');
        dom.fnSelect.value = '';
        resetForPreset();
        update();
      } catch (e) {
        dom.errorMsg.textContent = 'Invalid expression';
        dom.customInput.classList.add('error');
      }
    });

    // --- c-slider ---
    dom.cSlider.addEventListener('input', function () {
      state.cParam = parseInt(dom.cSlider.value);
      dom.cValue.textContent = mapC(state.cParam).toFixed(2);
      state.levelPoints = [];
      update();
    });

    // --- Toggle buttons ---
    TA.wireToggle(dom.toggleGradAll,  state, 'showGradAll',  update);
    TA.wireToggle(dom.toggleGradPt,   state, 'showGradPt',   update);
    TA.wireToggle(dom.toggleTangent,  state, 'showTangent',  update);
    TA.wireToggle(dom.toggleLabels,   state, 'showLabels',   update);
    TA.wireToggle(dom.toggleHeatmap,  state, 'showHeatmap',  update);
    TA.wireToggle(dom.toggleContours, state, 'showContours', update);

    // --- Colour inversion button ---
    document.getElementById('toggleInvert').addEventListener('click', function() {
      this.classList.toggle('active');
      document.documentElement.classList.toggle('inverted');
    });

    // --- Colour scheme selector ---
    document.querySelectorAll('[data-scheme]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.scheme = btn.dataset.scheme;
        document.querySelectorAll('[data-scheme]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        update();
      });
    });

    // --- Flip sign toggle (−φ) ---
    dom.toggleFlip.addEventListener('click', function () {
      var oldC = mapC(state.cParam);
      state.flipSign = !state.flipSign;
      dom.toggleFlip.classList.toggle('active', state.flipSign);
      var tmp = cMin;
      cMin = -cMax;
      cMax = -tmp;
      var rawC = cSliderFromValue(-oldC);
      dom.cSlider.value = Math.max(0, Math.min(600, rawC));
      dom.cValue.textContent = (-oldC).toFixed(2);
      state.cParam = parseInt(dom.cSlider.value);
      state.levelPoints = [];
      dom.currentFnLabel.textContent = getPreset().label;
      update();
    });

    // --- 2D click handler (select tangent point) ---
    dom.canvas2d.addEventListener('click', function (e) {
      if (state.dim !== 2 || !dom._transforms) return;
      var rect = dom.canvasArea.getBoundingClientRect();
      var px = e.clientX - rect.left;
      var py = e.clientY - rect.top;
      var mx = dom._transforms.toMathX(px);
      var my = dom._transforms.toMathY(py);

      var bestDist = Infinity, bestPt = null;
      for (var i = 0; i < state.levelPoints.length; i++) {
        var pt = state.levelPoints[i];
        var d = (pt.x - mx) ** 2 + (pt.y - my) ** 2;
        if (d < bestDist) { bestDist = d; bestPt = pt; }
      }
      if (bestPt) {
        var ppx = dom._transforms.toPixelX(bestPt.x);
        var ppy = dom._transforms.toPixelY(bestPt.y);
        var pixDist = Math.sqrt((ppx - px) ** 2 + (ppy - py) ** 2);
        if (pixDist < 30) {
          state.tangentPoint = bestPt;
          update();
        }
      }
    });

    // --- Animation loop (for Three.js continuous rendering) ---
    (function animate() {
      if (state.dim === 3 && renderer) renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();

    // --- Initial render ---
    populateSelect();
    resetForPreset();
    switchMode();
    resize();
    update();
    window.addEventListener('resize', function () { resize(); update(); });

    // --- Teaching pointer (always last) ---
    TA.initPointer();
  }


  /* ======================================================================
   * PUBLIC API
   * ====================================================================== */

  return { init: init };

})();
