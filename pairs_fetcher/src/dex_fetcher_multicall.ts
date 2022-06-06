import { ethers } from "ethers";
import { Call, Provider } from "ethcall";
import { FactoryContractMulticall, PairContractMulticall, UniV2FactoryMulticall, UniV2PairMulticall } from "./contracts_multicall";
import { CustomAddrProvider } from "./provider_multicall";

class Dispatcher {
    private callSpecs: Array<{ callStart: number, numCalls: number, fn: Function }>;
    public calls: Array<Call>;

    constructor() {
        this.reset();
    }

    private reset() {
        this.callSpecs = [];
        this.calls = [];
    }

    push(callData: { calls: Call[], fn: Function }) {
        let callStart = this.calls.length;
        let numCalls = callData.calls.length;
        for (let i = 0; i < numCalls; i++) {
            this.calls.push(callData.calls[i]);
        }

        this.callSpecs.push({
            callStart,
            numCalls,
            fn: callData.fn
        });
    }

    callAll(provider: Provider): Promise<Array<any>> {
        let callSpecs = this.callSpecs;
        let calls = this.calls;
        this.reset();

        return provider.all(calls).then((callRes) => {
            let res = [];
            for (let i = 0; i < callSpecs.length; i++) {
                let callSpec = callSpecs[i];
                let params = callRes.slice(callSpec.callStart, callSpec.callStart + callSpec.numCalls);
                res[i] = callSpec.fn(...params);
            }
            return res;
        })
    }
};

abstract class DEXFetcherMulticall {
    private factoryContractCreate;
    private pairContractCreate;
    private addrToPairContract: { [key: string]: PairContractMulticall };
    private addrToFactoryContract: { [key: string]: FactoryContractMulticall };
    private provider: CustomAddrProvider;
    private dispatcher: Dispatcher;

    constructor(factoryContractCreate, pairContractCreate) {
        this.dispatcher = new Dispatcher();
        this.provider = new CustomAddrProvider();

        this.factoryContractCreate = (addr) => {
            try {
                return new factoryContractCreate(addr);
            } catch (err) {
                return factoryContractCreate(addr);
            }
        }

        this.pairContractCreate = (addr) => {
            try {
                return new pairContractCreate(addr);
            } catch (err) {
                return pairContractCreate(addr);
            }
        }

        this.addrToPairContract = {};
        this.addrToFactoryContract = {};
    }

    protected abstract updateRateParam(pairInfo, pairContract: PairContractMulticall);

    private updateParams(pairInfo) {
        if (!this.addrToPairContract[pairInfo.addr]) {
            this.addrToPairContract[pairInfo.addr] = this.pairContractCreate(pairInfo.addr);
        }
        const pair = this.addrToPairContract[pairInfo.addr];

        if (!("token1Reserve" in pairInfo || "timestamp" in pairInfo)) {
            this.dispatcher.push({
                calls: [pair.token0(), pair.getReserves()],
                fn: ((token0Addr, [_reserve0, _reserve1, _blockTimestampLast]) => {
                    token0Addr = token0Addr.toLowerCase();
                    if (token0Addr === pairInfo.token2.addr) {
                        const tmpToken = pairInfo.token1;
                        pairInfo.token1 = pairInfo.token2;
                        pairInfo.token2 = tmpToken;
                    }

                    pairInfo.token1Reserve = ethers.utils.formatUnits(_reserve0, pairInfo.token1.decimals);
                    pairInfo.token2Reserve = ethers.utils.formatUnits(_reserve1, pairInfo.token2.decimals);
                    pairInfo.timestamp = _blockTimestampLast;

                    this.updateRateParam(pairInfo, pair);
                    return pairInfo;
                })
            });
        } else {
            this.dispatcher.push({
                calls: [pair.getReserves()],
                fn: (([_reserve0, _reserve1, _blockTimestampLast]) => {
                    pairInfo.token1Reserve = ethers.utils.formatUnits(_reserve0, pairInfo.token1.decimals);
                    pairInfo.token2Reserve = ethers.utils.formatUnits(_reserve1, pairInfo.token2.decimals);
                    pairInfo.timestamp = _blockTimestampLast;

                    this.updateRateParam(pairInfo, pair);
                    return pairInfo;
                })
            });
        }
    }

    fetchPairs(coins, addr): Promise<Array<any>> {
        if (!this.addrToFactoryContract[addr]) {
            this.addrToFactoryContract[addr] = this.factoryContractCreate(addr);
        }
        const factory = this.addrToFactoryContract[addr];

        const entries = Object.entries(coins);
        for (let i = 0; i < entries.length; i++) {
            let [coinID1, coinProperty1] = entries[i];
            let addr1 = coinProperty1["address"].toLowerCase();
            if (!addr1) {
                continue;
            }

            for (let j = i + 1; j < entries.length; j++) {
                let [coinID2, coinProperty2] = entries[j];
                let addr2 = coinProperty2["address"].toLowerCase();
                if (addr2) {
                    this.dispatcher.push({
                        calls: [factory.getPair(addr1, addr2)],
                        fn: ((pairAddr) => {
                            return {
                                addr: pairAddr,
                                token1: {
                                    name: coinID1,
                                    addr: addr1,
                                    decimals: coinProperty1["decimals"],
                                    peg: coinProperty1["peg"] ? coinProperty1["peg"] : null
                                },
                                token2: {
                                    name: coinID2,
                                    addr: addr2,
                                    decimals: coinProperty2["decimals"],
                                    peg: coinProperty2["peg"] ? coinProperty2["peg"] : null
                                },
                            };
                        })
                    });
                }
            }
        }

        return this.dispatcher.callAll(this.provider);
        //return Promise.all(pairs);
    }

    updatePairs(pairs) {
        let filteredPairs = pairs.filter((pair) => parseInt(pair["addr"]) !== 0)
        for (let i = 0; i < filteredPairs.length; i++) {
            this.updateParams(filteredPairs[i]);
        }

        return this.dispatcher.callAll(this.provider);
    }

    async initialize(provider: ethers.providers.BaseProvider, multicallAddr: string = null) {
        await this.provider.init(provider);
        if (multicallAddr) {
            this.provider.setAddr(multicallAddr);
        }
    }
}

export class DEXFetcherUniV2Multicall extends DEXFetcherMulticall {
    constructor() {
        super(UniV2FactoryMulticall, UniV2PairMulticall);
    }

    protected updateRateParam(pairInfo: any, pairContract: PairContractMulticall) {
        // Fixed rates of 0.3%
        pairInfo.rateA = 0.997
        pairInfo.rateB = 1.0
    }
}

