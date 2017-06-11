/*********************************************************************
 
 smSimulator, a platform for viewing animations of the pivot algorithm
 and (in future versions) other algorithms for simulating statistical
 mechanical systems.
 
 Copyright (C) 2013 Nathan Clisby
 
 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.
 
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 
 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <http://www.gnu.org/licenses/>.
 
 *********************************************************************/

//Make available Arial font for processing.js
/* @pjs font="Arial.ttf"; */
//Now keyboard input will be accepted even if the canvas
//has not been selected by the user.
/* @pjs globalKeyEvents="true"; */
// **************************************************************
//boolean mode2d = true;
//layer height - for pseudo 2d layering
//to make this compatible with opengl rendering
//by browsers
float dl = 0.00001;

//Define menu behaviour

//Use programState to keep track of which screen we should be on.
int programState = 0;
//0: main menu
//1: pivot menu
//2: pivot animation
//3: pi MCMC menu (not implemented)
//4: pi MCMC animation (not implemented)
//5: self-avoiding walk enumeration menu (not implemented)
//6: self-avoiding walk enumeration animation (not implemented)

int [] iMainOptions = {
  0, 0,
};
int [] nMainOptions = {
  1, 1,
};

String [][] mainOptions = {
  //{"Statistical Mechanics Simulator\nCopyright (C) 2013 Nathan Clisby\nReleased under GPL version 3"},
  {
    "Pivot algorithm",
  }
  , 
  {
    "Pi MCMC",
  }
  ,
};
//    {"Self-avoiding walk enumeration"},


String [][] pivotOptions = {
  {
    "Lattice: square", "Lattice: simple cubic",
  }
  , 
  {
    "Animation speed: paused", "Animation speed: very slow", "Animation speed: slow", "Animation speed: medium", "Animation speed: fast", "Animation speed: very fast", "Animation speed: fastest"
  }
  , 
  {
    "Length: 10", "Length: 50", "Length: 100", "Length: 500", "Length: 1000", "Length: 5000", "Length: 10000", "Length: 50000", "Length: 100000",
  }
  , 
  {
    "Initialisation: equilibrium", "Initialisation: straight rod", "Initialisation: simple random walk", "Initialisation: simple random walk (no reversals)",
  }
  , 
  {
    "START"
  }
  ,
};

float r = 0.0;
float piSum = 0.0;
boolean newPoint = true;
boolean showPiMCMCInformation = true;
float [] x = new float[2];
float [] xt = new float[2];
float [] x2 = new float[2];
boolean piMCMCMode = false;
String [][] piMCMCOptions = {
  {
    "Random point", "Local moves", "Slow global moves", "Fast global moves",
  }
  , 
  {
    "START"
  }
};

//global parameters
//for animation
float defaultFrameRate = 30.;
int nanimate = 15;
int npause = 5;
//for pivot algorithm
int dim=2;
int N=5000;
int initialisationType = 0;
int minSize = 0;
float theta = 0.0;
float dtheta = 0.01;
int nintersect;
float zoom;
float zoomWeight = 0.01;
float defaultZoomFactor = 0.9;
float zoomFactor = defaultZoomFactor;
boolean newWalk = true;

int nattempt = 0;
int nsuccess = 0;
boolean showPivotInformation = false;
float re2sum = 0.0;

int iPalette = 0;
int nPalette = 4;

int iTerminate = 0;
int nTerminate = 15;

void setPivotAnimationSpeed(int option)
{
  //{"Animation speed: very slow","Animation speed: slow","Animation speed: medium","Animation speed: fast","Animation speed: very fast",},
  //{"Animation speed: very slow","Animation speed: slow","Animation speed: medium","Animation speed: fast","Animation speed: very fast",},
  //"Animation speed: paused", "Animation speed: very slow", "Animation speed: slow", "Animation speed: medium", "Animation speed: fast", "Animation speed: very fast", "Animation speed: fastest"
  switch (option)
  {
  case 0:
    nanimate = 2;
    npause = 1000000000;
    break;
  case 1:
    nanimate = 36;
    npause = 12;
    break;
  case 2:
    nanimate = 24;
    npause = 8;
    break;
  case 3:
    nanimate = 15;
    npause = 5;
    break;
  case 4:
    nanimate = 9;
    npause = 3;
    break;
  case 5:
    nanimate = 6;
    npause = 2;
    break;
  case 6:
    nanimate = 1;
    npause = 0;
    break;
  default:
    nanimate = 15;
    npause = 5;
    break;
  }
  return;
}

void setPivotParameters()
{
  //{"Lattice: square","Lattice: simple cubic",},
  switch (iPivotOptions[0])
  {
  case 0:
    dim = 2;
    break;
  case 1:
    dim = 3;
    break;
  default:
    break;
  }

  setPivotAnimationSpeed(iPivotOptions[1]);


  //{"Length: 10","Length: 50","Length: 100","Length: 500","Length: 1000","Length: 5000","Length: 10000","Length: 50000","Length: 100000",},
  switch (iPivotOptions[2])
  {
  case 0:
    N = 11;
    break;
  case 1:
    N = 51;
    break;
  case 2:
    N = 101;
    break;
  case 3:
    N = 501;
    break;
  case 4:
    N = 1001;
    break;
  case 5:
    N = 5001;
    break;
  case 6:
    N = 10001;
    break;
  case 7:
    N = 50001;
    break;
  case 8:
    N = 100001;
    break;
  default:
    break;
  }

  //   "Initialisation: equilibrium", "Initialisation: straight rod", "Initialisation: simple random walk", "Initialisation: simple random walk (no reversals)",

  initialisationType = iPivotOptions[3];

  return;
}

