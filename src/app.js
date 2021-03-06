import Svg from './svg'
import Graph from './graph'
import $, { data } from 'jquery'
import dagre, { layout } from 'dagre'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import JsonPointer from 'json-pointer'

/** Main application state */
const state = {
    map: null,
    paths: null,
    schemas: {},
    fields: [],
    query: null,
    selectedFields: []
}

// SVG layer
const svg = null

/** Build a dependency Graph */
function buildDependencyGraph(data) {
    let nodes = new Map()
    for (let id in data.map) {
        let sourceRef = data.map[id]['source']['$ref']
        let destRef = data.map[id]['destination']['$ref']
        let source = sourceRef.substring(0, sourceRef.indexOf('#'))
        let destination = destRef.substring(0, destRef.indexOf('#'))

        if (!nodes.has(source)) {
            nodes.set(source, new Graph.Node(source))
        }
        if (!nodes.has(destination)) {
            nodes.set(destination, new Graph.Node(destination))
        }
        // each node can have multiple edges
        nodes.get(source).addEdge(nodes.get(destination))
    }
    return nodes
}

/** Build an array of JSON Pointers (RFC6901) from a schema */
const buildPointers = (obj) => {
    let res = []

    for (let m in obj.properties) {
        var children = buildPointers(obj.properties[m])
        if (children.length == 0) {
            res.push('/properties/' + m)
        }
        for (let i = 0; i < children.length; i++) {
            res.push('/properties/' + m + children[i])
        }
    }

    return res
}

/** Recrusively retrieve a list of ancestors for a Field */
const getAncestors = (data, selectedKey) => {
    let ancestors = []
    // console.log("getting ancestors", selectedKey);
    // see if the node being passed has any direct ancestors
    for (let m in data.map) {
        let dest = data.map[m].destination['$ref']
        let source = data.map[m].source['$ref']
        //console.log("ancestor", m, source, dest);
        // current node points to selectedKey
        if (dest == selectedKey) {
            //console.log("found selected key!", source);
            ancestors.push(source)
            let a = getAncestors(data, source)
            ancestors.push(a)
        }
    }
    // console.log("finished", selectedKey, ancestors);
    return ancestors.flat()
}

/** Recrusively retrieve a list of descedants for a Field */
const getDescendants = (data, selectedKey) => {
    let descendants = []
    // console.log("getting descendants", selectedKey);

    // see if the node being passed has any direct descendants
    for (let m in data.map) {
        let dest = data.map[m].destination['$ref']
        let source = data.map[m].source['$ref']
        //console.log("descendant", m, source, dest);
        // current node points to selectedKey
        if (source == selectedKey) {
            //console.log("found selected key!", dest);
            descendants.push(dest)
            let a = getDescendants(data, dest)
            descendants.push(a)
        }
    }
    // console.log("finished", selectedKey, descendants);
    return descendants.flat()
}

const getFilteredFields = (fields, e) => {
    let text = $(e.currentTarget).val()
    state.query = text

    let matches = []
    if (text.length < 2) return matches

    for (let m in fields) {
        let parts = fields[m].label.split('/')
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].toLowerCase().indexOf(text.toLowerCase()) > -1) {
                matches.push(m)
            }
        }
    }

    return matches
}

const onAutoComplete = (evt, fields, matched) => {
    // console.log("onAutoComplete", matched);

    // remove existing matches
    for (let i = matched.length - 1; i >= 0; i--) {
        fields[matched[i]].dom.removeClass('matched')
        matched.pop()
    }

    // set matches for the field value
    let resp = getFilteredFields(fields, evt)

    for (var i = 0; i < resp.length; i++) {
        matched.push(resp[i])
    }

    // highlight matching fields
    for (let i = 0; i < matched.length; i++) {
        fields[matched[i]].dom.addClass('matched')
    }
}


const animateMarker = function(field) {
    if(field.connector) {
        $(field.connector).addClass('anim')
        field.animComplete = true;
    }
}

const isFieldVisible = function (element, parent, fullyInView) {
    // console.log("isFieldVisible", element, parent)
    
    var pageTop = $(parent).offset().top;
    var pageBottom = pageTop + $(parent).height();
    var elementTop = $(element).offset().top;
    var elementBottom = elementTop + $(element).height();

    // console.log("scrollStats", pageTop, pageBottom, elementTop, elementBottom);

    if (fullyInView === true) {
        return ((pageTop < elementTop) && (pageBottom > elementBottom));
    } else {
        return ((elementTop <= pageBottom) && (elementBottom >= pageTop));
    }
}

