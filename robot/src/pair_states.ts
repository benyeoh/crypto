//import { NAME_TO_EXCHANGE_MAP, fetchOne } from "../../pairs_fetcher/fetch";

export class PairStates {
    private fetcher;
    private pollTime;
    private state;

    constructor(fetcherModule, pollTime: number) {
        this.fetcher = fetcherModule;
        this.pollTime = pollTime;
    }

    async initialize(coins) {
        while (true) {
            try {
                let pairs = await this.fetcher.fetch(coins, null, null);
                this.state = pairs;
                return;
            } catch (err) {
                console.error(`${this.fetcher.DEX_NAME} (${this.fetcher.NET_NAME}): ${err}`);
                console.error(`${this.fetcher.DEX_NAME} (${this.fetcher.NET_NAME}): Re-initializing ...`);
            }
        }
    }

    start() {
        setTimeout(() => {
            this.fetcher.fetch(null, this.state.pairs, null).then((pairs) => {
                this.state = pairs;
                this.start();
            }).catch((err) => {
                console.error(`${this.fetcher.DEX_NAME} (${this.fetcher.NET_NAME}): ${err}`);
                console.error(`${this.fetcher.DEX_NAME} (${this.fetcher.NET_NAME}): Re-polling ...`);
                this.start();
            });
        }, this.pollTime);
    }

    getState() {
        return this.state;
    }
}