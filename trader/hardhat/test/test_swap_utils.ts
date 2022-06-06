const hre = require("hardhat");
const erc20abi = require("@openzeppelin/contracts/build/contracts/IERC20.json");

import { expect } from "chai";
import { BigNumber } from "bignumber.js"
import { compileTrades, CoinWallet, ERC20API, Executor } from "../..";

const ethers = hre.ethers;

export function tradePathToNetworks(tradePath) {
    let networks = {};
    for (let i = 1; i < tradePath["path"].length; i++) {
        let pathNode = tradePath["path"][i];
        // let tokenInfo = pathNode["node"];
        let pairInfo = pathNode["edge"];
        let networkID = pairInfo.exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();
        if (!(networkID in networks)) {
            networks[networkID] = { pairs: {}, coins: {} };
        }

        networks[networkID].pairs[pairInfo.addr] = {
            token1Name: pairInfo.token1.name,
            token2Name: pairInfo.token2.name,
            reserve1: new BigNumber(pairInfo.token1Reserve).shiftedBy(pairInfo.token1.decimals),
            reserve2: new BigNumber(pairInfo.token2Reserve).shiftedBy(pairInfo.token2.decimals),
            rateA: pairInfo.rateA,
            rateB: pairInfo.rateB,
            exchangeID: pairInfo.exchangeID
        };

        if (!(pairInfo.token1.name in networks[networkID].coins)) {
            networks[networkID].coins[pairInfo.token1.name] = {
                decimals: pairInfo.token1.decimals,
                peg: pairInfo.token1.peg
            }
        }

        if (!(pairInfo.token2.name in networks[networkID].coins)) {
            networks[networkID].coins[pairInfo.token2.name] = {
                decimals: pairInfo.token2.decimals,
                peg: pairInfo.token2.peg
            }
        }
    }

    return networks;
}

