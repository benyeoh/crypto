#!/usr/bin/env -S npx ts-node
const hre = require("hardhat");
const ethers = hre.ethers;

import { program } from "commander";
import { exit } from "process";

export async function deploy(network: string, key: string) {
    let prov = new ethers.providers.StaticJsonRpcProvider(network);
    let signer = new ethers.Wallet(key, prov);
    let Swapper = await ethers.getContractFactory("Swapper", signer);
    let contract = await Swapper.deploy();
    console.log(contract);
    let res = await contract.deployed();

    return [res, contract];
}

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-n, --network <rpc URL>', "Input comma separated paths to json containing addresses to filter.", null);
    program.option('-k, --key <private key>', "Private key for account");
    program.parse();
    const options = program.opts();

    deploy(options.network, options.key).then((res) => {
        console.log(res[0].deployTransaction);
        console.log(`Address: ${res[1].address}`);
        exit();
    });
}