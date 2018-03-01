# TSUML
This simple tool creates a UML diagram from typescript modules. The idea started from [tsviz](https://github.com/joaompneves/tsviz) and was adapted to get an overall view of dependencies and coupling in a typescript project. 

## Installation

You need to install [GraphViz](http://www.graphviz.org/download/), including correctly added it to your PATH.

## Usage
```
tsuml <switches> <sources filename/directory> <output.png>

Available switches:
  -d, dependencies: produces the modules dependencies diagram
  -r, recursive: include files in subdirectories (must be non-cyclic)
  -c, coupling: print classes with a high coupling in different colors (orange for warnings and red for problems).
```

In order to create a diagram for an entire project you simply type:

```bash
tsuml <projectPath> diagram.png
```