int [] iPivotOptions = {
  0, 0, 5, 0, 0
};
int [] nPivotOptions = {
  2, 7, 9, 4, 1
};

String [] pivotMenu = {
  pivotOptions[0][1], pivotOptions[1][1], pivotOptions[2][4], pivotOptions[3][0], pivotOptions[4][0]
};

int [] menuTextColour = {
  255, 255, 255
};
int [] menuBackgroundColour = {
  127, 127, 127
};
int [] menuFillColour = {
  0, 0, 0
};

void setPiMCMCParameters()
{
  //{"Lattice: square","Lattice: simple cubic",},
  switch (iPiMCMCOptions[0])
  {
  case 0:
    r = 0.0;
    nanimate = 0;
    npause = 12;
    piMCMCMode = false;
    break;
  case 1:
    r = 0.02*minSize;
    nanimate = 5;
    npause = 4;
    piMCMCMode = true;
    break;
  case 2:
    r = 0.4*minSize;
    nanimate = 40;
    npause = 4;
    piMCMCMode = true;
    break;
  case 3:
    r = 0.4*minSize;
    nanimate = 10;
    npause = 4;
    piMCMCMode = true;
    break;
  default:
    break;
  }
  return;
}

int [] iPiMCMCOptions = {
  0, 0,
};
int [] nPiMCMCOptions = {
  4, 1,
};

String [] piMCMCMenu = {
  piMCMCOptions[0][1], 
  piMCMCOptions[0][2]
};

//Comment: OpenGL renderer does batch processing of fill and stroke, so need to be careful
//about mixing text and fill rectangles (the filled rectangles overwrite text)
//My understanding is that for recent versions of processing
//DISABLE_OPTIMIZED_STROKE / ENABLE_OPTIMIZED_STROKE should fix things,
//and for older versions
//ENABLE_ACCURATE_2D / DISABLE_ACCURATE_2D
//Neither worked for me!
//Also tried placing the text a bit closer to the camera, but couldn't get this to
//work either.
//In the end, making sure that no rectangles are drawn where text appears - ugly solution,
//but it works and looks ok.

void drawMenu(int [] ioptions, String [][] options)
{
  int nMenu = ioptions.length;
  float dh = float(height)/float(nMenu);
  strokeWeight(1);
  noStroke();
  textAlign(CENTER, CENTER);
  //use menu fill colour since this will remain in the vicinity of text.
  //background(menuFillColour[0], menuFillColour[1], menuFillColour[2]);
  background(myBG(0), myBG(1), myBG(2));
  drawExitButton();
  //place box of background colour around the menu boxes
  fill(menuBackgroundColour[0], menuBackgroundColour[1], menuBackgroundColour[2]);
  //Bug report from Gordon Slade - background is overwriting the text.
  //So, will insert pauses by hand, as a hack, to ensure order of
  //drawing commands is as given here. Likely just an issue with Firefox
  //implementation of WebGL, but will be no great harm here, as we do
  //not need menus to be overly responsive.
  int pauseTime = 5;
  int startTime;
  int dummy;
  startTime = millis();
  dummy = 0;
  do {
      dummy = 3*dummy-31;
  } 
  while (millis()-startTime <= pauseTime);
  for (int i=0; i<nMenu; i++)
  {
    rect(0.0*width, float(i)*dh, 1.0*width, 0.1*dh);
    rect(0.0*width, float(i)*dh, 0.1*width, 1.0*dh);
    rect(0.9*width, float(i)*dh, 0.1*width, 1.0*dh);
    rect(0.0*width, float(i)*dh+0.9*dh, 1.0*width, 0.1*dh);
  }

  startTime = millis();
  dummy = 0;
  do {
      dummy = 3*dummy-31;
  } 
  while (millis()-startTime <= pauseTime);

  //write text to boxes
  //fill(menuTextColour[0], menuTextColour[1], menuTextColour[2]);
  fill(myFG(0), myFG(1), myFG(2));
  for (int i=0; i<nMenu; i++)
  {
    text(options[i][ioptions[i]], width/2, float(i)*dh+0.5*dh);
  }
  //need to draw button twice in OPENGL
  drawExitButton();
  return;
}

void drawExitButton()
{
  rectMode(CORNER);
  strokeWeight(1);
  fill(255, 0, 0);
  rect(0.98*width, 0, width, 0.02*width);
  stroke(0, 0, 0);
  strokeWeight(2);
  line(0.98*width, 0, width, 0.02*width);
  line(0.98*width, 0.02*width, width, 0);
  strokeWeight(1);
  noStroke();
  return;
}

void clickMainMenu()
{
  int nMenu = iMainOptions.length;
  if ((0.98*width <= mouseX) && (mouseY <= 0.02*width)) {
    programState = -1;
    //background(myBG(0),myBG(1),myBG(2));
    //textAlign(CENTER, CENTER);
    //fill(255, 255, 255);
    //text("Animation terminated", width/2, height/2);
    //exit();
  }
  if ((mouseX >= 0.1*width) && (mouseX <= 0.9*width))
  {
    float dh = float(height)/float(nMenu);
    float dtemp = float(mouseY) % dh;
    if ((dtemp >= 0.1*dh) && (dtemp <= 0.9*dh))
    {
      int iMenu = int(float(mouseY)/dh);
      switch (iMenu)
      {
      case 0:
        //pivot algorithm selected
        programState = 1;
        break;
      case 1:
        //pi MCMC simulation selected
        programState = 3;
        break;
      default:
        break;
      }
    }
  }
  return;
}

