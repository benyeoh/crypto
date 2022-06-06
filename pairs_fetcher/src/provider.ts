import { deepCopy } from "@ethersproject/properties";
import { fetchJson } from "@ethersproject/web";
import { BigNumber } from "@ethersproject/bignumber";
import { FeeData } from "@ethersproject/abstract-provider";
import { ethers } from "ethers";
import chalk from 'chalk';

// Experimental

// Copied from ethers

export class JsonRpcBatchProvider extends ethers.providers.JsonRpcProvider {
    _pendingBatchAggregator: NodeJS.Timer;
    _pendingBatch: Array<{
        request: { method: string, params: Array<any>, id: number, jsonrpc: "2.0" },
        resolve: (result: any) => void,
        reject: (error: Error) => void
    }>;

    send(method: string, params: Array<any>): Promise<any> {
        const request = {
            method: method,
            params: params,
            id: (this._nextId++),
            jsonrpc: "2.0"
        };

        if (this._pendingBatch == null) {
            this._pendingBatch = [];
        }

        const inflightRequest: any = { request, resolve: null, reject: null };

        const promise = new Promise((resolve, reject) => {
            inflightRequest.resolve = resolve;
            inflightRequest.reject = reject;
        });

        this._pendingBatch.push(inflightRequest);

        if (!this._pendingBatchAggregator) {
            // Schedule batch for next event loop + short duration
            this._pendingBatchAggregator = setTimeout(() => {

                // Get teh current batch and clear it, so new requests
                // go into the next batch
                const batch = this._pendingBatch;
                this._pendingBatch = null;
                this._pendingBatchAggregator = null;

                // Get the request as an array of requests
                const request = batch.map((inflight) => inflight.request);

                this.emit("debug", {
                    action: "requestBatch",
                    request: deepCopy(request),
                    provider: this
                });

                return fetchJson(this.connection, JSON.stringify(request)).then((result) => {
                    this.emit("debug", {
                        action: "response",
                        request: request,
                        response: result,
                        provider: this
                    });

                    // For each result, feed it to the correct Promise, depending
                    // on whether it was a success or error
                    batch.forEach((inflightRequest, index) => {
                        const payload = result[index];
                        if (payload === undefined) {
                            // TODO: Why does this happen?
                            console.log(chalk.magenta(JSON.stringify(result)));

                            const error = new Error(result.error.message);
                            (<any>error).code = result.code;
                            inflightRequest.reject(error);
                        } else if (payload.error) {
                            const error = new Error(payload.error.message);
                            (<any>error).code = payload.error.code;
                            (<any>error).data = payload.error.data;
                            inflightRequest.reject(error);
                        } else {
                            inflightRequest.resolve(payload.result);
                        }
                    });

                }, (error) => {
                    this.emit("debug", {
                        action: "response",
                        error: error,
                        request: request,
                        provider: this
                    });

                    batch.forEach((inflightRequest) => {
                        inflightRequest.reject(error);
                    });
                });

            }, 10);
        }

        return promise;
    }
}

export class StaticFeesJsonRpcProvider extends ethers.providers.StaticJsonRpcProvider {
    async getFeeData(): Promise<FeeData> {
        let maxFeePerGas = BigNumber.from("3500000000");
        let maxPriorityFeePerGas = BigNumber.from("1500000000");
        let gasPrice = BigNumber.from("3000000000");
        return { maxFeePerGas, maxPriorityFeePerGas, gasPrice };
    }
};