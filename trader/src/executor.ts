const assert = require("assert");
const swapperAbi = require("../hardhat/artifacts/contracts/Swapper.sol/Swapper.json");
const workerpool = require("workerpool");
const fs = require("fs");

// const { filterTrades } = require("./trade_filter.js");
// const { getPathSpec } = require("../../stats/src/path_utils.js");

import { ethers } from "ethers";
import { BigNumber } from "bignumber.js";
import { CoinWallet, ERC20API } from "..";
import { JsonRpcBatchProvider } from "../../pairs_fetcher/src/provider";
import { compileTrades } from "..";
import { OwlracleGasFetcher, DeBankGasFetcher, DOMGasFetcher } from "./gas_fetcher";

import chalk from 'chalk';

export class Executor {
    private netToSigner: { [net: string]: ethers.Wallet }; // TODO: Should have an abstraction for Signer
    private netToSwapper: { [net: string]: ethers.Contract };
    private netToAPI: { [net: string]: ERC20API };
    private netToGasOverrides: { [net: string]: { type?: number, gasPrice?: number, maxFeePerGas?: number, maxPriorityFeePerGas?: number, gasLimit?: number } };
    private netToApprovedCoins: { [net: string]: { [coinID: string]: BigNumber } };
    private netToTxCount: { [net: string]: number };

    private coinWallet: CoinWallet;
    private prevTradePairs: { [addr: string]: { [exchID: string]: [string, string] } }
    private pool;
    private consecutiveFails: number;
    private logDir: string;
    private simMode: boolean;
    private numSuccessTrades: number;
    private numFailTrades: number;
    private minNumCrossSwaps: number;

    private blackListOrWhiteList: Object;
    private riskyPairsLastTime: Object;

    constructor(
        execSpec: { [net: string]: Object },
        key: string,
        coinsSpecOrTradePath: Object,
        logDir: string,
        minNumCrossSwaps: number = 2,
        blackListOrWhiteList: Object = { blackList: {} }) {

        let netToAcctMap = {}
        this.netToSigner = {};
        this.netToSwapper = {};
        this.netToApprovedCoins = {};
        this.netToAPI = {};
        this.netToGasOverrides = {};

        this.consecutiveFails = 0;
        this.simMode = false;
        this.logDir = logDir;

        this.numSuccessTrades = 0;
        this.numFailTrades = 0;

        this.minNumCrossSwaps = minNumCrossSwaps;
        this.netToTxCount = {};
        this.riskyPairsLastTime = {};

        // TODO: Use abstraction of provider/signer and API
        for (const [netID, prop] of Object.entries(execSpec)) {
            let prov = new ethers.providers.StaticJsonRpcProvider({ url: prop["rpc"], allowGzip: true });
            this.netToSigner[netID] = new ethers.Wallet(key, prov);
            this.netToSwapper[netID] = new ethers.Contract(prop["swapper"], swapperAbi.abi, this.netToSigner[netID]);

            let batchProv = new JsonRpcBatchProvider({ url: prop["rpc"], allowGzip: true });
            this.netToAPI[netID] = new ERC20API(batchProv);

            netToAcctMap[netID] = this.netToSigner[netID].address;

            this.netToGasOverrides[netID] = Object.assign({}, prop["overrides"]);
            if (this.netToGasOverrides[netID].type === 0 && this.netToGasOverrides[netID].gasPrice == null) {
                let gasPriceLimit = prop["gasFetcher"]?.["gasPriceLimit"] ? prop["gasFetcher"]?.["gasPriceLimit"] : 1e15;
                let gasFetcher = new DeBankGasFetcher(netID, this.netToGasOverrides[netID], gasPriceLimit);
                gasFetcher.go();
            }
        }

        this.blackListOrWhiteList = blackListOrWhiteList;
        this.coinWallet = new CoinWallet(this.netToAPI, netToAcctMap, coinsSpecOrTradePath);
        this.prevTradePairs = {};
        this.pool = null;
    }

