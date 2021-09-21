const video = document.querySelector('video');
const face_detection_body = document.querySelector('.face_detection_body');
const capture = document.querySelector('.click');
const image_link = document.querySelector('.image_link');
console.log(image_link);

const startvideo = () =>{
    navigator.getUserMedia(
        {video: {}},
        stream => video.srcObject = stream,
        err => console.log(err)
    )
}
console.log('will detect face');
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/public/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/public/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/public/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/public/models')
]).then(startvideo)

video.addEventListener('play',()=>{
    const canvas = faceapi.createCanvasFromMedia(video);
    face_detection_body.append(canvas);
    face_detection_body.classList.add('absolute');
    const displaySize = {width: video.width, height: video.height};
    faceapi.matchDimensions(canvas,displaySize);
    setInterval(async ()=>{
        const detections = await faceapi.detectAllFaces(video,new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
        // console.log(detections);
        if(detections.length == 0 || detections.length > 1){
            capture.classList.add('hidden');
        }else if(detections[0].detection._score < 0.75) {
            capture.classList.add('hidden');
        }else{
            // console.log(detections);
            capture.classList.remove('hidden');
        }
        const resizedDetections = faceapi.resizeResults(detections,displaySize);
        canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height)
        // faceapi.draw.drawDetections(canvas,resizedDetections)
        // faceapi.draw.drawFaceLandmarks(canvas,resizedDetections)
    },100);
});

capture.addEventListener('click',(e)=>{
    // e.preventDefault();
    video.width = 1500;
    video.height = 1000;
    const canva = faceapi.createCanvasFromMedia(video);
    let context = canva.getContext('2d');
    let data = canva.toDataURL('image/jpg');
    // console.log(data);
    image_link.value = data;
    video.width = 720;
    video.height = 540;
    document.querySelector('.postt').click();
});
