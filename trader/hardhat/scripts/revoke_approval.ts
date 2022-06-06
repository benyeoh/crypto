#!/usr/bin/env -S npx ts-node
const hre = require("hardhat");
const ethers = hre.ethers;

import { program } from "commander";
import { exit } from "process";
import { ERC20API } from "../..";
import { BigNumber } from "bignumber.js";

export async function revoke(network: string, key: string, tokenAddr: string, spenderToRevoke: string) {
    let prov = new ethers.providers.StaticJsonRpcProvider(network);
    let signer = new ethers.Wallet(key, prov);
    let api = new ERC20API(prov);

    let tx = await api.approve(
        tokenAddr,
        signer,
        spenderToRevoke,
        new BigNumber(0));
    console.log(`Waiting for tx: ${JSON.stringify(tx, null, 4)}`);
    await tx.wait();
}

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-n, --network <rpc URL>', "Input comma separated paths to json containing addresses to filter.", null);
    program.option('-k, --key <private key>', "Private key for account");
    program.option('-t, --tokenAddr <addr>', "Input token address.");
    program.option('-s, --spender <addr>', "Spend address to revoke.", null);
    //program.option('--gasPrice <num>', "Gas price.");
    program.parse();
    const options = program.opts();

    revoke(options.network, options.key, options.tokenAddr, options.spender).then((res) => {
        exit();
    });
}