void clickPivotMenu()
{
  int nMenu = pivotMenu.length;
  if ((0.98*width <= mouseX) && (mouseY <= 0.02*width)) {
    programState = 0;
  } 
  else {
    if ((mouseX >= 0.1*width) && (mouseX <= 0.9*width))
    {
      float dh = float(height)/float(nMenu);
      float dtemp = float(mouseY) % dh;
      if ((dtemp >= 0.1*dh) && (dtemp <= 0.9*dh))
      {
        int iMenu = int(float(mouseY)/dh);
        switch (iMenu)
        {
        case 0:
        case 1:
        case 2:
        case 3:
          iPivotOptions[iMenu] = ((iPivotOptions[iMenu] + 1) % nPivotOptions[iMenu]);
          //pivotMenu[iMenu] = pivotOptions[iMenu][ipivotOptions[iMenu]];
          break;
        case 4:
          setPivotParameters();
          //initialise the initial SAW
          initialisePivotWalk();
          //start the animation
          programState = 2;
          break;
        default:
          break;
        }
      }
    }
  }
  return;
}

void clickPivotAnimation()
{
  if ((0.98*width <= mouseX) && (mouseY <= 0.02*width)) {
      if (programState > -1) programState -= 1;
  }
  return;
}

void clickPiMCMCMenu()
{
  int nMenu = piMCMCMenu.length;
  if ((0.98*width <= mouseX) && (mouseY <= 0.02*width)) {
    programState = 0;
  } 
  else {
    if ((mouseX >= 0.1*width) && (mouseX <= 0.9*width))
    {
      float dh = float(height)/float(nMenu);
      float dtemp = float(mouseY) % dh;
      if ((dtemp >= 0.1*dh) && (dtemp <= 0.9*dh))
      {
        int iMenu = int(float(mouseY)/dh);
        switch (iMenu)
        {
        case 0:
          iPiMCMCOptions[iMenu] = ((iPiMCMCOptions[iMenu] + 1) % nPiMCMCOptions[iMenu]);
          //pivotMenu[iMenu] = pivotOptions[iMenu][ipivotOptions[iMenu]];
          break;
        case 1:
          setPiMCMCParameters();
          //initialise the configuration
          initialisePiMCMC();
          //start the animation
          programState = 4;
          break;
        default:
          break;
        }
      }
    }
  }
  return;
}

void clickPiMCMCAnimation()
{
  if ((0.98*width <= mouseX) && (mouseY <= 0.02*width)) programState = 3;
  return;
}


void mouseClicked()
{
  switch (programState)
  {
    //already exiting
  case -1:
    break;
    //root menu
  case 0:
    clickMainMenu();
    break;
    //pivot algorithm menu
  case 1:
    clickPivotMenu();
    break;
    //pivot animation
  case 2:
    clickPivotAnimation();
    break;
  case 3:
    clickPiMCMCMenu();
    break;
    //pivot animation
  case 4:
    clickPiMCMCAnimation();
    break;
    //should never reach default
  default:
    break;
  }
  return;
}

// /************ End menu setup *****************************/

// /************ Define pivot algorithm functions ***********/


int [][] w;
int [][] wt;
float [][] wt2;
int [][] sym = new int[dim][dim];
HashMap<String, Integer> siteDictionary;
int ianimate = 0;
int ipause = 0;
boolean animationPaused = true;

int mdist = N;


