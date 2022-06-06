const workerpool = require("workerpool");

import chalk from 'chalk';
import { FetchModule } from "../../pairs_fetcher/fetch";
import { PairStates } from "./pair_states";

export class Monitor {
    private coins: Object;
    private networks: Array<string>;
    private coinStart: Object;
    private coinAvail: Object;
    private updateTime: number;
    private staleTime: number;
    private findTradesTime: number;
    private pairStates: Array<PairStates>;
    private fetch: FetchModule;

    constructor(coins, fetchSpec, scanSpec, updateTime = 900, staleTime = 1000 + 350, findTradesTime = 900) {
        this.coins = coins;
        this.updateTime = updateTime;
        this.staleTime = staleTime;
        this.findTradesTime = findTradesTime;
        this.parseTradeCoins(fetchSpec, scanSpec);
    }

    private parseTradeCoins(fetchSpec: Object, scanSpec: Object) {
        let coinAvail = {};
        let coinStart = {};
        let networks = new Set<string>();

        let fetch = new FetchModule(fetchSpec);

        function processAvail(avail) {
            let translatedAvail = [];
            for (let i = 0; i < avail.length; i++) {
                let exchanges = fetch.NAME_TO_EXCHANGE_MAP[avail[i]];
                if (exchanges === undefined) {
                    console.log(chalk.red(`Warning: <${avail[i]}> network not found!`));
                } else {
                    translatedAvail.push(exchanges[0].NET_NAME);
                }
            }
            return translatedAvail;
        }

        if ("*" in scanSpec) {
            for (const [k, v] of Object.entries(this.coins)) {
                coinAvail[k] = processAvail(scanSpec["*"].availability);
            }

            for (let i = 0; i < scanSpec["*"].availability.length; i++) {
                if (scanSpec["*"].availability[i] in fetch.NAME_TO_EXCHANGE_MAP) {
                    networks.add(scanSpec["*"].availability[i]);
                }
            }

            delete scanSpec["*"];
        }

        for (const [k, v] of Object.entries(scanSpec)) {
            coinAvail[k] = processAvail(v.availability);
            for (let i = 0; i < v.availability.length; i++) {
                if (v.availability[i] in fetch.NAME_TO_EXCHANGE_MAP) {
                    networks.add(v.availability[i]);
                }
            }
            if ("trade" in v) {
                coinStart[k] = v.trade;
            }
        }

        this.fetch = fetch;
        this.coinAvail = coinAvail;
        this.coinStart = coinStart;
        this.networks = Array.from(networks);
    }

