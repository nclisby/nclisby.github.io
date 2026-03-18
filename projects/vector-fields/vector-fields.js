/* ==========================================================================
 * vector_fields.js
 *
 * App-specific logic for the "Vector Fields" interactive teaching app.
 * Visualises 2D and 3D vector fields with arrows, and optionally overlays
 * divergence or curl as a scalar heatmap/contour plot (2D only).
 *
 * Depends on:
 *   – teaching-app.js  (the TeachingApp engine — must be loaded first)
 *   – Three.js r128     (loaded from CDN, must be loaded first)
 *
 * This file is loaded from vector_fields.html and exposes a single
 * global initialiser:  VFApp.init()
 * ========================================================================== */

var VFApp = (function () {
  'use strict';

  var TA = TeachingApp;


  /* ======================================================================
   * PRESET DEFINITIONS
   * ====================================================================== */

  var presets2D = [
    { expr: '(y, 0)',             fn: function(x,y){return [y, 0]} },
    { expr: '(1, 2)',             fn: function(x,y){return [1, 2]} },
    { expr: '(x, y)',             fn: function(x,y){return [x, y]} },
    { expr: '(x/r, y/r)',        fn: function(x,y){ var r=Math.sqrt(x*x+y*y); if(r<0.2) return [0,0]; return [x/r, y/r]; } },
    { expr: '(x/r\u00B2, y/r\u00B2)', fn: function(x,y){ var r2=x*x+y*y; if(r2<0.1) return [0,0]; return [x/r2, y/r2]; } },
    { expr: '(\u2212y, x)',       fn: function(x,y){return [-y, x]} },
    { expr: '(\u2212y/r, x/r)',   fn: function(x,y){ var r=Math.sqrt(x*x+y*y); if(r<0.2) return [0,0]; return [-y/r, x/r]; } },
    { expr: '(\u2212y/r\u00B2, x/r\u00B2)', fn: function(x,y){ var r2=x*x+y*y; if(r2<0.1) return [0,0]; return [-y/r2, x/r2]; } },
    { expr: '(x, \u2212y)',       fn: function(x,y){return [x, -y]} },
    { expr: '(x\u2212y, x+y)',    fn: function(x,y){return [x-y, x+y]} },
    { expr: '(\u2212y\u00B2, x\u00B2)', fn: function(x,y){return [-y*y, x*x]} },
    { expr: '(x\u00B2, y\u00B2)', fn: function(x,y){return [x*x, y*y]} },
    { expr: '(xy, x\u00B2\u2212y\u00B2)', fn: function(x,y){return [x*y, x*x-y*y]} },
  ];

  var presets3D = [
    { expr: '(x, y, z)',          fn: function(x,y,z){return [x, y, z]} },
    { expr: '(x/r, y/r, z/r)',    fn: function(x,y,z){ var r=Math.sqrt(x*x+y*y+z*z); return [x/r, y/r, z/r]; } },
    { expr: '(\u2212y, x, 1)',    fn: function(x,y,z){return [-y, x, 1]} },
  ];


  /* ======================================================================
   * DOMAIN
   * ====================================================================== */

  var XMIN = -Math.PI, XMAX = Math.PI;
  var YMIN = -Math.PI, YMAX = Math.PI;
  var ZMIN = -Math.PI, ZMAX = Math.PI;


  /* ======================================================================
   * APPLICATION STATE
   * ====================================================================== */

  var state = {
    mode: '2d',
    presetIndex: 0,
    flipSign: false,
    density2d: 10,
    density3d: 5,
    isCustom: false,
    showDiv: false,
    showCurl: false,
    overlayHeatmap: false,
    overlayLevelSets: false,
    scheme: 'palette1',
    showLabels: false,
    labelX: 0,
    labelY: 0,
  };

  // Custom field state
  var customField2D = null; // { fx, fy, exprFx, exprFy }
  var customField3D = null; // { fx, fy, fz, exprFx, exprFy, exprFz }

  // Per-mode saved state
  var savedState = {
    '2d': { presetIndex: 0, isCustom: false, showDiv: false, showCurl: false },
    '3d': { presetIndex: 0, isCustom: false },
  };

  function getCurrentPresets() { return state.mode === '2d' ? presets2D : presets3D; }
  function getCurrentPreset() { return getCurrentPresets()[state.presetIndex]; }


  /* ======================================================================
   * DOM REFERENCES  (populated in init())
   * ====================================================================== */

  var dom = {};


  /* ======================================================================
   * THREE.JS STATE  (populated lazily on first 3D use)
   * ====================================================================== */

  var scene, camera, renderer;
  var arrowGroup = null;
  var threeInited = false;
  var orbitControls = null;


  /* ======================================================================
   * EXPRESSION PARSER  (delegates to TeachingApp)
   * ====================================================================== */

  function parseExprVars(expr, vars) {
    var parsed = TA.parseExpr(expr);
    return new Function(vars[0], vars[1], vars.length > 2 ? vars[2] : '_z',
                        '"use strict"; return (' + parsed + ');');
  }


  /* ======================================================================
   * CUSTOM INPUT PARSING
   * ====================================================================== */

  function tryParseCustom2D() {
    var fxStr = dom.customFx.value.trim();
    var fyStr = dom.customFy.value.trim();
    if (!fxStr && !fyStr) {
      dom.errorMsg2d.textContent = '';
      dom.customFx.classList.remove('error');
      dom.customFy.classList.remove('error');
      customField2D = null;
      return;
    }
    if (!fxStr || !fyStr) {
      dom.errorMsg2d.textContent = 'Enter both components';
      return;
    }
    try {
      var fx = parseExprVars(fxStr, ['x', 'y']);
      var fy = parseExprVars(fyStr, ['x', 'y']);
      var tx = fx(1, 1), ty = fy(1, 1);
      if (typeof tx !== 'number' || !isFinite(tx)) throw new Error();
      if (typeof ty !== 'number' || !isFinite(ty)) throw new Error();
      customField2D = { fx: fx, fy: fy, exprFx: fxStr, exprFy: fyStr };
      dom.errorMsg2d.textContent = '';
      dom.customFx.classList.remove('error');
      dom.customFy.classList.remove('error');
      dom.fnSelect.value = '';
      state.isCustom = true;
      update();
    } catch(e) {
      dom.errorMsg2d.textContent = 'Invalid expression';
      dom.customFx.classList.add('error');
      dom.customFy.classList.add('error');
    }
  }

  function tryParseCustom3D() {
    var fxStr = dom.customFx3.value.trim();
    var fyStr = dom.customFy3.value.trim();
    var fzStr = dom.customFz3.value.trim();
    if (!fxStr && !fyStr && !fzStr) {
      dom.errorMsg3d.textContent = '';
      dom.customFx3.classList.remove('error');
      dom.customFy3.classList.remove('error');
      dom.customFz3.classList.remove('error');
      customField3D = null;
      return;
    }
    if (!fxStr || !fyStr || !fzStr) {
      dom.errorMsg3d.textContent = 'Enter all three components';
      return;
    }
    try {
      var fx = parseExprVars(fxStr, ['x', 'y', 'z']);
      var fy = parseExprVars(fyStr, ['x', 'y', 'z']);
      var fz = parseExprVars(fzStr, ['x', 'y', 'z']);
      var tx = fx(1,1,1), ty = fy(1,1,1), tz = fz(1,1,1);
      if (typeof tx !== 'number' || !isFinite(tx)) throw new Error();
      if (typeof ty !== 'number' || !isFinite(ty)) throw new Error();
      if (typeof tz !== 'number' || !isFinite(tz)) throw new Error();
      customField3D = { fx: fx, fy: fy, fz: fz, exprFx: fxStr, exprFy: fyStr, exprFz: fzStr };
      dom.errorMsg3d.textContent = '';
      dom.customFx3.classList.remove('error');
      dom.customFy3.classList.remove('error');
      dom.customFz3.classList.remove('error');
      dom.fnSelect.value = '';
      state.isCustom = true;
      update();
    } catch(e) {
      dom.errorMsg3d.textContent = 'Invalid expression';
      dom.customFx3.classList.add('error');
      dom.customFy3.classList.add('error');
      dom.customFz3.classList.add('error');
    }
  }


  /* ======================================================================
   * EVALUATION
   * ====================================================================== */

  function eval2D(x, y) {
    var vx, vy;
    if (state.isCustom && customField2D) {
      try { vx = customField2D.fx(x, y); } catch(e) { vx = 0; }
      try { vy = customField2D.fy(x, y); } catch(e) { vy = 0; }
    } else {
      var result = getCurrentPreset().fn(x, y);
      vx = result[0]; vy = result[1];
    }
    if (!isFinite(vx)) vx = 0;
    if (!isFinite(vy)) vy = 0;
    if (state.flipSign) { vx = -vx; vy = -vy; }
    return [vx, vy];
  }

  function eval3D(x, y, z) {
    var vx, vy, vz;
    if (state.isCustom && customField3D) {
      try { vx = customField3D.fx(x, y, z); } catch(e) { vx = 0; }
      try { vy = customField3D.fy(x, y, z); } catch(e) { vy = 0; }
      try { vz = customField3D.fz(x, y, z); } catch(e) { vz = 0; }
    } else {
      var result = getCurrentPreset().fn(x, y, z);
      vx = result[0]; vy = result[1]; vz = result[2];
    }
    if (!isFinite(vx)) vx = 0;
    if (!isFinite(vy)) vy = 0;
    if (!isFinite(vz)) vz = 0;
    if (state.flipSign) { vx = -vx; vy = -vy; vz = -vz; }
    return [vx, vy, vz];
  }


  /* ======================================================================
   * DIVERGENCE & CURL  (2D scalar field computation)
   * ====================================================================== */

  function computeScalarField(res, type) {
    var h = 1e-5;
    var data = new Float64Array(res * res);
    var fmin = Infinity, fmax = -Infinity;
    for (var j = 0; j < res; j++) {
      var y = YMIN + (YMAX - YMIN) * j / (res - 1);
      for (var i = 0; i < res; i++) {
        var x = XMIN + (XMAX - XMIN) * i / (res - 1);
        var v;
        if (type === 'div') {
          var fxp = eval2D(x + h, y)[0];
          var fxm = eval2D(x - h, y)[0];
          var fyp = eval2D(x, y + h)[1];
          var fym = eval2D(x, y - h)[1];
          v = (fxp - fxm) / (2*h) + (fyp - fym) / (2*h);
        } else {
          var fyxp = eval2D(x + h, y)[1];
          var fyxm = eval2D(x - h, y)[1];
          var fxyp = eval2D(x, y + h)[0];
          var fxym = eval2D(x, y - h)[0];
          v = (fyxp - fyxm) / (2*h) - (fxyp - fxym) / (2*h);
        }
        if (!isFinite(v)) v = 0;
        data[j * res + i] = v;
        if (v < fmin) fmin = v;
        if (v > fmax) fmax = v;
      }
    }

    // Symmetrise range around zero
    var maxf = Math.max(Math.abs(fmin), Math.abs(fmax));
    fmin = -maxf;
    fmax = maxf;

    // Enforce minimum range for near-zero fields
    if (fmax < 0.01) {
      fmin = -1.0;
      fmax = 1.0;
    }

    return { data: data, fmin: fmin, fmax: fmax, res: res };
  }


  /* ======================================================================
   * 2D OVERLAY DRAWING  (heatmap / contours for div or curl)
   * ====================================================================== */

  function drawOverlayHeatmap(ctx, ox, oy, size, field) {
    var res = field.res;
    var range = field.fmax - field.fmin || 1;
    var imgData = ctx.createImageData(res, res);
    for (var j = 0; j < res; j++) {
      for (var i = 0; i < res; i++) {
        var v = field.data[j * res + i];
        var t = (v - field.fmin) / range;
        var rgb = TA.sampleColourMap(state.scheme, t);
        var idx = ((res - 1 - j) * res + i) * 4;
        imgData.data[idx]   = Math.round(rgb[0] * 255);
        imgData.data[idx+1] = Math.round(rgb[1] * 255);
        imgData.data[idx+2] = Math.round(rgb[2] * 255);
        imgData.data[idx+3] = 255;
      }
    }
    var offscreen = document.createElement('canvas');
    offscreen.width = res; offscreen.height = res;
    offscreen.getContext('2d').putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, ox, oy, size, size);
  }

  function drawOverlayContours(ctx, ox, oy, size, field, showHeatmap) {
    var res = field.res;
    var range = field.fmax - field.fmin || 1;
    var nLevels = 15;

    for (var l = 0; l < nLevels; l++) {
      var threshold = field.fmin + (l + 1) * range / (nLevels + 1);
      var t = (threshold - field.fmin) / range;
      var rgb = TA.sampleColourMap(state.scheme, t);
      ctx.strokeStyle = showHeatmap ? 'rgba(255,255,255,0.5)' : TA.colourToCSS(rgb);
      ctx.lineWidth = 1.2;
      ctx.beginPath();

      for (var j = 0; j < res - 1; j++) {
        for (var i = 0; i < res - 1; i++) {
          var v00 = field.data[j * res + i];
          var v10 = field.data[j * res + i + 1];
          var v01 = field.data[(j+1) * res + i];
          var v11 = field.data[(j+1) * res + i + 1];
          var b00 = v00 >= threshold ? 1 : 0;
          var b10 = v10 >= threshold ? 1 : 0;
          var b01 = v01 >= threshold ? 1 : 0;
          var b11 = v11 >= threshold ? 1 : 0;
          var cell = b00 | (b10 << 1) | (b11 << 2) | (b01 << 3);
          if (cell === 0 || cell === 15) continue;

          var cpx = function(cx) { return ox + cx * size / (res - 1); };
          var cpy = function(cy) { return oy + (res - 1 - cy) * size / (res - 1); };
          var interp = function(va, vb) { return (threshold - va) / (vb - va); };
          var top    = [i + interp(v00, v10), j];
          var right  = [i + 1, j + interp(v10, v11)];
          var bottom = [i + interp(v01, v11), j + 1];
          var left   = [i, j + interp(v00, v01)];

          var segs = [];
          switch(cell) {
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
            ctx.moveTo(cpx(segs[s][0][0]), cpy(segs[s][0][1]));
            ctx.lineTo(cpx(segs[s][1][0]), cpy(segs[s][1][1]));
          }
        }
      }
      ctx.stroke();
    }
  }


  /* ======================================================================
   * COLOUR BAR  (with min/max labels)
   * ====================================================================== */

  function drawColourbar(fmin, fmax) {
    var cbCtx = dom.cbCanvas.getContext('2d');
    for (var j = 0; j < 200; j++) {
      var t = 1 - j / 199;
      var rgb = TA.sampleColourMap(state.scheme, t);
      cbCtx.fillStyle = TA.colourToCSS(rgb);
      cbCtx.fillRect(0, j, 16, 1);
    }
    dom.cbMax.textContent = fmax.toFixed(2);
    dom.cbMin.textContent = fmin.toFixed(2);
  }


  /* ======================================================================
   * OVERLAY UI  (show/hide overlay options, colour bar, overlay label)
   * ====================================================================== */

  function updateOverlayUI() {
    var anyOverlay = state.showDiv || state.showCurl;
    dom.overlayOptions.style.display = anyOverlay ? 'block' : 'none';
    dom.colourbarWrap.style.display = (anyOverlay && state.mode === '2d') ? 'flex' : 'none';
    dom.overlayLabel.style.display = (anyOverlay && state.mode === '2d') ? 'block' : 'none';
    dom.colourSection.style.display = (anyOverlay && state.mode === '2d') ? '' : 'none';
    if (state.showDiv && state.showCurl) {
      dom.overlayLabel.textContent = '\u2207\u00B7F and \u2207\u00D7F';
    } else if (state.showDiv) {
      dom.overlayLabel.textContent = '\u2207\u00B7F';
    } else if (state.showCurl) {
      dom.overlayLabel.textContent = '\u2207\u00D7F';
    }
  }


  /* ======================================================================
   * 2D DRAWING
   * ====================================================================== */

  function draw2D() {
    var ctx = dom.ctx;
    var rect = dom.canvasArea.getBoundingClientRect();
    var w = rect.width, h = rect.height;
    var size = Math.min(w, h) * 0.65;
    var ox = (w - size) / 2, oy = (h - size) / 2;
    var n = state.density2d;

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#12141c';
    ctx.fillRect(ox, oy, size, size);

    // Draw divergence or curl overlay if active
    var overlayActive = state.showDiv || state.showCurl;
    var anyDisplay = state.overlayHeatmap || state.overlayLevelSets;
    if (overlayActive && anyDisplay) {
      var type = state.showDiv ? 'div' : 'curl';
      var overlayRes = 500;
      var field = computeScalarField(overlayRes, type);

      if (state.overlayHeatmap) {
        drawOverlayHeatmap(ctx, ox, oy, size, field);
      }
      if (state.overlayLevelSets) {
        drawOverlayContours(ctx, ox, oy, size, field, state.overlayHeatmap);
      }

      drawColourbar(field.fmin, field.fmax);
      dom.colourbarWrap.style.display = 'flex';
    } else {
      dom.colourbarWrap.style.display = 'none';
    }

    // Compute arrows and find max magnitude
    var arrows = [];
    var maxMag = 0;
    for (var j = 0; j < n; j++) {
      for (var i = 0; i < n; i++) {
        var x = XMIN + (XMAX - XMIN) * (i + 0.5) / n;
        var y = YMIN + (YMAX - YMIN) * (j + 0.5) / n;
        var result = eval2D(x, y);
        var vx = result[0], vy = result[1];
        var mag = Math.sqrt(vx * vx + vy * vy);
        arrows.push({ x: x, y: y, vx: vx, vy: vy, mag: mag });
        if (mag > maxMag) maxMag = mag;
      }
    }

    if (maxMag === 0) { drawAxes2D(ctx, ox, oy, size); drawLabelPoint(ctx, ox, oy, size); updateLabel(); return; }

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
    drawAxes2D(ctx, ox, oy, size);
    drawLabelPoint(ctx, ox, oy, size);
    updateLabel();
  }

  function drawAxes2D(ctx, ox, oy, size) {
    ctx.strokeStyle = '#3a3d4d';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, size, size);

    ctx.fillStyle = '#8b8fa3';
    ctx.font = '500 24px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('x', ox + size / 2, oy + size + 20);
    ctx.fillText('y', ox - 30, oy + size / 2 - 10);
  }

  /** Draw the labelled evaluation point (only when Labels is on). */
  function drawLabelPoint(ctx, ox, oy, size) {
    if (!state.showLabels) return;

    var toPixX = function(x) { return ox + (x - XMIN) / (XMAX - XMIN) * size; };
    var toPixY = function(y) { return oy + (1 - (y - YMIN) / (YMAX - YMIN)) * size; };

    var ppx = toPixX(state.labelX);
    var ppy = toPixY(state.labelY);

    // Point dot (tangent-app style)
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(ppx, ppy, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Evaluate field at point
    var result = eval2D(state.labelX, state.labelY);
    var vx = result[0], vy = result[1];

    // Format label text
    var xStr = state.labelX.toFixed(2);
    var yStr = state.labelY.toFixed(2);
    var fxStr = vx.toFixed(2);
    var fyStr = vy.toFixed(2);
    var labelStr = 'F(' + xStr + ', ' + yStr + ') = (' + fxStr + ', ' + fyStr + ')';

    // Position label to the right of the point, or left if near right edge
    ctx.font = '500 20px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';

    // Place label to the right; if too close to right edge, place to the left
    var textWidth = ctx.measureText(labelStr).width;
    var labelOffsetX = 12;
    var labelOffsetY = -14;
    if (ppx + labelOffsetX + textWidth > ox + size - 5) {
      ctx.textAlign = 'right';
      ctx.fillText(labelStr, ppx - labelOffsetX, ppy + labelOffsetY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(labelStr, ppx + labelOffsetX, ppy + labelOffsetY);
    }
  }


  /* ======================================================================
   * THREE.JS  (3D)
   * ====================================================================== */

  function initThree() {
    if (threeInited) return;
    threeInited = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);

    var rect = dom.canvasArea.getBoundingClientRect();
    camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(rect.width, rect.height);
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
      new THREE.Vector3(0, 0, -Math.PI), new THREE.Vector3(0, 0, Math.PI)
    ]);
    scene.add(new THREE.Line(zGeo, axisMat));

    var xLabel = TA.makeTextSprite('x', '#8b8fa3');
    xLabel.position.set(Math.PI + 0.4, 0, 0);
    scene.add(xLabel);
    var yLabel = TA.makeTextSprite('y', '#8b8fa3');
    yLabel.position.set(0, Math.PI + 0.4, 0);
    scene.add(yLabel);
    var zLabel = TA.makeTextSprite('z', '#8b8fa3');
    zLabel.position.set(0, 0, Math.PI + 0.4);
    scene.add(zLabel);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 5, 10);
    scene.add(dirLight);

    orbitControls = TA.initOrbitControls(dom.container3d, camera, {
      azimuth: -Math.PI / 3,
      elevation: Math.PI / 5,
      radius: 13,
    });
  }

  function draw3D() {
    initThree();

    // Remove old arrows
    if (arrowGroup) {
      scene.remove(arrowGroup);
      arrowGroup.traverse(function(c) {
        if (c.geometry) c.geometry.dispose();
        if (c.material) c.material.dispose();
      });
      arrowGroup = null;
    }

    var n = state.density3d;
    var group = new THREE.Group();

    // Compute all arrows and find max magnitude
    var arrows = [];
    var maxMag = 0;
    for (var k = 0; k < n; k++) {
      for (var j = 0; j < n; j++) {
        for (var i = 0; i < n; i++) {
          var x = XMIN + (XMAX - XMIN) * (i + 0.5) / n;
          var y = YMIN + (YMAX - YMIN) * (j + 0.5) / n;
          var z = ZMIN + (ZMAX - ZMIN) * (k + 0.5) / n;
          var result = eval3D(x, y, z);
          var vx = result[0], vy = result[1], vz = result[2];
          var mag = Math.sqrt(vx*vx + vy*vy + vz*vz);
          arrows.push({ x: x, y: y, z: z, vx: vx, vy: vy, vz: vz, mag: mag });
          if (mag > maxMag) maxMag = mag;
        }
      }
    }

    if (maxMag === 0) {
      scene.add(group);
      arrowGroup = group;
      renderer.render(scene, camera);
      updateLabel();
      return;
    }

    var cellSize = (XMAX - XMIN) / n;
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

      var start = new THREE.Vector3(a.x - dx*0.5, a.y - dy*0.5, a.z - dz*0.5);
      var end = new THREE.Vector3(a.x + dx*0.5, a.y + dy*0.5, a.z + dz*0.5);

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

    scene.add(group);
    arrowGroup = group;

    renderer.render(scene, camera);

    if (!window._animatingVF) {
      window._animatingVF = true;
      (function animate() {
        if (state.mode === '3d') renderer.render(scene, camera);
        requestAnimationFrame(animate);
      })();
    }

    updateLabel();
  }


  /* ======================================================================
   * FUNCTION LABEL
   * ====================================================================== */

  function updateLabel() {
    var exprStr;
    if (state.mode === '2d' && state.isCustom && customField2D) {
      exprStr = 'F(x,y) = (' + customField2D.exprFx + ', ' + customField2D.exprFy + ')';
    } else if (state.mode === '3d' && state.isCustom && customField3D) {
      exprStr = 'F(x,y,z) = (' + customField3D.exprFx + ', ' + customField3D.exprFy + ', ' + customField3D.exprFz + ')';
    } else if (state.mode === '2d') {
      exprStr = 'F(x,y) = ' + getCurrentPreset().expr;
    } else {
      exprStr = 'F(x,y,z) = ' + getCurrentPreset().expr;
    }
    if (state.flipSign) {
      dom.currentFnLabel.textContent = exprStr.replace(') = (', ') = -(');
    } else {
      dom.currentFnLabel.textContent = exprStr;
    }
  }


  /* ======================================================================
   * POPULATE DROPDOWN
   * ====================================================================== */

  function populateDropdown() {
    dom.fnSelect.innerHTML = '';
    getCurrentPresets().forEach(function(p, i) {
      var opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.expr;
      dom.fnSelect.appendChild(opt);
    });
    dom.fnSelect.value = state.presetIndex;
  }


  /* ======================================================================
   * UPDATE  (main render dispatch)
   * ====================================================================== */

  function update() {
    if (state.mode === '3d') {
      dom.canvas2d.style.display = 'none';
      dom.container3d.style.display = 'block';
      dom.colourbarWrap.style.display = 'none';
      dom.overlayLabel.style.display = 'none';
      draw3D();
    } else {
      dom.canvas2d.style.display = 'block';
      dom.container3d.style.display = 'none';
      draw2D();
    }
  }


  /* ======================================================================
   * RESIZE
   * ====================================================================== */

  function resize() {
    TA.resizeCanvas(dom.canvas2d, dom.ctx, dom.canvasArea);
    if (renderer) {
      var rect = dom.canvasArea.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height);
      camera.aspect = rect.width / rect.height;
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
    dom.currentFnLabel = document.getElementById('currentFnLabel');
    dom.toggleFlip = document.getElementById('toggleFlip');
    dom.toggleDiv = document.getElementById('toggleDiv');
    dom.toggleCurl = document.getElementById('toggleCurl');
    dom.customWrap2d = document.getElementById('customWrap2d');
    dom.customWrap3d = document.getElementById('customWrap3d');
    dom.customFx = document.getElementById('customFx');
    dom.customFy = document.getElementById('customFy');
    dom.customFx3 = document.getElementById('customFx3');
    dom.customFy3 = document.getElementById('customFy3');
    dom.customFz3 = document.getElementById('customFz3');
    dom.errorMsg2d = document.getElementById('errorMsg2d');
    dom.errorMsg3d = document.getElementById('errorMsg3d');
    dom.overlayOptions = document.getElementById('overlayOptions');
    dom.toggleOverlayHeatmap = document.getElementById('toggleOverlayHeatmap');
    dom.toggleOverlayLevelSets = document.getElementById('toggleOverlayLevelSets');
    dom.toggleLabels = document.getElementById('toggleLabels');
    dom.overlayLabel = document.getElementById('overlayLabel');
    dom.cbCanvas = document.getElementById('colourbar');
    dom.cbMax = document.getElementById('cbMax');
    dom.cbMin = document.getElementById('cbMin');
    dom.colourbarWrap = document.getElementById('colourbarWrap');
    dom.colourSection = document.getElementById('colourSection');

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

    // ── Mode toggle (2D ↔ 3D) ──
    document.querySelectorAll('[data-mode]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        // Save current mode state
        var prev = state.mode;
        savedState[prev].presetIndex = state.presetIndex;
        savedState[prev].isCustom = state.isCustom;
        if (prev === '2d') {
          savedState[prev].showDiv = state.showDiv;
          savedState[prev].showCurl = state.showCurl;
        }

        // Switch mode
        state.mode = btn.dataset.mode;
        document.querySelectorAll('[data-mode]').forEach(function(b) {
          b.classList.toggle('active', b === btn);
        });

        // Restore saved state for new mode
        var restored = savedState[state.mode];
        state.presetIndex = restored.presetIndex;
        state.isCustom = restored.isCustom;

        populateDropdown();
        if (!state.isCustom) {
          dom.fnSelect.value = state.presetIndex;
        } else {
          dom.fnSelect.value = '';
        }

        // Show/hide mode-specific UI
        dom.customWrap2d.style.display = state.mode === '2d' ? 'block' : 'none';
        dom.customWrap3d.style.display = state.mode === '3d' ? 'block' : 'none';
        dom.toggleDiv.style.display = state.mode === '2d' ? '' : 'none';
        dom.toggleCurl.style.display = state.mode === '2d' ? '' : 'none';
        dom.toggleLabels.style.display = state.mode === '2d' ? '' : 'none';

        if (state.mode === '2d') {
          state.showDiv = restored.showDiv;
          state.showCurl = restored.showCurl;
          dom.toggleDiv.classList.toggle('active', state.showDiv);
          dom.toggleCurl.classList.toggle('active', state.showCurl);
          updateOverlayUI();
        } else {
          state.showDiv = false;
          state.showCurl = false;
          state.showLabels = false;
          dom.toggleDiv.classList.remove('active');
          dom.toggleCurl.classList.remove('active');
          dom.toggleLabels.classList.remove('active');
          dom.overlayOptions.style.display = 'none';
          dom.colourSection.style.display = 'none';
        }

        update();
      });
    });

    // ── Dropdown ──
    populateDropdown();

    dom.fnSelect.addEventListener('change', function() {
      state.presetIndex = parseInt(dom.fnSelect.value);
      state.isCustom = false;
      dom.customFx.value = ''; dom.customFy.value = '';
      dom.customFx3.value = ''; dom.customFy3.value = ''; dom.customFz3.value = '';
      dom.errorMsg2d.textContent = ''; dom.errorMsg3d.textContent = '';
      dom.customFx.classList.remove('error'); dom.customFy.classList.remove('error');
      dom.customFx3.classList.remove('error'); dom.customFy3.classList.remove('error');
      dom.customFz3.classList.remove('error');
      customField2D = null; customField3D = null;
      update();
    });

    // ── Custom expression inputs ──
    dom.customFx.addEventListener('input', tryParseCustom2D);
    dom.customFy.addEventListener('input', tryParseCustom2D);
    dom.customFx3.addEventListener('input', tryParseCustom3D);
    dom.customFy3.addEventListener('input', tryParseCustom3D);
    dom.customFz3.addEventListener('input', tryParseCustom3D);

    // ── Flip sign ──
    TA.wireToggle(dom.toggleFlip, state, 'flipSign', update);

    // ── Labels ──
    TA.wireToggle(dom.toggleLabels, state, 'showLabels', update);

    // --- Colour inversion button ---
    document.getElementById('toggleInvert').addEventListener('click', function() {
      this.classList.toggle('active');
      document.documentElement.classList.toggle('inverted');
    });

    // ── Div / Curl (mutually exclusive) ──
    dom.toggleDiv.addEventListener('click', function() {
      state.showDiv = !state.showDiv;
      if (state.showDiv) { state.showCurl = false; dom.toggleCurl.classList.remove('active'); }
      dom.toggleDiv.classList.toggle('active', state.showDiv);
      updateOverlayUI();
      update();
    });

    dom.toggleCurl.addEventListener('click', function() {
      state.showCurl = !state.showCurl;
      if (state.showCurl) { state.showDiv = false; dom.toggleDiv.classList.remove('active'); }
      dom.toggleCurl.classList.toggle('active', state.showCurl);
      updateOverlayUI();
      update();
    });

    // ── Overlay display toggles (heatmap / level sets — independent) ──
    TA.wireToggle(dom.toggleOverlayHeatmap, state, 'overlayHeatmap', update);
    TA.wireToggle(dom.toggleOverlayLevelSets, state, 'overlayLevelSets', update);

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

    // ── Resize ──
    window.addEventListener('resize', resize);

    // ── Click on 2D plot to reposition label point ──
    dom.canvas2d.addEventListener('pointerdown', function(e) {
      if (state.mode !== '2d' || !state.showLabels) return;
      var rect = dom.canvasArea.getBoundingClientRect();
      var cx = e.clientX - rect.left;
      var cy = e.clientY - rect.top;
      var w = rect.width, h = rect.height;
      var size = Math.min(w, h) * 0.65;
      var ox = (w - size) / 2, oy = (h - size) / 2;
      if (cx >= ox && cx <= ox + size && cy >= oy && cy <= oy + size) {
        var fracX = (cx - ox) / size;
        var fracY = 1 - (cy - oy) / size;
        state.labelX = Math.max(XMIN, Math.min(XMAX, XMIN + fracX * (XMAX - XMIN)));
        state.labelY = Math.max(YMIN, Math.min(YMAX, YMIN + fracY * (YMAX - YMIN)));
        update();
      }
    });

    // ── Teaching pointer ──
    TA.initPointer('.canvas-area');

    // ── Initial render ──
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
