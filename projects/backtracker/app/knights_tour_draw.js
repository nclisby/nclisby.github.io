btAppDraw = (function()
/*
must supply public functions:
draw: function (object)
*/
{
    // calculates the places a knight can move and returns an array with
    // 0 where it can't move and 1's where it can move
    // only includes information on the board position
    // not information about the board size or the number of moves made.
    // Takes string of the form "#steps #rows #cols (space separated array 
        // in row major order, with 0 for unvisited squares, and the visited
        // squares given a number based on which step of the walk the knight
// visited it)"
        function calculateMoves(visitArray, numVisits, numRows, numCols) {
            // not actually sure if this is the correct way to do this
            var moveArray = [];
            var i;
            for(i = 0; i < visitArray.length; i++) {
                moveArray[i] = 0;
            }

            // calculate the x and y position of the current position
            // where the top left hand coordinate is 0,0
            // x to the right is positive
            // y down is positive
            var xPos;
            var yPos;
            for(i = 0; i < visitArray.length; i++) {
                if(visitArray[i] == numVisits) {
                    xPos = i % numCols;
                    yPos = (i - xPos) / numCols;
                }
            }

            // knightMoves[2 * i] and knightMoves[2 * i + 1] is an ordered pair
            // where knightMoves[2 * i] is the move in the x direction and
            // knightMoves[2 * i + 1] is the move in the y direction.
            // coordinates defined up is neg y, left is neg x, down is pos y, right is pos x
            var knightMoves = [-2, -1, -1, -2, 1, -2, 2, -1, 2, 1, 1, 2, -1, 2, -2, 1];
            for(i = 0; i < knightMoves.length / 2; i++) {
                newX = xPos + knightMoves[2 * i];
                newY = yPos + knightMoves[2 * i + 1];
                if(newX >= 0 && newX < numCols && newY >= 0 && newY < numRows) {
                    moveArray[newY * numCols + newX] = 1;
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
                context.fillStyle = "#FF00FF";
                context.fillRect(legendX, upperLeftY, squareSize, squareSize);
                //context.fillStyle = "#00FF00";
                //context.fillRect(legendX, upperLeftY + 1 * (squareSize + 10), squareSize, squareSize);
                var posX = legendX;
                var posY = upperLeftY + squareSize + 10;
                var img = new Image();
                img.onload = function() {
                    context.save();
                    context.scale(scaleImage, scaleImage);
                    context.drawImage(img, posX, posY, squareSize, squareSize);
                    context.restore();
                }
                img.src = "images/knight.png";

                context.fillStyle = "#00FFFF";
                context.fillRect(legendX, upperLeftY + 2 * (squareSize + 10), squareSize, squareSize);
                context.fillStyle = "#000000";
                context.font="20px Arial";
                context.fillText("Visited", legendX + squareSize + 20, upperLeftY + 5 * squareSize / 8, 3 * squareSize / 2);
                context.fillText("Current", legendX + squareSize + 20, upperLeftY + 5 * squareSize / 8 + squareSize + 10, 3 * squareSize / 2);
                context.fillText("Possible", legendX + squareSize + 20, upperLeftY + 5 * squareSize / 8 + 2 * (squareSize + 10), 3 * squareSize / 2);
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
                context.strokeStyle="#FF0000";
                context.strokeRect(upperLeftX - 1, upperLeftY - 1, numCols * squareSize + 2, numRows * squareSize + 2);

                // draws black first.
                context.fillStyle="#000000";
                context.fillRect(upperLeftX, upperLeftY, numCols * squareSize, numRows * squareSize);

                // draw white sections of the board.
                // this loop actually isn't magic for once!
                // got to make sure you have a white square in the top left hand corner.
                context.fillStyle="#FFFFFF";
                var i, j;
                for(i = 0; i < numRows; i++) {
                    for(j = 0; j < numCols; j++) {
                        if((i - j) % 2 == 0) {
                            context.fillRect(upperLeftX + j * squareSize, upperLeftY + i * squareSize, squareSize, squareSize);
                        }
                    }
                }
            }

            // takes the context of the canvas, the string after splitting,
            // the array of possible moves, number of cols, number of rows,
            // size of the squares, number of steps, upper x and upper y position.
            // draws the location of the moves already made, current position
            // and possible next moves.
            // Because I'm using an alpha channel, this only supports IE9+,
            // Firefox 3+, Chrome, Safari and Opera 10+.
            function drawMoves(scaleImage, context, knightsTour, possibleMoves, squareSize, upperLeftX, upperLeftY) {
                var i, j;
                for(i = 0; i < knightsTour.numRows; i++) {
                    for(j = 0; j < knightsTour.numCols; j++) {
                        if((knightsTour.visitArray[i * knightsTour.numCols + j] != 0) && (knightsTour.visitArray[i * knightsTour.numCols + j] < knightsTour.numVisits)) {
                            context.fillStyle = "rgba(255,0,255,0.85)";
                            context.fillRect(upperLeftX + (j * squareSize), upperLeftY + i * squareSize, squareSize, squareSize);
                        }
                        else if(knightsTour.visitArray[i * knightsTour.numCols + j] == knightsTour.numVisits) {
                            //context.fillStyle = "rgba(0,255,0,0.85)";
                            //context.fillRect(upperLeftX + (j * squareSize), upperLeftY + i * squareSize, squareSize, squareSize);
                             
                            var posX = upperLeftX + j * squareSize;
                            var posY = upperLeftY + i * squareSize;
                            var img = new Image();
                            img.onload = function() {
                                context.save();
                                context.scale(scaleImage, scaleImage);
                                context.drawImage(img, posX, posY, squareSize, squareSize);
                                context.restore();
                            }
                            img.src = "images/knight.png";
                        }
                        else if(knightsTour.visitArray[i * knightsTour.numCols + j] == 0 && possibleMoves[i * knightsTour.numCols + j] == 1) {
                            context.fillStyle = "rgba(0,255,255,0.85)";
                            context.fillRect(upperLeftX + (j * squareSize), upperLeftY + i * squareSize, squareSize, squareSize);
                        }
                    }
                }
            }
			
		function drawNumbers(context, knightsTour, squareSize, upperLeftX, upperLeftY) {
                var i, j;
			context.fillStyle = "#000000";
			context.font = squareSize / 2 + "px Arial";
			context.strokeStyle = "#FFFFFF";
			for(i = 0; i < knightsTour.numRows; i++) {
				for(j = 0; j < knightsTour.numCols; j++) {
					if(knightsTour.visitArray[j + i * knightsTour.numCols] != 0) {
						context.strokeText(knightsTour.visitArray[j + i * knightsTour.numCols], upperLeftX + j * squareSize + squareSize / 4, upperLeftY + i * squareSize + 2 * squareSize / 3, squareSize / 2);
						context.fillText(knightsTour.visitArray[j + i * knightsTour.numCols], upperLeftX + j * squareSize + squareSize / 4, upperLeftY + i * squareSize + 2 * squareSize / 3, squareSize / 2);
					}
				}
			}
		}
		
		// I'm apparently inconsistent with the rest of my nested loops in this function
		// this could be done better by adding another function and just calling that with appropriate parameters
		function drawLines(context, knightsTour, squareSize, upperLeftX, upperLeftY) {
                        var i, j;
			var current = 1;
			context.strokeStyle = "#FFFFFF";
			context.lineWidth = 10;
			context.beginPath();
			while(current != knightsTour.numVisits + 1) {
				for(i = 0; i < knightsTour.numCols; i++) {
					for(j = 0; j < knightsTour.numRows; j++) {
						if(current == knightsTour.visitArray[i + j * knightsTour.numCols]) {
							if(current == 1) {
								context.moveTo(upperLeftX + i * squareSize + squareSize / 2, upperLeftY + j * squareSize + squareSize / 2);
								current++;
							}
							else {
								context.lineTo(upperLeftX + i * squareSize + squareSize / 2, upperLeftY + j * squareSize + squareSize / 2);
								current++;
							}
						}
					}
				}
			}
			context.stroke();
			
			var current = 1;
			context.strokeStyle = "#000000";
			context.lineWidth = 3;
			context.beginPath();
			while(current != knightsTour.numVisits + 1) {
				for(i = 0; i < knightsTour.numCols; i++) {
					for(j = 0; j < knightsTour.numRows; j++) {
						if(current == knightsTour.visitArray[i + j * knightsTour.numCols]) {
							if(current == 1) {
								context.moveTo(upperLeftX + i * squareSize + squareSize / 2, upperLeftY + j * squareSize + squareSize / 2);
								current++;
							}
							else {
								context.lineTo(upperLeftX + i * squareSize + squareSize / 2, upperLeftY + j * squareSize + squareSize / 2);
								current++;
							}
						}
					}
				}
			}
			context.stroke();
		}

		// Calculates a value to scale the completed image by to make it fit comfortably on the image.
		// Takes the width of the canvas, height of the canvas, upper left x position, upper y position
		// number of rows in the knights tour, number of columns in the knights tour, and the size of each square.
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
			// Takes string of the form "#steps #rows #cols (space separated array 
			// in row major order, with 0 for unvisited squares, and the visited
			// squares given a number based on which step of the walk the knight
			// visited it)"
			// There is no verification that the string is of the correct form
			// which should probably be fixed, but I'm not entirely sure how at
			// the moment.
			draw: function (canvas, knightsTour) {
				var context = canvas.getContext("2d");
                                context.save();
				var squareSize = 80;
				var upperLeftX = 10;
				var upperLeftY = 10;
				var legendX = 70 + knightsTour.numCols * squareSize;
				var possibleMoves = calculateMoves(knightsTour.visitArray, knightsTour.numVisits, knightsTour.numRows, knightsTour.numCols);
				var scaleImage = calculateScale(canvas.width, canvas.height, upperLeftX, upperLeftY, knightsTour.numRows, knightsTour.numCols, squareSize);

				// following line draws a box before scaling around the edge of the canvas.
				// Used for debugging.
				// context.strokeRect(0, 0, canvas.width - 1, canvas.height - 1);
                                context.save();
                                context.setTransform(1,0,0,1,0,0);
                                context.clearRect(0, 0, canvas.width, canvas.height);
                                context.restore();

				context.scale(scaleImage, scaleImage);

				// basic representation of knights tour
				// unvisited and unimportant in this step
				// visited - pink #FF00FF
				// current - green #00FF00
				// possible to visit - cyan #00FFFF

				//drawLegend(context, legendX, upperLeftY, squareSize);
				drawLegend(scaleImage, context, legendX, upperLeftY, squareSize);
				drawBoard(context, upperLeftX, upperLeftY, knightsTour.numCols, knightsTour.numRows, squareSize);
                                //drawMoves(context, knightsTour, possibleMoves, squareSize, upperLeftX, upperLeftY);
                                drawMoves(scaleImage, context, knightsTour, possibleMoves, squareSize, upperLeftX, upperLeftY);
				//drawMoves(canvas, knightsTour, possibleMoves, squareSize, upperLeftX, upperLeftY);
				// drawNumbers(context, knightsTour, squareSize, upperLeftX, upperLeftY);
				drawLines(context, knightsTour, squareSize, upperLeftX, upperLeftY);
                                //hacky, added by Nathan
				//context.scale(1/scaleImage, 1/scaleImage);
                                context.restore();
			}
		};
}());