    async executeTrade(tradePath: Object) {
        let inputVol: BigNumber = new BigNumber(tradePath["optArbInputVol"]);
        let outputVol: BigNumber = inputVol.plus(tradePath["optArbDelta"]);
        let maxSlippage = inputVol.dividedBy(outputVol).toNumber();

        console.log("Compiling trade ...");
        let trades = compileTrades(tradePath["path"], this.coinWallet.state, maxSlippage, inputVol);
        console.log("Executing trade ...");
        console.log(JSON.stringify(tradePath, null, 4));
        console.log(chalk.blueBright(JSON.stringify(trades, null, 4)));

        let txsDone = [];
        let txsHashes = [];

        let startTime = Date.now();
        try {
            let netToGasOverrides = {};

            // Sanity check
            for (const [networkID, trade] of Object.entries(trades)) {
                netToGasOverrides[networkID] = Object.assign({}, this.netToGasOverrides[networkID]);
                if (netToGasOverrides[networkID]["gasPrice"] == 0) {
                    return {
                        result: "aborted",
                        errorMsg: `Gas price is invalid @ ${networkID}!`,
                        tradePath: tradePath,
                        compiledTrades: trades,
                    };
                }
            }

            let asyncTxs = [];

            for (const [networkID, trade] of Object.entries(trades)) {
                assert(networkID in this.netToSigner, "networkID in this.netToSigner");

                let signer = this.netToSigner[networkID];
                let swapper = this.netToSwapper[networkID];
                let tx;

                for (let i = 0; i < trade.length; i++) {
                    // NOTE: Swapper must be pre-approved for this account
                    //console.log(`${signer.address} vs ${trade["acctID"]}`);
                    assert(signer.address === trade[i]["acctID"], 'signer.address === trade[i]["acctID"]');

                    let minOutputVol = trade[i]["minOutputVol"];
                    let overrides = Object.assign({}, netToGasOverrides[networkID]);
                    overrides["nonce"] = this.netToTxCount[networkID] + i;

                    console.log(chalk.cyanBright(`Swapping ${trade[i]["pairAddrs"]} @ ${networkID} using acct: ${signer.address} for `
                        + `${trade[i]["inputVol"].toFixed()} units ...\n${JSON.stringify(overrides)}`));

                    if (!this.simMode) {
                        tx = swapper.swapPath(
                            trade[i]["pairAddrs"],
                            trade[i]["token1sts"],
                            trade[i]["inputVol"].toFixed(),
                            minOutputVol.toFixed(),
                            overrides);
                        asyncTxs.push(tx);
                        //txsHashes.push(tx.hash);
                    } //else {
                    //tx = { wait: () => Promise.resolve() };
                    //}
                }
            }

            console.log(`Waiting for async txs ... Elapsed since start: ${(Date.now() - startTime) / 1000.0}`);
            let asyncTxsFinished = await Promise.all(asyncTxs);

            for (let i = 0; i < asyncTxsFinished.length; i++) {
                txsHashes.push(asyncTxsFinished[i].hash);
                txsDone.push(asyncTxsFinished[i].wait());
            }

            console.log(`Waiting for all blocks confirmed ... Elapsed since start: ${(Date.now() - startTime) / 1000.0}`);
            let txsReceipt = await Promise.all(txsDone);
            console.log(chalk.green(`Swap completed ... Elapsed since start: ${(Date.now() - startTime) / 1000.0}`));

            // Reset fails
            this.consecutiveFails = 0;

            this.numSuccessTrades += 1;

            return {
                result: "success",
                tradePath: tradePath,
                compiledTrades: trades,
                txsHashes: txsHashes,
                receipts: txsReceipt
            }

        } catch (err) {
            console.log(chalk.magenta(err));
            this.numFailTrades += 1;

            console.log(chalk.green(`Swap Failed ... Elapsed since start: ${(Date.now() - startTime) / 1000.0}`));

            // Make sure no transactions are stuck before continuing
            await this.waitForPendingTransactions();
            console.log(chalk.green(`No pending transactions ... Elapsed since start: ${(Date.now() - startTime) / 1000.0}`));

            this.consecutiveFails += 1;
            // if (this.consecutiveFails > 2) {
            //     throw new Error("Failed to trade more than 2 times consecutively!");
            // }

            return {
                result: "fail",
                consecutiveFails: this.consecutiveFails,
                tradePath: tradePath,
                compiledTrades: trades,
                txsHashes: txsHashes,
                errorMsg: err
            };
        }

    }

    private async waitForPendingTransactions() {
        console.log("Waiting for pending transactions ...");
        for (const [netID, signer] of Object.entries(this.netToSigner)) {

            while (true) {
                let pendingCount = await signer.getTransactionCount("pending");
                let latestCount = await signer.getTransactionCount("latest");
                if (pendingCount !== latestCount) {
                    console.log(`Waiting for ${netID} transactions to flush: ${pendingCount - latestCount}. Total + pending: ${pendingCount}`);
                    await new Promise((res) => { setTimeout(res, 2000); });
                } else {
                    this.netToTxCount[netID] = latestCount;
                    break;
                }
            }
        }
    }

