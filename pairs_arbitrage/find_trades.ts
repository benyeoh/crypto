#!/usr/bin/env -S npx ts-node
const fs = require("fs");
//const bignumber = require("bignumber.js");
const glob = require("glob");

import { program } from "commander";
import * as cpmm from "./src/cpmm";
import * as graph from "./src/graph";
import * as traverse from "./src/traverse";

program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.")
program.parse()
const options = program.opts()

const allPairFiles = glob.sync(options.pairs);
console.log(allPairFiles);

const pairsGraph = new graph.Graph();
const traverser = new traverse.BFSCycleTraverser();

for (let i = 0; i < allPairFiles.length; i++) {
    let pairs = JSON.parse(fs.readFileSync(allPairFiles[i], "utf8")); 
    graph.updateGraphFromPairs(pairs, pairsGraph);    
}

traverser.traverse(pairsGraph, "USDC");
console.log(JSON.stringify(traverser.paths, null, 4));

// for (let i = 0; i < traverser.paths.length; i++) {

// }
