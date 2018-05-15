//Implementation of Hamiltonian Path algorithm due to 
//Nathan Clisby, July 2012.

//Comments about the Markov chain used to generate paths
//* using backbiting move described in Secondary structures in long
//compact polymers, PHYSICAL REVIEW E 74, 051801 ͑2006, by Richard
//Oberdorf, Allison Ferguson, Jesper L. Jacobsen and Jan\'e Kondev
//* algorithm is believed to be ergodic, but this has not been proved.
//* current implementation is not the most efficient possible, O(N) for N
//step walks, which could be improved with more sophisticated data
//structure
//* heuristic used for decision that equilibrium distribution is being
//sampled from. This heuristic is quite conservative, but not certain.
//* currently using default random number generator. This should be `good
//enough' for generating typical walks, but shouldn't be replied upon for
//serious numerical work.

//Adapted to arbitrarily shaped sublattices - just have an 'accept' function
//Simplified reversal procedure - just go through each step (O(N) to reverse, anyway)
//Different initialisation - start from a single point, incrementally add.
//Simplified checking of neighbours.

function rgbColour(s,c1,c2)
{
    
    var r = Math.floor(s*c1[0]+(1-s)*c2[0]);
    var g = Math.floor(s*c1[1]+(1-s)*c2[1]);
    var b = Math.floor(s*c1[2]+(1-s)*c2[2]);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}

var path = [];
var xmax = 20;
var ymax = 20;
var n = (xmax+1)*(ymax+1);
var left_end = true;
var must_fill = true;
var draw_arrow = false;
//Modes for showing trace of ends. (clumsy name, but can't use trace or
//path)
//either:
//0 - do nothing - neither record nor draw
//1 - record and draw (initialise if just turned on)
//2 - draw but no longer record
var showTraceMode = 0;
var nShowTraceModes = 3;
var leftTrace = [];
var nLeftTrace = 0;
var rightTrace = [];
var nRightTrace = 0;

//useful for showing vector field only
var showWalk = true;

//var xmax = 21;
//var ymax = 41;
//[>var xmax = 5;<]
//[>var ymax = 5;<]
//function inSublattice(x, y)
//{
    //if (x<0) return false;
    //if (x>xmax) return false;
    //if (y<0) return false;
    //if (y>ymax) return false;
    //if ((x>1) && (x<20) && (y>5) && (y<12)) return false;
    //if ((x>3) && (x<18) && (y>25) && (y<33)) return false;
    //return true;
//}


//14cmx20cm
//var xmax = 57;
//var ymax = 81;
//[>var xmax = 41;<]
//[>var ymax = 81;<]
//[>var xmax = 5;<]
//[>var ymax = 5;<]
//function inSublattice(x, y)
//{
    //var xc;
    //var yc;
    //var x2;
    //var y2;
    //var xm = 0.5*xmax;
    //var ym = 0.5*ymax;
    //if (x<0) return false;
    //if (x>xmax) return false;
    //if (y<0) return false;
    //if (y>ymax) return false;
    //[>if ((x>3) && (x<xmax-3) && (y>0.15*ymax) && (y<0.30*ymax)) return false;<]
    //[>if ((x>3) && (x<xmax-3) && (y>0.6*ymax) && (y<0.8*ymax)) return false;<]
    //[>x2 = (x-xm)*(x-xm);<]
    //xc = xm;
    //yc = 0.225*ymax;
    //x2 = (x-xc)*(x-xc)/(0.88*0.88*xm*xm);
    //y2 = (y-yc)*(y-yc)/(0.15*0.15*ym*ym);
    //if (Math.pow(x2,2.) + Math.pow(y2,2.) < 1.) return false;
    //xc = xm;
    //yc = 0.7*ymax;
    //x2 = (x-xc)*(x-xc)/(0.88*0.88*xm*xm);
    //y2 = (y-yc)*(y-yc)/(0.15*0.15*ym*ym);
    //if (Math.pow(x2,2.) + Math.pow(y2,2.) < 1.) return false;
    //return true;
