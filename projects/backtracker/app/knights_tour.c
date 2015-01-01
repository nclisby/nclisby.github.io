#include <stdio.h>
#include <stdlib.h>

int sprintf_knight(char *out_string, int m, int n, int nvisits, int *board)
{
    char *tstring = out_string; 
    out_string += sprintf(out_string,"{");
    out_string += sprintf(out_string,"\"numVisits\" : %d, ",nvisits);
    out_string += sprintf(out_string,"\"numRows\" : %d, ",m);
    out_string += sprintf(out_string,"\"numCols\" : %d, ",n);
    out_string += sprintf(out_string,"\"visitArray\" : [%d",board[0]);
    for (int i=1; i<m*n; i++)
    {
        out_string += sprintf(out_string,",%d",board[i]);
    }
    out_string += sprintf(out_string,"]}");
    return (int)(out_string-tstring);
}

int get_children(int m, int n, int npath, int *path, int nvisits, int x, int y, int *board, char *out_string)
{
    char *tstring = out_string;
    //we are at the active node, print enclosing brace of array
    out_string += sprintf(out_string,"[");
    int xstep, ystep;
    int first = 1;
    int ichild = 0;
    for (int i=0; i<8; i++)
    {
        switch (i)
        {
            case 0:
                xstep=1; ystep=2;
                break;
            case 1:
                xstep=2; ystep=1;
                break;
            case 2:
                xstep=-1; ystep=2;
                break;
            case 3:
                xstep=-2; ystep=1;
                break;
            case 4:
                xstep=1; ystep=-2;
                break;
            case 5:
                xstep=2; ystep=-1;
                break;
            case 6:
                xstep=-1; ystep=-2;
                break;
            case 7:
                xstep=-2; ystep=-1;
                break;
            default:
                //should never happen
                exit(1);
                break;
        }
        if ((x+xstep>=0)&&(x+xstep<n)&&(y+ystep>=0)&&(y+ystep<m))
        {
            if (!board[n*(y+ystep)+(x+xstep)])
            {
                board[n*(y+ystep)+(x+xstep)] = nvisits+1;
                if (!first)
                    //print out a comma for correct array format
                {
                    out_string += sprintf(out_string,", ");
                }
                else
                {
                    first = 0;
                }
                /*out_string += knights_tour(m, n, npath, path, nvisits+1, x+xstep, y+ystep, board, out_string);*/
                //print out the object - original method
                /*out_string += sprintf_knight(out_string,m,n,nvisits+1,board);*/
                //print out the label - here the label of relative
                //positioning in tree, later should be absolute label i.
                //relative label:
                /*out_string += sprintf(out_string,"%d", ichild);*/
                //absolute label:
                out_string += sprintf(out_string,"%d", i);
                board[n*(y+ystep)+(x+xstep)] = 0;
                ichild++;
            }
        }
    }
    out_string += sprintf(out_string,"]");
    return (int)(out_string-tstring);
}

