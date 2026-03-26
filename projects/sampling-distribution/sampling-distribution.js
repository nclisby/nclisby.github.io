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
    name: 'Exponential: exp(-x)',
    sample: function () { return -Math.log(1 - Math.random()) - 1; },
    pdf: function (x) { return (x >= -1) ? Math.exp(-(x + 1)) : 0; },
    variance: 1,
    discrete: false,
    xRange: [-2, 6],
    cltApplies: true
  });

  // Normal(0, 1)
  populations.push({
    name: 'Normal: C exp(-x²)',
    sample: function () { return randn(); },
    pdf: function (x) { return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI); },
    variance: 1,
    discrete: false,
    xRange: [-4, 4],
    cltApplies: true
  });

  // Power-law (exponent 3.5) / Pareto alpha=2.5, shifted to mean zero
  // X ~ Pareto(1, alpha), E[X] = alpha/(alpha-1), Var = alpha/((a-1)^2*(a-2))
  // For alpha=2.5: mean = 2.5/1.5 = 5/3, var = 2.5/(1.5^2*0.5) = 2.5/1.125 = 20/9
  (function () {
    var alpha = 2.5;
    var mu = alpha / (alpha - 1);                          // 5/3
    var v = alpha / ((alpha - 1) * (alpha - 1) * (alpha - 2)); // 20/9
    populations.push({
      // name: 'Pareto (α = 2.5)',
      name: 'Power-law: C/x^3.5',
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

  // Power-law (exponent 2.5) Pareto (alpha=1.5), shifted to mean zero
  // E[X] = alpha/(alpha-1) = 3, Var = infinite (alpha <= 2)
  (function () {
    var alpha = 1.5;
    var mu = alpha / (alpha - 1);  // 3
    populations.push({
      // name: 'Pareto (α = 1.5)',
      name: 'Power-law: C/x^2.5',
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
    name: 'Cauchy: C/(1+x²)',
    sample: function () { return Math.tan(Math.PI * (Math.random() - 0.5)); },
    pdf: function (x) { return 1.0 / (Math.PI * (1 + x * x)); },
    variance: null,
    discrete: false,
    xRange: [-8, 8],
    cltApplies: false
  });

  // Heavy-tailed: C/(1 + |x|^1.5), C = 3√3/(8π) — no finite mean
  // Sampling via precomputed inverse half-CDF table with log-space interpolation
  // in the tail and asymptotic formula for the deep tail.
  (function () {
    var HT_C = 2.067483357831720e-01;
    var HT_SPLIT = 0.45;
    var HT_DEEP = 0.4999;
    var HT_BODY = [[0.0000000000,0.0000000000],[0.0030201342,0.0146181032],[0.0060402685,0.0292740270],[0.0090604027,0.0439847093],[0.0120805369,0.0587629965],[0.0151006711,0.0736198929],[0.0181208054,0.0885653136],[0.0211409396,0.1036084605],[0.0241610738,0.1187580434],[0.0271812081,0.1340224243],[0.0302013423,0.1494097190],[0.0332214765,0.1649278723],[0.0362416107,0.1805847158],[0.0392617450,0.1963880143],[0.0422818792,0.2123455041],[0.0453020134,0.2284649256],[0.0483221477,0.2447540512],[0.0513422819,0.2612207101],[0.0543624161,0.2778728110],[0.0573825503,0.2947183626],[0.0604026846,0.3117654930],[0.0634228188,0.3290224677],[0.0664429530,0.3464977072],[0.0694630872,0.3641998042],[0.0724832215,0.3821375397],[0.0755033557,0.4003199001],[0.0785234899,0.4187560930],[0.0815436242,0.4374555642],[0.0845637584,0.4564280139],[0.0875838926,0.4756834138],[0.0906040268,0.4952320246],[0.0936241611,0.5150844135],[0.0966442953,0.5352514723],[0.0996644295,0.5557444367],[0.1026845638,0.5765749053],[0.1057046980,0.5977548603],[0.1087248322,0.6192966886],[0.1117449664,0.6412132033],[0.1147651007,0.6635176673],[0.1177852349,0.6862238174],[0.1208053691,0.7093458888],[0.1238255034,0.7328986427],[0.1268456376,0.7568973930],[0.1298657718,0.7813580366],[0.1328859060,0.8062970836],[0.1359060403,0.8317316903],[0.1389261745,0.8576796929],[0.1419463087,0.8841596447],[0.1449664430,0.9111908534],[0.1479865772,0.9387934226],[0.1510067114,0.9669882939],[0.1540268456,0.9957972929],[0.1570469799,1.0252431776],[0.1600671141,1.0553496888],[0.1630872483,1.0861416052],[0.1661073826,1.1176448008],[0.1691275168,1.1498863060],[0.1721476510,1.1828943737],[0.1751677852,1.2166985477],[0.1781879195,1.2513297375],[0.1812080537,1.2868202973],[0.1842281879,1.3232041095],[0.1872483221,1.3605166751],[0.1902684564,1.3987952097],[0.1932885906,1.4380787457],[0.1963087248,1.4784082425],[0.1993288591,1.5198267035],[0.2023489933,1.5623793024],[0.2053691275,1.6061135177],[0.2083892617,1.6510792772],[0.2114093960,1.6973291138],[0.2144295302,1.7449183320],[0.2174496644,1.7939051869],[0.2204697987,1.8443510776],[0.2234899329,1.8963207550],[0.2265100671,1.9498825449],[0.2295302013,2.0051085904],[0.2325503356,2.0620751118],[0.2355704698,2.1208626883],[0.2385906040,2.1815565626],[0.2416107383,2.2442469701],[0.2446308725,2.3090294959],[0.2476510067,2.3760054615],[0.2506711409,2.4452823450],[0.2536912752,2.5169742369],[0.2567114094,2.5912023363],[0.2597315436,2.6680954909],[0.2627516779,2.7477907849],[0.2657718121,2.8304341811],[0.2687919463,2.9161812215],[0.2718120805,3.0051977934],[0.2748322148,3.0976609680],[0.2778523490,3.1937599188],[0.2808724832,3.2936969303],[0.2838926174,3.3976885048],[0.2869127517,3.5059665806],[0.2899328859,3.6187798731],[0.2929530201,3.7363953545],[0.2959731544,3.8590998874],[0.2989932886,3.9872020313],[0.3020134228,4.1210340442],[0.3050335570,4.2609541023],[0.3080536913,4.4073487660],[0.3110738255,4.5606357245],[0.3140939597,4.7212668547],[0.3171140940,4.8897316366],[0.3201342282,5.0665609731],[0.3231543624,5.2523314714],[0.3261744966,5.4476702480],[0.3291946309,5.6532603351],[0.3322147651,5.8698467730],[0.3352348993,6.0982434920],[0.3382550336,6.3393411023],[0.3412751678,6.5941157299],[0.3442953020,6.8636390655],[0.3473154362,7.1490898164],[0.3503355705,7.4517667938],[0.3533557047,7.7731039049],[0.3563758389,8.1146873748],[0.3593959732,8.4782755853],[0.3624161074,8.8658219951],[0.3654362416,9.2795017006],[0.3684563758,9.7217423128],[0.3714765101,10.1952599733],[0.3744966443,10.7031015072],[0.3775167785,11.2486939405],[0.3805369128,11.8359028892],[0.3835570470,12.4691016835],[0.3865771812,13.1532535446],[0.3895973154,13.8940097078],[0.3926174497,14.6978271299],[0.3956375839,15.5721103779],[0.3986577181,16.5253835483],[0.4016778523,17.5674997068],[0.4046979866,18.7098975063],[0.4077181208,19.9659175326],[0.4107382550,21.3511948094],[0.4137583893,22.8841491614],[0.4167785235,24.5866023448],[0.4197986577,26.4845608306],[0.4228187919,28.6092170761],[0.4258389262,30.9982418663],[0.4288590604,33.6974686002],[0.4318791946,36.7631115010],[0.4348993289,40.2647203261],[0.4379194631,44.2891648982],[0.4409395973,48.9460810618],[0.4439597315,54.3754243619],[0.4469798658,60.7581180022],[0.4500000000,68.3313332518]];
    var HT_TAIL = [[0.453042206564,4.3500679521],[0.455899312713,4.4757413897],[0.458582580720,4.6013932191],[0.461102587616,4.7270271539],[0.463469266882,4.8526462690],[0.465691947603,4.9782531103],[0.467779391247,5.1038497861],[0.469739826196,5.2294380423],[0.471580980184,5.3550193249],[0.473310110757,5.4805948314],[0.474934033882,5.6061655535],[0.476459150815,5.7317323128],[0.477891473333,5.8572957896],[0.479236647432,5.9828565474],[0.480499975582,6.1084150532],[0.481686437627,6.2339716934],[0.482800710421,6.3595267884],[0.483847186254,6.4850806033],[0.484829990174,6.6106333580],[0.485752996243,6.7361852345],[0.486619842810,6.8617363834],[0.487433946851,6.9872869298],[0.488198517439,7.1128369770],[0.488916568393,7.2383866107],[0.489590930161,7.3639359019],[0.490224260972,7.4894849093],[0.490819057321,7.6150336818],[0.491377663803,7.7405822596],[0.491902282358,7.8661306761],[0.492394980954,7.9916789591],[0.492857701731,8.1172271314],[0.493292268665,8.2427752120],[0.493700394751,8.3683232167],[0.494083688759,8.4938711586],[0.494443661577,8.6194190483],[0.494781732162,8.7449668949],[0.495099233135,8.8705147058],[0.495397416038,8.9960624870],[0.495677456260,9.1216102437],[0.495940457679,9.2471579801],[0.496187457005,9.3727056997],[0.496419427872,9.4982534053],[0.496637284672,9.6238010994],[0.496841886165,9.7493487839],[0.497034038858,9.8748964605],[0.497214500187,10.0004441305],[0.497383981503,10.1259917951],[0.497543150876,10.2515394552],[0.497692635727,10.3770871115],[0.497833025302,10.5026347648],[0.497964872995,10.6281824155],[0.498088698529,10.7537300641],[0.498204990007,10.8792777109],[0.498314205831,11.0048253563],[0.498416776512,11.1303730005],[0.498513106370,11.2559206436],[0.498603575121,11.3814682860],[0.498688539380,11.5070159276],[0.498768334062,11.6325635687],[0.498843273706,11.7581112093],[0.498913653713,11.8836588496],[0.498979751509,12.0092064895],[0.499041827642,12.1347541291],[0.499100126807,12.2603017685],[0.499154878809,12.3858494078],[0.499206299474,12.5113970469],[0.499254591493,12.6369446858],[0.499299945226,12.7624923247],[0.499342539451,12.8880399634],[0.499382542067,13.0135876021],[0.499420110758,13.1391352408],[0.499455393615,13.2646828794],[0.499488529718,13.3902305179],[0.499519649683,13.5157781564],[0.499548876180,13.6413257949],[0.499576324417,13.7668734334],[0.499602102590,13.8924210718],[0.499626312312,14.0179687103],[0.499649049015,14.1435163487],[0.499670402323,14.2690639871],[0.499690456407,14.3946116255],[0.499709290318,14.5201592639],[0.499726978296,14.6457069022],[0.499743590065,14.7712545406],[0.499759191104,14.8968021790],[0.499773842912,15.0223498174],[0.499787603244,15.1478974557],[0.499800526340,15.2734450941],[0.499812663142,15.3989927325],[0.499824061490,15.5245403708],[0.499834766316,15.6500880092],[0.499844819816,15.7756356475],[0.499854261619,15.9011832859],[0.499863128945,16.0267309242],[0.499871456745,16.1522785626],[0.499879277848,16.2778262009],[0.499886623082,16.4033738393],[0.499893521402,16.5289214777],[0.499900000000,16.6544691160]];

    // Binary search helper for [u, v] table
    function tableInterp(table, uq) {
      if (uq <= table[0][0]) return table[0][1];
      if (uq >= table[table.length - 1][0]) return table[table.length - 1][1];
      var lo = 0, hi = table.length - 1;
      while (hi - lo > 1) {
        var mid = (lo + hi) >> 1;
        if (table[mid][0] <= uq) lo = mid; else hi = mid;
      }
      var t = (uq - table[lo][0]) / (table[hi][0] - table[lo][0]);
      return table[lo][1] + t * (table[hi][1] - table[lo][1]);
    }

    function sampleHalfInverse(u) {
      // u in [0, 0.5): return x >= 0 such that half-CDF(x) = u
      if (u <= HT_SPLIT) return tableInterp(HT_BODY, u);
      if (u <= HT_DEEP) return Math.exp(tableInterp(HT_TAIL, u));
      // Deep tail: asymptotic x ≈ (2C / (0.5 - u))^2
      var gap = 0.5 - u;
      if (gap <= 0) return 1e16;
      return (2 * HT_C / gap) * (2 * HT_C / gap);
    }

    populations.push({
      name: 'Heavy-tailed: C/(1+|x|^1.5)',
      sample: function () {
        var sign = Math.random() < 0.5 ? -1 : 1;
        var u = Math.random() * 0.5;
        return sign * sampleHalfInverse(u);
      },
      pdf: function (x) {
        return HT_C / (1 + Math.pow(Math.abs(x), 1.5));
      },
      variance: null,
      discrete: false,
      xRange: [-8, 8],
      cltApplies: false,
      rescaleFrac: 0.5
    });
  })();


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
    showBinSlider: false,
    binSizeFactor: 1,          // multiplicative factor for histogram bin width

    // Sampling data
    sampleMeans: [],         // accumulated sample means
    currentSample: [],       // latest sample values
    currentMean: null,       // latest sample mean
    totalSamples: 0,
    lastAction: null,        // last sampling action: 'animate', 1, 5, 100, 10000
    empiricalHalfW: null,    // cached 90% percentile half-width for non-CLT rescale

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
      // CLT case: theoretical sigma/sqrt(n)
      var sigma = Math.sqrt(pop.variance / state.sampleSize);
      var halfW = 3 * sigma;
      if (halfW < 1.e-8) halfW = 1.e-8;
      return [-halfW, halfW];
    }
    // Non-CLT case: use cached empirical 90% half-width
    if (state.empiricalHalfW !== null) {
      return [-state.empiricalHalfW, state.empiricalHalfW];
    }
    // Fallback to population range
    return pop.xRange;
  }

  // Compute the 90% empirical half-width from accumulated sample means.
  // Uses a single linear scan with two running counts, avoiding a full sort.
  function updateEmpiricalHalfW() {
    var n = state.sampleMeans.length;
    if (n < 20) { state.empiricalHalfW = null; return; }

    // Find the percentile of |sampleMean| using quickselect (O(n) average).
    // Use per-population rescaleFrac if specified, default 0.90.
    var pop = populations[state.popIndex];
    var frac = (pop.rescaleFrac != null) ? pop.rescaleFrac : 0.90;

    var absVals = new Float64Array(n);
    for (var i = 0; i < n; i++) absVals[i] = Math.abs(state.sampleMeans[i]);

    var target = Math.floor(n * frac);
    var halfW = quickselect(absVals, target, 0, n - 1);
    state.empiricalHalfW = (halfW > 1e-8) ? halfW : null;
  }

  // Quickselect: find the k-th smallest element in arr[lo..hi] in place.
  function quickselect(arr, k, lo, hi) {
    while (lo < hi) {
      // Median-of-three pivot
      var mid = (lo + hi) >> 1;
      if (arr[mid] < arr[lo]) { var t1 = arr[lo]; arr[lo] = arr[mid]; arr[mid] = t1; }
      if (arr[hi] < arr[lo]) { var t2 = arr[lo]; arr[lo] = arr[hi]; arr[hi] = t2; }
      if (arr[mid] < arr[hi]) { var t3 = arr[mid]; arr[mid] = arr[hi]; arr[hi] = t3; }
      var pivot = arr[hi];

      var i = lo, j = hi - 1;
      while (true) {
        while (arr[i] < pivot) i++;
        while (j > i && arr[j] >= pivot) j--;
        if (i >= j) break;
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        i++; j--;
      }
      var tmp2 = arr[i]; arr[i] = arr[hi]; arr[hi] = tmp2;

      if (i === k) return arr[i];
      else if (k < i) hi = i - 1;
      else lo = i + 1;
    }
    return arr[lo];
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
      var labelY = rect.y + 6 + (state.showBinSlider ? 36 : 0);
      ctx.fillText('μ = 0   σ = ' + sigmaStr, rect.x + 8, labelY);
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
      var nBins = Math.max(5, Math.round(chooseBinCount(state.sampleMeans.length) / state.binSizeFactor));
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
    updateEmpiricalHalfW();
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
    state.empiricalHalfW = null;
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
      updateEmpiricalHalfW();
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
    if (!pop.cltApplies) {
      btnN.classList.add('disabled-btn');
      btnN.classList.remove('active');
      state.showNormal = false;
    } else {
      btnN.classList.remove('disabled-btn');
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
      // Reset bin size slider
      state.showBinSlider = false;
      state.binSizeFactor = 1;
      document.getElementById('toggleBinSize').classList.remove('active');
      document.getElementById('binSliderWrap').style.display = 'none';
      document.getElementById('binSlider').value = 0;
      document.getElementById('binSliderValue').textContent = '1.00';
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
      var raw = parseFloat(binSlider.value); // -1 to 1 (log10 scale)
      // Dead zone: snap to 0 (factor=1) when close to centre
      if (Math.abs(raw) < 0.04) raw = 0;
      state.binSizeFactor = Math.pow(10, raw);
      binSliderValue.textContent = state.binSizeFactor.toFixed(2);
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
