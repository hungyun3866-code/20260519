let videoElement;
let handsDetector;
let resultsData = null;
let modelLoaded = false;

// 遊戲狀態變數
let gameState = "START"; 
let timerStart = 0;
let playerGesture = "未知";
let computerGesture = "";
let resultText = "";
let winCount = 0;
let loseCount = 0;

function setup() {
  createCanvas(640, 480);
  
  // 1. 取得 p5 視訊鏡頭
  videoElement = createCapture(VIDEO, function(stream) {
    console.log("1. p5 鏡頭獲取成功，開始初始化 MediaPipe...");
    initMediaPipe();
  });
  videoElement.size(640, 480);
  videoElement.hide(); 
}

function initMediaPipe() {
  // 2. 建立 Hands 偵測器 (直接調用全域 window.Hands)
  try {
    handsDetector = new window.Hands({
      locateFile: (file) => {
        // 使用 cdnjs 穩定的 WASM 資源路徑
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    handsDetector.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5, // 稍微調低門檻，更容易抓到手
      minTrackingConfidence: 0.5
    });

    // 設定辨識成功後的 Callback
    handsDetector.onResults((results) => {
      resultsData = results;
      if (!modelLoaded) {
        console.log("3. MediaPipe 成功收到第一組手部數據！AI 運作正常！");
        modelLoaded = true;
      }
    });

    console.log("2. MediaPipe Hands 物件初始化完畢。");
  } catch (e) {
    console.error("MediaPipe 初始化失敗，錯誤原因:", e);
  }
}

function draw() {
  background(50); // 給個底色，沒畫面時比較好分辨

  // 1. 檢查鏡頭是否準備好
  if (videoElement && videoElement.elt.readyState === videoElement.elt.HAVE_ENOUGH_DATA) {
    // 鏡像翻轉畫視訊
    translate(width, 0);
    scale(-1, 1);
    image(videoElement, 0, 0, width, height);
    
    // 主動把當前畫面送給 AI 計算
    if (handsDetector) {
      handsDetector.send({ image: videoElement.elt });
    }
    
    // 還原座標系
    translate(width, 0);
    scale(-1, 1);
  } else {
    // 鏡頭還沒準備好時顯示提示
    drawOverlayText("等待相機啟動中...", width / 2, height / 2, 24, color(255));
    return; // 暫停往下執行
  }

  // 2. 解析手勢並畫出綠色骨架
  let currentGesture = "未知";
  if (resultsData && resultsData.multiHandLandmarks && resultsData.multiHandLandmarks.length > 0) {
    let landmarks = resultsData.multiHandLandmarks[0];
    drawKeypoints(landmarks); // 畫線
    currentGesture = judgeGesture(landmarks);
  }

  // 3. 繪製計分板
  drawScoreboard();

  // 4. 遊戲流程控制
  if (!modelLoaded) {
    drawOverlayText("AI 模型載入中，請稍候...", width / 2, height / 2, 24, color(255, 200, 0));
    return;
  }

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
        drawOverlayText(`你當前出：${currentGesture}`, 30, 50, 24, color(255), LEFT);
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

function drawKeypoints(landmarks) {
  stroke(0, 255, 0);
  strokeWeight(3); // 稍微加粗線條比較明顯
  fill(0, 255, 0);

  for (let i = 0; i < landmarks.length; i++) {
    let x = (1 - landmarks[i].x) * width; 
    let y = landmarks[i].y * height;
    ellipse(x, y, 8, 8);
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
      let x = (1 - landmarks[id].x) * width;
      let y = landmarks[id].y * height;
      vertex(x, y);
    }
    endShape();
  }
}

function judgeGesture(landmarks) {
  let indexIsOpen = landmarks[8].y < landmarks[6].y;
  let middleIsOpen = landmarks[12].y < landmarks[10].y;
  let ringIsOpen = landmarks[16].y < landmarks[14].y;
  let pinkyIsOpen = landmarks[20].y < landmarks[18].y;

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