// 基於 The Coding Train 語法擴充的實時猜拳遊戲
let video;
let handPose;
let hands = [];

// 遊戲狀態機變數
let gameState = "START"; // START: 提示伸手, COUNTDOWN: 鎖定倒數, RESULT: 顯示結果
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function preload() {
  // 初始化新版 HandPose 偵測器（自帶鏡像翻轉）
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(640, 480);
  
  // 建立視訊鏡頭（自帶鏡像翻轉）
  video = createCapture(VIDEO, { flipped: true });
  video.size(640, 480);
  video.hide();

  // 啟動連續偵測
  handPose.detectStart(video, gotHands);
}

function gotHands(results) {
  hands = results;
}

function draw() {
  // 1. 畫出視訊背景
  image(video, 0, 0, width, height);

  // 2. 實時手勢解析
  let currentGesture = "未知";
  
  if (hands.length > 0) {
    let hand = hands[0]; // 專注捕捉畫面中的第一隻手
    if (hand.confidence > 0.2) { // 調低門檻，確保一伸出手就秒抓
      
      drawSkeleton(hand.keypoints); // 畫出綠色骨架線條
      currentGesture = judgeGesture(hand.keypoints); // 計算當前比出什麼
    }
  }

  // 3. 渲染計分板
  drawScoreboard();

  // 4. 遊戲核心邏輯
  let currentTime = millis();

  if (gameState === "START") {
    drawOverlayText("請將手伸入畫面", width / 2, height / 2, 32, color(255));
    drawOverlayText("比出 ✊ 石頭、🖐 布、✌ 剪刀", width / 2, height / 2 + 50, 20, color(200));

    // 只要手一伸進來比出有效手勢，立刻鎖定並觸發 3 秒倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 畫出大大的倒數數字
      drawOverlayText(countdown, width / 2, height / 2, 90, color(255, 215, 0));
      if (currentGesture !== "未知") {
        drawOverlayText(`鎖定中：${currentGesture}`, 30, 50, 24, color(255), LEFT);
      }
    } else {
      // 3 秒時間到，判定最終手勢
      playerGesture = currentGesture;
      
      if (playerGesture !== "未知") {
        let options = ["石頭", "剪刀", "布"];
        computerGesture = random(options);

        // 勝負邏輯
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

    // 結果停留 3 秒後自動重開新局
    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// 繪製綠色連線骨架
function drawSkeleton(keypoints) {
  stroke(0, 255, 0);
  strokeWeight(2.5);
  fill(0, 255, 0);

  // 畫出所有關節點
  for (let i = 0; i < keypoints.length; i++) {
    circle(keypoints[i].x, keypoints[i].y, 7);
  }

  // 畫出手指連線
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

// 依據指尖和關節的高度判斷手勢
function judgeGesture(keypoints) {
  // 透過 Y 軸比較指尖是否高於手指的第二個關節（注意：網頁 Y 軸朝下，所以小於 < 代表比較高、伸直了）
  let indexIsOpen = keypoints[8].y < keypoints[6].y;
  let middleIsOpen = keypoints[12].y < keypoints[10].y;
  let ringIsOpen = keypoints[16].y < keypoints[14].y;
  let pinkyIsOpen = keypoints[20].y < keypoints[18].y;

  if (!indexIsOpen && !middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "石頭";
  } else if (indexIsOpen && middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "剪刀";
  } else if (indexIsOpen && middleIsOpen && ringIsOpen && pinkyIsOpen) {
    return "布";
  }
  return "未知";
}

// 畫右上角計分板
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

// 輔助畫出有陰影的文字，看得更清楚
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