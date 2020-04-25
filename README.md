# THIS IS A TESTING REPO, THE REAL SOFTWARE WILL BE IMPLEMENTED IN ARTOOLKIT!

This repo is ready to use, it already has a testing marker and the wasm compiled.
## How to use with node

#### - Put the marker in the 'inputMarker' folder.

#### - Run `npm run comp` to compress. 

This will generate a file "compressedMarkers.zft" in the project folder.

#### - Run `npm run decomp` to decompress.

This will decompress the markers to the output folder.

#### - Run `npm run build` to build the index.c code.

You will need to setup the Emscripten environment first!!!

## How to use with browser

1- Open index.html in a local server

2- drop files where indicated.

PS: .zft and .iset/fset/fset3 will be downloaded automatically.