//}

var isHole;

function countNeighbours(x, y)
{
var count = 0;
if (!inSublattice(x,y)) return 100;

if (inSublattice(x+1,y))
{
    if (!isHole[x+1][y]) count += 1;
}
if (inSublattice(x-1,y))
{
    if (!isHole[x-1][y]) count += 1;
}
if (inSublattice(x,y+1))
{
    if (!isHole[x][y+1]) count += 1;
}
if (inSublattice(x,y-1))
{
    if (!isHole[x][y-1]) count += 1;
}
//console.log(count);

return count;

}

//30cmx2cm
//var xmax = 121;
//var ymax = 7;
//var xmax = 41;
//var ymax = 81;
//var xmax = 5;
//var ymax = 5;
function inSublattice(x, y)
{
    if (x<0) return false;
    if (x>xmax) return false;
    if (y<0) return false;
    if (y>ymax) return false;
    //modify this to avoid different points
    //if ( typeof inSublattice.holes == 'undefined' ) 
    //{
    //create an even number of holes, based on holiness factor

                //foo.counter = 0;
                    //}

    //if ((x == 7) && (y == 2)) return false;
    //if ((x == 3) && (y == 5)) return false;
    if (isHole[x][y]) return false;
    return true;
}

//var xmax = 81;
//var ymax = 81;
//function inSublattice(x, y)
//{
    //if (x<0) return false;
    //if (x>xmax) return false;
    //if (y<0) return false;
    //if (y>ymax) return false;
    //var xm = 0.5*xmax;
    //var ym = 0.5*ymax;
    //if ((x-xm)*(x-xm)+(y-ym)*(y-ym) < (0.3*0.3*xmax*xmax)) return false;
    //return true;
//}

//var xmax = 3;
//var ymax = 33;
//[>var xmax = 9;<]
//[>var ymax = 801;<]
//function inSublattice(x, y)
//{
    //if (x<0) return false;
    //if (x>xmax) return false;
    //if (y<0) return false;
    //if (y>ymax) return false;
    //return true;
//}

function reversePath(i1,i2,path)
{
    var i;
    var jlim = (i2-i1+1)/2;
    var temp;
    for (j=0; j<jlim; j++)
    {
        //slower to use individual values
        //temp = path[i1+j][0];
        //path[i1+j][0] = path[i2-j][0];
        //path[i2-j][0] = temp;
        //temp = path[i1+j][1];
        //path[i1+j][1] = path[i2-j][1];
        //path[i2-j][1] = temp;
        //faster to swap arrays directly
        temp = path[i1+j];
        path[i1+j] = path[i2-j];
        path[i2-j] = temp;
    }
}

//Naive method, reversing whole walk each time
//function backbite(n,path)
//{
    //var i, j;
    //var x, y;
    //var dx, dy;
    //var xedge, yedge;
    //var iedge, add_edge;
    //[>choose a random end<]
    //[>choose a random neighbour<]
    //[>check if its in the sublattice<]
    //[>check if its in the path<]
    //[>if it is - then reverse loop<]
    //[>if it is not - add it to the end<]
    //[>To make things simple for the bulk of the code,<]
    //[>I'll always reverse the walk so that<]
    //[>the right hand end is always chosen<]
    //if (Math.floor(Math.random()*2) == 0)
    //{
        //[>choose left hand end - reverse whole walk<]
        //[>suboptimal - definitely slower than it needs to be<]
        //[>as it forces everything to be O(n)<]
        //reversePath(0,n-1,path);
    //}
    //[>Now choose a random step direction<]
    //switch (Math.floor(Math.random()*4))
    //{
        //case 0:
            //step = [1,0];
            //break;
        //case 1:
            //step = [-1,0];
            //break;
        //case 2:
            //step = [0,1];
            //break;
        //case 3:
            //step = [0,-1];
            //break;
    //}
    //var neighbour = [path[n-1][0] + step[0],path[n-1][1] + step[1]];
    //[>check to see if neighbour is in sublattice<]
    //if (inSublattice(neighbour[0],neighbour[1]))
    //{
        //[>Now check to see if it's already in path<]
            //var inPath = false;
            //for (j=n-2; j>=0; j--)
            //{
                //[>if (neighbour == path[j])<]
                //if ((neighbour[0] == path[j][0]) && (neighbour[1] == path[j][1]))
                //{
                    //inPath = true;
                    //break;
                //}
            //}
            //if (inPath)
            //{
                //reversePath(j+1,n-1,path);
            //}
            //else
            //{
                //n++;
                //path[n-1] = neighbour;
            //}
    //}
    //return n;
