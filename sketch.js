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
  // 1. 初始化新版 handPose，完全關閉鏡像 (flipped: false)
  handPose = ml5.handPose({ flipped: false });
}

function setup() {
  createCanvas(640, 480);
  
  // 2. 建立常規相機，完全關閉鏡像 (flipped: false)
  video = createCapture(VIDEO, { flipped: false }, function(stream) {
    console.log("相機啟動成功！");
    // 相機順利開啟後，正式啟動 AI 連續偵測
    handPose.detectStart(video, gotHands);
    isModelReady = true;
  });
  
  video.size(640, 480);
  video.hide();
}

function gotHands(results) {
  // 將偵測結果存入 hands 陣列
  hands = results;
}

function draw() {
  // 3. 正常畫出相機畫面（非鏡像，左邊就是左邊）
  image(video, 0, 0, width, height);

  // 4. 實時手勢解析
  let currentGesture = "未知";
  
  // 確保 AI 有抓到手部數據
  if (hands && hands.length > 0) {
    let hand = hands[0]; // 抓取畫面中的第一隻手
    if (hand.confidence > 0.2) { // 信心門檻，手伸進來就秒抓
      drawSkeleton(hand.keypoints); // 畫出綠色骨架
      currentGesture = judgeGesture(hand.keypoints); // 計算出拳
    }
  }

  // 5. 繪製右上角計分板與狀態
  drawScoreboard();

  if (!isModelReady) {
    drawOverlayText("相機或 AI 初始化中...", 150, 35, 18, color(255, 200, 0), LEFT);
  }

  // 6. 執行遊戲流程
  gameStateMachine(currentGesture);
}

// === 猜拳遊戲流程狀態機 ===
function gameStateMachine(currentGesture) {
  let currentTime = millis();

  if (gameState === "START") {
    drawOverlayText("請將手伸入畫面", width / 2, height / 2, 32, color(255));
    drawOverlayText("比出 ✊ 石頭、🖐 布、✌ 剪刀", width / 2, height / 2 + 50, 20, color(200));

    // 只要偵測到有效手勢，立刻鎖定並觸發倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 顯示醒目的黃色大數字倒數 3、2、1
      drawOverlayText(countdown, width / 2, height / 2, 90, color(255, 215, 0));
      if (currentGesture !== "未知") {
        drawOverlayText(`鎖定中：${currentGesture}`, 30, 50, 24, color(255), LEFT);
      }
    } else {
      // 3 秒時間到，判定最終手勢並隨機出拳
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

    // 結果停留 3 秒後重啟新局
    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// === 繪製綠色骨架（直接對應常規坐標，不進行任何水平翻轉） ===
function drawSkeleton(keypoints) {
  stroke(0, 255, 0);
  strokeWeight(2.5);
  fill(0, 255, 0);

  // 1. 畫出 21 個關鍵點
  for (let i = 0; i < keypoints.length; i++) {
    circle(keypoints[i].x, keypoints[i].y, 7);
  }

  // 2. 五指連線
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

// === 基於指尖與關節高度的手勢判定 ===
function judgeGesture(keypoints) {
  // 比較 Y 軸（指尖比第二關節高即為伸直）
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

// === 右上角半透明黑底計分板 ===
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

// === 帶有文字陰影效果的 UI 文字繪製 ===
function drawOverlayText(txt, x, y, size, col, align = CENTER) {
  textAlign(align, CENTER);
  textSize(size);
  textStyle(BOLD);
  noStroke();
  
  // 黑色陰影
  fill(0, 0, 0, 220);
  text(txt, x + 2, y + 2);
  
  // 主色文字
  fill(col);
  text(txt, x, y);
}