void initialisePivotWalk()
{
  theta = 0.0;
  ianimate = 0;
  ipause = 0;
  animationPaused = true;
  newWalk = false;
  w = new int[N][dim];
  wt = new int[N][dim];
  wt2 = new float[N][dim];
  sym = new int[dim][dim];
  siteDictionary = new HashMap<String, Integer>(int(N*1.5), 0.7);
  switch(initialisationType)
  {
    //equilibrium
  case 0:
    String walkFile;
    switch(int(random(3)))
    {
    case 0: 
      walkFile = "d"+dim+"saw"+N+"a.sites";
      break;
    case 1: 
      walkFile = "d"+dim+"saw"+N+"b.sites";
      break;
    case 2: 
      walkFile = "d"+dim+"saw"+N+"c.sites";
      break;
    default: 
      walkFile = "d"+dim+"saw"+N+"a.sites";
      break;
    }
    String [] lines = loadStrings(walkFile);
    //BufferedReader reader;
    //String line;
    int [] dx = new int[dim];
    String[] pieces = split(lines[int(N/2)+1], ' ');
    for (int idim=0; idim<dim; idim++) dx[idim] = int(pieces[idim]);
    for (int i=0; i<N; i++)
    {
      pieces = split(lines[i+1], ' ');
      for (int idim=0; idim<dim; idim++) w[i][idim] = int(pieces[idim]) - dx[idim];
    }
    nintersect = 0;
    //nintersect = intersect(N*N, w);
    break;
    //straight rod
  case 1:
    for (int i=0; i<N; i++)
    {
      w[i][0] = i-(N/2);
      for (int idim=1; idim<dim; idim++) w[i][idim] = 0;
    }
    nintersect = 0;
    break;
    //simple random walk
  case 2:
    for (int idim=0; idim<dim; idim++) w[int(N/2)][idim] = 0;
    for (int idim=0; idim<dim; idim++) w[1+int(N/2)][idim] = 0;
    w[1+int(N/2)][0] = 1;
    for (int i=2+int(N/2); i<N; i++)
    {
      for (int idim=0; idim<dim; idim++) w[i][idim] = w[i-1][idim];
      w[i][int(random(dim))] += (2*int(random(2)) - 1);
    }
    for (int i=-1+int(N/2); i>=0; i--)
    {
      for (int idim=0; idim<dim; idim++) w[i][idim] = w[i+1][idim];
      w[i][int(random(dim))] += (2*int(random(2)) - 1);
    }
    nintersect = intersect(N*N, w);
    break;
    //simple random walk with no immediate returns
  case 3:
    for (int idim=0; idim<dim; idim++) w[int(N/2)][idim] = 0;
    for (int idim=0; idim<dim; idim++) w[1+int(N/2)][idim] = 0;
    w[1+int(N/2)][0] = 1;
    for (int i=2+int(N/2); i<N; i++)
    {
      do {
        for (int idim=0; idim<dim; idim++) w[i][idim] = w[i-1][idim];
        w[i][int(random(dim))] += (2*int(random(2)) - 1);
      } 
      while (sitesAreEqual (w[i], w[i-2]));
    }
    for (int i=-1+int(N/2); i>=0; i--)
    {
      do {
        for (int idim=0; idim<dim; idim++) w[i][idim] = w[i+1][idim];
        w[i][int(random(dim))] += (2*int(random(2)) - 1);
      } 
      while (sitesAreEqual (w[i], w[i+2]));
    }
    nintersect = intersect(N*N, w);
    break;
  default:
    break;
  }
  copyWalk(w, wt);
  interpolateWalk(0, w, wt, wt2);
  int mdist = maxDist(w);
  zoomFactor = defaultZoomFactor;
  zoom = zoomFactor*0.5*minSize/float(mdist);
  nsuccess = 0;
  nattempt = 0;
  re2sum = 0.0;
  return;
}

//Generate random symmetries in the orthogonal group O(dim)
//Transformation is returned as a matrix
void randomSym(int [][] sym)
{
  int nmax = 1;
  for (int i=0; i<dim; i++)
  {
    for (int j=0; j<dim; j++)
    {
      sym[i][j] = 0;
      if (i == j) sym[i][j] = 1;
    }
  }
  for (int i=0; i<dim; i++)
  {
    int rval = int(random(2));
    int ival = int(random(i+1));
    //swap row i with row ival
    //int row[dim];
    for (int ii=0; ii<dim; ii++)
    {
      sym[i][ii] = sym[ival][ii];
      sym[ival][ii] = 0;
    }
    if (rval == 0)
    {
      sym[ival][i] = 1;
    }
    else
    {
      sym[ival][i] = -1;
    }
  }  
  //println("\n"+sym[0][0]+sym[1][0]+sym[0][1]+sym[1][1]);
  return;
}

boolean identitySym(int [][] sym)
{
  boolean isIdentity = true;
  for (int idim=0; idim<dim; idim++) isIdentity = (isIdentity && (sym[idim][idim] == 1));
  return isIdentity;
}

void niRandomSym(int [][] sym)
{
  do {
    randomSym(sym);
  } 
  while (identitySym (sym));
  return;
}

void rotateSite(int [][] sym, int [] x0, int [] x, int [] y)
{
  for (int i=0; i<dim; i++) y[i] = x0[i];
  for (int i=0; i<dim; i++)
  {
    for (int j=0; j<dim; j++)
    {
      y[i] += sym[i][j] * (x[j]-x0[j]);
    }
  }
  return;
}

String siteToString(int [] x)
{
  int dim = x.length;
  String s = ""+x[0];
  for (int i=1; i<dim; i++) s = s +" " + x[i];
  return s;
}

boolean sitesAreEqual(int [] x, int [] y)
{
  boolean s = true;
  for (int idim=0; idim<dim; idim++) s = (s && (x[idim] == y[idim]));
  return s;
}

int maxDist(int [][] w)
{
  int mdist = 0;
  int sl = 1+int(float(N)/float(1000));
  for (int i=0; i<N; i+=sl)
  {
    for (int idim=0; idim<dim; idim++)
    {
      int temp = abs(w[i][idim]);
      if (temp > mdist) mdist = temp;
    }
  }
  return mdist;
}

void interpolateWalk(int ianimate, int [][] w, int [][] wt, float [][] wt2)
{
  int N = w.length;
  float fac2 = float(ianimate)/float(nanimate);
  float fac1 = 1.0 - fac2;
  for (int i=0; i<N; i++)
  {
    for (int idim=0; idim<dim; idim++)
    {
      wt2[i][idim] = fac1*w[i][idim] + fac2*wt[i][idim];
    }
  }
  return;
}

void copySite(int [] x, int [] y)
{
  for (int i=0; i<dim; i++) y[i] = x[i];
  return;
}

void copyWalk(int [][] w1, int [][] w2)
{
  for (int i=0; i<N; i++)
  {
    for (int idim=0; idim<dim; idim++) w2[i][idim] = w1[i][idim];
  }
  return;
}


int intersect(int nmax, int [][] w)
{
  int N = w.length;
  int nintersect = 0;
  siteDictionary.clear();
  for (int i=0; i<N; i++)
  {
    String s = siteToString(w[i]);
    if (siteDictionary.containsKey(s))
    {
      nintersect++;
    }
    else
    {
      siteDictionary.put(s, i+1);
    }
    if (nintersect > nmax) break;
  }
  return nintersect;
}

