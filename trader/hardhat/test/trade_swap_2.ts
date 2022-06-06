const hre = require("hardhat");
const ethers = hre.ethers;

import { testSwaps } from "./test_swap_utils";

describe("Trade swap 2", function () {
    const tradePath = {
        "path": [
            {
                "node": {
                    "name": "USDT",
                    "peg": "USD"
                },
                "edge": null
            },
            {
                "node": {
                    "name": "MATIC",
                    "peg": null
                },
                "edge": {
                    "addr": "0x604229c960e5CACF2aaEAc8Be68Ac07BA9dF81c3",
                    "token1": {
                        "name": "MATIC",
                        "addr": "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
                        "decimals": 18,
                        "peg": null
                    },
                    "token2": {
                        "name": "USDT",
                        "addr": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                        "decimals": 6,
                        "peg": "USD"
                    },
                    "token1Reserve": "3127932.879598814788332828",
                    "token2Reserve": "5072908.033708",
                    "timestamp": 1646145319,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "QuickSwap V2 (Polygon)"
                }
            },
            {
                "node": {
                    "name": "ETH",
                    "peg": "ETH"
                },
                "edge": {
                    "addr": "0xc4e595acDD7d12feC385E5dA5D43160e8A0bAC0E",
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
                    "token1Reserve": "5734948.737834021326331185",
                    "token2Reserve": "3132.66224457636921146",
                    "timestamp": 1646144934,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Polygon)"
                }
            },
            {
                "node": {
                    "name": "USDT",
                    "peg": "USD"
                },
                "edge": {
                    "addr": "0xF6422B997c7F54D1c6a6e103bcb1499EeA0a7046",
                    "token1": {
                        "name": "ETH",
                        "addr": "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token2": {
                        "name": "USDT",
                        "addr": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                        "decimals": 6,
                        "peg": "USD"
                    },
                    "token1Reserve": "4612.885395431931395425",
                    "token2Reserve": "13921991.615642",
                    "timestamp": 1646145080,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "QuickSwap V2 (Polygon)"
                }
            }
        ],
        "optimalVol": 9818.274135139154,
        "optimalDelta": 36.223216961995284,
        "swapPrice": 1.007392345504684,
        "liquidity": 7113124104515.625,
        "thresholdDelta": 20.0
    };

    testSwaps(tradePath, false, 8490);
});
