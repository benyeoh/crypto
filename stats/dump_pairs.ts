#!/usr/bin/env -S npx ts-node
const glob = require("glob");
const path = require("path");
const fs = require("fs");
import { program } from "commander";

import { parseTradePaths } from "./src/parser";

program.option('-i, --inputDir <path to input dir>', "Input directory path containing all coin trades");
program.option('-o, --output <path to output file>', "Output path containing all opposite trades");
program.parse()
const options = program.opts()

let allTradePaths = parseTradePaths(options.inputDir, options.inputDir);
let uniqueAddrs = {};

for (const [coinName, pathMapping] of Object.entries(allTradePaths)) {
    for (const [k, v] of Object.entries(pathMapping)) {
        for (let i = 0; i < v.pairAddrs.length; i++) {
            let exchangeID = v.pairAddrs[i][0];
            let addr = v.pairAddrs[i][1];
            if (!(exchangeID in uniqueAddrs)) {
                uniqueAddrs[exchangeID] = [];
            }

            if (!uniqueAddrs[exchangeID].includes(addr)) {
                uniqueAddrs[exchangeID].push(addr);
            }
        }
    }
}

fs.writeFileSync(path.join(options.inputDir, "used_pairs.json"), JSON.stringify(uniqueAddrs, null, 4), { encoding: 'utf8' });