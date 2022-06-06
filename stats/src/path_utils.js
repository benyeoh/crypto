function getPathSpec(tradePath) {
    let path = tradePath;

    let outputNodeName = path.path[0]["node"]["name"];
    let nodeKey = outputNodeName;
    let prevOutputNodeName = outputNodeName;
    for (let j = 1; j < path.path.length; j++) {
        let outputNodeName = path.path[j]["node"]["name"];
        let inputNodeName = path.path[j]["edge"]["token1"]["name"];
        if (inputNodeName === outputNodeName) {
            inputNodeName = path.path[j]["edge"]["token2"]["name"];
        }

        if (prevOutputNodeName !== inputNodeName) {
            nodeKey += `/${inputNodeName},${outputNodeName}`;
        } else {
            nodeKey += `,${outputNodeName}`;
        }

        prevOutputNodeName = outputNodeName;
    }

    let edgeKey = "";
    let pairAddrs = [];
    for (let j = 1; j < path.path.length - 1; j++) {
        edgeKey += `${path.path[j].edge.exchangeID},`;
        pairAddrs.push([path.path[j].edge.exchangeID, path.path[j].edge.addr]);
    }

    edgeKey += path.path.slice(-1)[0].edge.exchangeID;
    pairAddrs.push([path.path.slice(-1)[0].edge.exchangeID, path.path.slice(-1)[0].edge.addr]);

    let pathKey = nodeKey + "|" + edgeKey;
    return { pathKey, pairAddrs };
}

function getCoinsFromKey(key) {
    return key.split("|")[0].split(",");
}

function getExchangeIDsFromKey(key) {
    return key.split("|")[1].split(",");
}

module.exports = {
    getCoinsFromKey,
    getExchangeIDsFromKey,
    getPathSpec
}