//}

function backbite_left(step,n,path)
{
    //choose left hand end
    var neighbour = [path[0][0] + step[0],path[0][1] + step[1]];
    //check to see if neighbour is in sublattice
    if (inSublattice(neighbour[0],neighbour[1]))
    {
        //Now check to see if it's already in path
        var inPath = false;
        //for (j=1; j<n; j++)
        for (j=1; j<n; j+=2)
        {
            //if (neighbour == path[j])
            if ((neighbour[0] == path[j][0]) && (neighbour[1] == path[j][1]))
            {
                inPath = true;
                break;
            }
        }
        if (inPath)
        {
            reversePath(0,j-1,path);
        }
        else
        {
            left_end = !left_end;
            reversePath(0,n-1,path);
            n++;
            path[n-1] = neighbour;
        }
    }
    if (showTraceMode == 1)
    //add new site to the trace for left end
    //not keeping tracking of intermediate site - have the feeling that
    //this will be more clear.
    {
        leftTrace[nLeftTrace] = path[0]
        nLeftTrace++;
    }
    return n;
}

function backbite_right(step,n,path)
{
//choose right hand end
    var neighbour = [path[n-1][0] + step[0],path[n-1][1] + step[1]];
//check to see if neighbour is in sublattice
    if (inSublattice(neighbour[0],neighbour[1]))
    {
        //Now check to see if it's already in path
            var inPath = false;
        //for (j=n-2; j>=0; j--)
        for (j=n-2; j>=0; j-=2)
        {
            //if (neighbour == path[j])
                if ((neighbour[0] == path[j][0]) && (neighbour[1] == path[j][1]))
                {
                    inPath = true;
                    break;
                }
        }
        if (inPath)
        {
            reversePath(j+1,n-1,path);
        }
        else
        {
            n++;
            path[n-1] = neighbour;
        }
    }
    if (showTraceMode == 1)
    //add new edge to the trace for right end
    //not keeping tracking of intermediate site - have the feeling that
    //this will be more clear.
    {
        rightTrace[nRightTrace] = path[n-1]
        nRightTrace++;
    }
    return n;
}

//Slightly more sophisticated, only reversing if new site found
function backbite(n,path)
{
    //var i, j;
    //var x, y;
    //var dx, dy;
    //var xedge, yedge;
    //var iedge, add_edge;
    //choose a random end
    //choose a random neighbour
    //check if its in the sublattice
    //check if its in the path
    //if it is - then reverse loop
    //if it is not - add it to the end
    //the right hand end is always chosen
    //Choose a random step direction
    var step;
    switch (Math.floor(Math.random()*4))
    {
        case 0:
            step = [1,0];
            break;
        case 1:
            step = [-1,0];
            break;
        case 2:
            step = [0,1];
            break;
        case 3:
            step = [0,-1];
            break;
    }
    if (Math.floor(Math.random()*2) == 0)
    {
        n = backbite_left(step,n,path);
    }
    else
    {
        n = backbite_right(step,n,path);
    }
    return n;
}

function path_to_string(n,path)
{
    var i;
    var path_string = "[["+path[0]+"]";
    for (i=1; i<n; i++)
    {
        path_string = path_string + ",[" + path[i] + "]";
    }

    path_string += "]";
    return(path_string);
}

