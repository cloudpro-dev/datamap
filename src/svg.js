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

Svg.prototype.drawRecentangle = function (x, y, width, height, color) {
    var svg = this.canvas 
    
    // equivalent to: <rect x="0" y="0" width="10" height="10" fill="blue" />

    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    shape.setAttributeNS(null, 'x', x)
    shape.setAttributeNS(null, 'y', y)
    shape.setAttributeNS(null, 'width', width)
    shape.setAttributeNS(null, 'height', height)
    shape.setAttributeNS(null, 'fill', color)
    
    return shape;
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

Svg.prototype.drawPolyline = function(points, color) {
    var svg = this.canvas
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')

    var str = "";
    var ps = points.map(p => {
        str += p.x + "," + p.y + " "
    });
    
    shape.setAttributeNS(null, 'points', str)
    shape.setAttributeNS(null, 'fill', 'none')
    shape.setAttributeNS(null, 'stroke', color)
    // shape.setAttributeNS(null, 'marker-start', 'url(#rect)')
    // shape.setAttributeNS(null, 'marker-end', 'url(#arrowhead)')
    return svg.appendChild(shape)
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

/** Empty the canvas and leave the arrow head definition in place */
Svg.prototype.emptyCanvas = function () {
    var els = document.querySelectorAll("g");
    
    for(var i=0; i<els.length; i++) {
        // dont remove the object definitions in "defs"
        if(els[i].parentNode.tagName == 'svg')
            els[i].remove();
    }
}

Svg.prototype.drawLine = function(color) {
    var svg = this.canvas
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    shape.setAttributeNS(null, 'fill', 'none')
    shape.setAttributeNS(null, 'stroke', color)
}

Svg.prototype.drawArrow = function(x, y, color) {
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
    polygon.setAttributeNS(null, 'stroke', color)
    polygon.setAttributeNS(null, 'fill', color)
    
    return polygon;
}

Svg.prototype.drawGraphic = function(rect, line, arrow) {
    var svg = this.canvas
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    shape.append(rect);
    shape.append(line);
    shape.append(arrow);
    return svg.append(shape);
}

Svg.prototype.connectDivs = function (config) {
    // config
    let left = config.source.el
    let right = config.destination.el
    let color = config.color
    let slack = config.slack
    let scroll = config.source.scrollWidth
    let border = config.source.borderWidth
    
    var circleRadius = 3 // circle radius
    var markerWidth = 20 // marker width
    var markerHeight = 8 // marker height
    var inset = 30; // inset for the lines from panel edge

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

    /* Straight lines */
    //this.drawCircle(x1 + circleRadius, y1, circleRadius, color)
    //this.drawCircle(x2 - circleRadius, y2, circleRadius, color)
    //this.drawStraightLine(x1 + circleRadius, y1, x2 - circleRadius, y2, color)

    /* Simple curved lines */
    //this.drawCircle(x1 + circleRadius, y1, circleRadius, color)
    //this.drawCircle(x2 - circleRadius, y2, circleRadius, color)
    //this.drawCurvedLine(x1, y1, x2, y2, color, 0.2)

    /* Multi-point lines with circle endings */
    //this.drawCircle(x1 + circleRadius, y1, circleRadius, color)
    //this.drawCircle(x2 - circleRadius, y2, circleRadius, color)
    //var points = [];
    //points.push({x: x1 + circleRadius, y: y1});
    //points.push({x: x1 + inset, y: y1});
    //points.push({x: x2 - circleRadius - inset + circleRadius, y: y2});
    //points.push({x: x2 - circleRadius, y: y2});
    //this.drawPolyline(points, color)

    /* Multi-point lines with rectangle endings */
    let srcMarker = this.drawRecentangle(x1, y1 - (markerHeight/2), markerWidth, markerHeight, color)
    let destMarker = this.drawArrow(x2, y2, color);
    //this.drawRecentangle(x2-markerWidth, y2 - (markerHeight/2), markerWidth, markerHeight, color)
    
    // points for the polyline
    var points = [];
    points.push({x: x1, y: y1});
    points.push({x: x1 + inset, y: y1});
    points.push({x: x2 - inset, y: y2});
    points.push({x: x2, y: y2});
    
    let connector = this.drawPolyline(points, color)

    return this.drawGraphic(srcMarker, connector, destMarker);
}

export default Svg
