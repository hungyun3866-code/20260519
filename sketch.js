let video;
let handpose;
let predictions = [];

// 遊戲狀態變數
let gameState = "START"; // START: 提示伸手, COUNTDOWN: 鎖定倒數, RESULT: 顯示勝負
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
  video.hide(); // 隱藏原本原生 HTML 的視訊畫面

  // 初始化 ml5.js 的 Handpose 模型
  handpose = ml5.handpose(video, modelReady);
  
  // 當辨識到手部數據時，更新 predictions 陣列
  handpose.on("predict", results => {
    predictions = results;
  });
}

function modelReady() {
  console.log("Model Ready!");
}

function draw() {
  // --- 1. 處理相機畫面 (左右翻轉鏡像) ---
  push(); // 保存當前坐標狀態
  translate(width, 0);
  scale(-1, 1); // 水平水平反轉 (scaleX = -1)
  image(video, 0, 0, width, height); // 畫出水平反轉的鏡像畫面
  pop(); // 還原坐標系統，否則文字會反過來

  // --- 2. 畫出骨架線條 (需手動處理坐標翻轉) ---
  if (predictions.length > 0) {
    drawSkeletonMirrored(predictions[0]); // 關鍵改動：手動處理坐標的繪製
  }

  // --- 3. 獲取手勢結果 (不畫在畫面上，只做邏輯判斷) ---
  let currentGesture = "未知";
  if (predictions.length > 0) {
    currentGesture = judgeGesture(predictions[0].landmarks);
  }

  // --- 4. 遊戲核心邏輯與文字顯示 (在還原後的坐標系繪製) ---
  drawScoreboard(); // 畫計分板

  let currentTime = millis();

  if (gameState === "START") {
    // 提示伸手
    drawCenterText("請將手伸入畫面", 32, color(255));
    drawCenterText("比出 ✊ 石頭、🖐 布、✌ 剪刀", 20, color(200), 50);

    // 如果偵測到有效手勢，鎖定進入倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 顯示黃色大數字倒數 (對應影片中效果)
      drawCenterText(countdown, 90, color(255, 215, 0)); 
      if (currentGesture !== "未知") {
        drawLeftText(`你出：${currentGesture}`, 24, color(255), 50);
      }
    } else {
      // 3 秒倒數結束，判定輸贏
      playerGesture = currentGesture;
      if (playerGesture !== "未知") {
        let options = ["石頭", "剪刀", "布"];
        computerGesture = random(options);

        // 輸贏邏輯判斷
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
    // 顯示結果 (贏顯示綠色，輸顯示紅色)
    let textColor = resultText.includes("贏") ? color(0, 255, 0) : (resultText.includes("輸") ? color(255, 0, 0) : color(255));
    drawCenterText(resultText, 48, textColor, -40);
    drawCenterText(`你：${playerGesture}  vs  電腦：${computerGesture}`, 24, color(255), 30);

    // 停留 3 秒後回到開始狀態
    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// --- 輔助函式：畫出綠色骨架 (關鍵！手動處理每個點的水平翻轉映射) ---
function drawSkeletonMirrored(hand) {
  stroke(0, 255, 0); // 影片中看到的綠色
  strokeWeight(2.5);
  fill(0, 255, 0);

  // 畫出關鍵點 ( ellipse)
  for (let i = 0; i < hand.landmarks.length; i++) {
    // 【核心改動】將原本的 X 坐標映射到水平反轉後的對應位置
    // 反轉坐標 = 畫布寬度 - 原坐標
    let x = width - hand.landmarks[i][0];
    let y = hand.landmarks[i][1];
    ellipse(x, y, 7, 7);
  }

  // 骨架連線
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
      // 【核心改動】連線坐標也必須反轉映射
      let x = width - hand.landmarks[id][0];
      let y = hand.landmarks[id][1];
      vertex(x, y);
    }
    endShape();
  }
}

// --- 手勢判斷演算法 (維持不變) ---
function judgeGesture(landmarks) {
  // 指尖坐標 Y 小於指根坐標 Y 代表伸直 (注意：網頁 Y 軸朝下)
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

// --- 畫右上角半透明黑框計分板 (影片右上角效果) ---
function drawScoreboard() {
  fill(0, 0, 0, 160); // 半透明黑色
  noStroke();
  rect(width - 160, 15, 145, 40, 8); // 右上角黑框
  
  // 勝場場數 (✔ 顯示綠色)
  fill(0, 255, 0);
  textSize(16);
  textAlign(LEFT, CENTER);
  text(`✔ ${winCount} 勝`, width - 145, 35);
  
  // 敗場場數 (❌ 顯示紅色)
  fill(255, 50, 50);
  text(`❌ ${loseCount} 敗`, width - 85, 35);
}

// --- 畫置中文字的輔助函式 (加上黑色陰影防背景蓋住，更清晰) ---
function drawCenterText(txt, size, col, yOffset = 0) {
  textAlign(CENTER, CENTER);
  textSize(size);
  textStyle(BOLD); // 粗體文字
  noStroke();
  
  // 文字陰影 (黑色)
  fill(0, 0, 0, 220); 
  text(txt, width / 2 + 2, height / 2 + yOffset + 2);
  
  // 文字主體
  fill(col);
  text(txt, width / 2, height / 2 + yOffset);
}

// --- 畫左上角你當前出拳文字 ---
function drawLeftText(txt, size, col, y) {
  textAlign(LEFT, TOP);
  textSize(size);
  fill(col);
  textStyle(BOLD);
  noStroke();
  text(txt, 10, y);
}