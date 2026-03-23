const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "green";
let width = window.innerWidth;
let height = window.innerHeight;
const rect = canvas.getBoundingClientRect()
const colorPicker = document.getElementById("color_picker");
const brushThickness = document.getElementById("brush_thicckness");
const canvas_clear = document.getElementById("clear_canvas");
const brush_select = document.getElementById("brush_selector");
const lasso_tool = document.getElementById("selection_lasso");
const image_input = document.getElementById("image-upload");
const undo_button = document.getElementById("undo");
const redo_button = document.getElementById("redo");


ctx.fillRect(width/8,10,width*6/8,120)

let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
let data = imageData.data;

let mouse_x = 0
let mouse_y = 0
let interpolation_x = null;
let interpolation_y = null;
let brush_radius_const = 80;
let brush_radius = 20;
let brush_color = "#000000";
let rect_start_x = null;
let rect_start_y = null;
let circle_centre_x = null;
let circle_centre_y = null;
let snapshot = null; // initial canvas before drawing shapes for the live preview of shape being built
let line_start_x = null;
let line_start_y = null;
let triangle_start_x = null;
let triangle_start_y = null;
let selection_path = [];
let select_start_x = null;
let select_start_y = null;
let selection = null;
let background_color = "#ffffff"
let isDraggingSelection = false;
let isResizingSelection = false;
let dragOffsetX = 0;
let dragOffsetY = 0;
let resizeHandleIndex = -1;
let backgroundSnapshot = null
let save_stack_undo = []
let undo_tsp = -1


let isMouseDown = false;
let mode = "brush"

function saveCanvas() {
  const dataURL = canvas.toDataURL('image/png')
  localStorage.setItem("savedCanvas", dataURL);
}
function loadCanvas() {
    const dataURL = localStorage.getItem("savedCanvas");
  if (!dataURL) return;
  const img = new Image();
  img.src = dataURL;

  img.onload = function () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
}

function getBounds(path) {
  let xs = path.map(p => p.x);
  let ys = path.map(p => p.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function getSelectionHandles(sel){
  const cx = sel.x + sel.width / 2 + sel.offsetX;
  const cy = sel.y + sel.height / 2 + sel.offsetY;
  const hw = (sel.width * sel.scale) / 2;
  const hh = (sel.height * sel.scale) / 2;
  const cos = Math.cos(sel.rotation);
  const sin = Math.sin(sel.rotation);

  const localPoints = [
    [-hw, -hh], [0, -hh], [hw, -hh],
    [-hw,   0],            [hw,   0],
    [-hw,  hh], [0,  hh], [hw,  hh],
  ];

  return localPoints.map(([lx, ly]) => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  }));
}

function saveStackPush(){
  undo_tsp++
  if(undo_tsp < save_stack_undo.length){  
    save_stack_undo.length=undo_tsp}
    save_stack_undo.push(ctx.getImageData(0,0,canvas.width,canvas.height));
  console.log(undo_tsp, save_stack_undo)
}

function undo_draw(){
  if (undo_tsp>=0){
    undo_tsp--
    let old_image = new Image();
    old_image = save_stack_undo[undo_tsp]
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // Clear canvas
            ctx.putImageData(old_image, 0, 0); 
}}

function redo_draw(){
  if (save_stack_undo.length > undo_tsp){
    undo_tsp++
    let next_image = new Image()
    new_image = save_stack_undo[undo_tsp]
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.putImageData(new_image, 0, 0); 
  }
}

