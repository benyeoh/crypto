pragma solidity =0.5.16;

import "@uniswap/v2-core/contracts/UniswapV2Pair.sol";

contract UniswapV2PairTest is UniswapV2Pair {
    constructor() public UniswapV2Pair() {}
}
