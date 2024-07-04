let gridSize = 100;
let spins;
let spinFlipAttempts = 100;
let savedSpinFlipAttempts = spinFlipAttempts;
let buttonWidth = 50;
let buttonHeight = 40;
let Tc = 2.269185; // Critical temperature
let temperature = Tc;
let font;
let squareSize;
let sideMargin = 0;
let menuWidth = 400;
let indexGridSize = 3;
let gridSizes = ["10x10", "20x20", "50x50", "100x100", "200x200", "500x500", "1000x1000"];
let selectedGridSize;
let gridSizeButtons = [];
let quitButton, tempMinusButton, tempPlusButton, speedMinusButton, speedPlusButton, pauseButton, invertButton, colorButton, helpButton, metropolisButton, wolffButton, swendsenWangButton;
let showHelp = false;
let inverted = false;
let colorMode = 0;
let algorithmMode = 0; // 0: Metropolis, 1: Wolff, 2: Swendsen-Wang
let currentCluster;
let swendsenWangClusters;
let newSpins;
let currentClusterIndex;
let originalSpin;
let currentI;
let currentJ;

function setup() {
  // createCanvas(1600, 1000);
  // createCanvas(1200, 700);
  createCanvas(windowWidth,windowHeight);
  //textFont('Verdana');
  textSize(20);

  selectedGridSize = gridSizes[indexGridSize]; // Initialize selectedGridSize

  // quitButton = new Button(width - menuWidth + 20, 50, menuWidth - 40, buttonHeight, "Quit");

  // for (let i = 0; i < gridSizes.length; i++) {
  //   gridSizeButtons.push(new Button(width - menuWidth + 20, 100 + (i + 1) * (buttonHeight + 5), menuWidth - 40, buttonHeight, gridSizes[i]));
  // }

  // let lastButtonY = 100 + (gridSizes.length + 1) * (buttonHeight + 5);
  let lastButtonY = 50;
  let spacing = 20; // Increased space for clarity
  metropolisButton = new Button(width - menuWidth + 20, lastButtonY + spacing, menuWidth - 40, buttonHeight, "Metropolis");
  wolffButton = new Button(width - menuWidth + 20, lastButtonY + 50 + spacing, menuWidth - 40, buttonHeight, "Wolff");
  swendsenWangButton = new Button(width - menuWidth + 20, lastButtonY + 100 + spacing, menuWidth - 40, buttonHeight, "Swendsen-Wang");
  tempMinusButton = new Button(width - menuWidth + 20, lastButtonY + 150 + 2 * spacing, buttonWidth, buttonHeight, "-");
  tempPlusButton = new Button(width - menuWidth + 80, lastButtonY + 150 + 2 * spacing, buttonWidth, buttonHeight, "+");
  speedMinusButton = new Button(width - menuWidth + 20, lastButtonY + 200 + 2 * spacing, buttonWidth, buttonHeight, "-");
  speedPlusButton = new Button(width - menuWidth + 80, lastButtonY + 200 + 2 * spacing, buttonWidth, buttonHeight, "+");
  // pauseButton = new Button(width - menuWidth + 20, lastButtonY + 250 + 3 * spacing, menuWidth - 40, buttonHeight, "Pause");
  // invertButton = new Button(width - menuWidth + 20, lastButtonY + 300 + 3 * spacing, menuWidth - 40, buttonHeight, "Invert");
  // colorButton = new Button(width - menuWidth + 20, lastButtonY + 350 + 3 * spacing, menuWidth - 40, buttonHeight, "Colour");
  // helpButton = new Button(width - menuWidth + 20, lastButtonY + 400 + 3 * spacing, menuWidth - 40, buttonHeight, "Help");

  initializeSpins();
  updateButtonStates(); // Update button states on setup
}

function draw() {
  background(255);

  if (!showHelp) {
    if (algorithmMode === 0) {
      for (let i = 0; i < spinFlipAttempts; i++) {
        metropolisUpdate();
      }
    } else if (algorithmMode === 1) {
      wolffUpdate(spinFlipAttempts);
    } else if (algorithmMode === 2) {
      swendsenWangUpdate(spinFlipAttempts);
    }
    displaySpins();
  }

  displayControls();
  if (showHelp) {
    displayHelp();
  }
}

function increaseTemperature() {
  if ((abs(temperature / Tc - 1.0) <= 0.200001) || (abs(temperature / Tc) <= 0.200001)) {
    temperature += 0.01 * Tc;
  } else if (abs(temperature / Tc - 1.0) <= 2.00001) {
    temperature += 0.1 * Tc;
  } else {
    temperature += 1 * Tc;
  }
}