int knights_tour(int mode, int m, int n, int npath, int *path, int nvisits, int x, int y, int *board, char *out_string)
//given "path" for a knight's tour which has visited "npath" squares.  
//loop over children of current position
//
//version doesn't print
{
    char *tstring = out_string;
    if (nvisits-1 > npath)
    {
        //we are at the depth of the children, print it out
    }
    else if (nvisits-1 == npath) 
    {
        switch (mode)
        {
            case 0:
                out_string += get_children(m, n, npath, path, nvisits, x, y, board, out_string);
                break;
            case 1:
                out_string += sprintf_knight(out_string,m,n,nvisits,board);
                break;
            case 2:
                break;
            default:
                break;
        }
    }
    else
    {
        //we have yet to reach the active node, choose the
        //prescribed path. Note that there is no loop now.
        int xstep, ystep;
#if 1
        //this defines path in terms of possible steps
        switch (path[nvisits-1])
        {
            case 0:
                xstep=1; ystep=2;
                break;
            case 1:
                xstep=2; ystep=1;
                break;
            case 2:
                xstep=-1; ystep=2;
                break;
            case 3:
                xstep=-2; ystep=1;
                break;
            case 4:
                xstep=1; ystep=-2;
                break;
            case 5:
                xstep=2; ystep=-1;
                break;
            case 6:
                xstep=-1; ystep=-2;
                break;
            case 7:
                xstep=-2; ystep=-1;
                break;
            default:
                //should never happen
                exit(1);
                break;
        }
        //arguably following tests are not necessary - in principle
        //we are always given a path to a reachable node in the
        //tree.
        /*if ((x+xstep>=0)&&(x+xstep<n)&&(y+ystep>=0)&&(y+ystep<m))*/
        /*{*/
            /*if (!board[n*(y+ystep)+(x+xstep)])*/
            /*{*/
                board[n*(y+ystep)+(x+xstep)] = nvisits+1;
                out_string += knights_tour(mode, m, n, npath, path, nvisits+1, x+xstep, y+ystep, board, out_string);
                board[n*(y+ystep)+(x+xstep)] = 0;
            /*}*/
        /*}*/
#else
        //added later: choose path[nvisits] *available* path
        //this defines path in terms of available steps
        int ipossible = -1;
        for (int i=0; i<8; i++)
        {
            switch (i)
            {
                case 0:
                    xstep=1; ystep=2;
                    break;
                case 1:
                    xstep=2; ystep=1;
                    break;
                case 2:
                    xstep=-1; ystep=2;
                    break;
                case 3:
                    xstep=-2; ystep=1;
                    break;
                case 4:
                    xstep=1; ystep=-2;
                    break;
                case 5:
                    xstep=2; ystep=-1;
                    break;
                case 6:
                    xstep=-1; ystep=-2;
                    break;
                case 7:
                    xstep=-2; ystep=-1;
                    break;
                default:
                    //should never happen
                    exit(1);
                    break;
            }
            if ((x+xstep>=0)&&(x+xstep<n)&&(y+ystep>=0)&&(y+ystep<m))
            {
                if (!board[n*(y+ystep)+(x+xstep)])
                {
                    ipossible++;
                }
            }
            /*if (ipossible == path[nvisits]) break;*/
            if (ipossible == path[nvisits-1]) break;
        }
        board[n*(y+ystep)+(x+xstep)] = nvisits+1;
        out_string += knights_tour(mode, m, n, npath, path, nvisits+1, x+xstep, y+ystep, board, out_string);
        board[n*(y+ystep)+(x+xstep)] = 0;
#endif
    }

    return (int)(out_string-tstring);
}

void bt(char *in_string, char *out_string) 
//key function for backtracker
//interface from C program to javascript world
{
    int *board;
    int npath;
    int *path;
    int nchar;
    int mode;
    int m, n, max_depth;
    int iout = 0;
    //in future, use getopt for optional arguments
    sscanf(in_string,"%d %d %d %d%n",&mode,&m,&n,&npath,&nchar);
    in_string += nchar;
    /*path = (int *) malloc(m*n*sizeof(int));*/
    path = (int *) malloc(npath*sizeof(int));
    for (int i=0; i<npath; i++)
    {
        sscanf(in_string,"%d%n",&path[i],&nchar);
        in_string += nchar;
    }
    board = (int *) malloc(m*n*sizeof(int));
    /*board = (int *) calloc((m*n),sizeof(int));*/
    /*board = (int *) malloc((m*n),sizeof(int));*/
    for (int i=0; i<m*n; i++)
    {
        board[i] = 0;
    }
    board[0] = 1;
    knights_tour(mode, m, n, npath, path, 1, 0, 0, board, out_string);
    board[0] = 0;
    //must free! Garbage collector doesn't seem to pick this up.
    free(board);
    free(path);
    return;
}

