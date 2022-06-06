#!/usr/bin/env -S npx ts-node
const glob = require("glob");
const path = require("path");
const fs = require("fs");
const { getPathSpec, getCoinsFromKey, getExchangeIDsFromKey } = require("./src/path_utils.js");

import { program } from "commander";

import { parseTradePaths, parseTradePathsFromFiles } from "./src/parser";
import { getPathStatistics, } from "./src/base_stats";

program.option('-i, --inputDir <path to input dirs>', "Input directory paths containing all coin trades");
program.option('-b, --blackList <path to output file>', "Output path containing all paths with short durations");
program.option('-w, --whiteList <path to output file>', "Output path containing all paths with long durations");
program.option('--files', "Input directory path containing all coin trades");

program.parse()
const options = program.opts()

let longDurPathMap = {};
let shortDurPathMap = {};

let allInputDirs = options.inputDir.split(",");

let allTradePaths;
if (options.files) {
    allTradePaths = parseTradePathsFromFiles(allInputDirs);
} else {
    allTradePaths = parseTradePaths(allInputDirs, allInputDirs);
}

for (const [coinName, pathMapping] of Object.entries(allTradePaths)) {
    let pathStats = getPathStatistics(pathMapping);
    for (const pathStat of pathStats) {
        // let inputOutput = getInputOutputTokens(pathStat[0]);
        // let inputID = Object.keys(inputOutput.input).sort().join();
        // let outputID = Object.keys(inputOutput.output).sort().join();
        let startCoin = getCoinsFromKey(pathStat[0])[0];

        if (pathStat[1].duration.median < 10.0) {
            let dur = shortDurPathMap[startCoin]?.[pathStat[0]] ? shortDurPathMap[startCoin]?.[pathStat[0]].dur : 0;
            let occur = shortDurPathMap[startCoin]?.[pathStat[0]] ? shortDurPathMap[startCoin]?.[pathStat[0]].occur : 0;
            let count = shortDurPathMap[startCoin]?.[pathStat[0]] ? shortDurPathMap[startCoin]?.[pathStat[0]].count : 0;
            let maxDur = shortDurPathMap[startCoin]?.[pathStat[0]] ? shortDurPathMap[startCoin]?.[pathStat[0]].maxDur : 0;
            if (!(startCoin in shortDurPathMap)) {
                shortDurPathMap[startCoin] = {};
            }
            shortDurPathMap[startCoin][pathStat[0]] = {
                dur: dur + pathStat[1].duration.median,
                maxDur: Math.max(maxDur, pathStat[1].duration.median),
                occur: (occur + pathStat[1].uniqueOccurences),
                count: count + 1
            }
        } else {
            let dur = longDurPathMap[startCoin]?.[pathStat[0]] ? longDurPathMap[startCoin]?.[pathStat[0]].dur : 0;
            let occur = longDurPathMap[startCoin]?.[pathStat[0]] ? longDurPathMap[startCoin]?.[pathStat[0]].occur : 0;
            let count = longDurPathMap[startCoin]?.[pathStat[0]] ? longDurPathMap[startCoin]?.[pathStat[0]].count : 0;
            let minDur = longDurPathMap[startCoin]?.[pathStat[0]] ? longDurPathMap[startCoin]?.[pathStat[0]].minDur : 999999999999;
            if (!(startCoin in longDurPathMap)) {
                longDurPathMap[startCoin] = {};
            }
            longDurPathMap[startCoin][pathStat[0]] = {
                dur: dur + pathStat[1].duration.median,
                minDur: Math.min(minDur, pathStat[1].duration.median),
                occur: (occur + pathStat[1].uniqueOccurences),
                count: count + 1
            }
        }
    }
}

for (const [coin, map] of Object.entries(shortDurPathMap)) {
    for (const [path, entry] of Object.entries(map)) {
        entry.dur = entry.dur / entry.count;
        entry.occur = entry.occur / entry.count;
    }
}

for (const [coin, map] of Object.entries(longDurPathMap)) {
    for (const [path, entry] of Object.entries(map)) {
        entry.dur = entry.dur / entry.count;
        entry.occur = entry.occur / entry.count;
    }
}

let intersect = {};
for (const [coin, map] of Object.entries(shortDurPathMap)) {
    for (const [path, shortDur] of Object.entries(map)) {
        if (coin in longDurPathMap && path in longDurPathMap[coin]) {
            if (!(coin in intersect)) {
                intersect[coin] = {};
            }

            intersect[coin][path] = {
                shortDur: shortDur.maxDur,
                shortOccur: shortDur.occur,
                longDur: longDurPathMap[coin][path].minDur,
                longOccur: longDurPathMap[coin][path].occur,
            };

            //[shortDur[0], shortDur[1], longDurPathMap[coin][path][0], longDurPathMap[coin][path][1]];
        }
    }
}

let greyList = {};
for (const [coin, map] of Object.entries(intersect)) {
    greyList[coin] = {};

    for (const [path, prop] of Object.entries(map)) {
        const THRESHOLD = 18.0;
        if (prop.longDur - prop.shortDur > THRESHOLD) {
            greyList[coin][path] = prop;
            greyList[coin][path]["threshold"] = THRESHOLD;
            delete shortDurPathMap[coin][path];
        }
        // if ((prop[1] < prop[3]) || (prop[0] < 2.0 && prop[2] > 15.0)) {
        //     removed[path] = prop;
        //     delete shortDurPathMap[coin][path];
        // }
    }
}

console.log("Greylist:");
console.log(JSON.stringify(greyList, null, 4));

let total = 0;
for (const [coin, map] of Object.entries(shortDurPathMap)) {
    total += Object.keys(map).length;
}

if (options.blackList) {
    console.log(`Writing to ${options.blackList} entries ${total} ...`);
    fs.writeFileSync(options.blackList,
        JSON.stringify({
            blackList: shortDurPathMap,
            greyList: greyList
        }, null, 4), "utf8");
}

total = 0;
for (const [coin, map] of Object.entries(longDurPathMap)) {
    total += Object.keys(map).length;
}

if (options.whiteList) {
    console.log(`Writing to ${options.whiteList} entries ${total} ...`);
    fs.writeFileSync(options.whiteList, JSON.stringify(longDurPathMap, null, 4), "utf8");
}