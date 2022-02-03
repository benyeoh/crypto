import { ethers } from "ethers";
import { PairContract, UniV2Factory, UniV2Pair } from "./contracts";

abstract class Fetcher {
    private factoryContractCreate;
    private pairContractCreate;

    constructor(factoryContractCreate, pairContractCreate, provider) {
        this.factoryContractCreate = (addr) => {
            try {
                return new factoryContractCreate(provider, addr);
            } catch (err) {
                return factoryContractCreate(provider, addr);
            }
        }

        this.pairContractCreate = (addr) => {
            try {
                return new pairContractCreate(provider, addr);
            } catch (err) {
                return pairContractCreate(provider, addr);
            }
        }
    }

    protected abstract updateRateParam(pairInfo, pairContract: PairContract);

    private async updateParams(pairInfo) {
        const pair = this.pairContractCreate(pairInfo.addr);
        let token0Addr = (await pair.token0()).toLowerCase()
        let token1Addr = (await pair.token1()).toLowerCase()
        let { _reserve0, _reserve1, _blockTimestampLast } = await pair.getReserves()
        
        if (token0Addr === pairInfo.token2.addr && token1Addr === pairInfo.token1.addr) {
            const tmpToken = pairInfo.token1;
            pairInfo.token1 = pairInfo.token2;
            pairInfo.token2 = tmpToken;
            //pairInfo.token1Reserve = ethers.utils.formatUnits(_reserve1, pairInfo.token1.decimals);
            //pairInfo.token2Reserve = ethers.utils.formatUnits(_reserve0, pairInfo.token2.decimals);
        } else if (!(token0Addr === pairInfo.token1.addr && token1Addr === pairInfo.token2.addr)) {
            throw new Error(`Token addresses mismatch in pool. Got ${token0Addr} and ${token1Addr}.
                Expecting ${pairInfo.token1.addr} and ${pairInfo.token2.addr}.`)
        }
    
        pairInfo.token1Reserve = ethers.utils.formatUnits(_reserve0, pairInfo.token1.decimals);
        pairInfo.token2Reserve = ethers.utils.formatUnits(_reserve1, pairInfo.token2.decimals);
        pairInfo.timestamp = _blockTimestampLast;
        
        this.updateRateParam(pairInfo, pair);
        return pairInfo;
    }
    
    fetchPairs(coins, addr) {
        const factory = this.factoryContractCreate(addr)
    
        let pairs = [];
        const entries = Object.entries(coins);
        for (let i = 0; i < entries.length; i++) {
            const [coinID1, coinProperty1] = entries[i];
            const addr1 = coinProperty1["address"].ethereum?.toLowerCase();
            if (!addr1) { 
                continue;
            }
            
            for (let j = i + 1; j < entries.length; j++) {
                const [coinID2, coinProperty2] = entries[j];
                const addr2 = coinProperty2["address"].ethereum?.toLowerCase();
                if (addr2) {
                    pairs.push(
                        factory.getPair(addr1, addr2).then((pairAddr) => {
                            return {
                                addr: pairAddr,
                                token1: { name: coinID1, addr: addr1, decimals: coinProperty1["decimals"] },
                                token2: { name: coinID2, addr: addr2, decimals: coinProperty2["decimals"] },
                            }
                        })
                    );
                }
            }
        }
        
        return Promise.all(pairs);
    }

    updatePairs(pairs) {
        let filteredPairs = pairs.filter( (pair) => parseInt(pair["addr"]) !== 0 )
        return Promise.all(Array.from(filteredPairs, (v, i) => this.updateParams(v) ))
    }
}

export class FetcherUniV2 extends Fetcher {
    constructor(provider) {
        super(UniV2Factory, UniV2Pair, provider);
    }

    protected updateRateParam(pairInfo: any, pairContract: PairContract) {
        // Fixed rates of 0.3%
        pairInfo.rateA = 0.997
        pairInfo.rateB = 1.0
    }
}