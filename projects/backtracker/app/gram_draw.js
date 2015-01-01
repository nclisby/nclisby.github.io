btAppDraw = (function()
/*
must supply public functions:
draw: function (object)
*/
{
    // takes the context of the canvas drawing to, the
    // x coordinate for where the legend starts, the y
    // coordinate where the legend starts (the same as
// the base) and the size of the squares.
        function drawLegend(context, legendX, upperLeftY, squareSize) {
            // draw a legend off to the right.
            // this feels really hacky.
            context.lineWidth="2";
            context.strokeStyle="#000000";
            context.strokeRect(legendX - 1, upperLeftY - 1, squareSize + 2, squareSize + 2);
            context.strokeRect(legendX - 1, upperLeftY - 1 + squareSize + 10, squareSize + 2, squareSize + 2);
            context.fillStyle = "#FF00FF";
            context.fillRect(legendX, upperLeftY, squareSize, squareSize);
            context.fillStyle = "#00FFFF";
            context.fillRect(legendX, upperLeftY + squareSize + 10, squareSize, squareSize);
            context.fillStyle = "#000000";
            context.font="30px Arial";
            context.fillText("1", legendX + squareSize + 20, upperLeftY + 5 * squareSize / 8, 20);
            context.fillText("-1", legendX + squareSize + 20, upperLeftY + 5 * squareSize / 8 + squareSize + 10, 30);
        }

        function drawBase(context, upperLeftX, upperLeftY, hadamard, squareSize) {
            context.strokeStyle="#FF0000";
            context.strokeRect(upperLeftX - 1, upperLeftY - 1, hadamard.numCols * squareSize + 2, hadamard.numRows * squareSize + 2);
        }

        function drawMatrix(context, hadamard, squareSize, upperLeftX, upperLeftY) {
            for(i = 0; i < hadamard.numRows; i++) {
                for(j = 0; j < hadamard.numCols; j++) {					
                    if(hadamard.entries[i * hadamard.numCols + j] == 1) {
                        context.fillStyle = "rgba(0, 255, 255, 0.85)";
                        context.fillRect(upperLeftX + (j * squareSize), upperLeftY + i * squareSize, squareSize, squareSize);
                    }
                    else {
                        context.fillStyle = "rgba(255,0,255,0.85)";
                        context.fillRect(upperLeftX + (j * squareSize), upperLeftY + i * squareSize, squareSize, squareSize);
                    }
                }
            }
        }

        // Calculates a value to scale the completed image by to make it fit comfortably on the image.
        // Takes the width of the canvas, height of the canvas, upper left x position, upper y position, 
        // upper number of rows in matrix, number of columns in the matrix, and the size of each square.
        // Returns the scale that should be used.
        // It can be improved by having a different size square for the legend than the 
        // board itself and reducing the space between the board and the legend dynamically.
        function calculateScale(width, height, upperLeftX, upperLeftY, numRows, numCols, squareSize) {
            var width0 = upperLeftX + numCols * squareSize + 70 + squareSize + 20 + 20; // formula for total width of the image if no rescaling is done
            var height0 = Math.max(upperLeftY + numRows * squareSize + 5, upperLeftY + 2 * (squareSize + 10) - 5); // formula for total height of the image if no rescaling is done
            var scaleWidth = width / width0;
            var scaleHeight = height / height0;
            var scale = Math.min(scaleWidth, scaleHeight);

            return scale;
        }

        return {
            // draws everything.
            // Takes the canvas to draw to.
            // Takes string of the form "#rows #cols (space separated array 
// in row major order, with 0 for a 1, and 1 for a -1)"
                // There is no verification that the string is of the correct form
                // which should probably be fixed, but I'm not entirely sure how at
                // the moment.
                draw: function (canvas, hadamard) {
                    var context = canvas.getContext("2d");
                    context.save();
                    var squareSize = 80;
                    var upperLeftX = 10;
                    var upperLeftY = 10;
                    var legendX = 70 + hadamard.numCols * squareSize;
                    var scaleImage = calculateScale(canvas.width, canvas.height, upperLeftX, upperLeftY, hadamard.numRows, hadamard.numCols, squareSize);

                    context.save();
                    context.setTransform(1,0,0,1,0,0);
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    context.restore();
                    context.scale(scaleImage, scaleImage);

                    // basic representation of a Hadamard matrix
                    // 0 (actually a 1) - pink #FF00FF
                    // 1 (actually a -1) - cyan #00FFFF

                    drawLegend(context, legendX, upperLeftY, squareSize);
                    drawBase(context, upperLeftX, upperLeftY, hadamard, squareSize);
                    drawMatrix(context, hadamard, squareSize, upperLeftX, upperLeftY);
                    //hacky, added by Nathan
                    //context.scale(1/scaleImage, 1/scaleImage);
                    context.restore();
                }
        };
}());