//function generate_hamiltonian_path(n,q)
function generate_hamiltonian_path(q)
{
    //initialize path
    //var path = new Array(n*n);
    //var path = new Array(100000);
    //var path = new Array((xmax+1)*(ymax+1));
    path[0] = [Math.floor(Math.random()*(xmax+1)),
    Math.floor(Math.random()*(ymax+1))];
    //path[0] = [0,0];
    n = 1;
    //nattempts = 1+q*10.0 * (xmax+1) * (ymax+1) * Math.pow(Math.log(2.+(xmax+1)*(ymax+1)),2);
    //if (must_fill)
    if (false)
    {
    nattempts = 1 + q*10.0 * (xmax+1) * (ymax+1) * Math.pow(Math.log(2.+(xmax+1)*(ymax+1)),2);
    while (n < (xmax+1)*(ymax+1))
    //while (n < (xmax+1)*(ymax+1) - 2)
    {
        for (i=0; i<nattempts; i++)
        {
            n = backbite(n,path);
        }
    }
}
else
{
    nattempts = q*10.0 * (xmax+1) * (ymax+1) * Math.pow(Math.log(2.+(xmax+1)*(ymax+1)),2);
        for (i=0; i<nattempts; i++)
        {
            n = backbite(n,path);
        }
}
    return [n,path];
}

function generate_hamiltonian_circuit(q)
{
    //Generates circuits, but because we are subsampling circuits
    //from the set of paths it is in fact not straightforward to
    //sample uniformly at random from the set of circuits. Quite a subtle
    //argument which I won't reproduce here.
    result = generate_hamiltonian_path(q);
    var n = result[0];
    var path = result[1];
    //var path = generate_hamiltonian_path(q);
    var nmax = xmax*ymax;
    var success;
    var min_dist = 1 + (n % 2);
    var icount = 0;
    while (Math.abs(path[n-1][0] - path[0][0])
           + Math.abs(path[n-1][1] - path[0][1]) != min_dist)
    {
        n = backbite(n,path);
        icount += 1;
        if (icount >= 1000000) break;
    }
    return [n,path];
}

