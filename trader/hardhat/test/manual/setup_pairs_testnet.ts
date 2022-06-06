#!/usr/bin/env -S npx ts-node
const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");

import { program } from "commander";
import { exit } from "process";
import { tradePathToNetworks } from "../test_swap_utils";
import { BigNumber } from "bignumber.js"
import { assert } from "console";


function getOverrides(netID, networkMap) {
    let prop = networkMap[netID];
    let overrides = Object.assign({}, prop["overrides"]);
    return overrides;
}

async function setupCoins(networks, coins, networkMap) {
    for (const [networkID, networkProp] of Object.entries(networks)) {
        let overrides = getOverrides(networkID, networkMap);
        // if (networkID === "fantom") {
        //     continue;
        // }
        for (const [coinID, coinProp] of Object.entries(networkProp["coins"])) {
            if (!(coinID in coins)) {
                coins[coinID] = {
                    decimals: coinProp["decimals"],
                    address: {},
                    peg: coinProp["peg"]
                };
            }

            if (!(networkID in coins[coinID].address)) {
                // Create coin
                let ERC20Test = await ethers.getContractFactory("ERC20Test", networkProp["signer"]);

                let totalSupply = new BigNumber("1000000000000").shiftedBy(coinProp["decimals"]).toFixed();
                console.log("Deploying ...")
                let coin = await ERC20Test.deploy(coinID, coinID, coinProp["decimals"], totalSupply, overrides);
                console.log(coin);
                console.log("Waiting ...");
                await coin.deployed();
                coins[coinID].address[networkID] = coin.address;
                console.log("Deployed!");

                let balance = new BigNumber(ethers.utils.formatUnits(await coin.balanceOf(await networkProp["signer"].getAddress()), await coin.decimals()));
                console.log(`New coin ${coinID} @ ${networkID} with address ${coin.address}, balance = ${balance}`);
            }

            coinProp["addr"] = coins[coinID].address[networkID];
        }
    }
}