int intersectPivot(int j, int nmax, int [][] w, int [][] wt)
{
  int ii, jj;
  niRandomSym(sym);
  String s;
  siteDictionary.clear();
  copySite(w[j], wt[j]);
  s = siteToString(w[j]);
  siteDictionary.put(s, j+1);
  int nintersect = 0;
  if (j < N/2) {
    for (jj=j-1,ii=j+1; jj>=0; ii++,jj--)
    {
      rotateSite(sym, w[j], w[jj], wt[jj]);
      s = siteToString(wt[jj]);
      if (siteDictionary.containsKey(s)) { 
        nintersect++;
      }
      else { 
        siteDictionary.put(s, jj+1);
      }
      if (nintersect > nmax) break;
      //copySite(w[ii], wt[ii]);
      s = siteToString(w[ii]);
      if (siteDictionary.containsKey(s)) { 
        nintersect++;
      }
      else { 
        siteDictionary.put(s, ii+1);
      }
      if (nintersect > nmax) break;
    }
    for (; ii<N; ii++)
    {
      //copySite(w[ii], wt[ii]);
      s = siteToString(w[ii]);
      if (siteDictionary.containsKey(s)) { 
        nintersect++;
      }
      else { 
        siteDictionary.put(s, ii+1);
      }
      if (nintersect > nmax) break;
    }
    if (nintersect <= nmax)
    {
      for (ii=j; ii<N; ii++)
      {
        copySite(w[ii], wt[ii]);
      }
    }
  }
  else
  {
    for (jj=j+1,ii=j-1; jj<N; ii--,jj++)
    {
      rotateSite(sym, w[j], w[jj], wt[jj]);
      s = siteToString(wt[jj]);
      if (siteDictionary.containsKey(s)) { 
        nintersect++;
      }
      else { 
        siteDictionary.put(s, jj+1);
      }
      if (nintersect > nmax) break;
      //copySite(w[ii], wt[ii]);
      s = siteToString(w[ii]);
      if (siteDictionary.containsKey(s)) { 
        nintersect++;
      }
      else { 
        siteDictionary.put(s, ii+1);
      }
      if (nintersect > nmax) break;
    }
    for (; ii>=0; ii--)
    {
      //copySite(w[ii], wt[ii]);
      s = siteToString(w[ii]);
      if (siteDictionary.containsKey(s)) { 
        nintersect++;
      }
      else { 
        siteDictionary.put(s, ii+1);
      }
      if (nintersect > nmax) break;
    }
    if (nintersect <= nmax)
    {
      for (ii=0; ii<=j; ii++)
      {
        copySite(w[ii], wt[ii]);
      }
    }
  }
  return nintersect;
}

int myPalette(float x, int ic)
{
  int colour = 0;
  switch(iPalette)
  {
  case 0:
    switch (ic)
    {
    case 0:
      colour = 128+(int(64+128.*3.7*1.2*x) % 128);
      break;
    case 1:
      colour = 255+(int(64.-255.*3.7*0.82*x) % 255);
      break;
    case 2:
      colour = 128+(int(-100-128.*3.7*1.1*x) % 128);
      break;
    default:
      break;
    }
    break;
  case 1:
    switch (ic)
    {
    case 0:
      colour = 128+(int(64+128.*3.7*1.2*x) % 128);
      break;
    case 1:
      colour = 255+(int(64.-255.*3.7*0.82*x) % 255);
      break;
    case 2:
      colour = 128+(int(-100-128.*3.7*1.1*x) % 128);
      break;
    default:
      break;
    }
    if (colour > 255) colour = 255;
    if (colour < 0) colour = 0;
    if (ic == 0) colour *= 0.8;
    if (ic == 1) colour *= 0.99;
    if (ic == 2) colour *= 0.9;
    break;
  case 2:
    if (x < 0.5) {
        colour = 255;
    } else {
        colour = 0;
        if (ic == 1) colour = 255;
    }
    break;
  case 3:
  //red on white background
    if (ic == 0) colour = 255;
    if (ic == 1) colour = 0;
    if (ic == 2) colour = 0;  
  default:
    break;
  }
  return colour;
}

int myFG(int ic)
{
  int colour;
  switch(iPalette)
  {
  case 0:
    colour = 255;
    break;
  case 1:
    colour = 0;
    break;
  case 2:
    colour = 255;
    break;
  case 3:
    colour = 0;
    break;
  default:
    colour = 255;
    break;
  }
  return colour;
}

int myBG(int ic)
{
  int colour;
  switch(iPalette)
  {
  case 0:
    colour = 0;
    break;
  case 1:
    colour = 255;
    break;
  case 2:
    colour = 0;
    break;
  case 3:
    colour = 255;
    break;
  default:
    colour = 0;
    break;
  }
  return colour;
}


//partially correct for relatively reduced line thickness for short walks
//doing this with lectures / seminars in mind, where thin lines are likely
//to be very difficult to see.
float walkStrokeWeight(int dim, int N)
{
  float w = 1.0;
  switch (dim)
  {
  case 2:
    //want weight 1 for N=100000.
    w = pow(defaultZoomFactor/zoomFactor*float(N), -0.15)*pow(1.e5, 0.15);
    break;
  case 3:
    //want weight 1 for N=100000.
    w = pow(defaultZoomFactor/zoomFactor*float(N), -0.15)*pow(1.e5, 0.15);
    break;
  default:
    break;
  }
  return w;
}

