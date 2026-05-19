let video;
let handpose;
let predictions = [];

// 遊戲狀態變數
let gameState = "START"; // START: 提示伸手, COUNTDOWN: 倒數, RESULT: 顯示結果
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function setup() {
  createCanvas(640, 480);
  
  // 初始化視訊鏡頭
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide(); // 隱藏原生 HTML 影片，由 p5 畫在畫布上

  // 初始化 ml5.js 的 Handpose 模型
  handpose = ml5.handpose(video, modelReady);
  
  // 監聽辨識結果
  handpose.on("predict", results => {
    predictions = results;
  });
}

function modelReady() {
  console.log("Handpose 模型載入成功！");
}

function draw() {
  // 1. 鏡像翻轉視訊畫面（符合視覺直覺）
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  
  // 2. 還原座標系，避免文字跟著鏡像顛倒
  translate(width, 0);
  scale(-1, 1);

  // 3. 取得當前手勢並繪製骨架
  let currentGesture = "未知";
  if (predictions.length > 0) {
    let hand = predictions[0];
    drawKeypoints(hand); // 畫出綠色網格
    currentGesture = judgeGesture(hand.landmarks);
  }

  // 4. 渲染右上角計分板
  drawScoreboard();

  // 5. 遊戲流程控制 (狀態機)
  let currentTime = millis();

  if (gameState === "START") {
    drawOverlayText("請將手伸入畫面", width / 2, height / 2, 32, color(255));
    drawOverlayText("比出 ✊ 石頭、🖐 布、✌ 剪刀", width / 2, height / 2 + 50, 20, color(200));

    // 偵測到有效出拳，立即鎖定並進入倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 顯示黃色大數字倒數
      drawOverlayText(countdown, width / 2, height / 2, 90, color(255, 215, 0));
      if (currentGesture !== "未知") {
        drawOverlayText(`你當前出：${currentGesture}`, 30, 50, 24, color(255), LEFT);
      }
    } else {
      // 倒數 3 秒結束，定生死
      playerGesture = currentGesture;
      if (playerGesture !== "未知") {
        let options = ["石頭", "剪刀", "布"];
        computerGesture = random(options);

        // 勝負邏輯判定
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
    // 依據勝負改變顏色
    let textColor = resultText.includes("贏") ? color(0, 255, 0) : (resultText.includes("輸") ? color(255, 0, 0) : color(255));
    
    drawOverlayText(resultText, width / 2, height / 2 - 40, 48, textColor);
    drawOverlayText(`你：${playerGesture}  vs  電腦：${computerGesture}`, width / 2, height / 2 + 30, 24, color(255));

    // 結果停留在畫面上 3 秒後自動重啟
    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// 畫出綠色手部關節與骨架連線
function drawKeypoints(hand) {
  stroke(0, 255, 0);
  strokeWeight(2);
  fill(0, 255, 0);

  // 繪製 21 個關鍵點 (需做 w - x 的鏡像處理)
  for (let i = 0; i < hand.landmarks.length; i++) {
    let x = width - hand.landmarks[i][0];
    let y = hand.landmarks[i][1];
    ellipse(x, y, 6, 6);
  }

  // 骨架連線定義 (五根手指)
  let fingers = [
    [0, 1, 2, 3, 4],     // 大拇指
    [0, 5, 6, 7, 8],     // 食指
    [0, 9, 10, 11, 12],  // 中指
    [0, 13, 14, 15, 16], // 無名指
    [0, 17, 18, 19, 20]  // 小拇指
  ];
  
  noFill();
  for (let f of fingers) {
    beginShape();
    for (let id of f) {
      let x = width - hand.landmarks[id][0];
      let y = hand.landmarks[id][1];
      vertex(x, y);
    }
    endShape();
  }
}

// 根據 MediaPipe 節點高度判斷手勢
function judgeGesture(landmarks) {
  // 比較指尖與核心關節的 Y 軸位置（注意：畫布 Y 軸越往下數值越大）
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

// 繪製右上角計分板
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

// 輔助函式：繪製有黑色陰影的文字，避免背景干擾看不清
function drawOverlayText(txt, x, y, size, col, align = CENTER) {
  textAlign(align, CENTER);
  textSize(size);
  textStyle(BOLD);
  noStroke();
  
  // 渲染陰影
  fill(0, 0, 0, 220);
  text(txt, x + 2, y + 2);
  
  // 渲染主文字
  fill(col);
  text(txt, x, y);
}