export function testSwaps(tradePath, peggedToInput = false, startPort = 8485) {
    let networks = tradePathToNetworks(tradePath);

    let portNumOffset = 1;
    for (const [key, value] of Object.entries(networks)) {
        let portNum = startPort + portNumOffset;
        hre.run("node", { hostname: "localhost", port: portNum });
        let prov = new ethers.providers.StaticJsonRpcProvider(`http://localhost:${portNum}`);
        value["provider"] = prov;
        portNumOffset += 1;
    }

    it(`Should have ${Object.keys(networks).length} networks launched`, async function () {
        await new Promise((resolve, _) => setTimeout(() => resolve(""), 1000));
        for (const [key, value] of Object.entries(networks)) {
            let prov = value["provider"];
            let signer1 = await prov.getSigner(1);
            let signer2 = await prov.getSigner(2);
            expect(await signer1.getAddress()).to.not.equal(await signer2.getAddress());
        }
    });

    describe("Networks should have UniswapV2 / coin contracts deployed", function () {

        it("UniswapV2Factory deployed", async function () {
            for (const [k, v] of Object.entries(networks)) {
                let prov = v["provider"];
                let signer = await prov.getSigner(1);
                let UniswapV2Factory = await ethers.getContractFactory("UniswapV2FactoryTest", signer);
                let contract = await UniswapV2Factory.deploy(await signer.getAddress());
                await contract.deployed();

                v["factoryAddr"] = contract.address;
                expect(await prov.getCode(contract.address)).is.not.equal("0x");
                expect(await contract.feeToSetter()).is.equal(await signer.getAddress());
            }
        });

        it("ERC20 test coins deployed", async function () {

            for (const [networkName, networkProp] of Object.entries(networks)) {
                let prov = networkProp["provider"];
                let signer = await prov.getSigner(1);
                let signerAddr = await signer.getAddress();
                let ERC20Test = await ethers.getContractFactory("ERC20Test", signer);

                for (const [coinName, coinProp] of Object.entries(networkProp["coins"])) {
                    let totalSupply = new BigNumber("1000000000").shiftedBy(coinProp["decimals"]).toFixed();
                    let coin = await ERC20Test.deploy(coinName, coinName, coinProp["decimals"], totalSupply);
                    await coin.deployed();
                    coinProp["addr"] = coin.address;

                    expect(await coin.name()).is.equal(coinName);
                    expect(await coin.symbol()).is.equal(coinName);
                    expect(await coin.decimals()).is.equal(coinProp["decimals"]);

                    let balance = new BigNumber(ethers.utils.formatUnits(await coin.balanceOf(signerAddr), await coin.decimals())).toNumber();
                    expect(balance).is.equal(1000000000.0);
                }
            }
        });

        it("Pair deployed", async function () {
            for (const [networkName, networkProp] of Object.entries(networks)) {
                let prov = networkProp["provider"];
                let signer = await prov.getSigner(1);
                let factoryAddr = networkProp["factoryAddr"];
                let factoryContract = await ethers.getContractAt("UniswapV2Factory", factoryAddr, signer);

                for (const [pairID, pairProp] of Object.entries(networkProp["pairs"])) {
                    let token1Addr = networkProp["coins"][pairProp["token1Name"]]["addr"];
                    let token2Addr = networkProp["coins"][pairProp["token2Name"]]["addr"];
                    let coin1Contract = await ethers.getContractAt("ERC20Test", token1Addr, signer);
                    let coin2Contract = await ethers.getContractAt("ERC20Test", token2Addr, signer);
                    let tx = await factoryContract.createPair(token1Addr, token2Addr);
                    await tx.wait();

                    let pairAddr = await factoryContract.getPair(token1Addr, token2Addr);
                    pairProp["addr"] = pairAddr;

                    let pairContract = await ethers.getContractAt("UniswapV2PairTest", pairAddr, signer);

                    coin1Contract.transfer(pairAddr, pairProp["reserve1"].toFixed());
                    coin2Contract.transfer(pairAddr, pairProp["reserve2"].toFixed());
                    tx = await pairContract.mint(await signer.getAddress());
                    await tx.wait();

                    let { _reserve0, _reserve1 } = (await pairContract.getReserves());
                    if (await pairContract.token0() === token2Addr) {
                        let tmp = pairProp["reserve1"];
                        pairProp["reserve1"] = pairProp["reserve2"];
                        pairProp["reserve2"] = tmp;

                        let tmpName = pairProp["token1Name"];
                        pairProp["token1Name"] = pairProp["token2Name"];
                        pairProp["token2Name"] = tmpName;
                    }

                    expect(_reserve0).is.equal(pairProp["reserve1"].toFixed());
                    expect(_reserve1).is.equal(pairProp["reserve2"].toFixed());

                    let coin1Balance = await coin1Contract.balanceOf(await signer.getAddress());
                    let coin2Balance = await coin2Contract.balanceOf(await signer.getAddress());
                    networkProp["coins"][await coin1Contract.name()].balance = (new BigNumber(
                        ethers.utils.formatUnits(coin1Balance, await coin1Contract.decimals())));
                    networkProp["coins"][await coin2Contract.name()].balance = (new BigNumber(
                        ethers.utils.formatUnits(coin2Balance, await coin2Contract.decimals())));
                }
            }

        });

        it("Should be able to use Executor to parse and make trades", async function () {
            let newTradePath = JSON.parse(JSON.stringify(tradePath));
            for (let i = 1; i < newTradePath.path.length; i++) {
                let pathNode = newTradePath.path[i];
                let networkID = pathNode.edge.exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();
                let pairInfo = networks[networkID].pairs[pathNode.edge.addr];

                if (pairInfo.token1Name === pathNode.edge.token2.name) {
                    let tmp = pathNode.edge.token1;
                    pathNode.edge.token1 = pathNode.edge.token2;
                    pathNode.edge.token2 = tmp;
                    let tmpReserve = pathNode.edge.token1Reserve;
                    pathNode.edge.token1Reserve = pathNode.edge.token2Reserve;
                    pathNode.edge.token2Reserve = tmpReserve;
                }

                pathNode.edge.addr = pairInfo.addr;
                pathNode.edge.token1.addr = networks[networkID].coins[pathNode.edge.token1.name].addr;
                pathNode.edge.token2.addr = networks[networkID].coins[pathNode.edge.token2.name].addr;
            }

            let netToURLMap = {};
            for (const [networkID, networkProp] of Object.entries(networks)) {
                let prov = networkProp["provider"];
                let signer = await prov.getSigner(5);

                let Swapper = await ethers.getContractFactory("Swapper", signer);
                let swapperContract = await Swapper.deploy();
                await swapperContract.deployed();

                netToURLMap[networkID] = {
                    rpc: prov.connection.url,
                    swapper: swapperContract.address
                }
            }

            const key = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
            let executor = new Executor(netToURLMap, key, newTradePath.path, null, 1);
            await executor.initialize();
            await executor.processTrades([[newTradePath]], ["TESTY"], 123);
        });

        // it("Should be able to make trades with Swapper smart contract", async function () {
        //     let newTradePath = JSON.parse(JSON.stringify(tradePath));
        //     for (let i = 1; i < newTradePath.path.length; i++) {
        //         let pathNode = newTradePath.path[i];
        //         let networkID = pathNode.edge.exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();
        //         let pairInfo = networks[networkID].pairs[pathNode.edge.addr];

        //         if (pairInfo.token1Name === pathNode.edge.token2.name) {
        //             let tmp = pathNode.edge.token1;
        //             pathNode.edge.token1 = pathNode.edge.token2;
        //             pathNode.edge.token2 = tmp;
        //             let tmpReserve = pathNode.edge.token1Reserve;
        //             pathNode.edge.token1Reserve = pathNode.edge.token2Reserve;
        //             pathNode.edge.token2Reserve = tmpReserve;
        //         }

        //         pathNode.edge.addr = pairInfo.addr;
        //         pathNode.edge.token1.addr = networks[networkID].coins[pathNode.edge.token1.name].addr;
        //         pathNode.edge.token2.addr = networks[networkID].coins[pathNode.edge.token2.name].addr;
        //     }

        //     let netToAPIMap = {};
        //     let netToAcctMap = {};
        //     for (const [networkID, networkProp] of Object.entries(networks)) {
        //         let prov = networkProp["provider"];
        //         let signer = await prov.getSigner(1);
        //         netToAPIMap[networkID] = new ERC20API(prov);
        //         netToAcctMap[networkID] = await signer.getAddress();
        //     }

        //     let coinWallet = new CoinWallet(netToAPIMap, netToAcctMap, newTradePath.path);
        //     await coinWallet.update();
        //     let trades = compileTrades(newTradePath.path, coinWallet.state, 0.99999999);
        //     console.log(JSON.stringify(trades, null, 4));

        //     let befState = coinWallet.copyState();

        //     let txs = [];
        //     for (const [networkID, networkProp] of Object.entries(networks)) {
        //         let prov = networkProp["provider"];
        //         let signer = await prov.getSigner(5);

        //         let Swapper = await ethers.getContractFactory("Swapper", signer);
        //         let swapperContract = await Swapper.deploy();
        //         await swapperContract.deployed();

        //         if (networkID in trades) {
        //             let tx;
        //             for (let i = 0; i < trades[networkID].length; i++) {
        //                 let curSigner;
        //                 for (let j = 0; j < 10; j++) {
        //                     if (await prov.getSigner(j).getAddress() === trades[networkID][i]["acctID"]) {
        //                         curSigner = prov.getSigner(j);
        //                         break;
        //                     }
        //                 }

        //                 let userInputCoin = new ethers.Contract(trades[networkID][i]["inputTokenAddr"], erc20abi.abi, curSigner);
        //                 await userInputCoin.approve(swapperContract.address, trades[networkID][i]["inputVol"].toString());
        //                 let userSwapper = await ethers.getContractAt("Swapper", swapperContract.address, curSigner);

        //                 let minOutputVol = trades[networkID][i]["minOutputVol"];//.multipliedBy(99.5 / 100.0).decimalPlaces(0);
        //                 console.log(`minOutputVol: ${minOutputVol}, outputVol: ${trades[networkID][i]["outputVol"].toFixed()}`);
        //                 tx = await userSwapper.swapPath(
        //                     trades[networkID][i]["pairAddrs"],
        //                     trades[networkID][i]["token1sts"],
        //                     trades[networkID][i]["inputVol"].toFixed(),
        //                     minOutputVol.toFixed());
        //                 txs.push(tx.wait());
        //             }
        //         }
        //     }

        //     await Promise.all(txs);

        //     await coinWallet.update();
        //     let profits = CoinWallet.sumAcctsBalances(CoinWallet.diffBalances(coinWallet.state, befState));
        //     console.log(JSON.stringify(profits, null, 4));

        //     for (const [coinID, spec] of Object.entries(profits)) {
        //         if (coinID === tradePath.path.slice(-1)[0].node.name) {
        //             if (peggedToInput) {
        //                 expect(spec.balance.plus(profits[tradePath.path[0].node.name].balance).minus(tradePath.optimalDelta).dividedBy(tradePath.optimalDelta)
        //                     .absoluteValue().isLessThan(0.00001)).is.true;
        //             } else {
        //                 expect(spec.balance.minus(tradePath.optimalDelta).dividedBy(tradePath.optimalDelta)
        //                     .absoluteValue().isLessThan(0.00001)).is.true;
        //             }
        //         } else {
        //             if (coinID !== tradePath.path[0].node.name || !peggedToInput) {
        //                 expect(spec.balance.absoluteValue().isLessThan(new BigNumber(1).shiftedBy(-spec.decimals / 2))).is.true;
        //             }
        //         }

        //     }
        // });
    });
}
