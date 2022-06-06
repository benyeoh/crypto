const assert = require("assert");
import { ethers } from "ethers";
import { BigNumber } from "bignumber.js";

BigNumber.config({ EXPONENTIAL_AT: [-100, 100] })

export class CoinWallet {
    private accts: Object;
    private netToAPIMap: Object;

    constructor(netToAPIMap: Object, netToAcctMap: Object, coinsSpecOrTradeSpec: Object | Array<Object>) {
        this.netToAPIMap = netToAPIMap;

        if (coinsSpecOrTradeSpec instanceof Array) {
            this.initializeFromTradeSpec(netToAcctMap, coinsSpecOrTradeSpec);
        } else {
            this.initializeFromCoinsSpec(netToAcctMap, coinsSpecOrTradeSpec);
        }
    }

    private initializeFromTradeSpec(netToAcctMap: Object, tradeSpec: Array<Object>) {
        this.accts = {};

        for (let i = 1; i < tradeSpec.length; i++) {
            let pairInfo = tradeSpec[i]["edge"];
            let networkID = pairInfo.exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();

            if (networkID in netToAcctMap) {
                if (!(networkID in this.accts)) {
                    this.accts[networkID] = {};
                }

                if (!(pairInfo.token1.name in this.accts[networkID])) {
                    let balances = {};
                    let keys = netToAcctMap[networkID] instanceof Array ? netToAcctMap[networkID] : [netToAcctMap[networkID]];
                    for (const pubKey of keys) {
                        balances[pubKey] = null;
                    }
                    this.accts[networkID][pairInfo.token1.name] = {
                        addr: pairInfo.token1.addr,
                        decimals: pairInfo.token1.decimals,
                        balances: balances
                    }
                } else {
                    assert(this.accts[networkID][pairInfo.token1.name].addr === pairInfo.token1.addr);
                    assert(this.accts[networkID][pairInfo.token1.name].decimals === pairInfo.token1.decimals);
                }

                if (!(pairInfo.token2.name in this.accts[networkID])) {
                    let balances = {};
                    let keys = netToAcctMap[networkID] instanceof Array ? netToAcctMap[networkID] : [netToAcctMap[networkID]];
                    for (const pubKey of keys) {
                        balances[pubKey] = null;
                    }
                    this.accts[networkID][pairInfo.token2.name] = {
                        addr: pairInfo.token2.addr,
                        decimals: pairInfo.token2.decimals,
                        balances: balances
                    }
                } else {
                    assert(this.accts[networkID][pairInfo.token2.name].addr === pairInfo.token2.addr);
                    assert(this.accts[networkID][pairInfo.token2.name].decimals === pairInfo.token2.decimals);
                }
            }
        }
    }

    private initializeFromCoinsSpec(netToAcctMap: Object, coinsSpec: Object) {
        this.accts = {};

        for (const [coinName, coinProp] of Object.entries(coinsSpec)) {
            for (const [networkID, addr] of Object.entries(coinProp.address)) {
                if (networkID in netToAcctMap) {
                    if (!(networkID in this.accts)) {
                        this.accts[networkID] = {};
                    }

                    if (!(coinName in this.accts[networkID])) {
                        let balances = {};
                        let keys = netToAcctMap[networkID] instanceof Array ? netToAcctMap[networkID] : [netToAcctMap[networkID]];
                        for (const pubKey of keys) {
                            balances[pubKey] = null;
                        }

                        this.accts[networkID][coinName] = {
                            addr: addr,
                            decimals: coinProp.decimals,
                            balances: balances
                        }

                    } else {
                        assert(this.accts[networkID][coinName].addr === addr);
                        assert(this.accts[networkID][coinName].decimals === coinProp.decimals);
                    }
                }
            }
        }

    }

    public get state(): Object {
        return this.accts;
    }

