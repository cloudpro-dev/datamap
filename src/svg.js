var Svg = function Svg() {
    var svg = document.getElementById('svg-canvas')
    if (null == svg) {
        this.canvas = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        )
        this.canvas.setAttribute('id', 'svg-canvas')
        this.canvas.setAttribute('style', 'position:absolute;top:0px;left:0px')
        this.canvas.setAttribute('width', document.body.clientWidth)
        this.canvas.setAttribute('height', document.body.clientHeight)
        this.canvas.setAttributeNS(
            'http://www.w3.org/2000/xmlns/',
            'xmlns:xlink',
            'http://www.w3.org/1999/xlink'
        )

        document.body.appendChild(this.canvas)
    } else {
        this.canvas = document.getElementById('svg-canvas');
    }
}

Svg.prototype.drawCircle = function (x, y, radius, color) {
    var svg = this.canvas 
    
    // equivalent to: <circle cx="10" cy="10" r="10" fill="blue" />

    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    shape.setAttributeNS(null, 'cx', x)
    shape.setAttributeNS(null, 'cy', y)
    shape.setAttributeNS(null, 'r', radius)
    shape.setAttributeNS(null, 'fill', color)
    svg.appendChild(shape)
}

Svg.prototype.drawRectangle = function (x, y, width, height, anim, multiplicity) {
    
    // equivalent to: <rect x="0" y="0" width="10" height="10" />
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    shape.setAttributeNS(null, 'x', x)
    shape.setAttributeNS(null, 'y', y)
    shape.setAttributeNS(null, 'width', width)
    shape.setAttributeNS(null, 'height', height)

    // equivalent to: <text x="0" y="50" class="anim">Hello</text>
    var label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttributeNS(null, 'x', x + 6)
    label.setAttributeNS(null, 'y', y + 10)
    if(anim === true) {
        label.setAttributeNS(null, 'class', 'anim')
    }
    label.append(multiplicity);

    // equivalent to: <g>
    var group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    group.appendChild(shape);
    group.appendChild(label);
    
    return group;
}

Svg.prototype.refreshRectangle = function (el, x, y, width, height, anim, multiplicity) {
    
    // el represents the SVG group (g) element
    var label = el.querySelector('text')
    var shape = el.querySelector('rect')

    // equivalent to: <rect x="0" y="0" width="10" height="10" />
    shape.setAttributeNS(null, 'x', x)
    shape.setAttributeNS(null, 'y', y)
    shape.setAttributeNS(null, 'width', width)
    shape.setAttributeNS(null, 'height', height)

    // equivalent to: <text x="0" y="50" class="anim">Hello</text>
    label.setAttributeNS(null, 'x', x + 6)
    label.setAttributeNS(null, 'y', y + 10)
    label.setAttributeNS(null, 'class', anim === true ? 'anim' : '')
    label.textContent = multiplicity;
    
    return el;
}

Svg.prototype.drawCurvedLine = function (x1, y1, x2, y2, color, slack) {
    var svg = this.canvas
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    var delta = (x2 - x1) * slack
    var hx1 = x1 + delta
    var hy1 = y1
    var hx2 = x2 - delta
    var hy2 = y2 
    
    // equivalent to: <path d="M 726 180 C 276 87 270 10 0 0" fill="none" stroke="#456"/>

    var path =
        'M ' +
        x1 +
        ' ' +
        y1 +
        ' C ' +
        hx1 +
        ' ' +
        hy1 +
        ' ' +
        hx2 +
        ' ' +
        hy2 +
        ' ' +
        x2 +
        ' ' +
        y2
    shape.setAttributeNS(null, 'd', path)
    shape.setAttributeNS(null, 'fill', 'none')
    shape.setAttributeNS(null, 'stroke', color)
    svg.appendChild(shape)
}

Svg.prototype.drawStraightLine = function(x1, y1, x2, y2, color) {
    var svg = this.canvas
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    shape.setAttributeNS(null, 'x1', x1)
    shape.setAttributeNS(null, 'y1', y1)
    shape.setAttributeNS(null, 'x2', x2)
    shape.setAttributeNS(null, 'y2', y2)
    shape.setAttributeNS(null, 'stroke', color)
    svg.appendChild(shape)
}

