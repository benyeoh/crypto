import {WebSocket} from "ws";

let ws = new WebSocket("wss://api.gemini.com/v2/marketdata");

ws.on("open", () => {
  console.log("On open");
    const subscribeMsg = {
        "type": "subscribe",
        "subscriptions": [
            { "name": "l2", "symbols": [ "ETHUSD" ] }
        ]
    };
    ws.send(JSON.stringify(subscribeMsg));
});

ws.on("message", (msg) => {
    ws.close();
    let data = JSON.parse(msg);
    console.log(`On message: ${data["type"]}```);
    //ws.close();
});