function decreaseTemperature() {
  if ((abs(temperature / Tc - 1.0) <= 0.200001) || (abs(temperature / Tc) <= 0.200001)) {
    temperature = max(0.0, temperature - 0.01 * Tc);
  } else if (abs(temperature / Tc - 1.0) <= 2.00001) {
    temperature = max(0.0, temperature - 0.1 * Tc);
  } else {
    temperature = max(0.0, temperature - 1.0 * Tc);
  }
}

function mousePressed() {
  if (quitButton.isClicked(mouseX, mouseY)) {
    noLoop();
  } else if (tempMinusButton.isClicked(mouseX, mouseY)) {
    increaseTemperature();
  } else if (tempPlusButton.isClicked(mouseX, mouseY)) {
    decreaseTemperature();
  } else if (speedMinusButton.isClicked(mouseX, mouseY)) {
    spinFlipAttempts = max(0, (2 * spinFlipAttempts) / 3);
  } else if (speedPlusButton.isClicked(mouseX, mouseY)) {
    spinFlipAttempts = min(1000000, 1 + (3 * spinFlipAttempts) / 2);
  } else if (pauseButton.isClicked(mouseX, mouseY)) {
    togglePause();
  } else if (invertButton.isClicked(mouseX, mouseY)) {
    toggleInvert();
  } else if (colorButton.isClicked(mouseX, mouseY)) {
    cycleColorMode();
  } else if (helpButton.isClicked(mouseX, mouseY)) {
    showHelp = !showHelp;
  } else if (metropolisButton.isClicked(mouseX, mouseY)) {
    algorithmMode = 0;
    finishWolffUpdate();
    currentCluster = null; // Reset the cluster for Wolff algorithm
    finishSwendsenWangUpdate();
    swendsenWangClusters = null; // Reset the clusters for Swendsen-Wang algorithm
    updateButtonStates();
  } else if (wolffButton.isClicked(mouseX, mouseY)) {
    algorithmMode = 1;
    finishWolffUpdate();
    currentCluster = null; // Reset the cluster for Wolff algorithm
    finishSwendsenWangUpdate();
    swendsenWangClusters = null; // Reset the clusters for Swendsen-Wang algorithm
    updateButtonStates();
  } else if (swendsenWangButton.isClicked(mouseX, mouseY)) {
    algorithmMode = 2;
    finishWolffUpdate();
    currentCluster = null; // Reset the cluster for Wolff algorithm
    finishSwendsenWangUpdate();
    swendsenWangClusters = null; // Reset the clusters for Swendsen-Wang algorithm
    updateButtonStates();
  }

  for (let b of gridSizeButtons) {
    if (b.isClicked(mouseX, mouseY)) {
      selectedGridSize = b.label;
      for (let i = 0; i < gridSizes.length; i++) {
        indexGridSize = i;
        if (selectedGridSize === gridSizes[i]) break;
      }
      initializeSpins();
      updateButtonStates();
      break;
    }
  }
}

function keyPressed() {
  if (keyCode === UP_ARROW) {
    increaseTemperature();
  } else if (keyCode === DOWN_ARROW) {
    decreaseTemperature();
  } else if (keyCode === RIGHT_ARROW) {
    spinFlipAttempts = min(1000000, 1 + (3 * spinFlipAttempts) / 2);
  } else if (keyCode === LEFT_ARROW) {
    spinFlipAttempts = max(0, (2 * spinFlipAttempts) / 3);
  } else if (key === 'q' || key === 'Q') {
    noLoop();
  } else if (key === 'p' || key === 'P') {
    togglePause();
  } else if (key === 'i' || key === 'I') {
    toggleInvert();
  } else if (key === 'c' || key === 'C') {
    cycleColorMode();
  } else if (key === 'l' || key === 'L') {
    cycleGridSize();
    initializeSpins();
    updateButtonStates();
  } else if (key === 'h' || key === 'H') {
    showHelp = !showHelp;
  } else if (key === 'm' || key === 'M') {
    algorithmMode = 0;
    finishWolffUpdate();
    currentCluster = null; // Reset the cluster for Wolff algorithm
    finishSwendsenWangUpdate();
    swendsenWangClusters = null; // Reset the clusters for Swendsen-Wang algorithm
    updateButtonStates();
  } else if (key === 'w' || key === 'W') {
    finishWolffUpdate();
    algorithmMode = 1;
    finishWolffUpdate();
    currentCluster = null; // Reset the cluster for Wolff algorithm
    finishSwendsenWangUpdate();
    swendsenWangClusters = null; // Reset the clusters for Swendsen-Wang algorithm
    updateButtonStates();
  } else if (key === 's' || key === 'S') {
    algorithmMode = 2;
    finishWolffUpdate();
    currentCluster = null; // Reset the cluster for Wolff algorithm
    finishSwendsenWangUpdate();
    swendsenWangClusters = null; // Reset the clusters for Swendsen-Wang algorithm
    updateButtonStates();
  } else if (key >= '0' && key <= '6') {
    let index = key - '0';
    if (index < gridSizes.length) {
      selectedGridSize = gridSizes[index];
      initializeSpins();
      updateButtonStates();
    }
  }
}