function draw_path(n,path)
{
    var i;
    var x, y;
    var canvas = document.getElementById('path_canvas');
    if (canvas.getContext)
    {
        //Draw walk on the given canvas
        var ctx = canvas.getContext('2d');
        //clear canvas (this eliminates state information too)
        canvas.width = canvas.width;
        var w = canvas.width;
        var h = canvas.height;
        //Calculate scale factors to convert to image location.
        //Note that 2*pad is added to the denominator for padding.
        //var pad=0.5;
        var pad=1.0;
        var sw = (w+0.0)/(xmax+2.0*pad);
        var sh = (h+0.0)/(ymax+2.0*pad);
        sh = Math.min(sw,sh);
        sw = sh;
        //var sw = (w+0.0)/(n+2.0*pad);
        //var sh = (h+0.0)/(n+2.0*pad);
        //Choose line width. At the moment it is 
        //0.2*(mean lattice spacing)
        //var lw = Math.floor(0.2*0.5*(sw+sh));
        ctx.fillStyle = "rgb(0,0,0)";
        //ctx.rect(pad*sw,pad*sh,xmax*sw,ymax*sh);
        ctx.rect(0,0,w,h);
        ctx.fill();
        //draw grid to show missing points, if grid is not full
        //if (n<(xmax+1)*(ymax+1))
        if (false)
        {
            ctx.strokeStyle = 'white';
            //ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (i=0; i<=xmax; i++)
            {
                ctx.moveTo((pad+i)*sw,(pad+0)*sh);
                ctx.lineTo((pad+i)*sw,(pad+ymax)*sh);
            }
            ctx.stroke();
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (i=0; i<=ymax; i++)
            {
                ctx.moveTo((pad+0)*sw,(pad+i)*sh);
                ctx.lineTo((pad+xmax)*sw,(pad+i)*sh);
            }
            ctx.stroke();
        }
        //now draw path
        //var lw = Math.floor(0.2*Math.min(sw,sh));
        //var lw = Math.floor(0.3*Math.min(sw,sh));
        //var lw = Math.round(0.3*Math.min(sw,sh));
        var lw = Math.ceil(0.3*Math.min(sw,sh));
        if (lw < 1) lw = 1;
        ctx.lineWidth = lw;
        //Draw path
        //good, red to nice blue
        var rgbLeft = [255,0,0];
        var rgbRight = [0,50,255];

        //good, orange to nice blue - greyish in middle
        var rgbLeft = [255,100,0];
        var rgbRight = [0,50,255];

        //green - bit greyish
        //var rgbLeft = [100,255,0];
        //var rgbRight = [0,50,255];

        //yellow to blue
        //var rgbLeft = [200,255,30];
        //var rgbRight = [0,120,255];

        //var rgbLeft = [0,255,0];
        //good, orange to nice blue - greyish in middle
        //var rgbLeft = [255,100,0];
        //var rgbRight = [0,0,255];

        // orange to purple
        //var rgbLeft = [255,150,0];
        //var rgbRight = [50,50,255];

        //var rgbLeft = [55,0,0];
        //var rgbLeft = [255,100,0];
        //var rgbLeft = [0,255,0];
        //var rgbRight = [0,0,255];
        //var rgbRight = [0,255,255];
        //var rgbRight = [0,50,255];
        //var rgbRight = [255,255,255];
        //old version, just single colour.
        //execute to ensure that there are no holes at corners
        //new method used - drawing 2 edges at a time
        //ctx.strokeStyle = rgbColour(0.5,rgbLeft,rgbRight);
        //ctx.beginPath();
        //ctx.moveTo((pad+path[0][0])*sw,(pad+path[0][1])*sh);
        //var nsq = n*n;
        //for (i=1; i<n; i++)
        //{
        //    ctx.lineTo((pad+path[i][0])*sw,(pad+path[i][1])*sh);
        //}
        //ctx.stroke();
        //new version with colour to show structure
        //think that it's probably a good idea to draw black lines
        //first so that the corners don't have gaps
        for (i=1; i<n; i++)
        {
            if (showWalk)
            {
                //ctx.strokeStyle = 'green';
                ctx.beginPath();
                ctx.strokeStyle = rgbColour((n-1-i)/(n-1),rgbLeft,rgbRight);
                ctx.moveTo((pad+path[i-1][0])*sw,(pad+path[i-1][1])*sh);
                ctx.lineTo((pad+path[i][0])*sw,(pad+path[i][1])*sh);
                if (i < n-1)
                {
                    ctx.lineTo((pad+path[i+1][0])*sw,(pad+path[i+1][1])*sh);
                }
                ctx.stroke();
            }
            //draw arrows to indicate direction, if draw_arrow is true
            if (draw_arrow)
            {
                if (showWalk)
                {
                    arrow_width = 0.35;
                }
                else
                {
                    arrow_width = 0.2;
                }
                if (left_end)
                {
                    x1 = pad+path[i][0];
                    x2 = pad+path[i-1][0];
                    y1 = pad+path[i][1];
                    y2 = pad+path[i-1][1];
                }
                else
                {
                    x1 = pad+path[i-1][0];
                    x2 = pad+path[i][0];
                    y1 = pad+path[i-1][1];
                    y2 = pad+path[i][1];
                }
                if (showWalk)
                {
                    ctx.beginPath();
                    ctx.fillStyle = rgbColour((n-1-i)/(n-1),rgbLeft,rgbRight);
                    if (path[i-1][0] == path[i][0])
                        //step is in y direction
                    {
                        ctx.moveTo((x1-arrow_width)*sw,(0.50*y1+0.50*y2)*sh);
                        ctx.lineTo((x1+arrow_width)*sw,(0.50*y1+0.50*y2)*sh);
                        ctx.lineTo(x1*sw,(0.00*y1+1.00*y2)*sh);
                    }
                    else
                        //step is in x direction
                    {
                        ctx.moveTo((0.50*x1+0.50*x2)*sw,(y1-arrow_width)*sh);
                        ctx.lineTo((0.50*x1+0.50*x2)*sw,(y1+arrow_width)*sh);
                        ctx.lineTo((0.00*x1+1.00*x2)*sw,y1*sh);
                    }
                    ctx.closePath();
                    ctx.fill();
                }
                else
                {
                    //if ((i % 2 == 1) && (i < n-2))
                    if (i % 2 == 1) 
                    {
                    ctx.beginPath();
                    ctx.fillStyle = rgbColour(1.0,rgbLeft,rgbRight);
                    if (path[i-1][0] == path[i][0])
                        //step is in y direction
                    {
                        ctx.moveTo((x1-arrow_width)*sw,(1.20*y1-0.20*y2)*sh);
                        ctx.lineTo((x1+arrow_width)*sw,(1.20*y1-0.20*y2)*sh);
                        ctx.lineTo(x1*sw,(0.40*y1+0.60*y2)*sh);
                    }
                    else
                        //step is in x direction
                    {
                        ctx.moveTo((1.20*x1-0.20*x2)*sw,(y1-arrow_width)*sh);
                        ctx.lineTo((1.20*x1-0.20*x2)*sw,(y1+arrow_width)*sh);
                        ctx.lineTo((0.40*x1+0.60*x2)*sw,y1*sh);
                    }
                    ctx.closePath();
                    ctx.fill();
                    }
                }
            }
        }
        //Draw endpoints as discs. The discs are chosen to be quite
        //large so that they are visible for large n.
        ctx.beginPath();
        x = (pad+path[0][0])*sw;
        y = (pad+path[0][1])*sh;
        //ctx.arc(x,y,0.4*0.5*(sw+sh),0.0,2.0*Math.PI,true);
        ctx.arc(x,y,0.4*Math.min(sw,sh),0.0,2.0*Math.PI,true);
        if (left_end)
        {
            //ctx.fillStyle = "rgb(255,0,0)";
            ctx.fillStyle = "rgb(0,255,0)";
        }
        else
        {
            //ctx.fillStyle = "rgb(0,0,0)";
            ctx.fillStyle = "rgb(255,255,255)";
        }
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        x = (pad+path[n-1][0])*sw;
        y = (pad+path[n-1][1])*sh;
        //ctx.arc(x,y,0.4*0.5*(sw+sh),0.0,2.0*Math.PI,true);
        ctx.arc(x,y,0.4*Math.min(sw,sh),0.0,2.0*Math.PI,true);
        if (left_end)
        {
            //ctx.fillStyle = "rgb(0,0,0)";
            ctx.fillStyle = "rgb(255,255,255)";
        }
        else
        {
            //ctx.fillStyle = "rgb(255,0,0)";
            ctx.fillStyle = "rgb(0,255,0)";
        }
        ctx.closePath();
        ctx.fill();
        if ((showTraceMode == 1) || (showTraceMode == 2))
        //draw trace - won't have a separate function for this for the
        //moment
        {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(0,200,255,0.5)"
            ctx.moveTo((pad+leftTrace[0][0])*sw,(pad+leftTrace[0][1])*sh);
            for (i=1; i<nLeftTrace; i++)
            {
                //ctx.strokeStyle = "rgb(0,125,255)"
                ctx.lineTo((pad+leftTrace[i][0])*sw,(pad+leftTrace[i][1])*sh);
            }
            ctx.stroke();
            ctx.beginPath();
            ctx.strokeStyle = "rgba(0,255,125,0.5)"
            ctx.moveTo((pad+rightTrace[0][0])*sw,(pad+rightTrace[0][1])*sh);
            for (i=1; i<nRightTrace; i++)
            {
                ctx.lineTo((pad+rightTrace[i][0])*sw,(pad+rightTrace[i][1])*sh);
            }
            ctx.stroke();
        }

    }
    return;
 }