/** Scroll a field into view within a Panel */
const scrollFieldIntoView = function(field) {
    
    let listContainer = field.dom.parent('.panel-body')[0]

    // console.log("scrollFieldIntoView", isFieldVisible(field.dom, listContainer, false))

    if(isFieldVisible(field.dom, listContainer, true)) {
        // console.log("field is visible", field.dom[0])
        // just add the "anim" class to the field connector
        // onScrollEnded(null);
        animateMarker(field);
    }
    else {
        // console.log("field is invisible", field.dom[0])
        // trigger the scroll
        // a separate listener will see scroll end event and add
        // the "anim" class to the field connector
        // overly complex as Chrome will not scroll two elements smoothly at the same time
        let listItem = field.dom[0]
        let listItemCenterPosition =
            listItem.offsetTop -
            (listContainer.getBoundingClientRect().height -
                listItem.getBoundingClientRect().height) /
                2
        listContainer.scrollTo({
            top: listItemCenterPosition,
            behavior: 'smooth'
        })
    }
}

/* Fire when the horizontal scrolling on a panel is complete */
const onScrollEnded = function(evt) {
    // console.log("Scroll ended", evt.currentTarget);

    // now we want to extend the marker
    // but only if it is not already extended

    // state should now contain all selected field which we can extend the markers on

    var schema = $(evt.currentTarget).parent('.panel').data('key');
    state.schemas[schema].fields.forEach(f => {
        if(f.selected === true) {
            console.log("anim complete", f.dom[0], f.key, f.connector)
            animateMarker(f);
        }
    });

    // TODO we are doing this on ALL the field, but some of them might not be ready yet!
    /*state.selectedFields.forEach(f => {
        // console.log("anim complete", f.connector, f.key)
        $(f.connector).addClass('anim')
        f.animComplete = true;
    })*/
}


/** Field selection event handler */
const onFieldSelect = (event, svg, data, fields) => {
    // clear existing selections
    state.selectedFields.forEach((f) => {
        f.dom.removeClass('selected')
        f.selected = false        
        if(f.mapped == true) {
            $(f.connector).removeClass('selected')
            $(f.connector).removeClass('anim')
            f.animComplete = false;
        }
    })
    state.selectedFields = []

    // get the JSON Pointer path from DOM element
    let key = $(event.currentTarget).data('key')

    // highlight selected Fields
    let select = (id) => {
        fields[id].selected = true
        fields[id].dom.addClass('selected')
        state.selectedFields.push(fields[id])
        if(fields[id].connector) {
            $(fields[id].connector).addClass('selected')
        }
    }

    // select the field
    select(key);

    // the assumption here is that the field that was 
    // clicked will already be visible 
    animateMarker(fields[key]);

    // highlight and scroll all ancestors
    getAncestors(data, key).forEach((key) => {
        select(key)
        scrollFieldIntoView(fields[key])
    })

    // highlight and scroll all descedants
    getDescendants(data, key).forEach((key) => {
        select(key)
        scrollFieldIntoView(fields[key])
    })
}


/** Layout the schema panels in Orthagonal format */
const layoutPanels = (g, nodes, schemas, svg) => {
    for (let [key, val] of nodes.entries()) {
        // console.log("node", key, val, schemas[key].dom);
        g.setNode(key, {
            label: val.name,
            width: schemas[key].dom.width(),
            height: schemas[key].dom.height(),
        })
        for (const e in val.edges) {
            // console.log("edge", key, val.edges[e].name);
            g.setEdge(key, val.edges[e].name)
        }
    }

    // layout
    layout(g)

    // update the DOM elements based on layout data

    g.nodes().forEach(function (v) {
        // console.log("Node " + v + ": " + JSON.stringify(g.node(v)), g.node(v));

        let n = g.node(v)
        // console.log("el", schemas[v], n);
        schemas[v].dom.css({
            width: n.width,
            /*height: n.height,*/
            left: n.x - n.width / 2,
            top: n.y - n.height / 2,
        })
        var prevLeft = 0;
        var timeoutId = 0;
        // attach scroll handler to body
        
        schemas[v].dom.find('.panel-body').scroll(function (evt) {
            clearTimeout(timeoutId)
            timeoutId = setTimeout(
                // TODO handler is updating all SELECTED fields instead of just one
                onScrollEnded.bind(null, evt),
                100
            )
            // only respond to vertical scroll events
            var currentLeft = $(this).scrollLeft()
            if (prevLeft != currentLeft) {
                prevLeft = currentLeft
            } else {
                // refresh arrows on vertical scroll only
                refreshArrows(svg, state.map, state.fields)
            }
        })
    })
}

