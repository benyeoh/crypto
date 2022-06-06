const erc20abi = require("@openzeppelin/contracts/build/contracts/IERC20.json");
import { ethers } from "ethers";
import { BigNumber } from "bignumber.js";

export class ERC20API {
    private provider: ethers.providers.Provider;
    private coinContracts: { [coinAddr: string]: ethers.Contract };
    constructor(provider: ethers.providers.Provider) {
        this.provider = provider;
        this.coinContracts = {};
    }

    private getContract(coinAddr: string): ethers.Contract {
        if (!(coinAddr in this.coinContracts)) {
            let ecr20Contract = new ethers.Contract(coinAddr, erc20abi.abi, this.provider);
            this.coinContracts[coinAddr] = ecr20Contract;
        }

        return this.coinContracts[coinAddr];
    }

    public approve(coinAddr: string, signer: ethers.Wallet, spender: string, amount: BigNumber, overrides = {}): Promise<any> {
        let contract = this.getContract(coinAddr).connect(signer);
        return contract.approve(spender, amount.toFixed(), overrides);
    }

    public allowance(coinAddr: string, acctID: string, spender: string): Promise<any> {
        return this.getContract(coinAddr).allowance(acctID, spender);
    }

    public balanceOf(coinAddr: string, acctID: string): Promise<any> {
        return this.getContract(coinAddr).balanceOf(acctID);
    }
};