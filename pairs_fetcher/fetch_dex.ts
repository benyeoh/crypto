#!/usr/bin/env -S npx ts-node
const fs = require("fs");

//import { program } from "commander";
import { fetchUniV2 } from "./src/utils";

// let GLOBAL_ID = 0;

export class FetchDexModule {

    private factoryAddr: string;
    private rpcNetworks: Array<string>;
    private curNetIdx: number;
    private netName: string;
    private dexName: string;
    private rotateURLs: boolean;
    private multicallAddr: string;
    //private id: number;

    constructor(network: string, dexName: string, spec: Object) {
        this.factoryAddr = spec["factory"];
        this.rpcNetworks = spec["rpcs"];
        this.rotateURLs = spec["rotateURLs"] ? spec["rotateURLs"] : false;
        this.multicallAddr = spec["multicall"] ? spec["multicall"] : null;

        this.curNetIdx = 0;

        this.netName = network;
        this.dexName = dexName;
        // this.id = GLOBAL_ID;
        // GLOBAL_ID++;
    }

    public get DEF_PAIRS_PATH(): string {
        return `pairs_${this.netName}_${this.dexName.replace(" ", "_")}.json`;
    }

    public get FACTORY_ADDR(): string {
        return this.factoryAddr;
    }

    public get MULTICALL_ADDR(): string {
        return this.multicallAddr;
    }

    public get RPC_NETWORKS(): Array<string> {
        return this.rpcNetworks;
    }

    public get NET_NAME(): string {
        return this.netName;
    }

    public get DEX_NAME(): string {
        return this.dexName;
    }

    public fetch(coins: Object, pairs: Array<any>, outPairsPath: string, filterLowLiquidity: boolean = false): Promise<Object> {
        return fetchUniV2(coins,
            pairs,
            outPairsPath,
            this.FACTORY_ADDR,
            this.RPC_NETWORKS[this.curNetIdx],
            this.NET_NAME,
            this.DEX_NAME,
            this.MULTICALL_ADDR,
            filterLowLiquidity).then((res) => {
                if (this.rotateURLs) {
                    this.curNetIdx += 1;
                    this.curNetIdx %= this.RPC_NETWORKS.length;
                }
                return res;
            }).catch((err) => {
                console.error(`Failed RPC: ${this.RPC_NETWORKS[this.curNetIdx]}`);
                this.curNetIdx += 1;
                this.curNetIdx %= this.RPC_NETWORKS.length;
                console.error(`Switching next time to RPC: ${this.RPC_NETWORKS[this.curNetIdx]}`);
                throw err;
            });
    }
}

export function createModule(network: string, exchName: string, spec: Object) {
    return new FetchDexModule(network, exchName, spec);
}