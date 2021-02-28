// namespace
var Graph=Graph || {};

// static function
Graph.resolve = function(node, resolved, seen) {
    console.log(node.name);
    seen.push(node);
    for(let i=0; i<node.edges.length; i++) {
        let edge = node.edges[i];
        // eliminate duplicates
        if(!resolved.includes(edge)) {
            // stop circular dependencies
            if(seen.includes(edge)) {
                throw new Error(`Circular reference detected: ${node.name} -> ${edge.name}`);
            }
            Graph.resolve(node.edges[i], resolved, seen);
        }
    }
    resolved.push(node);
}

var Node = function Node(name) {
    // public properties
    this.name = name;
    this.edges = [];
}
// public method
Node.prototype.addEdge = function(node) {
    // unique dependencies only
    if(!this.edges.includes(node)) {
        this.edges.push(node);
    }
}



// static objects
Graph.Node = Node;

export default Graph;