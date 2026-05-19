let video;
let handPose;
let hands = [];
let isModelReady = false;

// 遊戲流程控制變數
let gameState = "START"; // START: 提示伸手, COUNTDOWN: 鎖定倒數, RESULT: 顯示勝負
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function preload() {
  // 初始化手勢偵測模型，並啟用內建鏡像翻轉功能
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(640, 480);
  
  // 為了手機相容性，使用最乾淨的 VIDEO 常數呼叫相機
  video = createCapture(VIDEO, function(stream) {
    console.log("手機相機成功啟動！開始連動 AI 偵測...");
    
    // 相機串流確定成功獲取後，才開始捕捉手勢
    handPose.detectStart(video, gotHands);
    isModelReady = true;
  });
  
  video.size(640, 480);
  video.hide(); // 隱藏原本 html 產生的生硬 video 標籤
}

function gotHands(results) {
  hands = results;
}

function draw() {
  // 1. 畫出翻轉好的相機視訊畫面作為背景
  image(video, 0, 0, width, height);

  // 2. 實時手勢解析
  let currentGesture = "未知";
  if (hands && hands.length > 0) {
    let hand = hands[0]; // 鎖定畫面中第一隻出現的手
    if (hand.confidence > 0.25) { // 稍微降低門檻，讓手機更好抓取
      drawSkeleton(hand.keypoints); // 畫出綠色網格與關節點
      currentGesture = judgeGesture(hand.keypoints); // 計算目前比出的拳法
    }
  }

  // 3. 繪製右上角計分板
  drawScoreboard();

  // 4. 頂部狀態提示（AI 還沒準備好時顯示）
  if (!isModelReady) {
    drawOverlayText("相機與 AI 初始化中...", 150, 35, 18, color(255, 200, 0), LEFT);
  }

  // 5. 執行遊戲狀態機
  gameStateMachine(currentGesture);
}

// === 猜拳遊戲流程控制中心 ===
function gameStateMachine(currentGesture) {
  let currentTime = millis();

  if (gameState === "START") {
    drawOverlayText("請將手伸入畫面", width / 2, height / 2, 32, color(255));
    drawOverlayText("比出 ✊ 石頭、🖐 布、✌ 剪刀", width / 2, height / 2 + 50, 20, color(200));

    // 當玩家比出有效手勢時，立即鎖定並進入倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 畫出醒目的黃色大倒數數字
      drawOverlayText(countdown, width / 2, height / 2, 90, color(255, 215, 0));
      if (currentGesture !== "未知") {
        drawOverlayText(`鎖定中：${currentGesture}`, 30, 50, 24, color(255), LEFT);
      }
    } else {
      // 3 秒倒數結束，定勝負
      playerGesture = currentGesture;
      
      if (playerGesture !== "未知") {
        let options = ["石頭", "剪刀", "布"];
        computerGesture = random(options);

        // 勝負規則判定
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
    // 根據勝負動態切換文字顏色
    let textColor = resultText.includes("贏") ? color(0, 255, 0) : (resultText.includes("輸") ? color(255, 0, 0) : color(255));
    
    drawOverlayText(resultText, width / 2, height / 2 - 40, 48, textColor);
    drawOverlayText(`你：${playerGesture}  vs  電腦：${computerGesture}`, width / 2, height / 2 + 30, 24, color(255));

    // 結果畫面停留 3 秒後自動返回下一局
    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// === 畫出綠色骨架與關節線條 ===
function drawSkeleton(keypoints) {
  stroke(0, 255, 0);
  strokeWeight(2.5);
  fill(0, 255, 0);

  // 1. 畫出 21 個圓點關節
  for (let i = 0; i < keypoints.length; i++) {
    circle(keypoints[i].x, keypoints[i].y, 7);
  }

  // 2. 依序將五根手指的關鍵點相連
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

// === 猜拳動作演算法判斷 ===
function judgeGesture(keypoints) {
  // 網頁 Y 軸向下，所以指尖的 Y 軸數值小於關節的 Y 軸數值，即代表手指朝上伸直
  let indexIsOpen = keypoints[8].y < keypoints[6].y;   // 食指是否開
  let middleIsOpen = keypoints[12].y < keypoints[10].y; // 中指是否開
  let ringIsOpen = keypoints[16].y < keypoints[14].y;   // 無名指是否開
  let pinkyIsOpen = keypoints[20].y < keypoints[18].y;  // 小拇指是否開

  if (!indexIsOpen && !middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "石頭";
  } else if (indexIsOpen && middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "剪刀";
  } else if (indexIsOpen && middleIsOpen && ringIsOpen && pinkyIsOpen) {
    return "布";
  }
  return "未知";
}

// === 畫右上角半透明黑底計分板 ===
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

// === 輔助功能：繪製帶有黑色陰影的文字（防止與視訊背景混在一起） ===
function drawOverlayText(txt, x, y, size, col, align = CENTER) {
  textAlign(align, CENTER);
  textSize(size);
  textStyle(BOLD);
  noStroke();
  
  // 畫陰影
  fill(0, 0, 0, 220);
  text(txt, x + 2, y + 2);
  
  // 畫主要文字
  fill(col);
  text(txt, x, y);
}