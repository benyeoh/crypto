#!/usr/bin/env -S npx ts-node
const glob = require("glob");
const path = require("path");
const fs = require("fs");
import { program } from "commander";

import { parseTradePaths, parseTradePathsFromFiles } from "./src/parser";
import { getPathStatistics, } from "./src/base_stats";
import * as filter from "./src/filter";
import { getInputOutputTokens, updateTokenState } from "./src/rountrips";

program.option('-i, --inputDirs <comma delimited path to input dir>', "Input directory paths containing all coin trades");
program.option('-o, --output <path to output file>', "Output path containing all opposite trades");
program.option('--files', "Input directory path containing all coin trades");

program.parse()
const options = program.opts()

let allTradePaths;
if (options.files) {
    allTradePaths = parseTradePathsFromFiles(options.inputDirs.split(","));
} else {
    allTradePaths = parseTradePaths(options.inputDirs.split(","), options.inputDirs.split(","));
}

let inMap = {};
let outMap = {};
let pathMap = {};

for (const [coinName, pathMapping] of Object.entries(allTradePaths)) {
    let pathStats = getPathStatistics(pathMapping);
    for (const pathStat of pathStats) {
        let inputOutput = getInputOutputTokens(pathStat[0]);
        let inputID = Object.keys(inputOutput.input).sort().join();
        let outputID = Object.keys(inputOutput.output).sort().join();
        if (!(inputID in inMap)) {
            inMap[inputID] = {};
        }
        inMap[inputID][pathStat[0]] = outputID;

        if (!(outputID in outMap)) {
            outMap[outputID] = {};
        }
        outMap[outputID][pathStat[0]] = inputID;

        pathMap[pathStat[0]] = pathStat[1];
    }
}

let oppositeCycles = {};

for (const [outputID, outPathInfo] of Object.entries(outMap)) {
    let inPathInfo = inMap[outputID];
    if (inPathInfo) {
        // For each path that outputs `outputID`
        for (const [outPath, pathInputID] of Object.entries(outPathInfo)) {
            // For each path that consumes `outputID`
            for (const [inPath, pathOutputID] of Object.entries(inPathInfo)) {
                // If the outPath also consumes the output of inPath 
                if (pathOutputID === pathInputID) {
                    let fullPathID = pathInputID + " -> " + outputID + " -> " + pathOutputID
                    // Then a direct cycle is detected
                    if (!(fullPathID in oppositeCycles)) {
                        oppositeCycles[fullPathID] = { paths1: {}, paths2: {} };
                    }

                    oppositeCycles[fullPathID]["paths1"][outPath] = {
                        uniqueOccurences: pathMap[outPath].uniqueOccurences,
                        duration: pathMap[outPath].duration.quarter,
                        optimalVol: pathMap[outPath].optimalVol.median,
                        optimalDelta: pathMap[outPath].optimalDelta.median,
                    };
                    oppositeCycles[fullPathID]["paths2"][inPath] = {
                        uniqueOccurences: pathMap[inPath].uniqueOccurences,
                        duration: pathMap[inPath].duration.quarter,
                        optimalVol: pathMap[inPath].optimalVol.median,
                        optimalDelta: pathMap[inPath].optimalDelta.median,
                    };

                    // if (!(outPath in oppositeCycles)) {
                    //     oppositeCycles[outPath] = { maxOccurences: pathMap[outPath].uniqueOccurences, paths: [] };
                    // }
                    // oppositeCycles[outPath].maxOccurences = Math.min(oppositeCycles[outPath].maxOccurences, pathMap[inPath].uniqueOccurences);
                    // oppositeCycles[outPath].paths.push(inPath);
                }
            }
        }
    }
}

const HIGH_DUR_THRESHOLD = 20.0;
const DUR_THRESHOLD = 8.0;
const AVG_DUR_THRESHOLD = 0.0;

