import { ethers } from "ethers";
import { Contract, Call } from 'ethcall';

const univ2FactoryABI = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const univ2PairABI = require("@uniswap/v2-core/build/IUniswapV2Pair.json");

export abstract class FactoryContractMulticall {
    abstract getPair(addr1: string, addr2: string): Call;
}

export abstract class PairContractMulticall {
    abstract token0(): Call;
    abstract token1(): Call;
    abstract getReserves(): Call;
}

export class UniV2FactoryMulticall extends FactoryContractMulticall {
    private contract: Contract;

    constructor(addr) {
        super();
        this.contract = new Contract(addr, univ2FactoryABI.abi);
    }

    getPair(addr1: string, addr2: string): Call { return this.contract.getPair(addr1, addr2); }
};

export class UniV2PairMulticall extends PairContractMulticall {
    private contract: Contract;

    constructor(addr) {
        super();
        this.contract = new Contract(addr, univ2PairABI.abi);
    }

    token0(): Call { return this.contract.token0(); }
    token1(): Call { return this.contract.token1(); }
    getReserves(): Call { return this.contract.getReserves(); }
};