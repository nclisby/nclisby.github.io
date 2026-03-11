(function () {
  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function setPressed(element, isActive) {
    if (!element) return;
    element.classList.toggle('active', !!isActive);
    element.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  }

  function bindRangeValue(input, output, formatter = (value) => value) {
    if (!input || !output) return () => {};
    const sync = () => {
      output.textContent = formatter(input.value);
    };
    input.addEventListener('input', sync);
    sync();
    return sync;
  }

  function createOverlay(options) {
    const overlay = typeof options.overlay === 'string' ? qs(options.overlay) : options.overlay;
    const openButton = typeof options.openButton === 'string' ? qs(options.openButton) : options.openButton;
    const closeButton = typeof options.closeButton === 'string' ? qs(options.closeButton) : options.closeButton;
    const content = options.content
      ? (typeof options.content === 'string' ? qs(options.content) : options.content)
      : overlay?.firstElementChild;

    if (!overlay) {
      return {
        show() {}, hide() {}, toggle() {}, isVisible() { return false; }
      };
    }

    const visibleClass = options.visibleClass || 'visible';

    function show() {
      overlay.classList.add(visibleClass);
    }

    function hide() {
      overlay.classList.remove(visibleClass);
    }

    function toggle() {
      overlay.classList.toggle(visibleClass);
    }

    function isVisible() {
      return overlay.classList.contains(visibleClass);
    }

    if (openButton) {
      openButton.addEventListener('click', (event) => {
        event.stopPropagation();
        show();
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', hide);
    }

    if (options.closeOnBackdrop !== false) {
      overlay.addEventListener('click', hide);
    }

    if (content && options.stopContentPropagation !== false) {
      content.addEventListener('click', (event) => event.stopPropagation());
    }

    if (options.closeOnKeydown !== false) {
      document.addEventListener('keydown', (event) => {
        if (isVisible()) {
          hide();
          event.preventDefault();
        }
      });
    }

    return { show, hide, toggle, isVisible, overlay, openButton, closeButton, content };
  }

  function createTeachingPointer(options = {}) {
    const pointerOpacity = options.pointerOpacity ?? 0.85;
    const pointerSizeFraction = options.pointerSizeFraction ?? (1 / 60);
    const pointerColour = options.pointerColour ?? '#e53935';
    const buttonMargin = options.buttonMargin ?? 30;
    const canvasAreaSelector = options.canvasAreaSelector ?? '.canvas-area';

    let active = false;
    let following = false;
    let dragging = false;
    let insideCanvas = true;
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let canvasArea = null;

    function getCanvasArea() {
      if (!canvasArea) canvasArea = qs(canvasAreaSelector);
      return canvasArea;
    }

    function getPointerRadius() {
      const shortEdge = Math.min(screen.width || window.innerWidth, screen.height || window.innerHeight);
      return Math.round(shortEdge * pointerSizeFraction);
    }

    function getButtonSize() {
      return getPointerRadius() * 2;
    }

    function getCanvasBounds() {
      const element = getCanvasArea();
      if (!element) {
        return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
      }
      return element.getBoundingClientRect();
    }

    function isInsideCanvas(x, y) {
      const bounds = getCanvasBounds();
      return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
    }

    function clampToCanvas(x, y) {
      const bounds = getCanvasBounds();
      const radius = getPointerRadius();
      return {
        x: Math.max(bounds.left + radius, Math.min(bounds.right - radius, x)),
        y: Math.max(bounds.top + radius, Math.min(bounds.bottom - radius, y)),
      };
    }

    function getCanvasCentre() {
      const bounds = getCanvasBounds();
      return { x: (bounds.left + bounds.right) / 2, y: (bounds.top + bounds.bottom) / 2 };
    }

    const button = document.createElement('div');
    button.className = 'tp-btn';
    button.title = 'Teaching pointer';

    const pointer = document.createElement('div');
    pointer.className = 'tp-pointer';
    pointer.setAttribute('aria-hidden', 'true');
    pointer.style.background = pointerColour;
    pointer.style.opacity = String(pointerOpacity);

    document.body.appendChild(button);
    document.body.appendChild(pointer);

    function updateSizes() {
      const radius = getPointerRadius();
      pointer.style.width = `${radius * 2}px`;
      pointer.style.height = `${radius * 2}px`;
      const buttonSize = getButtonSize();
      button.style.width = `${buttonSize}px`;
      button.style.height = `${buttonSize}px`;
      button.style.right = `${buttonMargin}px`;
      button.style.bottom = `${buttonMargin}px`;
    }

    function updatePointerPosition() {
      pointer.style.left = `${pointerX}px`;
      pointer.style.top = `${pointerY}px`;
    }

    function showPointerInCanvas() {
      pointer.style.display = 'block';
      const element = getCanvasArea();
      if (element) element.classList.add('tp-hide-cursor');
    }

    function hidePointerFromCanvas() {
      pointer.style.display = 'none';
      const element = getCanvasArea();
      if (element) element.classList.remove('tp-hide-cursor');
    }

    function enterFollowMode() {
      following = true;
      pointer.classList.remove('accepts-input');
      showPointerInCanvas();
    }

    function exitFollowMode() {
      following = false;
      pointer.classList.add('accepts-input');
      const element = getCanvasArea();
      if (element) element.classList.remove('tp-hide-cursor');
    }

    function deactivate() {
      active = false;
      following = false;
      dragging = false;
      insideCanvas = true;
      button.classList.remove('active');
      pointer.style.display = 'none';
      pointer.classList.remove('accepts-input', 'dragging');
      const element = getCanvasArea();
      if (element) element.classList.remove('tp-hide-cursor');
    }

    function setActive(nextActive) {
      if (nextActive) {
        if (active) return;
        active = true;
        button.classList.add('active');
        updateSizes();
        const centre = getCanvasCentre();
        const clamped = clampToCanvas(centre.x, centre.y);
        pointerX = clamped.x;
        pointerY = clamped.y;
        updatePointerPosition();
        pointer.style.display = 'block';
        pointer.classList.add('accepts-input');
      } else {
        deactivate();
      }
    }

    function setPointerPosition(x, y) {
      const clamped = clampToCanvas(x, y);
      pointerX = clamped.x;
      pointerY = clamped.y;
      updatePointerPosition();
    }

    updateSizes();

    function isTouchEvent(event) {
      return event.pointerType === 'touch';
    }

    button.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      event.preventDefault();
      if (!active) {
        active = true;
        button.classList.add('active');
        updateSizes();
        const centre = getCanvasCentre();
        const clamped = clampToCanvas(centre.x, centre.y);
        pointerX = clamped.x;
        pointerY = clamped.y;
        updatePointerPosition();
        pointer.style.display = 'block';
        pointer.classList.add('accepts-input');
        insideCanvas = true;
      } else {
        deactivate();
      }
    });

    document.addEventListener('pointermove', (event) => {
      if (!active || !following || isTouchEvent(event)) return;
      const nowInside = isInsideCanvas(event.clientX, event.clientY);
      if (nowInside && !insideCanvas) {
        insideCanvas = true;
        showPointerInCanvas();
      } else if (!nowInside && insideCanvas) {
        insideCanvas = false;
        hidePointerFromCanvas();
      }
      if (nowInside) {
        const clamped = clampToCanvas(event.clientX, event.clientY);
        pointerX = clamped.x;
        pointerY = clamped.y;
        updatePointerPosition();
      }
    });

    document.addEventListener('pointerdown', (event) => {
      if (!active || !following || isTouchEvent(event)) return;
      if (button.contains(event.target)) return;
      if (!isInsideCanvas(event.clientX, event.clientY)) return;
      event.stopPropagation();
      event.preventDefault();
      exitFollowMode();
    });

    pointer.addEventListener('pointerdown', (event) => {
      if (!active) return;
      event.stopPropagation();
      event.preventDefault();
      if (isTouchEvent(event)) {
        dragging = true;
        pointer.classList.add('dragging');
        pointer.setPointerCapture(event.pointerId);
      } else {
        insideCanvas = true;
        enterFollowMode();
      }
    });

    pointer.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      event.stopPropagation();
      event.preventDefault();
      const clamped = clampToCanvas(event.clientX, event.clientY);
      pointerX = clamped.x;
      pointerY = clamped.y;
      updatePointerPosition();
    });

    pointer.addEventListener('pointerup', (event) => {
      if (!dragging) return;
      event.stopPropagation();
      dragging = false;
      pointer.classList.remove('dragging');
    });

    pointer.addEventListener('pointercancel', () => {
      dragging = false;
      pointer.classList.remove('dragging');
    });

    ['click', 'mousedown', 'mouseup', 'touchstart', 'touchmove', 'touchend'].forEach((eventName) => {
      pointer.addEventListener(eventName, (event) => {
        if (active) {
          event.stopPropagation();
          event.preventDefault();
        }
      });
    });

    window.addEventListener('resize', () => {
      updateSizes();
      const clamped = clampToCanvas(pointerX, pointerY);
      pointerX = clamped.x;
      pointerY = clamped.y;
      updatePointerPosition();
    });

    return {
      button,
      pointer,
      setActive,
      setPointerPosition,
      layout: updateSizes,
      isActive() { return active; },
    };
  }

  function initOverview() {
    return createOverlay({
      overlay: '#overviewOverlay',
      openButton: '#btnOverview',
      closeButton: '#overviewClose',
      content: '#overviewContent',
      visibleClass: 'visible',
    });
  }

  function initDefaultUI() {
    const overview = initOverview();
    const pointer = createTeachingPointer();
    return { overview, pointer };
  }

  window.AppUI = {
    qs,
    qsa,
    setPressed,
    bindRangeValue,
    createOverlay,
    createTeachingPointer,
    initOverview,
    initDefaultUI,
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.__appSharedUI = initDefaultUI();
  });
})();
