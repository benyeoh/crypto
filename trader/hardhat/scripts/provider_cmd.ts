#!/usr/bin/env -S npx ts-node
//import { ethers } from "ethers";
const hre = require("hardhat");
const ethers = hre.ethers;

import { program } from "commander";
import { exit } from "process";

async function runCommand(network: string, key: string, cmd: string, args: string) {
    let prov = new ethers.providers.StaticJsonRpcProvider(network);
    let provOrSigner;
    if (key) {
        provOrSigner = new ethers.Wallet(key, prov);
    } else {
        provOrSigner = prov;
    }
    //console.log(`${args}`);
    let arrayArgs = JSON.parse(`[${args}]`);
    return await provOrSigner[cmd](...arrayArgs);
}

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-n, --network <rpc URL>', "RPC URL of network.");
    program.option('-k, --key <private key>', "Private key for account", null);
    program.option('-c, --cmd <command>', "Command name, ie 'getTransactionCount'.");
    program.option('-a, --args <comma delimited args>', "Comma delimited command args", "");
    program.parse();
    const options = program.opts();

    runCommand(options.network, options.key, options.cmd, options.args).then((res) => {
        console.log(res);
        exit();
    });
}