let video;
let handPose;
let hands = [];
let isModelReady = false;

function preload() {
  // 檢查 ml5 有沒有成功載入
  if (typeof ml5 !== 'undefined') {
    handPose = ml5.handPose({ flipped: false });
  } else {
    alert("錯誤：HTML 沒有成功引入 ml5.js 庫！請檢查 index.html");
  }
}

function setup() {
  createCanvas(640, 480);
  
  // 使用最基礎的相機呼叫，並加上錯誤捕捉
  video = createCapture(VIDEO, function(stream) {
    console.log("相機成功啟動！");
    if (handPose) {
      handPose.detectStart(video, gotHands);
      isModelReady = true;
    }
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

  // 【最重要】：只要 AI 醒著而且畫面有手，跳過所有猜拳遊戲判斷，立刻強制畫出綠色骨架！
  if (hands && hands.length > 0) {
    let hand = hands[0];
    if (hand.keypoints) {
      drawSkeleton(hand.keypoints); // 讓線條無條件跟著手
    }
  }

  // 畫面中間的提示文字
  if (!isModelReady) {
    drawOverlayText("等待相機與 AI 載入中...", width / 2, height / 2, 24, color(255, 200, 0));
  } else {
    if (hands.length === 0) {
      drawOverlayText("請伸出手，測試實時線條追蹤", width / 2, height / 2, 24, color(255));
    }
  }
}

// 繪製綠色骨架（你的手怎樣，線條就必須怎樣）
function drawSkeleton(keypoints) {
  stroke(0, 255, 0); // 科技綠
  strokeWeight(3);
  fill(0, 255, 0);

  // 畫出 21 個圓點
  for (let i = 0; i < keypoints.length; i++) {
    circle(keypoints[i].x, keypoints[i].y, 8);
  }

  // 連接五根手指的線條
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

function drawOverlayText(txt, x, y, size, col) {
  textAlign(CENTER, CENTER);
  textSize(size);
  textStyle(BOLD);
  noStroke();
  fill(0, 0, 0, 200);
  text(txt, x + 2, y + 2); // 陰影
  fill(col);
  text(txt, x, y); // 主字
}