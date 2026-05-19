let video;
let handpose;
let predictions = [];

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
  
  // 關鍵改動：確保鏡頭串流完全建立後（觸發 Callback），才初始化 handpose
  video = createCapture(VIDEO, function(stream) {
    console.log("鏡頭串流建立成功，開始載入 AI 模型...");
    handpose = ml5.handpose(video, modelReady);
    
    // 監聽辨識結果
    handpose.on("predict", results => {
      predictions = results;
    });
  });
  
  video.size(640, 480);
  video.hide(); 
}

function modelReady() {
  console.log("AI 手勢辨識模型已準備就緒！");
}

function draw() {
  // 1. 鏡像翻轉視訊畫面
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  
  // 2. 還原座標系
  translate(width, 0);
  scale(-1, 1);

  // 3. 取得當前手勢並繪製骨架
  let currentGesture = "未知";
  if (predictions && predictions.length > 0) {
    let hand = predictions[0];
    drawKeypoints(hand); 
    currentGesture = judgeGesture(hand.landmarks);
  }

  // 4. 渲染右上角計分板
  drawScoreboard();

  // 5. 遊戲流程控制
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

// 畫出綠色手部關節與骨架連線
function drawKeypoints(hand) {
  if (!hand || !hand.landmarks) return;
  
  stroke(0, 255, 0);
  strokeWeight(2);
  fill(0, 255, 0);

  for (let i = 0; i < hand.landmarks.length; i++) {
    let x = width - hand.landmarks[i][0];
    let y = hand.landmarks[i][1];
    ellipse(x, y, 6, 6);
  }

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
      if (hand.landmarks[id]) {
        let x = width - hand.landmarks[id][0];
        let y = hand.landmarks[id][1];
        vertex(x, y);
      }
    }
    endShape();
  }
}

// 手勢判斷
function judgeGesture(landmarks) {
  if (!landmarks) return "未知";
  
  let indexIsOpen = landmarks[8][1] < landmarks[6][1];
  let middleIsOpen = landmarks[12][1] < landmarks[10][1];
  let ringIsOpen = landmarks[16][1] < landmarks[14][1];
  let pinkyIsOpen = landmarks[20][1] < landmarks[18][1];

  if (!indexIsOpen && !middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "石頭";
  } else if (indexIsOpen && middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "剪刀";
  } else if (indexIsOpen && middleIsOpen && ringIsOpen && pinkyIsOpen) {
    return "布";
  }
  return "未知";
}

// 計分板
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

// 文字渲染
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