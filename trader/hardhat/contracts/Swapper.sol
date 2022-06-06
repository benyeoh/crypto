//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

//import "hardhat/console.sol";

contract Swapper {
    using SafeMath for uint256;

    bytes4 private constant SELECTOR = bytes4(keccak256(bytes("transfer(address,uint256)")));

    constructor() {}

    function _safeTransfer(
        address token,
        address to,
        uint256 value
    ) private {
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "UniswapV2: TRANSFER_FAILED");
    }

    function safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) private {
        // console.log(from);
        // console.log(to);
        // console.log(value);

        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "safeTransferFrom failed");
    }

    function getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256 amountOut) {
        //require(amountIn > 0, "INSUFFICIENT_INPUT_AMOUNT");
        //require(reserveIn > 0 && reserveOut > 0);
        uint256 amountInWithFee = amountIn.mul(997);
        uint256 numerator = amountInWithFee.mul(reserveOut);
        uint256 denominator = reserveIn.mul(1000).add(amountInWithFee);
        amountOut = numerator / denominator;
    }

    function swapPath(
        address[] calldata pairs,
        bool[] calldata inToken1st,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        // console.log(inToken1st[0]);
        // console.log(pairs[0]);
        // console.log(IUniswapV2Pair(pairs[0]).token0());
        // console.log(IUniswapV2Pair(pairs[0]).token1());
        address tokenInAddr = inToken1st[0] ? IUniswapV2Pair(pairs[0]).token0() : IUniswapV2Pair(pairs[0]).token1();
        // console.log(tokenInAddr);
        safeTransferFrom(tokenInAddr, msg.sender, pairs[0], amountIn);

        //console.log("amountIn:");
        //console.log(amountIn);

        for (uint256 i = 0; i < pairs.length - 1; i++) {
            (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(pairs[i]).getReserves();
            uint256 out0;
            uint256 out1;
            if (inToken1st[i]) {
                out0 = 0;
                out1 = getAmountOut(amountIn, reserve0, reserve1);
                amountIn = out1;
            } else {
                out0 = getAmountOut(amountIn, reserve1, reserve0);
                out1 = 0;
                amountIn = out0;
            }
            //console.log("Swapping");
            IUniswapV2Pair(pairs[i]).swap(out0, out1, pairs[i + 1], new bytes(0));
        }

        // Force different scope
        // Final swap
        {
            (uint256 reserve0, uint256 reserve1, ) = IUniswapV2Pair(pairs[pairs.length - 1]).getReserves();
            uint256 amountOut;
            uint256 out0;
            uint256 out1;
            if (inToken1st[pairs.length - 1]) {
                out0 = 0;
                out1 = getAmountOut(amountIn, reserve0, reserve1);
                amountOut = out1;
            } else {
                out0 = getAmountOut(amountIn, reserve1, reserve0);
                out1 = 0;
                amountOut = out0;
            }

            //console.log("amountOut:");
            //console.log(amountOut);
            // console.log("amountOutMin");
            // console.log(amountOutMin);
            require(amountOut >= amountOutMin, "SLIPPAGE TOLERANCE EXCEEDED");
            IUniswapV2Pair(pairs[pairs.length - 1]).swap(out0, out1, msg.sender, new bytes(0));
        }
    }
}