let newOppositeCycles = {};
for (const [fullPathID, pathsSpec] of Object.entries(oppositeCycles)) {
    let numOccur1 = 0;
    let maxOccur1 = 0;
    let totalDuration1 = 0;
    let totalVolume1 = 0;
    let totalDelta1 = 0;

    let newPaths1 = {};

    for (const [path, cycleSpec] of Object.entries(pathsSpec["paths1"])) {
        if (Number(cycleSpec["duration"]) > HIGH_DUR_THRESHOLD ||
            (Number(cycleSpec["duration"]) > DUR_THRESHOLD && Number(cycleSpec["uniqueOccurences"]) > 1)) {
            maxOccur1 = Math.max(maxOccur1, Number(cycleSpec["uniqueOccurences"]));
            totalDuration1 = totalDuration1 + Number(cycleSpec["duration"]);
            totalVolume1 = totalVolume1 + Number(cycleSpec["optimalVol"]);
            totalDelta1 = totalDelta1 + Number(cycleSpec["optimalDelta"]);
            numOccur1++;

            newPaths1[path] = cycleSpec;
        }
    }

    let numOccur2 = 0;
    let maxOccur2 = 0;
    let totalDuration2 = 0;
    let totalVolume2 = 0;
    let totalDelta2 = 0;

    let newPaths2 = {};
    for (const [path, cycleSpec] of Object.entries(pathsSpec["paths2"])) {
        if (Number(cycleSpec["duration"]) > HIGH_DUR_THRESHOLD ||
            (Number(cycleSpec["duration"]) > DUR_THRESHOLD && Number(cycleSpec["uniqueOccurences"]) > 1)) {
            maxOccur2 = Math.max(maxOccur2, Number(cycleSpec["uniqueOccurences"]));
            totalDuration2 = totalDuration2 + Number(cycleSpec["duration"]);
            totalVolume2 = totalVolume2 + Number(cycleSpec["optimalVol"]);
            totalDelta2 = totalDelta2 + Number(cycleSpec["optimalDelta"]);
            numOccur2++;

            newPaths2[path] = cycleSpec;
        }
    }

    if (Object.keys(newPaths1).length > 0 && Object.keys(newPaths2).length > 0) {
        let newPathsSpec = {};

        newPathsSpec["paths1"] = newPaths1;
        newPathsSpec["paths2"] = newPaths2;

        newPathsSpec["maxOccurences1"] = maxOccur1;
        newPathsSpec["maxOccurences2"] = maxOccur2;
        newPathsSpec["avgOccurences"] = 2 * (newPathsSpec["maxOccurences2"] * newPathsSpec["maxOccurences1"]) / (newPathsSpec["maxOccurences2"] + newPathsSpec["maxOccurences1"]);

        newPathsSpec["avgDuration1"] = totalDuration1 / numOccur1;
        newPathsSpec["avgDuration2"] = totalDuration2 / numOccur2;
        newPathsSpec["avgDuration"] = 2 * (newPathsSpec["avgDuration1"] * newPathsSpec["avgDuration2"]) / (newPathsSpec["avgDuration1"] + newPathsSpec["avgDuration2"]);
        newPathsSpec["maxDuration"] = Math.max(newPathsSpec["avgDuration1"], newPathsSpec["avgDuration2"]);

        newPathsSpec["avgVolume1"] = totalVolume1 / numOccur1;
        newPathsSpec["avgVolume2"] = totalVolume2 / numOccur2;
        newPathsSpec["avgVolume"] = 2 * (newPathsSpec["avgVolume2"] * newPathsSpec["avgVolume1"]) / (newPathsSpec["avgVolume2"] + newPathsSpec["avgVolume1"]);

        newPathsSpec["avgDelta1"] = totalDelta1 / numOccur1;
        newPathsSpec["avgDelta2"] = totalDelta2 / numOccur2;
        newPathsSpec["avgDelta"] = 2 * (newPathsSpec["avgDelta2"] * newPathsSpec["avgDelta1"]) / (newPathsSpec["avgDelta2"] + newPathsSpec["avgDelta1"]);

        newOppositeCycles[fullPathID] = newPathsSpec;
    }
}

oppositeCycles = newOppositeCycles;

let flattenedCycles = [];
for (const [k, v] of Object.entries(oppositeCycles)) {
    if (v["avgDuration"] > AVG_DUR_THRESHOLD) {
        flattenedCycles.push([k, v]);
    }
}
flattenedCycles.sort((a, b) => a[1]["avgOccurences"] - b[1]["avgOccurences"]);

console.log(JSON.stringify(flattenedCycles.slice(-75), null, 4));

if (options.output) {
    console.log(`Writing to ${options.output} ...`);
    fs.writeFileSync(options.output, JSON.stringify(flattenedCycles, null, 4), "utf8");
}
