// 完全回傳 The Coding Train 實時追蹤流暢感
let video;
let handPose;
let hands = [];
let isModelReady = false;

// 遊戲流程變數
let gameState = "START"; // START, COUNTDOWN, RESULT
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function preload() {
  // 初始化手勢偵測模型（不加任何翻轉參數，確保原汁原味追踪）
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(640, 480);
  
  // 建立最乾淨的手機/電腦通用相機
  video = createCapture(VIDEO, function(stream) {
    console.log("相機成功啟動！");
    // 只要相機開了，立刻開始無間斷偵測
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
  // 1. 畫出正常的相機視訊背景
  image(video, 0, 0, width, height);

  // 2. 實時手勢解析
  let currentGesture = "未知";
  
  // 【超核心修正】：只要有抓到手，不管認不認得出是石頭還是布，綠色骨架無條件立刻畫出來！
  if (hands && hands.length > 0) {
    let hand = hands[0]; 
    if (hand.confidence > 0.1) { // 門檻調到超低(0.1)，手一晃過去立刻抓到
      
      // 只要手在畫面裡，這兩行強迫執行，線條一定會跟著手動！
      drawSkeleton(hand.keypoints); 
      currentGesture = judgeGesture(hand.keypoints); 
    }
  }

  // 3. 渲染計分板
  drawScoreboard();

  if (!isModelReady) {
    drawOverlayText("相機或 AI 初始化中...", 150, 35, 18, color(255, 200, 0), LEFT);
  }

  // 4. 執行猜拳遊戲狀態機
  gameStateMachine(currentGesture);
}

// === 猜拳遊戲流程狀態機 ===
function gameStateMachine(currentGesture) {
  let currentTime = millis();

  if (gameState === "START") {
    drawOverlayText("請將手伸入畫面", width / 2, height / 2, 32, color(255));
    drawOverlayText("比出 ✊ 石頭、🖐 布、✌ 剪刀", width / 2, height / 2 + 50, 20, color(200));

    // 只要手出現在畫面中，且被成功歸類為石頭、剪刀或布，才觸發 3-2-1 倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 畫出大大的黃色倒數數字
      drawOverlayText(countdown, width / 2, height / 2, 90, color(255, 215, 0));
      drawOverlayText(`當前手勢：${currentGesture}`, 30, 50, 24, color(255), LEFT);
    } else {
      // 倒數結束定勝負
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
        resultText = "沒抓好，請重來！";
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

// === 繪製綠色骨架（這段只要偵測到手就絕對會畫） ===
function drawSkeleton(keypoints) {
  stroke(0, 255, 0); // 經典科技綠色
  strokeWeight(3);
  fill(0, 255, 0);

  // 1. 畫出 21 個關節圓點
  for (let i = 0; i < keypoints.length; i++) {
    circle(keypoints[i].x, keypoints[i].y, 8);
  }

  // 2. 畫出手指連線
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

// === 放寬判定條件的手勢演算法 ===
function judgeGesture(keypoints) {
  // 網頁 Y 軸向下，指尖 Y 小於關節 Y 代表手指伸直
  let indexIsOpen = keypoints[8].y < keypoints[6].y;
  let middleIsOpen = keypoints[12].y < keypoints[10].y;
  let ringIsOpen = keypoints[16].y < keypoints[14].y;
  let pinkyIsOpen = keypoints[20].y < keypoints[18].y;

  // 用最簡單的手指開合數量來區分石頭剪刀布
  if (!indexIsOpen && !middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "石頭";
  } else if (indexIsOpen && middleIsOpen && !ringIsOpen && !pinkyIsOpen) {
    return "剪刀";
  } else if (indexIsOpen && middleIsOpen && ringIsOpen && pinkyIsOpen) {
    return "布";
  }
  
  // 如果比得不標準（例如只伸出三根手指），就回傳未知
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