Svg.prototype.drawStraightArrow = function(x1, y1, x2, y2) {
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    shape.setAttributeNS(null, 'x1', x1)
    shape.setAttributeNS(null, 'y1', y1)
    shape.setAttributeNS(null, 'x2', x2)
    shape.setAttributeNS(null, 'y2', y2)
    
    var group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttributeNS(null, 'class', 'panel-line')
    group.append(shape);


    return group;
}

Svg.prototype.drawPolyline = function(points) {
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')

    var str = "";
    points.map(p => {
        str += p.x + "," + p.y + " "
    });
    
    shape.setAttributeNS(null, 'points', str)
    shape.setAttributeNS(null, 'fill', 'none')
    return shape
}

Svg.prototype.refreshPolyline = function(el, points) {
    var str = "";
    points.map(p => {
        str += p.x + "," + p.y + " "
    });
    
    el.setAttributeNS(null, 'points', str)

    return el
}

Svg.prototype.findAbsolutePosition = function (htmlElement) {
    var x = htmlElement.offsetLeft
    var y = htmlElement.offsetTop

    for (var x = 0, y = 0, el = htmlElement; el != null; el = el.offsetParent) {
        x += el.offsetLeft - el.scrollLeft
        y += el.offsetTop - el.scrollTop
    }

    return {
        x: x,
        y: y,
    }
}

/** Empty the canvas */
Svg.prototype.emptyCanvas = function () {
    // querySelectorAll gives a static list
    var els = document.getElementById('svg-canvas').querySelectorAll('*')
    for(var i=0; i<els.length; i++) {
        els[i].remove();
    }
}

Svg.prototype.drawLine = function(color) {
    var svg = this.canvas
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    shape.setAttributeNS(null, 'fill', 'none')
    shape.setAttributeNS(null, 'stroke', color)
}

Svg.prototype.drawArrow = function(x, y) {
    var svg = this.canvas

    // make a triange based on the co-ordinates of the destination
    var markerWidth = 10;
    var markerHeight = 5;
    var points = [
        {x: x - markerWidth, y: y-(markerHeight/2)}, 
        {x: x, y: y}, 
        {x: x - markerWidth, y: y + (markerHeight / 2)}
    ];

    let str = "";
    for(let i=0; i<points.length; i++) {
        str += points[i].x + ' ' + points[i].y
        if(i+1 != points.length) {
            str += ', '
        }
    }
    
    var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttributeNS(null, 'points', str)
    //polygon.setAttributeNS(null, 'stroke', 'none')
    //polygon.setAttributeNS(null, 'fill', color)
    
    return polygon;
}

Svg.prototype.refreshArrow = function(el, x, y) {
    // make a triange based on the co-ordinates of the destination
    var markerWidth = 10;
    var markerHeight = 5;
    var points = [
        {x: x - markerWidth, y: y-(markerHeight/2)}, 
        {x: x, y: y}, 
        {x: x - markerWidth, y: y + (markerHeight / 2)}
    ];

    let str = "";
    for(let i=0; i<points.length; i++) {
        str += points[i].x + ' ' + points[i].y
        if(i+1 != points.length) {
            str += ', '
        }
    }
    
    el.setAttributeNS(null, 'points', str)
    
    return el;
}

Svg.prototype.drawGroup = function(rect, line, arrow, selected, anim, cssClass) {
    var svg = this.canvas
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'g')

    let className = 'svg-connector'
    if(selected) className += ' selected'
    if(anim) className += ' anim'
    if(cssClass) className += ' ' + cssClass

    shape.setAttributeNS(null, 'class', className)
    shape.append(line);
    shape.append(arrow);
    shape.append(rect);

    svg.append(shape)

    // console.log("drawGraphic", shape, anim)

    return shape;
}

Svg.prototype.refreshGroup = function(el, selected, anim, cssClass) {
    let className = 'svg-connector'
    if(selected) className += ' selected'
    if(anim) className += ' anim'
    if(cssClass) className += ' ' + cssClass

    el.setAttributeNS(null, 'class', className)

    return el;
}

