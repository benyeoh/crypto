const FastPriorityQueue = require("fastpriorityqueue");
import { Node, Edge, Graph } from "./graph";

class PathNode {
    prev: PathNode;
    edge: Edge;
    node: Node;
    costsSoFar: number;
    userData: any;
    depth: number;
}

abstract class Traverser {

    onStartTraverse(graph: Graph, startNodeID: string) {

    }

    onEndTraverse(graph: Graph, startNodeID: string) {

    }

    abstract onTraverse(curPath: PathNode, toNode: Node, edge: Edge): { cost: number, userData: any };

    traverse(graph: Graph, startNodeID: string) {
        if (!graph.nodes.has(startNodeID)) {
            throw Error(`Node ${startNodeID} does not exist!`);
        }

        this.onStartTraverse(graph, startNodeID);

        let queue = new FastPriorityQueue((a, b) => { return a.costsSoFar < b.costsSoFar; });
        let newPath: PathNode = {
            prev: null,
            edge: null,
            node: graph.nodes.get(startNodeID),
            costsSoFar: 0,
            userData: null,
            depth: 0
        };
        queue.add(newPath);

        while (!queue.isEmpty()) {
            let curPath: PathNode = queue.poll();
            for (let i = 0; i < curPath.node.edges.length; i++) {
                let edge: Edge = curPath.node.edges[i];
                let nextNode = edge.nodeA;
                if (curPath.node === edge.nodeA) {
                    nextNode = edge.nodeB;
                }

                let { cost, userData } = this.onTraverse(curPath, nextNode, edge);
                if (cost !== null) {
                    newPath = {
                        prev: curPath,
                        edge: edge,
                        node: nextNode,
                        costsSoFar: curPath.costsSoFar + cost,
                        userData: userData,
                        depth: curPath.depth + 1
                    };
                    queue.add(newPath);
                }

            }
        }

        this.onEndTraverse(graph, startNodeID);
    }
}

export class BFSCycleTraverser extends Traverser {
    private maxDepth: number;
    paths: Array<object>;

    constructor(maxDepth = 3) {
        super();
        if (isNaN(maxDepth)) {
            throw Error(`Invalid maxDepth: ${maxDepth}`);
        }
        this.maxDepth = maxDepth;
    }

    onStartTraverse(graph: Graph, startNodeID: string) {
        this.paths = [];
    }

    onTraverse(curPath: PathNode, toNode: Node, edge: Edge): { cost: number, userData: any } {
        let startPath = curPath;
        while (startPath.prev !== null) {
            if (startPath.node === toNode || edge === startPath.edge) {
                // Illegal cycle detected
                return { cost: null, userData: null };
            }
            startPath = startPath.prev;
        }

        if ((startPath.node === toNode) ||
            (startPath.node.data.peg !== null && toNode.data.peg !== null && startPath.node.data.peg === toNode.data.peg)) {
            if (curPath.depth !== 0) {
                // Store valid path
                let flattenedPath = [];
                flattenedPath[curPath.depth + 1] = { node: toNode.data, edge: edge.data };
                let path = curPath;
                while (path.prev !== null) {
                    flattenedPath[path.depth] = { node: path.node.data, edge: path.edge.data };
                    path = path.prev;
                }

                flattenedPath[0] = { node: path.node.data, edge: null };
                this.paths.push(flattenedPath);
            }

            // End path
            return { cost: null, userData: null };
        }

        // Don't expand further after maxDepth
        if (curPath.depth >= this.maxDepth - 1) {
            return { cost: null, userData: null };
        }

        return { cost: curPath.depth + 1, userData: null };
    }


}