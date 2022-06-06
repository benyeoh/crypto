#!/usr/bin/env -S npx ts-node
const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");
const erc20abi = require("@openzeppelin/contracts/build/contracts/IERC20.json");

import { program } from "commander";
import { exit } from "process";
import { BigNumber } from "bignumber.js"

import { CoinWallet, compileTrades, ERC20API } from "../../..";

async function transfer(key: string, to: string, pairs: Object, networkMap: Object, tradePath: Object, ratio: number) {
    let netToSigner = {};
    let netToAPI = {};
    let overrides = {};
    let netToAcctMap = {};

    for (const [netID, prop] of Object.entries(networkMap)) {
        let prov = new ethers.providers.StaticJsonRpcProvider({ url: prop["rpc"], allowGzip: true });
        netToSigner[netID] = new ethers.Wallet(key, prov);
        netToAPI[netID] = new ERC20API(prov);
        netToAcctMap[netID] = netToSigner[netID].address;

        overrides[netID] = {};
        if ("gasPrice" in prop) {
            overrides[netID].gasPrice = prop["gasPrice"];
        }
        if ("maxFeePerGas" in prop) {
            overrides[netID].maxFeePerGas = prop["maxFeePerGas"];
        }
        if ("maxPriorityFeePerGas" in prop) {
            overrides[netID].maxPriorityFeePerGas = prop["maxPriorityFeePerGas"];
        }
    }

    for (let i = 0; i < tradePath["path"].length; i++) {
        let curPath = tradePath["path"][i];
        if (curPath["edge"] !== null) {
            for (const [netID, pairsProp] of Object.entries(pairs)) {
                let foundPair = (() => {
                    for (let j = 0; j < pairsProp["pairs"].length; j++) {
                        let pair = pairsProp["pairs"][j];
                        if (pair["exchangeID"] === curPath["edge"]["exchangeID"] &&
                            ((pair["token1Reserve"] === curPath["edge"]["token1Reserve"] && pair["token2Reserve"] === curPath["edge"]["token2Reserve"]) ||
                                (pair["token1Reserve"] === curPath["edge"]["token2Reserve"] && pair["token2Reserve"] === curPath["edge"]["token1Reserve"]))) {
                            return pair;
                        }
                    }

                    return null;
                })();

                if (foundPair) {
                    curPath["edge"] = foundPair;
                    break;
                }
            }
        }
    }

    let coinWallet = new CoinWallet(netToAPI, netToAcctMap, tradePath["path"]);
    console.log("Updating wallet ...");
    await coinWallet.update();

    console.log(JSON.stringify(coinWallet.state, null, 4));
    let trades = compileTrades(tradePath["path"], coinWallet.state);

    for (const [netID, tradeProp] of Object.entries(trades)) {
        for (let i = 0; i < tradeProp.length; i++) {

            let coinAddr = tradeProp[i]["inputTokenAddr"];
            let signer = netToSigner[netID];
            console.log(tradeProp[i]);
            let ecr20Contract = new ethers.Contract(coinAddr, erc20abi.abi, signer);
            let amount = (new BigNumber(tradeProp[i]["inputVol"])).multipliedBy(ratio).decimalPlaces(0).toFixed();
            console.log(`Transfering ${coinAddr} @ ${netID} of ${amount} to ${to}`);
            let tx = await ecr20Contract.transfer(to, amount);
            console.log("Waiting ...");
            await tx.wait();
            console.log("Done ...");

        }
    }
}

if (require.main === module) {

    program.option('-n, --networkMap <path to json>', "Path to json containing network name to URL mapping.", __dirname + "/testnets.json");
    program.option('-p, --pairs <path to json>', "Path to json containing network pair specs", __dirname + "/testpairs.json");
    program.option('-t, --tradePath <path to json>', "Path to json containing a trade path", __dirname + "/testtrade.json");
    program.option('-k, --key <key string>', "Private key of account.");
    program.option('-a, --amountRatio <number>', "Ratio of coins to send.", "1.0");
    program.option('--to <address>', "Address of account to send.");
    program.parse();
    const options = program.opts();

    let networkMap = JSON.parse(fs.readFileSync(options.networkMap, "utf8"));
    let tradePath = JSON.parse(fs.readFileSync(options.tradePath, "utf8"));
    let netPairs = JSON.parse(fs.readFileSync(options.pairs, "utf8"));

    transfer(options.key, options.to, netPairs, networkMap, tradePath, Number(options.amountRatio)).then(() => {
        console.log("Done!");
        exit(0);
    });
}
