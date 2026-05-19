let videoElement;
let hands;
let detectedHands = [];

function setup() {
  createCanvas(640, 480);

  // 1. 建立隱藏的 HTML5 video 標籤供 MediaPipe 讀取
  videoElement = createCapture(VIDEO);
  videoElement.size(640, 480);
  videoElement.hide();

  // 2. 初始化 MediaPipe Hands
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  // 設定 MediaPipe 參數
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  // 當偵測到手部點時，把結果傳給 detectedHands
  hands.onResults((results) => {
    if (results.multiHandLandmarks) {
      detectedHands = results.multiHandLandmarks;
    } else {
      detectedHands = [];
    }
  });

  // 3. 啟動 MediaPipe 相機工具，直接綁定視訊
  const camera = new Camera(videoElement.elt, {
    onFrame: async () => {
      await hands.send({ image: videoElement.elt });
    },
    width: 640,
    height: 480
  });
  camera.start();
}

function draw() {
  // 畫出相機畫面背景
  image(videoElement, 0, 0, width, height);

  // 只要有抓到點，無條件立刻繪製綠色線條跟小圓點
  if (detectedHands.length > 0) {
    let handPoints = detectedHands[0];
    drawMediaPipeSkeleton(handPoints);
  } else {
    // 沒抓到手時的提示
    drawOverlayText("請把手伸入鏡頭中...", width / 2, height / 2, 24, color(255));
  }
}

// 根據 MediaPipe 的點位結構畫線（X、Y 是 0 到 1 的比例，需要乘上畫布寬高）
function drawMediaPipeSkeleton(points) {
  stroke(0, 255, 0); // 科技綠線
  strokeWeight(3);
  fill(0, 255, 0);

  // 1. 畫出 21 個關鍵圓點
  for (let i = 0; i < points.length; i++) {
    let x = points[i].x * width;
    let y = points[i].y * height;
    circle(x, y, 8);
  }

  // 2. 五指關節連線定義
  let fingers = [
    [0, 1, 2, 3, 4],     // 大拇指
    [0, 5, 6, 7, 8],     // 食指
    [9, 10, 11, 12],     // 中指（MediaPipe 結構中指從9開始連）
    [13, 14, 15, 16],    // 無名指
    [0, 17, 18, 19, 20]  // 小拇指與手掌基部
  ];

  // 額外連接掌心橫向骨架 (食指根到小指根)
  let palm = [5, 9, 13, 17];

  noFill();
  
  // 畫手指連線
  for (let f of fingers) {
    beginShape();
    for (let id of f) {
      let x = points[id].x * width;
      let y = points[id].y * height;
      vertex(x, y);
    }
    endShape();
  }

  // 畫掌心連線
  beginShape();
  for (let id of palm) {
    let x = points[id].x * width;
    let y = points[id].y * height;
    vertex(x, y);
  }
  endShape();
}

function drawOverlayText(txt, x, y, size, col) {
  textAlign(CENTER, CENTER);
  textSize(size);
  textStyle(BOLD);
  noStroke();
  fill(0, 0, 0, 200);
  text(txt, x + 2, y + 2); // 陰影
  fill(col);
  text(txt, x, y); // 主字
}