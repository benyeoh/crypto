#!/usr/bin/env -S npx ts-node
const assert = require("assert");
import { BigNumber } from "bignumber.js"
import * as cpmm from "../src/cpmm";

class CPMMSim {

    private path;
    constructor(path) {
        this.path = path;
    }

    swap(vol) {
        let volOut;
        let volIn = new BigNumber(vol);
        for (let i = 1; i < this.path.length; i++) {
            let pathNode = this.path[i];
            let tokenInfo = pathNode["node"];
            let pairInfo = pathNode["edge"];
            let reserve1 = new BigNumber(pairInfo.token1Reserve);
            let reserve2 = new BigNumber(pairInfo.token2Reserve);
            let rateA = new BigNumber(pairInfo.rateA);
            let rateB = new BigNumber(pairInfo.rateB);
            if (tokenInfo.name === pairInfo.token1.name) {
                // Swap order
                let tmpReserve = reserve1;
                reserve1 = reserve2;
                reserve2 = tmpReserve;
            }

            volOut = (rateA.multipliedBy(rateB).multipliedBy(reserve2).multipliedBy(volIn)).dividedBy(reserve1.plus(rateA.multipliedBy(volIn)));
            volIn = volOut;
        }

        return volOut;
    }
}

function testSimpleSwapPath() {
    const testPath = [

        {
            "node": {
                "name": "USDC",
                "addr": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                "decimals": 6
            },
            "edge": null
        },
        {
            "node": {
                "name": "ETH",
                "addr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                "decimals": 18
            },
            "edge": {
                "addr": "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc",
                "token1": {
                    "name": "USDC",
                    "addr": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                    "decimals": 6
                },
                "token2": {
                    "name": "ETH",
                    "addr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                    "decimals": 18
                },
                "token1Reserve": "107882978.172857",
                "token2Reserve": "41492.995329546261157873",
                "timestamp": 1643887343,
                "rateA": 0.997,
                "rateB": 1
            }
        },
        {
            "node": {
                "name": "BTC",
                "addr": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
                "decimals": 8
            },
            "edge": {
                "addr": "0xBb2b8038a1640196FbE3e38816F3e67Cba72D940",
                "token1": {
                    "name": "BTC",
                    "addr": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
                    "decimals": 8
                },
                "token2": {
                    "name": "ETH",
                    "addr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                    "decimals": 18
                },
                "token1Reserve": "398.97628411",
                "token2Reserve": "5581.183277624102682414",
                "timestamp": 1643886084,
                "rateA": 0.997,
                "rateB": 1
            }
        },
        {
            "node": {
                "name": "USDC",
                "addr": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                "decimals": 6
            },
            "edge": {
                "addr": "0x004375Dff511095CC5A197A54140a24eFEF3A416",
                "token1": {
                    "name": "BTC",
                    "addr": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
                    "decimals": 8
                },
                "token2": {
                    "name": "USDC",
                    "addr": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
                    "decimals": 6
                },
                "token1Reserve": "6.84848333",
                "token2Reserve": "250377.037837",
                "timestamp": 1643884223,
                "rateA": 0.997,
                "rateB": 1
            }
        }
    ];

    const testPath2 = {
        "path": [
            {
                "node": {
                    "name": "MATIC",
                    "peg": null
                },
                "edge": null
            },
            {
                "node": {
                    "name": "LINK",
                    "peg": null
                },
                "edge": {
                    "addr": "0x3c986748414A812e455DCd5418246B8fdEd5C369",
                    "token1": {
                        "name": "MATIC",
                        "addr": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "LINK",
                        "addr": "0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39",
                        "decimals": 18,
                        "peg": null
                    },
                    "token1Reserve": "1819.059431309454858423",
                    "token2Reserve": "189.7396226819286458",
                    "timestamp": 1645278753,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "QuickSwap V2 (Polygon)"
                }
            },
            {
                "node": {
                    "name": "USDC",
                    "peg": "USD"
                },
                "edge": {
                    "addr": "0x6F6BA3571A607E62F4B7F722E019925269E90f5A",
                    "token1": {
                        "name": "LINK",
                        "addr": "0xf97f4df75117a78c1a5a0dbb814af92458539fb4",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "USDC",
                        "addr": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
                        "decimals": 6,
                        "peg": "USD"
                    },
                    "token1Reserve": "15.288486436110753299",
                    "token2Reserve": "263.120684",
                    "timestamp": 1643967221,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Arbitrum)"
                }
            },
            {
                "node": {
                    "name": "MATIC",
                    "peg": null
                },
                "edge": {
                    "addr": "0xcd353F79d9FADe311fC3119B841e1f456b54e858",
                    "token1": {
                        "name": "MATIC",
                        "addr": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "USDC",
                        "addr": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                        "decimals": 6,
                        "peg": "USD"
                    },
                    "token1Reserve": "1567161.234404946185752467",
                    "token2Reserve": "2489070.305107",
                    "timestamp": 1645281162,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Polygon)"
                }
            }
        ],
        "optimalVol": 7.9607525091551885,
        "optimalDelta": 0.464558455131201,
        "swapPrice": 1.12011763058677,
        "liquidity": 20782.34467779322
    }

    let model = new cpmm.CPMM(testPath);
    let swapPrice = model.computeSwapPrice();
    console.log(`Swap Price 1: ${swapPrice}`);
    assert(Math.abs(swapPrice - 0.996) <= 0.001);
    let maxVol = model.computeMaxVolume();
    console.log(`Max Volume 1: ${maxVol}`);
    assert(Math.abs(maxVol - (-947.1522)) <= 0.001);
    let delta = model.computeDelta(1.0);
    console.log(`Delta 1: ${delta}`);
    assert(delta < 0 && Math.abs(delta - (-0.003846)) <= 0.001);
    let optVol = model.computeOptimalVolume();
    console.log(`Optimal Volume 1: ${optVol}`);
    assert(Math.abs(optVol) < Math.abs(maxVol));
    let befDelta = model.computeDelta(optVol - optVol * 0.1);
    let optDelta = model.computeDelta(optVol);
    let aftDelta = model.computeDelta(optVol + optVol * 0.1);
    console.log(`Before 1: ${befDelta}, Opt 1: ${optDelta}, After 1: ${aftDelta}`);
    assert(optDelta > befDelta && optDelta > aftDelta);
    let simModel = new CPMMSim(testPath);
    let diff = simModel.swap(optVol).minus(optVol).minus(optDelta).toNumber();
    assert(Math.abs(diff) < 1e-10);

    console.log("");

    model = new cpmm.CPMM(testPath2.path);
    swapPrice = model.computeSwapPrice();
    console.log(`Swap Price 2: ${swapPrice}`);
    maxVol = model.computeMaxVolume();
    console.log(`Max Volume 2: ${maxVol}`);
    optVol = model.computeOptimalVolume();
    console.log(`Optimal Volume 2: ${optVol}`);
    assert(Math.abs(optVol) < Math.abs(maxVol));
    befDelta = model.computeDelta(optVol - optVol * 0.1);
    optDelta = model.computeDelta(optVol);
    aftDelta = model.computeDelta(optVol + optVol * 0.1);
    console.log(`Before 2: ${befDelta}, Opt 2: ${optDelta}, After 2: ${aftDelta}`);
    assert(optDelta > befDelta && optDelta > aftDelta);

    simModel = new CPMMSim(testPath2.path);
    diff = simModel.swap(optVol).minus(optVol).minus(optDelta).toNumber();
    assert(Math.abs(diff) < 1e-10);
}

testSimpleSwapPath();
console.log("\nNo errors found!\n")