function refresh_path()
{
    //var nstring = prompt("Grid size = ?","10");
    //var n = parseInt(document.path_parameters.elements["n"].value);
    xmax = -1+parseInt(document.path_parameters.elements["x"].value);
    ymax = -1+parseInt(document.path_parameters.elements["y"].value);
    var q = parseFloat(document.path_parameters.elements["q"].value);
    var h = parseFloat(document.path_parameters.elements["h"].value);
    //var is_circuit = parseFloat(document.path_parameters.elements["is_circuit"].checked);


    if (h < 0.0) { 
        h = 0.0;
        alert('Setting h to 0.0 (was < 0)');
    }
    if (h > 0.1) { 
        h = 0.1;
        alert('Setting h to 0.1 (was > 0.1)');
    }
    //set isHole based on holey-ness factor h.
    //will set an even number of holes by default
    //going to keep it really simple - just set array locations to be
    //empty until we have set enough
    var nholes = 2*Math.floor(0.5*h*(xmax+1)*(ymax+1));
    isHole = [];
    for (ii=0; ii<=xmax; ii++)
    {
        isHole[ii] = [];
        for (jj=0; jj<=ymax; jj++)
        {
            isHole[ii][jj] = false;
        }
        //console.log(ii);
    }

    var nt;

    icount = 0;

    while(nholes > 0)
    {
        x = Math.floor(Math.random()*(xmax+1));
        y = Math.floor(Math.random()*(ymax+1));
        if (!isHole[x][y])
        {
            //check that each of its neighbours has at least 2 other
            //neighbours

            nt = countNeighbours(x+1,y);
            if (nt >= 4)
            {
                nt = countNeighbours(x-1,y);
                if (nt >= 4)
                {
                    nt = countNeighbours(x,y+1);
                    if (nt >= 4)
                    {
                        nt = countNeighbours(x,y-1);
                        if (nt >= 4)
                        {
                            isHole[x][y] = true;
                            nholes = nholes - 1;
                        }
                    }
                }
            }
        }
        icount += 1;
        //console.log(nholes);
        if (icount > 1000) break;
    }

    must_fill = document.path_parameters.elements["must_fill"].checked;
    var is_circuit = document.path_parameters.elements["is_circuit"].checked;
    //var path;
    if (is_circuit)
    {
        result = generate_hamiltonian_circuit(q);
        //var n = result[0];
        n = result[0];
        var path = result[1];
    }
    else
    {
        result = generate_hamiltonian_path(q);
        //var n = result[0];
        n = result[0];
        var path = result[1];
    }
    //var text_box = document.getElementById("path_text");
    //text_box.value = path_to_string(n,path);
    draw_path(n,path);
    return;
}

