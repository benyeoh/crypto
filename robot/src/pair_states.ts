import chalk from 'chalk';

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
                console.error(`${chalk.red(this.fetcher.DEX_NAME)} (${chalk.red(this.fetcher.NET_NAME)}): ${chalk.magenta(err)}`);
            }
        }
    }

    start() {
        setTimeout(() => {
            this.fetcher.fetch(null, this.state.pairs, null).then((pairs) => {
                this.state = pairs;
                this.start();
            }).catch((err) => {
                console.error(`${chalk.red(this.fetcher.DEX_NAME)} (${chalk.red(this.fetcher.NET_NAME)}): ${chalk.magenta(err)}`);
                this.start();
            });
        }, this.pollTime);
    }

    getState() {
        return this.state;
    }
}