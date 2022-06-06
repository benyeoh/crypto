const assert = require("assert");

import { BigNumber } from "bignumber.js"
import * as cpmm from "../../pairs_arbitrage/src/cpmm";
import chalk from 'chalk';

function findLargestBalance(wallet, netID, coinID): Array<any> {
    if (netID in wallet && coinID in wallet[netID]) {
        let curBal: BigNumber = new BigNumber(0);
        let curAcct: string = null;
        for (const [pubKey, bal] of Object.entries(wallet[netID][coinID].balances)) {
            if ((bal as BigNumber).isGreaterThan(curBal)) {
                curBal = (bal as BigNumber);
                curAcct = pubKey;
            }
        }

        //curBal = curBal.shiftedBy(-wallet[netID][coinID].decimals);
        return curAcct ? [curAcct, curBal] : null;
    }

    return null;
}

export function compileTrades(tradePath, wallet, maxSlippage: number = 1.0, inputVol: BigNumber | number = null): { [net: string]: Object[] } {
    let model = new cpmm.CPMM(tradePath);
    let curInputVol = inputVol !== null ? new BigNumber(inputVol) : model.computeOptimalVolume();

    let trades: { [net: string]: Object[] } = {};
    let prevNetworkID = null;
    let prevOutputToken = null;
    let outVolPerPath = model.swapPath(curInputVol, true);

    let numSeparateSwaps = 0;

    for (let i = 1; i < tradePath.length; i++) {
        let pathNode = tradePath[i];
        let outputTokenInfo = pathNode["node"];
        let networkID = pathNode["edge"].exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();
        let pairInfo = pathNode["edge"];

        let inputToken = pairInfo.token1;
        let outputToken = pairInfo.token2;

        // Parameters for smart contract
        let pairAddr = pairInfo.addr;
        let inputToken1st = true;

        if (outputTokenInfo.name === pairInfo.token1.name) {
            // Swap order
            inputToken = pairInfo.token2;
            outputToken = pairInfo.token1;
            inputToken1st = false;
        }

        if (!(networkID in trades)) {
            trades[networkID] = [];
        }

        if (networkID !== prevNetworkID || inputToken.name !== prevOutputToken.name) {
            //console.log(`${wallet[networkID][inputToken.name].addr} vs ${inputToken.addr}`);
            assert(wallet[networkID][inputToken.name].addr.toLowerCase() === inputToken.addr.toLowerCase(),
                "wallet[networkID][inputToken.name].addr.toLowerCase() === inputToken.addr");
            assert(wallet[networkID][inputToken.name].decimals === inputToken.decimals,
                "wallet[networkID][inputToken.name].decimals === inputToken.decimals");

            let acctBalance = findLargestBalance(wallet, networkID, inputToken.name);
            assert(acctBalance != null);

            let [acctID, balance] = acctBalance;

            let inputVol;
            if (i == 1) {
                //assert(balance.isGreaterThanOrEqualTo(curInputVol), "balance.isGreaterThanOrEqualTo(curInputVol)");
                if (balance.isGreaterThanOrEqualTo(curInputVol)) {
                    inputVol = curInputVol;
                } else {
                    console.log(chalk.red(`Balance is less than curInputVol: ${balance.toFixed()} vs ${curInputVol.toFixed()}`));
                    inputVol = balance;
                }
                //console.log(`${balance.toFixed()} vs ${curInputVol.toFixed()}`)
            } else {
                let prevOutput = outVolPerPath[i - 1 - 1];
                //console.log(`${balance.toFixed()} vs ${prevOutput.toFixed()}`)
                //assert(balance.isGreaterThanOrEqualTo(prevOutput), "balance.isGreaterThanOrEqualTo(prevOutput)");

                if (balance.isGreaterThanOrEqualTo(prevOutput)) {
                    inputVol = prevOutput;
                } else {
                    console.log(chalk.red(`Balance is less than prevOutput: ${balance.toFixed()} vs ${prevOutput.toFixed()}`));
                    inputVol = balance;
                }
            }

            trades[networkID].push({
                pairAddrs: [pairAddr],
                token1sts: [inputToken1st],
                inputTokenAddr: inputToken.addr,
                acctID: acctID,
                inputVol: inputVol.shiftedBy(inputToken.decimals).decimalPlaces(0),
                outputVol: outVolPerPath[i - 1].shiftedBy(outputToken.decimals).decimalPlaces(0)
            });

            prevNetworkID = networkID;
            numSeparateSwaps += 1;

        } else {
            assert((prevOutputToken.name === inputToken.name) && (prevOutputToken.addr.toLowerCase() === inputToken.addr.toLowerCase()),
                "(prevOutputToken.name === inputToken.name) && (prevOutputToken.addr.toLowerCase() === inputToken.addr.toLowerCase())");
            assert(prevNetworkID === networkID, "prevNetworkID === networkID");

            //console.log(trades[networkID][trades[networkID].length - 1]);
            trades[networkID][trades[networkID].length - 1]["pairAddrs"].push(pairAddr);
            trades[networkID][trades[networkID].length - 1]["token1sts"].push(inputToken1st);
            trades[networkID][trades[networkID].length - 1]["outputVol"] = outVolPerPath[i - 1].shiftedBy(outputToken.decimals).decimalPlaces(0);
        }

        prevOutputToken = outputToken;
    }

    // Set rough slippage parameters per network
    let perSwapPathSlippage = maxSlippage; // Math.pow(maxSlippage, 1.0 / numSeparateSwaps);
    for (const [networkID, tradesProp] of Object.entries(trades)) {
        for (let trade of tradesProp) {
            trade["minOutputVol"] = trade["outputVol"].multipliedBy(perSwapPathSlippage).decimalPlaces(0);
        }
    }

    return trades;
}