void drawWalk(float [][] w)
{
  int N = w.length;
  strokeWeight(1);
  strokeWeight(walkStrokeWeight(dim, N));

  //only valid for opengl! (can't change colour within a shape in 2d)
  if (dim == 2)
  {
    noFill();
    beginShape();
    for (int i=0; i<N; i++)
    {
      float x = float(i)/float(N);
      stroke(myPalette(x, 0), myPalette(x, 1), myPalette(x, 2));
      vertex(zoom*w[i][0], zoom*w[i][1]);
    }
    endShape();
  }
  else if (dim == 3)
  {
    noFill();
    beginShape();
    for (int i=0; i<N; i++)
    {
      float x = float(i)/float(N);
      stroke(myPalette(x, 0), myPalette(x, 1), myPalette(x, 2));
      vertex(zoom*w[i][0], zoom*w[i][1], zoom*w[i][2]);
    }
    endShape();
  }
  return;
}

void drawPivotInformation()
{
  textAlign(LEFT, TOP);
  fill(myFG(0), myFG(1), myFG(2));
  float h0 = height/100.;
  float dh = height/15.;
  float w0 = width/100.;
  float w1 = 0.07*width;
  int ih = 0;

  text("t", w0, h0+ih*dh);
  text(""+nattempt, w1, h0+ih*dh);
  ih += 1;
  text("f", w0, h0+ih*dh);
  text(""+nf(float(nsuccess)/(1.e-10+float(nattempt)), 1, 3), w1, h0+ih*dh);
  ih += 1;
  text("R", w0, h0+ih*dh);
  text(""+nf(sqrt(re2sum/(1.e-10+float(nattempt))), 1, 1), w1, h0+ih*dh);
  ih += 1;
  text("z", w0, h0+ih*dh);
  text(""+nf(zoomFactor/defaultZoomFactor, 1, 2), w1, h0+ih*dh);
  ih += 1;
  return;
}

void drawPivot()
{
  //hint(DISABLE_DEPTH_TEST);
  background(myBG(0), myBG(1), myBG(2));
  fill(0);
  //place close square in top right corner
  //repeating - doing at start and end to maximize chance that it will be placed
  //on top of any other rectangles.
  pushMatrix();
  //move camera a little further away, this reduces the "pop" of 3d walks, for me makes it a bit clearer
  camera(width/2.0, height/2.0, 1.2*(height/2.0)/ tan(PI*60.0 / 360.0), width/2.0, height/2.0, 0, 0, 1, 0);
  translate(width/2, height/2);  // Translate to the center
  if (dim == 3) {
    rotateY(theta);
    rotateZ(0.47*theta);
  }
  theta += dtheta;
  if (newWalk)
  {
    int ntemp;
    do {
      int j = int(random(1, N));
      //pivot(j, w, wt);
      //ntemp = intersect(nintersect,wt);
      ntemp = intersectPivot(j, nintersect, w, wt);
      nattempt++;
      if (ntemp <= nintersect)
      {
        nintersect = ntemp;
        nsuccess++;
      }
      //add current value of re2 to total
      for (int idim=0; idim<dim; idim++) re2sum += (w[N-1][idim]-w[0][idim])*(w[N-1][idim]-w[0][idim]);
    } 
    while (ntemp > nintersect);
    newWalk = false;
  }
  //if (newWalk) mdist = maxDist(wt);
  int mdist = maxDist(wt);
  //adjust zoom, if effect is outside of tolerance
  float newZoom = zoomFactor*0.5*float(minSize)/float(mdist);
  zoom = (1.-zoomWeight)*zoom + zoomWeight*newZoom;

  if (animationPaused)
  {
    ipause++;
    drawWalk(wt2);
    if (ipause >= npause)
    {
      ipause = 0;
      //copyWalk(wt,w);
      newWalk = true;
      animationPaused = false;
    }
  }
  else
  {
    ianimate++;
    //for (int iianimate=0; iianimate<=ianimate; iianimate++)
    //{
    //interpolateWalk(iianimate, w, wt, wt2);
    //drawWalk(wt2);
    //}
    //drawWalkTrace(w,wt2);
    if (ianimate >= nanimate)
    {
      ianimate = 0;
      copyWalk(wt, w);
      animationPaused = true;
    }
    interpolateWalk(ianimate, w, wt, wt2);
    drawWalk(wt2);
  }
  popMatrix();
  drawExitButton();
  if (showPivotInformation) drawPivotInformation();
  //hint(ENABLE_DEPTH_TEST);
  return;
}

// /************ End pivot algorithm ************************/

// /************ Begin pi MCMC algorithm ************************/

void initialisePiMCMC()
{
  ianimate = 0;
  ipause = 0;
  animationPaused = true;
  newPoint = false;

  nattempt = 0;
  piSum = 0.0;
  setPiMCMCParameters();
  x[0] = random(-0.5*minSize, 0.5*minSize);
  x[1] = random(-0.5*minSize, 0.5*minSize);
  return;
}

void drawPiMCMCInformation()
{
  textAlign(LEFT, TOP);
  fill(myFG(0), myFG(1), myFG(2));
  float h0 = height/100.;
  float dh = height/15.;
  float w0 = width/100.;
  float w1 = 0.07*width;
  int ih = 0;
  //pushMatrix();
  //translate(0,0,3.*dl);
  text("t", w0, h0+ih*dh);
  text(""+nattempt, w1, h0+ih*dh);
  ih += 1;
  text("Pi", w0, h0+ih*dh);
  text(""+nf(4.0*piSum/(1.e-10+float(nattempt)), 1, 3), w1, h0+ih*dh);
  ih += 1;
  return;
}

