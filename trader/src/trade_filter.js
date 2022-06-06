const { assert } = require("console");
const { getPathSpec } = require("../../stats/src/path_utils.js");
const { CPMM, ApproxCPMM } = require("../../pairs_arbitrage/src/cpmm.js");
const { BigNumber } = require("bignumber.js");
const chalk = require("chalk");

function filterRiskyPairs(pathList, riskyPairs) {
    let filteredNetPaths = [];

    let getKey = (pairInfo) => pairInfo.addr.toLowerCase() + "|" + pairInfo.exchangeID;

    let multiNetPaths = [];

    for (let i = 0; i < pathList.length; i++) {
        let tradePath = pathList[i].path;
        let networkID = tradePath[1]["edge"].exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();;
        let isSameNetwork = true;
        let prevOutputToken = tradePath[0]["node"];

        for (let j = 1; j < tradePath.length; j++) {
            let pathNode = tradePath[j];
            let pairInfo = pathNode["edge"];

            let outputTokenInfo = pathNode["node"];
            let inputToken = pairInfo.token1;
            let outputToken = pairInfo.token2;

            if (outputTokenInfo.name === pairInfo.token1.name) {
                // Swap order
                inputToken = pairInfo.token2;
                outputToken = pairInfo.token1;
            }

            if (networkID !== pairInfo.exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase() ||
                inputToken.name !== prevOutputToken.name) {
                isSameNetwork = false;
                break;
            }
            prevOutputToken = outputToken;
        }

        if (isSameNetwork) {
            filteredNetPaths.push(pathList[i]);
        } else {
            multiNetPaths.push(pathList[i]);
        }
    }

    for (let i = 0; i < multiNetPaths.length; i++) {
        let tradePath = multiNetPaths[i].path;
        let riskyPaths = null;
        for (let j = 1; j < tradePath.length; j++) {
            let pathNode = tradePath[j];
            let pairInfo = pathNode["edge"];
            let pairKey = getKey(pairInfo);
            if (pairKey in riskyPairs) {
                riskyPaths = riskyPairs[pairKey];
                break;
            }
        }

        if (riskyPaths === null) {
            filteredNetPaths.push(multiNetPaths[i]);
        } else {
            let { pathKey } = getPathSpec(multiNetPaths[i]);
            console.log(chalk.red(`Removing risky path: ${pathKey} because of ${JSON.stringify(riskyPaths)}.`));
        }
    }

    return filteredNetPaths;
}

function filterBlackOrWhiteList(pathList, blackOrWhiteList, timestamp) {
    let newPathList = [];

    for (let i = 0; i < pathList.length; i++) {
        let { pathKey } = getPathSpec(pathList[i]);
        if ("whiteList" in blackOrWhiteList) {
            let whiteList = blackOrWhiteList;
            //console.log(whiteList["whiteList"]);
            if (!(pathKey in whiteList["whiteList"])) {
                // console.log(chalk.gray(`Not in whitelist path: ${pathKey}. Skipping.`));
            } else {
                console.log(chalk.blue(`Whitelisted path: ${pathKey} ...`));
                newPathList.push(pathList[i]);
            }
        } else {
            let blackList = blackOrWhiteList;
            if (pathKey in blackList["blackList"]) {
                console.log(chalk.gray(`Blacklisted path: ${pathKey}. Skipping.`));
            } else if (pathKey in blackList["greyList"]) {
                let lastTimestamp = blackList["greyList"][pathKey]?.["timestamp"] ? blackList["greyList"][pathKey]["timestamp"] : 0;
                let timeDiff = (timestamp - lastTimestamp - blackList["greyList"][pathKey]["shortDur"] - 1000.0) / 1000.0;
                if (timeDiff > 0) {
                    if (blackList["greyList"][pathKey]["longDur"] - timeDiff > blackList["greyList"][pathKey]["threshold"]) {
                        newPathList.push(pathList[i]);
                    } else if (blackList["greyList"][pathKey]["longDur"] - timeDiff > 0) {
                        console.log(chalk.gray(`Greylisted path: ${pathKey}. Long dur: ${blackList["greyList"][pathKey]["longDur"]}, time diff: ${timeDiff}.`));
                    } else {
                        console.log(chalk.gray(`Greylisted path: ${pathKey}. Restarting.`));
                        // Update state
                        blackList["greyList"][pathKey]["timestamp"] = timestamp;
                    }
                } else {
                    console.log(chalk.gray(`Greylisted path: ${pathKey}. Need to wait ${-timeDiff}.`));
                }
            } else {
                newPathList.push(pathList[i]);
            }

        }
    }

    return [newPathList, blackOrWhiteList["greyList"]];
}

