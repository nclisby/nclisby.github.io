/* ==========================================================================
 * scalar-fields.js
 *
 * App-specific logic for the "Scalar Fields" interactive teaching app.
 * Visualises 2D and 3D scalar fields with heatmaps, contour lines /
 * isosurfaces, a single "slice" level set with slider, the gradient
 * vector field on a regular grid, and a 3D surface plot z = φ(x,y).
 *
 * Depends on:
 *   – teaching-app.js  (the TeachingApp engine — must be loaded first)
 *   – Three.js r128     (loaded from CDN, must be loaded first)
 *
 * This file is loaded from scalar-fields.html and exposes a single
 * global initialiser:  ScalarFieldApp.init()
 * ========================================================================== */

var ScalarFieldApp = (function () {
  'use strict';

  // Shorthand alias
  var TA = TeachingApp;


  /* ======================================================================
   * PRESET DEFINITIONS
   * ====================================================================== */

  /** 2D preset scalar fields with analytic gradients and domain/range info. */
  var presets2d = [
      {
      expr: 'x + y', label: 'φ(x,y) = x + y', fn: (x,y) => x + y,
      gx: function(x,y){return 1}, gy: function(x,y){return 1},
      cMin: -8, cMax: 8, cDef: 0, xMin: -4, xMax: 4, yMin: -4, yMax: 4 
      },
      {
      expr: 'y', label: 'φ(x,y) = y', fn: (x,y) => y,
      gx: function(x,y){return 0}, gy: function(x,y){return 1},
      cMin: -4, cMax: 4, cDef: 0, xMin: -4, xMax: 4, yMin: -4, yMax: 4 
      },
    { expr: 'x² + y²', label: 'φ(x,y) = x² + y²', fn: function(x,y){return x*x+y*y},
      gx: function(x,y){return 2*x}, gy: function(x,y){return 2*y},
      cMin: 0.01, cMax: 16, cDef: 2, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'x² + 4y²', label: 'φ(x,y) = x² + 4y²', fn: function(x,y){return x*x+4*y*y},
      gx: function(x,y){return 2*x}, gy: function(x,y){return 8*y},
      cMin: 0.01, cMax: 16, cDef: 2, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'x² − y²', label: 'φ(x,y) = x² − y²', fn: function(x,y){return x*x-y*y},
      gx: function(x,y){return 2*x}, gy: function(x,y){return -2*y},
      cMin: -8, cMax: 8, cDef: 1, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'xy', label: 'φ(x,y) = xy', fn: function(x,y){return x*y},
      gx: function(x,y){return y}, gy: function(x,y){return x},
      cMin: -4, cMax: 4, cDef: 1, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'x³ − 3xy²', label: 'φ(x,y) = x³ − 3xy²',
      fn: function(x,y){return x*x*x-3*x*y*y},
      gx: function(x,y){return 3*x*x-3*y*y}, gy: function(x,y){return -6*x*y},
      cMin: -16, cMax: 16, cDef: 2, xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
    { expr: 'x³ − 3xy + 2y²', label: 'φ(x,y) = x³ − 3xy + 2y²',
      fn: function(x,y){return x*x*x-3*x*y + 2*y*y},
      gx: function(x,y){return 3*x*x-3*y}, gy: function(x,y){return -3*x +4*y},
      cMin: -16, cMax: 16, cDef: 2, xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
    { expr: 'sin(x) + sin(y)', label: 'φ(x,y) = sin(x) + sin(y)',
      fn: function(x,y){return Math.sin(x)+Math.sin(y)},
      gx: function(x,y){return Math.cos(x)}, gy: function(x,y){return Math.cos(y)},
      cMin: -2, cMax: 2, cDef: 0.5, xMin: -6, xMax: 6, yMin: -6, yMax: 6 },
    { expr: 'sin(xy)', label: 'φ(x,y) = sin(xy)', fn: function(x,y){return Math.sin(x*y)},
      gx: function(x,y){return y*Math.cos(x*y)}, gy: function(x,y){return x*Math.cos(x*y)},
      cMin: -1, cMax: 1, cDef: 0.5, xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
    { expr: 'eˣ cos(y)', label: 'φ(x,y) = eˣ cos(y)',
      fn: function(x,y){return Math.exp(x)*Math.cos(y)},
      gx: function(x,y){return Math.exp(x)*Math.cos(y)},
      gy: function(x,y){return -Math.exp(x)*Math.sin(y)},
      cMin: -3, cMax: 3, cDef: 1, xMin: -1.5, xMax: 1.5, yMin: -4.8, yMax: 4.8 },
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
    cParam: 300,           // slider raw value (0–600), mapped to real c
    showGrad: false,
    showHeatmap: false,
    showContours: false,
    showSlice: false,
    showSurface: false,
    showLabels: false,
    labelPoint: null,       // {x, y} in math coords — the labelled point
    scheme: 'palette1',
    flipSign: false,
    isCustom: false,
    customFn: null,
    customGx: null,
    customGy: null,
    customGz: null,
    customExpr: '',
    customPreset: null,
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
   * THREE.JS STATE — 3D isosurface scene (populated lazily)
   * ====================================================================== */

  var scene, camera, renderer;
  var threeInited = false;
  var isoMesh = null;
  var gradGroup = null;
  var orbitControls = null;


  /* ======================================================================
   * THREE.JS STATE — 2D surface scene (separate, z-up, populated lazily)
   * ====================================================================== */

  var surfScene, surfCamera, surfRenderer;
  var surfInited = false;
  var surfaceMesh = null;
  var surfGradGroup = null;
  var surfSlicePlane = null;
  var surfSliceLine = null;


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
   * 2D FIELD EVALUATION HELPER
   * ====================================================================== */

  /**
   * Evaluate the current 2D scalar field at (x, y), respecting flipSign.
   * Used by the surface builder which needs raw per-point values.
   */
  function evalFn2D(x, y) {
    var p = getPreset();
    var v;
    try { v = p.fn(x, y); } catch (e) { v = 0; }
    if (!isFinite(v)) v = 0;
    return v;
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

    // Dark background if nothing else drawn
    if (!state.showHeatmap && !state.showContours) {
      ctx.fillStyle = '#12141c';
      ctx.fillRect(ox, oy, size, size);
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

    // --- Slice: single level curve at φ = c ---
    if (state.showSlice) {
      var curveData = TA.marchingSquares(p.fn, c, 300, XMIN, XMAX, YMIN, YMAX);

      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (var si = 0; si < curveData.segments.length; si++) {
        var seg = curveData.segments[si];
        ctx.moveTo(T.toPixelX(seg[0].x), T.toPixelY(seg[0].y));
        ctx.lineTo(T.toPixelX(seg[1].x), T.toPixelY(seg[1].y));
      }
      ctx.stroke();
    }

    // --- Gradient field on 10×10 grid ---
    if (state.showGrad) {
      drawGrad2D(ctx, ox, oy, size, p);
    }

    // --- Label point (φ value readout) ---
    // Store transforms for the click handler
    dom._labelTransforms = T;

    if (state.showLabels) {
      // Ensure labelPoint exists and is in domain
      if (!state.labelPoint) {
        state.labelPoint = { x: (XMIN + XMAX) / 2, y: (YMIN + YMAX) / 2 };
      }
      var lp = state.labelPoint;
      // Clamp to domain
      lp.x = Math.max(XMIN, Math.min(XMAX, lp.x));
      lp.y = Math.max(YMIN, Math.min(YMAX, lp.y));

      var lpx = T.toPixelX(lp.x);
      var lpy = T.toPixelY(lp.y);

      // Red dot with white outline (tangent app style)
      ctx.fillStyle = '#e53935';
      ctx.beginPath();
      ctx.arc(lpx, lpy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Evaluate function at the point
      var fVal = p.fn(lp.x, lp.y);
      if (!isFinite(fVal)) fVal = 0;
      var labelStr = 'φ(' + lp.x.toFixed(2) + ', ' + lp.y.toFixed(2) + ') = ' + fVal.toFixed(2);

      // Draw label text offset from the point
      ctx.font = '500 20px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';

      // Place label to the right; if too close to right edge, place to the left
      var textWidth = ctx.measureText(labelStr).width;
      var labelOffsetX = 12;
      var labelOffsetY = -14;
      if (lpx + labelOffsetX + textWidth > ox + size - 5) {
        ctx.textAlign = 'right';
        ctx.fillText(labelStr, lpx - labelOffsetX, lpy + labelOffsetY);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(labelStr, lpx + labelOffsetX, lpy + labelOffsetY);
      }
    }

    dom.infoBox.style.display = 'none';
  }

  /** Draw 2D gradient arrows on a 10×10 grid (vector-fields style). */
  function drawGrad2D(ctx, ox, oy, size, p) {
    var XMIN = p.xMin, XMAX = p.xMax, YMIN = p.yMin, YMAX = p.yMax;
    var n = 10;

    var arrows = [];
    var maxMag = 0;
    for (var j = 0; j < n; j++) {
      for (var i = 0; i < n; i++) {
        var gx = XMIN + (XMAX - XMIN) * (i + 0.5) / n;
        var gy = YMIN + (YMAX - YMIN) * (j + 0.5) / n;
        var vx = p.gx(gx, gy);
        var vy = p.gy(gx, gy);
        if (!isFinite(vx)) vx = 0;
        if (!isFinite(vy)) vy = 0;
        var mag = Math.sqrt(vx * vx + vy * vy);
        arrows.push({ x: gx, y: gy, vx: vx, vy: vy, mag: mag });
        if (mag > maxMag) maxMag = mag;
      }
    }

    if (maxMag === 0) return;

    var cellSize = size / n;
    var maxArrowLen = cellSize * 0.70;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;

    for (var ai = 0; ai < arrows.length; ai++) {
      var a = arrows[ai];
      var scale = (a.mag / maxMag) * maxArrowLen;
      if (scale < 0.5) continue;

      var angle = Math.atan2(-a.vy, a.vx);
      var px = ox + (a.x - XMIN) / (XMAX - XMIN) * size;
      var py = oy + (1 - (a.y - YMIN) / (YMAX - YMIN)) * size;
      var sx = px - Math.cos(angle) * scale * 0.5;
      var sy = py - Math.sin(angle) * scale * 0.5;
      var ex = px + Math.cos(angle) * scale * 0.5;
      var ey = py + Math.sin(angle) * scale * 0.5;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      var headLen = Math.min(scale * 0.35, 6);
      var headAngle = 0.45;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angle - headAngle), ey - headLen * Math.sin(angle - headAngle));
      ctx.lineTo(ex - headLen * Math.cos(angle + headAngle), ey - headLen * Math.sin(angle + headAngle));
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }


  /* ======================================================================
   * 3D ISOSURFACE RENDERING  (dim === 3)
   * ====================================================================== */

  function initThree() {
    if (threeInited) return;
    threeInited = true;

    var result = TA.initThreeScene(dom.container3d, dom.canvasArea, { axisLength: 4 });
    scene = result.scene;
    camera = result.camera;
    renderer = result.renderer;

    orbitControls = TA.initOrbitControls(dom.container3d, camera, {
      azimuth: -Math.PI / 3,
      elevation: Math.PI / 5,
      radius: 10,
    });
  }

  /** Main 3D update routine (isosurface mode). */
  function update3D() {
    if (!threeInited) return;
    var p = getPreset();
    var c = mapC(state.cParam);

    // Clean up previous objects
    TA.disposeObject(scene, isoMesh); isoMesh = null;
    TA.disposeObject(scene, gradGroup); gradGroup = null;

    // Build isosurface (slice)
    if (state.showSlice) {
      var result = TA.buildIsosurface(p, c, 50);
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
    }

    // --- Gradient field on 5×5×5 grid ---
    if (state.showGrad) {
      drawGrad3D(scene, p, function (g) { gradGroup = g; });
    }

    dom.infoBox.style.display = 'none';
  }

  /** Draw 3D gradient arrows on a 5×5×5 grid into a given scene. */
  function drawGrad3D(targetScene, p, storeGroup) {
    var n = 5;
    var XMIN3 = p.xMin, XMAX3 = p.xMax;
    var YMIN3 = p.yMin, YMAX3 = p.yMax;
    var ZMIN3 = p.zMin, ZMAX3 = p.zMax;

    var arrows = [];
    var maxMag = 0;
    for (var k = 0; k < n; k++) {
      for (var j = 0; j < n; j++) {
        for (var i = 0; i < n; i++) {
          var x = XMIN3 + (XMAX3 - XMIN3) * (i + 0.5) / n;
          var y = YMIN3 + (YMAX3 - YMIN3) * (j + 0.5) / n;
          var z = ZMIN3 + (ZMAX3 - ZMIN3) * (k + 0.5) / n;
          var vx = p.gx(x, y, z);
          var vy = p.gy(x, y, z);
          var vz = p.gz(x, y, z);
          if (!isFinite(vx)) vx = 0;
          if (!isFinite(vy)) vy = 0;
          if (!isFinite(vz)) vz = 0;
          var mag = Math.sqrt(vx * vx + vy * vy + vz * vz);
          arrows.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, mag: mag });
          if (mag > maxMag) maxMag = mag;
        }
      }
    }

    if (maxMag === 0) return;

    var group = new THREE.Group();
    var cellSize = (XMAX3 - XMIN3) / n;
    var maxArrowLen = cellSize * 0.42;

    var shaftMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    var headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });

    for (var ai = 0; ai < arrows.length; ai++) {
      var a = arrows[ai];
      var sc = (a.mag / maxMag) * maxArrowLen;
      if (sc < 0.02) continue;

      var dx = a.vx / a.mag * sc;
      var dy = a.vy / a.mag * sc;
      var dz = a.vz / a.mag * sc;

      var start = new THREE.Vector3(a.x - dx * 0.5, a.y - dy * 0.5, a.z - dz * 0.5);
      var end = new THREE.Vector3(a.x + dx * 0.5, a.y + dy * 0.5, a.z + dz * 0.5);

      var lineGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
      group.add(new THREE.Line(lineGeo, shaftMat));

      var headLen = Math.min(sc * 0.35, 0.15);
      var headRad = headLen * 0.35;
      var coneGeo = new THREE.CylinderGeometry(0, headRad, headLen, 6);
      var cone = new THREE.Mesh(coneGeo, headMat);
      cone.position.copy(end);

      var dir = new THREE.Vector3(dx, dy, dz).normalize();
      var defaultDir = new THREE.Vector3(0, 1, 0);
      cone.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(defaultDir, dir));
      group.add(cone);
    }

    targetScene.add(group);
    storeGroup(group);
  }


  /* ======================================================================
   * 2D SURFACE RENDERING  (z = φ(x,y), separate Three.js scene)
   * ====================================================================== */

  function initSurfaceScene() {
    if (surfInited) return;
    surfInited = true;

    surfScene = new THREE.Scene();
    surfScene.background = new THREE.Color(0x0f1117);

    var rect = dom.canvasArea.getBoundingClientRect();
    surfCamera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);

    surfRenderer = new THREE.WebGLRenderer({ antialias: true });
    surfRenderer.setSize(rect.width, rect.height);
    surfRenderer.setPixelRatio(window.devicePixelRatio);
    dom.containerSurface.appendChild(surfRenderer.domElement);

    // Axes: x, y horizontal, z vertical (up)
    var axisMat = new THREE.LineBasicMaterial({ color: 0x4a4d5d });

    var xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-Math.PI, 0, 0), new THREE.Vector3(Math.PI, 0, 0)
    ]);
    surfScene.add(new THREE.Line(xGeo, axisMat));

    var yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -Math.PI, 0), new THREE.Vector3(0, Math.PI, 0)
    ]);
    surfScene.add(new THREE.Line(yGeo, axisMat));

    var zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -4), new THREE.Vector3(0, 0, 3.3)
    ]);
    surfScene.add(new THREE.Line(zGeo, axisMat));

    var xLabel = TA.makeTextSprite('x', '#8b8fa3');
    xLabel.position.set(Math.PI + 0.4, 0, 0);
    surfScene.add(xLabel);
    var yLabel = TA.makeTextSprite('y', '#8b8fa3');
    yLabel.position.set(0, Math.PI + 0.4, 0);
    surfScene.add(yLabel);
    var zLabel = TA.makeTextSprite('z', '#8b8fa3');
    zLabel.position.set(0, 0, 3.6);
    surfScene.add(zLabel);

    surfScene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 5, 10);
    surfScene.add(dirLight);

    // Custom z-up orbit controls
    initSurfaceOrbitControls();
  }

  /** Custom orbit controls for the surface scene (z-up convention). */
  function initSurfaceOrbitControls() {
    var isPinching = false;
    var isDown = false, prevX, prevY;
    var azimuth = -Math.PI / 3, elevation = Math.PI / 5, radius = 13;

    function updateCam() {
      surfCamera.position.x = radius * Math.cos(elevation) * Math.cos(azimuth);
      surfCamera.position.y = radius * Math.cos(elevation) * Math.sin(azimuth);
      surfCamera.position.z = radius * Math.sin(elevation);
      surfCamera.up.set(0, 0, 1);
      surfCamera.lookAt(0, 0, 0);
    }
    updateCam();

    var el = dom.containerSurface;
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' && !e.isPrimary) return;
      e.preventDefault();
      isDown = true; prevX = e.clientX; prevY = e.clientY;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      e.preventDefault();
      azimuth -= (e.clientX - prevX) * 0.008;
      elevation = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05,
        elevation + (e.clientY - prevY) * 0.008));
      prevX = e.clientX; prevY = e.clientY;
      updateCam();
    });
    el.addEventListener('pointerup', function () { isDown = false; });
    el.addEventListener('pointercancel', function () { isDown = false; });
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      radius = Math.max(3, Math.min(25, radius + e.deltaY * 0.01));
      updateCam();
    }, { passive: false });

    var lastPinchDist = 0;
    el.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        isPinching = true;
        isDown = false;
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    }, { passive: false });
    el.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2) {
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (lastPinchDist > 0) {
          radius = Math.max(3, Math.min(25, radius + (lastPinchDist - dist) * 0.03));
          updateCam();
        }
        lastPinchDist = dist;
      }
    }, { passive: false });
    el.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) {
        isPinching = false;
        lastPinchDist = 0;
      }
    }, { passive: false });
  }

  /** Dispose a Three.js object from a scene. */
  function disposeSurfObj(obj) {
    if (!obj) return;
    surfScene.remove(obj);
    obj.traverse(function (c) {
      if (c.geometry) c.geometry.dispose();
      if (c.material) c.material.dispose();
    });
  }

  /** Compute field on the 2D domain grid for surface building. */
  function computeSurfaceField(res) {
    var p = getPreset();
    var XMIN = p.xMin, XMAX = p.xMax, YMIN = p.yMin, YMAX = p.yMax;
    var data = new Float64Array(res * res);
    var fmin = Infinity, fmax = -Infinity;
    for (var j = 0; j < res; j++) {
      var y = YMIN + (YMAX - YMIN) * j / (res - 1);
      for (var i = 0; i < res; i++) {
        var x = XMIN + (XMAX - XMIN) * i / (res - 1);
        var v = evalFn2D(x, y);
        data[j * res + i] = v;
        if (v < fmin) fmin = v;
        if (v > fmax) fmax = v;
      }
    }
    return { data: data, fmin: fmin, fmax: fmax, res: res };
  }

  /** Build and render the 3D surface z = φ(x,y). */
  function drawSurface() {
    initSurfaceScene();

    var p = getPreset();
    var XMIN = p.xMin, XMAX = p.xMax, YMIN = p.yMin, YMAX = p.yMax;
    var res = 200;
    var field = computeSurfaceField(res);

    // Clean up old objects
    disposeSurfObj(surfaceMesh); surfaceMesh = null;
    disposeSurfObj(surfGradGroup); surfGradGroup = null;
    disposeSurfObj(surfSlicePlane); surfSlicePlane = null;
    disposeSurfObj(surfSliceLine); surfSliceLine = null;

    // Scale so max|f| maps to height 3, with f=0 at z=0
    var maxAbs = Math.max(Math.abs(field.fmin), Math.abs(field.fmax)) || 1;
    var zScale = 3.0 / maxAbs;
    var range = field.fmax - field.fmin || 1;

    // Build vertex + colour data
    var vertices = [], colors = [], indices = [];
    for (var j = 0; j < res; j++) {
      for (var i = 0; i < res; i++) {
        var x = XMIN + (XMAX - XMIN) * i / (res - 1);
        var y = YMIN + (YMAX - YMIN) * j / (res - 1);
        var v = field.data[j * res + i];
        vertices.push(x, y, v * zScale);
        var t = (v - field.fmin) / range;
        var rgb = TA.sampleColourMap(state.scheme, t);
        colors.push(rgb[0], rgb[1], rgb[2]);
      }
    }

    for (var jj = 0; jj < res - 1; jj++) {
      for (var ii = 0; ii < res - 1; ii++) {
        var a = jj * res + ii, b = a + 1, cc = (jj + 1) * res + ii, d = cc + 1;
        indices.push(a, b, cc, b, d, cc);
      }
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    surfaceMesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
      vertexColors: true, side: THREE.DoubleSide, shininess: 30
    }));
    surfScene.add(surfaceMesh);

    // --- Gradient arrows on the slice plane (or z=0 if no slice) ---
    if (state.showGrad) {
      var sliceZ = 0;
      if (state.showSlice) {
        var sliceVal = mapC(state.cParam);
        sliceZ = sliceVal * zScale;
      }
      buildSurfaceGradArrows(p, zScale, sliceZ);
    }

    // --- Slice: horizontal plane + intersection line ---
    if (state.showSlice) {
      buildSlice3D(field, zScale, p);
    }

    // Colour bar
    TA.drawColourbar(dom.cbCanvas, state.scheme);
    dom.colourbarWrap.style.display = 'flex';

    surfRenderer.render(surfScene, surfCamera);

    if (!window._surfAnimating) {
      window._surfAnimating = true;
      (function animate() {
        if (state.dim === 2 && state.showSurface && surfRenderer) {
          surfRenderer.render(surfScene, surfCamera);
        }
        requestAnimationFrame(animate);
      })();
    }

    dom.currentFnLabel.textContent = p.label;
    dom.infoBox.style.display = 'none';
  }

  /** Build gradient arrows on the surface scene at a given z-height. */
  function buildSurfaceGradArrows(p, zScale, sliceZ) {
    var XMIN = p.xMin, XMAX = p.xMax, YMIN = p.yMin, YMAX = p.yMax;
    var n = 10;

    // Compute gradient via preset analytic gradient
    var arrows = [];
    var maxMag = 0;
    for (var j = 0; j < n; j++) {
      for (var i = 0; i < n; i++) {
        var x = XMIN + (XMAX - XMIN) * (i + 0.5) / n;
        var y = YMIN + (YMAX - YMIN) * (j + 0.5) / n;
        var vx = p.gx(x, y);
        var vy = p.gy(x, y);
        if (!isFinite(vx)) vx = 0;
        if (!isFinite(vy)) vy = 0;
        var mag = Math.sqrt(vx * vx + vy * vy);
        arrows.push({ x: x, y: y, dx: vx, dy: vy, mag: mag });
        if (mag > maxMag) maxMag = mag;
      }
    }

    if (maxMag === 0) return;

    var group = new THREE.Group();
    var cellSize = (XMAX - XMIN) / n;
    var maxArrowLen = cellSize * 0.70;

    var shaftMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    var headMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

    for (var ai = 0; ai < arrows.length; ai++) {
      var a = arrows[ai];
      var scale = (a.mag / maxMag) * maxArrowLen;
      if (scale < 0.02) continue;

      var dx = a.dx / a.mag * scale;
      var dy = a.dy / a.mag * scale;

      // Centred arrows at z = sliceZ
      var start = new THREE.Vector3(a.x - dx * 0.5, a.y - dy * 0.5, sliceZ);
      var end = new THREE.Vector3(a.x + dx * 0.5, a.y + dy * 0.5, sliceZ);

      var lineGeo = new THREE.BufferGeometry().setFromPoints([start, end]);
      group.add(new THREE.Line(lineGeo, shaftMat));

      var headLen = Math.min(scale * 0.35, 0.15);
      var headRad = headLen * 0.35;
      var coneGeo = new THREE.CylinderGeometry(0, headRad, headLen, 6);
      var cone = new THREE.Mesh(coneGeo, headMat);
      cone.position.copy(end);

      var dir = new THREE.Vector3(dx, dy, 0).normalize();
      var up = new THREE.Vector3(0, 1, 0);
      cone.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir));
      group.add(cone);
    }

    surfScene.add(group);
    surfGradGroup = group;
  }

  /** Build slice plane + intersection line on the surface scene. */
  function buildSlice3D(field, zScale, p) {
    var XMIN = p.xMin, XMAX = p.xMax, YMIN = p.yMin, YMAX = p.yMax;
    var sliceVal = mapC(state.cParam);
    var sliceZ = sliceVal * zScale;

    // Translucent horizontal plane at z = sliceZ
    var planeGeo = new THREE.PlaneGeometry(
      (XMAX - XMIN) * 1.02, (YMAX - YMIN) * 1.02
    );
    var planeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, depthWrite: false
    });
    surfSlicePlane = new THREE.Mesh(planeGeo, planeMat);
    surfSlicePlane.position.set(0, 0, sliceZ);
    surfScene.add(surfSlicePlane);

    // Intersection line via marching squares
    var res = field.res;
    var surfacePoints = [];

    for (var j = 0; j < res - 1; j++) {
      for (var i = 0; i < res - 1; i++) {
        var v00 = field.data[j * res + i];
        var v10 = field.data[j * res + i + 1];
        var v01 = field.data[(j + 1) * res + i];
        var v11 = field.data[(j + 1) * res + i + 1];
        var b00 = v00 >= sliceVal ? 1 : 0;
        var b10 = v10 >= sliceVal ? 1 : 0;
        var b01 = v01 >= sliceVal ? 1 : 0;
        var b11 = v11 >= sliceVal ? 1 : 0;
        var cell = b00 | (b10 << 1) | (b11 << 2) | (b01 << 3);
        if (cell === 0 || cell === 15) continue;

        var gx = function (gi) { return XMIN + (XMAX - XMIN) * gi / (res - 1); };
        var gy = function (gj) { return YMIN + (YMAX - YMIN) * gj / (res - 1); };
        var interp = function (va, vb) { return (sliceVal - va) / (vb - va); };

        var top    = [i + interp(v00, v10), j];
        var right  = [i + 1, j + interp(v10, v11)];
        var bottom = [i + interp(v01, v11), j + 1];
        var left   = [i, j + interp(v00, v01)];

        var segs = [];
        switch (cell) {
          case 1: case 14: segs.push([left, top]); break;
          case 2: case 13: segs.push([top, right]); break;
          case 3: case 12: segs.push([left, right]); break;
          case 4: case 11: segs.push([right, bottom]); break;
          case 5: segs.push([left, top], [right, bottom]); break;
          case 6: case 9: segs.push([top, bottom]); break;
          case 7: case 8: segs.push([left, bottom]); break;
          case 10: segs.push([top, right], [left, bottom]); break;
        }

        for (var s = 0; s < segs.length; s++) {
          var x0 = gx(segs[s][0][0]), y0 = gy(segs[s][0][1]);
          var x1 = gx(segs[s][1][0]), y1 = gy(segs[s][1][1]);
          surfacePoints.push(
            new THREE.Vector3(x0, y0, sliceZ),
            new THREE.Vector3(x1, y1, sliceZ)
          );
        }
      }
    }

    if (surfacePoints.length > 0) {
      var lineGeo = new THREE.BufferGeometry().setFromPoints(surfacePoints);
      surfSliceLine = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
        color: 0xffffff, linewidth: 2
      }));
      surfScene.add(surfSliceLine);
    }
  }


  /* ======================================================================
   * MODE SWITCHING & VISIBILITY
   * ====================================================================== */

  /** Update button visibility based on current dim and surface state. */
  function updateButtonVisibility() {
    var is2d = (state.dim === 2);
    var surfActive = is2d && state.showSurface;

    // Surface button only in 2D
    dom.toggleSurface.style.display = is2d ? '' : 'none';

    // Heatmap and Level sets: only in 2D when Surface is off
    dom.toggleHeatmap.style.display = (is2d && !surfActive) ? '' : 'none';
    dom.toggleContours.style.display = (is2d && !surfActive) ? '' : 'none';

    // Labels: only in 2D when Surface is off
    dom.toggleLabels.style.display = (is2d && !surfActive) ? '' : 'none';

    // Colour section: in 2D always (surface uses colour scheme too), in 3D hide
    dom.colourSection.style.display = is2d ? '' : 'none';
  }

  function switchMode() {
    var is2d = (state.dim === 2);

    updateButtonVisibility();

    if (is2d) {
      if (state.showSurface) {
        dom.canvas2d.style.display = 'none';
        dom.container3d.style.display = 'none';
        dom.containerSurface.style.display = 'block';
        initSurfaceScene();
        var rect = dom.canvasArea.getBoundingClientRect();
        if (surfRenderer && rect.width > 0 && rect.height > 0) {
          surfRenderer.setSize(rect.width, rect.height);
          surfCamera.aspect = rect.width / rect.height;
          surfCamera.updateProjectionMatrix();
        }
      } else {
        dom.canvas2d.style.display = 'block';
        dom.container3d.style.display = 'none';
        dom.containerSurface.style.display = 'none';
      }
    } else {
      dom.canvas2d.style.display = 'none';
      dom.container3d.style.display = 'block';
      dom.containerSurface.style.display = 'none';
      dom.colourbarWrap.style.display = 'none';
      initThree();
      var rect2 = dom.canvasArea.getBoundingClientRect();
      if (renderer && rect2.width > 0 && rect2.height > 0) {
        renderer.setSize(rect2.width, rect2.height);
        camera.aspect = rect2.width / rect2.height;
        camera.updateProjectionMatrix();
      }
    }
    dom.currentFnLabel.textContent = getPreset().label;

    // Show/hide slice controls
    dom.cControls.style.display = state.showSlice ? 'flex' : 'none';
  }

  function resize() {
    TA.resizeCanvas(dom.canvas2d, dom.ctx, dom.canvasArea);
    if (renderer) {
      var rect = dom.canvasArea.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    if (surfRenderer) {
      var rect2 = dom.canvasArea.getBoundingClientRect();
      surfRenderer.setSize(rect2.width, rect2.height);
      surfCamera.aspect = rect2.width / rect2.height;
      surfCamera.updateProjectionMatrix();
    }
  }

  function update() {
    // Show/hide slice controls based on showSlice state
    dom.cControls.style.display = state.showSlice ? 'flex' : 'none';

    updateButtonVisibility();

    if (state.dim === 2) {
      if (state.showSurface) {
        dom.canvas2d.style.display = 'none';
        dom.container3d.style.display = 'none';
        dom.containerSurface.style.display = 'block';
        drawSurface();
      } else {
        dom.canvas2d.style.display = 'block';
        dom.container3d.style.display = 'none';
        dom.containerSurface.style.display = 'none';
        draw2D();
      }
    } else {
      dom.canvas2d.style.display = 'none';
      dom.container3d.style.display = 'block';
      dom.containerSurface.style.display = 'none';
      update3D();
    }
  }


  /* ======================================================================
   * INITIALISATION  (called from scalar-fields.html)
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
    dom.toggleGrad     = document.getElementById('toggleGrad');
    dom.toggleSlice    = document.getElementById('toggleSlice');
    dom.toggleFlip     = document.getElementById('toggleFlip');
    dom.toggleHeatmap  = document.getElementById('toggleHeatmap');
    dom.toggleContours = document.getElementById('toggleContours');
    dom.toggleSurface  = document.getElementById('toggleSurface');
    dom.toggleLabels   = document.getElementById('toggleLabels');
    dom.colourbarWrap  = document.getElementById('colourbarWrap');
    dom.cbCanvas       = document.getElementById('colourbar');
    dom.canvasArea     = document.getElementById('canvasArea');
    dom.canvas2d       = document.getElementById('canvas2d');
    dom.ctx            = dom.canvas2d.getContext('2d');
    dom.container3d    = document.getElementById('container3d');
    dom.containerSurface = document.getElementById('containerSurface');
    dom.currentFnLabel = document.getElementById('currentFnLabel');
    dom.infoBox        = document.getElementById('infoBox');
    dom.colourSection  = document.getElementById('colourSection');
    dom.cControls      = document.getElementById('cControls');

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
        // When switching to 3D, turn off surface (it's 2D-only)
        if (d === 3 && state.showSurface) {
          state.showSurface = false;
          dom.toggleSurface.classList.remove('active');
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
      update();
    });

    // --- Toggle buttons ---
    TA.wireToggle(dom.toggleGrad,     state, 'showGrad',     update);
    TA.wireToggle(dom.toggleHeatmap,  state, 'showHeatmap',  update);
    TA.wireToggle(dom.toggleContours, state, 'showContours', update);

    // Slice toggle (also controls c-slider visibility)
    TA.wireToggle(dom.toggleSlice, state, 'showSlice', function () {
      dom.cControls.style.display = state.showSlice ? 'flex' : 'none';
      update();
    });

    // Surface toggle (switches 2D canvas ↔ surface 3D view)
    TA.wireToggle(dom.toggleSurface, state, 'showSurface', function () {
      switchMode();
      update();
    });

    // Labels toggle (shows point + value readout on 2D canvas)
    TA.wireToggle(dom.toggleLabels, state, 'showLabels', function () {
      if (state.showLabels && !state.labelPoint) {
        // Place initial point at centre of domain
        var p = getPreset();
        state.labelPoint = { x: (p.xMin + p.xMax) / 2, y: (p.yMin + p.yMax) / 2 };
      }
      update();
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
      dom.currentFnLabel.textContent = getPreset().label;
      update();
    });

    // --- 2D click handler (reposition label point) ---
    dom.canvas2d.addEventListener('click', function (e) {
      if (state.dim !== 2 || !state.showLabels || state.showSurface) return;
      if (!dom._labelTransforms) return;
      var rect = dom.canvasArea.getBoundingClientRect();
      var px = e.clientX - rect.left;
      var py = e.clientY - rect.top;
      var T = dom._labelTransforms;
      // Check click is within plot area
      var mx = T.toMathX(px);
      var my = T.toMathY(py);
      var p = getPreset();
      if (mx >= p.xMin && mx <= p.xMax && my >= p.yMin && my <= p.yMax) {
        state.labelPoint = { x: mx, y: my };
        update();
      }
    });

    // --- Animation loop (for Three.js 3D isosurface continuous rendering) ---
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
