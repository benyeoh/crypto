#!/usr/bin/env -S npx ts-node
const fs = require("fs");

import { program } from "commander";
import { Monitor } from "./robot";

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-c, --coins <path to json>', "Input path to coin spec json.", "./coins.json");
    program.option('-t, --tradeSpec <path to json>', "Input path to a trade spec json.", "./trade_spec.json");
    program.parse()
    const options = program.opts()

    let coins = JSON.parse(fs.readFileSync(options.coins, "utf8"));
    let tradeSpec = JSON.parse(fs.readFileSync(options.tradeSpec, "utf8"));
    let monitor = new Monitor(coins, null, tradeSpec);
    monitor.go();
}