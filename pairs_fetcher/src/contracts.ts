import { ethers } from "ethers";

// Saves 2 calls to getGasPrice() and getBlock() in ethers.js
const fakeGasFees = {
    gasPrice: 15000000000
    // maxPriorityFeePerGas: 15000000000,
    // maxFeePerGas: 15000000000 * 2,
};

export abstract class FactoryContract {
    abstract getPair(addr1: string, addr2: string): Promise<string>;
}

export abstract class PairContract {
    abstract token0(): Promise<string>;
    abstract token1(): Promise<string>;
    abstract getReserves(): Promise<any>;
}

export class UniV2Factory extends FactoryContract {
    private contract: ethers.Contract;

    constructor(provider, addr) {
        super();
        this.contract = new ethers.Contract(
            addr,
            [
                'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
                'function feeTo() external view returns (address)',
                'function feeToSetter() external view returns (address)',
                'function getPair(address tokenA, address tokenB) external view returns (address pair)',
                'function allPairs(uint) external view returns (address pair)',
                'function allPairsLength() external view returns (uint)',
            ],
            provider)
    }

    getPair(addr1: string, addr2: string): Promise<string> { return this.contract.getPair(addr1, addr2, fakeGasFees); }
};

export class UniV2Pair extends PairContract {
    private contract: ethers.Contract;

    constructor(provider, addr) {
        super();
        this.contract = new ethers.Contract(
            addr,
            [
                'constructor()',
                'event Approval(address indexed owner, address indexed spender, uint256 value)',
                'event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to)',
                'event Mint(address indexed sender, uint256 amount0, uint256 amount1)',
                'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
                'event Sync(uint112 reserve0, uint112 reserve1)',
                'event Transfer(address indexed from, address indexed to, uint256 value)',
                'function DOMAIN_SEPARATOR() view returns (bytes32)',
                'function MINIMUM_LIQUIDITY() view returns (uint256)',
                'function PERMIT_TYPEHASH() view returns (bytes32)',
                'function allowance(address, address) view returns (uint256)',
                'function approve(address spender, uint256 value) returns (bool)',
                'function balanceOf(address) view returns (uint256)',
                'function burn(address to) returns (uint256 amount0, uint256 amount1)',
                'function decimals() view returns (uint8)',
                'function factory() view returns (address)',
                'function getReserves() view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)',
                'function initialize(address _token0, address _token1)',
                'function kLast() view returns (uint256)',
                'function mint(address to) returns (uint256 liquidity)',
                'function name() view returns (string)',
                'function nonces(address) view returns (uint256)',
                'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
                'function price0CumulativeLast() view returns (uint256)',
                'function price1CumulativeLast() view returns (uint256)',
                'function skim(address to)',
                'function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes data)',
                'function symbol() view returns (string)',
                'function sync()',
                'function token0() view returns (address)',
                'function token1() view returns (address)',
                'function totalSupply() view returns (uint256)',
                'function transfer(address to, uint256 value) returns (bool)',
                'function transferFrom(address from, address to, uint256 value) returns (bool)'
            ],
            provider)
    }

    token0(): Promise<string> { return this.contract.token0(fakeGasFees); }
    token1(): Promise<string> { return this.contract.token1(fakeGasFees); }
    getReserves(): Promise<any> { return this.contract.getReserves(fakeGasFees); }
};
