// namespace
var Graph=Graph || {};

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