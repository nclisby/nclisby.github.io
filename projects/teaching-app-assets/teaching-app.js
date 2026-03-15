/* ==========================================================================
 * teaching-app.js
 *
 * Reusable engine for interactive mathematics teaching web apps.
 * Exposes a single global object  TeachingApp  via the revealing module
 * pattern.  App-specific scripts (e.g. tangent.js) call into TeachingApp
 * but are never called *from* this file.
 *
 * Sections
 * --------
 *  1. Sidebar helpers          – collapse / expand, toggle wiring
 *  2. Overlay system           – create, show, hide, keyboard dismiss
 *  3. Expression parser        – convert user math strings → JS functions
 *  4. Custom preset builder    – build a full preset object from a parsed expr
 *  5. Colour maps              – palette data + sampling + CSS conversion
 *  6. 2D canvas utilities      – DPR-aware resize, coordinate transforms
 *  7. 2D drawing helpers       – arrows, heatmaps, contour lines, colour bar
 *  8. Marching squares         – 2D level-curve extraction
 *  9. Segment chaining         – order marching-squares output
 * 10. Marching cubes           – 3D isosurface extraction (inc. tri table)
 * 11. Three.js helpers         – scene setup, lighting, axes, text sprites
 * 12. Orbit controls           – pointer / touch / wheel / pinch camera
 * 13. 3D arrow helpers         – shaft + cone construction
 * 14. Teaching pointer         – self-contained red pointer IIFE
 *
 * Nothing in this file references app-specific state (no preset arrays,
 * no tangent logic, etc.).  It is a pure toolkit.
 * ========================================================================== */

