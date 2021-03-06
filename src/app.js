import Svg from './svg'
import $, { data } from 'jquery'
import dagre, { layout } from 'dagre'
import $RefParser from '@apidevtools/json-schema-ref-parser'
import JsonPointer from 'json-pointer'
import faker from 'faker'

/** Global SVG object */
const svg = null

/** Main application state */
const state = {
    map: null,
    paths: null,
    schemas: {},
    fields: [],
    // TODO move inside "view"
    query: null,
    selectedFields: [],
    view: {
        showFields: true,
        showUnmappedFields: true
    }
}

/** Build a dependency Graph */
const buildDependencyGraph = (data, view) => {
    let nodes = new Map()
    for (let id in data.map) {
        let sourceRef = data.map[id]['source']['$ref']
        let destRef = data.map[id]['destination']['$ref']
        let source = sourceRef.substring(0, sourceRef.indexOf('#'))
        let destination = destRef.substring(0, destRef.indexOf('#'))
        
        // dont build dependencies for schemas that are not present in View
        if(!viewContainsSchema(view, source) || !viewContainsSchema(view, destination)) {
            continue;
        }
        // create a new graph node if necessary
        if (!nodes.has(source)) {
            nodes.set(source, new Node(source))
        }
        if (!nodes.has(destination)) {
            nodes.set(destination, new Node(destination))
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
        // console.log("ancestor", m, source, dest);
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

/** Filter fields in the schema by name */
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

/** Auto-complete field handler */
const onAutoComplete = (evt, fields, matched) => {
    // console.log("onAutoComplete", matched);

    // remove existing matches
    for (let i = matched.length - 1; i >= 0; i--) {
        fields[matched[i]].dom.removeClass('matched')
        matched.pop()
    }

    // set matches for the field value
    let resp = getFilteredFields(fields, evt)

    // TODO combine both loops below into one

    for (var i = 0; i < resp.length; i++) {
        matched.push(resp[i])
    }

    // highlight matching fields
    for (let i = 0; i < matched.length; i++) {
        fields[matched[i]].dom.addClass('matched')
    }
}

/** Reads the schema and generates a matching JSON payload */
const fakeJson = (root) => {
    let payload = {};
    for(let key in root.properties) {
        // precedence for value calculation:
        // 1. default value in schema
        // 1. examples in schema
        // 2. faker config in schema
        // 3. null
        
        // default value
        payload[key] = null;

        // see if we have a more specific value available

        if(root.properties[key].default) {
            payload[key] = root.properties[key].default
        }
        else if(root.properties[key].examples) {
            // use examples instead of faker

            // random select from array of examples
            let max = root.properties[key].examples.length
            let rand = Math.floor(Math.random() * Math.floor(max))
            
            // add the randomly selected example
            payload[key] = root.properties[key].examples[rand]
        }
        else if(root.properties[key].faker) {
            // use faker for data generation

            if(root.properties[key].faker) {
                if(typeof root.properties[key].faker === 'string' || root.properties[key].faker instanceof String) {
                    // basic faker
                    payload[key] = faker.fake("{{" + root.properties[key].faker + "}}")
                }
                else {
                    // faker with options

                    // split namespace and function name from simple string
                    let opts = root.properties[key].faker;
                    let ns = opts.id.split('.')[0];
                    let fn = opts.id.split('.')[1];

                    // use apply to pass an array of arguments to faker method
                    payload[key] = faker[ns][fn].apply(null, opts.options)
                }
            }
        }
        
        // recurse object if necessary
        if(root.properties[key].type == 'object') {
            if(root.properties[key].properties) {
                payload[key] = fakeJson(root.properties[key]);
            }
        }
    }
    return payload;
}

/** Calculate if a field is currently visible in the scrollable panel */
const isFieldVisible = function (element, parent, fullyInView) {
    var pageTop = $(parent).offset().top;
    var pageBottom = pageTop + $(parent).height();
    var elementTop = $(element).offset().top;
    var elementBottom = elementTop + $(element).height();

    //console.log("scrollStats", pageTop, pageBottom, elementTop, elementBottom);

    if (fullyInView === true) {
        return ((pageTop < elementTop) && (pageBottom > elementBottom));
    } else {
        return ((elementTop <= pageBottom) && (elementBottom >= pageTop));
    }
}

/** Scroll a field into view within a Panel */
const scrollFieldIntoView = function(field) {
    // create a promise that which will be set to resolved
    // once the scroll has completed on the panel
    return new Promise((resolve) => {
        let listContainer = field.dom.parent('.panel-body')[0]

        // TODO why can we set "fullyInView" to true?
        if(isFieldVisible(field.dom, listContainer, false)) {
            resolve(field);
        }
        else {
            // attach scroll end listener
            var timeoutId = 0;
            $(listContainer).on('scroll', evt => {
                clearTimeout(timeoutId)
                timeoutId = setTimeout(
                    () => { resolve(field) },
                    100
                )
            })
            // trigger the scroll
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
    });
}

/** Field selection event handler */
const onFieldSelect = (event, data, fields) => {
    
    // get the JSON Pointer path from DOM element
    let key = $(event.currentTarget).data('key')

    let clearFields = (fs) => {
        fs.forEach((f) => {
            f.selected = false
            f.animComplete = false;      
            f.dom.removeClass('selected')
            $(f.connector).removeClass('selected')
            $(f.connector).removeClass('anim')
            if(f.connector) {
                $('g text', f.connector).removeClass('anim');
            } 
        })
    }

    // toggle selection of the Field on and off
    if(!event.ctrlKey) {
        // shift is not pressed (single select)
        
        // if the clicked field is already selected we do not want
        // to run the clearFields method on the field or any 
        // ancestors/descendants
        var selected = state.fields[key].selected;
        if(selected) {
            let fieldsToKeep = [
                state.fields[key], 
                ...getAncestors(data, key).map(m => state.fields[m]), 
                ...getDescendants(data, key).map(m => state.fields[m])
            ]
            // only fires when moving from multi-select to single-select
            let fieldsToClear = [];
            state.selectedFields.forEach(f => {
                if(fieldsToKeep.indexOf(f) < 0) {
                    fieldsToClear.push(f); // discard
                }
            })
            console.log("clearFields", state.fields[key], fieldsToClear);
            clearFields(fieldsToClear)
            state.selectedFields = fieldsToKeep
            return;
        }
        else {
            // field is not already selected so we should clear everything
            // before the code below runs and selects the field and any
            // ancestors/descedants
            clearFields(state.selectedFields)
            state.selectedFields = []
            $('svg').addClass('selection-made')
        }
    }
    else {
        // shift is pressed (multi-select)
        
        // true if the clicked field is already selected
        var selected = state.fields[key].selected;
        if(selected) {
            // already selected so deactive Field and ancestors and descendants
            let fieldsToClear = [
                state.fields[key], 
                ...getAncestors(data, key).map(m => state.fields[m]), 
                ...getDescendants(data, key).map(m => state.fields[m])
            ]
            clearFields(fieldsToClear);
            // remove selections from state
            fieldsToClear.forEach(f => {
                state.selectedFields.splice(state.selectedFields.indexOf(f), 1)
            });
            if(state.selectedFields.length == 0) {
                $('svg').removeClass('selection-made')
            }
            return; // do not re-select fields
        }
    }

    // contains all the scroll promises
    var actions = []
    
    // select a Field in the panel
    let selectField = (id) => {
        if(!fields[id]) {
            // we may not have drawn the field
            return;
        }
        fields[id].selected = true
        fields[id].dom.addClass('selected')
        state.selectedFields.push(fields[id])
        if(fields[id].connector) {
            $(fields[id].connector).addClass('selected')
        }
        actions.push(scrollFieldIntoView(fields[id]))
    }

    // animate the Field connector
    let animateMarker = function(field) {
        if(field.connector) {
            // fires for expand and collapse
            $(field.connector).one('webkitTransitionEnd otransitionend oTransitionEnd msTransitionEnd transitionend', e => {
                if(field.selected) {
                    $('g text', $(e.currentTarget)).addClass('anim')
                    field.animComplete = true;
                }
            })
            $(field.connector).addClass('anim')
        }
    }

    // select the field
    selectField(key)
    
    // highlight and scroll all ancestors
    getAncestors(data, key).forEach(key => selectField(key))

    // highlight and scroll all descedants
    getDescendants(data, key).forEach(key => selectField(key))

    // console.log("actions", actions);

    // wait for all scrolling to complete before we add anim class to the markers
    Promise.all(actions).then(fields => fields.forEach(f => animateMarker(f)))
}

/** Returns true if the current view contains the specified schema */
const viewContainsSchema = function(view, path) {
    let found = false;
    for(let i = 0; i<view.schemas.length; i++) {
        if(view.schemas[i]['$ref'] === path) {
            return true;
        }
    }
    return false;
}

/** Returns the configuration for the schema or null if not found */
const getSchemaView = function(view, path) {
    for(let i = 0; i<view.schemas.length; i++) {
        if(view.schemas[i]['$ref'] === path) {
            return view.schemas[i];
        }
    }
    return null;
}

/** Layout the schema panels in Orthagonal format with edge grouping */
const layoutPanels = (g, nodes, schemas, svg, view) => {
    // TODO calculate height in the following order:
    // 1. custom height for schema in view
    // 2. default height settings for view ('auto')
    // 3. default height for content to max of 200px
    let calcHeight = key => {
        if(state.view.showFields === false) {
            // height of just the header
            return $(state.schemas[key].dom.find('.panel-header')).outerHeight();
        }
        else {
            // ensure we clear the panel height so it can be recalculated based on content
            state.schemas[key].dom.css('height', '')
            state.schemas[key].dom.find('.panel-body').css('height', '')
        }

        // otherwise, fields are being shown
        // start with the height of the current panel
        // N.B: when fields are not being shown, this value is equivalent to just the header height
        let height = schemas[key].dom.height();
        // console.log("calcHeight", height);
        if(height > view.maxPanelHeight) {
            height = view.maxPanelHeight;
        }
        
        // check for custom height in view
        let config = getSchemaView(view, key);
        if(config.panelHeight) {
            // height is defined for schema in view, use this value
            height = config.panelHeight;
        }
        return height;
    }

    // TODO We need to set the .panel-body height and remove max-height from CSS
    // so that we can override from here
    
    for (let [key, val] of nodes.entries()) {
        // console.log("node", key, val, schemas[key].dom);
        g.setNode(key, {
            label: val.name,
            width: schemas[key].dom.width(),
            height: calcHeight(key),
        })
        for (const e in val.edges) {
            // console.log("edge", key, val.edges[e].name);
            g.setEdge(key, val.edges[e].name)
        }
    }

    // calculate layout
    layout(g)

    // update the DOM elements based on layout data
    // results from the calculation, nodes now contain co-ordinates
    g.nodes().forEach(function (v) {
        //console.log("Node " + v + ": " + JSON.stringify(g.node(v)), g.node(v));

        let h = calcHeight(v);
        let n = g.node(v)
        schemas[v].dom.css({
            width: n.width,
            // height: n.height,
            left: n.x - n.width / 2,
            top: n.y - n.height / 2,
        })

        // set scrollable panel height 
        // panel height minus header equals body height
        schemas[v].dom.find('.panel-body').css('height', h - schemas[v].dom.find('.panel-header').outerHeight());
    })
}

const onPanelBodyScroll = function (evt, prevLeft, svg) {
    // only respond to vertical scroll events
    var currentLeft = $(evt.currentTarget).scrollLeft()
    var parent = $(evt.currentTarget).parent('.panel')
    // refresh arrows on vertical scroll only
    if (prevLeft != currentLeft) {
        prevLeft = currentLeft
    } else {
        // hiding fields triggers a scroll event
        if(state.view.showFields === true) {
            // only draw arrows if we are showing fields
            refreshFieldArrows(svg, state.map, state.fields, state.view, parent)
        }
    }
}

const drawSchemaArrows = function(graph, schemas, svg) {
    svg.emptyCanvas();
    
    for(let [key, val] of graph) {
        let source = val;
        // console.log("source", val);
        for(let i = 0; i<source.edges.length; i++) {
            // console.log("edge", source.edges[i]);
            // draw arrow between source and edge
            svg.connectPanels(schemas[source.name].dom[0], schemas[source.edges[i].name].dom[0])
        }
    }
}

/** Redraw the SVG arrows */
const drawFieldArrows = (svg, data, fields, view) => {
    svg.emptyCanvas();

    for (let m in data.map) {
        let s = data.map[m].source['$ref']
        let d = data.map[m].destination['$ref']
        if (fields[s] && fields[d]) {
            let srcParent = $(fields[s].dom[0]).parents('.panel-body')
            let destParent = $(fields[d].dom[0]).parents('.panel-body')

            let srcPanel = $(fields[s].dom[0]).parents('.panel')
            let destPanel = $(fields[d].dom[0]).parents('.panel')

            let srcView = view.schemas.filter(p => p['$ref'] == s.substring(0, s.indexOf('#')))[0];
            let destView =  view.schemas.filter(p => p['$ref'] == d.substring(0, d.indexOf('#')))[0];

            let connect = {
                source: {
                    el: fields[s].dom[0],
                    minY: srcParent.offset().top,
                    maxY: srcParent.offset().top + srcParent.height(),
                    scrollWidth:
                        srcParent[0].offsetWidth - srcParent[0].clientWidth,
                    borderWidth: 2, // srcPanel[0].clientTop,
                    animComplete: fields[s].animComplete,
                    multiplicity: fields[s].multiplicity || "",
                    cssClass: srcView.panelClass
                },
                destination: {
                    el: fields[d].dom[0],
                    minY: destParent.offset().top,
                    maxY: destParent.offset().top + destParent.height(),
                    scrollWidth:
                        destParent[0].offsetWidth - destParent[0].clientWidth,
                    borderWidth: 2 // destParent[0].clientTop
                },
                color:
                    fields[s].selected || fields[d].selected
                        ? 'red'
                        : 'blue',
                selected: fields[s].selected || fields[d].selected
            }
            // console.log("connect", m, connect);

            // generate an SVG line between source and destination
            let polyline = svg.connectDivs(connect);
            
            // store reference to the SVG connector
            fields[s].connector = polyline;
            // fields[d].connector = polyline;
        }
    }
}

/** Redraw SVG arrwos between direct ancenstors and descendants */
const refreshFieldArrows = (svg, data, fields, view, panelEl) => {
    // get the schema key from the DOM element
    let key = panelEl.data('key')

    // obtain the schema from the state
    let schema = state.schemas[key];

    // generate configuration for SVG drawing
    let generateConfig = (view, source, destination) => {
        let srcParent = $(source.dom[0]).parents('.panel-body')
        let destParent = $(destination.dom[0]).parents('.panel-body')
        let srcView = view.schemas.filter(p => p['$ref'] == source.key.substring(0, source.key.indexOf('#')))[0];
        
        let config = {
            source: {
                el: source.dom[0],
                minY: srcParent.offset().top,
                maxY: srcParent.offset().top + srcParent.height(),
                scrollWidth:
                    srcParent[0].offsetWidth - srcParent[0].clientWidth,
                borderWidth: 2, // srcPanel[0].clientTop,
                animComplete: source.animComplete,
                multiplicity: source.multiplicity || "",
                cssClass: srcView.panelClass,
                svg: source.connector
            },
            destination: {
                el: destination.dom[0],
                minY: destParent.offset().top,
                maxY: destParent.offset().top + destParent.height(),
                scrollWidth:
                    destParent[0].offsetWidth - destParent[0].clientWidth,
                borderWidth: 2 // destParent[0].clientTop
            },
            selected: source.selected || destination.selected
        }
        return config;
    }

    let configs = [];
    for(let i=0; i<schema.fields.length; i++) {
        // mapped to fields
        let source = schema.fields[i];
        let destination = schema.fields[i].mappedTo
        if(destination != null) {
            configs.push(generateConfig(view, source, destination));
            /*
            let srcParent = $(source.dom[0]).parents('.panel-body')
            let destParent = $(destination.dom[0]).parents('.panel-body')
            let srcView = view.schemas.filter(p => p['$ref'] == source.key.substring(0, source.key.indexOf('#')))[0];
            
            let config = {
                source: {
                    el: source.dom[0],
                    minY: srcParent.offset().top,
                    maxY: srcParent.offset().top + srcParent.height(),
                    scrollWidth:
                        srcParent[0].offsetWidth - srcParent[0].clientWidth,
                    borderWidth: 2, // srcPanel[0].clientTop,
                    animComplete: source.animComplete,
                    multiplicity: source.multiplicity || "",
                    cssClass: srcView.panelClass,
                    svg: source.connector
                },
                destination: {
                    el: destination.dom[0],
                    minY: destParent.offset().top,
                    maxY: destParent.offset().top + destParent.height(),
                    scrollWidth:
                        destParent[0].offsetWidth - destParent[0].clientWidth,
                    borderWidth: 2 // destParent[0].clientTop
                },
                selected: source.selected || destination.selected
            }
            // add to be rendered later
            configs.push(config)
            */
        }

        // mapped from fields
        source = schema.fields[i].mappedFrom;
        destination = schema.fields[i]
        if(source != null) {
            configs.push(generateConfig(view, source, destination));
        }
    }

    // update the SVG elements
    configs.forEach(cfg => svg.connectDivs(cfg))
}

/** Refresh a panel contents */
const refreshPanel = (id) => {
    // console.log("refreshPanel", id, state.schemas[id]);

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

    // remove all elements from panel-body
    // use "detach" to keep listeners and data
    state.schemas[id].dom.find('.panel-body > *').detach();
    // insert DOM elements
    for (let i = 0; i < fields.length; i++) {
        state.schemas[id].dom.find('.panel-body').append(fields[i].dom)
    }
}

/** Returns true if the supplied field is required */
const isFieldRequired = (schema, pointer) => {
    let key = pointer.substring(pointer.lastIndexOf('/') + 1)
    let props = pointer.substring(0, pointer.lastIndexOf('/properties'))
    
    let node = JsonPointer.get(schema, pointer)
    let parent = JsonPointer.get(schema, props);

    // console.log("isFieldRequired", pointer, parent.required, node.minLength);

    if(props.required && props.required.includes(key)) {
        return true;
    }
    if(node.minLength && node.minLength > 0) {
        return true;
    }
    return false;
}

/** Show/hide the loading spinner */
const showLoadingSpinner = (show) => {
    if(show) {
        $('.loading-mask').show();
    }
    else {
        $('.loading-mask').fadeOut('fast');
        $('.loading-spinner').addClass('-paused');
    }
}

/** Draw and layout the page including the SVG arrows */
async function draw(mapPath, viewPath) {
    const svg = new Svg()

    // fetch the map
    let response = await fetch(mapPath)
    state.map = await response.json()
    let data = state.map;
    console.log("map", data);

    // fetch the view file
    response = await fetch(viewPath)
    let view = await response.json()
    state.view = {...state.view, ...view}; // add to existing options
    console.log("view", state.view);

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

    // only include a schema path if it is included in the View
    let filtered = [...paths].filter(p => viewContainsSchema(view, p));
    state.paths = [...filtered];
    //console.log('paths', state.paths)

    //
    // Step 2. Draw schema at each of the paths
    //

    // fields contains DOM nodes for each Field
    const fields = {}
    // schemas contains DOM nodes for each Panel
    const schemas = {}
    // parser for dereferencing
    const parser = new $RefParser()

    for (let path of state.paths) {
        // fetch the schema file
        let response = await fetch(path)

        // get the schema JSON
        let json = await response.json()

        // load any dereference documents to get full JSON
        await parser.dereference(json)

        // create an array of pointers for all fields in schema file
        let pointers = buildPointers(json)

        // create DOM panel
        let $tpl = $(
            `<div class="panel">
                <div class="panel-header"><span>${json.title}</span><i class="icon faker-icon"></i></div>
                <div class="panel-body"></div>
            </div>`
        ).data('key', path)

        // add a scroll handler for the panel body
        let prevLeft = 0;
        $tpl.find('.panel-body').on('scroll', e => onPanelBodyScroll(e, prevLeft, svg));

        // add custom panel class if defined in the view
        view.schemas.forEach(s => s['$ref'] == path && s.panelClass ? $tpl.addClass(s.panelClass) : null);

        let payload = fakeJson(json)

        $tpl.find('.faker-icon').on('click', e => {
            alert(JSON.stringify(payload));
        })

        schemas[path] = {
            dom: $tpl,
            sort: 'map',
            sortDir: null,
            // pointers: pointers,
            fields: [],
            payload: payload
        }

        // for each Field of a Schema
        for (const pointer of pointers) {
            let key = path + '#' + pointer
            // store reference use id as the key
            // TODO store in object form
            fields[key] = {}
            fields[key]['key'] = key
            fields[key]['pointer'] = pointer
            
            // if schema root is defined then strip the label of the first part 
            // as defined by the root property
            if(json.root) {
                let label = pointer.replaceAll(json.root, '')
                fields[key]['label'] = label.replaceAll('/properties', '')
            }
            else {
                fields[key]['label'] = pointer.replaceAll('/properties', '')
            }

            fields[key]['label'] = fields[key]['label'].substring(1) // strip leading forward-slash
            fields[key]['node'] = JsonPointer.get(json, pointer)
            fields[key]['selected'] = false
            fields[key]['animComplete'] = false
            fields[key]['mapped'] = false
            fields[key]['mappedTo'] = null;
            fields[key]['mappedFrom'] = null;
            fields[key]['ancestors'] = [];
            fields[key]['descendants'] = [];

            // work out if a field is required
            let required = isFieldRequired(json, pointer);

            // DOM element for Field
            let $el = $(
                `<div class="field">
                    <i class="icon label-icon"></i>
                    <div class="field-label">
                        <span>${fields[key]['label']}</span>${required ? ' <i class="icon required-icon"></i>' : ''}
                    </div>
                    <div class="field-datatype">${fields[key]['node'].type}</div>
                    ${fields[key]['node'].maxLength ? '<div class="field-maxlength">(' + fields[key]['node'].maxLength + ')</div>' : ''}
                </div>`
            )
            // selection handler
            .on('click', e => onFieldSelect(e, state.map, state.fields))
            // add JSON Pointer to the field data
            .data('key', key)

            // store the element reference
            fields[key]['dom'] = $el

            // store reference in an ordered list for display
            schemas[path].fields.push(fields[key])
        }

        // update state
        state.schemas[path] = schemas[path]

        // write fields in the panel
        refreshPanel(path)

        // add the panel to the body of the page
        $('#panels').append($tpl)
    }

    // console.log('schemas', schemas)

    // set "mapped" attribute for use by checkbox
    for (let m in data.map) {
        let s = data.map[m].source['$ref']
        let d = data.map[m].destination['$ref']
        if(!viewContainsSchema(view, s.substring(0, s.indexOf('#'))) || 
            !viewContainsSchema(view, d.substring(0, d.indexOf('#')))) {
            continue;
        }
        if (fields[s]) {
            fields[s].mapped = true
            fields[s].mappedTo = fields[d];
            fields[s].multiplicity = data.map[m].multiplicity
            fields[s].ancestors = getAncestors(data, fields[s].key)
            fields[s].descendants = getDescendants(data, fields[s].key)
        }
        if (fields[d]) {
            fields[d].mapped = true
            fields[d].mappedFrom = fields[s];
            fields[d].ancestors = getAncestors(data, fields[d].key)
            fields[d].descendants = getDescendants(data, fields[d].key)
        }
    }

    state.fields = fields
    // console.log('fields', fields)

    //
    // Step 4. Layout the Schema Panels
    //

    const g = new dagre.graphlib.Graph()
    g.setGraph({})
    g.setDefaultEdgeLabel(function () {
        return {}
    })
    g.graph().rankdir = 'LR'
    g.graph().ranksep = 200
    g.graph().nodesep = 50
    g.graph().marginx = 35
    g.graph().marginy = 85

    // TODO exclude any mapping where the source or destination mapping schema is not in the view
    let dependencyGraph = buildDependencyGraph(data, view);

    layoutPanels(g, dependencyGraph, schemas, svg, view)

    //
    // Step 4. Draw the arrows
    //
    drawFieldArrows(svg, state.map, state.fields, state.view)

    //
    // Step 5. Setup event handlers
    //

    let onFieldLayoutChange = e => {
        // console.log("onFieldLayoutChange", state.view)
        if(state.view.showFields === true) {
            for (let f in state.fields) {
                if (state.view.showUnmappedFields === true) {
                    state.fields[f].dom.show()
                } else {
                    if (state.fields[f].mapped === false) {
                        state.fields[f].dom.hide()
                    }
                    else {
                        state.fields[f].dom.show()
                    }
                }
            }
        }
        else {
            // dont show any fields
            for (let f in state.fields) {
                state.fields[f].dom.hide()
            }            
        }
        
        // layout panels after we remove the fields
        layoutPanels(g, dependencyGraph, schemas, svg, view)

        if(state.view.showFields === true) {
            drawFieldArrows(svg, state.map, state.fields, state.view)
        }
        else {
            drawSchemaArrows(dependencyGraph, schemas, svg);
        }
    }

    // auto-complete
    let timeoutId = 0
    // TODO lift up to state
    let matched = []

    $('#autocomplete').on('keydown', (evt) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(e => onAutoComplete(evt, fields, matched), 350)
    })

    $('#showMappedFieldsOnlyCb').on('change', e => {
        state.view.showUnmappedFields = !$(e.currentTarget).is(':checked')
        onFieldLayoutChange(e)
    })

    $('#showSchemasOnlyCb').on('change', e => {
        state.view.showFields = !$(e.currentTarget).is(':checked')
        onFieldLayoutChange(e)
    })

    $('#sortType').on('change', (e) => {
        // update all the panels
        for (let key in state.schemas) {
            state.schemas[key].sort = $(e.currentTarget).val()
            refreshPanel(key)
            onFieldLayoutChange(e)
        }
    })

    // simple tooltip implementation
    let timer;
    let delay = 1500;
    let mouseX, mouseY = 0;
    // mouse enters Field area
    $('.field').on({
        mouseenter: function(e){
            timer = setTimeout(function() {
                // show tooltip

                // elements to render to the tooltip
                let els = [];

                // get the field key
                let key = $(e.currentTarget).data('key');

                // add the field label
                els.push($('<div class="meta-label"></div>').text(fields[key].label))

                // default to the JSON schema description
                if(fields[key].node.description) {
                    els.push($('<div class="meta-desc"></div>').text(fields[key].node.description))
                }

                // build key/value for JSON schema properties
                let schemaFields = [];
                let schemaWrapper;
                ['type', 'minLength', 'maxLength'].forEach(k => {
                    let metas = [];
                    metas.push($('<span class="meta-key" />').text(k));
                    metas.push($('<span class="meta-val" />').text(fields[key].node[k]));
                    schemaFields.push($('<div class="meta-field" />').append(metas));
                });
                schemaWrapper = $('<div class="meta-info"></div>').append(schemaFields);
                
                // build key/value pair DOM elements
                let metaWrapper;
                if(fields[key].node.meta) {
                    let metaFields = [];
                    for(let m in fields[key].node.meta) {
                        let metas = [];
                        metas.push($('<span class="meta-key" />').text(m));
                        metas.push($('<span class="meta-val" />').text(fields[key].node.meta[m]));
                        metaFields.push($('<div class="meta-field" />').append(metas));
                    }
                    metaWrapper = $('<div class="meta-info"></div>').append(metaFields);
                }
                
                let el = $('<div class="meta"></div>').append(els).append(schemaWrapper).append(metaWrapper);
                
                // use current mouse position
                $('<p class="tooltip"></p>')
                    .append(el)
                    .appendTo('body')
                    .css('top', (mouseY - 10) + 'px')
                    .css('left', (mouseX + 20) + 'px')
                    .fadeIn('fast');
            }, delay);
        },
        mouseleave: function(e){
            // on mouse out, cancel the timer
            clearTimeout(timer);
            $('.tooltip').remove();
        },
        mousemove: function(e){
            // track mouse position for when Field finally appears after setTimeout
            mouseX = e.pageX;
            mouseY = e.pageY;
            $('.tooltip').css('top', (mouseY - 10) + 'px').css('left', (mouseX + 20) + 'px');
        }
    })
    
    // extend SVG canvas to match document DOM size
    $('#svg-canvas').attr('width', $(document).width())
    $('#svg-canvas').attr('height', $(document).height())
}

/** Runs the app when the DOM is fully loaded */
$(function () {
    async function loadMap(map, view) {
        // draw the map using a view
        await draw(map, view)
        console.log('state', state)
        setTimeout(e => {
            showLoadingSpinner(false)
        }, 500);
    }

    showLoadingSpinner(true)
    loadMap('maps/intro.map.json', 'views/intro.view.json')
})

/** Node used in dependency graph */
const Node = function Node(name) {
    this.name = name;
    this.edges = [];
}
Node.prototype.addEdge = function(node) {
    // unique dependencies only
    if(!this.edges.includes(node)) {
        this.edges.push(node);
    }
}