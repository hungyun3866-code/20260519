let video;
let handpose;
let predictions = [];

function setup() {
  // 建立畫布並居中
  let canvas = createCanvas(640, 480);
  canvas.parent('canvas-container'); // 如果有外層容器的話
  
  // 開啟視訊鏡頭
  video = createCapture(VIDEO);
  video.size(width, height);
  video.hide(); // 隱藏原本的 HTML 視訊標籤，我們要在 canvas 上自己畫

  // 初始化 ml5.js 的 Handpose 模型
  handpose = ml5.handpose(video, modelReady);

  // 當偵測到手勢時，把結果存進 predictions 陣列
  handpose.on("predict", results => {
    predictions = results;
  });
}

function modelReady() {
  console.log("AI 模型載入成功！");
}

function draw() {
  // 背景使用質感的極淺灰色
  background('#f4f5f6'); 
  
  // 為了讓鏡頭看起來像鏡子一樣自然，將畫面左右反轉
  translate(width, 0);
  scale(-1, 1);
  
  // 繪製視訊畫面（加一點點透明度，讓背景質感透出來）
  tint(255, 220);
  image(video, 0, 0, width, height);
  noTint();

  // 繪製手部關節點
  drawKeypoints();
}

// 繪製關節點的函式
function drawKeypoints() {
  for (let i = 0; i < predictions.length; i += 1) {
    const prediction = predictions[i];
    
    // 遍歷手上的 21 個特徵點
    for (let j = 0; j < prediction.landmarks.length; j += 1) {
      const keypoint = prediction.landmarks[j];
      
      // 使用低飽和度的莫蘭迪藍色
      fill('#accbe1');
      noStroke();
      
      // 畫出關節點（手掌核心點大一點，手指點小一點）
      if (j === 0 || j === 5 || j === 9 || j === 13 || j === 17) {
        ellipse(keypoint[0], keypoint[1], 12, 12);
      } else {
        ellipse(keypoint[0], keypoint[1], 8, 8);
      }
    }
  }
}