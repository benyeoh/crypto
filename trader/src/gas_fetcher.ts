import axios from 'axios';
import chalk from 'chalk';

const { JSDOM } = require("jsdom");

export class OwlracleGasFetcher {
    private rpcURL: string;
    private overrides: Object;
    private speedIdx: number;

    constructor(netID, overrides, speedIdx = 3) {
        this.rpcURL = {
            fantom: "https://owlracle.info/ftm/gas",
            // TODO:
        }[netID];

        this.overrides = overrides;
        this.speedIdx = speedIdx;
    }

    go() {
        setTimeout(async () => {
            let response;
            try {
                response = (await axios.get(this.rpcURL))["data"];
            } catch (e) {
                console.log(`Owlracle gas fetcher error: ${e} @ ${this.rpcURL}`);
            }

            this.overrides = response["speeds"][this.speedIdx]["gasPrice"];
            this.go();
        }, 1000);
    }
};

// export class OwlracleDOMGasFetcher {
//     private rpcURL: string;
//     private overrides: Object;
//     private limit: number;

//     constructor(netID, overrides, limit) {
//         this.rpcURL = {
//             fantom: "https://owlracle.info/ftm",
//             // TODO:
//         }[netID];

//         this.overrides = overrides;
//         this.limit = limit;
//     }

//     go() {
//         setTimeout(async () => {
//             let response;
//             try {
//                 response = (await axios.get(this.rpcURL))["data"];
//                 let dom = new JSDOM(response);
//                 const parentElement = dom.window.document.querySelector('div#gas-container');
//                 let allChildren = dom.window.document.querySelectorAll('div#gas-container div.gas');
//                 //let allChildren = parentElement.querySelectorAll("div");
//                 console.log(parentElement.innerHTML)
//                 let rapid = Math.round(Number(allChildren[3].querySelector("div.gwei").innerHTML.split(" ")[0]) * 1e9);
//                 let fast = Math.round(Number(allChildren[2].querySelector("div.gwei").innerHTML.split(" ")[0]) * 1e9);

//                 this.overrides["gasPrice"] = fast;
//                 if (this.overrides["gasPrice"] > this.limit) {
//                     throw Error(`Over limit @ ${this.rpcURL}: ${this.overrides["gasPrice"]}!`);
//                 } else if (rapid <= this.limit) {
//                     this.overrides["gasPrice"] = rapid;
//                 }

//                 console.log(this.overrides["gasPrice"]);
//             } catch (e) {
//                 this.overrides["gasPrice"] = 0;
//                 console.log(chalk.magentaBright(`DOMGasFetcher error @ ${this.rpcURL}: ${e}`));
//             }

//             this.go();
//         }, 4000);
//     }
// };

// export class CoinToolDOMGasFetcher {
//     private rpcURL: string;
//     private overrides: Object;
//     private limit: number;

//     constructor(netID, overrides, limit) {
//         this.rpcURL = {
//             fantom: "https://cointool.app/gasPrice/ftm",
//             // TODO:
//         }[netID];

//         this.overrides = overrides;
//         this.limit = limit;
//     }

//     go() {
//         setTimeout(async () => {
//             let response;
//             try {
//                 response = (await axios.get(this.rpcURL))["data"];
//                 let dom = new JSDOM(response, { runScripts: "dangerously", resources: "usable" });
//                 dom.window.onload = function () {
//                     const parentElement = dom.window.document.querySelector('li');
//                     //let allChildren = dom.window.document.querySelectorAll('li.fast-img span.num');
//                     //let allChildren = parentElement.querySelectorAll("div");
//                     console.log(parentElement.innerHTML)
//                     // let rapid = Math.round(Number(allChildren[3].querySelector("div.gwei").innerHTML.split(" ")[0]) * 1e9);
//                     // let fast = Math.round(Number(allChildren[2].querySelector("div.gwei").innerHTML.split(" ")[0]) * 1e9);

//                     // this.overrides["gasPrice"] = fast;
//                     // if (this.overrides["gasPrice"] > this.limit) {
//                     //     throw Error(`Over limit @ ${this.rpcURL}: ${this.overrides["gasPrice"]}!`);
//                     // } else if (rapid <= this.limit) {
//                     //     this.overrides["gasPrice"] = rapid;
//                     // }

//                     // console.log(this.overrides["gasPrice"]);
//                 }


//             } catch (e) {
//                 this.overrides["gasPrice"] = 0;
//                 console.log(chalk.magentaBright(`DOMGasFetcher error @ ${this.rpcURL}: ${e}`));
//             }

//             this.go();
//         }, 1000);
//     }
// };

export class DeBankGasFetcher {
    private rpcURL: string;
    private overrides: Object;
    private mult: number;
    private limit: number;

    constructor(netID, overrides, limit, mult = 1.1) {
        this.rpcURL = {
            fantom: "https://api.debank.com/chain/gas_price_dict_v2?chain=ftm",
            arbitrum: "https://api.debank.com/chain/gas_price_dict_v2?chain=arb",
            // TODO:
        }[netID];

        this.overrides = overrides;
        this.mult = mult;
        this.limit = limit;
    }

    go() {
        setTimeout(async () => {

            let response;
            try {
                response = (await axios.get(this.rpcURL))["data"];
                let fastGasPrice = Math.round(Number(response["data"]["fast"]["price"]) * this.mult);
                let normalGasPrice = Math.round(Number(response["data"]["normal"]["price"]) * this.mult);
                let gasPrice = fastGasPrice;
                if (fastGasPrice > this.limit) {
                    if (normalGasPrice <= this.limit) {
                        gasPrice = this.limit;
                    } else {
                        throw Error(`Over limit - fast: ${fastGasPrice}, normal: ${normalGasPrice}, limit: ${this.limit}!`);
                    }
                }

                this.overrides["gasPrice"] = gasPrice;

            } catch (e) {
                this.overrides["gasPrice"] = 0;
                console.log(chalk.magentaBright(`DOMGasFetcher error @ ${this.rpcURL}: ${e}`));
            }

            this.go();
        }, 2000);
    }
};


export class DOMGasFetcher {
    private rpcURL: string;
    private overrides: Object;
    private mult: number;
    private limit: number;

    constructor(netID, overrides, limit, mult = 1.1) {
        this.rpcURL = {
            fantom: "https://ftmscan.com/gastracker",
            // TODO:
        }[netID];

        this.overrides = overrides;
        this.mult = mult;
        this.limit = limit;
    }

    go() {
        setTimeout(async () => {
            let response;
            try {
                response = (await axios.get(this.rpcURL))["data"];
                let dom = new JSDOM(response);
                this.overrides["gasPrice"] = Math.round(Number(dom.window.document.getElementById("rapidgas").innerHTML.split(" ")[0]) * 1e9 * this.mult);
                if (this.overrides["gasPrice"] > this.limit) {
                    throw Error(`Over limit @ ${this.rpcURL}: ${this.overrides["gasPrice"]}!`);
                }

                //console.log(this.overrides["gasPrice"])
            } catch (e) {
                this.overrides["gasPrice"] = 0;
                console.log(chalk.magentaBright(`DOMGasFetcher error @ ${this.rpcURL}: ${e}`));
            }

            this.go();
        }, 2000);
    }
};