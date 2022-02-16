#!/usr/bin/env bash
for i in *.jpg
do
    i2=${i%.jpg}_small.jpg
    echo "<figure>"
    echo "<a href=\"./$i\">"
    echo "<img src=\"./$i2\" alt=\"Photo from Brakfest\" width=\"100%\" style=\"min-width:200px;margin: 10px 10px 10px 10px\" />"
    echo "</a>"
    echo "<figcaption>"
    echo "</figcaption>"
    echo "</figure>"
    echo 
done

for i in *.png
do
    i2=${i%.png}_small.png
    echo "<figure>"
    echo "<a href=\"./$i\">"
    echo "<img src=\"./$i2\" alt=\"Photo from Brakfest\" width=\"100%\" style=\"min-width:200px;margin: 10px 10px 10px 10px\" />"
    echo "</a>"
    echo "<figcaption>"
    echo "</figcaption>"
    echo "</figure>"
    echo 
done

