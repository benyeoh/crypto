#!/usr/bin/env -S npx ts-node
const glob = require("glob");
const path = require("path");
const fs = require("fs");
const { getCoinsFromKey } = require("./src/path_utils.js");

import { program } from "commander";
import { assert } from "console";

program.option('-i, --input <path to input file>', "Input path containing opposite trades trades");
program.option('-o, --output <path to output file>', "Output whitelist path.");

program.parse()
const options = program.opts()

const DUR_THRESHOLD = 0.0;

let whiteList = {};
let oppositeCycles = JSON.parse(fs.readFileSync(options.input, { encoding: "utf8", flag: "r" }));
for (let i = 0; i < oppositeCycles.length; i++) {
    let [cycleKey, cycleSpec] = oppositeCycles[i];
    let path1 = [];
    let path2 = [];
    for (const [pathKey, pathSpec] of Object.entries(cycleSpec["paths1"])) {
        if (pathSpec["duration"] > DUR_THRESHOLD) {
            path1.push({ pathKey, pathSpec });
        }
    }

    for (const [pathKey, pathSpec] of Object.entries(cycleSpec["paths2"])) {
        if (pathSpec["duration"] > DUR_THRESHOLD) {
            path2.push({ pathKey, pathSpec });
        }
    }

    if (path1.length > 0 && path2.length > 0) {
        for (let j = 0; j < path1.length; j++) {
            let path = path1[j];
            let coin = getCoinsFromKey(path.pathKey)[0];

            if (!(coin in whiteList)) {
                whiteList[coin] = {};
            }
            if (path.pathKey in whiteList[coin]) {
                assert(whiteList[coin][path.pathKey].duration > DUR_THRESHOLD);
            }

            whiteList[coin][path.pathKey] = path.pathSpec;
        }

        for (let j = 0; j < path2.length; j++) {
            let path = path2[j];
            let coin = getCoinsFromKey(path.pathKey)[0];

            if (!(coin in whiteList)) {
                whiteList[coin] = {};
            }
            if (path.pathKey in whiteList[coin]) {
                assert(whiteList[coin][path.pathKey].duration > DUR_THRESHOLD);
            }

            whiteList[coin][path.pathKey] = path.pathSpec;
        }
    }
}

let total = 0;
for (const [coin, map] of Object.entries(whiteList)) {
    total += Object.keys(map).length;
}

if (options.output) {
    console.log(`Writing to ${options.output} entries ${total} ...`);
    fs.writeFileSync(options.output, JSON.stringify(whiteList, null, 4), "utf8");
}