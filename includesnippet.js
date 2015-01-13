var n = 17;
var rand=Math.random();
var i = Math.floor(n*rand);
var filename; 
//i = 16;
if (i < 10)
{
filename = "/snippets/snippet000"+i.toString(10)+".js";
}
else if (i < 100)
{
filename = "/snippets/snippet00"+i.toString(10)+".js";
}
else if (i < 1000)
{
filename = "/snippets/snippet0"+i.toString(10)+".js";
}
else if (i < 1000)
{
filename = "/snippets/snippet"+i.toString(10)+".js";
}
var snippetScript= "<script src="+filename+"></script>";
document.write(snippetScript);

