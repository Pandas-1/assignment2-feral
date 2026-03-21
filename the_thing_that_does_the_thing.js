const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.fillStyle = "green";
let width = window.innerWidth;
let height = window.innerHeight;
const rect = canvas.getBoundingClientRect()


ctx.fillRect(width/8,10,width*6/8,120)

let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
let data = imageData.data;

console.log(width)
let mouse_x = 0
let mouse_y = 0
let interpolation_x = null;
let interpolation_y = null;


let isMouseDown = false;

document.addEventListener('mousedown', () => {
  isMouseDown = true;
});

document.addEventListener('mouseup', () => {
  isMouseDown = false;
});

//let brush_color = [10 , 10, 255 , 100]
let brush_radius = 5;
let brush_color = "#55bfda";

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
});

