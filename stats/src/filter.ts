const ss = require("simple-statistics");
import { getInputOutputTokens, updateTokenState } from "./rountrips";

export function getSorter2(k1, k2, asc = false) {
    if (!asc) {
        return ((a, b) => b[1][k1][k2] - a[1][k1][k2]);
    } else {
        return ((a, b) => a[1][k1][k2] - b[1][k1][k2]);
    }
}

export function getSorter(k1, asc = false) {
    if (!asc) {
        return ((a, b) => b[1][k1] - a[1][k1]);
    } else {
        return ((a, b) => a[1][k1] - b[1][k1]);
    }
}

export function getFilterByRegex(pathRegex, exchRegex) {
    return ((pathMapping) => {
        const paths = pathMapping[0].split("|")[0];
        const networks = pathMapping[0].split("|")[1];
        return paths.match(pathRegex) !== null && networks.match(exchRegex) !== null;
    });
}

export function getFilterByKey(filterPaths, filterExchanges) {
    return ((pathMapping) => {
        const paths = pathMapping[0].split("|")[0].split(",");
        const networks = pathMapping[0].split("|")[1].split(",");
        if (filterPaths.length > 0 && filterPaths.length != paths.length) {
            return false;
        }

        if (filterExchanges.length > 0 && filterExchanges.length != networks.length) {
            return false;
        }

        for (let i = 0; i < filterPaths.length; i++) {
            if (paths[i].match(filterPaths[i]) === null) {
                return false;
            }
        }

        for (let i = 0; i < filterExchanges.length; i++) {
            if (networks[i].match(filterExchanges[i]) === null) {
                return false;
            }
        }

        return true;
    });
}

export function getFilterByKeyStartEnd(filterPaths, filterExchanges, exclusive = false) {
    return ((pathMapping) => {
        const paths = pathMapping[0].split("|")[0].split(",");
        const exchanges = pathMapping[0].split("|")[1].split(",");

        if (paths[0].match(filterPaths[0]) === null) {
            return false;
        }

        if (paths[paths.length - 1].match(filterPaths[1]) === null) {
            return false;
        }

        if (exchanges[0].match(filterExchanges[0]) === null) {
            return false;
        }

        if (exchanges[exchanges.length - 1].match(filterExchanges[1]) === null) {
            return false;
        }

        if (exclusive) {
            for (const path of paths) {
                if (!(path.match(filterPaths[0])) && !(path.match(filterPaths[1]))) {
                    //console.log(path);
                    return false;
                }
            }
            for (const exch of exchanges) {
                if (!(exch.match(filterExchanges[0])) && !(exch.match(filterExchanges[1]))) {
                    //console.log(exch)
                    return false;
                }
            }
        }

        return true;
    });
}

export function getFilterByOppositeTrades(pathString) {

    let refInOutState = getInputOutputTokens(pathString);

    return ((pathMapping) => {
        let targetInOutState = getInputOutputTokens(pathMapping[0]);
        let newOutState = updateTokenState(refInOutState["output"], targetInOutState);
        //console.log(pathMapping[0])
        if (newOutState) {
            //console.log(`newOutState: ${JSON.stringify(newOutState)}`)
            if (updateTokenState(newOutState, refInOutState)) {
                //console.log(`refInOutState: ${JSON.stringify(refInOutState)}`)
                //console.log(`targetInOutState: ${JSON.stringify(targetInOutState)}`)
                // Original path inputs are satisfed by the output on this pathMapping
                return true;
            }
        }

        return false;
    });
}