function drawSelectionHandles(sel) {
  const handles = getSelectionHandles(sel);
  const cx = sel.x + sel.width / 2 + sel.offsetX;
  const cy = sel.y + sel.height / 2 + sel.offsetY;
  const hw = (sel.width * sel.scale) / 2;
  const hh = (sel.height * sel.scale) / 2;

  // Draw bounding box
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(sel.rotation);
  ctx.strokeStyle = "#0099ff";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
  ctx.setLineDash([]);
  ctx.restore();

  // Draw handles
  handles.forEach(h => {
    ctx.beginPath();
    ctx.arc(h.x, h.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#0099ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function clickTestHandle(mx, my, sel) {
  const handles = getSelectionHandles(sel);
  for (let i = 0; i < handles.length; i++) {
    const dx = mx -handles[i].x
    const dy = my - handles[i].y
    if (Math.sqrt(dx * dx + dy * dy) < 10) return i;
  }
  return -1;
}

function isInsideSelection(mx, my, sel) {
  // Transform point into selection's local space
  const cx = sel.x+sel.width /2 + sel.offsetX;
  const cy = sel.y +sel.height / 2 + sel.offsetY;
  const cos = Math.cos(-sel.rotation);
  const sin = Math.sin(-sel.rotation);
  const dx = mx- cx
  const dy = my- cy
  const lx = dx* cos - dy * sin
  const ly = dx * sin + dy * cos
  const hw = (sel.width * sel.scale) / 2;
  const hh = (sel.height * sel.scale) / 2;
  return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
}

function clearSelectionHandles(exit_selection = false) {
  if (!selection || !backgroundSnapshot) return;
    if (exit_selection) { // when you exit selection you have to merge 
      const cx = selection.x + selection.width / 2 + selection.offsetX;
      const cy = selection.y + selection.height / 2 + selection.offsetY;

      ctx.putImageData(backgroundSnapshot, 0, 0);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(selection.rotation);
      ctx.scale(selection.scale, selection.scale);
      ctx.drawImage(selection.img, -selection.width / 2, -selection.height / 2);
      ctx.restore();

      backgroundSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      selection = null;
      return;
  }
  ctx.putImageData(backgroundSnapshot, 0, 0);
}


window.addEventListener("load", loadCanvas);

document.addEventListener('mousedown', (event) => {
  isMouseDown = true;
    const xfactor = canvas.width / rect.width; //this is to scale the screen positioning to the canvas positioning
    const yfactor = canvas.height / rect.height;
    mouse_x = event.clientX
    mouse_y = event.clientY
    canvas_x_start = Math.floor((mouse_x - rect.left)*xfactor)
    canvas_y_start = Math.floor((mouse_y - rect.top)*yfactor)
  if( mode === "rect_outline" || mode === "rect_fill"){
    //ctx.putImageData(snapshot, 0, 0);
    rect_start_x = canvas_x_start
    rect_start_y = canvas_y_start
    // for live preview of the thing
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
  if( mode === "circle_outline" || mode === "circle_fill"){
    circle_centre_x = canvas_x_start
    circle_centre_y = canvas_y_start
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
    if( mode === "line"){
    //ctx.putImageData(snapshot, 0, 0);
    line_start_x = canvas_x_start
    line_start_y = canvas_y_start
    // for live preview of the thing
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
      if( mode === "triangle_fill" || mode === "triangle_outline"){
    //ctx.putImageData(snapshot, 0, 0);
    triangle_start_x = canvas_x_start
    triangle_start_y = canvas_y_start
    // for live preview of the thing
    snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
    if( mode === "lasso"){
        selection_path = [];
        is_selecting = true;
        select_start_x = canvas_x_start;
        select_start_y = canvas_y_start;
        
    }

    if (mode === "selection" && selection) {
      const xfactor = canvas.width /rect.width;
      const yfactor = canvas.height /rect.height;
      const mx = Math.floor((event.clientX- rect.left)*xfactor);
      const my = Math.floor((event.clientY- rect.top)*yfactor);

      resizeHandleIndex = clickTestHandle(mx, my, selection);

      if (resizeHandleIndex !== -1) {
        isResizingSelection = true;
      } else if (isInsideSelection(mx, my, selection)) {
        isDraggingSelection = true;
        dragOffsetX = mx - (selection.x + selection.offsetX);
        dragOffsetY = my - (selection.y + selection.offsetY);
      }
    }

  
});

document.addEventListener('mouseup', (event) => {
  isMouseDown = false;
  interpolation_x = null;
  interpolation_y = null;
  if(mode === "lasso" && selection_path.length>2){
    // to like select something you gotta set up a separate canvas, cant really edit orignal it :(
    const bounds = getBounds(selection_path);
    const temp_canvas = document.createElement("canvas");
    const tctx = temp_canvas.getContext("2d")
    temp_canvas.width = bounds.width;
    temp_canvas.height = bounds.height;
    tctx.save();
    tctx.beginPath();
    tctx.moveTo(selection_path[0].x - bounds.x, selection_path[0].y - bounds.y);

    for (let i = 1; i < selection_path.length; i++) {
      tctx.lineTo(selection_path[i].x - bounds.x, selection_path[i].y - bounds.y);
    }

    tctx.closePath();
    tctx.clip();

    tctx.drawImage(canvas, -bounds.x, -bounds.y);
    tctx.restore();
    // now remove the selected region from the orignal canvas
    ctx.save();

    ctx.beginPath();
    ctx.moveTo(selection_path[0].x, selection_path[0].y);
    for (let i = 1; i < selection_path.length; i++) {
      ctx.lineTo(selection_path[i].x, selection_path[i].y);
    }
    ctx.closePath();

    ctx.globalCompositeOperation = "destination-out";
    ctx.fill();

    ctx.restore();
    ctx.globalCompositeOperation = "source-over";
    backgroundSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    snapshot = backgroundSnapshot;

    //now you store the selected thing
    selection = {
      img: temp_canvas,
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      scale: 1,
      rotation: 0,
      offsetX: 0,
      offsetY: 0
    };
    
    mode = "selection";
    // show the handle bars instantly after mouse down
    selection_path = [];
      const cx = selection.x + selection.width / 2 + selection.offsetX;
      const cy = selection.y + selection.height / 2 + selection.offsetY;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(selection.rotation);
      ctx.scale(selection.scale, selection.scale);
      ctx.drawImage(selection.img, -selection.width / 2, -selection.height / 2);
      ctx.restore();

      drawSelectionHandles(selection);
    }
    if (mode === "selection") {
      isDraggingSelection = false;
      isResizingSelection = false;
      resizeHandleIndex = -1;
    }
    if (mode !== "selection" && mode !== "lasso") {
    backgroundSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height); // this is to fix the bug which made adding new things after selection mode impossible due to background_snapshot not updating adequately
  }
    if (canvas.contains(event.target)){
      saveStackPush()
    }
  saveCanvas()
});

colorPicker.addEventListener("change", function(event){
  brush_color = event.target.value;
});

brushThickness.addEventListener("input", function(event){
  brush_radius= brush_radius_const*(1+Number(event.target.value))/200 // adding one removes the zero brush size shenanigens
  console.log(event.target.value)
});

canvas_clear.addEventListener("click",function(event){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
})

brush_select.addEventListener("input",function(){
  mode = brush_select.value;
  clearSelectionHandles()
  })

lasso_tool.addEventListener("click", function(event){
  mode = "lasso"
});

image_input.addEventListener("change",function(event){
    clearSelectionHandles();
    const file = event.target.files[0]; 
    const reader = new FileReader();
    reader.onload = function(e) {  // first the file loads, then separately it loads the image again
        const img = new Image();
        img.onload = () => {
            //ctx.drawImage(img, canvas.width/8, canvas.height/8);
            backgroundSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
            //gotta send the 4 cornor points in selectino path
              selection = {
              img: img,
              x: canvas.width/8,
              y: canvas.height/8,
              width: img.width,
              height: img.height,
              scale: 1,
              rotation: 0,
              offsetX: 0,
              offsetY: 0
            };
            mode = "selection"      
        };
        img.src = e.target.result; // Set src after setting onload
    };
    reader.readAsDataURL(file); // Read file
})

undo_button.addEventListener("click", function(event){
  undo_draw()
})

redo_button.addEventListener("click" , function(event){
  redo_draw()
})

window.addEventListener("keydown", function(event){
  if (event.defaultPrevented) {
    return; // Do nothing if the event was already processed
  }
  switch (event.key) {
    case "b":
      mode = "brush"
      brush_select.value="brush"
      clearSelectionHandles(true)
      break;
    case "r":
      mode = "rect_fill"
      brush_select.value="rect_fill"
      clearSelectionHandles(true)
      break;
    case "R":
      mode = "rect_outline"
      brush_select.value="rect_outline"
      clearSelectionHandles(true)
      break;
    case "t":
      mode = "triangle_fill"
      brush_select.value="triangle_fill"
      clearSelectionHandles(true)
      break;
    case "T":
      mode = "triangle_outline"
      brush_select.value="triangle_outline"
      clearSelectionHandles(true)
      break;
    case "c":
      mode = "circle_fill"
      brush_select.value="circle_fill"
      clearSelectionHandles(true)
      break;
    case "C":
      mode = "circle_outline"
      brush_select.value="circle_outline"
      clearSelectionHandles(true)
    default:
      return; // Quit when this doesn't handle the key event.
  }

})


document.addEventListener('mousemove', function(event){
    if (isMouseDown && event.target === canvas){
    const xfactor = canvas.width / rect.width; //this is to scale the screen positioning to the canvas positioning
    const yfactor = canvas.height / rect.height;
    mouse_x = event.clientX
    mouse_y = event.clientY
    ctx.fillStyle = brush_color;
    const canvas_x = Math.floor((mouse_x - rect.left)*xfactor)
    const canvas_y = Math.floor((mouse_y - rect.top)*yfactor)
  
    ctx.fillStyle = brush_color; 
    ctx.strokeStyle = brush_color;
    ctx.lineWidth = brush_radius*2
    if (mode === "brush"){
    ctx.beginPath();
    ctx.arc(canvas_x, canvas_y, brush_radius, 0, 2 * Math.PI);
    ctx.fill();
    if (interpolation_x !== null && interpolation_y !== null) {
      ctx.beginPath();
      ctx.moveTo(interpolation_x, interpolation_y);
      ctx.lineTo(canvas_x, canvas_y);
      ctx.stroke();
    } 
    interpolation_x = canvas_x
    interpolation_y = canvas_y
  }
    if (mode === "rect_outline" || mode === "rect_fill"){
      if(!snapshot) return;
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.rect(rect_start_x, rect_start_y,(canvas_x-rect_start_x),(canvas_y-rect_start_y)); 
      if (mode === "rect_fill"){
        ctx.fill();
      }
      if (mode === "rect_outline"){
        ctx.stroke();
      }
    }
    if (mode === "circle_outline" || mode === "circle_fill"){
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath()
      ctx.arc(circle_centre_x, circle_centre_y, (((canvas_x-circle_centre_x)**2)+((canvas_y-circle_centre_y)**2))**0.5, 0, 2 * Math.PI);
      if (mode === "circle_outline"){
        ctx.stroke();
      }
      if (mode === "circle_fill"){
        ctx.fill()
      }
    }
    if (mode === "line"){
      ctx.putImageData(snapshot, 0, 0);
      ctx.beginPath();
      ctx.moveTo(line_start_x, line_start_y);
      ctx.lineTo(canvas_x, canvas_y);
      ctx.stroke();
    }
    if (mode === "triangle_fill" || mode === "triangle_outline"){
      ctx.putImageData(snapshot, 0, 0);

      const x1 = triangle_start_x;
      const y1 = triangle_start_y;

      const x2 = canvas_x;
      const y2 = canvas_y;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const x3 = x1 + (dx * 0.5 - dy * Math.sqrt(3) / 2);
      const y3 = y1 + (dx * Math.sqrt(3) / 2 + dy * 0.5);

      ctx.beginPath();
      ctx.moveTo(x1, y1); 
      ctx.lineTo(x2, y2); 
      ctx.lineTo(x3, y3); 
      ctx.closePath();
      if (mode === "triangle_outline"){
      ctx.stroke();
      }
      if (mode === "triangle_fill"){
      ctx.fill();
      }

      }
    if (mode === "lasso"){
      selection_path.push({ x: canvas_x, y: canvas_y }); // storing points

      if (selection_path.length === 1) {
        ctx.beginPath();
        ctx.moveTo(canvas_x, canvas_y);
      } else {
        ctx.lineTo(canvas_x, canvas_y);
        ctx.lineWidth=1
        ctx.stroke();
      }
  }
    if (mode === "selection" && selection) {
      ctx.putImageData(backgroundSnapshot, 0, 0);

      if (isDraggingSelection) {
        selection.offsetX = canvas_x-dragOffsetX-selection.x;
        selection.offsetY = canvas_y -dragOffsetY-selection.y;
      }

      if (isResizingSelection) {
        const cx = selection.x + selection.width/2 + selection.offsetX;
        const cy = selection.y + selection.height/2 + selection.offsetY;
        const dx = canvas_x - cx;
        const dy = canvas_y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        // Scale relative to half-diagonal of the original
        const originalDiag = Math.sqrt(
          (selection.width / 2) ** 2 + (selection.height / 2) ** 2
        );
        selection.scale = Math.max(0.05, dist / originalDiag);
      }

      // Draw the selection image
      const cx = selection.x + selection.width/2 + selection.offsetX;
      const cy = selection.y + selection.height/2 + selection.offsetY;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(selection.rotation);
      ctx.scale(selection.scale, selection.scale);
      ctx.drawImage(selection.img, -selection.width/2, -selection.height/2);
      ctx.restore();

      drawSelectionHandles(selection);
    }
}});
//FIGURE OUT TEXT BOXES LATER WITH CSS POSITIONING AHAHAHAHAHAHAHHA
