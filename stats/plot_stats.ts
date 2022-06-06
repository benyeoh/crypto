#!/usr/bin/env -S npx ts-node
const glob = require("glob");
const path = require("path");
const fs = require("fs");
import { program } from "commander";

import { parseTradePaths, parseTradePathsFromFiles } from "./src/parser";
import { getPathStatistics, } from "./src/base_stats";
import * as filter from "./src/filter";
import { plotBar2, plotBar, flushPlots } from "./src/present";

program.option('-i, --inputDir <path to input dir>', "Input directory path containing all coin trades");
program.option('--files', "Input directory path containing all coin trades");

program.parse()
const options = program.opts()

let allTradePaths;
if (options.files) {
    allTradePaths = parseTradePathsFromFiles(options.inputDir);
} else {
    allTradePaths = parseTradePaths(options.inputDir, options.inputDir);
}

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

    //pathStats = pathStats.filter(getFilterByRegex(".*", "^((?!Gemini).)*$"));
    //pathStats = pathStats.filter(getFilterByRegex(/.*/, /^(?:[^\(\)]+?\((.+?)\))(?:,\s*[^\(\)]+?\(\1\))+$/)); // Check from same network
    //pathStats = pathStats.filter(getFilterByRegex(/.*/, /^(?:((?!Gemini)[^,])+,\s*((?!Gemini)[^,])+)$/)); // Check from same network

    //pathStats = pathStats.filter(filter.getFilterByKeyStartEnd([".*", ".*"], ([".*\(fantom\)", ".*\(arbitrum\)"]), true));

    if (pathStats.length > 0) {

        pathStats.sort(filter.getSorter("uniqueOccurences"));

        plotBar(pathStats.slice(0, 100), "uniqueOccurences");
        plotBar2(pathStats.slice(0, 100), ["duration", "duration"], ["mean", "median"]);
        plotBar2(pathStats.slice(0, 100), ["volPerDelta", "optimalDelta"], ["median", "median"]);
        flushPlots();
    } else {
        console.log(`Skipping ${coinName} ...`);
    }

}