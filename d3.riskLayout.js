(function (global, factory) {
   typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

   /**
    *
    * @param nodes 网络节点
    * @param links 网络连线
    * @param segmentScale 根据布局容器的对角线计算分段数
    * @returns {{nodes: *[], paths: *[], links: *[]}}
    */
   function generateSegments(nodes, links, segmentScale) {
       let bundle = {
           nodes: [],
           links: [],
           paths: []
       };

       bundle.nodes = nodes.map(function (d) {
           d.fx = d.x;
           d.fy = d.y;
           return d;
       });

       links.forEach(function (d, i) {
           let length = distance(d.source, d.target);

           let total = Math.round(segmentScale(length));

           let xScale = d3.scaleLinear()
               .domain([0, total + 1])
               .range([d.source.x, d.target.x]);

           let yScale = d3.scaleLinear()
               .domain([0, total + 1])
               .range([d.source.y, d.target.y]);

           let source = d.source,
               target = null;

           let local = [source];

           for (let j = 1; j <= total; j++) {
               target = {
                   x: xScale(j),
                   y: yScale(j)
               };

               local.push(target);
               bundle.nodes.push(target);

               bundle.links.push({
                   source: source,
                   target: target
               });

               source = target;
           }

           local.push(d.target);

           bundle.links.push({
               source: target,
               target: d.target
           });

           local['color'] = d.color;
           local['weight'] = d.weight;
           bundle.paths.push(local);
       });
       return bundle;
   }

   /**
    * 计算source和target之间的距离
    * @param source
    * @param target
    * @returns {number}
    */
   function distance(source, target) {
       const dx2 = Math.pow(target.x - source.x, 2);
       const dy2 = Math.pow(target.y - source.y, 2);

       return Math.sqrt(dx2 + dy2);
   }

   /**
    * 绘制bundle曲线
    * @param g bundle path的容器
    * @param nodes
    * @param links
    * @param segmentScale
    */
   function drawBundle(g, nodes, links, segmentScale) {
       links.forEach(function (link) {
           link.source = nodes[link.source];
           link.target = nodes[link.target];
       });

       let bundle = generateSegments(nodes, links, segmentScale);
       let line = d3.line()
           .curve(d3.curveBundle)
           .x(d => d.x)
           .y(d => d.y);

       g = g.selectAll(".link")
           .data(bundle.paths)
           .join(
               enter => enter.append('path')
                   .attr("class", "link")
                   .attr('fill', 'none')
                   .attr("d", line)
                   .attr('stroke-opacity', 0.5)
                   // .style('mix-blend-mode', 'multiply')
                   // .attr('stroke-width', d => weightScale(d.weight))
                   // .attr('marker-end', 'url(#arrowhead)')
                   .attr('stroke', '#999'),
               update => update
                   .transition()
                   .duration(800)
                   .attr("class", "link")
                   .attr('fill', 'none')
                   .attr("d", line)
                   .attr('stroke-opacity', 0.5)
                   // .style('mix-blend-mode', 'multiply')
                   // .attr('stroke-width', d => weightScale(d.weight))
                   // .attr('marker-end', 'url(#arrowhead)')
                   .attr('stroke', '#999')
                   .selection(),
               exit => exit.remove()
           )
       // .join('path')
       // .attr("d", line)
       // .attr('marker-end', 'url(#arrowhead)')
       // .attr('stroke', d => d.color)
       // .attr("class", "link");

       let layout = d3.forceSimulation(bundle.nodes)
           // settle at a layout faster
           .alphaDecay(0.1)
           // nearby nodes attract each other
           .force("charge", d3.forceManyBody()
               .strength(10)
               .distanceMax(36)
           )
           // edges want to be as short as possible
           // prevents too much stretching
           .force("link", d3.forceLink(bundle.links)
               .strength(0.7)
               .distance(0)
           )
           .on("tick", function (d) {
               g.attr("d", line);
           });
   }

   /**
    * 绘制节点
    * @param g 节点容器
    * @param data 节点数据
    * @param lg Temporarily deprecated
    * @param simulation 力场模拟
    */
   function drawNodes(g, data, lg, simulation) {
       g = g.selectAll('.node')
           .data(data)
           .join(
               enter => enter.append('g')
                   .attr('class', 'node'),
               update => update
                   .attr('class', 'node'),
               exit => exit.remove()
           )
           .call(g => {
               g.append('circle')
                   .attr('r', 8)
                   .style('fill', d => d.color)
                   .attr('stroke-width', 2)
                   .attr('stroke', '#777');

               // g.append('text')
               //     .style('font-size', 10)
               //     .attr('dx', -4)
               //     .attr('dy', 2)
               //     .text(d => d.type);

           });
   }

   /**
    * 绘制等高线
    * @param g 等高线容器
    * @param data 等高线数据
    * @param contour 等高线生成器
    */
   function drawContour(g, data, contour) {
       let contourData = contour(data);
       let color = d3.scaleSequential(d3.interpolateTurbo)
           .domain(d3.extent(contourData, d => d.value));
       g
           // .attr('fill', 'none')
           .attr('stroke-linejoin', 'round')
           .selectAll('.contour')
           .data(contourData)
           .join(
               enter => enter.append('path')
                   .attr('class', 'contour')
                   .attr('stroke', '#777777')
                   // .attr('visibility', 'hidden')
                   .style('fill', d => color(d.value))
                   .style('fill-opacity', 0.2)
                   .attr('d', d3.geoPath()),
               update => update
                   .transition()
                   .duration(800)
                   .attr('class', 'contour')
                   .attr('stroke', '#777777')
                   // .attr('visibility', 'hidden')
                   .style('fill', d => color(d.value))
                   .style('fill-opacity', 0.2)
                   .attr('d', d3.geoPath())
                   .selection(),
               exit => exit.remove()
           );
   }

   /**
    * 绘制risklayout
    * @param gc 容器集合
    * @param data 网络数据
    * @param xScale 节点x坐标比例尺
    * @param yScale 节点y坐标比例尺
    * @param segmentScale bundle分割比例尺
    * @param contour contour生成器
    * @param iscollide 碰撞力场开关 （可忽略）
    */
   function drawRiskLayout(gc, data, xScale, yScale, segmentScale, contour, iscollide) {
       xScale.domain(d3.extent(data.nodes, d => d.lx)).clamp(true);
       yScale.domain(d3.extent(data.nodes, d => d.ly)).clamp(true);

       data.nodes = data.nodes.map(function (d) {
           d.x = xScale(d.lx);
           d.y = yScale(d.ly);
           return d;
       });
       console.log(data.nodes)

       let simulation = d3.forceSimulation(data.nodes)
           .force('collide', d3.forceCollide().radius(8).strength(iscollide))
           .force('x', d3.forceX(d => d.x))
           .force('y', d3.forceY(d => d.y))
           .on('tick', function () {
               gc.node.selectAll('g')
                  .attr('transform', d => `translate(${d.x}, ${d.y})`);
           });

       drawContour(gc.contour, data.nodes, contour);
       drawNodes(gc.node, data.nodes, gc.edge);

       setTimeout(function () {
           simulation.stop();
           drawBundle(gc.edge, data.nodes, data.links, segmentScale);
       }, 6000);
   }

   exports.drawRiskLayout = drawRiskLayout;

   Object.defineProperty(exports, '__esModule', { value: true });

}));