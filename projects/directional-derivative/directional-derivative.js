/* ==========================================================================
 * directional-derivative.js
 *
 * App-specific logic for the "Directional Derivatives" interactive teaching
 * app.  Demonstrates the directional derivative D_u f = ∇f · û via a 2D
 * field plot with an overlaid direction line, a 1D slice plot showing f
 * along that line, and an optional 3D surface view.
 *
 * Depends on:
 *   – teaching-app.js  (the TeachingApp engine — must be loaded first)
 *   – Three.js r128     (loaded from CDN, must be loaded first)
 *
 * This file is loaded from directional_derivative.html and exposes a single
 * global initialiser:  DDApp.init()
 * ========================================================================== */

var DDApp = (function () {
  'use strict';

  // Shorthand alias
  var TA = TeachingApp;


  /* ======================================================================
   * PRESET DEFINITIONS
   * ====================================================================== */

  var presets = [
    { expr: 'x + y',            fn: function(x,y){return x+y} },
    { expr: 'y',                fn: function(x,y){return y} },
    { expr: 'x² + y²',         fn: function(x,y){return x*x+y*y} },
    { expr: 'x² + 4y²',        fn: function(x,y){return x*x+4*y*y} },
    { expr: 'xy',               fn: function(x,y){return x*y} },
    { expr: 'x² − y²',         fn: function(x,y){return x*x-y*y} },
    { expr: 'x³ − xy²',        fn: function(x,y){return x*x*x-x*y*y} },
    { expr: 'x³ − 3xy + 2y²',  fn: function(x,y){return x*x*x-3*x*y+2*y*y} },
    { expr: 'xy/(1+x²+y²)',    fn: function(x,y){return x*y/(1+x*x+y*y)} },
    { expr: 'sin(x)cos(y)',     fn: function(x,y){return Math.sin(x)*Math.cos(y)} },
    { expr: 'exp(−r²)',         fn: function(x,y){return Math.exp(-0.4*(x*x+y*y))} },
    { expr: 'cos²(r)',          fn: function(x,y){var r=Math.sqrt(x*x+y*y); return Math.cos(r)*Math.cos(r)} },
  ];


  /* ======================================================================
   * DOMAIN
   * ====================================================================== */

  var XMIN = -Math.PI, XMAX = Math.PI;
  var YMIN = -Math.PI, YMAX = Math.PI;


  /* ======================================================================
   * APPLICATION STATE
   * ====================================================================== */

  var state = {
    fnIndex: 0,
    currentFn: presets[0].fn,
    currentExpr: presets[0].expr,
    isCustom: false,
    flipSign: false,
    scheme: 'palette1',
    showHeatmap: false,
    showLevelSets: false,
    showGrad: false,
    showSurface: false,
    showLabels: false,
    // Directional derivative state
    pointX: 0,
    pointY: 0,
    angleDeg: 0,
  };


  /* ======================================================================
   * GLOBAL FUNCTION RANGE (for fixed 1D plot y-axis)
   * ====================================================================== */

  var globalFmin = -1, globalFmax = 1;

  function computeGlobalRange() {
    var n = 50;
    var fmin = Infinity, fmax = -Infinity;
    for (var j = 0; j < n; j++) {
      var y = YMIN + (YMAX - YMIN) * j / (n - 1);
      for (var i = 0; i < n; i++) {
        var x = XMIN + (XMAX - XMIN) * i / (n - 1);
        var v = evalFn(x, y);
        if (v < fmin) fmin = v;
        if (v > fmax) fmax = v;
      }
    }
    var pad = (fmax - fmin || 1) * 0.05;
    globalFmin = fmin - pad;
    globalFmax = fmax + pad;
  }


  /* ======================================================================
   * DOM REFERENCES  (populated in init())
   * ====================================================================== */

  var dom = {};


  /* ======================================================================
   * THREE.JS STATE  (populated lazily on first 3D use)
   * ====================================================================== */

  var scene, camera, renderer;
  var threeInited = false;
  var surfaceMesh = null;
  var slicePlane = null;
  var sliceLine = null;
  var sliceArrow1 = null;
  var sliceArrow2 = null;
  var slicePointMarker = null;
  var orbitControls = null;


  /* ======================================================================
   * EVALUATION
   * ====================================================================== */

  function evalFn(x, y) {
    var v;
    try { v = state.currentFn(x, y); } catch(e) { v = 0; }
    if (!isFinite(v)) v = 0;
    return state.flipSign ? -v : v;
  }


  /* ======================================================================
   * EXPRESSION PARSER (delegates to TeachingApp)
   * ====================================================================== */

  function parseCustom(expr) {
    var parsed = TA.parseExpr(expr);
    return new Function('x', 'y', '"use strict"; return (' + parsed + ');');
  }


  /* ======================================================================
   * DIRECTIONAL DERIVATIVE & GRADIENT
   * ====================================================================== */

  function computeDirectionalDerivative(px, py, ux, uy) {
    var h = 1e-5;
    var fp = evalFn(px + h * ux, py + h * uy);
    var fm = evalFn(px - h * ux, py - h * uy);
    return (fp - fm) / (2 * h);
  }

  function computeGradientAt(px, py) {
    var h = 1e-5;
    var dfdx = (evalFn(px + h, py) - evalFn(px - h, py)) / (2 * h);
    var dfdy = (evalFn(px, py + h) - evalFn(px, py - h)) / (2 * h);
    return { dfdx: dfdx, dfdy: dfdy };
  }

  /** Compute the t-range where (px + t*ux, py + t*uy) stays in domain. */
  function computeLineRange(px, py, ux, uy) {
    var tmin = -100, tmax = 100;
    if (ux !== 0) {
      var t1 = (XMIN - px) / ux, t2 = (XMAX - px) / ux;
      var lo = Math.min(t1, t2), hi = Math.max(t1, t2);
      tmin = Math.max(tmin, lo); tmax = Math.min(tmax, hi);
    } else {
      if (px < XMIN || px > XMAX) return { tmin: 0, tmax: 0 };
    }
    if (uy !== 0) {
      var t3 = (YMIN - py) / uy, t4 = (YMAX - py) / uy;
      var lo2 = Math.min(t3, t4), hi2 = Math.max(t3, t4);
      tmin = Math.max(tmin, lo2); tmax = Math.min(tmax, hi2);
    } else {
      if (py < YMIN || py > YMAX) return { tmin: 0, tmax: 0 };
    }
    if (tmin > tmax) return { tmin: 0, tmax: 0 };
    return { tmin: tmin, tmax: tmax };
  }


  /* ======================================================================
   * LAYOUT
   * ====================================================================== */

  /**
   * Returns { lx, ly, lsize, rx, ry, rw, rh } for left (2D field) and
   * right (1D slice) plots.
   */
  function getLayout() {
    var rect = dom.canvasArea.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    var margin = 16;
    var topPad = 56; // space for angle controls

    var halfW = (w - margin * 3) / 2;
    var availH = h - topPad - margin * 2;
    var lsize = Math.min(halfW, availH) * 0.82;
    var lx = margin + (halfW - lsize) / 2;
    var ly = topPad + margin + (availH - lsize) / 2;

    // Fixed square aspect ratio for 1D slice
    var rx = margin * 2 + halfW + (halfW - lsize) / 2;
    var ry = ly;
    var rw = lsize;
    var rh = lsize;
    return { w: w, h: h, lx: lx, ly: ly, lsize: lsize, rx: rx, ry: ry, rw: rw, rh: rh };
  }


  /* ======================================================================
   * 2D DRAWING: HEATMAP + LEVEL SETS
   * ====================================================================== */

  function drawFieldBackground(ctx, ox, oy, size) {
    // Compute field
    var hmRes = state.showHeatmap ? Math.min(300, Math.round(size)) : 200;
    var field = TA.computeField(evalFn, hmRes, XMIN, XMAX, YMIN, YMAX);

    if (state.showHeatmap) {
      TA.drawHeatmap(ctx, field, state.scheme, ox, oy, size);
    }

    if (state.showLevelSets) {
      if (!state.showHeatmap) {
        ctx.fillStyle = '#12141c';
        ctx.fillRect(ox, oy, size, size);
      }
      TA.drawContours(ctx, field, 15, state.scheme, state.showHeatmap, ox, oy, size);
    }

    return field;
  }


  /* ======================================================================
   * 2D DRAWING: AXES
   * ====================================================================== */

  function drawAxes2D(ctx, ox, oy, size) {
    ctx.strokeStyle = '#3a3d4d';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, size, size);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = '500 20px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('x', ox + size / 2, oy + size + 10);
    ctx.fillText('y', ox - 24, oy + size / 2 - 10);
  }


  /* ======================================================================
   * 2D DRAWING: DIRECTION LINE + GRADIENT + PROJECTION
   * ====================================================================== */

  function drawDirectionLine(ctx, ox, oy, size) {
    var angleRad = state.angleDeg * Math.PI / 180;
    var ux = Math.cos(angleRad), uy = Math.sin(angleRad);
    var lr = computeLineRange(state.pointX, state.pointY, ux, uy);

    var toPixX = function(x) { return ox + (x - XMIN) / (XMAX - XMIN) * size; };
    var toPixY = function(y) { return oy + (1 - (y - YMIN) / (YMAX - YMIN)) * size; };

    // Draw dashed line across domain
    var x0 = state.pointX + lr.tmin * ux, y0 = state.pointY + lr.tmin * uy;
    var x1 = state.pointX + lr.tmax * ux, y1 = state.pointY + lr.tmax * uy;

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(toPixX(x0), toPixY(y0));
    ctx.lineTo(toPixX(x1), toPixY(y1));
    ctx.stroke();
    ctx.setLineDash([]);

    var unitVectorLength = 1.5;
    var pxPerUnit = size / (XMAX - XMIN);
    var ppx = toPixX(state.pointX), ppy = toPixY(state.pointY);
    var headLen = 8;
    var headAngle = 0.6;
    var screenAngle = Math.atan2(-uy, ux); // flip y for screen coords

    // Compute gradient for scaling arrows
    var grad = computeGradientAt(state.pointX, state.pointY);
    var gradMag = Math.sqrt(grad.dfdx * grad.dfdx + grad.dfdy * grad.dfdy);
    var Duf = computeDirectionalDerivative(state.pointX, state.pointY, ux, uy);

    // Gradient arrow screen coords (needed for projection dashed line)
    var gScreenAngle = Math.atan2(-grad.dfdy, grad.dfdx);
    var gPixLen = unitVectorLength * pxPerUnit;
    var gax = ppx + gPixLen * Math.cos(gScreenAngle);
    var gay = ppy + gPixLen * Math.sin(gScreenAngle);

    // Draw gradient arrow FIRST (so direction arrow renders on top)
    if (state.showGrad && gradMag > 0.01) {
      ctx.strokeStyle = '#88ff00';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(ppx, ppy);
      ctx.lineTo(gax, gay);
      ctx.stroke();

      ctx.fillStyle = ctx.strokeStyle;
      var gha = Math.atan2(gay - ppy, gax - ppx);
      ctx.beginPath();
      ctx.moveTo(gax, gay);
      ctx.lineTo(gax - headLen * Math.cos(gha - headAngle), gay - headLen * Math.sin(gha - headAngle));
      ctx.lineTo(gax - headLen * Math.cos(gha + headAngle), gay - headLen * Math.sin(gha + headAngle));
      ctx.closePath();
      ctx.fill();
    }

    // Draw direction arrow: unit vector along û
    var dirPixLen = unitVectorLength * pxPerUnit;
    var dax = ppx + dirPixLen * Math.cos(screenAngle);
    var day = ppy + dirPixLen * Math.sin(screenAngle);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(ppx, ppy);
    ctx.lineTo(dax, day);
    ctx.stroke();

    // Arrowhead
    var daAngle = Math.atan2(day - ppy, dax - ppx);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath();
    ctx.moveTo(dax, day);
    ctx.lineTo(dax - headLen * Math.cos(daAngle - headAngle), day - headLen * Math.sin(daAngle - headAngle));
    ctx.lineTo(dax - headLen * Math.cos(daAngle + headAngle), day - headLen * Math.sin(daAngle + headAngle));
    ctx.closePath();
    ctx.fill();

    // Draw directional derivative as projection onto û
    if (state.showGrad && gradMag > 0.01) {
      var ddDomainLen = Duf / gradMag;
      var ddPixLen = unitVectorLength * ddDomainLen * pxPerUnit;

      if (Math.abs(ddPixLen) > 1) {
        var ddx = ppx + ddPixLen * Math.cos(screenAngle);
        var ddy = ppy + ddPixLen * Math.sin(screenAngle);

        ctx.strokeStyle = '#ff8a65';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ppx, ppy);
        ctx.lineTo(ddx, ddy);
        ctx.stroke();

        // Dashed line from gradient tip to projection point
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#ff8a65';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gax, gay);
        ctx.lineTo(ddx, ddy);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw selected point (tangent-app style)
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(ppx, ppy, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }


  /* ======================================================================
   * 2D DRAWING: LABELS (on left plot)
   *
   * All labels require the Labels toggle to be on.  Each label is then
   * shown if its corresponding feature is active (û is always drawn,
   * ∇f requires showGrad, D_u f requires showGrad + visible projection).
   * ====================================================================== */

  function drawLabels(ctx, ox, oy, size) {
    if (!state.showLabels) return;

    var angleRad = state.angleDeg * Math.PI / 180;
    var ux = Math.cos(angleRad), uy = Math.sin(angleRad);

    var toPixX = function(x) { return ox + (x - XMIN) / (XMAX - XMIN) * size; };
    var toPixY = function(y) { return oy + (1 - (y - YMIN) / (YMAX - YMIN)) * size; };

    var ppx = toPixX(state.pointX), ppy = toPixY(state.pointY);
    var unitVectorLength = 1.5;
    var pxPerUnit = size / (XMAX - XMIN);
    var screenAngle = Math.atan2(-uy, ux);

    ctx.font = '500 16px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Label for û (white — direction arrow is always visible)
    var uLabelX = ppx + (unitVectorLength * pxPerUnit + 14) * Math.cos(screenAngle);
    var uLabelY = ppy + (unitVectorLength * pxPerUnit + 14) * Math.sin(screenAngle);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('û', uLabelX, uLabelY);

    // Label for ∇f (green — only when gradient is visible)
    if (state.showGrad) {
      var grad = computeGradientAt(state.pointX, state.pointY);
      var gradMag = Math.sqrt(grad.dfdx * grad.dfdx + grad.dfdy * grad.dfdy);
      if (gradMag > 0.01) {
        var gScreenAngle = Math.atan2(-grad.dfdy, grad.dfdx);
        var gLabelX = ppx + (unitVectorLength * pxPerUnit + 14) * Math.cos(gScreenAngle);
        var gLabelY = ppy + (unitVectorLength * pxPerUnit + 14) * Math.sin(gScreenAngle);
        ctx.fillStyle = '#88ff00';
        ctx.fillText('∇f', gLabelX, gLabelY);

        // Label for D_u f (orange — only when projection is visible)
        var Duf = computeDirectionalDerivative(state.pointX, state.pointY, ux, uy);
        var ddDomainLen = Duf / gradMag;
        var ddPixLen = unitVectorLength * ddDomainLen * pxPerUnit;
        if (Math.abs(ddPixLen) > 1) {
          var ddx = ppx + ddPixLen * Math.cos(screenAngle);
          var ddy = ppy + ddPixLen * Math.sin(screenAngle);
          var perpX = -Math.sin(screenAngle);
          var perpY = Math.cos(screenAngle);
          var dlx = ddx + perpX * 16;
          var dly = ddy + perpY * 16;
          ctx.fillStyle = '#ff8a65';
          ctx.fillText('D\u1D64f', dlx, dly);
        }
      }
    }

  }


  /* ======================================================================
   * 1D SLICE PLOT
   * ====================================================================== */

  function draw1DSlice(ctx, rx, ry, rw, rh) {
    var angleRad = state.angleDeg * Math.PI / 180;
    var ux = Math.cos(angleRad), uy = Math.sin(angleRad);
    var lr = computeLineRange(state.pointX, state.pointY, ux, uy);

    // Fixed display width = full diagonal
    var fixedWidth = 2 * Math.PI * Math.sqrt(2);
    var sliceWidth = lr.tmax - lr.tmin;
    var padEach = (fixedWidth - sliceWidth) / 2;
    var sDispMin = lr.tmin - padEach;
    var sDispMax = lr.tmax + padEach;
    var sDispRange = sDispMax - sDispMin;

    var plotLeft = rx;
    var plotRight = rx + rw;
    var plotTop = ry;
    var plotBottom = ry + rh;
    var plotW = plotRight - plotLeft;
    var plotH = plotBottom - plotTop;

    // Sample the function along the line
    var nSamples = 400;
    var tVals = [], fVals = [];
    for (var i = 0; i <= nSamples; i++) {
      var t = lr.tmin + (lr.tmax - lr.tmin) * i / nSamples;
      var x = state.pointX + t * ux;
      var y = state.pointY + t * uy;
      tVals.push(t);
      fVals.push(evalFn(x, y));
    }

    var fSliceMin = globalFmin;
    var fSliceMax = globalFmax;
    var fDispRange = fSliceMax - fSliceMin || 1;

    // Background
    ctx.fillStyle = '#12141c';
    ctx.fillRect(plotLeft, plotTop, plotW, plotH);
    ctx.strokeStyle = '#3a3d4d';
    ctx.lineWidth = 1;
    ctx.strokeRect(plotLeft, plotTop, plotW, plotH);

    var sToPx = function(s) { return plotLeft + (s - sDispMin) / sDispRange * plotW; };
    var fToPy = function(f) { return plotBottom - (f - fSliceMin) / fDispRange * plotH; };

    // Draw f(s) curve
    ctx.strokeStyle = '#64b5f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (var k = 0; k <= nSamples; k++) {
      var px = sToPx(tVals[k]);
      var py = fToPy(fVals[k]);
      if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Directional derivative tangent line
    var Duf = computeDirectionalDerivative(state.pointX, state.pointY, ux, uy);
    var f0 = evalFn(state.pointX, state.pointY);
    var p0x = sToPx(0);
    var p0y = fToPy(f0);

    var tangentHalfLen = sDispRange * 0.15;
    var s1 = -tangentHalfLen, s2 = tangentHalfLen;
    var f1 = f0 + Duf * s1, f2 = f0 + Duf * s2;
    ctx.strokeStyle = '#ff8a65';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(sToPx(s1), fToPy(f1));
    ctx.lineTo(sToPx(s2), fToPy(f2));
    ctx.stroke();
    ctx.setLineDash([]);

    // Point dot (tangent-app style)
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(p0x, p0y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = '#8b8fa3';
    ctx.font = '500 20px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('s (arc length)', plotLeft + plotW / 2, plotBottom + 10);
    ctx.fillText('f', plotLeft - 20, plotTop + plotH / 2 - 10);

    // Directional derivative value
    ctx.fillStyle = '#ff8a65';
    ctx.font = '500 24px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('D\u1D64f = \u2207f\u00B7\u00FB = ' + Duf.toFixed(4), plotLeft, plotTop - 10);

    // Slope annotation near tangent line (only when Labels is on)
    if (state.showLabels) {
      ctx.fillStyle = '#ff8a65';
      ctx.font = '500 16px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('D\u1D64f = slope of tangent', plotRight, plotTop + 40);
    }
  }


  /* ======================================================================
   * THREE.JS  (3D SURFACE)
   * ====================================================================== */

  function initThree() {
    if (threeInited) return;
    threeInited = true;

    var rect = dom.canvasArea.getBoundingClientRect();
    var halfW = Math.floor(rect.width / 2);

    // Use initThreeScene with a temporary sizing approach
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);

    camera = new THREE.PerspectiveCamera(45, halfW / rect.height, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(halfW, rect.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    dom.container3d.appendChild(renderer.domElement);

    // Axes
    var axisMat = new THREE.LineBasicMaterial({ color: 0x4a4d5d });
    var xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-Math.PI, 0, 0), new THREE.Vector3(Math.PI, 0, 0)
    ]);
    scene.add(new THREE.Line(xGeo, axisMat));
    var yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -Math.PI, 0), new THREE.Vector3(0, Math.PI, 0)
    ]);
    scene.add(new THREE.Line(yGeo, axisMat));
    var zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -4), new THREE.Vector3(0, 0, 3.3)
    ]);
    scene.add(new THREE.Line(zGeo, axisMat));

    var xLabel = TA.makeTextSprite('x', '#8b8fa3');
    xLabel.position.set(Math.PI + 0.4, 0, 0);
    scene.add(xLabel);
    var yLabel = TA.makeTextSprite('y', '#8b8fa3');
    yLabel.position.set(0, Math.PI + 0.4, 0);
    scene.add(yLabel);
    var zLabel = TA.makeTextSprite('z', '#8b8fa3');
    zLabel.position.set(0, 0, 3.7);
    scene.add(zLabel);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 5, 10);
    scene.add(dirLight);

    orbitControls = TA.initOrbitControls(dom.container3d, camera, {
      azimuth: -Math.PI / 3,
      elevation: Math.PI / 5,
      radius: 18,
    });
  }

  function drawSurface() {
    initThree();
    var res = 100;
    var field = TA.computeField(evalFn, res, XMIN, XMAX, YMIN, YMAX);

    // Remove old surface
    if (surfaceMesh) {
      TA.disposeObject(scene, surfaceMesh);
      surfaceMesh = null;
    }

    var geometry = new THREE.BufferGeometry();
    var vertices = [], colors = [], indices = [];

    var maxAbs = Math.max(Math.abs(field.fmin), Math.abs(field.fmax)) || 1;
    var zScale = 3.0 / maxAbs;
    var range = field.fmax - field.fmin || 1;

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

    for (var j2 = 0; j2 < res - 1; j2++) {
      for (var i2 = 0; i2 < res - 1; i2++) {
        var a = j2 * res + i2, b = a + 1, c = (j2+1) * res + i2, d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    surfaceMesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({
      vertexColors: true, side: THREE.DoubleSide, shininess: 30
    }));
    scene.add(surfaceMesh);

    updateSlice(zScale, field);

    renderer.render(scene, camera);

    if (!window._animating3dDD) {
      window._animating3dDD = true;
      (function animate() {
        if (state.showSurface) renderer.render(scene, camera);
        requestAnimationFrame(animate);
      })();
    }
  }

  function updateSlice(zScale, field) {
    // Remove old slice objects
    [slicePlane, sliceLine, sliceArrow1, sliceArrow2, slicePointMarker].forEach(function(obj) {
      if (obj) TA.disposeObject(scene, obj);
    });
    slicePlane = sliceLine = sliceArrow1 = sliceArrow2 = slicePointMarker = null;

    var angleRad = state.angleDeg * Math.PI / 180;
    var ux = Math.cos(angleRad), uy = Math.sin(angleRad);
    var lr = computeLineRange(state.pointX, state.pointY, ux, uy);

    if (lr.tmax - lr.tmin < 0.01) return;

    var maxAbs = Math.max(Math.abs(field.fmin), Math.abs(field.fmax)) || 1;
    var zScaleVal = zScale || 3.0 / maxAbs;

    var zLo = -4, zHi = 3.3;

    // Slice plane quad
    var px0 = state.pointX + lr.tmin * ux, py0 = state.pointY + lr.tmin * uy;
    var px1 = state.pointX + lr.tmax * ux, py1 = state.pointY + lr.tmax * uy;

    var planeGeo = new THREE.BufferGeometry();
    var pv = new Float32Array([
      px0, py0, zLo, px1, py1, zLo, px1, py1, zHi, px0, py0, zHi
    ]);
    planeGeo.setAttribute('position', new THREE.BufferAttribute(pv, 3));
    planeGeo.setIndex([0, 1, 2, 0, 2, 3]);
    planeGeo.computeVertexNormals();

    slicePlane = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.15,
      side: THREE.DoubleSide, depthWrite: false
    }));
    scene.add(slicePlane);

    // White line on surface
    var nPts = 200;
    var linePoints = [];
    for (var i = 0; i <= nPts; i++) {
      var tt = lr.tmin + (lr.tmax - lr.tmin) * i / nPts;
      var lx = state.pointX + tt * ux;
      var ly = state.pointY + tt * uy;
      linePoints.push(new THREE.Vector3(lx, ly, evalFn(lx, ly) * zScaleVal));
    }

    var lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
    sliceLine = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
      color: 0xffffff, linewidth: 2
    }));
    scene.add(sliceLine);

    // Direction arrows at 20% and 80% along the line
    [0.20, 0.80].forEach(function(frac, idx) {
      var arrowT = lr.tmin + (lr.tmax - lr.tmin) * frac;
      var ax = state.pointX + arrowT * ux;
      var ay = state.pointY + arrowT * uy;
      var az = evalFn(ax, ay) * zScaleVal;

      var dt = 0.001;
      var aheadX = state.pointX + (arrowT + dt) * ux;
      var aheadY = state.pointY + (arrowT + dt) * uy;
      var aheadZ = evalFn(aheadX, aheadY) * zScaleVal;
      var dir = new THREE.Vector3(aheadX - ax, aheadY - ay, aheadZ - az).normalize();

      var coneGeo = new THREE.ConeGeometry(0.08, 0.25, 24);
      var coneMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      var cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(ax, ay, az);

      var defaultDir = new THREE.Vector3(0, 1, 0);
      cone.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(defaultDir, dir));
      scene.add(cone);

      if (idx === 0) sliceArrow1 = cone;
      else sliceArrow2 = cone;
    });

    // Point marker on surface
    var fAtPoint = evalFn(state.pointX, state.pointY);
    var sphereGeo = new THREE.SphereGeometry(0.08, 16, 16);
    var sphereMat = new THREE.MeshBasicMaterial({ color: 0xe53935 });
    slicePointMarker = new THREE.Mesh(sphereGeo, sphereMat);
    slicePointMarker.position.set(state.pointX, state.pointY, fAtPoint * zScaleVal);
    scene.add(slicePointMarker);
  }


  /* ======================================================================
   * FUNCTION LABEL
   * ====================================================================== */

  function updateLabel() {
    if (state.flipSign) {
      dom.currentFnLabel.textContent = 'f(x,y) = \u2212(' + state.currentExpr + ')';
    } else {
      dom.currentFnLabel.textContent = 'f(x,y) = ' + state.currentExpr;
    }
  }


  /* ======================================================================
   * COLOUR BAR
   * ====================================================================== */

  function updateColourbar() {
    if (state.showHeatmap || state.showLevelSets) {
      TA.drawColourbar(dom.cbCanvas, state.scheme);
      dom.colourbarWrap.style.display = 'flex';
    } else {
      dom.colourbarWrap.style.display = 'none';
    }
  }


  /* ======================================================================
   * UPDATE (main render dispatch)
   * ====================================================================== */

  function update() {
    var ctx = dom.ctx;
    var rect = dom.canvasArea.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    var L = getLayout();

    if (state.showSurface) {
      // Surface mode: 3D on left, canvas for 1D slice on right
      dom.container3d.style.display = 'block';
      dom.container3d.style.width = Math.floor(w / 2) + 'px';
      dom.container3d.style.height = h + 'px';
      dom.canvas2d.style.display = 'block';

      ctx.clearRect(0, 0, w, h);
      drawSurface();
      draw1DSlice(ctx, L.rx, L.ry, L.rw, L.rh);
    } else {
      // 2D mode
      dom.container3d.style.display = 'none';
      dom.canvas2d.style.display = 'block';
      ctx.clearRect(0, 0, w, h);

      // Draw background layers in order
      var hasBackground = state.showHeatmap || state.showLevelSets;
      if (hasBackground) {
        drawFieldBackground(ctx, L.lx, L.ly, L.lsize);
      } else {
        // Dark background
        ctx.fillStyle = '#12141c';
        ctx.fillRect(L.lx, L.ly, L.lsize, L.lsize);
      }

      drawAxes2D(ctx, L.lx, L.ly, L.lsize);
      drawDirectionLine(ctx, L.lx, L.ly, L.lsize);
      drawLabels(ctx, L.lx, L.ly, L.lsize);
      draw1DSlice(ctx, L.rx, L.ry, L.rw, L.rh);
    }

    updateLabel();
    updateColourbar();
  }


  /* ======================================================================
   * RESIZE
   * ====================================================================== */

  function resize() {
    TA.resizeCanvas(dom.canvas2d, dom.ctx, dom.canvasArea);
    if (renderer) {
      var rect = dom.canvasArea.getBoundingClientRect();
      var halfW = Math.floor(rect.width / 2);
      renderer.setSize(halfW, rect.height);
      camera.aspect = halfW / rect.height;
      camera.updateProjectionMatrix();
    }
    update();
  }


  /* ======================================================================
   * INIT
   * ====================================================================== */

  function init() {
    // ── DOM references ──
    dom.panel = document.getElementById('panel');
    dom.collapseBtn = document.getElementById('collapseBtn');
    dom.openBtn = document.getElementById('openBtn');
    dom.canvasArea = document.getElementById('canvasArea');
    dom.canvas2d = document.getElementById('canvas2d');
    dom.ctx = dom.canvas2d.getContext('2d');
    dom.container3d = document.getElementById('container3d');
    dom.fnSelect = document.getElementById('fnSelect');
    dom.customInput = document.getElementById('customExpr');
    dom.errorMsg = document.getElementById('errorMsg');
    dom.currentFnLabel = document.getElementById('currentFnLabel');
    dom.toggleFlip = document.getElementById('toggleFlip');
    dom.toggleGrad = document.getElementById('toggleGrad');
    dom.toggleHeatmap = document.getElementById('toggleHeatmap');
    dom.toggleLevelSets = document.getElementById('toggleLevelSets');
    dom.toggleSurface = document.getElementById('toggleSurface');
    dom.toggleLabels = document.getElementById('toggleLabels');
    dom.angleSlider = document.getElementById('angleSlider');
    dom.angleValue = document.getElementById('angleValue');
    dom.colourbarWrap = document.getElementById('colourbarWrap');
    dom.cbCanvas = document.getElementById('colourbar');
    dom.infoBox = document.getElementById('infoBox');

    // ── Sidebar ──
    TA.initSidebar({
      panel: dom.panel,
      collapseBtn: dom.collapseBtn,
      openBtn: dom.openBtn,
      onResize: resize,
    });

    // ── Overlays ──
    TA.initOverlay({
      overlay: document.getElementById('helpOverlay'),
      closeBtn: document.getElementById('helpClose'),
      triggerBtn: document.getElementById('btnHelp'),
    });
    TA.initOverlay({
      overlay: document.getElementById('overviewOverlay'),
      closeBtn: document.getElementById('overviewClose'),
      triggerBtn: document.getElementById('btnOverview'),
    });

    // ── Preset dropdown ──
    presets.forEach(function(p, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.expr;
      dom.fnSelect.appendChild(opt);
    });

    dom.fnSelect.addEventListener('change', function() {
      var i = parseInt(dom.fnSelect.value);
      state.fnIndex = i;
      state.currentFn = presets[i].fn;
      state.currentExpr = presets[i].expr;
      state.isCustom = false;
      dom.customInput.value = '';
      dom.errorMsg.textContent = '';
      dom.customInput.classList.remove('error');
      computeGlobalRange();
      update();
    });

    // ── Custom expression input ──
    dom.customInput.addEventListener('input', function() {
      var val = dom.customInput.value.trim();
      if (!val) {
        dom.errorMsg.textContent = '';
        dom.customInput.classList.remove('error');
        return;
      }
      try {
        var fn = parseCustom(val);
        var test = fn(1, 1);
        if (typeof test !== 'number' || !isFinite(test)) throw new Error();
        state.currentFn = fn;
        state.currentExpr = val;
        state.isCustom = true;
        dom.errorMsg.textContent = '';
        dom.customInput.classList.remove('error');
        dom.fnSelect.value = '';
        computeGlobalRange();
        update();
      } catch(e) {
        dom.errorMsg.textContent = 'Invalid expression';
        dom.customInput.classList.add('error');
      }
    });

    // ── Toggle buttons (with mutual exclusion: 2D layers ↔ surface) ──

    // Helper: disable surface when a 2D layer is turned on
    function disable2DLayers() {
      state.showHeatmap = false;
      state.showLevelSets = false;
      state.showGrad = false;
      dom.toggleHeatmap.classList.remove('active');
      dom.toggleLevelSets.classList.remove('active');
      dom.toggleGrad.classList.remove('active');
    }

    function disableSurface() {
      state.showSurface = false;
      dom.toggleSurface.classList.remove('active');
    }

    // 2D layer toggles: each disables surface if turning on
    [['toggleHeatmap', 'showHeatmap'],
     ['toggleLevelSets', 'showLevelSets'],
     ['toggleGrad', 'showGrad']].forEach(function(pair) {
      var elKey = pair[0], stateKey = pair[1];
      dom[elKey].addEventListener('click', function() {
        state[stateKey] = !state[stateKey];
        dom[elKey].classList.toggle('active', state[stateKey]);
        if (state[stateKey]) disableSurface();
        update();
      });
    });

    // Surface toggle: disables 2D layers if turning on
    dom.toggleSurface.addEventListener('click', function() {
      state.showSurface = !state.showSurface;
      dom.toggleSurface.classList.toggle('active', state.showSurface);
      if (state.showSurface) disable2DLayers();
      update();
    });

    TA.wireToggle(dom.toggleLabels, state, 'showLabels', update);

    // --- Colour inversion button ---
    document.getElementById('toggleInvert').addEventListener('click', function() {
      this.classList.toggle('active');
      document.documentElement.classList.toggle('inverted');
    });

    // Flip sign toggle (special: also flips globalFmin/globalFmax)
    dom.toggleFlip.addEventListener('click', function() {
      state.flipSign = !state.flipSign;
      dom.toggleFlip.classList.toggle('active', state.flipSign);
      var oldMin = globalFmin, oldMax = globalFmax;
      globalFmin = -oldMax;
      globalFmax = -oldMin;
      update();
    });

    // ── Colour scheme buttons ──
    document.querySelectorAll('[data-scheme]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        state.scheme = btn.dataset.scheme;
        document.querySelectorAll('[data-scheme]').forEach(function(b) {
          b.classList.toggle('active', b === btn);
        });
        update();
      });
    });

    // ── Angle slider ──
    dom.angleSlider.addEventListener('input', function() {
      state.angleDeg = parseInt(dom.angleSlider.value);
      dom.angleValue.textContent = state.angleDeg + '°';
      update();
    });

    // ── Click/drag on 2D plot to select point ──
    var isDragging = false;

    function handlePointerOnPlot(e) {
      var rect = dom.canvasArea.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      var L = getLayout();

      if (cx >= L.lx && cx <= L.lx + L.lsize && cy >= L.ly && cy <= L.ly + L.lsize) {
        var fracX = (cx - L.lx) / L.lsize;
        var fracY = 1 - (cy - L.ly) / L.lsize;
        state.pointX = Math.max(XMIN, Math.min(XMAX, XMIN + fracX * (XMAX - XMIN)));
        state.pointY = Math.max(YMIN, Math.min(YMAX, YMIN + fracY * (YMAX - YMIN)));
        update();
        return true;
      }
      return false;
    }

    dom.canvas2d.addEventListener('pointerdown', function(e) {
      if (handlePointerOnPlot(e)) {
        isDragging = true;
        dom.canvas2d.setPointerCapture(e.pointerId);
      }
    });
    dom.canvas2d.addEventListener('pointermove', function(e) {
      if (isDragging) handlePointerOnPlot(e);
    });
    dom.canvas2d.addEventListener('pointerup', function() { isDragging = false; });
    dom.canvas2d.addEventListener('pointercancel', function() { isDragging = false; });

    // ── Resize ──
    window.addEventListener('resize', resize);

    // ── Teaching pointer ──
    TA.initPointer('.canvas-area');

    // ── Initial render ──
    computeGlobalRange();
    TA.resizeCanvas(dom.canvas2d, dom.ctx, dom.canvasArea);
    update();
  }


  /* ======================================================================
   * PUBLIC API
   * ====================================================================== */

  return {
    init: init,
  };

})();