    public copyState(unwrapBalance = false, stringify = false): Object {
        let newState = {};
        for (const [networkID, netProp] of Object.entries(this.accts)) {
            if (!(networkID in newState)) {
                newState[networkID] = {};
            }

            for (const [coinName, coinProp] of Object.entries(netProp)) {
                newState[networkID][coinName] = {
                    addr: coinProp["addr"],
                    decimals: coinProp["decimals"]
                };

                let balances = coinProp["balances"];
                if (unwrapBalance && Object.keys(balances).length == 1) {
                    // Unwrap
                    let bal = balances[Object.keys(balances)[0]] as BigNumber;
                    newState[networkID][coinName]["balance"] = stringify ? bal.toFixed() : bal;
                } else {
                    let nb = {}
                    for (const [pubKey, bal] of Object.entries(balances)) {
                        nb[pubKey] = stringify ? (bal as BigNumber).toFixed() : bal;
                    }
                    newState[networkID][coinName]["balances"] = nb;
                }
            }
        }
        //console.log(JSON.stringify(newState, null, 4));
        return newState;
    }

    public static diffBalances(stateA: Object, stateB: Object): Object {
        let newState = {};
        for (const [networkID, netProp] of Object.entries(stateA)) {
            if (!(networkID in newState)) {
                newState[networkID] = {};
            }

            for (const [coinName, coinProp] of Object.entries(netProp)) {
                newState[networkID][coinName] = {
                    addr: coinProp["addr"],
                    decimals: coinProp["decimals"],
                    balances: {}
                };

                for (const [pubKey, bal] of Object.entries(coinProp["balances"])) {
                    let prevBalance = stateB[networkID]?.[coinName]?.["balances"]?.[pubKey];
                    let newBalance: BigNumber;
                    if (prevBalance !== undefined) {
                        newBalance = (bal as BigNumber).minus(prevBalance);
                        //newState[networkID][coinName][pubKey] = (new BigNumber(String(val))).minus(prevBalance).toFixed();
                    } else {
                        newBalance = bal as BigNumber;
                        //newState[networkID][coinName][pubKey] = String(val);
                    }

                    if (!newBalance.isEqualTo(0)) {
                        newState[networkID][coinName]["balances"][pubKey] = newBalance;
                    }
                }

                if (Object.keys(newState[networkID][coinName]["balances"]).length === 0) {
                    // Remove redundant info
                    delete newState[networkID][coinName];
                }
            }
        }

        return newState;
    }

    public static sumAcctsBalances(state: Object): Object {
        let newState = {};
        for (const [networkID, netProp] of Object.entries(state)) {
            for (const [coinName, coinProp] of Object.entries(netProp)) {
                for (const [pubKey, bal] of Object.entries(coinProp["balances"])) {
                    if (!(coinName in newState)) {
                        newState[coinName] = {
                            decimals: coinProp["decimals"],
                            balance: new BigNumber(0)
                        }
                    }

                    assert(coinProp["decimals"] === newState[coinName]["decimals"]);
                    newState[coinName]["balance"] = newState[coinName]["balance"].plus(bal);
                }

                if (newState[coinName]["balance"].isEqualTo(0)) {
                    // Remove redundant info
                    delete newState[coinName];
                }
            }
        }

        return newState;
    }

    // public static convertToDecimals(state: Object, decimals: number = null): Object {
    //     let newState = {};

    //     decimals = state["decimals"] !== undefined ? state["decimals"] : decimals;

    //     for (const [k, v] of Object.entries(state)) {
    //         if (v.constructor.name === "Object") {
    //             newState[k] = CoinWallet.convertToDecimals(v, decimals);
    //         } else if (v.constructor.name === "BigNumber") {
    //             newState[k] = v.shiftedBy(-decimals);
    //         } else {
    //             newState[k] = v;
    //         }
    //     }

    //     return newState;
    // }

    public update(): Promise<any> {
        let allPromises = [];
        for (const [networkID, api] of Object.entries(this.netToAPIMap)) {
            if (networkID in this.accts) {
                for (const [coinName, coinProp] of Object.entries(this.accts[networkID])) {
                    for (const pubKey of Object.keys(coinProp["balances"])) {
                        allPromises.push(api.balanceOf(coinProp["addr"], pubKey).then((res) => {
                            coinProp["balances"][pubKey] = new BigNumber(res.toString()).shiftedBy(-coinProp["decimals"]);
                        }));
                    }
                }
            }
        }

        return Promise.all(allPromises);
    }
}