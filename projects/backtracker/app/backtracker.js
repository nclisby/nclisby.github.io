/*
    backtracker.js implements a method to generate graphical representation of Backtracking tree for a search algorithm.

    Copyright (C) 2012, 2014, 2019 Nathan Clisby and Paul Leopardi

    Created by Nathan Clisby, October 2012.
    Modified by Paul Leopardi, September 2014.
    Modified by Nathan Clisby, October 2014.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    See https://www.gnu.org/licenses/ for details of the GNU General
    Public License. 
*/
var gTreeView = { };
gTreeView.searchDepth = 1;
function updateSearchDepth()
{
    gTreeView.searchDepth = parseInt(document.getElementById("search_depth").value,10);
    return;
}

gTreeView.mode = 'search';
function updateMode(radioInput)
{
    gTreeView.mode = radioInput.value;
    return;
}

gTreeView.rfac = 0.35;
gTreeView.typeColour = {
    'maybe': 'darkorange',
    'no': 'hotpink',
    'non solution leaf': 'red',
    'undefined': 'darkorange',
    'yes': 'lime',
    'solution leaf': 'green'
};

gTreeView.xSelect = -100;
gTreeView.ySelect = -100;
//will later be able to vary
gTreeView.zoomLevel = [
20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
gTreeView.nZoom = gTreeView.zoomLevel.length;
gTreeView.zoomIndex = gTreeView.nZoom - 5;
gTreeView.nLevels = gTreeView.zoomLevel[gTreeView.zoomIndex];

//These variables are associated with the tree view
gTreeView.level = 1;
//gTreeView.path is the path from absolute root to the root node of the view.
gTreeView.path = [];

var gTreeCanvas = {};

function Rect(x0, x1, y0, y1)
{
    return {
        'x0': x0, 'x1': x1, 'y0': y0, 'y1': y1
    };
}
function canvasFromImage(rect, paneRect, treeCanvas)
{
    var x0 = (rect.x0 - paneRect.x0) * treeCanvas.width / (paneRect.x1 - paneRect.x0);
    var x1 = (rect.x1 - paneRect.x0) * treeCanvas.width / (paneRect.x1 - paneRect.x0);
    var y0 = (rect.y0 - paneRect.y0) * treeCanvas.height / (paneRect.y1 - paneRect.y0);
    var y1 = (rect.y1 - paneRect.y0) * treeCanvas.height / (paneRect.y1 - paneRect.y0);
    return Rect(x0, x1, y0, y1);
}
function imageFromCanvas(rect, paneRect, treeCanvas)
{
    var x0 = paneRect.x0 + rect.x0 * (paneRect.x1 - paneRect.x0) / treeCanvas.width;
    var x1 = paneRect.x0 + rect.x1 * (paneRect.x1 - paneRect.x0) / treeCanvas.width;
    var y0 = paneRect.y0 + rect.y0 * (paneRect.y1 - paneRect.y0) / treeCanvas.height;
    var y1 = paneRect.y0 + rect.y1 * (paneRect.y1 - paneRect.y0) / treeCanvas.height;
    return Rect(x0, x1, y0, y1);
}
function treePaneFromLevels(nLevels)
{
    return Rect(0.0, 1.0, 0.0, gTreeView.nLevels);
}
gPanes = { };
gPanes.treePane = treePaneFromLevels(gTreeView.nLevels);
gPanes.treePaneOld = gPanes.treePane;
gPanes.treePaneNew = gPanes.treePane;

function updateMoveCounter(moveCounter)
{

    if (moveCounter === 1)
    {
        document.getElementById("move_counter").innerHTML =
        '<b>' + moveCounter + '</b> move';
    }
    else
    {
        document.getElementById("move_counter").innerHTML =
        '<b>' + moveCounter + '</b> moves';
    }
    return;
}

function updateNodeCounter(nodeCounter)
{

    if (nodeCounter === 1)
    {
        document.getElementById("node_counter").innerHTML =
        '<b>' + nodeCounter + '</b> node';
    }
    else
    {
        document.getElementById("node_counter").innerHTML =
        '<b>' + nodeCounter + '</b> nodes';
    }
    return;
}

function updateSolutionCounter(solutionCounter)
{

    if (solutionCounter === 1)
    {
        document.getElementById("solution_counter").innerHTML =
        '<b>' + solutionCounter + '</b> solution';
    }
    else
    {
        document.getElementById("solution_counter").innerHTML =
        '<b>' + solutionCounter + '</b> solutions';
    }
    return;
}

//Basic structure - valid for any hierarchical object
//Draw part of tree in view window only. Progress down tree hierarchy
//from root down to leaves, ignoring nodes for which the bounding box
//of subtree lies completely outside view area. This will allow for
//animations etc. via linear interpolation of view windows.

function initialiseView()
{
    gPanes.treePane = treePaneFromLevels(gTreeView.nLevels);
    gTreeCanvas.moveCounter = 0;
    gTreeCanvas.nodeCounter = 0;
    gTreeCanvas.solutionCounter = 0;
    updateMoveCounter(gTreeCanvas.moveCounter);
    updateNodeCounter(gTreeCanvas.nodeCounter);
    updateSolutionCounter(gTreeCanvas.solutionCounter);
    updateSearchDepth();
    gTreeCanvas.drawingTreeView.clearRect(0, 0, gTreeCanvas.width, gTreeCanvas.height);
    var context = inspect_canvas.getContext("2d");
    context.clearRect(0, 0, inspect_canvas.width, inspect_canvas.height);
    gTreeView.gameTree.s = {
        //'inputNode': gTreeView.inputTree,
        'type': 'maybe'
    };
    gTreeView.gameTree.child = null;
    gTreeView.gameTree.draw(gPanes.treePane);
    gTreeView.gameTree.highlightedNode = gTreeView.gameTree;
    gTreeView.path = [];
    gTreeView.level = 1;
    return;
}
//function viewRoot(gameTreeRoot)
function viewRoot()
{
    var i, j;
    var node = gTreeView.gameTree;
    //var node = gameTreeRoot;
    //console.log("in here: ");
    //console.log(node);
    //for (i = 1; i < gTreeView.level; i++)
    //alert("level = "+gTreeView.level);
    //if (node === null)
    //{
    //alert("error, node = null in viewRoot");
    //}
    for (i = 1; i < gTreeView.level; i++)
    {
        //if (node.nChildren() < gTreeView.path[i-1] + 1)
        //{
        //alert("help! about to crash "+node.nChildren()+" < "+(gTreeView.path[i-1]+1));
        //alert("path = "+gTreeView.path);
        //}
        node = node.child;
        //for (j = 1; j < gTreeView.path[gTreeView.level]; j++)
        while (node.label != gTreeView.path[i-1])
        {
            node = node.sibling;
        }
        //for (j = 0; j < gTreeView.path[i-1]; j++)
        //{
            //node = node.sibling;
        //}
    }
    return node;
}
//function viewX()
//{
    //var i;
    //var x = 0.0;
    //var xstep = 1.0;
    //var nChildren = 0;
    //for (i = 0; i < gTreeView.level; i++)
    //{
        //nChildren = gTreeView.gameTree.nChildren();
        //xstep = xstep / nChildren;
        //x = x + gTreeView.path[i] * xstep;
    //}
    //return x;
//}
function viewY()
{
    return gTreeCanvas.levelHeight * gTreeView.level;
}

var changeZoomAllowed = true;

function changeZoom(delta)
{
    // Animate a zoom by delta as smoothly as possible. 
    // Assumes that array bounds on gTreeView.zoomLevel and gTreeView.zoomIndex have been checked by the caller. 
    // Must leave gPanes.treePane.y0 invariant, but change spacing. 

    if (changeZoomAllowed)
    {
        var oldNLevels = gTreeView.zoomLevel[gTreeView.zoomIndex]; //const
        var rootNode = viewRoot();
        //problem: if multiple instances of change zoom called, then oldY1
        //may not be correct
        //var oldY1 = gPanes.treePane.y1; //const
        //var oldY1 = gTreeView.levels; //const

        var start = null;
        changeZoomAllowed = !changeZoomAllowed;
        // Function to be used in the callback from requestAnimationFrame. 
        function zoomStep(timestamp)
        {
            var increment;
            var progress;
            var duration = 1000.0; // milliseconds //const
            if (start === null)
            {
                start = timestamp;
            }
            progress = timestamp - start;
            increment = Math.min(progress / duration, 1.0);
            //var tlevel = gTreeView.levels + (gTreeView.nLevels - oldNLevels) * increment;
            //gPanes.treePane.y1 = oldY1 + (gTreeView.nLevels - oldNLevels) * increment;
            gTreeCanvas.levelHeight = gTreeCanvas.height / (gTreeView.nLevels * increment + oldNLevels * (1.0 - increment));
            gTreeCanvas.drawingTreeView.clearRect(0, 0, gTreeCanvas.width, gTreeCanvas.height);
            //gTreeView.gameTree.draw(treePaneFromLevels(gPanes.treePane.y1));
            //gTreeView.gameTree.draw(treePaneFromLevels(tlevel));
            rootNode.draw(gPanes.treePane);
            if (increment < 1.0)
            {
                window.requestAnimationFrame(zoomStep);
            }
            else
            {
                gPanes.treePane = Rect(0, 1, gTreeView.level - 1, gTreeView.level - 1 + gTreeView.nLevels);
                changeZoomAllowed = !changeZoomAllowed;
            }
        }
        gTreeView.zoomIndex = gTreeView.zoomIndex + delta;
        // Assume that array bounds have been checked by the caller. 
        gTreeView.nLevels = gTreeView.zoomLevel[gTreeView.zoomIndex];
        window.requestAnimationFrame(zoomStep);
    }
    return;
}
function incrementZoom()
{
    // Increase spacing by one. 
    if (gTreeView.zoomIndex < gTreeView.nZoom - 1)
    {
        changeZoom(+1);
    }
    //highlightNode(gTreeView.gameTree.highlightedNode, true);
    return;
}
function decrementZoom()
{
    //Decrease spacing by one. 
    if (gTreeView.zoomIndex > 0)
    {
        changeZoom(-1);
    }
    //highlightNode(gTreeView.gameTree.highlightedNode, true);
    return;
}

function getOffsetSum(elem) {
//from http://javascript.info/tutorial/coordinates
//described as the wrong way to do this
//tested and works with current versions of firefox, chrome, safari
    var top=0, left=0;
    while(elem) {
        top = top + parseInt(elem.offsetTop,10);
        left = left + parseInt(elem.offsetLeft,10);
        elem = elem.offsetParent;
    }
    //return {top: top, left: left}
    return [left,top];
}

//Convert mouse coordinates to Canvas coordinates.
function CanvasCoordinates(e)
{
    var x;
    var y;
    if (e.pageX || e.pageY)
    {
        x = e.pageX;
        y = e.pageY;
    }
    else
    {
        x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    var offsets = getOffsetSum(gTreeCanvas.canvasElement);
    var dx = offsets[0];
    var dy = offsets[1];
    x -= dx;
    y -= dy;
    //alert("x = "+x+" y = "+y);
    //alert("x offset = "+gTreeCanvas.canvasElement.offsetLeft+" y offset = "+gTreeCanvas.canvasElement.offsetTop);
    //alert("x offset = "+content.offsetLeft+" y offset = "+content.offsetTop);
    //alert("x offset = "+this.offsetLeft+" y offset = "+this.offsetTop);
    //alert("x layer = "+content.layerLeft+" y layer = "+content.layerTop);
    //alert(getOffsetSum(gTreeCanvas.canvasElement));
    //issue with content.offsetLeft for firefox
    //content.offset{Left,Top} worked for chrome and safari, not firefox
    //x -= content.offsetLeft;
    //y -= content.offsetTop;
    //old version, when canvas had absolute position, at top level in
    //document hierarchy
    //x -= gTreeCanvas.canvasElement.offsetLeft;
    //y -= gTreeCanvas.canvasElement.offsetTop;
    return {
        'x': x,
        'y': y
    };
}

function BacktrackingTree(state)
//closure compiler warns about use of "this"
{
    //state - store the object being generated
    this.state = state;
    //this.path = [];
    this.object = null;
    this.label = 0;
    //information about the depth of the tree that has been explored
    //below
    this.maxDepth = 0;
    this.sibling = null;
    this.child = null;
}
BacktrackingTree.prototype = {
    //Prints out string representation of structure
    toString: function (n)
    {
        var s = n.toString();
        if (this.child !== null)
        {
            s = s + " ( " + this.child.toString(n+1) + " ) ";
        }
        if (this.sibling !== null)
        {
            s = s + this.sibling.toString(n);
        }
        return s;
    },
    insertChild: function (state)
    {
        var node;
        if (this.child === null)
        {
            this.child = new BacktrackingTree(state);
            gTreeCanvas.nodeCounter = gTreeCanvas.nodeCounter + 1;
            this.child.state = state;
            node = this.child;
        }
        else
        {
            node = this.child;
            while (node.sibling !== null)
            {
                node = node.sibling;
            }
            node.sibling = new BacktrackingTree(state);
            gTreeCanvas.nodeCounter = gTreeCanvas.nodeCounter + 1;
            node = node.sibling;
        }
        return node;
    },
    //convert node to level
    level: function()
    {
        var node = this.parent;
        var level = 1;
        while (node !== null)
        {
            level = level + 1;
            node = node.parent;
        }
        return level;
    },
    nChildren: function ()
    {
        var nChildren = 0;
        if (this.child !== null)
        {
            nChildren = 1;
            var node = this.child;
            while (node.sibling !== null)
            {
                node = node.sibling;
                nChildren = nChildren + 1;
            }
        }
        return nChildren;
    },
    // Work out which sibling node is, numbered from left to right. 
    //no error checking
    siblingNumber: function()
    {
        //var i = 0;
        var i = 0;
        var node = this.parent.child;
        //while (node !== this)
        while (node.label != this.label)
        {
            i = i + 1;
            node = node.sibling;
        }
        return i;
    },
    // Convert node to an x range in canvas coordinates. 
    xRangeRoot: function(root)
    {
        var node = this;
        var nChildren;
        var siblingNumber;
        var x0 = 0.0;
        var x1 = 1.0;
        var dx = x1 - x0;
        //while (node !== root && node.parent !== null)
        while (node !== root)
        {
            nChildren = node.parent.nChildren();
            siblingNumber = node.siblingNumber();
            x0 = (siblingNumber + x0) / nChildren;
            x1 = (siblingNumber + x1) / nChildren;
            node = node.parent;
        }
        return {
            'x0': x0,
            'x1': x1
        };
    },
    // Convert node to an x range in canvas coordinates. 
    xRange: function()
    {
        var node = this;
        var nChildren;
        var siblingNumber;
        var x0 = 0.0;
        var x1 = 1.0;
        var dx = x1 - x0;
        while (node.parent !== null)
        {
            nChildren = node.parent.nChildren();
            siblingNumber = node.siblingNumber();
            x0 = (siblingNumber + x0) / nChildren;
            x1 = (siblingNumber + x1) / nChildren;
            node = node.parent;
        }
        return {
            'x0': x0,
            'x1': x1
        };
    },
    updateType: function()
    {
        var nChildren = this.nChildren();
        var node;
        if ((nChildren > 0) && (this.s.type === 'maybe'))
        {
            node = this.child;
            this.s.type = 'no';
            while (node !== null)
            {
                if ((node.s.type === 'yes') || (node.s.type === 'solution leaf'))
                {
                    this.s.type = 'yes';
                    break;
                }
                if (node.s.type === 'maybe')
                {
                    this.s.type = 'maybe';
                }
                node = node.sibling;
            }
        }
        //update maxDepth
        if (nChildren > 0)
        {
            var maxDepth = 0;
            node = this.child;
            while (node !== null)
            {
                if (node.maxDepth > maxDepth)
                {
                    maxDepth = node.maxDepth;
                }
                node = node.sibling;
            }
            this.maxDepth = maxDepth + 1;
        }
        return;
    },
    updateTypeAbove: function()
    {
        var node = this;
        while (node !== null)
        {
            node.updateType();
            node = node.parent;
        }
        return;
    },
    //just hacked together, find the path in the tree to node
    //Should later be replaced using labels rather than sibling number, as
    //this information is used to call the backtracking program.
    //utility for trees
    findPath: function ()
    {
        var pathArray = [];
        var node = this;
        if (node !== null)
        {
            while(node.parent !== null)
            {
                //prepend its siblingNumber
                //original method
                //pathArray.unshift(node.siblingNumber());
                //prepend its label
                //pathArray.unshift(node.label);
                pathArray.unshift(node.label);
                node = node.parent;
            }
        }
        return pathArray;
    },
    // This is the function which uses the input tree to conduct the search. 
    search: function(searchDepth)
    {
        var childrenArray;
        if (this.findPath().length === btAppSearch.maxPathLength())
        {
            this.s.type = 'solution leaf';
        }
        //else if (searchDepth > 0)
        else if ((searchDepth > 0) && (this.s.type !== 'no'))
        {
            //need to replace following line by a function call
            //call searchChild(node)
            //var inputNchildren = this.s.inputNode.nChildren();
            //childrenArray = this.findPath().getChildren();
            //childrenArray = getChildren(findPath(this));
            childrenArray = btAppSearch.getChildren(this.findPath());
            //alert(childrenArray);
            var inputNchildren = childrenArray.length;
            var i = 0;
            if (inputNchildren > 0)
            {
                // /*
                // This is, frankly, horrible - should just insert directly
                // rather than using insert child when null.
                var child = this.child;
                for (i=0; i<inputNchildren; i++)
                {
                    if (child === null)
                    {
                        child = this.insertChild('');
                        child.parent = this;
                        //child.label = childrenArray[i];
                        //alert(child.label);
                        child.s = {
                            //'inputNode': inputChild,
                            'type': 'maybe'
                            //add state information
                            //path = parent path + current choice
                            //add object information from child
                        };
                        if (this.findPath().length + 1  === btAppSearch.maxPathLength())
                        {
                            //then this newly created node must be a
                            //solution
                            //do this here, because only want to update
                            //count once, when node is created.
                            gTreeCanvas.solutionCounter = gTreeCanvas.solutionCounter + 1;
                        }
                        //terrible coding, sorry!
                        //tests whether "label" exists; this is the case
                        //for current version of Gram matrix
                        //decomposition.
                        //In future: completely generic, labels will not
                        //need to be a particular format, and in
                        //particular may be javascript objects which
                        //include other info
                        if (childrenArray[i].label != null)
                        {
                            child.label = childrenArray[i].label;
                            child.s.d2 = childrenArray[i].d2;
                        }
                        else
                        {
                            child.label = childrenArray[i];
                        }
                    }
                    //if searchDepth == 1, really just checking to see
                    //if we have reached the depth of solutions
                    if (searchDepth > 0)
                    {
                        child.search(searchDepth - 1);
                    }
                    //inputChild = inputChild.sibling;
                    child = child.sibling;
                }
                this.updateType();
            }
            else
            {
                this.s.type = 'non solution leaf';
            }
        }
        return;
    },
    // The following functions know and care about the tree view. 
    // Draw the contents of the overlap between a tile and the tree pane. 
    // 10/11/2014: need to change this to start from the root node of
    // the view, to avoid numerical underflow
    draw: function (tile, nodeOnly, highlight)
    {
        nodeOnly  = typeof nodeOnly  === 'boolean' ? nodeOnly : false;
        highlight = typeof highlight === 'boolean' ? highlight : false;
        canvasTile = canvasFromImage(tile, gPanes.treePane, gTreeCanvas);
        var x0Canvas = canvasTile.x0;
        var x1Canvas = canvasTile.x1;
        var y0Canvas = canvasTile.y0;
        var y1Canvas = canvasTile.y1;
        var radius = gTreeView.rfac * Math.min(gTreeCanvas.levelHeight, x1Canvas - x0Canvas);
        //adjustment to radius taken out on 16/10/14
        //if (radius < 0.75) {radius = 0.75;}
        //if ((x0Canvas <= gTreeCanvas.width) && (x1Canvas >= 0.0) && (radius >= 0.5))
            //Ensure we don't waste effort on parts of the tree that are not
        //on the canvas.
        //Adding case to draw a transparent rectangle to bottom of
        //screen if radius is too small 16/10/14
        //if ((x0Canvas <= gTreeCanvas.width) && (x1Canvas >= 0.0) && (radius >= 0.5) 
            //&& (y0Canvas <= gTreeCanvas.height))

        if ((x0Canvas <= gTreeCanvas.width) && (x1Canvas >= 0.0) && (y0Canvas <= gTreeCanvas.height))
            //if ((x0Canvas <= gTreeCanvas.width) && (x1Canvas >= 0.0) && (radius >= 0.5) 
                //&& (y0Canvas <= gTreeCanvas.height))
            {
                var drawingTreeView = gTreeCanvas.drawingTreeView;
                var xp = 0.5 * (x0Canvas + x1Canvas);
                var yp = y0Canvas + 0.5 * gTreeCanvas.levelHeight;
                if (nodeOnly)
                {
                    //draw tree node
                    drawingTreeView.beginPath();
                    drawingTreeView.arc(xp, yp, radius, 0, 2 * Math.PI, false);
                    drawingTreeView.fillStyle = gTreeView.typeColour[this.s.type];
                    drawingTreeView.fill();
                    if (highlight)
                    {
                    //highlight tree node
                    //original due to Paul, draw ring
                    //drawingTreeView.beginPath();
                    //drawingTreeView.arc(xp, yp, radius * 0.9, 0, 2 * Math.PI, false);
                    //drawingTreeView.lineWidth = 0.2 * radius;
                    ////drawingTreeView.strokeStyle = highlight ? '#000000' : drawingTreeView.fillStyle;
                    //drawingTreeView.strokeStyle = highlight ? '#0011FF' : drawingTreeView.fillStyle;
                    //drawingTreeView.stroke();
                    //draw dot in centre
                    drawingTreeView.beginPath();
                    drawingTreeView.arc(xp, yp, radius * 0.5, 0, 2 * Math.PI, false);
                    //drawingTreeView.lineWidth = 0.2 * radius;
                    //drawingTreeView.strokeStyle = highlight ? '#000000' : drawingTreeView.fillStyle;
                    drawingTreeView.fillStyle = '#0022FF';
                    drawingTreeView.fill();
                    }
                    if (this.parent !== null)
                    {
                        //must be != null, not !==
                        if (this.s.d2 != null && radius > 7.1)
                        {
                            //drawingTreeView.fillText(node.s.d2.toString(),xc,yc);
                            //drawingTreeView.font = "15px Georgia";
                            //drawingTreeView.font = "bold 14pt Verdana";
                            drawingTreeView.font = "12pt Verdana";
                            drawingTreeView.fillStyle = "black";
                            drawingTreeView.textAlign = "center";
                            drawingTreeView.fillText(this.s.d2.toString(),xp,yp-0.35*gTreeCanvas.levelHeight);
                            //alert(" "+node.s.d2.toString()+" "+xc+" "+yc);
                        }
                    }
                }
                else if (radius <= 0.5)
                {
                    //draw transparent rectangle to bottom of canvas
                    //
                    drawingTreeView.globalAlpha = 0.1;
                    //drawingTreeView.beginPath();
                    drawingTreeView.fillStyle = gTreeView.typeColour[this.s.type];
                    //drawingTreeView.fillRect(x0Canvas,y0Canvas,x1Canvas-x0Canvas,gTreeCanvas.height-y0Canvas);
                    drawingTreeView.fillRect(x0Canvas,y0Canvas+0.5*gTreeCanvas.levelHeight,x1Canvas-x0Canvas,this.maxDepth*gTreeCanvas.levelHeight);
                    drawingTreeView.globalAlpha = 1.0;
                    //draw tree node
                    drawingTreeView.beginPath();
                    drawingTreeView.arc(xp, yp, radius, 0, 2 * Math.PI, false);
                    drawingTreeView.fillStyle = gTreeView.typeColour[this.s.type];
                    drawingTreeView.fill();
                }
                else
                {
                    var xstep;
                    var nChildren = this.nChildren();
                    xstep = (x1Canvas - x0Canvas) / nChildren;
                    var radius2 = gTreeView.rfac * Math.min(gTreeCanvas.levelHeight, xstep);
                    if (nChildren > 0)
                    {
                        var node;
                        var xc, yc;
                        var x = x0Canvas;
                        node = this.child;
                        while (node !== null)
                        {
                            //draw internal edge
                            xc = x + 0.5 * xstep;
                            yc = y0Canvas + 1.5 * gTreeCanvas.levelHeight;
                            //drawingTreeView.lineWidth = 0.25 * radius2;
                            //drawingTreeView.strokeStyle = '#000000';
                            ////drawingTreeView.strokeStyle = gTreeView.typeColour[node.s.type];
                            //drawingTreeView.beginPath();
                            //drawingTreeView.moveTo(xp, yp);
                            ////drawingTreeView.lineTo(x + 0.5 * xstep, y0Canvas + 1.5 * gTreeCanvas.levelHeight);
                            //drawingTreeView.bezierCurveTo(xc,yp,xc,yp,xc,yc);
                            ////drawingTreeView.bezierCurveTo(0.7*xc+0.3*xp,yp,0.7*xc+0.3*xp,yp,xc,yc);
                            //drawingTreeView.stroke();
                            drawingTreeView.lineWidth = 0.20 * radius2;
                            //drawingTreeView.strokeStyle = '#000000';
                            drawingTreeView.strokeStyle = gTreeView.typeColour[node.s.type];
                            drawingTreeView.beginPath();
                            drawingTreeView.moveTo(xp, yp);
                            //drawingTreeView.lineTo(x + 0.5 * xstep, y0Canvas + 1.5 * gTreeCanvas.levelHeight);
                            drawingTreeView.bezierCurveTo(xc,yp,xc,yp,xc,yc);
                            //drawingTreeView.bezierCurveTo(0.7*xc+0.3*xp,yp,0.7*xc+0.3*xp,yp,xc,yc);
                            drawingTreeView.stroke();
                            //terrible code!
                            //print out extra information for Gram
                            //matrix decomposition
                            //if (node.s.d2 != null && radius > 10)
                            //{
                                ////drawingTreeView.fillText(node.s.d2.toString(),xc,yc);
                                ////drawingTreeView.font = "15px Georgia";
                                //drawingTreeView.font = "bold 14pt Verdana";
                                //drawingTreeView.fillStyle = "black";
                                //drawingTreeView.textAlign = "center";
                                //drawingTreeView.fillText(node.s.d2.toString(),xc,0.7*yc+0.3*yp);
                                ////alert(" "+node.s.d2.toString()+" "+xc+" "+yc);
                            //}
                            x = x + xstep;
                            node = node.sibling;
                        }
                        x = x0Canvas;
                        node = this.child;
                        while (node !== null)
                        {
                            //draw subtree
                            node.draw(imageFromCanvas(Rect(x, x + xstep, y0Canvas + gTreeCanvas.levelHeight, y1Canvas), gPanes.treePane, gTreeCanvas));
                            x = x + xstep;
                            node = node.sibling;
                        }
                    }
                    //draw tree node
                    drawingTreeView.beginPath();
                    drawingTreeView.arc(xp, yp, radius, 0, 2 * Math.PI, false);
                    drawingTreeView.fillStyle = gTreeView.typeColour[this.s.type];
                    drawingTreeView.fill();
                    if (this.parent !== null)
                    {
                    //must be !=, not !==
                        if (this.s.d2 != null && radius > 6.1)
                        {
                            //drawingTreeView.fillText(node.s.d2.toString(),xc,yc);
                            //drawingTreeView.font = "15px Georgia";
                            //drawingTreeView.font = "bold 14pt Verdana";
                            drawingTreeView.font = "12pt Verdana";
                            drawingTreeView.fillStyle = "black";
                            drawingTreeView.textAlign = "center";
                            drawingTreeView.fillText(this.s.d2.toString(),xp,yp-0.35*gTreeCanvas.levelHeight);
                            //alert(" "+node.s.d2.toString()+" "+xc+" "+yc);
                        }
                    }
                    //drawingTreeView.lineWidth = 0.1 * radius;
                    //drawingTreeView.strokeStyle = '#000000';
                }
            }
    },
    //convert tile in image coordinates to a node on the tree
    find: function (tile)
    {
        var value;
        canvasTile = canvasFromImage(tile, gPanes.treePane, gTreeCanvas);
        var x0Canvas = canvasTile.x0;
        var x1Canvas = canvasTile.x1;
        var y0Canvas = canvasTile.y0;
        var y1Canvas = canvasTile.y1;
        var radius = gTreeView.rfac * Math.min(gTreeCanvas.levelHeight, x1Canvas - x0Canvas);
        if ((x0Canvas <= gTreeView.xSelect) && (x1Canvas >= gTreeView.xSelect) &&
        (y0Canvas <= gTreeView.ySelect) && (y0Canvas + gTreeCanvas.height / gTreeView.nLevels >= gTreeView.ySelect))
        {
        //alert("in here");
            var xp = 0.5 * (x0Canvas + x1Canvas);
            var yp = y0Canvas + 0.5 * gTreeCanvas.levelHeight;
            var d2 = (xp - gTreeView.xSelect) * (xp - gTreeView.xSelect) + (yp - gTreeView.ySelect) * (yp - gTreeView.ySelect);
            if (d2 < radius * radius)
            {
                //need to somehow round off positions
                nodeRect = imageFromCanvas(canvasTile, gPanes.treePane, gTreeCanvas);
                return {
                    'success': true,
                    'x0': tile.x0,
                    'x1': tile.x1,
                    'y0': tile.y0,
                    'y1': tile.y1,
                    'node': this
                };
            }
            else
            {
                return {
                    'success': false
                };
            }
        }
        else
        {
        //alert("no in here");
            var node;
            var nChildren = this.nChildren();
            var xstep = (x1Canvas - x0Canvas) / nChildren;
            if (nChildren > 0)
            {
                var x = x0Canvas;
                node = this.child;
                while (node !== null)
                {
                    value = node.find(imageFromCanvas(Rect(x, x + xstep, y0Canvas + gTreeCanvas.levelHeight, y1Canvas), gPanes.treePane, gTreeCanvas));
                    if (value.success)
                    {
                        return value;
                    }
                    x = x + xstep;
                    node = node.sibling;
                }
            }
        }
        return {
            'success': false
        };
    }
    //convert tile in image coordinates to a node on the tree
    //new version of find function.
    //only relies on knowledge of the path to the root node, and
    //the number of levels
    //input: canvas context, click position, current root
};

//This is the game tree - the tree that is drawn on the canvas.
gTreeView.gameTree = new BacktrackingTree('');
gTreeView.gameTree.s = {
    //'inputNode': gTreeView.inputTree,
    'type': 'maybe'
};
gTreeView.gameTree.parent = null;

var xFocus = 0.5;
var yFocus = 0.5;
//gTreeView.timeFraction;

function interpolateRect(newRect, oldRect, increment)
{
    var x0 = newRect.x0 * increment + oldRect.x0 * (1.0 - increment);
    var x1 = newRect.x1 * increment + oldRect.x1 * (1.0 - increment);
    var y0 = newRect.y0 * increment + oldRect.y0 * (1.0 - increment);
    var y1 = newRect.y1 * increment + oldRect.y1 * (1.0 - increment);
    return Rect(x0, x1, y0, y1);
}
var virtualCanvas;
function changeTreeView(newRoot,duration)
{
    var start = null;
    //var rootNode = viewRoot().parent;
    var rootNode = viewRoot();
    // Function to be used in the callback from requestAnimationFrame. 
    function interpolateStep(timestamp)
    {
        var progress;
        //var duration; // milliseconds //const
        //duration = 1500.0; // milliseconds //const
        if (start === null)
        {
            start = timestamp;
        }
        progress = timestamp - start;
        increment = Math.min(progress / duration, 1.0);
        gPanes.treePane = interpolateRect(gPanes.treePaneNew, gPanes.treePaneOld, increment);
        //var treePane = interpolateRect(gPanes.treePaneNew, gPanes.treePaneOld, increment);
        gTreeCanvas.drawingTreeView.clearRect(0, 0, gTreeCanvas.width, gTreeCanvas.height);
        //gTreeView.gameTree.draw(treePaneFromLevels(gTreeView.nLevels));
        //rootNode.draw(treePaneFromLevels(gTreeView.nLevels));
        //rootNode.draw(gPanes.treePane);
        rootNode.draw(gPanes.treePaneOld);
        //rootNode.draw(treePane);
        //rootNode.draw(gPanes.treePane);
        if (increment < 1.0)
        {
            window.requestAnimationFrame(interpolateStep);
        }
        else
        {
            gTreeView.path = newRoot.findPath();
            gTreeView.level = gTreeView.path.length+1;
            gTreeCanvas.drawingTreeView.clearRect(0, 0, gTreeCanvas.width, gTreeCanvas.height);
            gPanes.treePane = Rect(0, 1, gTreeView.level - 1, gTreeView.level - 1 + gTreeView.nLevels);
            //gPanes.treePane = Rect(0, 1, 0,  gTreeView.nLevels);
            newRoot.draw(gPanes.treePane);
        }
    }
    window.requestAnimationFrame(interpolateStep);
}
function highlightNodeOld(node, highlight)
{
    //if (node != gTreeView.gameTree)
    //{
        highlight = typeof highlight === 'boolean' ? highlight : false;
        var level = node.level();
        var xrange = node.xRange();
        //var tile = Rect(xrange.x0, xrange.x1, level - 1, level - 1 + gTreeView.nLevels);
        var tile = Rect(xrange.x0, xrange.x1, level - 1, level);
        node.draw(tile, true, highlight);
    //}
}
function highlightNode(node, highlight)
{
    //if (node != gTreeView.gameTree)
    //{
        highlight = typeof highlight === 'boolean' ? highlight : false;
        var level = node.level();
        var rootNode = viewRoot();
        var xrange = node.xRangeRoot(rootNode);
        //var tile = Rect(xrange.x0, xrange.x1, level - 1, level - 1 + gTreeView.nLevels);
        var tile = Rect(xrange.x0, xrange.x1, level - 1, level);
        node.draw(tile, true, highlight);
    //}
}

// This is run when the canvas is clicked. 
// If a node has been selected then the action will depend on 
// the value of gTreeView.mode. 
function BacktrackingTreeOnClick(e)
{
    var coords = CanvasCoordinates(e);
    var x = coords.x;
    var y = coords.y;
    view = imageFromCanvas(Rect(x,x,y,y), gPanes.treePane, gTreeCanvas);
    gTreeView.xSelect = coords.x;
    gTreeView.ySelect = coords.y;
    //need to change this - getting numerical precision error - need to
    //start from root of the part of the tree that is being viewed, and
    //*not* from the root of the whole tree.
    //10/11/2014: path is no longer maintained!? seems to just maintain viewing
    //window and that's it. Not sure if design changed, or if settled on
    //this a long time ago. Definitely far from optimal.
    //so, viewRoot() non-functional for the moment.
    var rootNode = viewRoot();
    //alert("gTreeView.path ="+gTreeView.path+" gTreeView.level = "+gTreeView.level);
    //var rootNode = viewRoot(gTreeView.gameTree);
    //alert("root = "+rootNode);
    //console.log(rootNode);
    //console.log(gTreeView.gameTree);
    //var value = gTreeView.gameTree.find(treePaneFromLevels(gTreeView.nLevels));
    //var value = rootNode.find(treePaneFromLevels(gTreeView.nLevels));
    var value = rootNode.find(gPanes.treePane);
    //var value = rootNode.find(treePaneFromLevels(gTreeView.nLevels));
    //alert(treePaneFromLevels(gTreeView.nLevels));
    //alert(rootNode);
    //alert(gTreeView.nLevels);
    //alert(gTreeView.level);
    //var value = rootNode.find(treePaneFromLevels(gTreeView.nLevels+1-gTreeView.level));

    if (value.success)
    {
        var node = value.node;
        if (e.altKey || e.metaKey)
        {
            gTreeCanvas.moveCounter = gTreeCanvas.moveCounter + 1;
            updateMoveCounter(gTreeCanvas.moveCounter);
            var maxDepth = gTreeView.searchDepth;
            var i = 1;
            var drawTreeSearch = function() {
                node.search(i);
                node.updateTypeAbove();
                gTreeCanvas.drawingTreeView.clearRect(0, 0, gTreeCanvas.width, gTreeCanvas.height);
                //gTreeView.gameTree.draw(treePaneFromLevels(gTreeView.nLevels));
                //rootNode.draw(treePaneFromLevels(gTreeView.nLevels));
                rootNode.draw(gPanes.treePane);
                i++;
                if(i <= maxDepth) 
                { 
                setTimeout(drawTreeSearch, 200); 
                }
                else
                {
                    updateNodeCounter(gTreeCanvas.nodeCounter);
                    updateSolutionCounter(gTreeCanvas.solutionCounter);
                }
            };
            drawTreeSearch();
            //node.search(gTreeView.searchDepth);
            //node.updateTypeAbove();
            //gTreeCanvas.drawingTreeView.clearRect(0, 0, gTreeCanvas.width, gTreeCanvas.height);
            //gTreeView.gameTree.draw(treePaneFromLevels(gTreeView.nLevels));
            //highlightNode(gTreeView.gameTree.highlightedNode, true);
        }
        else if (e.shiftKey)
        //else if (gTreeView.mode === 'explore')
        {
            //jslint complains about empty if blocks
            //-0.5 is a fudge, thought it should be -1.0
            //working, old version
            //if (node.parent !== null)
            //{
                //var xrange;
                //var level = node.level();
                //if (level - 1.5 <= gPanes.treePane.y0)
                //{
                    ////it is the topmost node, bring down parent
                    //xrange = node.parent.xRange();
                    //gPanes.treePaneNew = Rect(xrange.x0, xrange.x1, level - 2, level - 2 + gTreeView.nLevels);
                    //gPanes.treePaneOld = gPanes.treePane;
                    ////snappier animation
                    //changeTreeView(1000);
                //}
                //else
                //{
                    //xrange = node.xRange();
                    //gPanes.treePaneNew = Rect(xrange.x0, xrange.x1, level - 1, level - 1 + gTreeView.nLevels);
                    //gPanes.treePaneOld = gPanes.treePane;
                    ////slower animation
                    //changeTreeView(1500);
                //}
            //}

            //attempted new version
            if (node.parent !== null)
            {
                var xrange;
                var dy;
                var level = node.level();
                //alert("before: level = "+level+" gtree level = "+gTreeView.level);
                //alert("treePane = "+gPanes.treePane);
                //alert(gTreeView.level+' path = '+gTreeView.path);
                //if (level - 1.5 <= gPanes.treePane.y0)
                if (level - 0.5 <= gTreeView.level)
                {
                   //alert("root node");
                    //it is the topmost node, bring down parent
                    //need to only go up to the root.
                    //and, need to save old pane
                    //with respect to parent, just go up one level
                    //xrange = node.parent.xRange();
                    
                    //gPanes.treePaneNew = Rect(xrange.x0, xrange.x1, level - 2, level - 2 + gTreeView.nLevels);
                    //gPanes.treePaneNew = Rect(xrange.x0, xrange.x1, level - 2, level - 2 + gTreeView.nLevels);
                    //gPanes.treePaneOld = gPanes.treePane;
                    xrange = node.xRangeRoot(node.parent);
                    var total_length = 1/(xrange.x1-xrange.x0);
                    var x0p = -xrange.x0 * total_length;
                    var x1p = x0p + total_length;
                    gPanes.treePaneOld = Rect(0, 1, level - 1, level - 1 + gTreeView.nLevels+1);
                    gPanes.treePaneNew = Rect(x0p, x1p, level - 2, level - 2 + gTreeView.nLevels);
                    gPanes.treePane = gPanes.treePaneOld; 
                    changeTreeView(node.parent,1000);
                }
                else
                {
                    xrange = node.xRangeRoot(rootNode);
                    gPanes.treePaneNew = Rect(xrange.x0, xrange.x1, level - 1, level - 1 + gTreeView.nLevels);
                    gPanes.treePaneOld = Rect(0, 1, gTreeView.level - 1, gTreeView.level - 1 + gTreeView.nLevels);
                    gPanes.treePane = gPanes.treePaneOld; 
                    //slower animation
                    changeTreeView(node,1500);
                }
            }

            //if (node.parent !== null)
            //{
                //var xrange;
                //var level = node.level();
                //alert("level = "+level+" gtree level = "+gTreeView.level);
                //if (level - 1.5 <= gPanes.treePane.y0)
                ////if (level - 0.5 <= gTreeView.level)
                //{
                    //alert("in here 1");
                    ////it is the topmost node, bring down parent
                    //alert("in here 2");
                    ////alert(gTreeView.level+' path = '+gTreeView.path);
                    //xrange = node.parent.xRange();
                    //gPanes.treePaneNew = Rect(xrange.x0, xrange.x1, level - 2, level - 2 + gTreeView.nLevels);
                    //gPanes.treePaneOld = gPanes.treePane;
                    //alert("in here 3");
                    ////snappier animation
                    //changeTreeView(1000);
                    //alert("in here 4");
                    //gTreeView.path = node.parent.findPath();
                    //gTreeView.level = gTreeView.path.length+1;
                //}
                //else
                //{
                    //xrange = node.xRange();
                    ////gPanes.treePaneNew = Rect(xrange.x0, xrange.x1, level - 1, level - 1 + gTreeView.nLevels);
                    //gPanes.treePaneNew = Rect(xrange.x0, xrange.x1, level - 1, level - 1 + gTreeView.nLevels);
                    //gPanes.treePaneOld = gPanes.treePane;
                    ////slower animation
                    //changeTreeView(1500);
                    //gTreeView.path = node.findPath();
                    //gTreeView.level = gTreeView.path.length+1;
                //}
            //}
            //highlightNode(gTreeView.gameTree.highlightedNode, true);
        }
        //else if (gTreeView.mode === 'inspect')
        else
        {
            //document.getElementById("inspect").innerHTML = "<p style=\"color:" + gTreeView.typeColour[node.s.type] + "\">" + node.s.type + " node</p>";
            //alert(node.maxDepth);
            //highlight the node
            gTreeCanvas.drawingTreeView.clearRect(0, 0, gTreeCanvas.width, gTreeCanvas.height);
            rootNode.draw(gPanes.treePane);
            gTreeView.gameTree.highlightedNode = node;
            highlightNode(gTreeView.gameTree.highlightedNode);
            highlightNode(node, true);
            //added 12/10/14: draw object in a pop-up window
            //placeholder - just trying to see if knight's tour will
            //work
            //function popup()
            //{
                //w = window.open("","","width=400,height=400");
                //var canvas = w.document.createElement("canvas");
                //canvas.width = 400;
                //canvas.height = 400;
                //w.document.body.appendChild(canvas);
                //var ctx = canvas.getContext('2d');
                ////ctx.fillStyle = "rgb(255,165,0)";
                ////ctx.fillRect(0, 0, 100, 100);
                ////var a = node.findPath();
                ////alert("a = "+a.toString());
                ////var b = btAppSearch.getObject(a);
                ////console.log(b);
                ////alert("b = "+b.toString());
                ////btAppDraw.draw(canvas,b);
                //btAppDraw.draw(canvas,btAppSearch.getObject(node.findPath()));
            //}
            //popup();
            var context = inspect_canvas.getContext("2d");
            context.save();
            btAppDraw.draw(inspect_canvas,btAppSearch.getObject(node.findPath()));
            //alert(node.findPath());
            context.restore();
            //btAppDraw.draw(inspect_canvas,node);


        }
    }
    return;
}

function resetView()
//resets view so that the whole tree is displayed
{
    gTreeView.level = 1;
    gTreeView.path = [];
    gPanes.treePane = Rect(0, 1, gTreeView.level - 1, gTreeView.level - 1 + gTreeView.nLevels);
    var rootNode = viewRoot();
    gTreeCanvas.drawingTreeView.clearRect(0, 0, gTreeCanvas.width, gTreeCanvas.height);
    rootNode.draw(gPanes.treePane);
    return;
}

function BacktrackingTreeInit(canvasElement)
{
    gTreeCanvas.canvasElement = canvasElement;
    gTreeCanvas.width = canvasElement.width;
    gTreeCanvas.height = canvasElement.height;
    gTreeCanvas.levelHeight = gTreeCanvas.height / gTreeView.nLevels;
    gTreeCanvas.canvasElement.addEventListener("click", BacktrackingTreeOnClick, false);
    //gTreeCanvas.canvasElement.addEventListener("dblclick", BacktrackingTreeOnDblClick, false);
    //gTreeCanvas.canvasElement.addEventListener("mouseover", BacktrackingTreeOnMouseover, false);
    gTreeCanvas.drawingTreeView = gTreeCanvas.canvasElement.getContext("2d");
    gTreeCanvas.moveCounter = 0;
    document.getElementById("move_counter").innerHTML =
    '<b>' + gTreeCanvas.moveCounter + '</b> moves';
    gTreeCanvas.nodeCounter = 0;
    document.getElementById("node_counter").innerHTML =
    '<b>' + gTreeCanvas.nodeCounter + '</b> nodes';
    gTreeCanvas.solutionCounter = 0;
    document.getElementById("solution_counter").innerHTML =
    '<b>' + gTreeCanvas.solutionCounter + '</b> solutions';
}

