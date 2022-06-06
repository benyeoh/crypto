#!/usr/bin/env -S npx ts-node
const fs = require("fs");

import { program } from "commander";
import { exit } from "process";
import * as deployMulticall from "./deploy_multicall";
import * as deploySwapper from "./deploy_swapper";

async function deploy(networkMap, key) {

    for (const [netID, netProp] of Object.entries(networkMap)) {
        console.log(`Deploying Multicall to ${netID} @ ${netProp["rpc"]} ...`);
        let [res, contract] = await deployMulticall.deploy(netProp["rpc"], key);
        netProp["multicall"] = contract.address;
        console.log(`Deploying Swapper to ${netID} @ ${netProp["rpc"]} ...`);
        [res, contract] = await deploySwapper.deploy(netProp["rpc"], key);
        netProp["swapper"] = contract.address;
    }

}

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-n, --networkMap <path to json>', "Path to json containing network name to URL mapping.");
    program.option('-k, --key <key string>', "Private key of account");
    program.parse();
    const options = program.opts();

    let networkMap = JSON.parse(fs.readFileSync(options.networkMap, "utf8"));

    deploy(networkMap, options.key).then(() => {
        console.log(`Writing to ${options.networkMap} ...`);
        fs.writeFileSync(options.networkMap, JSON.stringify(networkMap, null, 4), "utf8");
        console.log("Done!");
        exit(0);
    })
}
