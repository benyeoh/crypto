#!/usr/bin/env -S npx ts-node
import { WebSocket } from "ws";

let ws = new WebSocket("wss://api.gemini.com/v2/marketdata");

ws.on("open", () => {
    console.log("On open");
    const subscribeMsg = {
        "type": "subscribe",
        "subscriptions": [
            { "name": "l2", "symbols": ["ETHUSD", "BTCUSD", "BTCETH"] }
        ]
    };
    ws.send(JSON.stringify(subscribeMsg));
});

ws.on("message", (msg) => {
    ws.close();
    let data = JSON.parse(msg);
    if (data.trades !== undefined) {
        console.log(`On message: ${data.type}, ${JSON.stringify([data.trades[0], data.trades[1]], null, 4)}`);
    }
    //ws.close();
});

ws.on("close", (msg) => {
    console.log("On close");
});``