Svg.prototype.connectPanels = function (left, right) {
    var svg = this.canvas

    // source
    var leftPos = this.findAbsolutePosition(left)
    var x1 = leftPos.x += left.offsetWidth
    var y1 = leftPos.y
    y1 += left.offsetHeight / 2

    // destination
    var rightPos = this.findAbsolutePosition(right)
    var x2 = rightPos.x
    var y2 = rightPos.y
    y2 += right.offsetHeight / 2

    let shape = this.drawStraightArrow(x1, y1, x2, y2);
    shape.setAttributeNS(null, 'class', 'panel-line');
    svg.append(shape);
}

Svg.prototype.connectDivs = function (config) {
    // config
    let left = config.source.el
    let right = config.destination.el
    let scroll = config.source.scrollWidth
    let border = config.source.borderWidth
    let selected = config.selected
    let anim = config.source.animComplete
    let label = config.source.multiplicity
    let cssClass = config.source.cssClass
    let svgEl = config.source.svg // existing element
    
    var circleRadius = 3 // circle radius
    var markerWidth = 20 // marker width
    var markerHeight = 13 // marker height
    var inset = 40; // inset for the lines from panel edge

    // source
    var leftPos = this.findAbsolutePosition(left)
    var x1 = leftPos.x
    var y1 = leftPos.y
    x1 += left.offsetWidth + scroll + border
    y1 += left.offsetHeight / 2
    y1 = Math.max(config.source.minY + (markerHeight / 2), y1) // clip top
    y1 = Math.min(config.source.maxY - (markerHeight / 2), y1) // clip bottom
    
    // destination
    var rightPos = this.findAbsolutePosition(right)
    var x2 = rightPos.x
    var y2 = rightPos.y
    y2 += right.offsetHeight / 2
    y2 = Math.max(config.destination.minY, y2) // clip top
    y2 = Math.min(config.destination.maxY, y2) // clip bottom
    
    var width = x2 - x1
    var height = y2 - y1

    let visualOffset = 3;

    var points = [];
    points.push({x: x1, y: y1 + visualOffset});
    points.push({x: x1 + inset, y: y1 + visualOffset});
    points.push({x: x2 - inset, y: y2 + visualOffset});
    points.push({x: x2, y: y2 + visualOffset});

    // wrap calculated values into a set of arguments
    var args = {
        label,
        x1,
        y1,
        x2,
        y2,
        markerWidth,
        markerHeight,
        points,
        visualOffset,
        anim,
        selected,
        cssClass,
        svgEl
    }

    // draw or refresh based on presence of existing SVG element
    return svgEl == null ? this.drawConnector(args) : this.refreshConnector(args);
}

/** Draw a connector */
Svg.prototype.drawConnector = function(config) {
    // multi-point lines with rectangle endings
    let srcMarker = this.drawRectangle(config.x1, config.y1 - (config.markerHeight/2) + config.visualOffset, config.markerWidth, config.markerHeight, config.anim, config.label)
        
    // co-ordinates are the tip of the arrow
    let destMarker = this.drawArrow(config.x2, config.y2 + config.visualOffset);

    // points for the multi-point arrow line
    let connector = this.drawPolyline(config.points)

    // draw group containing all the elements
    return this.drawGroup(srcMarker, connector, destMarker, config.selected, config.anim, config.cssClass);
}

/** Refresh a connector */
Svg.prototype.refreshConnector = function(config) {
    // config.el is the main group for the whole connector

    // multi-point lines with rectangle endings
    this.refreshRectangle(config.svgEl.querySelector('g'), config.x1, config.y1 - (config.markerHeight/2) + config.visualOffset, config.markerWidth, config.markerHeight, config.anim, config.label)
        
    // co-ordinates are the tip of the arrow
    this.refreshArrow(config.svgEl.querySelector('polygon'), config.x2, config.y2 + config.visualOffset)

    // points for the multi-point arrow line
    this.refreshPolyline(config.svgEl.querySelector('polyline'), config.points)

    // update group class name
    return this.refreshGroup(config.svgEl, config.selected, config.anim, config.cssClass)
}

export default Svg

