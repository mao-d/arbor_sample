//
//  main.js
//
//  A project template for using arbor.js
//

(function($){
// key: Node name
// val: Position of node (x and y)
var nodes_pos = []

  var Renderer = function(canvas){
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    var particleSystem

    var that = {
      init:function(system){
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        particleSystem = system
		
		// set canvas size
		$(window).resize(that.resize)
		that.resize()
        
        // set up some event handlers to allow for node-dragging
        that.initMouseHandling()
      },
      
      redraw:function(){
        // 
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        // 
        ctx.fillStyle = "white"
        ctx.fillRect(0,0, canvas.width, canvas.height)
        
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          // draw a line from pt1 to pt2
          ctx.strokeStyle = (edge.data.path) ? "red" : "rgba(0,0,0, .333)"
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(pt1.x, pt1.y)
          ctx.lineTo(pt2.x, pt2.y)
          ctx.stroke()
        })

        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords

          // draw a rectangle centered at pt
          var w = ctx.measureText(node.data.name||"").width + 6
          ctx.fillStyle = (node.data.text) ? "tomato" : "deepskyblue"
          if (node.data.text) {
			ctx.clearRect(pt.x-w/2, pt.y-7, w,14)
		  } else {
			ctx.fillRect(pt.x-w/2, pt.y-w/2, w,w)
		  }
		  
		  var name = node.data.name
		  
		  // draw the text
          if (name){
            ctx.font = "bold 11px Arial"
            ctx.textAlign = "center"
			ctx.fillStyle = "tomato"
            ctx.fillText(name||"", pt.x, pt.y+4)
			
			nodes_pos[name] = {x: pt.x, y:pt.y}
          }
        })    			
      },
	  
	  /**
	  * Function of resize canvas.
	  */
	  resize:function(){
        var w = $(window).width(),
            h = $(window).height()
        canvas.width = w - 20; canvas.height = h - 20 // resize the canvas element to fill the screen
        particleSystem.screenSize(w,h) // inform the system so it can map coords for us
        that.redraw()
      },
      
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            dragged = particleSystem.nearest(_mouseP);

            if (dragged && dragged.node !== null){
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true
            }

            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },
          dragged:function(e){
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          }
        }
        
        // start listening
        $(canvas).mousedown(function(e){
      		var pos = $(this).offset();
      		var p = {x:e.pageX-pos.left, y:e.pageY-pos.top}
      		nearest = dragged = particleSystem.nearest(p);
			selected = (nearest.distance < 25) ? nearest : null
			
			if (selected != null) {
				var nodeName = selected.node.data.name
				var srcX = nodes_pos[nodeName].x
				var srcY = nodes_pos[nodeName].y
				$('div#output').append('<li>' + nodeName + ' :(x, y) = (' + srcX + ',' + srcY + ') </li>')
			}

      		if (selected.node !== null){
				// dragged.node.tempMass = 10000
				dragged.node.fixed = true
      		}
      		return false
      	});
		$(canvas).mousemove(function(e){
          var old_nearest = nearest && nearest.node._id
      		var pos = $(this).offset();
      		var s = {x:e.pageX-pos.left, y:e.pageY-pos.top};

      		nearest = particleSystem.nearest(s);
          if (!nearest) return

      		if (dragged !== null && dragged.node !== null){
            var p = particleSystem.fromScreen(s)
      			dragged.node.p = {x:p.x, y:p.y}
            // dragged.tempMass = 10000
      		}

          return false
      	});
      	$(window).bind('mouseup',function(e){
          if (dragged===null || dragged.node===undefined) return
          dragged.node.fixed = false
          dragged.node.tempMass = 100
      		dragged = null;
      		selected = null
      		return false
      	});

      },
      
    }
    return that
  }    

  $(document).ready(function(){
    var sys = arbor.ParticleSystem(1000, 600, 0.5) // create the system with sensible repulsion/stiffness/friction
    sys.parameters({gravity:true}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

    // add some nodes to the graph and watch it go...
    //sys.addEdge('a','b')
    //sys.addEdge('a','c')
    //sys.addEdge('a','d')
    //sys.addEdge('a','e')
    //sys.addNode('f', {text:true, mass:.25})

    // or, equivalently:
    
     sys.graft({
       nodes:{
		a:{text:true, name:"node_a"},
		f:{text:true, name:"node_f"}
       }, 
       edges:{
         a:{ b:{path:true},
             c:{path:false},
             d:{path:false},
             e:{path:false},
			 f:{path:true}
         },
		 b: { c:{path:false},
			  e:{path:false}
		 },
		 d: { e:{path:false}
		 },
		 e: { d:{path:false}
		 }
       }
     })
    
  })

})(this.jQuery)