/** Redraw the SVG arrows */
const refreshArrows = (svg, data, fields) => {
    svg.emptyCanvas();

    for (let m in data.map) {
        let s = data.map[m].source['$ref']
        let d = data.map[m].destination['$ref']
        if (fields[s] && fields[d]) {
            let srcParent = $(fields[s].dom[0]).parents('.panel-body')
            let destParent = $(fields[d].dom[0]).parents('.panel-body')

            let srcPanel = $(fields[s].dom[0]).parents('.panel')
            let destPanel = $(fields[d].dom[0]).parents('.panel')

            let connect = {
                source: {
                    el: fields[s].dom[0],
                    minY: srcParent.offset().top,
                    maxY: srcParent.offset().top + srcParent.height(),
                    scrollWidth:
                        srcParent[0].offsetWidth - srcParent[0].clientWidth,
                    borderWidth: 5, // srcPanel[0].clientTop,
                    animComplete: fields[s].animComplete
                },
                destination: {
                    el: fields[d].dom[0],
                    minY: destParent.offset().top,
                    maxY: destParent.offset().top + destParent.height(),
                    scrollWidth:
                        destParent[0].offsetWidth - destParent[0].clientWidth,
                    borderWidth: 5 // destParent[0].clientTop
                },
                color:
                    fields[s].selected || fields[d].selected
                        ? 'red'
                        : 'blue',
                slack: 0.2,
                selected: fields[s].selected || fields[d].selected
            }
            // console.log("connect", m, connect);

            // generate an SVG line between source and desintation
            let polyline = svg.connectDivs(connect);
            
            // store reference to the SVG connector
            // fields[s].connector = polyline;
            fields[d].connector = polyline;
        }
    }
}

/** Refresh a panel contents */
const refreshFields = (id) => {
    // console.log("refreshFields", id, state.schemas[id]);

    // create array back-end for ordering the panel entries
    let fields = [...state.schemas[id].fields]

    // sort the fields (default is "map")
    // potential ordering methods are: "manual", "map", "alphanumeric", "datatype"
    if (state.schemas[id].sort == 'ALPHANUMERIC') {
        // use label from Field
        fields.sort((e1, e2) => {
            if (e1.label < e2.label) {
                return -1
            }
            if (e1.label > e2.label) {
                return 1
            }
            return 0
        })
    } else if (state.schemas[id].sort == 'DATATYPE') {
        // use datatype from Field node property
        fields.sort((e1, e2) => {
            if (e1.node.type < e2.node.type) {
                return -1
            }
            if (e1.node.type > e2.node.type) {
                return 1
            }
            return 0
        })
    } else if (state.schemas[id].sort == 'MANUAL') {
        // cookie based?
    } else if (state.schemas[id].sort == 'MAP') {
        // default
    }

    // insert DOM elements
    for (let i = 0; i < fields.length; i++) {
        state.schemas[id].dom.find('.panel-body').append(fields[i].dom)
    }
}