//This prevents direction keys scrolling
window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

function move_r()
{
    switch (Math.floor(Math.random()*4))
    {
        case 0:
            step = [1,0];
            break;
        case 1:
            step = [-1,0];
            break;
        case 2:
            step = [0,1];
            break;
        case 3:
            step = [0,-1];
            break;
    }
    if (left_end)
    {
        n = backbite_left(step,n,path);
    }
    else
    {
        n = backbite_right(step,n,path);
    }
    draw_path(n,path);
    return;
}

function move_R()
{
    for (var i=0; i<100; i++)
    {
        switch (Math.floor(Math.random()*4))
        {
            case 0:
                step = [1,0];
                break;
            case 1:
                step = [-1,0];
                break;
            case 2:
                step = [0,1];
                break;
            case 3:
                step = [0,-1];
                break;
        }
        if (left_end)
        {
            n = backbite_left(step,n,path);
        }
        else
        {
            n = backbite_right(step,n,path);
        }
    }
    draw_path(n,path);
    return;
}



function move_e()
{
    //e: random step, chooses either end at random
    var old_left_end = left_end;
    switch (Math.floor(Math.random()*4))
    {
        case 0:
            step = [1,0];
            break;
        case 1:
            step = [-1,0];
            break;
        case 2:
            step = [0,1];
            break;
        case 3:
            step = [0,-1];
            break;
    }
    if (Math.random() < 0.5)
    {
        left_end = !left_end;
    }

    if (left_end)
    {
        n = backbite_left(step,n,path);
    }
    else
    {
        n = backbite_right(step,n,path);
    }
    left_end = old_left_end;
    draw_path(n,path);
    return;
}


