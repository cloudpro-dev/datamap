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

    // this.defineObjects('black');
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
    svg.appendChild(shape)
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
    shape.setAttributeNS(null, 'marker-start', 'url(#rect)')
    shape.setAttributeNS(null, 'marker-end', 'url(#arrowhead)')
    return svg.appendChild(shape)
}

Svg.prototype.defineObjects = function(color) {
    var svg = this.canvas

    /*
    <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" 
            refX="0" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" />
        </marker>
    </defs>
    */

    var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    svg.appendChild(defs)
    
    var marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
    marker.setAttributeNS(null, 'id', 'arrowhead')
    marker.setAttributeNS(null, 'markerWidth', 10)
    marker.setAttributeNS(null, 'markerHeight', 7)
    marker.setAttributeNS(null, 'refX', 0)
    marker.setAttributeNS(null, 'refY', 3.5)
    marker.setAttributeNS(null, 'orient', 'auto')

    var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    polygon.setAttributeNS(null, 'points', '0 0, 10 3.5, 0 7')
    // polygon.setAttributeNS(null, 'stroke', color)
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    
    /*
    <defs>
        <rect id="rect" width="10" height="7" stroke="black">
        </rect>
    </defs>
    */

   var rectMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
   rectMarker.setAttributeNS(null, 'id', 'rect')
   rectMarker.setAttributeNS(null, 'markerWidth', 20)
   rectMarker.setAttributeNS(null, 'markerHeight', 10)
   rectMarker.setAttributeNS(null, 'refX', 3)
   rectMarker.setAttributeNS(null, 'refY', 4)
   rectMarker.setAttributeNS(null, 'orient', 'auto')

   var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
   rect.setAttributeNS(null, 'width', 20)
   rect.setAttributeNS(null, 'height', 8)
   // rect.setAttributeNS(null, 'stoke', 'black')
   
   rectMarker.appendChild(rect)
   defs.appendChild(rectMarker);
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
    var els = document.querySelectorAll("path, rect, circle, ellipse, line, polyline, polygon");
    for(var i=0; i<els.length; i++) {
        // dont remove the object definitions in "defs"
        if(els[i].parentNode.tagName == 'svg')
            els[i].remove();
    }
}

Svg.prototype.connectDivs = function (config) {
    // config
    let left = config.source.el
    let right = config.destination.el
    let color = config.color
    let slack = config.slack
    let scroll = config.source.scrollWidth + 3

    // source
    var leftPos = this.findAbsolutePosition(left)
    var x1 = leftPos.x
    var y1 = leftPos.y
    x1 += left.offsetWidth + scroll
    y1 += left.offsetHeight / 2
    y1 = Math.max(config.source.minY + 4, y1) // clip top
    y1 = Math.min(config.source.maxY - 4, y1) // clip bottom
    
    // destination
    var rightPos = this.findAbsolutePosition(right)
    var x2 = rightPos.x
    var y2 = rightPos.y
    y2 += right.offsetHeight / 2
    y2 = Math.max(config.destination.minY, y2) // clip top
    y2 = Math.min(config.destination.maxY, y2) // clip bottom
    var width = x2 - x1
    var height = y2 - y1

    var circleRadius = 3 // circle radius
    var markerWidth = 20 // marker width
    var markerHeight = 8 // marker height
    var inset = 25; // inset for the lines from panel edge

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
    //this.drawRecentangle(x1, y1 - (markerHeight/2), markerWidth, markerHeight, color)
    //this.drawRecentangle(x2-markerWidth, y2 - (markerHeight/2), markerWidth, markerHeight, color)
    var points = [];
    points.push({x: x1, y: y1});
    points.push({x: x1 + inset, y: y1});
    points.push({x: x2 - inset, y: y2});
    points.push({x: x2 - 10, y: y2});
    
    return this.drawPolyline(points, color)
}

export default Svg
