#!/usr/bin/env -S npx ts-node
const assert = require("assert");
import { BigNumber } from "bignumber.js"
import * as cpmm from "../../pairs_arbitrage/src/cpmm";
import { filterTrades } from "../src/trade_filter.js";

function getWalletState(tradePaths, multiplier = 1.0) {
    let walletState = {};

    for (let tradePath of tradePaths) {
        let model = new cpmm.CPMM(tradePath.path);
        let curInputVol = new BigNumber(tradePath["optimalVol"]);

        let trades = {};
        let prevNetworkID = null;
        let outVolPerPath = model.swapPath(curInputVol, true);

        for (let i = 1; i < tradePath.path.length; i++) {
            let pathNode = tradePath.path[i];
            let outputTokenInfo = pathNode["node"];
            let networkID = pathNode["edge"].exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();
            let pairInfo = pathNode["edge"];

            let inputToken = pairInfo.token1;
            let outputToken = pairInfo.token2;

            if (outputTokenInfo.name === pairInfo.token1.name) {
                // Swap order
                inputToken = pairInfo.token2;
                outputToken = pairInfo.token1;
            }

            if (!(networkID in trades)) {
                trades[networkID] = [];
            }

            if (networkID !== prevNetworkID) {
                if (!(networkID in walletState)) {
                    walletState[networkID] = {}
                }

                if (!(inputToken.name in walletState[networkID])) {
                    walletState[networkID][inputToken.name] = {
                        addr: null,
                        decimals: inputToken.decimals,
                        balances: {
                            "abc": null
                        }
                    }
                }

                let inputVol;
                if (i === 1) {
                    inputVol = curInputVol.multipliedBy(multiplier);
                } else {
                    let prevOutput = outVolPerPath[i - 2];
                    inputVol = prevOutput.multipliedBy(multiplier);
                }

                if (walletState[networkID][inputToken.name].balances["abc"] == null ||
                    walletState[networkID][inputToken.name].balances["abc"].isLessThan(inputVol)) {
                    walletState[networkID][inputToken.name].balances["abc"] = inputVol;
                }

                prevNetworkID = networkID;
            }
        }
    }

    return walletState;
}

function testSimpleSwapPath() {
    const testPath = {
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
                    "token1Reserve": "11680.095846717887556794",
                    "token2Reserve": "29547724.597831",
                    "timestamp": 1645743023,
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
                    "addr": "0xadbF1854e5883eB8aa7BAf50705338739e558E5b",
                    "token1": {
                        "name": "MATIC",
                        "addr": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "ETH",
                        "addr": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token1Reserve": "16419881.532367684352952279",
                    "token2Reserve": "9017.942370164318888119",
                    "timestamp": 1645742903,
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
                    "addr": "0x6e7a5FAFcec6BB1e78bAE2A1F0B612012BF14827",
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
                    "token1Reserve": "9266104.976277414145019704",
                    "token2Reserve": "13077888.959924",
                    "timestamp": 1645742911,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "QuickSwap V2 (Polygon)"
                }
            }
        ],
        "optimalVol": 21756.283074466384,
        "optimalDelta": 73.03238918381689,
        "swapPrice": 1.006724950948921,
        "liquidity": 42161279023367.836,
        "thresholdDelta": 20.0
    };

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
        "liquidity": 20782.34467779322,
        "thresholdDelta": 17.0
    }

    const testPath3 = {
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
        "liquidity": 143379480480239.6,
        "thresholdDelta": 20.0
    };

    const testPath4 = {
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
        "arbFactor": 1.0238842466669096,
        "thresholdDelta": 15.0
    };

    let walletState = getWalletState([testPath, testPath2, testPath3, testPath4], 1.0);
    // console.log(JSON.stringify(walletState, null, 4));
    let filteredTrades = filterTrades([testPath2, testPath4, testPath, testPath3], walletState, 2, 10);
    console.log(JSON.stringify(filteredTrades, null, 4));
    assert(filteredTrades[filteredTrades.length - 1].optimalDelta === testPath3.optimalDelta);
    assert(filteredTrades[filteredTrades.length - 1].optArbFactor.isLessThan(1.0));

    let model = new cpmm.CPMM(testPath3.path);
    assert(model.computeArbitrageFactor(filteredTrades[filteredTrades.length - 1].optArbInputVol).isEqualTo(filteredTrades[filteredTrades.length - 1].optArbFactor));
}

testSimpleSwapPath();
console.log("\nNo errors found!\n")