async function setupPairs(tradePath, networkMap, acctKey, coins, netPairs) {
    let networks = tradePathToNetworks(tradePath);

    for (const [networkID, networkProp] of Object.entries(networks)) {
        let prov = new ethers.providers.JsonRpcProvider(networkMap[networkID].rpc);
        networkProp["provider"] = prov;
        networkProp["signer"] = new ethers.Wallet(acctKey, prov);
    }

    console.log("Setting up coins ...");
    await setupCoins(networks, coins, networkMap);

    // Utility fn
    function findPair(token1Name, token2Name, exchangeID, allPairs) {
        for (const pair of allPairs) {
            if (((pair["token1"]["name"] === token1Name && pair["token2"]["name"] === token2Name) ||
                (pair["token2"]["name"] === token1Name && pair["token1"]["name"] === token2Name)) &&
                (pair["exchangeID"] === exchangeID)) {
                return pair;
            }
        }

        return null;
    }

    // Setup pairs
    console.log("Setting up pairs ...");
    for (const [networkID, networkProp] of Object.entries(networks)) {

        for (const [pairAddr, pairProp] of Object.entries(networkProp["pairs"])) {
            if (!(networkID in netPairs)) {
                netPairs[networkID] = {
                    factory: {},
                    pairs: []
                }
            }

            let overrides = getOverrides(networkID, networkMap);
            if (netPairs[networkID]["factory"][pairProp["exchangeID"]] === undefined) {
                let UniswapV2Factory = await ethers.getContractFactory("UniswapV2FactoryTest", networkProp["signer"]);
                console.log(`Deploying factory @ ${networkID}`);
                let contract = await UniswapV2Factory.deploy(await networkProp["signer"].getAddress(), overrides);
                console.log(`Waiting ...`);
                await contract.deployed();
                console.log(`Deployed ...`);

                netPairs[networkID]["factory"][pairProp["exchangeID"]] = contract.address;
                console.log(`Deployed factory @ ${networkID} / ${pairProp["exchangeID"]} with address ${contract.address}`);
            }

            let pair = findPair(pairProp["token1Name"], pairProp["token2Name"], pairProp["exchangeID"], netPairs[networkID]["pairs"]);
            if (pair == null) {
                // Create pair
                let factoryContract = await ethers.getContractAt("UniswapV2Factory", netPairs[networkID]["factory"][pairProp["exchangeID"]], networkProp["signer"]);
                let token1Addr = coins[pairProp["token1Name"]].address[networkID]; //networkProp["coins"][pairProp["token1Name"]]["addr"];
                let token2Addr = coins[pairProp["token2Name"]].address[networkID];
                console.log("Creating pair ...");
                let tx = await factoryContract.createPair(token1Addr, token2Addr, overrides);
                console.log("Waiting ...");
                await tx.wait();
                console.log("Pair created ...");
                let pairAddr = await factoryContract.getPair(token1Addr, token2Addr);
                pair = {
                    addr: pairAddr,
                    token1: {
                        name: pairProp["token1Name"],
                        addr: token1Addr,
                        decimals: coins[pairProp["token1Name"]].decimals,
                        peg: coins[pairProp["token1Name"]].peg
                    },
                    token2: {
                        name: pairProp["token2Name"],
                        addr: token2Addr,
                        decimals: coins[pairProp["token2Name"]].decimals,
                        peg: coins[pairProp["token2Name"]].peg
                    },
                    token1Reserve: pairProp["reserve1"].shiftedBy(-coins[pairProp["token1Name"]].decimals),
                    token2Reserve: pairProp["reserve2"].shiftedBy(-coins[pairProp["token2Name"]].decimals),
                    rateA: pairProp["rateA"],
                    rateB: pairProp["rateB"],
                    exchangeID: pairProp["exchangeID"]
                };

                // Swap tokens if order is different
                let pairContract = await ethers.getContractAt("UniswapV2PairTest", pair.addr, networkProp["signer"]);
                if (await pairContract.token0() === pair.token2.addr) {
                    let tmp = pair.token1;
                    pair.token1 = pair.token2;
                    pair.token2 = tmp;

                    let tmp2 = pair.token1Reserve;
                    pair.token1Reserve = pair.token2Reserve;
                    pair.token2Reserve = tmp2;
                }

                netPairs[networkID]["pairs"].push(pair);
                console.log(`Deployed ${pair.token1.name}/${pair.token2.name} @ ${networkID} with address ${pair.addr}`);
            } else {
                // Swap tokens if order is different
                let pairContract = await ethers.getContractAt("UniswapV2PairTest", pair.addr, networkProp["signer"]);
                assert(await pairContract.token0() === pair.token1.addr, `Address is different!`);

                // pair.token1 = {
                //     name: pairProp["token1Name"],
                //     addr: token1Addr,
                //     decimals: coins[pairProp["token1Name"]].decimals,
                //     peg: coins[pairProp["token1Name"]].peg
                // };
                // pair.token2 = {
                //     name: pairProp["token2Name"],
                //     addr: token2Addr,
                //     decimals: coins[pairProp["token2Name"]].decimals,
                //     peg: coins[pairProp["token2Name"]].peg
                // };
                pair.token1Reserve = pairProp["reserve1"].shiftedBy(-coins[pairProp["token1Name"]].decimals);
                pair.token2Reserve = pairProp["reserve2"].shiftedBy(-coins[pairProp["token2Name"]].decimals);
                pair.rateA = pairProp["rateA"];
                pair.rateA = pairProp["rateB"];

                if (pair.token1.name === pairProp["token2Name"]) {
                    // let tmp = pair.token1;
                    // pair.token1 = pair.token2;
                    // pair.token2 = tmp;

                    let tmp2 = pair.token1Reserve;
                    pair.token1Reserve = pair.token2Reserve;
                    pair.token2Reserve = tmp2;
                }
            }

            // Set amount to be same as trade path
            let pairContract = await ethers.getContractAt("UniswapV2PairTest", pair.addr, networkProp["signer"]);

            // Burn all liquidity
            let liquidity = await pairContract.balanceOf(networkProp["signer"].getAddress());
            liquidity = new BigNumber(liquidity.toString());
            if (liquidity.isGreaterThan(0)) {
                console.log(`${pair.token1.name}/${pair.token2.name} @ ${networkID} - Burning: ${liquidity.toFixed()}`)
                await pairContract.transfer(pair.addr, liquidity.toFixed(), overrides);
                let tx = await pairContract.burn(networkProp["signer"].getAddress(), overrides);
                await tx.wait();
            }

            // Then set the pool back to be the same as the spec
            let coin1Contract = await ethers.getContractAt("ERC20Test", pair.token1.addr, networkProp["signer"]);
            let coin2Contract = await ethers.getContractAt("ERC20Test", pair.token2.addr, networkProp["signer"]);
            let { _reserve0, _reserve1 } = await pairContract.getReserves();

            let amount1 = (new BigNumber(pair.token1Reserve)).shiftedBy(pair.token1.decimals).minus(new BigNumber(_reserve0.toString()));
            let amount2 = (new BigNumber(pair.token2Reserve)).shiftedBy(pair.token2.decimals).minus(new BigNumber(_reserve1.toString()));
            let tx = await coin1Contract.transfer(pair.addr, amount1.toFixed(), overrides);
            tx = await coin2Contract.transfer(pair.addr, amount2.toFixed(), overrides);
            tx = await pairContract.mint(await networkProp["signer"].getAddress(), overrides);
            await tx.wait();

            {
                let { _reserve0, _reserve1 } = await pairContract.getReserves();
                let reserve0Shifted = ethers.utils.formatUnits(_reserve0, pair.token1.decimals);
                let reserve1Shifted = ethers.utils.formatUnits(_reserve1, pair.token2.decimals);
                console.log(`Set pair ${pair.token1.name}/${pair.token2.name} @ ${networkID} with reserves ${reserve0Shifted} / ${reserve1Shifted}`);
            }
        }
    }
}

