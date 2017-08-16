//Implementation of long-range random walk generator
//due to Nathan Clisby, August 2017.


var path = [];
var n = 100;
var a = 1.0;
var minWidth = true;


//function generate_hamiltonian_path(n,q)
function generate_random_path()
{
    //initialize path
    var i;
    n = parseInt(document.path_parameters.elements["n"].value);
    for (i=0; i<n; i++)
    {
        path[i] = [2.0*Math.PI*Math.random(), Math.random()];
    }
    //return;
}

//r = (1-x)^{-1/\alpha}

function draw_path()
{
//shape = document.getElementsByTagName("svg")[0];
//shape.setAttribute("viewBox", "-250 -250 500 750"); 

    var svgns = "http://www.w3.org/2000/svg"
    var i;
    var x, y;
    var svg = document.getElementById('path_svg');
    while (svg.lastChild) {
        svg.removeChild(svg.lastChild);
    }
    n = parseInt(document.path_parameters.elements["n"].value);
    a = parseFloat(document.path_parameters.elements["a"].value);
    var dx;
    var dy;
    var x = 0.0;
    var y = 0.0;
    var xmin = x;
    var xmax = x;
    var ymin = y;
    var ymax = y;
    var r;
    //var dist2;
    for (i=0; i<n; i++)
    {
        r = Math.pow(1.0-path[i][1],-1.0/a)
        //r = Math.exp(-Math.log(1.0-path[i][1])/a)
        dx = Math.cos(path[i][0])*r
        dy = Math.sin(path[i][0])*r
        x = x + dx;
        y = y + dy;
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
    }
    var aa = xmin-1
    var bb = ymin-1
    var cc = xmax+1-aa
    var dd = ymax+1-bb
    var strokeWidth;
    if (minWidth) {
        strokeWidth = 0.004*0.5*(cc+dd);
        if (strokeWidth < 0.35)
        {
            strokeWidth = 0.35;
        }
    }
    x = 0.0;
    y = 0.0;
    var circle = document.createElementNS(svgns, 'circle');
    circle.setAttributeNS(null, 'cx', x);
    circle.setAttributeNS(null, 'cy', y);
    circle.setAttributeNS(null, 'r', 0.4);
    circle.setAttributeNS(null, 'style', 'fill: black; ' );
    svg.appendChild(circle);
    //poorly behaved as alpha approaches zero, likely due to an
    //underflow error of some sort - an issue with very short line
    //segments
    for (i=0; i<n; i++)
    {
        r = Math.pow(1.0-path[i][1],-1.0/a)
        //r = Math.exp(-Math.log(1.0-path[i][1])/a)
        dx = Math.cos(path[i][0])*r
        dy = Math.sin(path[i][0])*r
        var line = document.createElementNS(svgns, 'line');
        line.setAttributeNS(null, 'x1', x);
        line.setAttributeNS(null, 'y1', y);
        line.setAttributeNS(null, 'x2', x+dx);
        line.setAttributeNS(null, 'y2', y+dy);
        //line.setAttributeNS(null, 'style', 'stroke:rgb(0,0,0);stroke-width:0.5; ' );
        if (minWidth)
        {
            line.setAttributeNS(null, 'style', 'stroke:rgb(0,0,0);stroke-width:'+strokeWidth+'; ' );
        }
        else
        {
            line.setAttributeNS(null, 'style', 'stroke:rgb(0,0,0);stroke-width:0.35; ' );
        }
        svg.appendChild(line);
        x = x + dx;
        y = y + dy;
        var circle = document.createElementNS(svgns, 'circle');
        circle.setAttributeNS(null, 'cx', x);
        circle.setAttributeNS(null, 'cy', y);
        //circle.setAttributeNS(null, 'r', 0.5);
        circle.setAttributeNS(null, 'r', 0.4);
        circle.setAttributeNS(null, 'style', 'fill: black; ' );
        svg.appendChild(circle);
    }
    //for (i=0; i<n; i++)
    //{
        //r = Math.pow(1.0-path[i][1],-1.0/a)
        //dx = Math.cos(path[i][0])*r
        //dy = Math.sin(path[i][0])*r
        //var line = document.createElementNS(svgns, 'line');
        //line.setAttributeNS(null, 'x1', x);
        //line.setAttributeNS(null, 'y1', y);
        //line.setAttributeNS(null, 'x2', x+dx);
        //line.setAttributeNS(null, 'y2', y+dy);
        ////line.setAttributeNS(null, 'style', 'stroke:rgb(0,0,0);stroke-width:0.5; ' );
        //line.setAttributeNS(null, 'style', 'stroke:rgb(0,0,0);stroke-width:0.35; ' );
        //svg.appendChild(line);
        //x = x + dx;
        //y = y + dy;
        //var circle = document.createElementNS(svgns, 'circle');
        //circle.setAttributeNS(null, 'cx', x);
        //circle.setAttributeNS(null, 'cy', y);
        ////circle.setAttributeNS(null, 'r', 0.5);
        //circle.setAttributeNS(null, 'r', 0.4);
        //circle.setAttributeNS(null, 'style', 'fill: black; ' );
        //svg.appendChild(circle);
        //if (x < xmin) xmin = x;
        //if (x > xmax) xmax = x;
        //if (y < ymin) ymin = y;
        //if (y > ymax) ymax = y;
    //}
        //dist2 = dx*dx+dy*dy;
        //alert(dist2);
    //var a = xmin-1
    //var b = ymin-1
    //var c = xmax+1-a
    //var d = ymax+1-b
    //svg.setAttribute("viewBox", " "+(xmin-1.0)+" "+(ymin-1.0)+" "+(xmax+1.0)+" "+(ymax+1.0)+" "); 
    svg.setAttribute("viewBox", " "+aa+" "+bb+" "+cc+" "+dd+" "); 
    return;
 }

function refresh_path()
{
    //var nstring = prompt("Grid size = ?","10");
    //var n = parseInt(document.path_parameters.elements["n"].value);
        //var n = result[0];
    //var text_box = document.getElementById("path_text");
    //text_box.value = path_to_string(n,path);
    generate_random_path();
    draw_path();
    return;
}

//This prevents direction keys scrolling
window.addEventListener("keydown", function(e) {
    // space and arrow keys
    if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
        e.preventDefault();
    }
}, false);

function increase_a()
{
    a = a*1.05;
    document.path_parameters.elements["a"].value = a;
    draw_path();
    return;
}

function decrease_a()
{
    a = a/1.05;
    document.path_parameters.elements["a"].value = a;
    draw_path();
    return;
}

function update_a()
{
    a = document.path_parameters.elements["a"].value;
    draw_path();
    return;
}

document.addEventListener('keydown', function(event) {
    if (event.keyCode == 82)
    {
        //r: refresh
        refresh_path();
    }
    else if (event.keyCode == 37)
    {
        //left arrow
        decrease_a();
        //alert('Left was pressed');
    }
    else if (event.keyCode == 39)
    {
        //right arrow
        increase_a();
        //alert('Right was pressed');
    }
});
