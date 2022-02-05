#!/usr/bin/env -S npx ts-node
const assert = require("assert");
import * as cpmm from "../src/cpmm";

function testSimpleSwapPath() {
    const test_path1 = [
        
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

    const test_path2 = [
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
                "name": "BTC",
                "addr": "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
                "decimals": 8
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
        },
        {
            "node": {
                "name": "ETH",
                "addr": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                "decimals": 18
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
        }
    ];

    let model = new cpmm.CPMM(test_path1);
    let swapPrice = model.computeSwapPrice();
    console.log(`Swap Price 1: ${swapPrice}`);
    assert(Math.abs(swapPrice - 0.996) <= 0.001);
    let maxVol = model.computeMaxVolume();
    console.log(`Max Volume 1: ${maxVol}`);
    assert(Math.abs(maxVol - (-947.1522)) <= 0.001);
    let delta = model.computeDelta(1.0);
    console.log(`Delta 1: ${delta}`);
    assert(delta < 0 && Math.abs(delta - (-0.003846)) <= 0.001);

    model = new cpmm.CPMM(test_path2);
    swapPrice = model.computeSwapPrice();
    console.log(`Swap Price 2: ${swapPrice}`);
    //assert(Math.abs(swapPrice - 0.996) <= 0.001);
    maxVol = model.computeMaxVolume();
    console.log(`Max Volume 2: ${maxVol}`);
    //assert(Math.abs(maxVol - (-947.1522)) <= 0.001);
    delta = model.computeDelta(1.0);
    console.log(`Delta 2: ${delta}`);
    //assert(delta < 0 && Math.abs(delta - (-0.003846)) <= 0.001);
}

testSimpleSwapPath();
console.log("\nNo errors found!\n")
