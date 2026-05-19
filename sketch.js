// Hand Pose Detection with ml5.js (v1.0.0+ 新版猜拳遊戲)
// 改編自 https://thecodingtrain.com/tracks/ml5js-beginners-guide/ml5/hand-pose

let video;
let handPose;
let hands = [];

// 遊戲流程變數
let gameState = "START"; // START, COUNTDOWN, RESULT
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function preload() {
  // 初始化 HandPose 模型（啟用鏡像翻轉）
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(640, 480);
  // 建立視訊鏡頭（啟用鏡像翻轉）
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();

  // 開始偵測手勢
  handPose.detectStart(video, gotHands);
}

function gotHands(results) {
  hands = results;
}

function draw() {
  // 1. 畫出視訊畫面
  image(video, 0, 0, width, height);

  // 2. 取得當前手勢並畫出綠色網格
  let currentGesture = "未知";
  if (hands.length > 0) {
    let hand = hands[0]; // 只抓第一隻手
    if (hand.confidence > 0.5) {
      drawSkeleton(hand.keypoints); // 畫出綠色骨架連線與點
      currentGesture = judgeGesture(hand.keypoints); // 判斷手勢
    }
  }

  // 3. 畫右上角計分板
  drawScoreboard();

  // 4. 猜拳遊戲狀態機邏輯
  let currentTime = millis();

  if (gameState === "START") {
    drawOverlayText("請將手伸入畫面", width / 2, height / 2, 32, color(255));
    drawOverlayText("比出 ✊ 石頭、🖐 布、✌ 剪刀", width / 2, height / 2 + 50, 20, color(200));

    // 一旦偵測到有效出拳，立刻進入 3 秒倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 顯示黃色大倒數數字
      drawOverlayText(countdown, width / 2, height / 2, 90, color(255, 215, 0));
      if (currentGesture !== "未知") {
        drawOverlayText(`你當前出：${currentGesture}`, 30, 50, 24, color(255), LEFT);
      }
    } else {
      // 倒數結束，定勝負
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
    // 依據勝負決定文字顏色
    let textColor = resultText.includes("贏") ? color(0, 255, 0) : (resultText.includes("輸") ? color(255, 0, 0) : color(255));
    
    drawOverlayText(resultText, width / 2, height / 2 - 40, 48, textColor);
    drawOverlayText(`你：${playerGesture}  vs  電腦：${computerGesture}`, width / 2, height / 2 + 30, 24, color(255));

    // 結果停留 3 秒後自動重來
    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// 畫出影片中漂亮的綠色手部關節與骨架連線
function drawSkeleton(keypoints) {
  stroke(0, 255, 0);
  strokeWeight(2);
  fill(0, 255, 0);

  // 1. 畫出 21 個圓點
  for (let i = 0; i < keypoints.length; i++) {
    circle(keypoints[i].x, keypoints[i].y, 8);
  }

  // 2. 定義五根手指的關節點索引連線
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
      vertex(keypoints[id].x, keypoints[id].y);
    }
    endShape();
  }
}

// 根據最新版 ml5.js 的關鍵點位置判斷手勢
function judgeGesture(keypoints) {
  // 在 MediaPipe 中，Y軸座標越小代表位置越高
  // 我們透過比較「指尖」和「指根關節」的 Y 軸高低，判斷手指是否伸直
  let indexIsOpen = keypoints[8].y < keypoints[6].y;   // 食指
  let middleIsOpen = keypoints[12].y < keypoints[10].y; // 中指
  let ringIsOpen = keypoints[16].y < keypoints[14].y;   // 無名指
  let pinkyIsOpen = keypoints[20].y < keypoints[18].y;  // 小拇指

  // 猜拳邏輯判定
  if (!indexIsOpen && !middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "石頭"; // 手指全握
  } else if (indexIsOpen && middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "剪刀"; // 只有食指中指伸出
  } else if (indexIsOpen && middleIsOpen && ringIsOpen && pinkyIsOpen) {
    return "布";   // 手指全開
  }
  return "未知";
}

// 右上角黑框計分板
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

// 輔助函式：繪製帶有黑色陰影的文字，防止背景干擾
function drawOverlayText(txt, x, y, size, col, align = CENTER) {
  textAlign(align, CENTER);
  textSize(size);
  textStyle(BOLD);
  noStroke();
  
  // 畫陰影
  fill(0, 0, 0, 220);
  text(txt, x + 2, y + 2);
  
  // 畫主文字
  fill(col);
  text(txt, x, y);
}