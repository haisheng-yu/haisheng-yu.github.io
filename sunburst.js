
var width = 1500,
    height = 500,
    radius = Math.min(width, height) / 2.2;

var x = d3.scale.linear()
    .range([0, 2 * Math.PI]);

var y = d3.scale.sqrt()
    .range([0, radius]);

var color = d3.scale.category20c();

var b = {
  w: 125, h: 30, s: 3, t: 10
};


var chartOn = false;
var svg; 
var partition;
var arc;
var path;
initializeBreadcrumbTrail();

function updateChart(wave) {
  if (chartOn === false) {
    initChart(wave);
  } else {
    document.getElementById("chart").innerHTML = "";
    d3.select("#chart").selectAll("*").remove();
    svg = "";
    arc = "";
    path = "";
    initChart(wave);
  }
}


function initChart(wave) {
  chartOn = true;
  svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height)
  .append("g")
    .attr("transform", "translate(" + width / 2 + "," + (height / 2 + 10) + ")");

  partition = d3.layout.partition()
    .sort(null)
    .value(function(d) { 
      //console.log(d);
      return d.size; });

  arc = d3.svg.arc()
    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
    .innerRadius(function(d) { return Math.max(0, y(d.y)); })
    .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });


  d3.select("#chart").on("mouseleave", mouseleave);


var node;

  d3.json(wave, function(error, root) {
    node = root;
    path = svg.datum(root).selectAll("path")
        .data(partition.nodes)
      .enter().append("path")
        .attr("d", arc)
        .style("fill", function(d) { 
          
          return color((d.children ? d : d.parent).name);
         
        })
        .style('stroke', 'white')
          .style('stroke-width', '.75')
        .attr("class", function(d) {
          return d.name;
        })
        .on("click", click)
        .each(stash)
        .on("mouseover", mouseover);;

    d3.selectAll("input").on("change", function change() {
      var value = this.value === "count"  // if statement
          ? function() { return 1; }    // if true
          : function(d) {               // else
            console.log(d.size);
            return d.size; };

      path
          .data(partition.value(value).nodes)
        .transition()
          .duration(1000)
          .attrTween("d", arcTweenData);
    });

    function click(d) {
      node = d;
      path.transition()
        .duration(1000)
        .attrTween("d", arcTweenZoom(d));
    }


  });
}

d3.select(self.frameElement).style("height", height + "px");

function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

function arcTweenData(a, i) {
  var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
  function tween(t) {
    var b = oi(t);
    a.x0 = b.x;
    a.dx0 = b.dx;
    return arc(b);
  }
  if (i == 0) {
    var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
    return function(t) {
      x.domain(xd(t));
      return tween(t);
    };
  } else {
    return tween;
  }
}

function arcTweenZoom(d) {
  var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
      yd = d3.interpolate(y.domain(), [d.y, 1]),
      yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
  return function(d, i) {
    return i
        ? function(t) { return arc(d); }
        : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
  };
}


function mouseover(d) {
  d3.selectAll("path")
      .style("opacity", 0.6);

  var sequenceArray = getAncestors(d);
  updateBreadcrumbs(sequenceArray, d.size);

  svg.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}


function mouseleave(d) {

  d3.select("#trail")
      .style("visibility", "hidden");

  d3.selectAll("path").on("mouseover", null);

  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

}

function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}


function initializeBreadcrumbTrail() {
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { 
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

function updateBreadcrumbs(nodeArray, percentageString) {

  var g = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.name + d.depth; });

 
  var entering = g.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return color("blue"); });

  entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { 
        return d.name; 
      });

  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  g.exit().remove();

  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function() {
        if (percentageString !== undefined) {
          return percentageString + '%'
        } 
      });

  d3.select("#trail")
      .style("visibility", "");

}