function filterCommon(pathList, acctState, minNumCrossNetwork, moratoriumPairs) {
    //console.log(JSON.stringify(pathList, null, 4));

    function findLargestBalance(netID, coinID) {
        if (netID in acctState && coinID in acctState[netID]) {
            let curBal = new BigNumber(0);
            let curAcct = null;
            for (let [pubKey, bal] of Object.entries(acctState[netID][coinID].balances)) {
                bal = new BigNumber(bal);
                if (bal.isGreaterThan(curBal)) {
                    curBal = bal
                    curAcct = pubKey;
                }
            }

            //curBal = curBal.shiftedBy(-acctState[netID][coinID].decimals);
            return curAcct ? [curAcct, curBal] : null;
        }

        return null;
    }

    let filteredPathInfo = [];
    for (let i = 0; i < pathList.length; i++) {
        // let { pathKey } = getPathSpec(pathList[i]);
        // if (pathKey in blackList) {
        //     console.log(chalk.red(`Blacklisted path: ${pathKey}. Skipping.`));
        //     continue;
        // }

        let tradePath = pathList[i].path;

        let networkIDs = [];

        // Find maximum balance to spend for each network
        maxVolInputs = [];
        let prevNetworkID = null;
        let prevOutputToken = null;
        for (let j = 1; j < tradePath.length; j++) {
            let pathNode = tradePath[j];
            let outputTokenInfo = pathNode["node"];
            let pairInfo = pathNode["edge"];
            if (pairInfo.addr in moratoriumPairs && pairInfo.exchangeID in moratoriumPairs[pairInfo.addr]) {
                if (pairInfo.token1Reserve === moratoriumPairs[pairInfo.addr][pairInfo.exchangeID][0] &&
                    pairInfo.token2Reserve === moratoriumPairs[pairInfo.addr][pairInfo.exchangeID][1]) {
                    // Hit a stale entry. Skip.
                    console.log(chalk.red(`Stale entry ${pairInfo.addr} @ ${pairInfo.exchangeID}, tok1: ${pairInfo.token1Reserve}, tok2: ${pairInfo.token2Reserve}:`));
                    console.log(chalk.red(JSON.stringify(moratoriumPairs, null, 4)));
                    maxVolInputs = null;
                    break;
                }
            }

            let networkID = pairInfo.exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();

            let inputToken = pairInfo.token1;
            let outputToken = pairInfo.token2;

            if (outputTokenInfo.name === pairInfo.token1.name) {
                // Swap order
                inputToken = pairInfo.token2;
                outputToken = pairInfo.token1;
            }

            if (networkID !== prevNetworkID || inputToken.name !== prevOutputToken.name) {
                assert(prevOutputToken === null || inputToken.addr.toLowerCase() !== prevOutputToken.addr.toLowerCase(),
                    "prevOutputToken === null ||inputToken.addr.toLowerCase() !== prevOutputToken.addr.toLowerCase()");

                networkIDs.push(networkID);

                let acctBal = findLargestBalance(networkID, inputToken.name);
                if (acctBal === null) {
                    maxVolInputs = null;
                    //console.log(`${networkID}, ${inputToken.name}`);
                    break;
                }

                let [acctID, balance] = acctBal;
                maxVolInputs.push([j, acctID, balance]);

                prevNetworkID = networkID;
            } else {
                assert(prevOutputToken === null || inputToken.addr.toLowerCase() === prevOutputToken.addr.toLowerCase(),
                    "prevOutputToken === null || inputToken.addr.toLowerCase() === prevOutputToken.addr.toLowerCase()");
            }

            prevOutputToken = outputToken;
        }

        if (maxVolInputs === null) {
            // Skip this tradepath
            //console.log(maxVolInputs)
            continue;
        }

        if (networkIDs.length < minNumCrossNetwork) {
            // Skip this tradepath
            let { pathKey } = getPathSpec(pathList[i]);
            console.log(chalk.red(`Num networks < ${minNumCrossNetwork}: ${pathKey}`));
            //console.log(chalk.red(`Num networks or tokens: ${networkIDs.length} / ${minNumCrossNetwork}`));
            continue;
        }

        let model = new ApproxCPMM(tradePath);
        let isValidInput = false;
        let curInputVol = maxVolInputs[0][2].toNumber();
        let lastPairIdx = 0;
        while (!isValidInput) {
            isValidInput = true;
            let outVolPerPath = model.swapPath(curInputVol);
            //console.log(`maxVolInputs: ${JSON.stringify(maxVolInputs)} || outVolPerPath: ${JSON.stringify(outVolPerPath)}`);

            for (let j = 1; j < maxVolInputs.length; j++) {
                [idx, acctID, balance] = maxVolInputs[j];
                let prevOutput = outVolPerPath[idx - 1 - 1];
                //console.log(`${j}, idx ${idx}, prevOutput: ${prevOutput.toFixed()}, balance: ${balance.toFixed()}`)
                if (balance.isLessThan(prevOutput)) {
                    if (j > lastPairIdx) {
                        // Find the amount of the initial input token to trade that results in the balance we can afford
                        let partialModel = new ApproxCPMM(tradePath.slice(0, idx));
                        curInputVol = partialModel.computeVolume(balance.multipliedBy(1.0 - 1e-5).toNumber());
                        //console.log(`${j}: ${curInputVol.toFixed()} with balance ${balance.toFixed()}`);
                        isValidInput = false;
                        lastPairIdx = j;
                        break;
                    } else {
                        let { pathKey } = getPathSpec(pathList[i]);
                        console.log(chalk.magentaBright(`Stuck computing balance for ${pathKey}. Proceeding ...`));
                    }
                }
            }
        }

        //assert(curInputVol.isGreaterThan(0));
        assert(curInputVol > 0);
        //console.log(`pathList[${i}]: ${curInputVol.toFixed()}`);
        pathList[i].maxInputVol = curInputVol;
        pathList[i].numNetworks = networkIDs.length;

        filteredPathInfo.push(pathList[i]);
    }

    return filteredPathInfo;
}