/** Draw and layout the page including the SVG arrows */
async function draw(data) {
    const svg = new Svg()

    //
    // Step 1. Load list of paths for defined properties
    //

    const paths = new Set()
    for (let m in data.map) {
        let s = data.map[m].source['$ref']
        let d = data.map[m].destination['$ref']
        paths.add(s.substring(0, s.indexOf('#')))
        paths.add(d.substring(0, d.indexOf('#')))
    }
    state.paths = paths
    // console.log('paths', paths)

    //
    // Step 2. Draw schema at each of the paths
    //

    // fields contains DOM nodes for each Field
    const fields = {}
    // schemas contains DOM nodes for each Panel
    const schemas = {}
    // parser for dereferencing
    const parser = new $RefParser()

    // const $selectedFields = [];
    for (let path of paths) {
        // fetch the schema file
        let response = await fetch(path)

        // get the JSON
        let json = await response.json()

        // load any dereference documents to get full JSON
        await parser.dereference(json)

        // create an array of pointers for all fields in schema file
        let pointers = buildPointers(json)

        // create DOM panel
        let $tpl = $(
            `<div class="panel">
                <div class="panel-header">${path}</div>
                <div class="panel-body"></div>
            </div>`
        ).data('key', path)

        schemas[path] = {
            dom: $tpl,
            sort: 'map',
            sortDir: null,
            // pointers: pointers,
            fields: [],
        }

        // for each Field of a Schema
        for (const pointer of pointers) {
            let key = path + '#' + pointer
            // store reference use id as the key
            // TODO store in object form
            fields[key] = {}
            fields[key]['key'] = key
            fields[key]['pointer'] = pointer
            fields[key]['label'] = pointer.replaceAll('/properties', '')
            fields[key]['label'] = fields[key]['label'].substring(1) // strip leading forward-slash
            fields[key]['mapped'] = false
            fields[key]['node'] = JsonPointer.get(json, pointer)
            fields[key]['selected'] = false
            fields[key]['animComplete'] = false

            // DOM element for Field
            let $el = $(
                `<div class="field">
                    <div class="field-label"><i class="icon icon-tag"></i>${fields[key]['label']}</div>
                    <div class="field-datatype">${fields[key]['node'].type}</div>
                    <div class="field-maxlength">(${fields[key]['node'].maxLength})</div>
                </div>`
            )
            // selection handler
            .on('click', (evt) =>
                onFieldSelect(evt, svg, state.map, state.fields)
            )
            // add JSON Pointer to the field data
            .data('key', key)

            // store the element reference
            fields[key]['dom'] = $el

            // store reference in an ordered list for display
            schemas[path].fields.push(fields[key])
        }

        // update state
        state.schemas[path] = schemas[path]

        // refresh the contents of the panel
        refreshFields(path)

        // add the panel to the body of the page
        $('#panels').append($tpl)
    }

    // state.schemas = schemas;
    // console.log('schemas', schemas)

    // update "mapped" attribute
    for (let m in data.map) {
        let s = data.map[m].source['$ref']
        let d = data.map[m].destination['$ref']
        if (fields[s]) {
            fields[s]['mapped'] = true
        }
        if (fields[d]) {
            fields[d]['mapped'] = true
        }
    }

    state.fields = fields
    // console.log('fields', fields)

    //
    // Step 3. Layout the Schema Panels
    //

    const g = new dagre.graphlib.Graph()
    g.setGraph({})
    g.setDefaultEdgeLabel(function () {
        return {}
    })
    g.graph().rankdir = 'LR'
    g.graph().ranksep = 125
    g.graph().nodesep = 50
    g.graph().marginx = 25
    g.graph().marginy = 50

    layoutPanels(g, buildDependencyGraph(data), schemas, svg)

    //
    // Step 4. Draw the arrows
    //
    refreshArrows(svg, state.map, state.fields)

    //
    // Step 5. Setup event handlers
    //

    // auto-complete
    let timeoutId = 0
    // TODO shall we lift up to state?
    let matched = []
    let showMappedFields = false;

    $('#autocomplete').on('keydown', (evt) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(
            onAutoComplete.bind(null, evt, fields, matched),
            350
        )
    })

    // show mapped fields only handler
    $('#showMappedFieldsOnlyCb').on('change', (e) => {
        showMappedFields = $(e.currentTarget).is(':checked')
        // console.log('showMappedFieldsOnlyCb', state['showMappedFieldsOnly']);

        for (let f in state.fields) {
            if (showMappedFields === true) {
                if (state.fields[f].mapped === false) {
                    state.fields[f].dom.hide()
                }
            } else {
                state.fields[f].dom.show()
            }
        }

        // redraw the entire screen
        layoutPanels(g, buildDependencyGraph(data), schemas, svg)
        refreshArrows(svg, state.map, state.fields)
    })

    $('#sortType').on('change', (e) => {
        // update all the panels
        // TODO make this panel specific with a pop up
        for (let key in state.schemas) {
            state.schemas[key].sort = $(e.currentTarget).val()
            refreshFields(key)
            refreshArrows(svg, state.map, state.fields)
        }
    })

    // extend SVG canvas to match document DOM size
    $('#svg-canvas').attr('width', $(document).width())
    $('#svg-canvas').attr('height', $(document).height())
}

/** Runs the app when the DOM is fully loaded */
$(function () {
    async function loadMap(filename) {
        // load the map
        let response = await fetch(filename)
        state.map = await response.json()
        // console.log('map', state.map)

        // draw the map
        await draw(state.map)
        console.log('state', state)
    }

    loadMap('maps/test.map.json')
})
