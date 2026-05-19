let videoElement;
let hands;
let detectedHands = [];

// === 遊戲流程控制變數 ===
let gameState = "START"; // START: 提示伸手, COUNTDOWN: 鎖定倒數, RESULT: 顯示勝負
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function setup() {
  createCanvas(640, 480);

  // 1. 建立隱藏的 video 標籤供 MediaPipe 讀取
  videoElement = createCapture(VIDEO);
  videoElement.size(640, 480);
  videoElement.hide();

  // 2. 初始化 MediaPipe Hands
  hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  // 當 MediaPipe 順利抓到手，無條件把數據傳給 detectedHands
  hands.onResults((results) => {
    if (results.multiHandLandmarks) {
      detectedHands = results.multiHandLandmarks;
    } else {
      detectedHands = [];
    }
  });

  // 3. 啟動 MediaPipe 相機工具
  const camera = new Camera(videoElement.elt, {
    onFrame: async () => {
      await hands.send({ image: videoElement.elt });
    },
    width: 640,
    height: 480
  });
  camera.start();
}

function draw() {
  // 畫出常規相機畫面背景（非鏡像）
  image(videoElement, 0, 0, width, height);

  // 解析當前手勢
  let currentGesture = "未知";

  // 【即時追蹤】：只要 MediaPipe 有抓到手，綠色骨架無條件立刻追蹤繪製！
  if (detectedHands.length > 0) {
    let handPoints = detectedHands[0];
    
    // 強制畫出綠色線條與圓點
    drawMediaPipeSkeleton(handPoints);
    
    // 即時計算目前的手勢
    currentGesture = judgeMediaPipeGesture(handPoints);
  }

  // 繪製右上角計分板
  drawScoreboard();

  // 執行遊戲流程狀態機
  gameStateMachine(currentGesture);

  // 【新增項目】：在最頂端繪製你的個人資訊學號
  drawStudentInfo();
}

// === 頂端學號姓名標示（含黑底防字體被遮擋） ===
function drawStudentInfo() {
  // 畫頂端半透明長條黑底
  fill(0, 0, 0, 140);
  noStroke();
  rect(0, 0, width, 40);

  // 寫入個人資訊
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  
  // 使用舒服的白色字體
  fill(255);
  text("學號：414730860  |  班級：教科一  |  姓名：洪千涵", 20, 20);
}

// === 猜拳遊戲流程狀態機 ===
function gameStateMachine(currentGesture) {
  let currentTime = millis();

  if (gameState === "START") {
    drawOverlayText("請將手伸入畫面", width / 2, height / 2, 32, color(255));
    drawOverlayText("比出 ✊ 石頭、🖐 布、✌ 剪刀", width / 2, height / 2 + 50, 20, color(200));

    // 當手出現在畫面，且比出有效拳法時，立刻鎖定並觸發 3 秒倒數
    if (currentGesture === "石頭" || currentGesture === "剪刀" || currentGesture === "布") {
      gameState = "COUNTDOWN";
      timerStart = currentTime;
    }

  } else if (gameState === "COUNTDOWN") {
    let elapsed = (currentTime - timerStart) / 1000;
    let countdown = 3 - floor(elapsed);

    if (countdown > 0) {
      // 顯示黃色大數字倒數 3、2、1
      drawOverlayText(countdown, width / 2, height / 2, 90, color(255, 215, 0));
      if (currentGesture !== "未知") {
        drawOverlayText(`鎖定中：${currentGesture}`, 30, 70, 24, color(255), LEFT); // y軸往下移防擋到學號
      }
    } else {
      // 3 秒倒數結束，定勝負
      playerGesture = currentGesture;
      
      if (playerGesture !== "未知") {
        let options = ["石頭", "剪刀", "布"];
        computerGesture = random(options);

        // 勝負規則
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

    // 停留 3 秒後自動重啟新局
    if ((currentTime - timerStart) / 1000 > 3) {
      gameState = "START";
    }
  }
}

// === 實時繪製綠色骨架線條 ===
function drawMediaPipeSkeleton(points) {
  stroke(0, 255, 0); // 科技綠線
  strokeWeight(3);
  fill(0, 255, 0);

  // 1. 畫出 21 個關鍵圓點
  for (let i = 0; i < points.length; i++) {
    let x = points[i].x * width;
    let y = points[i].y * height;
    circle(x, y, 8);
  }

  // 2. 五指關節連線
  let fingers = [
    [0, 1, 2, 3, 4],     // 大拇指
    [0, 5, 6, 7, 8],     // 食指
    [9, 10, 11, 12],     // 中指
    [13, 14, 15, 16],    // 無名指
    [0, 17, 18, 19, 20]  // 小拇指
  ];
  let palm = [5, 9, 13, 17]; // 掌心橫向骨架

  noFill();
  // 畫手指
  for (let f of fingers) {
    beginShape();
    for (let id of f) {
      let x = points[id].x * width;
      let y = points[id].y * height;
      vertex(x, y);
    }
    endShape();
  }
  // 畫掌心
  beginShape();
  for (let id of palm) {
    let x = points[id].x * width;
    let y = points[id].y * height;
    vertex(x, y);
  }
  endShape();
}

// === 完美適配 MediaPipe 點位的手勢判定演算法 ===
function judgeMediaPipeGesture(points) {
  // 指尖的 Y 軸數值小於關節的 Y 軸數值，即代表手指伸直開展
  let indexIsOpen = points[8].y < points[6].y;   // 食指
  let middleIsOpen = points[12].y < points[10].y; // 中指
  let ringIsOpen = points[16].y < points[14].y;   // 無名指
  let pinkyIsOpen = points[20].y < points[18].y;  // 小拇指

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
  rect(width - 160, 50, 145, 40, 8); // 將 Y 軸往下移至 50，防擋到最上方的學號欄
  
  textSize(16);
  textStyle(BOLD);
  textAlign(LEFT, CENTER);
  
  fill(0, 255, 0);
  text(`✔ ${winCount} 勝`, width - 145, 70);
  
  fill(255, 50, 50);
  text(`❌ ${loseCount} 敗`, width - 85, 70);
}

// === 帶有黑色文字陰影效果的 UI 繪製 ===
function drawOverlayText(txt, x, y, size, col, align = CENTER) {
  textAlign(align, CENTER);
  textSize(size);
  textStyle(BOLD);
  noStroke();
  
  fill(0, 0, 0, 220);
  text(txt, x + 2, y + 2); // 陰影
  
  fill(col);
  text(txt, x, y); // 主字
}