function filterArbitrageTopK(pathList, k) {
    let filteredTrades = [];
    let numFiltered = 0;
    for (let i = pathList.length - 1; i >= 0; i--) {
        // Proceed from best to worst
        let tradePath = pathList[i].path;
        // let cpmm = new CPMM(tradePath);
        // let optVol = new BigNumber(pathList[i].optimalVol);
        // let inputVol = pathList[i].maxInputVol.isGreaterThan(optVol) ? optVol : pathList[i].maxInputVol;
        // let [arbInputVol, arbFactor] = cpmm.computeMaxNoArbitrageVolume(inputVol);

        let cpmm = new ApproxCPMM(tradePath);
        let optVol = Number(pathList[i].optimalVol);
        let inputVol = pathList[i].maxInputVol > (optVol) ? optVol : pathList[i].maxInputVol;
        let [arbInputVol, arbFactor] = cpmm.computeMaxNoArbitrageVolume(inputVol);

        //console.log(`${i}: ${arbInputVol}, ${arbFactor}`)
        // if (arbInputVol !== null && arbFactor.isLessThanOrEqualTo(1.0001)) {
        //     let arbDelta = cpmm.computeDelta(arbInputVol);
        //     let thresholdDelta = new BigNumber(pathList[i].thresholdDelta);
        //     let modThresholdDelta = thresholdDelta.multipliedBy(0.15);
        //     //console.log(`${i}: ${arbDelta}, ${thresholdDelta}`)
        //     if (arbDelta.isGreaterThan(modThresholdDelta)) {
        //         //console.log(`${i}: ${arbDelta}, ${thresholdDelta}`);
        //         pathList[i].optArbInputVol = arbInputVol;
        //         pathList[i].optArbDelta = arbDelta;
        //         pathList[i].optArbFactor = arbFactor;
        //         filteredTrades.push(pathList[i]);
        //         numFiltered += 1;
        //         if (numFiltered >= k) {
        //             break;
        //         }
        if (arbInputVol !== null && arbFactor <= (1.0001)) {
            let arbDelta = cpmm.computeDelta(arbInputVol);
            let thresholdDelta = Number(pathList[i].thresholdDelta);
            let modThresholdDelta = thresholdDelta * (0.125);

            if (arbDelta > (modThresholdDelta)) {
                pathList[i].optArbInputVol = arbInputVol;
                pathList[i].optArbDelta = arbDelta;
                pathList[i].optArbFactor = arbFactor;
                filteredTrades.push(pathList[i]);
                numFiltered += 1;
                if (numFiltered >= k) {
                    break;
                }
            } else {
                console.log(chalk.red(`${tradePath[0].node.name} @ ${tradePath[1].edge.exchangeID} - ` +
                    `Max input vol: ${inputVol}, arbDelta: ${arbDelta} < ${modThresholdDelta}. Skipping.`));
            }
        } else {
            console.log(chalk.red(`${tradePath[0].node.name} @ ${tradePath[1].edge.exchangeID} - ` +
                `Unable to find appropriate arbInputVol (${arbInputVol}) or arbFactor (${arbFactor}). Skipping.`));
        }
    }

    return filteredTrades;
}