if (require.main === module) {
    // program.requiredOption('-p, --pairs <path to json>', "Input path to pairs data json. Accepts >1 files with wildcards.");
    program.option('-n, --networkMap <path to json>', "Path to json containing network name to URL mapping.", __dirname + "/testnets.json");
    program.option('-c, --coins <path to json>', "Path to json containing coin specs", __dirname + "/testcoins.json");
    program.option('-p, --pairs <path to json>', "Path to json containing network pair specs", __dirname + "/testpairs.json");
    program.option('-t, --tradePath <path to json>', "Path to json containing a trade path", __dirname + "/testtrade.json");
    program.option('-f, --fetchSpecOut <output path to fetch spec>', "Output path to fetchSpec json", __dirname + "/testfetch_spec.json");
    program.option('-k, --key <key string>', "Private key of account");
    program.option('-r, --reset', "Reset params.");
    program.parse();
    const options = program.opts();

    let networkMap = JSON.parse(fs.readFileSync(options.networkMap, "utf8"));
    let tradePath = JSON.parse(fs.readFileSync(options.tradePath, "utf8"));

    let netPairs = {};
    let coins = {};

    if (!options.reset) {
        try {
            netPairs = JSON.parse(fs.readFileSync(options.pairs, "utf8"));
        } catch (error) {
            console.log("Pairs missing ...");
        }

        try {
            coins = JSON.parse(fs.readFileSync(options.coins, "utf8"));
        } catch (error) {
            console.log("Coins missing ...");
        }
    }

    setupPairs(tradePath, networkMap, options.key, coins, netPairs).then(() => {
        fs.writeFileSync(options.pairs, JSON.stringify(netPairs, null, 4));
        fs.writeFileSync(options.coins, JSON.stringify(coins, null, 4));

        // Write fetchSpec
        let fetchSpec = {};
        for (const [netID, netProp] of Object.entries(netPairs)) {
            if (!(netID in fetchSpec)) {
                fetchSpec[netID] = {};
            }

            for (const [exchID, addr] of Object.entries(netProp["factory"])) {
                let exchange = exchID.match(/.+(?= \((.*\)))/)[0];
                fetchSpec[netID][exchange] = {
                    fetch_dex: {
                        factory: addr,
                        rpcs: [networkMap[netID]["rpc"]],
                    }
                };

                if ("multicall" in networkMap[netID]) {
                    fetchSpec[netID][exchange].fetch_dex.multicall = networkMap[netID]["multicall"];
                }
            }
        }
        fs.writeFileSync(options.fetchSpecOut, JSON.stringify(fetchSpec, null, 4));

        console.log("Done!");
        exit();
    });
}
