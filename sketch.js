let videoElement;
let handsDetector;
let cameraHelper;
let resultsData = null; // 用來儲存 MediaPipe 傳回的最新手勢資料

// 遊戲狀態變數
let gameState = "START"; 
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function setup() {
  createCanvas(640, 480);
  
  // 1. 建立一個隱藏的 HTML video 標籤供 MediaPipe 讀取
  videoElement = createCapture(VIDEO).elt;
  videoElement.size = { width: 640, height: 480 };
  // 隱藏原生視訊元件
  document.getElementsByTagName('video')[0].style.display = 'none';

  // 2. 初始化 MediaPipe Hands
  handsDetector = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  handsDetector.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  });

  // 當 MediaPipe 算完特徵點後的回呼函式 (Callback)
  handsDetector.onResults(onHandsResults);

  // 3. 啟動 MediaPipe Camera 輔助工具來驅動鏡頭
  cameraHelper = new Camera(videoElement, {
    onFrame: async () => {
      await handsDetector.send({ image: videoElement });
    },
    width: 640,
    height: 480
  });
  cameraHelper.start();
}

// 接收 MediaPipe 的偵測結果
function onHandsResults(results) {
  resultsData = results;
}

function draw() {
  // 1. 鏡像翻轉繪製視訊畫面
  translate(width, 0);
  scale(-1, 1);
  // 直接將 HTML 視訊影格畫在 p5 的畫布上
  drawingContext.drawImage(videoElement, 0, 0, width, height);
  
  // 2. 還原座標系避免文字顛倒
  translate(width, 0);
  scale(-1, 1);

  // 3. 解析手勢並畫出綠色骨架
  let currentGesture = "未知";
  if (resultsData && resultsData.multiHandLandmarks && resultsData.multiHandLandmarks.length > 0) {
    let landmarks = resultsData.multiHandLandmarks[0];
    drawKeypoints(landmarks);
    currentGesture = judgeGesture(landmarks);
  }

  // 4. 繪製計分板
  drawScoreboard();

  // 5. 遊戲流程控制 (與之前邏輯相同)
  let currentTime = millis();

  if (gameState === "START") {
    drawOverlayText("請將手伸入畫面", width / 2, height / 2, 32, color(255));
    drawOverlayText("比出 ✊ 石頭、🖐 布、✌ 剪刀", width / 2, height / 2 + 50, 20, color(200));

    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      drawOverlayText(countdown, width / 2, height / 2, 90, color(255, 215, 0));
      if (currentGesture !== "未知") {
        drawOverlayText(`你當前出：${currentGesture}`, 30, 50, 24, color(255), LEFT);
      }
    } else {
      playerGesture = currentGesture;
      if (playerGesture !== "未知") {
        let options = ["石頭", "剪刀", "布"];
        computerGesture = random(options);

        if (playerGesture === computerGesture) {
          resultText = "平手！";
        } else if (
          (playerGesture === "石頭" && computerGesture === "剪刀") ||
          (playerGesture === "剪刀" && computerGesture === "布") ||
          (playerGesture === "布" && computerGesture === "石頭")
        ) {
          resultText = "恭喜你贏了！🎉";
          winCount++;
        } else {
          resultText = "你輸了！❌";
          loseCount++;
        }
      } else {
        resultText = "偵測失敗，請重來！";
        computerGesture = "無";
      }
      gameState = "RESULT";
      timerStart = currentTime;
    }

  } else if (gameState === "RESULT") {
    let textColor = resultText.includes("贏") ? color(0, 255, 0) : (resultText.includes("輸") ? color(255, 0, 0) : color(255));
    
    drawOverlayText(resultText, width / 2, height / 2 - 40, 48, textColor);
    drawOverlayText(`你：${playerGesture}  vs  電腦：${computerGesture}`, width / 2, height / 2 + 30, 24, color(255));

    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// 畫出原生 MediaPipe 網格
function drawKeypoints(landmarks) {
  stroke(0, 255, 0);
  strokeWeight(2);
  fill(0, 255, 0);

  // 畫出 21 個點（注意：原生座標是 0~1 的比例，且要手動鏡像處理）
  for (let i = 0; i < landmarks.length; i++) {
    let x = (1 - landmarks[i].x) * width; // 1 - x 是因為畫面被我們水平翻轉了
    let y = landmarks[i].y * height;
    ellipse(x, y, 6, 6);
  }

  // 骨架連線
  let fingers = [
    [0, 1, 2, 3, 4],     
    [0, 5, 6, 7, 8],     
    [0, 9, 10, 11, 12],  
    [0, 13, 14, 15, 16], 
    [0, 17, 18, 19, 20]  
  ];
  
  noFill();
  for (let f of fingers) {
    beginShape();
    for (let id of f) {
      let x = (1 - landmarks[id].x) * width;
      let y = landmarks[id].y * height;
      vertex(x, y);
    }
    endShape();
  }
}

// 手勢演算法 (原生 MediaPipe 的物件屬性是 .x 和 .y)
function judgeGesture(landmarks) {
  let indexIsOpen = landmarks[8].y < landmarks[6].y;
  let middleIsOpen = landmarks[12].y < landmarks[10].y;
  let ringIsOpen = landmarks[16].y < landmarks[14].y;
  let pinkyIsOpen = landmarks[20].y < landmarks[18].y;

  if (!indexIsOpen && !middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "石頭";
  } else if (indexIsOpen && middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "剪刀";
  } else if (indexIsOpen && middleIsOpen && ringIsOpen && pinkyIsOpen) {
    return "布";
  }
  return "未知";
}

function drawScoreboard() {
  fill(0, 0, 0, 160);
  noStroke();
  rect(width - 160, 15, 145, 40, 8);
  
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  
  fill(0, 255, 0);
  text(`✔ ${winCount} 勝`, width - 145, 35);
  
  fill(255, 50, 50);
  text(`❌ ${loseCount} 敗`, width - 85, 35);
}

function drawOverlayText(txt, x, y, size, col, align = CENTER) {
  textAlign(align, CENTER);
  textSize(size);
  textStyle(BOLD);
  noStroke();
  
  fill(0, 0, 0, 220);
  text(txt, x + 2, y + 2);
  
  fill(col);
  text(txt, x, y);
}