function filterTrades(pathList, acctState, minNumCrossNetwork, topK, moratoriumPairs, riskyPairs, blackOrWhiteList, timestamp) {
    let [filteredTrades, greyList] = filterBlackOrWhiteList(pathList, blackOrWhiteList, timestamp)

    // Remove paths with coin balance == 0, < minNumCrossNetwork or are stale
    filteredTrades = filterCommon(filteredTrades, acctState, minNumCrossNetwork, moratoriumPairs);

    // Remove paths that are "risky"
    filteredTrades = filterRiskyPairs(filteredTrades, riskyPairs);

    // Select top K that passes arbitrage factor and delta
    filteredTrades = filterArbitrageTopK(filteredTrades, topK);

    // // For each optimal volume, compute delta and sort by delta in ascending order
    // filteredTrades.sort((a, b) => {
    //     return a.optArbDelta.minus(b.optArbDelta).toNumber();
    // });

    // For each optimal volume, compute delta and sort by delta in ascending order
    filteredTrades.sort((a, b) => {
        return a.optArbDelta - (b.optArbDelta);
    });

    // for (let i = 0; i < filteredTrades.length; i++) {
    //     filteredTrades[i].deltaGainRatio = filteredTrades[i].optArbDelta.dividedBy(filteredTrades[i].thresholdDelta).toFixed();
    //     filteredTrades[i].maxInputVol = filteredTrades[i].maxInputVol.toFixed();
    //     filteredTrades[i].optArbInputVol = filteredTrades[i].optArbInputVol.toFixed();
    //     filteredTrades[i].optArbDelta = filteredTrades[i].optArbDelta.toFixed();
    //     filteredTrades[i].optArbFactor = filteredTrades[i].optArbFactor.toFixed();
    // }

    for (let i = 0; i < filteredTrades.length; i++) {
        filteredTrades[i].deltaGainRatio = filteredTrades[i].optArbDelta / (filteredTrades[i].thresholdDelta);
    }

    return [filteredTrades, greyList];
}

module.exports = {
    filterTrades: filterTrades
};
