btAppDraw = (function()
/*
must supply public functions:
draw: function (object)
*/
{
    // calculates the places a queen can move and return an array with
    // an integer saying the number of queens attacking a given square.
    // a queen attacks the square she is on four times.
    // Takes string of the form "#rows #cols (space separated array 
        // in row major order, with 0 for empty squares, and 1 for squares
        // where a queen is located)"
        function calculateMoves(nQueens) {
            var moveArray = [];
            for(i = 0; i < nQueens.queenArray.length; i++) {
                moveArray[i] = 0;
            }

            var maxDimension = Math.max(nQueens.numRows, nQueens.numCols); // is there more files or ranks?
            for(i = 0; i < nQueens.queenArray.length; i++) {
                if(nQueens.queenArray[i] > 0) {
                    // (i - 2) % strArray[1] is the file the queen found is on
                    // Math.floor(i / strArray[1]]) - 1 is the rank the queen found is on
                    var file = i % nQueens.numCols;
                    var rank = Math.floor(i / nQueens.numCols);

                    // file attacked
                    for(j = 0; j < nQueens.numRows; j++) {
                        moveArray[j * nQueens.numCols + file]++;
                    }

                    // ranked attacked
                    for(j = 0; j < nQueens.numCols; j++) {
                        moveArray[rank * nQueens.numCols + j]++;
                    }

                    // top left to bottom right diagonal attacked
                    var f0 = 0;
                    var r0 = rank - file;
                    var f1 = f0;
                    var r1 = r0;
                    for(j = 0; j < maxDimension; j++) {
                        f1 = f0 + j;
                        r1 = r0 + j;
                        if(f1 >= 0 && r1 >= 0 && r1 < nQueens.numRows  && f1 < nQueens.numCols) {
                            moveArray[r1 * nQueens.numCols + f1]++;
                        }
                    }

                    // bottom left to top right diagonal attacked
                    f0 = 0;
                    r0 = rank + file;
                    f1 = f0;
                    r1 = r0;
                    for(j = 0; j < maxDimension; j++) {
                        f1 = f0 + j;
                        r1 = r0 - j;
                        if(f1 >= 0 && r1 >= 0 && r1 < nQueens.numRows  && f1 < nQueens.numCols) {
                            moveArray[r1 * nQueens.numCols + f1]++;
                        }
                    }
                }
            }

            return moveArray
        }

        // takes the context of the canvas drawing to, the
        // x coordinate for where the legend starts, the y
        // coordinate where the legend starts (the same as
            // the board) and the size of the squares.
            //function drawLegend(context, legendX, upperLeftY, squareSize) {
            function drawLegend(scaleImage, context, legendX, upperLeftY, squareSize) {
                // draw a legend off to the right.
                // this feels really hacky.
                context.lineWidth="2";
                context.strokeStyle="#000000";
                context.strokeRect(legendX - 1, upperLeftY - 1, squareSize + 2, squareSize + 2);
                context.strokeRect(legendX - 1, upperLeftY - 1 + squareSize + 10, squareSize + 2, squareSize + 2);
                context.strokeRect(legendX - 1, upperLeftY - 1 + 2 * (squareSize + 10), squareSize + 2, squareSize + 2);
                context.stroke();
                var posX1 = legendX;
                var posY1 = upperLeftY;
                var img1 = new Image();
                img1.onload = function() {
                    context.save();
                    context.scale(scaleImage, scaleImage);
                    context.drawImage(img1, posX1, posY1, squareSize, squareSize);
                    context.restore();
                }
                img1.src = "images/queen.png";
                // commented out the following two lines because the image should replace it, but if it doesn't work I'll have to fix it.
                // context.fillStyle = "#FF00FF";
                // context.fillRect(legendX, upperLeftY, squareSize, squareSize);
                context.fillStyle = "#00FFFF";
                context.fillRect(legendX, upperLeftY + squareSize + 10, squareSize, squareSize);
                var posX2 = legendX;
                var posY2 = upperLeftY + 2 * (squareSize + 10);
                var img2 = new Image();
                img2.onload = function() {
                    context.save();
                    context.scale(scaleImage, scaleImage);
                    context.drawImage(img2, posX2, posY2, squareSize, squareSize);
                    context.restore();
                }
                img2.src = "images/queen_attacked.png";
                // commented out the following two lines because the image should replace it, but if it doesn't work I'll have to fix it.
                // context.fillStyle = "#00FF00";
                // context.fillRect(legendX, upperLeftY + 2 * (squareSize + 10), squareSize, squareSize);

                context.fillStyle = "#000000";
                context.font="30px Arial";
                context.fillText("Queen", legendX + squareSize + 20, upperLeftY + 5 * squareSize / 8, 3 * squareSize / 2);
                context.fillText("Attacked", legendX + squareSize + 20, upperLeftY + 5 * squareSize / 8 + squareSize + 10, 3 * squareSize / 2);
                context.fillText("Queen attacked", legendX + squareSize + 20, upperLeftY + 5 * squareSize / 8 + 2 * (squareSize + 10), 3 * squareSize / 2);
            }

            // takes the context of the canvas drawing to, the
            // x,y coord of the upper left corner of the board
            // the #cols and #rows and the size of the squares
            function drawBoard(context, upperLeftX, upperLeftY, numCols, numRows, squareSize) {
                // draw base of chessboard.
                // draw an outline of board
                // otherwise it looks bad
                // and the white of the board
                // bleeds with the white of
                // the background.
                var i, j;
                context.strokeStyle="#FF0000";
                context.strokeRect(upperLeftX - 1, upperLeftY - 1, numCols * squareSize + 2, numRows * squareSize + 2);

                // draws black first.
                context.fillStyle="#000000";
                context.fillRect(upperLeftX, upperLeftY, numCols * squareSize, numRows * squareSize);

                // draw white sections of the board.
                // this loop actually isn't magic for once!
                // got to make sure you have a white square in the top left hand corner.
                context.fillStyle="#FFFFFF";
                for(i = 0; i < numRows; i++) {
                    for(j = 0; j < numCols; j++) {
                        if((i - j) % 2 == 0) {
                            context.fillRect(upperLeftX + j * squareSize, upperLeftY + i * squareSize, squareSize, squareSize);
                        }
                    }
                }
            }

            // this function is now incredibly hacky but it works.
            // ideally we call a wait while the images load.
            // needless to say, it has room for improvement.
            //function drawMoves(canvas, nQueens, attackingMoves, squareSize, upperLeftX, upperLeftY) {
            function drawMoves(scaleImage, context, nQueens, attackingMoves, squareSize, upperLeftX, upperLeftY) {
                //var context = canvas.getContext("2d");			
                //var scaleImage = calculateScale(canvas.width, canvas.height, upperLeftX, upperLeftY, nQueens.numRows, nQueens.numCols, squareSize);
                var imgA = new Image();
                imgA.onload = function() {
                    var img = new Image();
                    img.onload = function() {
                        context.save();
                        context.scale(scaleImage, scaleImage);
                        var i, j;
                        for(i = 0; i < nQueens.numRows; i++) {
                            for(j = 0; j < nQueens.numCols; j++) {					
                                // need 4 because the way I calculate it a queen attacks itself 4 times
                                if((nQueens.queenArray[i * nQueens.numCols + j] > 0) && (attackingMoves[i * nQueens.numCols + j] > 4)) {
                                    var posX = upperLeftX + (j * squareSize);
                                    var posY = upperLeftY + i * squareSize;
                                    //var img = new Image();
                                    //img.onload = function() {
                                        //context.drawImage(img, posX, posY, squareSize, squareSize);
                                        //}
                                        //img.src = "images/queen_attacked.png";
                                        context.drawImage(imgA, posX, posY, squareSize, squareSize);
                                        // commented out the following two lines because the image should replace it, but if it doesn't work I'll have to fix it.
                                        // context.fillStyle = "rgba(0, 255, 0, 0.85)";
                                        // context.fillRect(upperLeftX + (j * squareSize), upperLeftY + i * squareSize, squareSize, squareSize);
                                }
                                else if(nQueens.queenArray[i * nQueens.numCols + j] > 0) {
                                    var posX = upperLeftX + (j * squareSize);
                                    var posY = upperLeftY + i * squareSize;
                                    //var img = new Image(); 
                                    //img.onload = function() {
                                        //	context.drawImage(img, posX, posY, squareSize, squareSize);
                                        //}
                                        //img.src = "images/queen.png";
                                        context.drawImage(img, posX, posY, squareSize, squareSize);
                                        // commented out the following two lines because the image should replace it, but if it doesn't work I'll have to fix it.
                                        // context.fillStyle = "rgba(255,0,255,0.85)";
                                        // context.fillRect(upperLeftX + (j * squareSize), upperLeftY + i * squareSize, squareSize, squareSize);
                                }
                                else if(nQueens.queenArray[i * nQueens.numCols + j] == 0 && attackingMoves[i * nQueens.numCols + j] > 0) {
                                    context.fillStyle = "rgba(0,255,255,0.85)";
                                    context.fillRect(upperLeftX + (j * squareSize), upperLeftY + i * squareSize, squareSize, squareSize);
                                }
                            }
                        }
                        context.restore();
                    }
                    img.src = "images/queen.png";
                }
                imgA.src = "images/queen_attacked.png";
            }

            // Calculates a value to scale the completed image by to make it fit comfortably on the image.
            // Takes the width of the canvas, height of the canvas, upper left x position, upper y position,
            // number of rows on the chessboard,number of columns on the chessboard, and the size of each square.
            // Returns the scale that should be used.
            // It can be improved by having a different size square for the legend than the 
            // board itself and reducing the space between the board and the legend dynamically.
            function calculateScale(width, height, upperLeftX, upperLeftY, numRows, numCols, squareSize) {
                var width0 = upperLeftX + numCols * squareSize + 70 + squareSize + 20 + 3 * squareSize / 2; // formula for total width of the image if no rescaling is done
                var height0 = Math.max(upperLeftY + numRows * squareSize + 5, upperLeftY + 3 * (squareSize + 10) - 5); // formula for total height of the image if no rescaling is done
                var scaleWidth = width / width0;
                var scaleHeight = height / height0;
                var scale = Math.min(scaleWidth, scaleHeight);

                return scale;
            }

            return {
                // draws everything.
                // Takes the canvas to draw to.
                // Takes string of the form "#rows #cols (space separated array 
                    // in row major order, with 0 for empty squares, and 1 for squares
                    // where a queen is located)"
                    // There is no verification that the string is of the correct form
                    // which should probably be fixed, but I'm not entirely sure how at
                    // the moment.
                    draw: function (canvas, nQueens) {
                        var context = canvas.getContext("2d");			
                        context.save();
                        var squareSize = 80;
                        var upperLeftX = 10;
                        var upperLeftY = 10;
                        var legendX = 70 + nQueens.numCols * squareSize;
                        var attackingMoves = calculateMoves(nQueens);

                        var scaleImage = calculateScale(canvas.width, canvas.height, upperLeftX, upperLeftY, nQueens.numRows, nQueens.numCols, squareSize);
                        context.save();
                        context.setTransform(1,0,0,1,0,0);
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        context.strokeRect(0, 0, canvas.width - 1, canvas.height - 1);
                        context.restore();

                        context.scale(scaleImage, scaleImage);

                        // basic representation of n queens
                        // queen on square - pink #FF00FF
                        // attacked - cyan #00FFFF
                        // queen on square && attacked - green #00FF00

                        //drawLegend(context, legendX, upperLeftY, squareSize);
                        drawLegend(scaleImage, context, legendX, upperLeftY, squareSize);
                        //context.save();
                        drawBoard(context, upperLeftX, upperLeftY, nQueens.numCols, nQueens.numRows, squareSize);
                        //context.restore();
                        //context.save();
                        //drawMoves seems to ignore scaling of context??
                        //drawMoves(context, nQueens, attackingMoves, squareSize, upperLeftX, upperLeftY);
                        drawMoves(scaleImage, context, nQueens, attackingMoves, squareSize, upperLeftX, upperLeftY);
                        //drawMoves(canvas, nQueens, attackingMoves, squareSize, upperLeftX, upperLeftY);
                        //context.restore();
                        //hacky, added by Nathan
                        //context.scale(1/scaleImage, 1/scaleImage);
                        context.restore();
                    }
            };
}());
