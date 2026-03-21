const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "green";
let width = window.innerWidth;
let height = window.innerHeight;
const rect = canvas.getBoundingClientRect()
const colorPicker = document.getElementById("color_picker");
const brushThickness = document.getElementById("brush_thicckness");


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
let mode = "triangle_fill"

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
});

colorPicker.addEventListener("change", function(event){
  brush_color = event.target.value;
});

brushThickness.addEventListener("input", function(event){
  brush_radius= brush_radius_const*(1+Number(event.target.value))/200 // adding one removes the zero brush size shenanigens
  console.log(event.target.value)
});
//let brush_color = [10 , 10, 255 , 100]


//document.addEventListener('mousemove', function(event) {
    //console.log('Mouse X:', event.clientX, 'Mouse Y:', event.clientY);
//    mouse_x = event.clientX
//    mouse_y = event.clientY 
//    console.log(mouse_x)    
//});


document.addEventListener('mousemove', function(event){
    if (isMouseDown && event.target === canvas){
    const xfactor = canvas.width / rect.width; //this is to scale the screen positioning to the canvas positioning
    const yfactor = canvas.height / rect.height;
    mouse_x = event.clientX
    mouse_y = event.clientY
    ctx.fillStyle = brush_color;
    const canvas_x = Math.floor((mouse_x - rect.left)*xfactor)
    const canvas_y = Math.floor((mouse_y - rect.top)*yfactor)
    
    // console.log(mouse_x, mouse_y)

    //pixel_location_array = (canvas_y*canvas.width + canvas_x)*4
    //data[pixel_location_array]=brush_color[0]
    //data[pixel_location_array+1]=brush_color[1]
    //data[pixel_location_array+2]=brush_color[2]
    //data[pixel_location_array+3]=brush_color[3]
    //console.log(ImageData.data[pixel_location],ImageData.data[pixel_location+1],ImageData.data[pixel_location+2],ImageData.data[pixel_location+3])
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

