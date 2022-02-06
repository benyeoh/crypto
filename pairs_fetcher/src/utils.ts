export function filterCoins(coins: Object, network: string): Object {
    coins = JSON.parse(JSON.stringify(coins));

    let keysToRemove = []
    for (const [k, v] of Object.entries(coins)) {
        if (v["address"] instanceof Object) {
            if (network in v["address"]) {
                v["address"] = v["address"][network];
            } else {
                keysToRemove.push(k);
            }
        }
    }

    for (let i = 0; i < keysToRemove.length; i++) {
        delete coins[keysToRemove[i]];
    }

    return coins;
}