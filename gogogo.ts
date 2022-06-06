#!/usr/bin/env -S npx ts-node
const fs = require("fs");
const HJSON = require("hjson");

import { program } from "commander";
import { Monitor, getSaveToFileCB } from "./scanner";
import { Executor } from "./trader";

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-c, --coins <path to json>', "Input path to coin spec json.", __dirname + "/coins.hjson");
    program.option('-f, --fetchSpec <path to json>', "Input path to a fetch spec json.", __dirname + "/pairs_fetcher/fetch_spec.hjson");
    program.option('-s, --scanSpec <path to json>', "Input path to a scan spec json.", __dirname + "/scan_spec.hjson");
    program.option('-e, --execSpec <path to json>', "Input path to an exec spec json.", __dirname + "/exec_spec.hjson");
    program.option('-l, --execLog <path to dir>, "Input dir for execution logs.', null);
    program.option('-k, --key <string>', "Private key of trading account");
    program.option('-a, --filterAddrs <comma sep path to jsons>', "Input comma separated paths to json containing addresses to filter.", null);
    program.option('-o, --outputDir <dir>', "Output path saved trades json.", null);
    program.option('--blackOrWhiteList <path to json>', "Input path to black listed trade paths json.");
    program.option('--minCrossSwaps <int>', "Minimum number of cross swaps for trade.", "2");
    program.option('--scanTime <int>', "Scan polling rate in ms.", "1000");
    program.parse()
    const options = program.opts()

    let coins = HJSON.parse(fs.readFileSync(options.coins, "utf8"));
    let scanSpec = HJSON.parse(fs.readFileSync(options.scanSpec, "utf8"));
    let fetchSpec = HJSON.parse(fs.readFileSync(options.fetchSpec, "utf8"));

    let execSpec;
    try {
        execSpec = HJSON.parse(fs.readFileSync(options.execSpec, "utf8"));
    } catch (err) {
        console.log(`Cannot parse exec spec: ${options.execSpec}. Skipping executor ...`);
    }

    let blackOrWhiteList;
    try {
        blackOrWhiteList = HJSON.parse(fs.readFileSync(options.blackOrWhiteList, "utf8"));
    } catch (err) {
        //console.log(`Cannot parse exec spec: ${options.blackList}. Skipping executor ...`);
    }

    let filterAddrs = null;
    if (options.filterAddrs) {
        filterAddrs = {};
        let filePaths = options.filterAddrs.split(",");
        for (let i = 0; i < filePaths.length; i++) {
            let filters: Object = JSON.parse(fs.readFileSync(filePaths[i], { encoding: "utf8" }));
            for (const [k, v] of Object.entries(filters)) {
                let netExchID = k.toLowerCase();
                if (!(netExchID in filterAddrs)) {
                    filterAddrs[netExchID] = new Set(v);
                } else {
                    for (let j = 0; j < v.length; j++) {
                        filterAddrs[netExchID].add(v[j]);
                    }
                }
            }
        }
    }

    (async () => {
        let callbacks = [];

        let monitor = new Monitor(coins, fetchSpec, scanSpec, Number(options.scanTime), Number(options.scanTime) + 500, Number(options.scanTime));
        if (execSpec) {
            let executor = new Executor(execSpec, options.key, coins, options.execLog, Number(options.minCrossSwaps), blackOrWhiteList);
            await executor.initialize();
            callbacks.push((allPathsResults, startCoins, timestamp) => {
                return executor.processTrades(allPathsResults, startCoins, timestamp);
            });
        }

        if (options.outputDir) {
            callbacks.push(getSaveToFileCB(options.outputDir));
        }

        monitor.go(callbacks, filterAddrs);
    })();
}