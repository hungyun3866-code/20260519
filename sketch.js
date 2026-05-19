let video;
let handpose;
let predictions = [];

// 遊戲狀態變數
let gameState = "START"; // START, COUNTDOWN, RESULT
let timerStart = 0;
let playerGesture = "";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function setup() {
  createCanvas(640, 480);
  
  // 初始化視訊鏡頭
  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide(); // 隱藏原本的 HTML video 標籤，我們要在 canvas 上自己畫

  // 初始化 ml5.js 的 Handpose 辨識
  handpose = ml5.handpose(video, modelReady);
  
  // 當偵測到手部數據時，更新 predictions 陣列
  handpose.on("predict", results => {
    predictions = results;
  });
}

function modelReady() {
  console.log("Model Ready!");
}

function draw() {
  // --- 1. 處理相機畫面 (左右翻轉) ---
  // 先將畫布座標系統移動到最右邊，然後把 X 軸縮放改為 -1 (水平反轉)
  push(); 
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);
  
  // 如果有偵測到手，在反轉的座標系下畫出骨架（這樣綠色線條才貼手）
  if (predictions.length > 0) {
    drawSkeleton(predictions[0]);
  }
  pop(); // 還原畫布座標系統，文字才不會反

  // --- 2. 獲取當前手勢辨識結果 (不畫在畫面上，只做邏輯判斷) ---
  let currentGesture = "未知";
  if (predictions.length > 0) {
    currentGesture = judgeGesture(predictions[0].landmarks);
  }

  // --- 3. 畫面 UI 文字 (在還原後的座標系繪製) ---
  drawScoreboard(); // 畫計分板

  let currentTime = millis();

  if (gameState === "START") {
    // 提示伸手
    drawCenterText("請將手伸入畫面", 32, color(255));
    drawGestureGuide();

    // 如果偵測到有效手勢，進入倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 顯示大大的黃色倒數數字 (與影片一樣)
      drawCenterText(countdown, 90, color(255, 215, 0)); 
      if (currentGesture !== "未知") {
        drawLeftText(`你出：${currentGesture}`, 24, color(255), 50);
      }
    } else {
      // 倒數結束，判定輸贏
      playerGesture = currentGesture;
      if (playerGesture !== "未知") {
        let options = ["石頭", "剪刀", "布"];
        computerGesture = random(options);

        // 輸贏邏輯
        if (playerGesture === computerGesture) {
          resultText = "平手！";
        } else if (
          (playerGesture === "石頭" && computerGesture === "剪刀") ||
          (playerGesture === "剪刀" && computerGesture === "布") ||
          (playerGesture === "布" && computerGesture === "石頭")
        ) {
          resultText = "恭喜你贏了！";
          winCount++;
        } else {
          resultText = "你輸了！";
          loseCount++;
        }
      } else {
        resultText = "沒有偵測到手勢！";
        computerGesture = "None";
      }
      gameState = "RESULT";
      timerStart = currentTime;
    }

  } else if (gameState === "RESULT") {
    // 顯示結果
    let textColor = resultText.includes("贏") ? color(0, 255, 0) : (resultText.includes("輸") ? color(255, 0, 0) : color(255));
    drawCenterText(resultText, 48, textColor, -40);
    drawCenterText(`你：${playerGesture}  vs  電腦：${computerGesture}`, 24, color(255), 30);

    // 停留 3 秒後回到開始狀態
    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// --- 輔助函式：畫出綠色骨架 (注意：ml5 landmarks 不需要手動映射，直接畫就好，因為已經 scale 了) ---
function drawSkeleton(hand) {
  stroke(0, 255, 0); // 綠色
  strokeWeight(2);
  fill(0, 255, 0);

  // 畫出關鍵點
  for (let i = 0; i < hand.landmarks.length; i++) {
    let x = hand.landmarks[i][0];
    let y = hand.landmarks[i][1];
    ellipse(x, y, 6, 6);
  }

  // 畫骨架連線
  let fingers = [
    [0,1,2,3,4],       // 大拇指
    [0,5,6,7,8],       // 食指
    [0,9,10,11,12],    // 中指
    [0,13,14,15,16],   // 無名指
    [0,17,18,19,20]    // 小拇指
  ];
  
  noFill();
  for (let f of fingers) {
    beginShape();
    for (let id of f) {
      let x = hand.landmarks[id][0];
      let y = hand.landmarks[id][1];
      vertex(x, y);
    }
    endShape();
  }
}

// --- 手勢判斷演算法 (維持不變) ---
function judgeGesture(landmarks) {
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

// --- 畫計分板 ---
function drawScoreboard() {
  fill(0, 0, 0, 150); // 半透明黑底
  noStroke();
  rect(width - 160, 10, 150, 40, 5); // 右上角黑框
  
  // 勝場數
  fill(0, 255, 0);
  textSize(16);
  textAlign(LEFT, CENTER);
  text(`✔ ${winCount} 勝`, width - 145, 30);
  
  // 敗場數
  fill(255, 0, 0);
  text(`❌ ${loseCount} 敗`, width - 85, 30);
}

// --- 畫置中文字的輔助函式 (加上黑色陰影讓字體更清晰) ---
function drawCenterText(txt, size, col, yOffset = 0) {
  textAlign(CENTER, CENTER);
  textSize(size);
  textStyle(BOLD);
  
  // 文字陰影 (黑色)
  fill(0, 0, 0, 200); 
  text(txt, width / 2 + 2, height / 2 + yOffset + 2);
  
  // 文字主體
  fill(col);
  text(txt, width / 2, height / 2 + yOffset);
}

// --- 畫左上角文字 ---
function drawLeftText(txt, size, col, y) {
  textAlign(LEFT, TOP);
  textSize(size);
  fill(col);
  textStyle(BOLD);
  text(txt, 10, y);
}

// --- 下方手勢提示圖標 ---
function drawGestureGuide() {
  drawCenterText("比出 ✊ 石頭、🖐 布、✌ 剪刀", 20, color(200), 50);
}