    private async updateWalletAndApprovals() {
        await this.waitForPendingTransactions();

        while (true) {
            try {
                console.log(chalk.white("Updating wallet ..."));
                await this.coinWallet.update();
                break;
            } catch (err) {
                console.log(chalk.magenta(err));
                await new Promise((res) => { setTimeout(res, 1000); });
            }
        }

        // This filters out all the zero balances
        let walletState = CoinWallet.diffBalances(this.coinWallet.state, {});

        let tryCount = 0;
        while (true) {
            try {
                // Then check to see if tokens require approval
                console.log(chalk.white("Querying coin approvals ..."));
                let txs = [];
                for (const [networkID, netProp] of Object.entries(walletState)) {
                    if (!(networkID in this.netToApprovedCoins)) {
                        this.netToApprovedCoins[networkID] = {};
                    }

                    let api = this.netToAPI[networkID];

                    for (const [coinName, coinProp] of Object.entries(netProp)) {
                        for (const [pubKey, bal] of Object.entries(coinProp["balances"])) {
                            if (pubKey === this.netToSigner[networkID].address) {
                                let approveVal = this.netToApprovedCoins[networkID]?.[coinProp["addr"]];
                                if (approveVal === undefined) {
                                    txs.push(
                                        api.allowance(coinProp["addr"], pubKey, this.netToSwapper[networkID].address).then((res) => {
                                            this.netToApprovedCoins[networkID][coinProp["addr"]] = new BigNumber(res.toString());
                                            console.log(`Approval for ${coinName} @ ${networkID}/${coinProp["addr"]} = ${this.netToApprovedCoins[networkID][coinProp["addr"]]}`);
                                        })
                                    );
                                }
                            }
                        }
                    }
                }

                await Promise.all(txs);

                console.log(chalk.white("Setting coin approvals ..."));
                const neg1 = new BigNumber("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
                for (const [networkID, netProp] of Object.entries(this.netToApprovedCoins)) {
                    let api = this.netToAPI[networkID];
                    for (const [coinAddr, approveVal] of Object.entries(netProp)) {
                        if (approveVal.isEqualTo(0)) {

                            if (!this.simMode) {
                                let tx = await api.approve(
                                    coinAddr,
                                    this.netToSigner[networkID],
                                    this.netToSwapper[networkID].address,
                                    neg1,
                                    this.netToGasOverrides[networkID]);
                                console.log(`Waiting for tx: ${JSON.stringify(tx, null, 4)}`);
                                await tx.wait();
                            }

                            // console.log(res);
                            // if (!res) {
                            //     throw new Error(`Failed to set approval for ${coinAddr} @ ${networkID}. Result: ${res}`);
                            // }
                            this.netToApprovedCoins[networkID][coinAddr] = neg1;
                            console.log(`Successfully set approval for ${coinAddr} @ ${networkID}`);
                        }
                    }
                }

                await this.waitForPendingTransactions();

                break;
            } catch (err) {
                console.log(chalk.magenta(err));
                tryCount += 1;
                if (tryCount > 3) {
                    throw new Error("Failed to query/set token approval more than 3 times!");
                }

                await this.waitForPendingTransactions();

                await new Promise((res) => { setTimeout(res, 2000); });
            }
        }
    }

    setSimMode(enableSimMode: boolean) {
        this.simMode = enableSimMode;
    }

    async initialize() {
        this.pool = workerpool.pool(__dirname + "/trade_worker_tasks.js", {
            minWorkers: "max",
            workerType: "auto"
        });

        await this.updateWalletAndApprovals();

        console.log(chalk.yellow(JSON.stringify(this.coinWallet.state, null, 4)));
        //console.log(chalk.yellow(JSON.stringify(CoinWallet.diffBalances(this.coinWallet.state, {}), null, 4)));
    }

    async processTrades(allPathsResults: Array<Array<Object>>, startCoins: Array<any>, timestamp: number) {
        if (!this.pool) {
            throw new Error("Trying to process trade but is not initialized!");
        }

        //console.log(JSON.stringify(this.netToGasOverrides));

        // Fetch risky pairs
        let pathPromises = [];
        for (let i = 0; i < allPathsResults.length; i++) {
            let paths = allPathsResults[i];
            pathPromises.push(this.pool.exec("findRiskyPairs", [paths]));
        }
        let results = await Promise.all(pathPromises);
        let riskyPairs = {};
        for (let i = 0; i < results.length; i++) {
            riskyPairs = Object.assign(riskyPairs, results[i]);
        }

        let filteredRiskyPairs = {};
        for (const [pairID, paths] of Object.entries(riskyPairs)) {
            if (pairID in this.riskyPairsLastTime) {
                const RISKY_PAIR_CONT_THRESHOLD = 4.0 * 1000.0;
                const RISKY_PAIR_DUR_THRESHOLD = 20.0 * 1000.0;
                let lastTime = this.riskyPairsLastTime[pairID][0];
                let lastDur = this.riskyPairsLastTime[pairID][1];
                let duration = timestamp - lastTime;
                if (duration < RISKY_PAIR_CONT_THRESHOLD) {
                    this.riskyPairsLastTime[pairID] = [timestamp, lastDur + duration];
                } else {
                    this.riskyPairsLastTime[pairID] = [timestamp, 0];
                }

                if (this.riskyPairsLastTime[pairID][1] < RISKY_PAIR_DUR_THRESHOLD) {
                    filteredRiskyPairs[pairID] = paths;
                } else {
                    console.log(chalk.cyan(`Not so risky after all: ${pairID}`));
                }
            } else {
                this.riskyPairsLastTime[pairID] = [timestamp, 0];
                filteredRiskyPairs[pairID] = paths;
            }
        }

        // if (Object.keys(riskyPairs).length > 0) {
        //     console.log(`Risky pairs: ${JSON.stringify(riskyPairs)}`);
        // }

        pathPromises = [];
        let walletState = this.coinWallet.copyState(false, true);
        for (let i = 0; i < allPathsResults.length; i++) {
            let paths = allPathsResults[i];
            let blackOrWhite;
            if ("blackList" in this.blackListOrWhiteList) {
                let blackList = this.blackListOrWhiteList["blackList"]?.[startCoins[i]] ? this.blackListOrWhiteList["blackList"][startCoins[i]] : {};
                let greyList = this.blackListOrWhiteList["greyList"]?.[startCoins[i]] ? this.blackListOrWhiteList["greyList"][startCoins[i]] : {};
                blackOrWhite = { blackList, greyList };
            } else {
                let whiteList = this.blackListOrWhiteList[startCoins[i]] ? this.blackListOrWhiteList[startCoins[i]] : {};
                blackOrWhite = { whiteList };
            }
            pathPromises.push(this.pool.exec("filterTrades", [paths, walletState, this.minNumCrossSwaps, 5, this.prevTradePairs, filteredRiskyPairs, blackOrWhite, timestamp]));
        }

        // Wait for results of trade finding
        results = await Promise.all(pathPromises);

        let bestPathSoFar = null;
        let bestDeltaGain = null;
        for (let i = 0; i < results.length; i++) {
            let [trades, greyList] = results[i];

            // Update grey list
            if (greyList && "greyList" in this.blackListOrWhiteList) {
                this.blackListOrWhiteList["greyList"][startCoins[i]] = greyList;
            }

            // Select path with best relative delta amongst the different coins
            let curPath = trades.slice(-1)[0];
            if (curPath && (bestDeltaGain === null || bestDeltaGain.isLessThan(curPath["deltaGainRatio"]))) {
                bestPathSoFar = curPath;
                bestDeltaGain = new BigNumber(curPath["deltaGainRatio"]);
            }
        }

        if (bestPathSoFar) {
            let res = await this.executeTrade(bestPathSoFar);

            if (res["result"] !== "aborted") {
                // Store previous trades for moratorium
                this.prevTradePairs = {};
                for (let i = 1; i < bestPathSoFar.path.length; i++) {
                    let entry = bestPathSoFar.path[i]["edge"]

                    if (!(entry["addr"] in this.prevTradePairs)) {
                        this.prevTradePairs[entry["addr"]] = {};
                    }

                    this.prevTradePairs[entry["addr"]][entry["exchangeID"]] = [entry["token1Reserve"], entry["token2Reserve"]]
                }

                let befState = this.coinWallet.copyState();

                // This part must not fail ...
                await this.updateWalletAndApprovals();

                let profits = CoinWallet.sumAcctsBalances(CoinWallet.diffBalances(this.coinWallet.state, befState));
                let balances = CoinWallet.diffBalances(this.coinWallet.state, {});
                res["profits"] = profits;
                res["balances"] = balances;

                console.log("Before -> After:")
                console.log(chalk.yellow(JSON.stringify(profits, null, 4)));
                console.log("Current Balance:")
                console.log(chalk.yellow(JSON.stringify(balances, null, 4)));

                if (res["result"] === "success") {
                    if (this.logDir) {
                        fs.writeFileSync(this.logDir + `/success-${Date.now()}.json`, JSON.stringify(res, null, 4), { encoding: "utf8" });
                    }
                } else {
                    if (this.logDir) {
                        fs.writeFileSync(this.logDir + `/fail-${Date.now()}.json`, JSON.stringify(res, null, 4), { encoding: "utf8" });
                    }

                    if (res["consecutiveFails"] > 2) {
                        throw new Error("Failed to trade more than 2 times consecutively!");
                    }
                }
            } else {
                console.log(chalk.magentaBright(res["errorMsg"]));
            }
        }
    }
};