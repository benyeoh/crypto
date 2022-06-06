#!/usr/bin/env -S npx ts-node
const erc20abi = require("@openzeppelin/contracts/build/contracts/IERC20.json");
import { ethers } from "ethers";
import { BigNumber } from "bignumber.js";

import { program } from "commander";
import { exit } from "process";

async function transfer(network, key, to, coinAddr, amount) {
    let prov = new ethers.providers.StaticJsonRpcProvider(network);
    let signer = new ethers.Wallet(key, prov);
    let ecr20Contract = new ethers.Contract(coinAddr, erc20abi.abi, signer);
    let tx = await ecr20Contract.transfer(to, amount);
    await tx.wait();
}

if (require.main === module) {
    program.option('-n, --network <rpc URL>', "Network public RPC");
    program.option('-k, --key <key string>', "Private key of account");
    program.option('-t, --to <address>', "Address of account to send.");
    program.option('-c, --coinAddr <address>', "Address of coin to send.");
    program.option('-a, --amount <string>', "Amount of coin to send.");
    program.parse();
    const options = program.opts();

    transfer(options.network, options.key, options.to, options.coinAddr, options.amount).then(() => {
        console.log("Done!");
        exit(0);
    });
}