void drawPiMCMC()
{
  hint(DISABLE_DEPTH_TEST);
  background(myBG(0), myBG(1), myBG(2));
  pushMatrix();
  translate(width/2, height/2);  // Translate to the center
  fill(128, 128, 128);
  rectMode(RADIUS);
  fill(128, 128, 128);
  rect(0, 0, 0.5*minSize, 0.5*minSize);
  rectMode(CORNER);
  //popMatrix();
  //fill(191, 0, 0);
  fill(128, 0, 0);
  ellipse(0, 0, minSize, minSize);
  fill(0, 0, 255);
  boolean inSquare;
  if (newPoint)
  {
    if (piMCMCMode)
    {
      x2[0] = x[0] + r*(random(2)-1.);
      x2[1] = x[1] + r*(random(2)-1.);
      nattempt++;
      if (x[0]*x[0]+x[1]*x[1] <= 0.25*minSize*minSize) piSum += 1.;
      inSquare = (x2[0] > -minSize/2.);
      inSquare = (inSquare && (x2[0] < minSize/2.));
      inSquare = (inSquare && (x2[1] > -minSize/2.));
      inSquare = (inSquare && (x2[1] < minSize/2.));
      if (!inSquare)
      {
        x2[0] = x[0];
        x2[1] = x[1];
      }
    }
    else
    {
      x2[0] = (random(2)-1.)*0.5*minSize;
      x2[1] = (random(2)-1.)*0.5*minSize;
      nattempt++;
      if (x[0]*x[0]+x[1]*x[1] <= 0.25*minSize*minSize) piSum += 1.;
    }
    newPoint = false;
  }
  if (animationPaused)
  {
    ipause++;
    fill(80, 80, 255);
    ellipse(x[0], x[1], 0.04*minSize, 0.04*minSize);
    rectMode(RADIUS);
    fill(255, 255, 255);
    rect(x[0], x[1], 0.003*minSize, 0.003*minSize);
    rectMode(CORNER);

    if (ipause >= npause)
    {
      ipause = 0;
      //copyWalk(wt,w);
      newPoint = true;
      animationPaused = false;
    }
  }
  else
  {
    ianimate++;
    if (ianimate >= nanimate)
    {
      ianimate = 0;
      x[0] = x2[0];
      x[1] = x2[1];
      animationPaused = true;
    }
    float dtemp = float(ianimate)/float(nanimate);
    float dtemp2 = 1. - dtemp;
    xt[0] = dtemp2*x[0] + dtemp*x2[0];
    xt[1] = dtemp2*x[1] + dtemp*x2[1];
    fill(80, 80, 255);
    ellipse(xt[0], xt[1], 0.04*minSize, 0.04*minSize);
    rectMode(RADIUS);
    fill(255, 255, 255);
    rect(xt[0], xt[1], 0.003*minSize, 0.003*minSize);
    rectMode(CORNER);
  }

  popMatrix();
  drawExitButton();
  if (showPiMCMCInformation) drawPiMCMCInformation();
  hint(ENABLE_DEPTH_TEST);
  return;
}


// /************ End pi MCMC algorithm ************************/
interface Javascript {
}
Javascript javascript=null;
void bindJavascript(Javascript js) { 
  javascript=js;
}

boolean sketchFullScreen() {
  return true;
}

void setup()
{
  //Can't set size dynamically in javascript
  //size(displayWidth, displayHeight, OPENGL);
  size(1024, 768, OPENGL);
  //size(1280, 1024, OPENGL);
  minSize = min(width, height);
  //processing.js requires textSize to allocate the correct
  //amount of space for text, rather than relying on textFont to
  //set it. Is this a bug, or just something I don't understand?
  //textSize(36);
  //textFont(createFont("Arial",32));
  textSize(int(0.05*float(height)));
  textFont(createFont("Arial", int(0.04*float(height))));
  frameRate(int(defaultFrameRate));
  //smooth should be default, will execute just in case.
  smooth();
  return;
}

void draw()
{

  switch (programState)
  {
    //end animation
  case -1:
    background(myBG(0), myBG(1), myBG(2));
    textAlign(CENTER, CENTER);
    fill(myFG(0), myFG(1), myFG(2));
    text("Simulation terminated", width/2, height/2);
    iTerminate += 1;
    if (iTerminate >= nTerminate) exit();
    break;
    //root menu
  case 0:
    //drawMenu(mainMenu);
    drawMenu(iMainOptions, mainOptions);
    break;
    //pivot algorithm menu
  case 1:
    //drawMenu(pivotMenu);
    drawMenu(iPivotOptions, pivotOptions);
    break;
    //pivot animation
  case 2:
    drawPivot();
    break;
  case 3:
    drawMenu(iPiMCMCOptions, piMCMCOptions);
    break;
  case 4:
    drawPiMCMC();
    //drawMenu(sawenumMenu);
    //self-avoiding walk enumeration menu
    //should never reach default
  default:
    break;
  }
  return;
}

