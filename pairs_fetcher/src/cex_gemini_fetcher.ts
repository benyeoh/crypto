import { WebSocket } from "ws";
import { GEMINI_PAIR_SYMBOLS } from "./cex_gemini_pairs";
import { BigNumber } from "bignumber.js"

export class CEXGeminiFetcher {
    ws: WebSocket;

    constructor() {
    }

    fetchPairs(coins) {
        let pairs = [];
        const entries = Object.entries(coins);
        for (let i = 0; i < entries.length; i++) {
            const [coinID1, coinProperty1] = entries[i];
            const addr1 = coinProperty1["address"];
            if (!addr1) {
                continue;
            }

            for (let j = i + 1; j < entries.length; j++) {
                const [coinID2, coinProperty2] = entries[j];
                const addr2 = coinProperty2["address"];
                if (addr2) {
                    let sym = addr1 + addr2;
                    let sym2 = addr2 + addr1;
                    let pairInfo;
                    if (GEMINI_PAIR_SYMBOLS[sym]) {
                        pairInfo = {
                            addr: GEMINI_PAIR_SYMBOLS[sym].addr,
                            token1: {
                                name: coinID1,
                                peg: coinProperty1["peg"] ? coinProperty1["peg"] : null
                            },
                            token2: {
                                name: coinID2,
                                peg: coinProperty2["peg"] ? coinProperty2["peg"] : null
                            }

                        }
                    } else if (GEMINI_PAIR_SYMBOLS[sym2]) {
                        pairInfo = {
                            addr: GEMINI_PAIR_SYMBOLS[sym2].addr,
                            token1: {
                                name: coinID2,
                                peg: coinProperty2["peg"] ? coinProperty2["peg"] : null
                            },
                            token2: {
                                name: coinID1,
                                peg: coinProperty1["peg"] ? coinProperty1["peg"] : null
                            }
                        }
                    }

                    if (pairInfo !== undefined) {
                        pairs.push(pairInfo);
                    }
                }
            }
        }

        return pairs;
    }

    updatePairs(pairs): Promise<any> {
        let prom = new Promise((resolve, reject) => {
            let newPairs = {};
            let symbols = [];
            for (let i = 0; i < pairs.length; i++) {
                symbols.push(pairs[i].addr);
                newPairs[pairs[i].addr.toUpperCase()] = pairs[i];
            }

            let curSeqNum = 0;

            this.ws = new WebSocket(`wss://api.gemini.com/v1/multimarketdata?symbols=${symbols.join()}&top_of_book=true&bids=true&offers=true&trades=false&auctions=false`);
            this.ws.on("message", (msg) => {
                let data = JSON.parse(msg);
                //console.log(`${JSON.stringify(data, null, 4)}`);
                if (data.socket_sequence === curSeqNum) {
                    if (data.events[0].symbol === data.events[1].symbol &&
                        data.events[0].reason === "initial" &&
                        data.events[1].reason === "initial" &&
                        data.events[0].side === "bid" &&
                        data.events[1].side === "ask") {

                        // Set the reserves based on mid price
                        // TODO: Compute least squares using CPMM model based on first few entries in order book
                        let midPrice = (new BigNumber(data.events[0].price)).plus(new BigNumber(data.events[1].price)).multipliedBy(0.5);
                        let liquidity = (new BigNumber(data.events[0].delta)).plus(new BigNumber(data.events[1].delta)).multipliedBy(250);
                        newPairs[data.events[0].symbol].token1Reserve = liquidity.multipliedBy(1.0).toString();
                        newPairs[data.events[0].symbol].token2Reserve = liquidity.multipliedBy(midPrice).toString();
                        newPairs[data.events[0].symbol].rateA = 0.9965;
                        newPairs[data.events[0].symbol].rateB = 1.0;
                    }

                    curSeqNum += 1;

                    if (curSeqNum === symbols.length) {
                        curSeqNum = -1;
                        this.ws.close();
                        resolve(Object.keys(newPairs).map(key => newPairs[key]));
                    }
                } else if (curSeqNum >= 0 && data.socket_sequence < symbols.length) {
                    this.ws.close();
                    reject("Out of sequence");
                }
            });

            this.ws.on("error", (err) => {
                console.error(err);
                reject(err);
            });
        });

        return prom;
    }
}