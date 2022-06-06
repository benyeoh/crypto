#!/usr/bin/env -S npx ts-node
const assert = require("assert");
import { BigNumber } from "bignumber.js"
import * as cpmm from "../src/cpmm";

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

const testPathsAll = [

    {
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
    },

    {
        "path": [
            {
                "node": {
                    "name": "USDC",
                    "peg": "USD"
                },
                "edge": null
            },
            {
                "node": {
                    "name": "ETH",
                    "peg": "ETH"
                },
                "edge": {
                    "addr": "0x853Ee4b2A13f8a742d64C8F088bE7bA2131f670d",
                    "token1": {
                        "name": "USDC",
                        "addr": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                        "decimals": 6,
                        "peg": "USD"
                    },
                    "token2": {
                        "name": "ETH",
                        "addr": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token1Reserve": "19984491.342492",
                    "token2Reserve": "7925.951465748048895714",
                    "timestamp": 1645728905,
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
                    "addr": "0x905dfCD5649217c42684f23958568e533C711Aa3",
                    "token1": {
                        "name": "ETH",
                        "addr": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token2": {
                        "name": "USDC",
                        "addr": "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
                        "decimals": 6,
                        "peg": "USD"
                    },
                    "token1Reserve": "11674.185673527861834727",
                    "token2Reserve": "29804688.994496",
                    "timestamp": 1645728839,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Arbitrum)"
                }
            }
        ],
        "optimalVol": 38686.947637207886,
        "optimalDelta": 125.2092232973151,
        "swapPrice": 1.0064834187771476,
        "liquidity": 143379480480239.6
    },

    {
        "path": [
            {
                "node": {
                    "name": "FTM",
                    "peg": null
                },
                "edge": null
            },
            {
                "node": {
                    "name": "ETH",
                    "peg": "ETH"
                },
                "edge": {
                    "addr": "0xf0702249F4D3A25cD3DED7859a165693685Ab577",
                    "token1": {
                        "name": "FTM",
                        "addr": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "ETH",
                        "addr": "0x74b23882a30290451a17c44f4f05243b6b58c76d",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token1Reserve": "13243716.659962523286063766",
                    "token2Reserve": "9055.012500156651117319",
                    "timestamp": 1646223635,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SpookySwap V2 (Fantom)"
                }
            },
            {
                "node": {
                    "name": "DAI",
                    "peg": "USD"
                },
                "edge": {
                    "addr": "ethdai",
                    "token1": {
                        "name": "ETH",
                        "peg": "ETH"
                    },
                    "token2": {
                        "name": "DAI",
                        "peg": "USD"
                    },
                    "token1Reserve": "204.986",
                    "token2Reserve": "639021.30654",
                    "rateA": 0.9965,
                    "rateB": 1,
                    "exchangeID": "Gemini CEX (Gemini)"
                }
            },
            {
                "node": {
                    "name": "FTM",
                    "peg": null
                },
                "edge": {
                    "addr": "0xe120ffBDA0d14f3Bb6d6053E90E63c572A66a428",
                    "token1": {
                        "name": "FTM",
                        "addr": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "DAI",
                        "addr": "0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e",
                        "decimals": 18,
                        "peg": "USD"
                    },
                    "token1Reserve": "8085765.940884061686009674",
                    "token2Reserve": "16573749.261749923682459353",
                    "timestamp": 1646223638,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SpookySwap V2 (Fantom)"
                }
            }
        ],
        "optimalVol": 4234.482969153565,
        "optimalDelta": 63.05336014313623,
        "swapPrice": 1.0300026270423484,
        "liquidity": 83045973821.00925,
        "arbFactor": 1.0238842466669096
    },

    {

        "path": [
            {
                "node": {
                    "name": "ETH",
                    "peg": "ETH"
                },
                "edge": null
            },
            {
                "node": {
                    "name": "SPELL",
                    "peg": null
                },
                "edge": {
                    "addr": "0x8f93Eaae544e8f5EB077A1e09C1554067d9e2CA8",
                    "token1": {
                        "name": "SPELL",
                        "addr": "0x3e6648c5a70a150a88bce65f4ad4d506fe15d2af",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "ETH",
                        "addr": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token1Reserve": "383404810.929135727096069376",
                    "token2Reserve": "588.694761628542937646",
                    "timestamp": 1649079966,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "sushiswap v2 (arbitrum)"
                }
            },
            {
                "node": {
                    "name": "FTM",
                    "peg": null
                },
                "edge": {
                    "addr": "0x78f82c16992932EfDd18d93f889141CcF326DBc2",
                    "token1": {
                        "name": "FTM",
                        "addr": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "SPELL",
                        "addr": "0x468003b688943977e6130f4f68f23aad939a1040",
                        "decimals": 18,
                        "peg": null
                    },
                    "token1Reserve": "905026.228280818482227515",
                    "token2Reserve": "256448836.268133755223764618",
                    "timestamp": 1649080231,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "spookyswap v2 (fantom)"
                }
            },
            {
                "node": {
                    "name": "ETH",
                    "peg": "ETH"
                },
                "edge": {
                    "addr": "0xf0702249F4D3A25cD3DED7859a165693685Ab577",
                    "token1": {
                        "name": "FTM",
                        "addr": "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "ETH",
                        "addr": "0x74b23882a30290451a17c44f4f05243b6b58c76d",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token1Reserve": "16761797.712164802281714908",
                    "token2Reserve": "7504.055104416327623432",
                    "timestamp": 1649080304,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "spookyswap v2 (fantom)"
                }
            }
        ],
        "optimalVol": 2.255676732321961,
        "optimalDelta": 0.022152786369442224,
        "thresholdDelta": 0.007,
        "swapPrice": 1.0197382597010136,
        "liquidity": 53633.30901676867,
        "arbFactor": 1.0136587450162504
    }

];

function testSimpleSwapPath() {
    let model = new cpmm.CPMM(testPath);
    let swapPrice = model.computeSwapPrice().toNumber();
    console.log(`Swap Price 1: ${swapPrice}`);
    assert(Math.abs(swapPrice - 0.996) <= 0.001);
    let maxVol = model.computeMaxVolume().toNumber();
    console.log(`Max Volume 1: ${maxVol}`);
    assert(Math.abs(maxVol - (-947.1522)) <= 0.001);
    let delta = model.computeDelta(new BigNumber(1.0)).toNumber();
    console.log(`Delta 1: ${delta}`);
    assert(delta < 0 && Math.abs(delta - (-0.003846)) <= 0.001);
    let optVol = model.computeOptimalVolume().toNumber();
    console.log(`Optimal Volume 1: ${optVol}`);
    assert(Math.abs(optVol) < Math.abs(maxVol));
    let befDelta = model.computeDelta(optVol - optVol * 0.1).toNumber();
    let optDelta = model.computeDelta(optVol).toNumber();
    let aftDelta = model.computeDelta(optVol + optVol * 0.1).toNumber();
    console.log(`Before 1: ${befDelta}, Opt 1: ${optDelta}, After 1: ${aftDelta}`);
    assert(optDelta > befDelta && optDelta > aftDelta);
    let simModel = new cpmm.CPMM(testPath);
    let diff = new BigNumber(simModel.swap(optVol)).minus(optVol).minus(optDelta).toNumber();
    assert(Math.abs(diff) < 1e-10);

    console.log("");

    model = new cpmm.CPMM(testPathsAll[0].path);
    swapPrice = model.computeSwapPrice().toNumber();
    console.log(`Swap Price 2: ${swapPrice}`);
    maxVol = model.computeMaxVolume().toNumber();
    console.log(`Max Volume 2: ${maxVol}`);
    optVol = model.computeOptimalVolume().toNumber();
    console.log(`Optimal Volume 2: ${optVol}`);
    assert(Math.abs(optVol) < Math.abs(maxVol));
    befDelta = model.computeDelta(optVol - optVol * 0.1).toNumber();
    optDelta = model.computeDelta(optVol).toNumber();
    aftDelta = model.computeDelta(optVol + optVol * 0.1).toNumber();
    console.log(`Before 2: ${befDelta}, Opt 2: ${optDelta}, After 2: ${aftDelta}`);
    assert(optDelta > befDelta && optDelta > aftDelta);

    diff = new BigNumber(model.swap(optVol)).minus(optVol).minus(optDelta).toNumber();
    assert(Math.abs(diff) < 1e-10);

    model = new cpmm.CPMM(testPathsAll[1].path);
    optVol = model.computeOptimalVolume().toNumber();
    assert(Math.abs(optVol - testPathsAll[1]["optimalVol"]) < 1e-5);
    assert(Math.abs(model.swap(optVol).toNumber() - testPathsAll[1]["optimalVol"]) - testPathsAll[1]["optimalDelta"] < 1e-5);
    assert(Math.abs(model.swap(optVol).toNumber() - model.swapPath(optVol).slice(-1)[0].toNumber()) < 1e-5);
    assert(Math.abs(model.computeVolume(model.swap(optVol)).toNumber() - optVol) < 1e-5);
    console.log(`Swap Path: ${model.swapPath(optVol)}, OptVolume: ${optVol}, Volume: ${model.computeVolume(model.swap(optVol)).toNumber()}`);
    let [arbVol, arbFact] = model.computeMaxNoArbitrageVolume(optVol);
    let arbFactor = model.computeArbitrageFactor(arbVol).toNumber();
    console.log(`Arbitrage factor for ${arbVol}: ${arbFactor}, Delta: ${model.computeDelta(arbVol).toNumber()}`);
    assert(arbFactor < 1.0);

    let arbFactorPerSwap = model.computeArbitrageFactorPerSwap(optVol * 1.0).map(x => x.toNumber());
    assert(Math.max(...arbFactorPerSwap) < 1.0)
    console.log(`Arb Factor Per Swap: ${arbFactorPerSwap}`);
    console.log("");

    model = new cpmm.CPMM(testPathsAll[2].path);
    optVol = model.computeOptimalVolume().toNumber();
    assert(Math.abs(optVol - testPathsAll[2]["optimalVol"]) < 1e-5);
    assert(Math.abs(model.swap(optVol).toNumber() - testPathsAll[2]["optimalVol"]) - testPathsAll[2]["optimalDelta"] < 1e-5);
    assert(Math.abs(model.swap(optVol).toNumber() - model.swapPath(optVol).slice(-1)[0].toNumber()) < 1e-5);
    assert(Math.abs(model.computeVolume(model.swap(optVol)).toNumber() - optVol) < 1e-5);
    console.log(`Swap Path: ${model.swapPath(optVol)}, OptVolume: ${optVol}, Volume: ${model.computeVolume(model.swap(optVol)).toNumber()}`);
    [arbVol, arbFact] = model.computeMaxNoArbitrageVolume(optVol, 6, 0.9999);
    arbFactor = model.computeArbitrageFactor(arbVol).toNumber();
    console.log(`Arbitrage factor for ${arbVol}: ${arbFactor}, Delta: ${model.computeDelta(arbVol).toNumber()}`);
    assert(arbFactor < 1.0);

    arbFactorPerSwap = model.computeArbitrageFactorPerSwap(arbVol).map(x => x.toNumber());
    console.log(`Arb Factor Per Swap: ${arbFactorPerSwap}`);
    assert(Math.max(...arbFactorPerSwap) < 1.0)
}

function testApproxCPMM() {

    for (let i = 0; i < testPathsAll.length; i++) {
        let testPath = testPathsAll[i];
        let model = new cpmm.CPMM(testPath.path);
        let modelApprox = new cpmm.ApproxCPMM(testPath.path);

        let swapPrice = model.computeSwapPrice().toNumber();
        let swapPriceApprox = modelApprox.computeSwapPrice();
        console.log(`Swap Price: ${swapPrice} vs ${swapPriceApprox}`);
        assert(Math.abs(swapPrice - swapPriceApprox) < 1e-5);
        let maxVol = model.computeMaxVolume().toNumber();
        let maxVolApprox = modelApprox.computeMaxVolume();
        console.log(`Max Vol: ${maxVol} vs ${maxVolApprox}`);
        assert(Math.abs(maxVol - maxVolApprox) < 1e-5);
        // assert(Math.abs(maxVol - (-947.1522)) <= 0.001);
        let delta = model.computeDelta(new BigNumber(1.0)).toNumber();
        let deltaApprox = modelApprox.computeDelta(1);
        console.log(`Delta: ${delta} vs ${deltaApprox}`);
        assert(Math.abs(delta - deltaApprox) < 1e-5);
        let optVol = model.computeOptimalVolume().toNumber();
        let optVolApprox = modelApprox.computeOptimalVolume();
        console.log(`Opt Vol: ${optVol} vs ${optVolApprox}`);
        assert(Math.abs(optVol - optVolApprox) < 1e-5);
        let befDeltaApprox = modelApprox.computeDelta(optVolApprox - optVolApprox * 0.1);
        let optDeltaApprox = modelApprox.computeDelta(optVolApprox);
        let aftDeltaApprox = modelApprox.computeDelta(optVolApprox + optVolApprox * 0.1);
        console.log(`Before 1: ${befDeltaApprox}, Opt 1: ${optDeltaApprox}, After 1: ${aftDeltaApprox}`);
        assert(optDeltaApprox > befDeltaApprox && optDeltaApprox > aftDeltaApprox);
        let simModelApprox = new cpmm.ApproxCPMM(testPath.path);
        let diffApprox = simModelApprox.swap(optVolApprox) - (optVolApprox) - (optDeltaApprox);
        console.log(`Diff Approx: ${diffApprox}`);
        assert(Math.abs(diffApprox) < 1e-5);

        let [arbVol, arbFact] = model.computeMaxNoArbitrageVolume(optVol);
        let [arbVolApprox, arbFactApprox] = modelApprox.computeMaxNoArbitrageVolume(optVolApprox);
        console.log(`ArbVol: ${arbVol} vs ${arbVolApprox}`);
        assert(Math.abs(arbVol.toNumber() - arbVolApprox) < 1e-5);
        console.log(`ArbFact: ${arbFact} vs ${arbFactApprox}`);
        assert(Math.abs(arbFact.toNumber() - arbFactApprox) < 1e-5);
        let arbFactor = model.computeArbitrageFactor(arbVol).toNumber();
        let arbFactorApprox = modelApprox.computeArbitrageFactor(arbVolApprox);
        console.log(`Arb Factor: ${arbFactor} vs ${arbFactorApprox}`);
        assert(Math.abs(arbFactor - arbFactorApprox) < 1e-5);
        let arbDelta = model.computeDelta(arbVol).toNumber();
        let arbDeltaApprox = modelApprox.computeDelta(arbVolApprox);
        console.log(`Arb Delta: ${arbDelta} vs ${arbDeltaApprox}`);
        assert(Math.abs(arbDelta - arbDeltaApprox) < 1e-5);
        console.log("");

        let arbFactorPerSwap = model.computeArbitrageFactorPerSwap(optVol * 1.0).map(x => x.toNumber());
        let arbFactorPerSwapApprox = modelApprox.computeArbitrageFactorPerSwap(optVolApprox * 1.0);
        console.log(`ArbFactorPerSwap: ${arbFactorPerSwap} vs ${arbFactorPerSwapApprox}`);
        for (let i = 0; i < arbFactorPerSwapApprox.length; i++) {
            assert(Math.abs(arbFactorPerSwapApprox[i] - arbFactorPerSwap[i]) < 1e-6);
        }
    }
}

testSimpleSwapPath();
testApproxCPMM();
console.log("\nNo errors found!\n")
