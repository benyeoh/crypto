#!/usr/bin/env -S npx ts-node
const hre = require("hardhat");
const ethers = hre.ethers;

import { program } from "commander";
import { exit } from "process";

export async function cancel(network: string, key: string, nonce: number, gas: number) {
    let prov = new ethers.providers.StaticJsonRpcProvider(network);
    let signer = new ethers.Wallet(key, prov);
    const tx = {
        nonce: nonce,
        to: ethers.constants.AddressZero,
        data: '0x',
        gasPrice: gas
    }; // costs 21000 gas

    console.log("Cancelling ...");
    let res = await signer.sendTransaction(tx);
    console.log(res);
    await res.wait();
}

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-n, --network <rpc URL>', "Input comma separated paths to json containing addresses to filter.", null);
    program.option('-k, --key <private key>', "Private key for account");
    program.option('--nonce <num>', "Nonce.");
    program.option('--gasPrice <num>', "Gas price.");
    program.parse();
    const options = program.opts();

    cancel(options.network, options.key, Number(options.nonce), Number(options.gasPrice)).then((res) => {
        exit();
    });
}