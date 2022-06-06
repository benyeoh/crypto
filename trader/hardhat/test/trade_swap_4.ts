const hre = require("hardhat");
const ethers = hre.ethers;

import { testSwaps } from "./test_swap_utils";

describe("Trade swap 4", function () {
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
                    "name": "BTC",
                    "peg": "BTC"
                },
                "edge": {
                    "addr": "0xF6a637525402643B0654a54bEAd2Cb9A83C8B498",
                    "token1": {
                        "name": "BTC",
                        "addr": "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
                        "decimals": 8,
                        "peg": "BTC"
                    },
                    "token2": {
                        "name": "USDC",
                        "addr": "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                        "decimals": 6,
                        "peg": "USD"
                    },
                    "token1Reserve": "123.97245575",
                    "token2Reserve": "4787215.775883",
                    "timestamp": 1645783260,
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
                    "addr": "0x33e29a9eBdD370a8D50656e822aBFD3A910dA1b6",
                    "token1": {
                        "name": "BTC",
                        "addr": "0x321162cd933e2be498cd2267a90534a804051b11",
                        "decimals": 8,
                        "peg": "BTC"
                    },
                    "token2": {
                        "name": "ETH",
                        "addr": "0x74b23882a30290451a17c44f4f05243b6b58c76d",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token1Reserve": "43.21194667",
                    "token2Reserve": "637.044790126624440508",
                    "timestamp": 1645780698,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Fantom)"
                }
            },
            {
                "node": {
                    "name": "DAI",
                    "peg": "USD"
                },
                "edge": {
                    "addr": "0x692a0B300366D1042679397e40f3d2cb4b8F7D30",
                    "token1": {
                        "name": "ETH",
                        "addr": "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
                        "decimals": 18,
                        "peg": "ETH"
                    },
                    "token2": {
                        "name": "DAI",
                        "addr": "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
                        "decimals": 18,
                        "peg": "USD"
                    },
                    "token1Reserve": "87.98234467566211834",
                    "token2Reserve": "237834.627911755928308297",
                    "timestamp": 1645783754,
                    "rateA": 0.997,
                    "rateB": 1,
                    "exchangeID": "SushiSwap V2 (Arbitrum)"
                }
            }
        ],
        "optimalVol": 2216.883193268389,
        "thresholdDelta": 20.0,
        "optimalDelta": 25.085247792368943,
        "swapPrice": 1.022759137269388,
        "liquidity": 39138392060.84949
    };

    testSwaps(tradePath, true, 8520);
});
