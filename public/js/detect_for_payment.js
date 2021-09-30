const video = document.querySelector('video');
const face_detection_body = document.querySelector('.face_detection_body');
const capture = document.querySelector('.capture');
const user_img = document.querySelector('.personimg');
const user_name = document.querySelector('.person_name');
const can_do_transaction = document.querySelector('.can_do_transaction');
const submit = document.querySelector('.can_do');
console.log(can_do_transaction);
var faceMatcher;
// console.log(user_img.value);

const loadLabelImages = () =>{
    const labeledImage = [user_name.value];
    return Promise.all(
        labeledImage.map(async (label)=>{
            const descriptions = [];
            const img1 = await faceapi.fetchImage(user_img.value);
            detections = await faceapi.detectSingleFace(img1).withFaceLandmarks().withFaceDescriptor();
            descriptions.push(detections.descriptor);
            return new faceapi.LabeledFaceDescriptors(label, descriptions);
        })
    );
}

const startvideo = () =>{
    navigator.getUserMedia(
        {video: {}},
        stream => video.srcObject = stream,
        err => console.log(err)
    )
}

Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri('/public/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/public/models'),
    faceapi.nets.ssdMobilenetv1.loadFromUri('/public/models')
]).then(startvideo)

video.addEventListener('play',async ()=>{
    const canvas = faceapi.createCanvasFromMedia(video);
    face_detection_body.append(canvas);
    face_detection_body.classList.add('absolute');
    const displaySize = {width: video.width, height: video.height};
    faceapi.matchDimensions(canvas,displaySize);
    const labeledFaceDescriptors = await loadLabelImages();
    faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6);
});

capture.addEventListener('click',async ()=>{
    const canvas = faceapi.createCanvasFromMedia(video);
    const displaySize = {width: video.width, height: video.height};
    const context = canvas.getContext('2d');
    const data = canvas.toDataURL('image/jpg');
    const img = await faceapi.fetchImage(data);
    const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    // console.log(detections);
    try {
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const results = faceMatcher.findBestMatch(resizedDetections.descriptor);
        if(results.label == user_name.value){
            can_do_transaction.value = 'true';
        }else{
            console.log('chor h salla');
            can_do_transaction.value = 'false';
        }
    }catch(err){
        can_do_transaction.value = 'false';
    }
    submit.click();
});