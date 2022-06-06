const { getPathSpec } = require("../../stats/src/path_utils.js");
const chalk = require("chalk");

function findRiskyPairs(pathList) {

    let singleNetPairs = {};
    let getKey = (pairInfo) => pairInfo.addr.toLowerCase() + "|" + pairInfo.exchangeID;

    for (let i = 0; i < pathList.length; i++) {
        let tradePath = pathList[i].path;
        let networkID = tradePath[1]["edge"].exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase();;
        let isSameNetwork = true;
        let prevOutputToken = tradePath[0]["node"];

        for (let j = 1; j < tradePath.length; j++) {
            let pathNode = tradePath[j];
            let pairInfo = pathNode["edge"];

            let outputTokenInfo = pathNode["node"];
            let inputToken = pairInfo.token1;
            let outputToken = pairInfo.token2;

            if (outputTokenInfo.name === pairInfo.token1.name) {
                // Swap order
                inputToken = pairInfo.token2;
                outputToken = pairInfo.token1;
            }

            if (networkID !== pairInfo.exchangeID.match(/(?!.*\().+(?=\))/)[0].toLowerCase() ||
                inputToken.name !== prevOutputToken.name) {
                isSameNetwork = false;
                break;
            }
            prevOutputToken = outputToken;
        }

        if (isSameNetwork) {
            for (let j = 1; j < tradePath.length; j++) {
                let pathNode = tradePath[j];
                let pairInfo = pathNode["edge"];
                let pairKey = getKey(pairInfo);
                if (!(pairKey in singleNetPairs)) {
                    singleNetPairs[pairKey] = [];
                }
                let { pathKey } = getPathSpec(pathList[i]);
                singleNetPairs[pairKey].push(pathKey);
            }
        }
    }

    return singleNetPairs;
}

module.exports = {
    findRiskyPairs: findRiskyPairs
};
