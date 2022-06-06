
export function getInputOutputTokens(pathString) {
    const pathsRef = pathString.split("|")[0].split(",");
    const exchangeRef = pathString.split("|")[1].split(",");
    let networksRef = [];
    for (let i = 0; i < exchangeRef.length; i++) {
        networksRef.push(exchangeRef[i].match(/(?!.*\().+(?=\))/)[0].toLowerCase());
    }

    let inputTokens = {};
    let outputTokens = {};
    let prevNetwork = null;
    for (let i = 0; i < networksRef.length; i++) {
        let token = pathsRef[i].split("/");    // input-output tokens do not need to match 
        if (networksRef[i] !== prevNetwork || token.length > 1) {
            inputTokens[token[token.length - 1] + "@" + networksRef[i]] = 1;
        }

        prevNetwork = networksRef[i];
    }

    prevNetwork = networksRef[0];
    for (let i = 1; i < networksRef.length; i++) {
        let token = pathsRef[i].split("/");
        if (networksRef[i] !== prevNetwork || token.length > 1) {
            outputTokens[token[0] + "@" + prevNetwork] = 1;
        }

        prevNetwork = networksRef[i];
    }

    outputTokens[pathsRef[pathsRef.length - 1] + "@" + prevNetwork] = 1;
    // outputNetworksRef.push(prevNetwork);
    // outputTokensRef.push(pathsRef[pathsRef.length - 1]);

    return {
        input: inputTokens,
        output: outputTokens
    };
}

export function updateTokenState(prevOut, nextInOut) {
    let numReqIn = Object.keys(nextInOut["input"]).length;
    let nextOut = {};

    let numReqInFound = 0;
    for (const prevOutToken of Object.keys(prevOut)) {
        if (!(prevOutToken in nextInOut["input"])) {
            nextOut[prevOutToken] = 1;
        } else {
            numReqInFound++;
            //console.log(`${prevOutToken}: ${numReqInFound}`);
        }
    }

    if (numReqInFound < numReqIn) {
        return null;
    }

    for (const nextOutToken of Object.keys(nextInOut["output"])) {
        nextOut[nextOutToken] = 1;
    }

    return nextOut;
}