btAppSearch = (function()
/*
must supply public functions:
setupCase: function ()
maxPathLength: function ()
getChildren: function (path)
getObject: function (path)
*/
{
    //list private methods here
    //board is m x n
    //must have m <= n
    //var m=12;
    //var n=12;
    var inputFile = "t13.txt";
    var maxLength = 13;
    var inBuffer = Module._malloc(10001);
    var outBuffer = Module._malloc(10001);
    //return public methods here
    return {
        setupCase: function ()
            {
                inputFile = document.getElementById("bt_case").value;
                maxLength = parseInt(inputFile.replace('.txt','').replace('t',''));
                return;
            },
            maxPathLength: function ()
            {
                //return gTreeView.size[gTreeView.inputCase] - 1;
                //return caseSize[gTreeView.inputCase] - 1;
                //return m*n - 1;
                //should be n for Gram matrix with n rows?
                return maxLength;
                //n = 19
                //return 19;
            },

            //this is the key backtracking function, here implemented using input
            //tree
            //returns an array of combinatorial objects representing the children
            getChildren: function (path)
            {
                var mode = 0;
                var inString;
                //alert("path = "+path.toString());
                if (path === null)
                {
                //inString = mode.toString()+" "+m.toString()+" "+n.toString()+" 0";
                inString = inputFile+" "+mode.toString()+" 0";
                }
                else
                {
                //inString = mode.toString()+" "+m.toString()+" "+n.toString()+" "+path.length.toString()+" "+path.toString();
                inString = inputFile+" "+mode.toString()+" "+path.length.toString()+" "+path.toString();
                }
                inString = inString.split(',').join(' ');
                //alert(inString);
                Module.writeStringToMemory(inString,inBuffer);
                Module._bt(inBuffer,outBuffer);
                //var childrenArray = JSON.parse(testString);
                var outString = Pointer_stringify(outBuffer);
                return JSON.parse(outString);
            },

            getObject: function (path)
            {
                var mode = 1;
                var inString;
                //alert("path = "+path.toString());
                if (path === null)
                {
                //inString = mode.toString()+" "+m.toString()+" "+n.toString()+" 0";
                inString = inputFile+" "+mode.toString()+" 0";
                }
                else
                {
                //inString = mode.toString()+" "+m.toString()+" "+n.toString()+" "+path.length.toString()+" "+path.toString();
                inString = inputFile+" "+mode.toString()+" "+path.length.toString()+" "+path.toString();
                }
                inString = inString.split(',').join(' ');
                //alert(inString);
                Module.writeStringToMemory(inString,inBuffer);
                Module._bt(inBuffer,outBuffer);
                //var childrenArray = JSON.parse(testString);
                var outString = Pointer_stringify(outBuffer);
                return JSON.parse(outString);
            }
    };
}());
