

var margin = {top: 20, right: 20, bottom: 20, left: 20},
    width = 1200 - margin.right - margin.left,
    height = 800 - margin.top - margin.bottom;

var i = 0,
    duration = 750,
    root;

var tree = d3.layout.tree()
    .size([width, height]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.x, d.y]; });
function elbow(d, i) {
    var source = d.source;
    var target = d.target;
    var hy = (target.y-source.y)/2;
  return "M" + source.x + "," + source.y
         + "V" + (source.y+hy)
         + "H" + target.x + "V" + target.y;
};
var connector = elbow;
var selectedNode;
var selectedTarget = [];

var areaMap = [
  // redshift credentials
  {"source": 101,"target": 2, "message":"Postgres is not supported as a destination. <br> Cluster must be in a publicly accessible VPC and subnet."},
  // ga ecommerce credentials
  {"source": 27,"target": 1, "message":"Profile requires 'Read and Analyze' permissions."},
  // postgres credentials
  {"source": 10,"target": 1, "message":"Ensure Stitch IP is whitelisted."},
  // postgres configure
  {"source": 71,"target": 1, "message":"There are some datatypes we do not support (such as JSON and ARRAY)"}
];

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

d3.json("human.json", function(error, flare) {
  if (error) throw error;

  root = flare;
  root.x0 = height / 2;
  root.y0 = 0;

  function collapse(d) {
    if (d.children) {
      d._children = d.children;
      d._children.forEach(collapse);
      d.children = null;
    }
  }

  root.children.forEach(collapse);
  update(root);
});

d3.select(self.frameElement).style("height", "800px");

function update(source) {

  // Compute the new tree layout.
  var nodes = tree.nodes(root).reverse(),
      links = tree.links(nodes);

  // Normalize for fixed-depth.
  nodes.forEach(function(d) { d.y = d.depth * 60; });

  // Update the nodes…
  var node = svg.selectAll("g.node")
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; });

  nodeEnter.append("circle")
      .attr("r", 1e-6)
      .style("fill", function(d) { return d._children ? "#FED130" : "#FED130"; })
      .on("click", click);

  nodeEnter.append("text")
      .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
      .attr("dy", ".35em")
      .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
      .text(function(d) { return d.name; })
      .style("fill-opacity", 1e-6)
      .on("click", function(d) { d.selected ? displayMessage(d) : selectNode(d); });

  // Transition nodes to their new position.
  var nodeUpdate = node.transition()
      .duration(duration)
      // .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

  nodeUpdate.select("circle")
      .attr("r", function(d) { return d.selected ? 11 : 8;})
      .style("fill", function(d) {
          console.log("coloring"); 
          if (d.selected) {
            return "#9D2058";
          }
          else {
            return d._children ? "#FED130" : "#FFFFFF"; 
          }
      });

  nodeUpdate.select("text")
      .style("fill-opacity", 1);

  // Transition exiting nodes to the parent's new position.
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .remove();

  nodeExit.select("circle")
      .attr("r", 1e-6);

  nodeExit.select("text")
      .style("fill-opacity", 1e-6);

   // Update the links...
  var link = svg.selectAll("path.link")
      .data(tree.links(nodes), function(d) { return d.target.id; });
  console.log(tree.links(nodes));

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
      // .attr("class", "link")
      .attr("class", "link")
      .attr("d", function(d) {
        // var o = {x: source.x0, y: source.y0};
        var o = {y: source.y0, x: source.x0};
        return connector({source: o, target: o});
      });

  // Transition links to their new position.
  link.transition()
      .duration(duration)
      .attr("d", connector);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        // var o = {x: source.x, y: source.y};
        var o = {y: source.y, x: source.x};
        return connector({source: o, target: o});
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    // d.x0 = d.x;
    // d.y0 = d.y;
    d.y0 = d.y;
    d.x0 = d.x;
  });
}

function displayMessage(d) {
  document.getElementById("message").innerHTML = d.message;
}

function selectNode(d) {
  selectedNode = d;
  var selectedTargetIds = [];
  var messages = [];
  for(i=0; i<areaMap.length; i++) {
    if (areaMap[i].source == selectedNode.nid) {
      selectedTargetIds.push(areaMap[i].target);
      messages.push(areaMap[i].message);
    }  
  }
  selectTargetByNid(selectedTargetIds, messages);
  //console.log(selectedTargetIds);
}

function selectTargetByNid(nids, messages) {
  nodes = tree.nodes(root);
  selectedTarget = [];
  for(i=0; i<nodes.length; i++) {
    if (nids.indexOf(nodes[i].nid) > -1) {
      //selectedTarget.push(nodes[i]);
      nodes[i].selected = true;
      nodes[i].message = messages[nids.indexOf(nodes[i].nid)];
    }
    else {
      nodes[i].selected = false;
      nodes[i].message = "";
    }
  }
  update();
  console.log(selectedTarget);
}

// Toggle children on click.
function click(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
  update(d);
}


