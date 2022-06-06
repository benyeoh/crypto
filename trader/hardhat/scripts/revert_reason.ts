#!/usr/bin/env -S npx ts-node
//import { ethers } from "ethers";
const hre = require("hardhat");
const ethers = hre.ethers;

import { program } from "commander";
import { exit } from "process";
import chalk from "chalk";

function hex_to_ascii(str1) {
    var hex = str1.toString();
    var str = '';
    for (var n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
}

async function revertReason(network: string, txHash: string) {
    let prov = new ethers.providers.JsonRpcProvider(network);
    const tx = await prov.getTransaction(txHash);
    console.log(tx);
    try {
        let code = await prov.call(tx, tx.blockNumber)
        let reason = hex_to_ascii(code.substr(138))
        console.log('Revert Reason:', chalk.red(reason))
    } catch (err) {
        console.log(err);
    }
}

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-n, --network <rpc URL>', "RPC URL of network.");
    program.option('-t, --tx <hash>', "Transaction hash");
    program.parse();
    const options = program.opts();

    revertReason(options.network, options.tx).then((res) => {
        exit();
    });
}