var TeachingApp = (function () {
  'use strict';

  /* ======================================================================
   * 1. SIDEBAR HELPERS
   * ====================================================================== */

  /**
   * Wire up sidebar collapse / expand behaviour.
   *
   * @param {Object} opts
   * @param {HTMLElement} opts.panel       – the .panel element
   * @param {HTMLElement} opts.collapseBtn – the ‹ button inside the header
   * @param {HTMLElement} opts.openBtn     – the ☰ button in the canvas area
   * @param {Function}    opts.onResize    – called after the transition ends
   */
  function initSidebar(opts) {
    var panel = opts.panel;
    var collapseBtn = opts.collapseBtn;
    var openBtn = opts.openBtn;
    var onResize = opts.onResize || function () {};

    collapseBtn.addEventListener('click', function () {
      panel.classList.add('collapsed');
      setTimeout(onResize, 320);           // wait for CSS transition
    });

    openBtn.addEventListener('click', function () {
      panel.classList.remove('collapsed');
      setTimeout(onResize, 320);
    });
  }

  /**
   * Wire a toggle button to a boolean key in a state object.
   * Toggles state[key] and the .active class on the element, then calls cb().
   *
   * @param {HTMLElement} el    – the .opt-btn element
   * @param {Object}      state – the app state object
   * @param {string}       key  – property name to toggle
   * @param {Function}     cb   – callback after toggling (typically update())
   */
  function wireToggle(el, state, key, cb) {
    el.addEventListener('click', function () {
      state[key] = !state[key];
      el.classList.toggle('active', state[key]);
      if (cb) cb();
    });
  }


  /* ======================================================================
   * 2. OVERLAY SYSTEM
   *
   * Multiple overlays can coexist (Help, Overview, etc.).  Each gets its
   * own trigger button and close button, but they share a single keydown
   * listener that closes whichever overlay is currently visible.
   * ====================================================================== */

  /** Registry of all initialised overlays (for the shared keydown handler). */
  var _overlays = [];
  var _keydownWired = false;

  /**
   * Wire an overlay (modal) so that:
   *   – clicking triggerBtn opens it (closing any other visible overlay first)
   *   – clicking the close button or the backdrop closes it
   *   – pressing any key closes whichever overlay is visible
   *
   * The close button should be *inside* the .overlay div.
   *
   * @param {Object} opts
   * @param {HTMLElement} opts.overlay    – the .overlay element
   * @param {HTMLElement} opts.closeBtn   – the ✕ button (child of overlay)
   * @param {HTMLElement} opts.triggerBtn – the sidebar button that opens it
   * @returns {{ show, hide }}
   */
  function initOverlay(opts) {
    var overlay = opts.overlay;
    var closeBtn = opts.closeBtn;
    var triggerBtn = opts.triggerBtn;

    function show() {
      // Close any other visible overlay first
      for (var i = 0; i < _overlays.length; i++) {
        _overlays[i].hide();
      }
      overlay.classList.add('visible');
    }

    function hide() {
      overlay.classList.remove('visible');
    }

    triggerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      show();
    });

    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      hide();
    });

    // Clicking the backdrop (but not the content) closes the overlay
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hide();
    });

    var entry = { overlay: overlay, show: show, hide: hide };
    _overlays.push(entry);

    // Wire the shared keydown listener exactly once
    if (!_keydownWired) {
      _keydownWired = true;
      document.addEventListener('keydown', function (e) {
        for (var i = 0; i < _overlays.length; i++) {
          if (_overlays[i].overlay.classList.contains('visible')) {
            _overlays[i].hide();
            e.preventDefault();
            return;  // only close one at a time
          }
        }
      });
    }

    return { show: show, hide: hide };
  }


  /* ======================================================================
   * 3. EXPRESSION PARSER
   * ====================================================================== */

  /**
   * Convert a human-readable math expression string into valid JavaScript.
   * Handles common functions (sin, cos, exp, …), caret exponentiation,
   * and named constants (pi, e).
   *
   * @param {string} expr – e.g. "x^2 + sin(y)"
   * @returns {string}      e.g. "x**2 + Math.sin(y)"
   */
  function parseExpr(expr) {
    return expr
      .replace(/\^/g, '**')
      .replace(/\u03C0/g, 'Math.PI')
      .replace(/pi\b/gi, 'Math.PI')
      .replace(/\be\b/g, 'Math.E')
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\bexp\b/g, 'Math.exp')
      .replace(/\blog\b/g, 'Math.log')
      .replace(/\bln\b/g, 'Math.log')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bcosh\b/g, 'Math.cosh')
      .replace(/\bsinh\b/g, 'Math.sinh')
      .replace(/\btanh\b/g, 'Math.tanh')
      .replace(/\basin\b/g, 'Math.asin')
      .replace(/\bacos\b/g, 'Math.acos')
      .replace(/\batan2?\b/g, 'Math.atan2');
  }


  /* ======================================================================
   * 4. CUSTOM PRESET BUILDER
   * ====================================================================== */

  /**
   * Build a complete preset object from a user-entered expression string.
   * Validates by evaluating at a test point, computes numerical gradients,
   * and estimates the field range for slider bounds.
   *
   * @param {string} expr – raw user expression, e.g. "x^2 + y^2"
   * @param {number} dim  – 2 or 3
   * @returns {Object} preset with fn, gx, gy, [gz], cMin, cMax, cDef, bounds
   * @throws {Error} if the expression is invalid or non-finite at the test point
   */
  function makeCustomPreset(expr, dim) {
    var parsed = parseExpr(expr);
    var h = 1e-6;  // step for central-difference gradient

    if (dim === 2) {
      var fn2 = new Function('x', 'y', '"use strict"; return (' + parsed + ');');
      var test2 = fn2(1, 1);
      if (typeof test2 !== 'number' || !isFinite(test2)) throw new Error('Invalid');

      var gx2 = function (x, y) { return (fn2(x + h, y) - fn2(x - h, y)) / (2 * h); };
      var gy2 = function (x, y) { return (fn2(x, y + h) - fn2(x, y - h)) / (2 * h); };

      // Estimate field range on a coarse grid
      var fmin2 = Infinity, fmax2 = -Infinity;
      for (var i = 0; i < 20; i++) {
        for (var j = 0; j < 20; j++) {
          var v = fn2(-3 + 6 * i / 19, -3 + 6 * j / 19);
          if (isFinite(v)) { if (v < fmin2) fmin2 = v; if (v > fmax2) fmax2 = v; }
        }
      }
      if (!isFinite(fmin2)) { fmin2 = -4; fmax2 = 4; }
      var margin2 = (fmax2 - fmin2) * 0.1 || 1;

      return {
        expr: expr, label: 'φ = ' + expr, fn: fn2, gx: gx2, gy: gy2,
        cMin: fmin2 - margin2, cMax: fmax2 + margin2, cDef: (fmin2 + fmax2) / 2,
        xMin: -4, xMax: 4, yMin: -4, yMax: 4
      };

    } else {
      var fn3 = new Function('x', 'y', 'z', '"use strict"; return (' + parsed + ');');
      var test3 = fn3(1, 1, 1);
      if (typeof test3 !== 'number' || !isFinite(test3)) throw new Error('Invalid');

      var gx3 = function (x, y, z) { return (fn3(x + h, y, z) - fn3(x - h, y, z)) / (2 * h); };
      var gy3 = function (x, y, z) { return (fn3(x, y + h, z) - fn3(x, y - h, z)) / (2 * h); };
      var gz3 = function (x, y, z) { return (fn3(x, y, z + h) - fn3(x, y, z - h)) / (2 * h); };

      var fmin3 = Infinity, fmax3 = -Infinity;
      for (var ii = 0; ii < 10; ii++)
        for (var jj = 0; jj < 10; jj++)
          for (var kk = 0; kk < 10; kk++) {
            var vv = fn3(-3 + 6 * ii / 9, -3 + 6 * jj / 9, -3 + 6 * kk / 9);
            if (isFinite(vv)) { if (vv < fmin3) fmin3 = vv; if (vv > fmax3) fmax3 = vv; }
          }
      if (!isFinite(fmin3)) { fmin3 = -4; fmax3 = 4; }
      var margin3 = (fmax3 - fmin3) * 0.1 || 1;

      return {
        expr: expr, label: 'φ = ' + expr, fn: fn3, gx: gx3, gy: gy3, gz: gz3,
        cMin: fmin3 - margin3, cMax: fmax3 + margin3, cDef: (fmin3 + fmax3) / 2,
        xMin: -3.5, xMax: 3.5, yMin: -3.5, yMax: 3.5, zMin: -3.5, zMax: 3.5
      };
    }
  }


  /* ======================================================================
   * 5. COLOUR MAPS
   * ====================================================================== */

  /**
   * Three built-in colour palettes, defined as arrays of RGB triples
   * (values in 0–1).  Palette 1 ≈ modified Viridis, palette 2 ≈ modified
   * Inferno/Magma, palette 3 = custom cool-warm.
   */
  var colourMaps = {
    palette1: [
      [0.267*1.5,0.004*1.5,0.329*1.5],[0.283*1.5,0.141*1.5,0.458*1.5],[0.254,0.265,0.530],
      [0.207,0.372,0.553],[0.164,0.471,0.558],[0.128,0.567,0.551],
      [0.134,0.658,0.517],[0.267,0.749,0.441],[0.478,0.821,0.318],
      [0.741,0.873,0.150],[0.993,0.796,0.144]
    ],
    palette2: [
      [0.100,0.060,0.628],[0.298,0.010,0.633],[0.492,0.012,0.658],
      [0.659,0.054,0.604],[0.798,0.143,0.497],[0.899,0.261,0.383],
      [0.964,0.395,0.275],[0.993,0.545,0.165],[0.983,0.706,0.073],
      [0.930,0.876,0.122]
    ],
    palette3: [
      [0.20392,0.41961,1.00000],[0.01569,0.54118,0.50588],[0.02353,0.83922,0.62745],
      [0.87843,0.69020,0.83529],[0.89804,0.38824,0.60000],[0.80000,0.90000,0.12000]
    ]
  };

  /**
   * Linearly interpolate a colour map at parameter t ∈ [0, 1].
   *
   * @param {string} name – palette key, e.g. 'palette1'
   * @param {number} t    – parameter in [0, 1]
   * @returns {number[]}    [r, g, b] each in [0, 1]
   */
  function sampleColourMap(name, t) {
    var stops = colourMaps[name];
    t = Math.max(0, Math.min(1, t));
    var idx = t * (stops.length - 1);
    var i = Math.floor(idx);
    var f = idx - i;
    if (i >= stops.length - 1) return stops[stops.length - 1];
    return [
      stops[i][0] + f * (stops[i+1][0] - stops[i][0]),
      stops[i][1] + f * (stops[i+1][1] - stops[i][1]),
      stops[i][2] + f * (stops[i+1][2] - stops[i][2]),
    ];
  }

  /**
   * Convert an [r, g, b] triple (0–1 range) to a CSS rgb() string.
   */
  function colourToCSS(rgb) {
    return 'rgb(' + Math.round(rgb[0]*255) + ',' +
                    Math.round(rgb[1]*255) + ',' +
                    Math.round(rgb[2]*255) + ')';
  }


  /* ======================================================================
   * 6. 2D CANVAS UTILITIES
   * ====================================================================== */

  /**
   * Resize a <canvas> element to fill its parent at the correct DPR,
   * and reset the context transform accordingly.
   *
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLElement} container – the element whose size we match
   * @returns {{ width: number, height: number }} CSS-pixel dimensions
   */
  function resizeCanvas(canvas, ctx, container) {
    var rect = container.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  /**
   * Build coordinate-transform functions mapping between math coords
   * and pixel coords for a square plot area.
   *
   * @param {number} ox    – pixel x of plot origin (top-left)
   * @param {number} oy    – pixel y of plot origin (top-left)
   * @param {number} size  – pixel side-length of the square plot
   * @param {number} xMin  – math x at left edge
   * @param {number} xMax  – math x at right edge
   * @param {number} yMin  – math y at bottom edge
   * @param {number} yMax  – math y at top edge
   * @returns {Object} { toPixelX, toPixelY, toMathX, toMathY }
   */
  function makeCoordTransforms(ox, oy, size, xMin, xMax, yMin, yMax) {
    return {
      toPixelX: function (x) { return ox + (x - xMin) / (xMax - xMin) * size; },
      toPixelY: function (y) { return oy + (1 - (y - yMin) / (yMax - yMin)) * size; },
      toMathX:  function (px) { return xMin + (px - ox) / size * (xMax - xMin); },
      toMathY:  function (py) { return yMin + (1 - (py - oy) / size) * (yMax - yMin); },
    };
  }


  /* ======================================================================
   * 7. 2D DRAWING HELPERS
   * ====================================================================== */

  /**
   * Draw an arrow (line + filled triangular head) on a 2D canvas.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x1, y1 – start point (pixels)
   * @param {number} x2, y2 – end point / tip (pixels)
   * @param {string} colour – CSS colour
   * @param {number} lw     – line width
   * @param {number} headLen – arrowhead length in pixels
   */
  function drawArrow(ctx, x1, y1, x2, y2, colour, lw, headLen) {
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    var angle = Math.atan2(y2 - y1, x2 - x1);
    var ha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headLen * Math.cos(angle - ha), y2 - headLen * Math.sin(angle - ha));
    ctx.lineTo(x2 - headLen * Math.cos(angle + ha), y2 - headLen * Math.sin(angle + ha));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /**
   * Evaluate a 2D scalar field on a regular grid.
   *
   * @param {Function} fn       – (x, y) → number
   * @param {number}   res      – grid resolution (res × res)
   * @param {number}   xMin, xMax, yMin, yMax – domain bounds
   * @returns {{ data: Float64Array, fmin: number, fmax: number, res: number }}
   */
  function computeField(fn, res, xMin, xMax, yMin, yMax) {
    var data = new Float64Array(res * res);
    var fmin = Infinity, fmax = -Infinity;
    for (var j = 0; j < res; j++) {
      var y = yMin + (yMax - yMin) * j / (res - 1);
      for (var i = 0; i < res; i++) {
        var x = xMin + (xMax - xMin) * i / (res - 1);
        var v = fn(x, y);
        data[j * res + i] = v;
        if (isFinite(v) && v < fmin) fmin = v;
        if (isFinite(v) && v > fmax) fmax = v;
      }
    }
    return { data: data, fmin: fmin, fmax: fmax, res: res };
  }

  /**
   * Render a colour-mapped heatmap of a precomputed field onto a canvas.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} field    – from computeField()
   * @param {string} scheme   – palette name
   * @param {number} ox, oy   – pixel origin of the plot square
   * @param {number} size     – pixel side-length of the plot square
   */
  function drawHeatmap(ctx, field, scheme, ox, oy, size) {
    var res = field.res;
    var range = field.fmax - field.fmin || 1;
    var imgData = ctx.createImageData(res, res);
    for (var j = 0; j < res; j++) {
      for (var i = 0; i < res; i++) {
        var v = field.data[j * res + i];
        var t = (v - field.fmin) / range;
        var rgb = sampleColourMap(scheme, t);
        var idx = ((res - 1 - j) * res + i) * 4;
        imgData.data[idx]   = Math.round(rgb[0] * 255);
        imgData.data[idx+1] = Math.round(rgb[1] * 255);
        imgData.data[idx+2] = Math.round(rgb[2] * 255);
        imgData.data[idx+3] = 255;
      }
    }
    var offscreen = document.createElement('canvas');
    offscreen.width = res;
    offscreen.height = res;
    offscreen.getContext('2d').putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(offscreen, ox, oy, size, size);
  }

  /**
   * Draw contour lines (level curves at evenly spaced thresholds) from a
   * precomputed field, using marching squares internally.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object}  field       – from computeField()
   * @param {number}  nLevels     – number of contour levels
   * @param {string}  scheme      – palette name (used when showHeatmap is false)
   * @param {boolean} showHeatmap – if true, draw white semi-transparent lines
   * @param {number}  ox, oy      – pixel origin of plot square
   * @param {number}  size        – pixel side-length of plot square
   */
  function drawContours(ctx, field, nLevels, scheme, showHeatmap, ox, oy, size) {
    var res = field.res;
    var range = field.fmax - field.fmin || 1;

    for (var l = 0; l < nLevels; l++) {
      var threshold = field.fmin + (l + 1) * range / (nLevels + 1);
      var t = (threshold - field.fmin) / range;
      var rgb = sampleColourMap(scheme, t);
      ctx.strokeStyle = showHeatmap ? 'rgba(255,255,255,0.5)' : colourToCSS(rgb);
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

          var cpx = function (cx) { return ox + cx * size / (res - 1); };
          var cpy = function (cy) { return oy + (res - 1 - cy) * size / (res - 1); };
          var interp = function (va, vb) { return (threshold - va) / (vb - va); };
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
            ctx.moveTo(cpx(segs[s][0][0]), cpy(segs[s][0][1]));
            ctx.lineTo(cpx(segs[s][1][0]), cpy(segs[s][1][1]));
          }
        }
      }
      ctx.stroke();
    }
  }

  /**
   * Paint a vertical colour bar on a small canvas, using the given palette.
   *
   * @param {HTMLCanvasElement} cbCanvas  – the 16×200 colour bar canvas
   * @param {string}           scheme    – palette name
   */
  function drawColourbar(cbCanvas, scheme) {
    var cbCtx = cbCanvas.getContext('2d');
    for (var j = 0; j < 200; j++) {
      var t = 1 - j / 199;
      var rgb = sampleColourMap(scheme, t);
      cbCtx.fillStyle = colourToCSS(rgb);
      cbCtx.fillRect(0, j, 16, 1);
    }
  }


  /* ======================================================================
   * 8. MARCHING SQUARES  (2D level-curve extraction)
   * ====================================================================== */

  /**
   * Extract line segments of the level set  fn(x,y) = c  using marching
   * squares on a regular grid.
   *
   * @param {Function} fn              – (x, y) → number
   * @param {number}   c               – the level value
   * @param {number}   res             – grid resolution
   * @param {number}   xMin, xMax, yMin, yMax – domain bounds
   * @returns {{ segments: Array, points: Array }}
   *   segments: pairs of {x,y} endpoints
   *   points: ordered midpoints suitable for tangent-point snapping
   */
  function marchingSquares(fn, c, res, xMin, xMax, yMin, yMax) {
    var segments = [];

    for (var j = 0; j < res; j++) {
      for (var i = 0; i < res; i++) {
        var x0 = xMin + (xMax - xMin) * i / res;
        var x1 = xMin + (xMax - xMin) * (i + 1) / res;
        var y0 = yMin + (yMax - yMin) * j / res;
        var y1 = yMin + (yMax - yMin) * (j + 1) / res;
        var v00 = fn(x0, y0) - c;
        var v10 = fn(x1, y0) - c;
        var v01 = fn(x0, y1) - c;
        var v11 = fn(x1, y1) - c;
        var b00 = v00 >= 0 ? 1 : 0;
        var b10 = v10 >= 0 ? 1 : 0;
        var b01 = v01 >= 0 ? 1 : 0;
        var b11 = v11 >= 0 ? 1 : 0;
        var cell = b00 | (b10 << 1) | (b11 << 2) | (b01 << 3);
        if (cell === 0 || cell === 15) continue;

        var interp = function (va, vb) {
          return Math.max(0, Math.min(1, -va / (vb - va + 1e-30)));
        };
        var top    = { x: x0 + interp(v00, v10) * (x1 - x0), y: y0 };
        var right  = { x: x1, y: y0 + interp(v10, v11) * (y1 - y0) };
        var bottom = { x: x0 + interp(v01, v11) * (x1 - x0), y: y1 };
        var left   = { x: x0, y: y0 + interp(v00, v01) * (y1 - y0) };

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
        for (var s = 0; s < segs.length; s++) segments.push(segs[s]);
      }
    }

    var points = chainSegments(segments);
    return { segments: segments, points: points };
  }


  /* ======================================================================
   * 9. SEGMENT CHAINING
   * ====================================================================== */

  /**
   * Take an unordered list of line segments and return an ordered list of
   * midpoints, sorted by angle around their centroid, with near-duplicates
   * removed.  Used to give a continuous parameterisation of the level curve.
   *
   * @param {Array} segments – array of [{x,y},{x,y}] pairs
   * @returns {Array} ordered array of {x,y} points
   */
  function chainSegments(segments) {
    if (segments.length === 0) return [];

    var pts = [];
    for (var k = 0; k < segments.length; k++) {
      pts.push({
        x: (segments[k][0].x + segments[k][1].x) / 2,
        y: (segments[k][0].y + segments[k][1].y) / 2
      });
    }
    if (pts.length < 2) return pts;

    // Sort by angle around centroid
    var cx = 0, cy = 0;
    for (var p = 0; p < pts.length; p++) { cx += pts[p].x; cy += pts[p].y; }
    cx /= pts.length;
    cy /= pts.length;
    pts.sort(function (a, b) {
      return Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx);
    });

    // Remove near-duplicate points
    var filtered = [pts[0]];
    for (var q = 1; q < pts.length; q++) {
      var dx = pts[q].x - filtered[filtered.length - 1].x;
      var dy = pts[q].y - filtered[filtered.length - 1].y;
      if (dx * dx + dy * dy > 1e-10) filtered.push(pts[q]);
    }
    return filtered;
  }


  /* ======================================================================
   * 10. MARCHING CUBES  (3D isosurface extraction)
   * ====================================================================== */

  /**
   * Lookup table for the marching-cubes algorithm.
   * Each entry is an array of edge-index triples defining triangles.
   * 256 entries covering all possible sign configurations at cube corners.
   */
  var MC_TRI_TABLE = (function () {
    var t = new Array(256);
    t[0]=[];t[255]=[];
    t[1]=[0,8,3];t[2]=[0,1,9];t[3]=[1,8,3,9,8,1];t[4]=[1,2,10];t[5]=[0,8,3,1,2,10];
    t[6]=[9,2,10,0,2,9];t[7]=[2,8,3,2,10,8,10,9,8];t[8]=[3,11,2];t[9]=[0,11,2,8,11,0];
    t[10]=[1,9,0,2,3,11];t[11]=[1,11,2,1,9,11,9,8,11];t[12]=[3,10,1,11,10,3];
    t[13]=[0,10,1,0,8,10,8,11,10];t[14]=[3,9,0,3,11,9,11,10,9];t[15]=[9,8,10,10,8,11];
    t[16]=[4,7,8];t[17]=[4,3,0,7,3,4];t[18]=[0,1,9,8,4,7];t[19]=[4,1,9,4,7,1,7,3,1];
    t[20]=[1,2,10,8,4,7];t[21]=[3,4,7,3,0,4,1,2,10];t[22]=[9,2,10,9,0,2,8,4,7];
    t[23]=[2,10,9,2,9,7,2,7,3,7,9,4];t[24]=[8,4,7,3,11,2];t[25]=[11,4,7,11,2,4,2,0,4];
    t[26]=[9,0,1,8,4,7,2,3,11];t[27]=[4,7,11,9,4,11,9,11,2,9,2,1];
    t[28]=[3,10,1,3,11,10,7,8,4];t[29]=[1,11,10,1,4,11,1,0,4,7,11,4];
    t[30]=[4,7,8,9,0,11,9,11,10,11,0,3];t[31]=[4,7,11,4,11,9,9,11,10];
    t[32]=[9,5,4];t[33]=[9,5,4,0,8,3];t[34]=[0,5,4,1,5,0];t[35]=[8,5,4,8,3,5,3,1,5];
    t[36]=[1,2,10,9,5,4];t[37]=[3,0,8,1,2,10,4,9,5];t[38]=[5,2,10,5,4,2,4,0,2];
    t[39]=[2,10,5,3,2,5,3,5,4,3,4,8];t[40]=[9,5,4,2,3,11];t[41]=[0,11,2,0,8,11,4,9,5];
    t[42]=[0,5,4,0,1,5,2,3,11];t[43]=[2,1,5,2,5,8,2,8,11,4,8,5];
    t[44]=[10,3,11,10,1,3,9,5,4];t[45]=[4,9,5,0,8,1,8,10,1,8,11,10];
    t[46]=[5,4,0,5,0,11,5,11,10,11,0,3];t[47]=[5,4,8,5,8,10,10,8,11];
    t[48]=[9,7,8,5,7,9];t[49]=[9,3,0,9,5,3,5,7,3];t[50]=[0,7,8,0,1,7,1,5,7];
    t[51]=[1,5,3,3,5,7];t[52]=[9,7,8,9,5,7,10,1,2];t[53]=[10,1,2,9,5,0,5,3,0,5,7,3];
    t[54]=[8,0,2,8,2,5,8,5,7,10,5,2];t[55]=[2,10,5,2,5,3,3,5,7];
    t[56]=[7,9,5,7,8,9,3,11,2];t[57]=[9,5,7,9,7,2,9,2,0,2,7,11];
    t[58]=[2,3,11,0,1,8,1,7,8,1,5,7];t[59]=[11,2,1,11,1,7,7,1,5];
    t[60]=[9,5,8,8,5,7,10,1,3,10,3,11];t[61]=[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0];
    t[62]=[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0];t[63]=[11,10,5,7,11,5];
    t[64]=[10,6,5];t[65]=[0,8,3,5,10,6];t[66]=[9,0,1,5,10,6];t[67]=[1,8,3,1,9,8,5,10,6];
    t[68]=[1,6,5,2,6,1];t[69]=[1,6,5,1,2,6,3,0,8];t[70]=[9,6,5,9,0,6,0,2,6];
    t[71]=[5,9,8,5,8,2,5,2,6,3,2,8];t[72]=[2,3,11,10,6,5];t[73]=[11,0,8,11,2,0,10,6,5];
    t[74]=[0,1,9,2,3,11,5,10,6];t[75]=[5,10,6,1,9,2,9,11,2,9,8,11];
    t[76]=[6,3,11,6,5,3,5,1,3];t[77]=[0,8,11,0,11,5,0,5,1,5,11,6];
    t[78]=[3,11,6,0,3,6,0,6,5,0,5,9];t[79]=[6,5,9,6,9,11,11,9,8];
    t[80]=[5,10,6,4,7,8];t[81]=[4,3,0,4,7,3,6,5,10];t[82]=[1,9,0,5,10,6,8,4,7];
    t[83]=[10,6,5,1,9,7,1,7,3,7,9,4];t[84]=[6,1,2,6,5,1,4,7,8];
    t[85]=[1,2,5,5,2,6,3,0,4,3,4,7];t[86]=[8,4,7,9,0,5,0,6,5,0,2,6];
    t[87]=[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9];t[88]=[3,11,2,7,8,4,10,6,5];
    t[89]=[5,10,6,4,7,2,4,2,0,2,7,11];t[90]=[0,1,9,4,7,8,2,3,11,5,10,6];
    t[91]=[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6];t[92]=[8,4,7,3,11,5,3,5,1,5,11,6];
    t[93]=[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11];t[94]=[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7];
    t[95]=[6,5,9,6,9,11,4,7,9,7,11,9];
    t[96]=[10,4,9,6,4,10];t[97]=[4,10,6,4,9,10,0,8,3];t[98]=[10,0,1,10,6,0,6,4,0];
    t[99]=[8,3,1,8,1,6,8,6,4,6,1,10];t[100]=[1,4,9,1,2,4,2,6,4];
    t[101]=[3,0,8,1,2,9,2,4,9,2,6,4];t[102]=[0,2,4,4,2,6];t[103]=[8,3,2,8,2,4,4,2,6];
    t[104]=[10,4,9,10,6,4,11,2,3];t[105]=[0,8,2,2,8,11,4,9,10,4,10,6];
    t[106]=[3,11,2,0,1,6,0,6,4,6,1,10];t[107]=[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1];
    t[108]=[9,6,4,9,3,6,9,1,3,11,6,3];t[109]=[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1];
    t[110]=[3,11,6,3,6,0,0,6,4];t[111]=[6,4,8,11,6,8];
    t[112]=[7,10,6,7,8,10,8,9,10];t[113]=[0,7,3,0,10,7,0,9,10,6,7,10];
    t[114]=[10,6,7,1,10,7,1,7,8,1,8,0];t[115]=[10,6,7,10,7,1,1,7,3];
    t[116]=[1,2,6,1,6,8,1,8,9,8,6,7];t[117]=[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9];
    t[118]=[7,8,0,7,0,6,6,0,2];t[119]=[7,3,2,6,7,2];
    t[120]=[2,3,11,10,6,8,10,8,9,8,6,7];t[121]=[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7];
    t[122]=[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11];t[123]=[11,2,1,11,1,7,10,6,1,6,7,1];
    t[124]=[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6];t[125]=[0,9,1,11,6,7];
    t[126]=[7,8,0,7,0,6,3,11,0,11,6,0];t[127]=[7,11,6];
    t[128]=[7,6,11];t[129]=[3,0,8,11,7,6];t[130]=[0,1,9,11,7,6];t[131]=[8,1,9,8,3,1,11,7,6];
    t[132]=[10,1,2,6,11,7];t[133]=[1,2,10,3,0,8,6,11,7];t[134]=[2,9,0,2,10,9,6,11,7];
    t[135]=[6,11,7,2,10,3,10,8,3,10,9,8];t[136]=[7,2,3,6,2,7];t[137]=[7,0,8,7,6,0,6,2,0];
    t[138]=[2,7,6,2,3,7,0,1,9];t[139]=[1,6,2,1,8,6,1,9,8,8,7,6];
    t[140]=[10,7,6,10,1,7,1,3,7];t[141]=[10,7,6,1,7,10,1,8,7,1,0,8];
    t[142]=[0,3,7,0,7,10,0,10,9,6,10,7];t[143]=[7,6,10,7,10,8,8,10,9];
    t[144]=[6,8,4,11,8,6];t[145]=[3,6,11,3,0,6,0,4,6];t[146]=[8,6,11,8,4,6,9,0,1];
    t[147]=[9,4,6,9,6,3,9,3,1,11,3,6];t[148]=[6,8,4,6,11,8,2,10,1];
    t[149]=[1,2,10,3,0,11,0,6,11,0,4,6];t[150]=[4,11,8,4,6,11,0,2,9,2,10,9];
    t[151]=[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3];t[152]=[8,2,3,8,4,2,4,6,2];
    t[153]=[0,4,2,4,6,2];t[154]=[1,9,0,2,3,4,2,4,6,4,3,8];t[155]=[1,9,4,1,4,2,2,4,6];
    t[156]=[8,1,3,8,6,1,8,4,6,6,10,1];t[157]=[10,1,0,10,0,6,6,0,4];
    t[158]=[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3];t[159]=[10,9,4,6,10,4];
    t[160]=[4,9,5,7,6,11];t[161]=[0,8,3,4,9,5,11,7,6];t[162]=[5,0,1,5,4,0,7,6,11];
    t[163]=[11,7,6,8,3,4,3,5,4,3,1,5];t[164]=[9,5,4,10,1,2,7,6,11];
    t[165]=[6,11,7,1,2,10,0,8,3,4,9,5];t[166]=[7,6,11,5,4,10,4,2,10,4,0,2];
    t[167]=[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6];t[168]=[7,2,3,7,6,2,5,4,9];
    t[169]=[9,5,4,0,8,6,0,6,2,6,8,7];t[170]=[3,6,2,3,7,6,1,5,0,5,4,0];
    t[171]=[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8];t[172]=[9,5,4,10,1,6,1,7,6,1,3,7];
    t[173]=[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4];t[174]=[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10];
    t[175]=[7,6,10,7,10,8,5,4,10,4,8,10];
    t[176]=[6,9,5,6,11,9,11,8,9];t[177]=[3,6,11,0,6,3,0,5,6,0,9,5];
    t[178]=[0,11,8,0,5,11,0,1,5,5,6,11];t[179]=[6,11,3,6,3,5,5,3,1];
    t[180]=[1,2,10,9,5,11,9,11,8,11,5,6];t[181]=[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10];
    t[182]=[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5];t[183]=[6,11,3,6,3,5,2,10,3,10,5,3];
    t[184]=[5,8,9,5,2,8,5,6,2,3,8,2];t[185]=[9,5,6,9,6,0,0,6,2];
    t[186]=[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8];t[187]=[1,5,6,2,1,6];
    t[188]=[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6];t[189]=[10,1,0,10,0,6,9,5,0,5,6,0];
    t[190]=[0,3,8,5,6,10];t[191]=[10,5,6];
    t[192]=[11,5,10,7,5,11];t[193]=[11,5,10,11,7,5,8,3,0];t[194]=[5,11,7,5,10,11,1,9,0];
    t[195]=[10,7,5,10,11,7,9,8,1,8,3,1];t[196]=[11,1,2,11,7,1,7,5,1];
    t[197]=[0,8,3,1,2,7,1,7,5,7,2,11];t[198]=[9,7,5,9,2,7,9,0,2,2,11,7];
    t[199]=[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2];t[200]=[2,5,10,2,3,5,3,7,5];
    t[201]=[8,2,0,8,5,2,8,7,5,10,2,5];t[202]=[9,0,1,5,10,3,5,3,7,3,10,2];
    t[203]=[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2];t[204]=[1,3,5,3,7,5];
    t[205]=[0,8,7,0,7,1,1,7,5];t[206]=[9,0,3,9,3,5,5,3,7];t[207]=[9,8,7,5,9,7];
    t[208]=[5,8,4,5,10,8,10,11,8];t[209]=[5,0,4,5,11,0,5,10,11,11,3,0];
    t[210]=[0,1,9,8,4,10,8,10,11,10,4,5];t[211]=[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4];
    t[212]=[2,5,1,2,8,5,2,11,8,4,5,8];t[213]=[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11];
    t[214]=[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5];t[215]=[9,4,5,2,11,3];
    t[216]=[2,5,10,3,5,2,3,4,5,3,8,4];t[217]=[5,10,2,5,2,4,4,2,0];
    t[218]=[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9];t[219]=[5,10,2,5,2,4,1,9,2,9,4,2];
    t[220]=[8,4,5,8,5,3,3,5,1];t[221]=[0,4,5,1,0,5];t[222]=[8,4,5,8,5,3,9,0,5,0,3,5];
    t[223]=[9,4,5];
    t[224]=[4,11,7,4,9,11,9,10,11];t[225]=[0,8,3,4,9,7,9,11,7,9,10,11];
    t[226]=[1,10,11,1,11,4,1,4,0,7,4,11];t[227]=[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4];
    t[228]=[4,11,7,9,11,4,9,2,11,9,1,2];t[229]=[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3];
    t[230]=[11,7,4,11,4,2,2,4,0];t[231]=[11,7,4,11,4,2,8,3,4,3,2,4];
    t[232]=[2,9,10,2,7,9,2,3,7,7,4,9];t[233]=[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7];
    t[234]=[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10];t[235]=[1,10,2,8,7,4];
    t[236]=[4,9,1,4,1,7,7,1,3];t[237]=[4,9,1,4,1,7,0,8,1,8,7,1];
    t[238]=[4,0,3,7,4,3];t[239]=[4,8,7];
    t[240]=[9,10,8,10,11,8];t[241]=[3,0,9,3,9,11,11,9,10];t[242]=[0,1,10,0,10,8,8,10,11];
    t[243]=[3,1,10,11,3,10];t[244]=[1,2,11,1,11,9,9,11,8];t[245]=[3,0,9,3,9,11,1,2,9,2,11,9];
    t[246]=[0,2,11,8,0,11];t[247]=[3,2,11];t[248]=[2,3,8,2,8,10,10,8,9];
    t[249]=[9,10,2,0,9,2];t[250]=[2,3,8,2,8,10,0,1,8,1,10,8];t[251]=[1,10,2];
    t[252]=[1,3,8,9,1,8];t[253]=[0,9,1];t[254]=[0,3,8];
    return t;
  })();

  /**
   * Build an isosurface mesh (as a Three.js BufferGeometry) for the level
   * set  fn(x,y,z) = c  using marching cubes.
   *
   * Also populates and returns an array of vertex positions (levelPoints)
   * for use in tangent-point selection.
   *
   * @param {Object} p       – preset with fn and domain bounds
   * @param {number} c       – the level value
   * @param {number} gridRes – grid resolution per axis
   * @returns {{ geometry: THREE.BufferGeometry, levelPoints: Array }}
   */
  function buildIsosurface(p, c, gridRes) {
    var nx = gridRes, ny = gridRes, nz = gridRes;
    var xMin = p.xMin, xMax = p.xMax;
    var yMin = p.yMin, yMax = p.yMax;
    var zMin = p.zMin, zMax = p.zMax;
    var dx = (xMax - xMin) / (nx - 1);
    var dy = (yMax - yMin) / (ny - 1);
    var dz = (zMax - zMin) / (nz - 1);

    // Sample the field on a 3D grid
    var field = new Float32Array(nx * ny * nz);
    for (var iz = 0; iz < nz; iz++) {
      for (var iy = 0; iy < ny; iy++) {
        for (var ix = 0; ix < nx; ix++) {
          field[iz * ny * nx + iy * nx + ix] =
            p.fn(xMin + ix * dx, yMin + iy * dy, zMin + iz * dz) - c;
        }
      }
    }

    var vertices = [];
    var vertexMap = new Map();

    function getFieldVal(ix, iy, iz) {
      return field[iz * ny * nx + iy * nx + ix];
    }

    // Interpolate along an edge and cache the resulting vertex index
    function interp(ix1, iy1, iz1, ix2, iy2, iz2) {
      var a = ix1 * ny * nz + iy1 * nz + iz1;
      var b = ix2 * ny * nz + iy2 * nz + iz2;
      var key = a < b ? a + '_' + b : b + '_' + a;
      if (vertexMap.has(key)) return vertexMap.get(key);
      var v1 = getFieldVal(ix1, iy1, iz1);
      var v2 = getFieldVal(ix2, iy2, iz2);
      var t = Math.max(0, Math.min(1, -v1 / (v2 - v1 + 1e-30)));
      vertices.push(
        xMin + (ix1 + t * (ix2 - ix1)) * dx,
        yMin + (iy1 + t * (iy2 - iy1)) * dy,
        zMin + (iz1 + t * (iz2 - iz1)) * dz
      );
      var idx = (vertices.length / 3) - 1;
      vertexMap.set(key, idx);
      return idx;
    }

    var indices = [];

    // Corner offsets within a cube
    var cornerCoords, edgePairs;

    for (var iz2 = 0; iz2 < nz - 1; iz2++) {
      for (var iy2 = 0; iy2 < ny - 1; iy2++) {
        for (var ix2 = 0; ix2 < nx - 1; ix2++) {
          var v = [
            getFieldVal(ix2, iy2, iz2),
            getFieldVal(ix2+1, iy2, iz2),
            getFieldVal(ix2+1, iy2+1, iz2),
            getFieldVal(ix2, iy2+1, iz2),
            getFieldVal(ix2, iy2, iz2+1),
            getFieldVal(ix2+1, iy2, iz2+1),
            getFieldVal(ix2+1, iy2+1, iz2+1),
            getFieldVal(ix2, iy2+1, iz2+1),
          ];

          var cubeIndex = 0;
          for (var ci = 0; ci < 8; ci++) {
            if (v[ci] < 0) cubeIndex |= (1 << ci);
          }
          if (cubeIndex === 0 || cubeIndex === 255) continue;

          var edges = MC_TRI_TABLE[cubeIndex];
          if (!edges) continue;

          cornerCoords = [
            [ix2, iy2, iz2], [ix2+1, iy2, iz2], [ix2+1, iy2+1, iz2], [ix2, iy2+1, iz2],
            [ix2, iy2, iz2+1], [ix2+1, iy2, iz2+1], [ix2+1, iy2+1, iz2+1], [ix2, iy2+1, iz2+1]
          ];
          edgePairs = [
            [0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]
          ];

          for (var ei = 0; ei < edges.length; ei += 3) {
            var e0 = edges[ei], e1 = edges[ei+1], e2 = edges[ei+2];
            if (e0 < 0) break;
            var p0 = edgePairs[e0], p1 = edgePairs[e1], p2 = edgePairs[e2];
            var v0 = interp(cornerCoords[p0[0]][0], cornerCoords[p0[0]][1], cornerCoords[p0[0]][2],
                            cornerCoords[p0[1]][0], cornerCoords[p0[1]][1], cornerCoords[p0[1]][2]);
            var v1 = interp(cornerCoords[p1[0]][0], cornerCoords[p1[0]][1], cornerCoords[p1[0]][2],
                            cornerCoords[p1[1]][0], cornerCoords[p1[1]][1], cornerCoords[p1[1]][2]);
            var v2r = interp(cornerCoords[p2[0]][0], cornerCoords[p2[0]][1], cornerCoords[p2[0]][2],
                             cornerCoords[p2[1]][0], cornerCoords[p2[1]][1], cornerCoords[p2[1]][2]);
            indices.push(v0, v1, v2r);
          }
        }
      }
    }

    // Collect vertex positions as {x,y,z} for tangent-point snapping
    var levelPoints = [];
    for (var lp = 0; lp < vertices.length; lp += 3) {
      levelPoints.push({ x: vertices[lp], y: vertices[lp+1], z: vertices[lp+2] });
    }

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return { geometry: geometry, levelPoints: levelPoints };
  }


  /* ======================================================================
   * 11. THREE.JS HELPERS
   * ====================================================================== */

  /**
   * Create a Three.js text sprite (billboard label) from a string.
   *
   * @param {string} text   – label text
   * @param {string} color  – CSS colour string (default '#8b8fa3')
   * @param {number} size   – world-space scale (default 0.6)
   * @returns {THREE.Sprite}
   */
  function makeTextSprite(text, color, size) {
    var canvas = document.createElement('canvas');
    var cx = canvas.getContext('2d');
    var fontSize = 64;
    var font = 'bold ' + fontSize + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    cx.font = font;
    var metrics = cx.measureText(text);
    var textW = Math.ceil(metrics.width) + 16;
    var textH = fontSize + 16;
    canvas.width = textW;
    canvas.height = textH;
    cx.font = font;  // must re-set after resize
    cx.fillStyle = color || '#8b8fa3';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, textW / 2, textH / 2);
    var texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    var material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    var sprite = new THREE.Sprite(material);
    var aspect = textW / textH;
    var s = size || 0.6;
    sprite.scale.set(s * aspect, s, 0.6);
    return sprite;
  }

  /**
   * Initialise a Three.js scene with standard lighting, axes, and axis labels.
   *
   * @param {HTMLElement} container3d – the DOM element to hold the renderer
   * @param {HTMLElement} canvasArea  – the parent .canvas-area element (for sizing)
   * @param {Object}      opts
   * @param {number}      opts.axisLength – half-length of each axis line (default 4)
   * @returns {{ scene, camera, renderer }}
   */
  function initThreeScene(container3d, canvasArea, opts) {
    opts = opts || {};
    var axLen = opts.axisLength || 4;

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117);

    var rect = canvasArea.getBoundingClientRect();
    var camera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 200);

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(rect.width, rect.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container3d.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var dirLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight1.position.set(5, 5, 10);
    scene.add(dirLight1);
    var dirLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
    dirLight2.position.set(-5, -3, -5);
    scene.add(dirLight2);

    // Axes
    var axisMat = new THREE.LineBasicMaterial({ color: 0x4a4d5d });
    var xGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axLen, 0, 0), new THREE.Vector3(axLen, 0, 0)
    ]);
    scene.add(new THREE.Line(xGeo, axisMat));
    var yGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axLen, 0), new THREE.Vector3(0, axLen, 0)
    ]);
    scene.add(new THREE.Line(yGeo, axisMat));
    var zGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axLen), new THREE.Vector3(0, 0, axLen)
    ]);
    scene.add(new THREE.Line(zGeo, axisMat));

    // Axis labels
    var labels = ['x', 'y', 'z'];
    var positions = [
      [axLen + 0.3, 0, 0],
      [0, axLen + 0.3, 0],
      [0, 0, axLen + 0.3]
    ];
    for (var li = 0; li < 3; li++) {
      var lbl = makeTextSprite(labels[li], '#8b8fa3');
      lbl.position.set(positions[li][0], positions[li][1], positions[li][2]);
      scene.add(lbl);
    }

    return { scene: scene, camera: camera, renderer: renderer };
  }


  /* ======================================================================
   * 12. ORBIT CONTROLS
   * ====================================================================== */

  /**
   * Set up custom orbit controls for a Three.js camera.
   * Handles pointer drag (orbit), mouse wheel (zoom), and two-finger
   * pinch (zoom) on touch devices.
   *
   * @param {HTMLElement}          el     – the container3d element
   * @param {THREE.PerspectiveCamera} camera
   * @param {Object}               opts
   * @param {number}               opts.azimuth   – initial azimuth (default -π/3)
   * @param {number}               opts.elevation – initial elevation (default π/5)
   * @param {number}               opts.radius    – initial distance (default 10)
   * @param {Function}             opts.onBeforeOrbit – called before orbit starts;
   *        receives the pointerdown event.  Return false to cancel orbit (e.g. when
   *        the click hit an object instead).
   * @returns {{ updateCam, getAzimuth, getElevation, getRadius }}
   */
  function initOrbitControls(el, camera, opts) {
    opts = opts || {};
    var azimuth   = opts.azimuth   != null ? opts.azimuth   : -Math.PI / 3;
    var elevation = opts.elevation != null ? opts.elevation :  Math.PI / 5;
    var radius    = opts.radius    != null ? opts.radius    : 10;
    var onBeforeOrbit = opts.onBeforeOrbit || null;

    var isPinching = false;
    var isDown = false, prevX, prevY;

    function updateCam() {
      camera.position.x = radius * Math.cos(elevation) * Math.cos(azimuth);
      camera.position.y = radius * Math.cos(elevation) * Math.sin(azimuth);
      camera.position.z = radius * Math.sin(elevation);
      camera.up.set(0, 0, 1);
      camera.lookAt(0, 0, 0);
    }

    updateCam();

    // Pointer drag for orbit
    el.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' && !e.isPrimary) return;
      if (onBeforeOrbit && onBeforeOrbit(e) === false) return;
      isDown = true;
      prevX = e.clientX;
      prevY = e.clientY;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', function (e) {
      if (!isDown) return;
      azimuth -= (e.clientX - prevX) * 0.008;
      elevation = Math.max(-Math.PI / 2 + 0.05,
        Math.min(Math.PI / 2 - 0.05,
          elevation + (e.clientY - prevY) * 0.008));
      prevX = e.clientX;
      prevY = e.clientY;
      updateCam();
    });
    el.addEventListener('pointerup', function () { isDown = false; });
    el.addEventListener('pointercancel', function () { isDown = false; });

    // Mouse wheel zoom
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      radius = Math.max(3, Math.min(30, radius + e.deltaY * 0.01));
      updateCam();
    }, { passive: false });

    // Touch pinch zoom
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
          radius = Math.max(3, Math.min(30, radius + (lastPinchDist - dist) * 0.03));
          updateCam();
        }
        lastPinchDist = dist;
      }
    }, { passive: false });
    el.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) { isPinching = false; lastPinchDist = 0; }
    }, { passive: false });

    return {
      updateCam: updateCam,
      getAzimuth:   function () { return azimuth; },
      getElevation: function () { return elevation; },
      getRadius:    function () { return radius; },
    };
  }


  /* ======================================================================
   * 13. 3D ARROW HELPERS
   * ====================================================================== */

  /**
   * Build a 3D arrow (cylinder shaft + cone head) and add it to a group.
   *
   * @param {THREE.Group}   group   – parent group
   * @param {THREE.Vector3} origin  – start point
   * @param {THREE.Vector3} dir     – unit direction vector
   * @param {number}        length  – total arrow length
   * @param {Object}        opts
   * @param {number}        opts.color      – hex colour (default 0xffffff)
   * @param {number}        opts.shaftRadius – (default 0.03)
   * @param {number}        opts.headRadius  – (default 0.06)
   * @param {number}        opts.headLength  – (default 0.15)
   */
  function addArrow3D(group, origin, dir, length, opts) {
    opts = opts || {};
    var color       = opts.color       != null ? opts.color       : 0xffffff;
    var shaftRadius = opts.shaftRadius != null ? opts.shaftRadius : 0.03;
    var headRadius  = opts.headRadius  != null ? opts.headRadius  : 0.06;
    var headLength  = opts.headLength  != null ? opts.headLength  : 0.15;

    var up = new THREE.Vector3(0, 1, 0);
    var mat = new THREE.MeshBasicMaterial({ color: color });

    // Shaft
    var shaftGeo = new THREE.CylinderGeometry(shaftRadius, shaftRadius, length, 8);
    var shaft = new THREE.Mesh(shaftGeo, mat);
    shaft.position.copy(origin.clone().add(dir.clone().multiplyScalar(length / 2)));
    shaft.quaternion.setFromUnitVectors(up, dir);
    group.add(shaft);

    // Cone head
    var coneGeo = new THREE.CylinderGeometry(0, headRadius, headLength, 8);
    var cone = new THREE.Mesh(coneGeo, mat);
    cone.position.copy(origin.clone().add(dir.clone().multiplyScalar(length)));
    cone.quaternion.setFromUnitVectors(up, dir);
    group.add(cone);
  }

  /**
   * Dispose of all geometries and materials within a Three.js group,
   * then remove it from its parent.
   *
   * @param {THREE.Scene} scene
   * @param {THREE.Group|THREE.Mesh} obj
   */
  function disposeObject(scene, obj) {
    if (!obj) return;
    scene.remove(obj);
    if (obj.traverse) {
      obj.traverse(function (ch) {
        if (ch.geometry) ch.geometry.dispose();
        if (ch.material) ch.material.dispose();
      });
    } else {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }


  /* ======================================================================
   * 14. TEACHING POINTER
   * ====================================================================== */

  /**
   * Initialise the teaching pointer — a draggable / cursor-following red
   * disc used to highlight features during screen-shared lectures.
   *
   * This is a self-contained module.  It creates its own DOM elements
   * (button + pointer disc), injects its own CSS, and manages its own
   * event listeners.  No external API is needed.
   *
   * @param {Object} opts
   * @param {string} opts.canvasAreaSelector – CSS selector for the main
   *        canvas area (default '.canvas-area')
   */
  function initPointer(opts) {
    opts = opts || {};
    var POINTER_OPACITY = 0.85;
    var POINTER_SIZE_FRACTION = 1 / 60;
    var POINTER_COLOUR = '#e53935';
    var BUTTON_MARGIN = 30;
    var CANVAS_AREA_SELECTOR = opts.canvasAreaSelector || '.canvas-area';

    var active = false;
    var following = false;
    var dragging = false;
    var insideCanvas = true;
    var pointerX = window.innerWidth / 2;
    var pointerY = window.innerHeight / 2;

    function getPointerRadius() {
      var shortEdge = Math.min(screen.width, screen.height);
      return Math.round(shortEdge * POINTER_SIZE_FRACTION);
    }
    function getButtonSize() { return getPointerRadius() * 2; }

    var canvasAreaEl = null;
    function getCanvasArea() {
      if (!canvasAreaEl) canvasAreaEl = document.querySelector(CANVAS_AREA_SELECTOR);
      return canvasAreaEl;
    }
    function getCanvasBounds() {
      var el = getCanvasArea();
      if (!el) return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      return el.getBoundingClientRect();
    }
    function isInsideCanvas(x, y) {
      var b = getCanvasBounds();
      return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom;
    }
    function clampToCanvas(x, y) {
      var b = getCanvasBounds();
      var r = getPointerRadius();
      return {
        x: Math.max(b.left + r, Math.min(b.right - r, x)),
        y: Math.max(b.top + r, Math.min(b.bottom - r, y))
      };
    }
    function getCanvasCentre() {
      var b = getCanvasBounds();
      return { x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 };
    }

    // Inject pointer-specific CSS
    var style = document.createElement('style');
    style.textContent =
      '.tp-btn {' +
      '  position: fixed; bottom: ' + BUTTON_MARGIN + 'px; right: ' + BUTTON_MARGIN + 'px;' +
      '  z-index: 99999; border-radius: 50%; border: 3px solid #ffffff;' +
      '  background: transparent; cursor: pointer; touch-action: manipulation;' +
      '  -webkit-tap-highlight-color: transparent;' +
      '  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;' +
      '  box-shadow: 0 2px 8px rgba(0,0,0,0.4);' +
      '}' +
      '.tp-btn:hover { border-color: #ffcdd2; }' +
      '.tp-btn.active {' +
      '  background: #ffffff; border-color: #ffffff;' +
      '  box-shadow: 0 2px 12px rgba(255,255,255,0.4);' +
      '}' +
      '.tp-pointer {' +
      '  position: fixed; z-index: 100000; border-radius: 50%;' +
      '  background: ' + POINTER_COLOUR + '; opacity: ' + POINTER_OPACITY + ';' +
      '  pointer-events: none; touch-action: none;' +
      '  border: 2px solid rgba(255,255,255,0.9);' +
      '  box-shadow: 0 0 0 2px rgba(0,0,0,0.4), 0 0 20px 6px rgba(0,0,0,0.35);' +
      '  display: none; transform: translate(-50%, -50%);' +
      '}' +
      '.tp-pointer.accepts-input { pointer-events: auto; cursor: grab; }' +
      '.tp-pointer.dragging { cursor: grabbing; }' +
      '.tp-hide-cursor, .tp-hide-cursor * { cursor: none !important; }';
    document.head.appendChild(style);

    // Create DOM elements
    var btn = document.createElement('div');
    btn.className = 'tp-btn';
    btn.title = 'Teaching pointer';
    document.body.appendChild(btn);

    var pointer = document.createElement('div');
    pointer.className = 'tp-pointer';
    document.body.appendChild(pointer);

    function updateSizes() {
      var r = getPointerRadius();
      pointer.style.width = r * 2 + 'px';
      pointer.style.height = r * 2 + 'px';
      var bs = getButtonSize();
      btn.style.width = bs + 'px';
      btn.style.height = bs + 'px';
    }
    function updatePointerPosition() {
      pointer.style.left = pointerX + 'px';
      pointer.style.top = pointerY + 'px';
    }
    function showPointerInCanvas() {
      pointer.style.display = 'block';
      var el = getCanvasArea();
      if (el) el.classList.add('tp-hide-cursor');
    }
    function hidePointerFromCanvas() {
      pointer.style.display = 'none';
      var el = getCanvasArea();
      if (el) el.classList.remove('tp-hide-cursor');
    }
    function enterFollowMode() {
      following = true;
      pointer.classList.remove('accepts-input');
      showPointerInCanvas();
    }
    function exitFollowMode() {
      following = false;
      pointer.classList.add('accepts-input');
      var el = getCanvasArea();
      if (el) el.classList.remove('tp-hide-cursor');
    }
    function deactivate() {
      active = false; following = false; dragging = false; insideCanvas = true;
      btn.classList.remove('active');
      pointer.style.display = 'none';
      pointer.classList.remove('accepts-input', 'dragging');
      var el = getCanvasArea();
      if (el) el.classList.remove('tp-hide-cursor');
    }

    updateSizes();

    function isTouch(e) { return e.pointerType === 'touch'; }

    // Toggle button
    btn.addEventListener('pointerdown', function (e) {
      e.stopPropagation(); e.preventDefault();
      if (!active) {
        active = true; btn.classList.add('active'); updateSizes();
        if (isTouch(e)) {
          var centre = getCanvasCentre();
          var clamped = clampToCanvas(centre.x, centre.y);
          pointerX = clamped.x; pointerY = clamped.y;
          updatePointerPosition();
          pointer.style.display = 'block';
          pointer.classList.add('accepts-input');
        } else {
          var clamped2 = clampToCanvas(e.clientX, e.clientY);
          pointerX = clamped2.x; pointerY = clamped2.y;
          updatePointerPosition();
          insideCanvas = isInsideCanvas(e.clientX, e.clientY);
          enterFollowMode();
        }
      } else {
        deactivate();
      }
    });

    // Follow cursor when in follow mode (mouse only)
    document.addEventListener('pointermove', function (e) {
      if (!active || !following || isTouch(e)) return;
      var nowInside = isInsideCanvas(e.clientX, e.clientY);
      if (nowInside && !insideCanvas) { insideCanvas = true; showPointerInCanvas(); }
      else if (!nowInside && insideCanvas) { insideCanvas = false; hidePointerFromCanvas(); }
      if (nowInside) {
        var clamped = clampToCanvas(e.clientX, e.clientY);
        pointerX = clamped.x; pointerY = clamped.y;
        updatePointerPosition();
      }
    });

    // Click in canvas to place pointer (exit follow mode)
    document.addEventListener('pointerdown', function (e) {
      if (!active || !following || isTouch(e)) return;
      if (btn.contains(e.target)) return;
      if (!isInsideCanvas(e.clientX, e.clientY)) return;
      e.stopPropagation(); e.preventDefault();
      exitFollowMode();
    });

    // Click pointer to re-enter follow mode (mouse) or start drag (touch)
    pointer.addEventListener('pointerdown', function (e) {
      if (!active) return;
      e.stopPropagation(); e.preventDefault();
      if (isTouch(e)) {
        dragging = true;
        pointer.classList.add('dragging');
        pointer.setPointerCapture(e.pointerId);
      } else {
        insideCanvas = true;
        enterFollowMode();
      }
    });

    // Touch drag
    pointer.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      e.stopPropagation(); e.preventDefault();
      var clamped = clampToCanvas(e.clientX, e.clientY);
      pointerX = clamped.x; pointerY = clamped.y;
      updatePointerPosition();
    });
    pointer.addEventListener('pointerup', function (e) {
      if (!dragging) return;
      e.stopPropagation(); dragging = false;
      pointer.classList.remove('dragging');
    });
    pointer.addEventListener('pointercancel', function () {
      dragging = false; pointer.classList.remove('dragging');
    });

    // Prevent pointer disc from propagating events that would disturb the canvas
    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchmove', 'touchend'].forEach(function (evt) {
      pointer.addEventListener(evt, function (e) {
        if (active) { e.stopPropagation(); e.preventDefault(); }
      });
    });

    // Resize
    window.addEventListener('resize', function () {
      updateSizes();
      var clamped = clampToCanvas(pointerX, pointerY);
      pointerX = clamped.x; pointerY = clamped.y;
      updatePointerPosition();
    });
  }


  /* ======================================================================
   * PUBLIC API
   * ====================================================================== */

  return {
    // Sidebar
    initSidebar:    initSidebar,
    wireToggle:     wireToggle,

    // Overlays
    initOverlay:    initOverlay,

    // Expression parsing
    parseExpr:      parseExpr,
    makeCustomPreset: makeCustomPreset,

    // Colour maps
    colourMaps:     colourMaps,
    sampleColourMap: sampleColourMap,
    colourToCSS:    colourToCSS,

    // 2D canvas
    resizeCanvas:   resizeCanvas,
    makeCoordTransforms: makeCoordTransforms,

    // 2D drawing
    drawArrow:      drawArrow,
    computeField:   computeField,
    drawHeatmap:    drawHeatmap,
    drawContours:   drawContours,
    drawColourbar:  drawColourbar,

    // Marching squares
    marchingSquares: marchingSquares,

    // Marching cubes
    buildIsosurface: buildIsosurface,

    // Three.js helpers
    makeTextSprite:  makeTextSprite,
    initThreeScene:  initThreeScene,
    initOrbitControls: initOrbitControls,

    // 3D drawing
    addArrow3D:     addArrow3D,
    disposeObject:  disposeObject,

    // Pointer
    initPointer:    initPointer,
  };

})();