function initializeSpins() {
  gridSize = int(selectedGridSize.split("x")[0]);
  spins = Array(gridSize).fill().map(() => Array(gridSize).fill().map(() => random(1) < 0.5 ? -1 : 1));
  updateSquareSize();
  currentCluster = null; // Reset the cluster for Wolff algorithm
  swendsenWangClusters = null; // Reset the clusters for Swendsen-Wang algorithm
}

function updateSquareSize() {
  squareSize = min((width - sideMargin - menuWidth) / gridSize * gridSize, height / gridSize * gridSize);
}

function metropolisUpdate() {
  let i = int(random(gridSize));
  let j = int(random(gridSize));
  let dE = 2 * spins[i][j] * (spins[(i + 1) % gridSize][j] + spins[(i - 1 + gridSize) % gridSize][j] + spins[i][(j + 1) % gridSize] + spins[i][(j - 1 + gridSize) % gridSize]);
  if (dE <= 0 || random(1) < exp(-dE / temperature)) {
    spins[i][j] *= -1;
  }
}

function wolffUpdate(spinFlipAttempts) {
  let flips = 0;

  while (flips < spinFlipAttempts) {
    if (currentCluster == null) {
      let i = int(random(gridSize));
      let j = int(random(gridSize));
      originalSpin = spins[i][j];
      currentCluster = [];
      currentCluster.push([i, j]);
      spins[i][j] *= -1;
      currentClusterIndex = 0;
    }

    while (currentClusterIndex < currentCluster.length && flips < spinFlipAttempts) {
      let site = currentCluster[currentClusterIndex];
      let x = site[0];
      let y = site[1];
      let neighbors = [
        [(x + 1) % gridSize, y],
        [(x - 1 + gridSize) % gridSize, y],
        [x, (y + 1) % gridSize],
        [x, (y - 1 + gridSize) % gridSize]
      ];

      for (let neighbor of neighbors) {
        let nx = neighbor[0];
        let ny = neighbor[1];
        if (spins[nx][ny] == originalSpin && random(1) < 1 - exp(-2 / temperature)) {
          spins[nx][ny] *= -1;
          currentCluster.push([nx, ny]);
        }
        flips++;
      }
      currentClusterIndex++;
    }

    if (currentClusterIndex >= currentCluster.length) {
      currentCluster = null; // Finished processing the current cluster
    }
  }
}

function finishWolffUpdate() {
  if (currentCluster != null) {
    while (currentClusterIndex < currentCluster.length) {
      let site = currentCluster[currentClusterIndex];
      let x = site[0];
      let y = site[1];
      let neighbors = [
        [(x + 1) % gridSize, y],
        [(x - 1 + gridSize) % gridSize, y],
        [x, (y + 1) % gridSize],
        [x, (y - 1 + gridSize) % gridSize]
      ];

      for (let neighbor of neighbors) {
        let nx = neighbor[0];
        let ny = neighbor[1];
        if (spins[nx][ny] == originalSpin && random(1) < 1 - exp(-2 / temperature)) {
          spins[nx][ny] *= -1;
          currentCluster.push([nx, ny]);
        }
      }
      currentClusterIndex++;
    }

    currentCluster = null; // Finished processing the current cluster
  }
}

