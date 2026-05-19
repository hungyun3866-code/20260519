let video;
let handPose;
let hands = [];
let isModelReady = false;

function preload() {
  // 初始化 ml5.handPose（自帶鏡像翻轉）
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  createCanvas(640, 480);
  
  // 修正核心：改用最標準的 VIDEO 常數，並透過 callback 確保相機啟動後才執行偵測
  video = createCapture(VIDEO, function(stream) {
    console.log("相機成功啟動，串流獲取完畢！");
    // 確定相機拿到畫面後，才啟動 AI 偵測
    handPose.detectStart(video, gotHands);
    isModelReady = true;
  });
  
  video.size(640, 480);
  video.hide();
}

function gotHands(results) {
  hands = results;
}

function draw() {
  // 畫出視訊背景
  image(video, 0, 0, width, height);

  // 實時手勢解析
  let currentGesture = "未知";
  
  if (hands && hands.length > 0) {
    let hand = hands[0]; 
    if (hand.confidence > 0.2) { 
      drawSkeleton(hand.keypoints); // 畫出綠色骨架
      currentGesture = judgeGesture(hand.keypoints); // 計算出拳
    }
  }

  // 渲染計分板
  drawScoreboard();

  // 狀態提示
  if (!isModelReady) {
    drawOverlayText("相機或 AI 模型初始化中...", 150, 35, 18, color(255, 200, 0), LEFT);
  }

  // 執行遊戲流程
  gameStateMachine(currentGesture);
}

// === 猜拳遊戲狀態機 (維持你的原版邏輯) ===
let gameState = "START"; 
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function gameStateMachine(currentGesture) {
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
        drawOverlayText(`鎖定中：${currentGesture}`, 30, 50, 24, color(255), LEFT);
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

// 繪製綠色骨架
function drawSkeleton(keypoints) {
  stroke(0, 255, 0);
  strokeWeight(2.5);
  fill(0, 255, 0);

  for (let i = 0; i < keypoints.length; i++) {
    circle(keypoints[i].x, keypoints[i].y, 7);
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
      vertex(keypoints[id].x, keypoints[id].y);
    }
    endShape();
  }
}

// 判斷手勢
function judgeGesture(keypoints) {
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