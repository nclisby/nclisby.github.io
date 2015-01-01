#include <stdio.h>
#include <stdlib.h>

int queens_attacking(int nqueens, int *queen_position)
{
    for (int i=0; i<(nqueens-1); i++)
    {
        int dx = queen_position[2*(nqueens-1)] - queen_position[2*i];
        dx = (dx < 0 ? -dx : dx);
        int dy = queen_position[2*(nqueens-1)+1] - queen_position[2*i+1];
        dy = (dy < 0 ? -dy : dy);
        if ((dx == dy) || (dx == 0) || (dy == 0))
        {
            return 1;
        }
    }
    return 0;
}

int sprintf_queens(char *out_string, int m, int n, int nqueens, int *queen_position)
{
    char *tstring = out_string; 
    int *board;
    board = (int *) malloc(m*n*sizeof(int));
    for (int i=0; i<m*n; i++)
    {
        board[i] = 0;
    }
    for (int i=0; i<nqueens; i++)
    {
        board[n*queen_position[2*i]+queen_position[2*i+1]] = (i+1);
    }
    out_string += sprintf(out_string,"{");
    out_string += sprintf(out_string,"\"numVisits\" : %d, ",nqueens);
    /*definition reversed with respect to NvM's drawing program??*/
    out_string += sprintf(out_string,"\"numRows\" : %d, ",m);
    out_string += sprintf(out_string,"\"numCols\" : %d, ",n);
    out_string += sprintf(out_string,"\"queenArray\" : [%d",board[0]);
    for (int i=1; i<m*n; i++)
    {
        out_string += sprintf(out_string,",%d",board[i]);
    }
    out_string += sprintf(out_string,"]}");
    free(board);
    return (int)(out_string-tstring);
}

int get_children(int m, int n, int npath, int *path, int nqueens, int *queen_position, char *out_string)
{
    char *tstring = out_string;
    //we are at the active node, print enclosing brace of array
    out_string += sprintf(out_string,"[");
    int xstep, ystep;
    int first = 1;
    int ichild = 0;
    queen_position[2*nqueens] = nqueens;
    for (int i=0; i<n; i++)
    {
        queen_position[2*nqueens+1] = i;
        if (!queens_attacking(nqueens+1,queen_position))
        {
                if (!first)
                    //print out a comma for correct array format
                {
                    out_string += sprintf(out_string,", ");
                }
                else
                {
                    first = 0;
                }
                //print out the object - original method
                /*out_string += sprintf_queens(out_string,m,n,nqueens+1,queen_position);*/
                //print out the label - here the label of relative
                //positioning in tree, later should be absolute label i.
                //relative label:
                /*out_string += sprintf(out_string,"%d", ichild);*/
                //absolute label:
                out_string += sprintf(out_string,"%d", i);
                ichild++;
        }
    }
    out_string += sprintf(out_string,"]");
    return (int)(out_string-tstring);
}

int queens(int mode, int m, int n, int npath, int *path, int nqueens, int *queen_position, char *out_string)
//given "path" for an n queens configuration with npath queens.  
//loop over children of current position
//
//version doesn't print
{
    char *tstring = out_string;
    if (nqueens-1 > npath)
    {
        //we are at the depth of the children, print it out
    }
    /*else if (nqueens-1 == npath) */
    else if (nqueens == npath) 
    {
        switch (mode)
        {
            case 0:
                out_string += get_children(m, n, npath, path, nqueens, queen_position, out_string);
                break;
            case 1:
                out_string += sprintf_queens(out_string,m,n,nqueens,queen_position);
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
        queen_position[2*nqueens] = nqueens;
        queen_position[2*nqueens+1] = path[nqueens];
        /*if (!queens_attacking(nqueens+1,queen_position))*/
        out_string += queens(mode, m, n, npath, path, nqueens+1, queen_position, out_string);
#else
        //added later: choose path[nqueens] *available* path
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
                if (!queen_position[n*(y+ystep)+(x+xstep)])
                {
                    ipossible++;
                }
            }
            /*if (ipossible == path[nqueens]) break;*/
            if (ipossible == path[nqueens-1]) break;
        }
        queen_position[n*(y+ystep)+(x+xstep)] = nqueens+1;
        out_string += queens(mode, m, n, npath, path, nqueens+1, x+xstep, y+ystep, queen_position, out_string);
        queen_position[n*(y+ystep)+(x+xstep)] = 0;
#endif
    }

    return (int)(out_string-tstring);
}

void bt(char *in_string, char *out_string) 
//key function for backtracker
//interface from C program to javascript world
{
    int *queen_position;
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
    /* must have m >= n */
    queen_position = (int *) malloc(2*m*sizeof(int));
    /*queen_position = (int *) calloc((m*n),sizeof(int));*/
    /*queen_position = (int *) malloc((m*n),sizeof(int));*/
    for (int i=0; i<2*m; i++)
    {
        queen_position[i] = 0;
    }
    queens(mode, m, n, npath, path, 0, queen_position, out_string);
    //must free! Garbage collector doesn't seem to pick this up.
    free(queen_position);
    free(path);
    return;
}

