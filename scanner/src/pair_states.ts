import chalk from 'chalk';

export class PairStates {
    private fetcher;
    private pollTime;
    private state;

    constructor(fetcherModule, pollTime: number) {
        this.fetcher = fetcherModule;
        this.pollTime = pollTime;
        this.state = { timestamp: 0 };
    }

    async initialize(coins, onlyAllowAddrs: Set<string> = null) {
        while (true) {
            try {
                let pairs = await this.fetcher.fetch(coins, null, null, true);
                let totalNumPairs = pairs.pairs.length;
                if (onlyAllowAddrs) {
                    onlyAllowAddrs = new Set(Array.from(onlyAllowAddrs).map((addr) => addr.toLowerCase()));
                    pairs.pairs = pairs.pairs.filter((pair) => onlyAllowAddrs.has(pair.addr.toLowerCase()));
                }
                this.state = pairs;
                console.log(`${chalk.green(this.fetcher.DEX_NAME)} (${chalk.green(this.fetcher.NET_NAME)}): ${chalk.yellow(pairs.pairs.length)} / ${totalNumPairs} filtered pairs`)
                return;
            } catch (err) {
                console.error(`${chalk.red(this.fetcher.DEX_NAME)} (${chalk.red(this.fetcher.NET_NAME)}): ${chalk.magenta(err)}`);
            }
        }
    }

    start() {
        setTimeout(() => {
            this.fetcher.fetch(null, this.state.pairs, null, false).then((pairs) => {
                this.state = pairs;
                this.start();
            }).catch((err) => {
                console.error(`${chalk.red(this.fetcher.DEX_NAME)} (${chalk.red(this.fetcher.NET_NAME)}): ${chalk.magenta(err)}`);
                this.start();
            });
        }, this.pollTime);
    }

    getFetcher() {
        return this.fetcher;
    }

    getState() {
        return this.state;
    }
}