function swendsenWangUpdate(spinFlipAttempts) {
  if (swendsenWangClusters == null) {
    swendsenWangClusters = [];
    let visited = Array(gridSize).fill().map(() => Array(gridSize).fill(false));
    newSpins = Array(gridSize).fill().map(() => Array(gridSize).fill(0));

    for (let j = 0; j < gridSize; j++) { // Sweep from top to bottom
      for (let i = 0; i < gridSize; i++) { // Increment x in the inner loop
        if (!visited[i][j]) {
          let clusterSpin = spins[i][j];
          let cluster = [];
          let stack = [];
          stack.push([i, j]);
          visited[i][j] = true;

          while (stack.length > 0) {
            let site = stack.pop();
            cluster.push(site);
            let x = site[0];
            let y = site[1];
            let neighbors = [
              [(x + 1) % gridSize, y],
              [(x - 1 + gridSize) % gridSize, y],
              [x, (y + 1) % gridSize],
              [x, (y - 1 + gridSize) % gridSize]
            ];

            for (let neighbor of neighbors) {
              let nx = neighbor[0];
              let ny = neighbor[1];
              if (!visited[nx][ny] && spins[nx][ny] == clusterSpin && random(1) < 1 - exp(-2 / temperature)) {
                stack.push([nx, ny]);
                visited[nx][ny] = true;
              }
            }
          }
          swendsenWangClusters.push(cluster);
        }
      }
    }
    currentClusterIndex = 0;

    while (currentClusterIndex < swendsenWangClusters.length) {
      //decide whether to flip the cluster
      let fac = 1;
      if (random(1) < 0.5) fac = -1;
      let cluster = swendsenWangClusters[currentClusterIndex];
      for (let site of cluster) {
        newSpins[site[0]][site[1]] = fac * spins[site[0]][site[1]];
      }
      currentClusterIndex++;
    }
    currentI = 0;
    currentJ = 0;
  }

  let finished = true;
  let flips = 0;
  let i = currentI;
  let j = currentJ;
  while (true) {
    spins[i][j] = newSpins[i][j];
    i = i + 1;
    if (i == gridSize) {
      i = 0;
      j++;
    }
    flips++;
    if (j >= gridSize) break;
    if (flips >= spinFlipAttempts) {
      currentI = i;
      currentJ = j;
      finished = false;
      break;
    }
  }

  if (finished) {
    swendsenWangClusters = null; // Finished processing all clusters
  }
}

function finishSwendsenWangUpdate() {
  if (swendsenWangClusters != null) {
    let finished = true;
    let i = currentI;
    let j = currentJ;
    while (true) {
      spins[i][j] = newSpins[i][j];
      i = i + 1;
      if (i == gridSize) {
        i = 0;
        j++;
      }
      if (j >= gridSize) break;
    }

    swendsenWangClusters = null; // Finished processing all clusters
  }
}

function displaySpins() {
  let xOffset = (width - menuWidth - squareSize) / 2;
  let yOffset = 0; // Removed the vertical gap

  loadPixels();
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      let c = getSpinColor(spins[i][j]);
      let xStart = xOffset + i * squareSize / gridSize;
      let yStart = yOffset + j * squareSize / gridSize;
      let xEnd = xStart + squareSize / gridSize;
      let yEnd = yStart + squareSize / gridSize;

      for (let x = xStart; x < xEnd && x < width - menuWidth; x++) {
        for (let y = yStart; y < yEnd && y < height; y++) {
          set(x, y, c);
        }
      }
    }
  }
  updatePixels();
}

function getSpinColor(spin) {
  switch (colorMode) {
    case 0:
      return spin == 1 ? (inverted ? color(255) : color(0)) : (inverted ? color(0) : color(255)); // Black/White
    case 1:
      return spin == 1 ? (inverted ? color(255, 0, 0) : color(0, 0, 255)) : (inverted ? color(0, 0, 255) : color(255, 0, 0)); // Blue/Red
    case 2:
      return spin == 1 ? (inverted ? color(136, 112, 255) : color(255, 216, 82)) : (inverted ? color(255, 216, 82) : color(136, 112, 255)); // Pastel Purple / Pastel Orange
    case 3:
      return spin == 1 ? (inverted ? color(0, 255, 0) : color(0)) : (inverted ? color(0) : color(0, 255, 0)); // Black/Bright Green
    default:
      return color(0);
  }
}

