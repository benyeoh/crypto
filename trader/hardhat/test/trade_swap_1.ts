const hre = require("hardhat");
const ethers = hre.ethers;

import { testSwaps } from "./test_swap_utils";

describe("Trade swap 1", function () {
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
                    "token1Reserve": "21870.672890686456117494",
                    "token2Reserve": "57488921.798579",
                    "timestamp": 1645466992,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Arbitrum)"
                }
            },
            {
                "node": {
                    "name": "USDC",
                    "peg": "USD"
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
                    "token1Reserve": "10020269.46593",
                    "token2Reserve": "3775.514497027048584556",
                    "timestamp": 1645467060,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Polygon)"
                }
            }
        ],
        "optimalVol": 15412.16138869427,
        "optimalDelta": 27.910798238485413,
        "swapPrice": 1.0036251983345983,
        "liquidity": 72473025625154.8,
        "thresholdDelta": 20.0
    };

    testSwaps(tradePath, false, 8450);
});
