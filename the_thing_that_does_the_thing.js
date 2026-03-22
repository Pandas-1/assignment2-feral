const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "green";
let width = window.innerWidth;
let height = window.innerHeight;
const rect = canvas.getBoundingClientRect()
const colorPicker = document.getElementById("color_picker");
const brushThickness = document.getElementById("brush_thicckness");
const canvas_clear = document.getElementById("clear_canvas");
const brush_select = document.getElementById("brush_selector")


ctx.fillRect(width/8,10,width*6/8,120)

let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
let data = imageData.data;

console.log(width)
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
let snapshot = null;
let line_start_x = null;
let line_start_y = null;
let triangle_start_x = null;
let triangle_start_y = null;



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
  
});

document.addEventListener('mouseup', () => {
  isMouseDown = false;
  interpolation_x = null;
  interpolation_y = null;
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
  console.log(mode)
  })

window.addEventListener("keydown", function(event){
  if (event.defaultPrevented) {
    return; // Do nothing if the event was already processed
  }
  switch (event.key) {
    case "b":
      mode = "brush"
      brush_select.value="brush"
      break;
    case "r":
      mode = "rect_fill"
      brush_select.value="rect_fill"
      break;
    case "R":
      mode = "rect_outline"
      brush_select.value="rect_outline"
      break;
    case "t":
      mode = "triangle_fill"
      brush_select.value="triangle_fill"
      break;
    case "T":
      mode = "triangle_outline"
      brush_select.value="triangle_outline"
      break;
    case "c":
      mode = "circle_fill"
      brush_select.value="circle_fill"
      break;
    case "C":
      mode = "circle_outline"
      brush_select.value="circle_outline"
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
  }
});