function displayControls() {
  fill(200);
  rect(width - menuWidth, 0, menuWidth, height);

  // quitButton.display();
  // for (let b of gridSizeButtons) {
  //   b.display();
  // }
  metropolisButton.display();
  wolffButton.display();
  swendsenWangButton.display();
  // tempMinusButton.display();
  // tempPlusButton.display();
  // speedMinusButton.display();
  // speedPlusButton.display();
  // pauseButton.display();
  // invertButton.display();
  // colorButton.display();
  // helpButton.display();

  fill(0);
  textAlign(LEFT, CENTER);
  //textFont(font);
  textFont('Verdana');
  text("Lattice: " + selectedGridSize, metropolisButton.x, metropolisButton.y - buttonHeight );
  text("T/Tc = " + nf(temperature / Tc, 1, 2), swendsenWangButton.x , swendsenWangButton.y + 2*buttonHeight );
  text("Flips = " + int(spinFlipAttempts), swendsenWangButton.x , swendsenWangButton.y + 3*buttonHeight );
  text("Help menu: h" , swendsenWangButton.x , swendsenWangButton.y + 5*buttonHeight );
  text("Main commands" , swendsenWangButton.x , swendsenWangButton.y + 7*buttonHeight );
  text("Temperature: up/down" , swendsenWangButton.x , swendsenWangButton.y + 8*buttonHeight );
  text("Speed: left/right" , swendsenWangButton.x , swendsenWangButton.y + 9*buttonHeight );
  text("Algorithm: m/w/s" , swendsenWangButton.x , swendsenWangButton.y + 10*buttonHeight );
  text("Cycle lattice size: l" , swendsenWangButton.x , swendsenWangButton.y + 11*buttonHeight );
  text("Reload after resizing window." , swendsenWangButton.x , swendsenWangButton.y + 12.5*buttonHeight );
  text("(Use fullscreen!)" , swendsenWangButton.x , swendsenWangButton.y + 13.5*buttonHeight );
}

function displayHelp() {
  fill(0, 150);
  rect(0, 0, width, height);

  fill(255);
  textAlign(LEFT, CENTER);
  textFont('Verdana');
  //textFont(font);
  textSize(24);
  let helpText = "Controls:\n\n";
  helpText += "q - Quit\n";
  helpText += "\n";
  helpText += "l - Cycle Grid Size\n";
  helpText += "0-6 - Change Grid Size\n";
  helpText += "\n";
  helpText += "Up Arrow - Increase Temperature\n";
  helpText += "Down Arrow - Decrease Temperature\n";
  helpText += "Right Arrow - Increase Speed\n";
  helpText += "Left Arrow - Decrease Speed\n";
  helpText += "\n";
  helpText += "m - Metropolis Algorithm\n";
  helpText += "w - Wolff Algorithm\n";
  helpText += "s - Swendsen-Wang Algorithm\n";
  helpText += "\n";
  helpText += "p - Pause / Unpause\n";
  helpText += "i - Invert Colours\n";
  helpText += "c - Cycle Colours\n";
  helpText += "h - Toggle Help Menu\n";
  text(helpText, (width - menuWidth) / 2 - 100, height / 2);
}

function togglePause() {
  if (spinFlipAttempts === 0) {
    spinFlipAttempts = savedSpinFlipAttempts;
    pauseButton.label = "Pause";
    pauseButton.isActive = false;
  } else {
    savedSpinFlipAttempts = spinFlipAttempts;
    spinFlipAttempts = 0;
    pauseButton.label = "Unpause";
    pauseButton.isActive = true;
  }
}

function toggleInvert() {
  inverted = !inverted;
}

function cycleColorMode() {
  colorMode = (colorMode + 1) % 4;
}

function cycleGridSize() {
  indexGridSize = (indexGridSize + 1) % gridSizes.length;
  selectedGridSize = gridSizes[indexGridSize];
}

function updateButtonStates() {
  // for (let i = 0; i < gridSizes.length; i++) {
  //   gridSizeButtons[i].isActive = selectedGridSize === gridSizes[i];
  // }
  metropolisButton.isActive = algorithmMode === 0;
  wolffButton.isActive = algorithmMode === 1;
  swendsenWangButton.isActive = algorithmMode === 2;
}

class Button {
  constructor(x, y, w, h, label) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.label = label;
    this.isActive = false;
  }

  display() {
    if (this.isActive) {
      fill(100); // Dark grey for active button
    } else {
      fill(0);
    }
    rect(this.x, this.y, this.w, this.h);
    fill(255);
    textAlign(CENTER, CENTER);
    //textFont(font);
    textFont('Verdana');
    text(this.label, this.x + this.w / 2, this.y + this.h / 2);
  }

  isClicked(mx, my) {
    return mx > this.x && mx < this.x + this.w && my > this.y && my < this.h;
  }
}
