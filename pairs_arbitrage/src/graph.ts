export class Edge {
    nodeA: Node;
    nodeB: Node;
    data: any;
}

export class Node {
    data: any;
    edges: Array<Edge>;
}

export class Graph {
    nodes: Map<string, Node>;
    edges: Map<string, Edge>;

    constructor() {
        this.nodes = new Map<string, Node>();
        this.edges = new Map<string, Edge>();
    }
}

export function updateGraphFromPairs(pairsInfo, graph: Graph) {
    let nodes = graph.nodes;
    let edges = graph.edges;

    let networkID = pairsInfo.name + " (" + pairsInfo.network + ")";

    for (let i = 0; i < pairsInfo.pairs.length; i++) {
        let pair = pairsInfo.pairs[i];
        let edgeID = pair["token1"].name + "/" + pair["token2"].name + " @ " + networkID;
        let edge: Edge = edges.get(edgeID);
        if (!edge) {
            let nodeA: Node = nodes.get(pair["token1"].name);
            let nodeB: Node = nodes.get(pair["token2"].name);
            if (!nodeA) {
                nodeA = {
                    data: { name: pair["token1"].name },
                    edges: new Array<Edge>()
                };
                nodes.set(pair["token1"].name, nodeA);
            }

            if (!nodeB) {
                nodeB = {
                    data: { name: pair["token2"].name },
                    edges: new Array<Edge>()
                };
                nodes.set(pair["token2"].name, nodeB);
            }

            let edgePair = {
                ...pairsInfo.pairs[i]
            };
            edgePair["exchangeID"] = networkID;
            edge = {
                nodeA: nodeA,
                nodeB: nodeB,
                data: edgePair
            };
            edges.set(edgeID, edge);
            nodeA.edges.push(edge);
            nodeB.edges.push(edge);
        }
    }
}   