void keyPressed()
{
  if (javascript == null)
  {
    if (key == 'q') {
      switch(programState)
      {
      case -1:
        break;
      case 0:
      case 1:
      case 2:
        programState -= 1;
        break;
      case 3:
        programState = 0;
        break;
      case 4:
        programState = 3;
        break;
      default:
        break;
      }
    }
    if (key == 'p') iPalette = (iPalette + 1) % nPalette;
  } 
  else {
    if (key == 81) {
      //'q'
      if (programState > -1) programState -= 1;
    }
    if (key == 80) {
      //'p'
      iPalette = (iPalette + 1) % nPalette;
    }
  }

  switch(programState)
  {
    //pivot animation
  case 2:
    if (javascript == null)
    {
      //running in the JVM
      if (key == 'm')
      {
        //switch animation mode - this is just a hack
        //idea is that 10 microseconds of CPU time corresponds
        //to 1 second of computer time
        //switch between hash table and SAW-tree modes
        //these are times per attempted pivot - not per successful pivot
        //but ratios are correct.
        npause = 0;
        //assume 30 fps => factor of 30 frames / 10 microsec
        //d = 2, f \approx f0*(N/N0)^{-0.19}, f0 = 0.114, N = 100000
        //d = 3, f \approx f0*(N/N0)^{-0.11}, f0 = 0.114, N = 100000
        if (dim == 2) {
          float f0 = 0.108;
          float N0 = 100000.;
          //SAW-tree
          //nanimate = int(0.49999+exp(-1.450)*pow(float(N),0.174)*3./(f0*pow(float(N)/N0,-0.19)));
          //M&S
          nanimate = int(0.49999+exp(-4.8445)*pow(float(N), 0.9632)*3./(f0*pow(float(N)/N0, -0.19)));
        } 
        else if (dim == 3) {
          float f0 = 0.275;
          float N0 = 100000.;
          //SAW-tree
          //really should be log with 2 regimes - but this does better over full range
          //nanimate = int(0.49999+exp(-1.1262)*pow(float(N),0.2193)*3./(f0*pow(float(N)/N0,-0.11)));
          //M&S
          nanimate = int(0.49999+exp(-4.583)*pow(float(N), 1.042)*3./(f0*pow(float(N)/N0, -0.11)));
        }
        if (nanimate <= 0) nanimate = 1;
      }
      if (key == 's')
      {
        //switch animation mode - this is just a hack
        //idea is that 10 microseconds of CPU time corresponds
        //to 1 second of computer time
        //switch between hash table and SAW-tree modes
        //these are times per attempted pivot - not per successful pivot
        //but ratios are correct.
        npause = 0;
        //assume 30 fps => factor of 30 frames / 10 microsec
        //d = 2, f \approx f0*(N/N0)^{-0.19}, f0 = 0.114, N = 100000
        //d = 3, f \approx f0*(N/N0)^{-0.11}, f0 = 0.114, N = 100000
        if (dim == 2) {
          float f0 = 0.108;
          float N0 = 100000.;
          //SAW-tree
          nanimate = int(0.49999+exp(-1.450)*pow(float(N), 0.174)*3./(f0*pow(float(N)/N0, -0.19)));
          //M&S
          //nanimate = int(0.49999+exp(-4.8445)*pow(float(N),0.9632)*3./(f0*pow(float(N)/N0,-0.19)));
        } 
        else if (dim == 3) {
          float f0 = 0.275;
          float N0 = 100000.;
          //SAW-tree
          //really should be log with 2 regimes - but this does better over full range
          nanimate = int(0.49999+exp(-1.1262)*pow(float(N), 0.2193)*3./(f0*pow(float(N)/N0, -0.11)));
          //M&S
          //nanimate = int(0.49999+exp(-4.583)*pow(float(N),1.042)*3./(f0*pow(float(N)/N0,-0.11)));
        }
        if (nanimate <= 0) nanimate = 1;
      }
      if (key == 'i') showPivotInformation = !showPivotInformation;
      if (key == 'n') initialisePivotWalk();
      if (key == CODED) {
        if (keyCode == UP) {
          zoomFactor *= 1.03;
          //zoom *= 1.01;
        } 
        else if (keyCode == DOWN) {
          zoomFactor /= 1.03;
          //zoom /= 1.01;
        } 
        else if (keyCode == LEFT) {
          if (iPivotOptions[1] > 0)
          {
            iPivotOptions[1] -= 1;
            setPivotAnimationSpeed(iPivotOptions[1]);
          }
        } 
        else if (keyCode == RIGHT) {
          if (iPivotOptions[1] < nPivotOptions[1] - 1)
          {
            iPivotOptions[1] += 1;
            setPivotAnimationSpeed(iPivotOptions[1]);
          }
        }
      }
    } 
    else {
      //running as javascript in a browser
      //'n'
      if (key == 78) initialisePivotWalk();
      if (key == 73) {
        //'i'
        showPivotInformation = !showPivotInformation;
      } 
      else if (key == 38) {
        //up arrow
        zoomFactor *= 1.03;
      } 
      else if (key == 40) {
        //down arrow
        zoomFactor /= 1.03;
      } 
      else if (key == 37) {
        if (iPivotOptions[1] > 0)
        {
          iPivotOptions[1] -= 1;
          setPivotAnimationSpeed(iPivotOptions[1]);
        }
      } 
      else if (key == 39) {
        if (iPivotOptions[1] < nPivotOptions[1] - 1)
        {
          iPivotOptions[1] += 1;
          setPivotAnimationSpeed(iPivotOptions[1]);
        }
      }
    }
    break;
  case 4:
    if (key == 'n') initialisePiMCMC();
    break;
  default:
    break;
  }
  return;
}

