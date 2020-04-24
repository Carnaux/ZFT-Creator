/*
 * Simple script for running emcc on ARToolKit
 * @author zz85 github.com/zz85
 */

var
	exec = require('child_process').exec,
	path = require('path'),
	fs = require('fs'),
	child;

var HAVE_NFT = 1;

var EMSCRIPTEN_ROOT = process.env.EMSCRIPTEN;


if (!EMSCRIPTEN_ROOT) {
	console.log("\nWarning: EMSCRIPTEN environment variable not found.")
	console.log("If you get a \"command not found\" error,\ndo `source <path to emsdk>/emsdk_env.sh` and try again.");
}

var EMCC = EMSCRIPTEN_ROOT ? path.resolve(EMSCRIPTEN_ROOT, 'emcc') : 'emcc';
var EMPP = EMSCRIPTEN_ROOT ? path.resolve(EMSCRIPTEN_ROOT, 'em++') : 'em++';
var OPTIMIZE_FLAGS = ' -Oz '; // -Oz for smallest size
var MEM = (256 *1024 * 1024) ; // 64MB

var BUILD_MIN_FILE = 'genZip.min.js';
var BUILD_WASM_FILE = 'genZip_wasm.js';

var SOURCE_PATH = path.resolve(__dirname, '../') + '/';
var OUTPUT_PATH = path.resolve(__dirname, '../build/') + '/';

var MAIN_SOURCES = [
	'index.c',
];

MAIN_SOURCES = MAIN_SOURCES.map(function(src) {
	return path.resolve(SOURCE_PATH, src);
}).join(' ');


var minzipSources = [
    'ioapi.c',
    'iowin32.c',
    "miniunz.c",
    "minizip.c",
    "mztools.c",
    "unzip.c",
    "zip.c"
].map(function(src) {
	return path.resolve(__dirname, '../libs/minzip/', src);
});

var FLAGS = '' + OPTIMIZE_FLAGS;
// var FLAGS = '';
FLAGS += ' -Wno-warn-absolute-paths ';
FLAGS += ' -s TOTAL_MEMORY=' + MEM + ' ';
FLAGS += ' -s ALLOW_MEMORY_GROWTH=1 ';
FLAGS += ' -s ASSERTIONS=1 ';
FLAGS += ' --memory-init-file 0 '; // for memless file
FLAGS += ' -s FORCE_FILESYSTEM=1 ';
FLAGS += ' -s USE_ZLIB=1 ';

var PRE_FLAGS = ' --pre-js ' + path.resolve(__dirname, './wasm_loader.js') + ' ';

var EXPORTED_FUNCTIONS = ' -s EXPORTED_FUNCTIONS=["_compressZip, _decompressZip"] -s EXTRA_EXPORTED_RUNTIME_METHODS=["FS, cwrap, writeStringToMemory"] ';

/* DEBUG FLAGS */
var DEBUG_FLAGS = ' -g ';
// DEBUG_FLAGS += ' -s ASSERTIONS=2 '
DEBUG_FLAGS += ' -s ASSERTIONS=1 '
DEBUG_FLAGS += ' --profiling '
// DEBUG_FLAGS += ' -s EMTERPRETIFY_ADVISE=1 '
DEBUG_FLAGS += ' -s ALLOW_MEMORY_GROWTH=1';
DEBUG_FLAGS += '  -s DEMANGLE_SUPPORT=1 ';

var INCLUDES = [
	path.resolve(__dirname, '/libs/minizip'),
	path.resolve(__dirname, '/libs/zlib'),
	SOURCE_PATH,
].map(function(s) { return '-I' + s }).join(' ');

function format(str) {
	for (var f = 1; f < arguments.length; f++) {
		str = str.replace(/{\w*}/, arguments[f]);
	}
	return str;
}

function clean_builds() {
	try {
		var stats = fs.statSync(OUTPUT_PATH);
	} catch (e) {
		fs.mkdirSync(OUTPUT_PATH);
	}

	try {
		var files = fs.readdirSync(OUTPUT_PATH);
		if (files.length > 0)
		for (var i = 0; i < files.length; i++) {
			var filePath = OUTPUT_PATH + '/' + files[i];
			if (fs.statSync(filePath).isFile())
				fs.unlinkSync(filePath);
		}
	}
	catch(e) { return console.log(e); }
}

var compile_min = format(EMCC + ' ' + MAIN_SOURCES + ' ' + INCLUDES 
    + ' ' + EXPORTED_FUNCTIONS + FLAGS 
    + ' -s WASM=0' +  ' -o {OUTPUT_PATH}{BUILD_MIN_FILE}', 
    OUTPUT_PATH, BUILD_MIN_FILE);

var compile_wasm = format(EMCC + ' ' + INCLUDES + ' '
	+ MAIN_SOURCES + EXPORTED_FUNCTIONS
	+ FLAGS + PRE_FLAGS + ' -o {OUTPUT_PATH}{BUILD_FILE} ',
	OUTPUT_PATH, BUILD_WASM_FILE);
/*
 * Run commands
 */

function onExec(error, stdout, stderr) {
	if (stdout) console.log('stdout: ' + stdout);
	if (stderr) console.log('stderr: ' + stderr);
	if (error !== null) {
		console.log('exec error: ' + error.code);
		process.exit(error.code);
	} else {
		runJob();
	}
}

function runJob() {
	if (!jobs.length) {
		console.log('Jobs completed');
		return;
	}
	var cmd = jobs.shift();

	if (typeof cmd === 'function') {
		cmd();
		runJob();
		return;
	}

	console.log('\nRunning command: ' + cmd + '\n');
	exec(cmd, onExec);
}

var jobs = [];

function addJob(job) {
	jobs.push(job);
}

addJob(clean_builds);

addJob(compile_min);
addJob(compile_wasm);

runJob();