function move_E()
{
    //E: 100 random steps, chooses either end at random
    var old_left_end = left_end;
    for (var i=0; i<100; i++)
    {
        switch (Math.floor(Math.random()*4))
        {
            case 0:
                step = [1,0];
                break;
            case 1:
                step = [-1,0];
                break;
            case 2:
                step = [0,1];
                break;
            case 3:
                step = [0,-1];
                break;
        }
        if (Math.random() < 0.5)
        {
            left_end = !left_end;
        }

        if (left_end)
        {
            n = backbite_left(step,n,path);
        }
        else
        {
            n = backbite_right(step,n,path);
        }
    }
    left_end = old_left_end;
    draw_path(n,path);
    return;
}

function toggle_end()
{
    left_end = !left_end;
    draw_path(n,path);
    return;
}

function toggle_arrow()
{
    draw_arrow = !draw_arrow;
    draw_path(n,path);
    return;
}

document.addEventListener('keydown', function(event) {
    if (event.keyCode == 84)
    {
        //t: toggle active end
        //alert('s was pressed');
        left_end = !left_end;
        draw_path(n,path);
    }
    else if (event.keyCode == 82)
    {
        if (event.shiftKey)
        {
            //R: 100 random steps
            move_R();
        }
        else
        {
            //r: random step
            move_r();
        }
    }
    else if (event.keyCode == 69)
    {
        if (event.shiftKey)
        {
            //E: 100 random steps, chooses either end at random
            move_E();
        }
        else
        {
            //e: random step, chooses either end at random
            move_e();
        }
    }
    else if (event.keyCode == 37)
    {
        //left arrow
        step = [-1,0];
        if (left_end)
        {
           n = backbite_left(step,n,path);
        }
        else
        {
           n = backbite_right(step,n,path);
        }
        draw_path(n,path);
        //alert('Left was pressed');
    }
    else if (event.keyCode == 38)
    {
        //up arrow
        step = [0,-1];
        if (left_end)
        {
           n = backbite_left(step,n,path);
        }
        else
        {
           n = backbite_right(step,n,path);
        }
        draw_path(n,path);
        //alert('Up was pressed');
    }
    else if (event.keyCode == 39)
    {
        //right arrow
        step = [1,0];
        if (left_end)
        {
           n = backbite_left(step,n,path);
        }
        else
        {
           n = backbite_right(step,n,path);
        }
        draw_path(n,path);
        //alert('Right was pressed');
    }
    else if (event.keyCode == 40)
    {
        //down arrow
        step = [0,1];
        if (left_end)
        {
           n = backbite_left(step,n,path);
        }
        else
        {
           n = backbite_right(step,n,path);
        }
        draw_path(n,path);
    }
    else if (event.keyCode == 65)
    {
        //a: toggle draw arrows 
        //alert('a was pressed');
        draw_arrow = !draw_arrow;
        draw_path(n,path);
    }
    else if (event.keyCode == 83)
    {
        //s: toggle mode for showing trace of ends
        //call it: trace? path? track?
        //sticking with "path" - so toggle path mode
        showTraceMode = (showTraceMode + 1) % nShowTraceModes;
        if (showTraceMode == 1)
        //reset the trace lengths - start new traces
        {
            leftTrace[0] = path[0]
            nLeftTrace = 1;
            rightTrace[0] = path[n-1]
            nRightTrace = 1;
        }
        if (showTraceMode == 0)
        //redraw the path to eliminate trace
        {
            draw_path(n,path);
        }

    }
    else if (event.keyCode == 86)
    {
        //v: toggle mode for showing walk 'vector mode' - show arrows
        //only.
        showWalk = !showWalk;
        if (!showWalk)
        {
            draw_arrow = true;
        }
        //if (showTraceMode == 0)
        ////redraw the path to eliminate trace
        //{
            draw_path(n,path);
        //}

    }
});
