#!/usr/bin/env -S npx ts-node
const glob = require("glob");
const path = require("path");
const fs = require("fs");
import { program } from "commander";

import { parseTradePaths } from "./src/parser";
import { getPathStatistics, getSorter, getSorter2, getFilterByKey } from "./src/base_stats";
import { plotBar2, plotBar } from "./src/present";

program.option('-i, --inputDir <path to input dir>', "Input directory path containing all coin trades");
program.parse()
const options = program.opts()

let allTradePaths = parseTradePaths(options.inputDir, options.inputDir);
for (const [coinName, pathMapping] of Object.entries(allTradePaths)) {
    let pathStats = getPathStatistics(pathMapping);
    //pathStats.sort(getSorter2("volPerDelta", "median", true));
    //pathStats = pathStats.filter(getFilterByKey([".*", ".*", ".*"], [".*", ".*"]));
    // pathStats = pathStats.filter(getFilterByKey([], [".*\(Arbitrum\)", ".*\(Arbitrum\)"])).concat(
    //     pathStats.filter(getFilterByKey([], [".*\(Polygon\)", ".*\(Polygon\)"]))
    // ).concat(
    //     pathStats.filter(getFilterByKey([], [".*\(Fantom\)", ".*\(Fantom\)"]))
    // );

    // pathStats = pathStats.filter(getFilterByKey([], ["^((?!Gemini).)*$", "^((?!Gemini).)*$"])).concat(
    //     pathStats.filter(getFilterByKey([], ["^((?!Gemini).)*$", "^((?!Gemini).)*$", "^((?!Gemini).)*$"]))
    // )

    if (pathStats.length > 0) {
        pathStats.sort(getSorter("uniqueOccurences"));

        plotBar(pathStats.slice(0, 50), "uniqueOccurences");
        plotBar2(pathStats.slice(0, 50), ["duration", "duration", "duration"], ["mean", "median", "stdDev"]);
        plotBar2(pathStats.slice(0, 50), ["volPerDelta", "optimalDelta"], ["median", "median"]);
    } else {
        console.log(`Skipping ${coinName} ...`);
    }

}