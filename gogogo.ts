#!/usr/bin/env -S npx ts-node
const fs = require("fs");

import { program } from "commander";
import { Monitor, getSaveToFileCB } from "./robot";

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-c, --coins <path to json>', "Input path to coin spec json.", "./coins.json");
    program.option('-f, --filterAddrs <comma sep path to jsons>', "Input comma separated paths to json containing addresses to filter.", null);
    program.option('-t, --tradeSpec <path to json>', "Input path to a trade spec json.", "./trade_spec.json");
    program.option('-o, --outputDir <dir>', "Output path saved trades json.", null);
    program.parse()
    const options = program.opts()

    let coins = JSON.parse(fs.readFileSync(options.coins, "utf8"));
    let tradeSpec = JSON.parse(fs.readFileSync(options.tradeSpec, "utf8"));
    let filterAddrs = null;
    if (options.filterAddrs) {
        filterAddrs = {};
        let filePaths = options.filterAddrs.split(",");
        for (let i = 0; i < filePaths.length; i++) {
            let filters: Object = JSON.parse(fs.readFileSync(filePaths[i], { encoding: "utf8" }));
            for (const [k, v] of Object.entries(filters)) {
                if (!(k in filterAddrs)) {
                    filterAddrs[k] = new Set(v);
                } else {
                    for (let j = 0; j < v.length; j++) {
                        filterAddrs[k].add(v[j]);
                    }
                }
            }
        }
    }

    let monitor = new Monitor(coins, tradeSpec);

    let callbacks = [];
    if (options.outputDir) {
        callbacks.push(getSaveToFileCB(options.outputDir));
    }

    monitor.go(callbacks, filterAddrs);
}