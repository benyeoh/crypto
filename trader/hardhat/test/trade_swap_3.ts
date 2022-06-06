const hre = require("hardhat");
const ethers = hre.ethers;

import { testSwaps } from "./test_swap_utils";

describe("Trade swap 3", function () {
    const tradePath = {
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
                    "addr": "0x34965ba0ac2451A34a0471F04CCa3F990b8dea27",
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
                    "token1Reserve": "9501812.475001",
                    "token2Reserve": "3985.188392787140078727",
                    "timestamp": 1645690099,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Polygon)"
                }
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
                    "token1Reserve": "459973355.083058696966801621",
                    "token2Reserve": "735.683326239039510925",
                    "timestamp": 1645690087,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Arbitrum)"
                }
            },
            {
                "node": {
                    "name": "USDT",
                    "peg": "USD"
                },
                "edge": {
                    "addr": "0x4E76CdF203ff49F1211535fD84711717E769B76c",
                    "token1": {
                        "name": "USDT",
                        "addr": "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
                        "decimals": 6,
                        "peg": "USD"
                    },
                    "token2": {
                        "name": "SPELL",
                        "addr": "0xcdb3c70cd25fd15307d84c4f9d37d5c043b33fb2",
                        "decimals": 18,
                        "peg": null
                    },
                    "token1Reserve": "99.932673",
                    "token2Reserve": "7853.66487813222018092",
                    "timestamp": 1643713517,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "QuickSwap V2 (Polygon)"
                }
            }
        ],
        "optimalVol": 24.733657426192668,
        "optimalDelta": 20.2433679911835,
        "swapPrice": 3.306775999426717,
        "liquidity": 3010.8405775973265,
        "thresholdDelta": 20.0
    };

    testSwaps(tradePath, true, 8500);
});