    async go(pathCallback: Function[] = [], filterAddrs = null) {
        const pool = workerpool.pool(__dirname + "/fetch_worker_task.js", {
            minWorkers: "max",
            workerType: "auto"
        });

        this.pairStates = [];
        for (let i = 0; i < this.networks.length; i++) {
            let mods = this.fetch.NAME_TO_EXCHANGE_MAP[this.networks[i]];
            for (let j = 0; j < mods.length; j++) {
                this.pairStates.push(new PairStates(mods[j], this.updateTime));
            }
        }

        console.log("Starting async pair updates ...");
        for (let i = 0; i < this.pairStates.length; i++) {
            let exchangeID = this.pairStates[i].getFetcher().DEX_NAME + ` (${this.pairStates[i].getFetcher().NET_NAME})`;
            let pairFilterAddrs = filterAddrs ? filterAddrs[exchangeID] : null;
            this.pairStates[i].initialize(this.coins, pairFilterAddrs).then(() => {
                this.pairStates[i].start();
            });
        }

        let iterNum = 0;
        let bestDeltas = [];
        let foundOccurences = 0;
        for (let i = 0; i < Object.keys(this.coinStart).length; i++) {
            bestDeltas.push(0);
        }

        while (true) {
            let now = Date.now();
            let allPairs = [];
            let pairNames = [];
            for (let i = 0; i < this.pairStates.length; i++) {
                let pairs = this.pairStates[i].getState();
                if ((now - pairs.timestamp) < this.staleTime) {
                    // Perform a deep copy to be safe
                    allPairs.push(JSON.parse(JSON.stringify(pairs)));
                    //allPairs.push(pairs);
                    pairNames.push(chalk.green(pairs.name + " (" + pairs.network + ")"));
                } else {
                    pairNames.push(chalk.red(pairs.name + " (" + pairs.network + ")"));
                }
            }

            console.log(chalk.grey("Finding trades: [ " + pairNames.join(" | ") + " ]"));

            let waitTimeout = new Promise((res) => { setTimeout(res, this.findTradesTime); });
            let pathPromises = [];
            let pathCoin = [];
            for (const [k, v] of Object.entries(this.coinStart)) {
                pathCoin.push(k);
                pathPromises.push(pool.exec("findTrades", [allPairs, k, this.coinAvail, this.coinStart]));
            }

            // Wait for results of trade finding
            let allPathResults = [];
            for (let i = 0; i < pathPromises.length; i++) {
                let results = await pathPromises[i].catch((err) => {
                    console.log(chalk.dim.gray(`${err.message}`));
                    return [];
                });

                allPathResults.push(results);
            }

            // Notify custom callbacks of trades found
            if (iterNum > (20000 / this.updateTime)) {  // Warmup time
                for (let j = 0; j < pathCallback.length; j++) {
                    let prom = pathCallback[j](allPathResults, pathCoin, now);
                    if (prom instanceof Promise) {
                        await prom;
                    }
                }
            }

            // Some logging
            let foundOne = 0;
            for (let i = 0; i < allPathResults.length; i++) {
                let allPaths = allPathResults[i];
                let path = allPaths.slice(-1)[0];
                if (path) {
                    let pathLog = "";
                    let outputNodeName = path.path[0]["node"]["name"];
                    pathLog += chalk.cyanBright(`${outputNodeName}`);

                    let prevOutputNodeName = outputNodeName;
                    for (let j = 1; j < path.path.length; j++) {
                        let outputNodeName = path.path[j]["node"]["name"];
                        let inputNodeName = path.path[j]["edge"]["token1"]["name"];
                        if (inputNodeName === outputNodeName) {
                            inputNodeName = path.path[j]["edge"]["token2"]["name"];
                        }

                        if (prevOutputNodeName !== inputNodeName) {
                            //console.log(`${prevOutputNodeName} vs ${inputNodeName}`)
                            pathLog += chalk.cyanBright(`/${inputNodeName} -> ${outputNodeName}`);
                        } else {
                            pathLog += chalk.cyanBright(` -> ${outputNodeName}`);
                        }

                        prevOutputNodeName = outputNodeName;
                    }

                    // pathLog += chalk.cyanBright(`${path.path[path.path.length - 1]["node"]["name"]}`);
                    pathLog = pathLog.padEnd(100, " ");

                    for (let j = 1; j < path.path.length - 1; j++) {
                        pathLog += chalk.blue(`${path.path[j]["edge"]["exchangeID"]} -> `);
                    }
                    pathLog += chalk.blue(`${path.path[path.path.length - 1]["edge"]["exchangeID"]}\n`);
                    //pathLog = pathLog.padEnd(150);

                    pathLog += `optimalVol: ${chalk.yellow(path["optimalVol"])}, ` +
                        `optimalDelta: ${chalk.yellow(path["optimalDelta"])}, ` +
                        `swapPrice: ${chalk.yellow(path["swapPrice"])}, ` +
                        `arbFactor: ${chalk.yellow(path["arbFactor"])}`;
                    console.log(pathLog);

                    //console.log(JSON.stringify(path, null, 4));
                    if (path.optimalDelta >= bestDeltas[i]) {
                        bestDeltas[i] = path.optimalDelta;
                    }

                    foundOne = 1;
                }
            }

            foundOccurences += foundOne;

            console.log(chalk.gray(`${chalk.blue(new Date().toLocaleString())}: Finished iteration ${iterNum}. `
                + `Found ${chalk.yellow(foundOccurences)} so far. Best deltas: ${chalk.yellow(bestDeltas)}\n`));
            iterNum += 1;

            // Wait for timeout
            await waitTimeout;
        }
    }
}
