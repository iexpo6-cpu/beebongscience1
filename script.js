// ==========================================================================
// 1. 전역 상태 및 탭 전환 관리
// ==========================================================================
let activeTab = 'home';
let tempMode = 'balloon'; // 'balloon' | 'pingpong' | 'hotair' | 'petbottle'
let pressMode = 'marshmallow'; // 'marshmallow' | 'snackbag' | 'bubble'

function switchTab(tabId) {
  // 모든 탭 콘텐츠 숨기기
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 모든 네비게이션 버튼 비활성화
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // 선택한 탭 활성화
  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.add('active');
  }

  const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  if (targetBtn) {
    targetBtn.classList.add('active');
  }

  activeTab = tabId;

  // 캔버스 크기 재조정 및 시뮬레이션 재설정
  if (tabId === 'temperature') {
    initTempSimulation();
  } else if (tabId === 'pressure') {
    initPressSimulation();
  } else if (tabId === 'gases') {
    initMatchingGame();
  }
}

// 네비게이션 버튼 클릭 이벤트 연결
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabId = btn.getAttribute('data-tab');
    switchTab(tabId);
  });
});

// 온도 가상 실험 모드 변경 함수
function changeTempMode(mode) {
  tempMode = mode;
  
  // 모든 온도 카드 선택 해제
  document.querySelectorAll('#temperature .example-item').forEach(card => {
    card.classList.remove('active-experiment');
  });
  
  const badge = document.getElementById('temp-exp-badge');
  const resetBtn = document.getElementById('temp-reset-btn');
  
  if (mode === 'balloon') {
    badge.innerHTML = '🎈 기본 풍선';
    resetBtn.style.display = 'none';
  } else {
    resetBtn.style.display = 'block';
    if (mode === 'pingpong') {
      badge.innerHTML = '🏓 찌러진 탁구공';
      document.getElementById('temp-card-pingpong').classList.add('active-experiment');
    } else if (mode === 'hotair') {
      badge.innerHTML = '🎈 하늘을 나는 열기구';
      document.getElementById('temp-card-hotair').classList.add('active-experiment');
    } else if (mode === 'petbottle') {
      badge.innerHTML = '🍼 차가운 페트병';
      document.getElementById('temp-card-petbottle').classList.add('active-experiment');
    }
  }

  // 알갱이 재생성 및 캔버스 재활성화
  initTempSimulation();
}


// ==========================================================================
// 2. 온도와 부피 시뮬레이션 (샤를의 법칙 시뮬레이터)
// ==========================================================================
let tempCanvas, tempCtx;
let tempAnimationId;
let tempParticles = [];
let tempSlider;

// 입자(기체 알갱이) 클래스 정의
class Particle {
  constructor(cx, cy, radius, speedMultiplier) {
    this.cx = cx; // 풍선/도형 중심 X
    this.cy = cy; // 풍선/도형 중심 Y
    this.r = 6;   // 알갱이 반지름
    
    // 모드별 안전 영역에 초기 배치
    this.resetPosition(cx, cy, radius);

    // 속도 벡터 생성
    const speed = (1 + Math.random() * 1.5) * speedMultiplier;
    const moveAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(moveAngle) * speed;
    this.vy = Math.sin(moveAngle) * speed;
    
    this.color = `hsl(${200 + Math.random() * 40}, 100%, 75%)`; // 기체 느낌의 하늘색 톤
  }

  resetPosition(cx, cy, radius) {
    this.cx = cx;
    this.cy = cy;
    if (tempMode === 'petbottle') {
      // 페트병 내부
      this.x = cx - 35 + Math.random() * 70;
      this.y = cy - 60 + Math.random() * 120;
    } else if (tempMode === 'pingpong') {
      // 찌그러지지 않는 중심 안전 구역 (반지름 60 내)
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 60;
      this.x = cx + Math.cos(angle) * dist;
      this.y = cy + Math.sin(angle) * dist;
    } else {
      // 원형 공간 내부
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (radius - this.r - 8);
      this.x = cx + Math.cos(angle) * dist;
      this.y = cy + Math.sin(angle) * dist;
    }
  }

  update(cx, cy, balloonRadius, speedMultiplier) {
    this.cx = cx;
    this.cy = cy;
    
    // 이동
    this.x += this.vx;
    this.y += this.vy;

    const val = parseInt(tempSlider.value);

    if (tempMode === 'petbottle') {
      // 페트병 경계: 가로 110, 세로 170
      const minX = cx - 55;
      const maxX = cx + 55;
      const minY = cy - 85;
      const maxY = cy + 85;
      const dentX = Math.max(0, 18 - (val / 100) * 18); // 추울수록 페트병이 우그러짐

      // 바닥 및 천장 충돌
      if (this.y - this.r <= minY) {
        this.vy = Math.abs(this.vy);
        this.y = minY + this.r;
      } else if (this.y + this.r >= maxY) {
        this.vy = -Math.abs(this.vy);
        this.y = maxY - this.r;
      }

      // 측면 충돌 (중앙부가 우그러짐)
      let localDentX = 0;
      if (this.y >= minY + 40 && this.y <= maxY - 20) {
        const fraction = (this.y - (minY + 40)) / (maxY - 60);
        localDentX = dentX * Math.sin(Math.PI * fraction);
      }
      const wallLeft = minX + localDentX;
      const wallRight = maxX - localDentX;

      if (this.x - this.r <= wallLeft) {
        this.vx = Math.abs(this.vx);
        this.x = wallLeft + this.r;
      } else if (this.x + this.r >= wallRight) {
        this.vx = -Math.abs(this.vx);
        this.x = wallRight - this.r;
      }

      // 속도 조절
      const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      const targetSpeed = (1 + Math.random() * 1.5) * speedMultiplier;
      this.vx = (this.vx / currentSpeed) * targetSpeed;
      this.vy = (this.vy / currentSpeed) * targetSpeed;

    } else if (tempMode === 'pingpong') {
      // 탁구공 경계 (반지름 95 고정, 상단 270도 방향 찌그러짐 깊이)
      const dx = this.x - this.cx;
      const dy = this.y - this.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const dentDepth = Math.max(0, 25 - (val / 100) * 25); // 0도 ~ 80도 사이 펴짐
      let localR = 95;
      
      let angleDiff = angle - Math.PI * 1.5;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      
      // 위쪽 찌그러진 부위에 대한 반사 반경 계산
      if (Math.abs(angleDiff) < 1.0) {
        const factor = Math.cos(angleDiff * Math.PI / 2);
        localR -= dentDepth * factor;
      }

      if (dist + this.r >= localR) {
        const nx = dx / dist;
        const ny = dy / dist;
        const dot = this.vx * nx + this.vy * ny;
        this.vx = this.vx - 2 * dot * nx;
        this.vy = this.vy - 2 * dot * ny;

        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const targetSpeed = (1 + Math.random() * 1.5) * speedMultiplier;
        this.vx = (this.vx / currentSpeed) * targetSpeed;
        this.vy = (this.vy / currentSpeed) * targetSpeed;

        this.x = this.cx + nx * (localR - this.r - 2);
        this.y = this.cy + ny * (localR - this.r - 2);
      }
    } else {
      // 기본 원형 경계 (풍선, 열기구)
      const dx = this.x - this.cx;
      const dy = this.y - this.cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist + this.r >= balloonRadius) {
        const nx = dx / dist;
        const ny = dy / dist;

        const dot = this.vx * nx + this.vy * ny;
        this.vx = this.vx - 2 * dot * nx;
        this.vy = this.vy - 2 * dot * ny;

        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const targetSpeed = (1 + Math.random() * 1.5) * speedMultiplier;
        this.vx = (this.vx / currentSpeed) * targetSpeed;
        this.vy = (this.vy / currentSpeed) * targetSpeed;

        this.x = this.cx + nx * (balloonRadius - this.r - 2);
        this.y = this.cy + ny * (balloonRadius - this.r - 2);
      }
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function initTempSimulation() {
  tempCanvas = document.getElementById('temp-canvas');
  if (!tempCanvas) return;
  tempCtx = tempCanvas.getContext('2d');

  const rect = tempCanvas.parentElement.getBoundingClientRect();
  tempCanvas.width = rect.width;
  tempCanvas.height = rect.height;

  tempSlider = document.getElementById('temp-slider');
  
  createTempParticles();

  tempSlider.oninput = function() {
    updateTempUI();
  };

  updateTempUI();

  if (tempAnimationId) cancelAnimationFrame(tempAnimationId);
  animateTemp();
}

function createTempParticles() {
  tempParticles = [];
  const cx = tempCanvas.width / 2;
  const val = parseInt(tempSlider.value);

  // 모드별 Y 좌표 및 반경 설정
  let cy = tempCanvas.height / 2 - 15;
  let balloonRadius = 50 + (val / 100) * 70;

  if (tempMode === 'hotair') {
    cy = (tempCanvas.height - 80) - (val / 100) * (tempCanvas.height - 150);
    balloonRadius = 35 + (val / 100) * 35;
  } else if (tempMode === 'pingpong') {
    balloonRadius = 95;
  }

  const speedMultiplier = 0.5 + (val / 100) * 4.5;

  for (let i = 0; i < 35; i++) {
    tempParticles.push(new Particle(cx, cy, balloonRadius, speedMultiplier));
  }
}

function updateTempUI() {
  const val = parseInt(tempSlider.value);
  const tempValDisplay = document.getElementById('temp-val-display');
  const thermometerFluid = document.getElementById('thermometer-fluid');
  const tempExplanation = document.getElementById('temp-explanation');

  let tempText = "";
  let fluidColor = "";
  let expText = "";

  // 기온 텍스트 매핑
  const tempCelsius = Math.round((val / 100) * 80);
  if (val < 30) {
    tempText = `차가움 (${tempCelsius}°C)`;
    fluidColor = "var(--color-cold)";
  } else if (val >= 30 && val <= 70) {
    tempText = `보통 (${tempCelsius}°C)`;
    fluidColor = "var(--color-normal)";
  } else {
    tempText = `뜨거움 (${tempCelsius}°C)`;
    fluidColor = "var(--color-hot)";
  }

  // 모드별 교안 설명 텍스트 동적 수정
  if (tempMode === 'pingpong') {
    if (val < 30) {
      expText = "❄️ <strong>기온이 낮아요!</strong> 탁구공 안의 공기 온도가 낮아져 알갱이들이 힘없이 조용해졌어요. 기체의 부피가 줄어들면서 <strong>탁구공 한쪽이 찌그러졌습니다.</strong>";
    } else if (val >= 30 && val <= 70) {
      expText = "🏠 <strong>기온이 보통이에요!</strong> 슬슬 알갱이들이 분주해지지만 탁구공을 완전히 펴기엔 안쪽에서 미는 힘이 아직 부족해요.";
    } else {
      expText = "🔥 <strong>뜨거워졌어요!</strong> 찌그러진 탁구공을 뜨거운 물에 넣으면, 안의 공기 알갱이가 신나게 벽을 밀어 부피를 회복하고 **탁구공이 둥글게 펴져요!**";
    }
  } else if (tempMode === 'hotair') {
    if (val < 30) {
      expText = "❄️ <strong>버너 불꽃이 거의 꺼졌어요!</strong> 열기구 내부 공기 온도가 낮아 기체가 쪼그라들고 가벼워지지 못해 **열기구가 아래로 주저앉아 있습니다.**";
    } else if (val >= 30 && val <= 70) {
      expText = "🏠 <strong>불꽃을 켜는 중이에요!</strong> 버너가 켜지며 공기가 조금씩 팽창해 열기구의 형태가 서서히 둥글고 통통해지고 있어요.";
    } else {
      expText = "🔥 <strong>불꽃을 세게 올렸어요!</strong> 내부 공기가 무지 뜨거워져 부피가 팽창했고, 가벼워진 공기 덕분에 **열기구가 둥실둥실 하늘 높이 떠올랐습니다!**";
    }
  } else if (tempMode === 'petbottle') {
    if (val < 30) {
      expText = "❄️ <strong>냉장고나 추운 밖이에요!</strong> 페트병 속 공기 알갱이들의 힘이 약해져 부피가 수축하고, 외부 공기압에 밀려 **페트병이 홀쭉하게 찌그러졌어요.**";
    } else if (val >= 30 && val <= 70) {
      expText = "🏠 <strong>따뜻한 방 안이에요!</strong> 페트병 안팎의 공기 온도와 압력이 균형을 이뤄 일반적인 페트병 모양이 얌전히 유지되고 있어요.";
    } else {
      expText = "🔥 <strong>헤어드라이어 등으로 뜨겁게 데웠어요!</strong> 알갱이들이 힘차게 벽을 툭툭 때리며 부피를 팽창시켜 찌그러진 **페트병이 팽팽하게 다시 펴졌어요.**";
    }
  } else {
    // 기본 풍선 모드
    if (val < 30) {
      expText = "❄️ <strong>기온이 낮아졌어요!</strong> 기체 알갱이들의 움직임이 느려지고 서로 얌전해졌어요. 알갱이들이 풍선 벽을 미는 힘이 약해져서 <strong>풍선의 부피가 줄어들었어요(수축).</strong>";
    } else if (val >= 30 && val <= 70) {
      expText = "🏠 <strong>기온이 보통이에요!</strong> 기체 알갱이들이 적당한 속도로 자유롭게 날아다니고 있어요. 풍선 크기도 평상시 상태를 유지합니다.";
    } else {
      expText = "🔥 <strong>기온이 높아졌어요!</strong> 기체 알갱이들이 열에너지를 얻어 매우 빠르고 활기차게 움직여요! 풍선 안쪽 벽에 강하게 충돌하면서 <strong>풍선의 부피가 커졌어요(팽창).</strong>";
    }
  }

  tempValDisplay.innerHTML = tempText;
  thermometerFluid.style.height = `${10 + (val * 0.8)}%`;
  thermometerFluid.style.backgroundColor = fluidColor;
  thermometerFluid.style.boxShadow = `0 0 10px ${fluidColor}`;
  document.querySelector('.thermometer-bulb').style.backgroundColor = fluidColor;
  document.querySelector('.thermometer-bulb').style.boxShadow = `0 0 12px ${fluidColor}`;
  
  tempExplanation.innerHTML = expText;
}

function animateTemp() {
  if (activeTab !== 'temperature') return;

  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

  const cx = tempCanvas.width / 2;
  const val = parseInt(tempSlider.value);
  const speedMultiplier = 0.5 + (val / 100) * 4.5;

  let cy = tempCanvas.height / 2 - 15;
  let balloonRadius = 50 + (val / 100) * 70;

  if (tempMode === 'pingpong') {
    // 🏓 찌그러진 탁구공 그리기 모드
    const dentDepth = Math.max(0, 25 - (val / 100) * 25);
    
    tempCtx.beginPath();
    for (let angle = 0; angle < Math.PI * 2; angle += 0.03) {
      let r = 95;
      let angleDiff = angle - Math.PI * 1.5;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      
      if (Math.abs(angleDiff) < 1.0) {
        const factor = Math.cos(angleDiff * Math.PI / 2);
        r -= dentDepth * factor;
      }
      
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      if (angle === 0) tempCtx.moveTo(px, py);
      else tempCtx.lineTo(px, py);
    }
    tempCtx.closePath();

    const ballGrad = tempCtx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, 95);
    ballGrad.addColorStop(0, '#fff200');
    ballGrad.addColorStop(1, '#ff9f43');
    tempCtx.fillStyle = ballGrad;
    tempCtx.strokeStyle = '#ee5253';
    tempCtx.lineWidth = 3;
    tempCtx.fill();
    tempCtx.stroke();

    // 텍스트 라벨링
    tempCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    tempCtx.font = 'bold 15px Noto Sans KR';
    tempCtx.textAlign = 'center';
    tempCtx.shadowColor = 'rgba(0,0,0,0.3)';
    tempCtx.shadowBlur = 4;
    tempCtx.fillText("탁구공", cx, cy + 5);
    tempCtx.shadowBlur = 0;

    // 입자 업데이트 및 그리기
    tempParticles.forEach(p => {
      p.update(cx, cy, 95, speedMultiplier);
      p.draw(tempCtx);
    });

  } else if (tempMode === 'hotair') {
    // 🎈 하늘을 나는 열기구 그리기 모드
    cy = (tempCanvas.height - 80) - (val / 100) * (tempCanvas.height - 150);
    balloonRadius = 35 + (val / 100) * 35;

    // 가스 버너 불꽃 묘사
    if (val > 25) {
      tempCtx.beginPath();
      tempCtx.moveTo(cx - 10, cy + balloonRadius + 15);
      tempCtx.lineTo(cx + 10, cy + balloonRadius + 15);
      tempCtx.lineTo(cx, cy + balloonRadius + 15 - (val / 100) * 28);
      tempCtx.closePath();
      const flameGrad = tempCtx.createLinearGradient(cx, cy + balloonRadius + 15, cx, cy + balloonRadius);
      flameGrad.addColorStop(0, '#eb3b5a');
      flameGrad.addColorStop(1, '#f7b731');
      tempCtx.fillStyle = flameGrad;
      tempCtx.fill();
    }

    // 버너 본체
    tempCtx.fillStyle = '#475569';
    tempCtx.fillRect(cx - 8, cy + balloonRadius + 15, 16, 5);

    // 열기구 끈 그리기
    tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    tempCtx.lineWidth = 2;
    tempCtx.beginPath();
    tempCtx.moveTo(cx - balloonRadius * 0.4, cy + balloonRadius * 0.8);
    tempCtx.lineTo(cx - 15, cy + balloonRadius + 22);
    tempCtx.moveTo(cx + balloonRadius * 0.4, cy + balloonRadius * 0.8);
    tempCtx.lineTo(cx + 15, cy + balloonRadius + 22);
    tempCtx.stroke();

    // 열기구 바구니
    tempCtx.fillStyle = '#d2dae2';
    tempCtx.beginPath();
    tempCtx.roundRect(cx - 18, cy + balloonRadius + 22, 36, 22, 4);
    tempCtx.fill();

    // 열기구 풍선 외형
    tempCtx.beginPath();
    tempCtx.arc(cx, cy, balloonRadius, Math.PI * 0.15, Math.PI * 0.85, true);
    tempCtx.lineTo(cx - balloonRadius * 0.4, cy + balloonRadius * 0.95);
    tempCtx.lineTo(cx + balloonRadius * 0.4, cy + balloonRadius * 0.95);
    tempCtx.closePath();

    const airGrad = tempCtx.createRadialGradient(cx - balloonRadius/4, cy - balloonRadius/4, 2, cx, cy, balloonRadius);
    airGrad.addColorStop(0, '#fd79a8');
    airGrad.addColorStop(1, '#e84393');
    tempCtx.fillStyle = airGrad;
    tempCtx.strokeStyle = '#ffffff';
    tempCtx.lineWidth = 2.5;
    tempCtx.fill();
    tempCtx.stroke();

    // 입자 업데이트 및 그리기
    tempParticles.forEach(p => {
      p.update(cx, cy, balloonRadius, speedMultiplier);
      p.draw(tempCtx);
    });

  } else if (tempMode === 'petbottle') {
    // 🍼 페트병 그리기 모드
    const minX = cx - 55;
    const maxX = cx + 55;
    const minY = cy - 85;
    const maxY = cy + 85;
    const dentX = Math.max(0, 18 - (val / 100) * 18);

    tempCtx.beginPath();
    // 병 뚜껑 밑단부터 시계방향
    tempCtx.moveTo(cx - 15, minY);
    tempCtx.lineTo(cx + 15, minY);
    tempCtx.lineTo(cx + 15, minY + 15);
    tempCtx.lineTo(maxX, minY + 35);
    // 우그러지는 몸체부
    for (let y = minY + 35; y <= maxY - 20; y += 5) {
      const fraction = (y - (minY + 35)) / (maxY - 55);
      const localDent = dentX * Math.sin(Math.PI * fraction);
      tempCtx.lineTo(maxX - localDent, y);
    }
    tempCtx.lineTo(maxX, maxY);
    tempCtx.lineTo(minX, maxY);
    // 좌측 우그러지는 몸체부
    for (let y = maxY - 20; y >= minY + 35; y -= 5) {
      const fraction = (y - (minY + 35)) / (maxY - 55);
      const localDent = dentX * Math.sin(Math.PI * fraction);
      tempCtx.lineTo(minX + localDent, y);
    }
    tempCtx.lineTo(cx - 15, minY + 15);
    tempCtx.closePath();

    const petGrad = tempCtx.createLinearGradient(minX, cy, maxX, cy);
    petGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
    petGrad.addColorStop(0.3, 'rgba(150, 220, 255, 0.25)');
    petGrad.addColorStop(1, 'rgba(150, 220, 255, 0.45)');
    tempCtx.fillStyle = petGrad;
    tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    tempCtx.lineWidth = 3;
    tempCtx.fill();
    tempCtx.stroke();

    // 파란색 뚜껑
    tempCtx.fillStyle = '#0984e3';
    tempCtx.fillRect(cx - 17, minY - 10, 34, 10);

    // 입자 업데이트 및 그리기
    tempParticles.forEach(p => {
      p.update(cx, cy, 90, speedMultiplier);
      p.draw(tempCtx);
    });

  } else {
    // 🎈 기본 풍선 모드 그리기
    // 1. 풍선 끈 그리기
    tempCtx.beginPath();
    tempCtx.moveTo(cx, cy + balloonRadius);
    tempCtx.quadraticCurveTo(cx - 10, cy + balloonRadius + 20, cx, cy + balloonRadius + 40);
    tempCtx.lineWidth = 2;
    tempCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    tempCtx.stroke();

    // 2. 풍선 주둥이 삼각 묶음 그리기
    tempCtx.beginPath();
    tempCtx.moveTo(cx - 8, cy + balloonRadius);
    tempCtx.lineTo(cx + 8, cy + balloonRadius);
    tempCtx.lineTo(cx, cy + balloonRadius + 8);
    tempCtx.closePath();
    tempCtx.fillStyle = `hsla(${340 - (val * 1.5)}, 85%, 65%, 0.8)`;
    tempCtx.fill();

    // 3. 풍선 그리기
    const balloonGrad = tempCtx.createRadialGradient(cx - balloonRadius/3, cy - balloonRadius/3, 5, cx, cy, balloonRadius);
    const hue = 220 - (val * 2);
    balloonGrad.addColorStop(0, `hsla(${hue}, 95%, 85%, 0.55)`);
    balloonGrad.addColorStop(1, `hsla(${hue}, 85%, 50%, 0.35)`);

    tempCtx.beginPath();
    tempCtx.arc(cx, cy, balloonRadius, 0, Math.PI * 2);
    tempCtx.fillStyle = balloonGrad;
    tempCtx.strokeStyle = `hsla(${hue}, 85%, 60%, 0.8)`;
    tempCtx.lineWidth = 3;
    tempCtx.fill();
    tempCtx.stroke();

    // 4. 입자 업데이트 (cx, cy: 풍선 중심 좌표 전달 필수)
    tempParticles.forEach(p => {
      p.update(cx, cy, balloonRadius, speedMultiplier);
      p.draw(tempCtx);
    });

    // 5. 풍선 하이라이트
    tempCtx.beginPath();
    tempCtx.ellipse(cx - balloonRadius*0.4, cy - balloonRadius*0.4, balloonRadius*0.2, balloonRadius*0.1, Math.PI/4, 0, Math.PI*2);
    tempCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    tempCtx.fill();
  }

  tempAnimationId = requestAnimationFrame(animateTemp);
}

// 압력 가상 실험 모드 변경 함수
function changePressMode(mode) {
  pressMode = mode;
  
  // 모든 압력 카드 선택 해제
  document.querySelectorAll('#pressure .example-item').forEach(card => {
    card.classList.remove('active-experiment');
  });

  const badge = document.getElementById('press-exp-badge');
  const resetBtn = document.getElementById('press-reset-btn');
  const mallowVisual = document.getElementById('marshmallow-visual');

  if (mode === 'marshmallow') {
    badge.innerHTML = '🍬 마시멜로';
    resetBtn.style.display = 'none';
    if (mallowVisual) mallowVisual.style.display = 'flex';
    document.getElementById('press-card-marshmallow').classList.add('active-experiment');
  } else {
    resetBtn.style.display = 'block';
    if (mallowVisual) mallowVisual.style.display = 'none'; // 주사기 속 마시멜로 HTML 요소 숨김
    
    if (mode === 'snackbag') {
      badge.innerHTML = '🍿 높은 산 과자봉지';
      document.getElementById('press-card-snackbag').classList.add('active-experiment');
    } else if (mode === 'bubble') {
      badge.innerHTML = '🫧 물속 공기방울';
      document.getElementById('press-card-bubble').classList.add('active-experiment');
    }
  }

  // 알갱이/물방울 재생성 및 캔버스 재설정
  initPressSimulation();
}


// ==========================================================================
// 3. 압력과 부피 시뮬레이션 (보일의 법칙 시뮬레이터)
// ==========================================================================
let pressCanvas, pressCtx;
let pressAnimationId;
let pressParticles = [];
let pressSlider;
let risingBubbles = [];

// 물속 공기방울 모드 전용 클래스
class RisingBubble {
  constructor(canvasWidth, canvasHeight, index) {
    this.canvasW = canvasWidth;
    this.canvasH = canvasHeight;
    this.index = index;
    this.reset();
    // 생성 주기를 다르게 하기 위해 Y축 오프셋 설정
    this.y = canvasHeight + (index * (canvasHeight / 2.5)) + Math.random() * 50;
  }

  reset() {
    this.x = 60 + Math.random() * (this.canvasW - 120);
    this.y = this.canvasH + 30;
    this.vy = -(1.2 + Math.random() * 1.5); // 상승 속도
    this.r = 10;
  }

  update(pressureVal) {
    this.y += this.vy;

    // 수면으로 올라갈수록 깊이(수압)가 얕아짐
    const depthFraction = Math.max(0, this.y / this.canvasH); // 1(바닥) -> 0(수면)
    
    // 슬라이더 값이 외부 대기압/수압 환경임
    // 총 압력 = 설정된 압력 + 수심으로 인한 압력
    const totalPressure = 0.4 + (pressureVal / 100) * 3.5 + depthFraction * 2.5;
    
    // 부피 ∝ 1 / 압력 (공기방울 반지름은 압력의 반비례 관계)
    this.r = Math.max(6, 65 / totalPressure);

    // 수면 위로 완전히 올라가면 리셋 (터짐)
    if (this.y < -this.r) {
      this.reset();
    }
  }

  draw(ctx) {
    // 1. 공기방울 그리기
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    
    const grad = ctx.createRadialGradient(
      this.x - this.r / 3,
      this.y - this.r / 3,
      this.r * 0.1,
      this.x,
      this.y,
      this.r
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
    grad.addColorStop(0.4, 'rgba(129, 236, 236, 0.2)');
    grad.addColorStop(1, 'rgba(9, 132, 227, 0.4)');
    
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // 2. 공기방울 표면 입체적 광택(하이라이트)
    ctx.beginPath();
    ctx.ellipse(
      this.x - this.r * 0.4,
      this.y - this.r * 0.4,
      this.r * 0.22,
      this.r * 0.11,
      Math.PI / 4,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();

    // 3. 공기방울 속에서 활발히 움직이는 5개의 기체 입자(공기방울 팽창력 시각화)
    ctx.fillStyle = '#6c5ce7'; // 보라색 입자
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2 / 5) + (Date.now() / 350 + this.index * 12);
      const dist = (this.r * 0.55) * (0.85 + 0.15 * Math.sin(Date.now() / 150 + i));
      const px = this.x + Math.cos(angle) * dist;
      const py = this.y + Math.sin(angle) * dist;

      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

class PressParticle {
  constructor(minX, maxX, minY, maxY) {
    this.r = 6;
    this.x = minX + this.r + Math.random() * (maxX - minX - this.r * 2);
    this.y = minY + this.r + Math.random() * (maxY - minY - this.r * 2);

    const speed = 2.5;
    const moveAngle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(moveAngle) * speed;
    this.vy = Math.sin(moveAngle) * speed;

    this.color = '#a55eea';
  }

  update(minX, maxX, minY, maxY) {
    this.x += this.vx;
    this.y += this.vy;

    if (this.x - this.r <= minX) {
      this.vx = Math.abs(this.vx);
      this.x = minX + this.r;
    } else if (this.x + this.r >= maxX) {
      this.vx = -Math.abs(this.vx);
      this.x = maxX - this.r;
    }

    if (this.y - this.r <= minY) {
      this.vy = Math.abs(this.vy);
      this.y = minY + this.r;
    } else if (this.y + this.r >= maxY) {
      this.vy = -Math.abs(this.vy);
      this.y = maxY - this.r;
    }
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = this.color;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function initPressSimulation() {
  pressCanvas = document.getElementById('press-canvas');
  if (!pressCanvas) return;
  pressCtx = pressCanvas.getContext('2d');

  const rect = pressCanvas.parentElement.getBoundingClientRect();
  pressCanvas.width = rect.width;
  pressCanvas.height = rect.height;

  pressSlider = document.getElementById('press-slider');

  // 모드별 데이터 초기화
  if (pressMode === 'bubble') {
    risingBubbles = [
      new RisingBubble(pressCanvas.width, pressCanvas.height, 0),
      new RisingBubble(pressCanvas.width, pressCanvas.height, 1),
      new RisingBubble(pressCanvas.width, pressCanvas.height, 2)
    ];
  } else {
    createPressParticles();
  }

  pressSlider.oninput = function() {
    updatePressUI();
  };

  updatePressUI();

  if (pressAnimationId) cancelAnimationFrame(pressAnimationId);
  animatePress();
}

function createPressParticles() {
  pressParticles = [];
  const minX = 40;
  const minY = 40;
  const maxY = pressCanvas.height - 40;
  
  const val = parseInt(pressSlider.value);
  const maxX = pressCanvas.width - 120 - (val / 100) * (pressCanvas.width - 240);

  for (let i = 0; i < 40; i++) {
    pressParticles.push(new PressParticle(minX, maxX, minY, maxY));
  }
}

function updatePressUI() {
  const val = parseInt(pressSlider.value);
  const pressValDisplay = document.getElementById('press-val-display');
  const pressExplanation = document.getElementById('press-explanation');
  const mallow = document.getElementById('marshmallow-visual');

  let pressText = "";
  let expText = "";
  
  // 마시멜로 모드에서만 마시멜로 스케일 적용
  if (pressMode === 'marshmallow' && mallow) {
    const scale = 1.4 - (val / 100) * 0.9;
    mallow.style.transform = `scale(${scale})`;
  }

  // 모드별 텍스트 매핑
  if (pressMode === 'snackbag') {
    if (val < 30) {
      const pressAtm = (0.2 + (val / 30) * 0.5).toFixed(1);
      pressText = `낮음 (${pressAtm}기압)`;
      expText = "🍃 <strong>누르는 힘(압력)이 낮아요!</strong> 높은 산 꼭대기에 올라갔을 때의 공기압과 같아요. 봉지 겉을 누르는 공기의 힘이 약해져 **과자봉지가 터질 듯 빵빵하게 부풀어 올랐어요!**";
    } else if (val >= 30 && val <= 70) {
      const pressAtm = (0.7 + ((val - 30) / 40) * 0.8).toFixed(1);
      pressText = `보통 (${pressAtm}기압)`;
      expText = "✊ <strong>평범한 평지 기압 상태예요!</strong> 과자봉지는 본래 제작된 크기 그대로 편안히 형태를 이루고 있습니다.";
    } else {
      const pressAtm = (1.5 + ((val - 70) / 30) * 3.5).toFixed(1);
      pressText = `높음 (${pressAtm}기압)`;
      expText = "💥 <strong>누르는 힘(압력)이 아주 세요!</strong> 봉지 내부보다 밖에서 엄청나게 세게 누르는 환경으로, 기체 부피가 압축되어 **과자봉지가 납작하게 찌그러졌습니다.**";
    }
  } else if (pressMode === 'bubble') {
    if (val < 30) {
      const pressAtm = (0.2 + (val / 30) * 0.5).toFixed(1);
      pressText = `낮음 (${pressAtm}기압)`;
      expText = "🍃 <strong>물밑 압력(수압)이 아주 낮아요!</strong> 물 표면에 가까워질수록 수압이 약해집니다. 누르는 힘이 약해지니 **공기방울이 위로 올라갈수록 엄청 크게 부풀어 올라요.**";
    } else if (val >= 30 && val <= 70) {
      const pressAtm = (0.7 + ((val - 30) / 40) * 0.8).toFixed(1);
      pressText = `보통 (${pressAtm}기압)`;
      expText = "✊ <strong>보통 물 깊이의 수압이에요!</strong> 공기방울이 평범한 속도로 둥글게 동동 뜨며 수면을 향해 상승합니다.";
    } else {
      const pressAtm = (1.5 + ((val - 70) / 30) * 3.5).toFixed(1);
      pressText = `높음 (${pressAtm}기압)`;
      expText = "💥 <strong>물밑 수압이 매우 강력해요!</strong> 수심이 아주 깊은 바다속 깊은 곳으로, 사방에서 엄청난 물의 무게가 짓눌러 **공기방울들이 부풀지 못하고 좁고 작게 뭉쳐있어요.**";
    }
  } else {
    // 마시멜로 모드
    if (val < 30) {
      const pressAtm = (0.2 + (val / 30) * 0.5).toFixed(1);
      pressText = `낮음 (${pressAtm}기압)`;
      expText = "🍃 <strong>누르는 힘(압력)이 매우 낮아요!</strong> 피스톤을 당겨 기체가 자유롭게 퍼질 수 있게 해주었어요. 갇혀있던 마시멜로 속 공기 방울들도 팽창하여 <strong>마시멜로 크기가 빵빵하게 커졌어요!</strong>";
    } else if (val >= 30 && val <= 70) {
      const pressAtm = (0.7 + ((val - 30) / 40) * 0.8).toFixed(1);
      pressText = `보통 (${pressAtm}기압)`;
      expText = "✊ <strong>평범한 대기압 상태예요!</strong> 마시멜로도 본래 크기 그대로 편안히 유지되고 있네요. 알갱이들이 사방에 골고루 분포합니다.";
    } else {
      const pressAtm = (1.5 + ((val - 70) / 30) * 3.5).toFixed(1);
      pressText = `높음 (${pressAtm}기압)`;
      expText = "💥 <strong>누르는 힘(압력)이 아주 세요!</strong> 좁은 공간에 기체 알갱이들이 빽빽하게 갇혀 사방의 벽을 엄청나게 때리고 있어요. 압력이 가해져 <strong>마시멜로가 쪼그라들었답니다.</strong>";
    }
  }

  pressValDisplay.innerHTML = pressText;
  pressExplanation.innerHTML = expText;
}

function animatePress() {
  if (activeTab !== 'pressure') return;

  pressCtx.clearRect(0, 0, pressCanvas.width, pressCanvas.height);

  const val = parseInt(pressSlider.value);

  if (pressMode === 'bubble') {
    // 🫧 물속 공기방울 모드 애니메이션
    // 수중 느낌이 나는 예쁜 푸른색 그라데이션 뒷배경 그리기
    const waterGrad = pressCtx.createLinearGradient(0, 0, 0, pressCanvas.height);
    waterGrad.addColorStop(0, '#74b9ff');
    waterGrad.addColorStop(0.5, '#0984e3');
    waterGrad.addColorStop(1, '#0b162c');
    
    pressCtx.fillStyle = waterGrad;
    pressCtx.fillRect(0, 0, pressCanvas.width, pressCanvas.height);

    // 물결 장식 선 그리기
    pressCtx.strokeStyle = 'rgba(255,255,255,0.08)';
    pressCtx.lineWidth = 4;
    pressCtx.beginPath();
    for (let i = 0; i < pressCanvas.width; i += 30) {
      const yOffset = 10 * Math.sin((i / 50) + (Date.now() / 600));
      if (i === 0) pressCtx.moveTo(i, 80 + yOffset);
      else pressCtx.lineTo(i, 80 + yOffset);
    }
    pressCtx.stroke();

    // 3개의 공기방울 업데이트 및 드로잉
    risingBubbles.forEach(bubble => {
      bubble.update(val);
      bubble.draw(pressCtx);
    });

  } else {
    // ⚙️ 주사기 구조물 애니메이션 (마시멜로, 과자봉지)
    const minX = 40;
    const minY = 40;
    const maxY = pressCanvas.height - 40;
    const pistonX = pressCanvas.width - 100 - (val / 100) * (pressCanvas.width - 240);

    // 1. 주사기 외관 유리 틀 그리기
    pressCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    pressCtx.lineWidth = 6;
    pressCtx.lineCap = 'round';
    
    pressCtx.beginPath();
    pressCtx.moveTo(40, pressCanvas.height / 2 - 15);
    pressCtx.lineTo(20, pressCanvas.height / 2 - 15);
    pressCtx.lineTo(20, pressCanvas.height / 2 + 15);
    pressCtx.lineTo(40, pressCanvas.height / 2 + 15);
    pressCtx.lineTo(40, maxY);
    pressCtx.lineTo(pressCanvas.width - 80, maxY);
    pressCtx.stroke();

    pressCtx.beginPath();
    pressCtx.moveTo(40, pressCanvas.height / 2 - 15);
    pressCtx.lineTo(40, minY);
    pressCtx.lineTo(pressCanvas.width - 80, minY);
    pressCtx.stroke();

    // 2. 주사기 눈금
    pressCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    pressCtx.lineWidth = 2;
    for (let x = 70; x < pressCanvas.width - 100; x += 30) {
      pressCtx.beginPath();
      pressCtx.moveTo(x, minY);
      pressCtx.lineTo(x, minY + 15);
      pressCtx.moveTo(x, maxY);
      pressCtx.lineTo(x, maxY - 15);
      pressCtx.stroke();
    }

    // 3. 실험 물질 그리기
    if (pressMode === 'snackbag') {
      // 🍿 과자봉지 드로잉
      const bagCenterX = (minX + pistonX) / 2;
      const bagCenterY = pressCanvas.height / 2;
      const scale = 1.6 - (val / 100) * 1.1; // 1.6 ~ 0.5 배율 수축
      const bagW = 60 * scale;
      const bagH = 75 * scale;
      
      // 빨간색 봉지 본체
      pressCtx.fillStyle = '#ff4d4d';
      pressCtx.beginPath();
      
      // 톱니 모양 윗면 테두리
      pressCtx.moveTo(bagCenterX - bagW/2, bagCenterY - bagH/2);
      for (let x = bagCenterX - bagW/2; x <= bagCenterX + bagW/2; x += 5) {
        const yOffset = (Math.round(x) % 10 === 0) ? 5 : 0;
        pressCtx.lineTo(x, bagCenterY - bagH/2 + yOffset);
      }
      // 우측면
      pressCtx.lineTo(bagCenterX + bagW/2, bagCenterY + bagH/2);
      // 톱니 모양 아랫면 테두리
      for (let x = bagCenterX + bagW/2; x >= bagCenterX - bagW/2; x -= 5) {
        const yOffset = (Math.round(x) % 10 === 0) ? -5 : 0;
        pressCtx.lineTo(x, bagCenterY + bagH/2 + yOffset);
      }
      pressCtx.closePath();
      pressCtx.fill();
      
      // 중앙 노란 줄무늬 데코
      pressCtx.fillStyle = '#ffea00';
      pressCtx.fillRect(bagCenterX - bagW/2, bagCenterY - bagH/6, bagW, bagH/3);
      
      // 과자 텍스트
      pressCtx.fillStyle = '#1e272e';
      pressCtx.font = `bold ${Math.round(11 * scale)}px Noto Sans KR`;
      pressCtx.textAlign = 'center';
      pressCtx.fillText("과자", bagCenterX, bagCenterY + Math.round(4 * scale));

    } else if (pressMode === 'marshmallow') {
      // 🍬 마시멜로 드로잉
      const mallowCenterX = (minX + pistonX) / 2;
      const mallowCenterY = pressCanvas.height / 2;
      const scale = 1.4 - (val / 100) * 0.9;
      const mallowW = 55 * scale;
      const mallowH = 45 * scale;

      pressCtx.beginPath();
      pressCtx.roundRect(mallowCenterX - mallowW/2, mallowCenterY - mallowH/2, mallowW, mallowH, 10 * scale);
      
      const mallowGrad = pressCtx.createLinearGradient(mallowCenterX - mallowW/2, mallowCenterY, mallowCenterX + mallowW/2, mallowCenterY);
      mallowGrad.addColorStop(0, '#ffffff');
      mallowGrad.addColorStop(0.7, '#fff5f5');
      mallowGrad.addColorStop(1, '#ffebed');
      
      pressCtx.fillStyle = mallowGrad;
      pressCtx.strokeStyle = 'rgba(165, 94, 234, 0.25)';
      pressCtx.lineWidth = 2;
      pressCtx.fill();
      pressCtx.stroke();

      pressCtx.beginPath();
      pressCtx.arc(mallowCenterX - mallowW/4, mallowCenterY + mallowH/10, 3 * scale, 0, Math.PI * 2);
      pressCtx.arc(mallowCenterX + mallowW/4 - 2 * scale, mallowCenterY + mallowH/10, 3 * scale, 0, Math.PI * 2);
      pressCtx.fillStyle = 'rgba(255, 107, 107, 0.45)';
      pressCtx.fill();
    }

    // 4. 입자 물리 및 드로잉
    pressParticles.forEach(p => {
      if (p.x + p.r >= pistonX) {
        p.x = pistonX - p.r - 2;
        p.vx = -Math.abs(p.vx);
      }
      p.update(minX, pistonX, minY, maxY);
      p.draw(pressCtx);
    });

    // 5. 피스톤 손잡이대 및 고무판 그리기
    // 피스톤 고무
    pressCtx.fillStyle = '#334155';
    pressCtx.beginPath();
    pressCtx.roundRect(pistonX, minY + 3, 16, (maxY - minY) - 6, 4);
    pressCtx.fill();

    // 피스톤 대
    pressCtx.strokeStyle = '#94a3b8';
    pressCtx.lineWidth = 10;
    pressCtx.beginPath();
    pressCtx.moveTo(pistonX + 10, pressCanvas.height / 2);
    pressCtx.lineTo(pressCanvas.width - 20, pressCanvas.height / 2);
    pressCtx.stroke();

    // 손잡이 머리
    pressCtx.fillStyle = '#334155';
    pressCtx.beginPath();
    pressCtx.roundRect(pressCanvas.width - 25, pressCanvas.height / 2 - 35, 12, 70, 4);
    pressCtx.fill();
  }

  pressAnimationId = requestAnimationFrame(animatePress);
}


// ==========================================================================
// 4. 일상생활 속 기체 매칭 게임
// ==========================================================================
const gasData = [
  { id: 'oxygen', name: '산소 (O₂)', icon: 'fa-lungs', usageId: 'oxygen-usage', usageText: '사람과 동물이 숨을 쉴 때(호흡) 꼭 필요하고, 물건이 타는 것을 도와줘요.' },
  { id: 'nitrogen', name: '질소 (N₂)', icon: 'fa-box-open', usageId: 'nitrogen-usage', usageText: '다른 물질과 거의 반응하지 않아, 과자가 부서지지 않게 과자봉지에 채워 넣어요.' },
  { id: 'co2', name: '이산화 탄소 (CO₂)', icon: 'fa-glass-water', usageId: 'co2-usage', usageText: '톡 쏘는 탄산음료에 넣거나, 불을 끄는 소화기, 아주 차가운 드라이아이스에 쓰여요.' },
  { id: 'helium', name: '헬륨 (He)', icon: 'fa-balloon', usageId: 'helium-usage', usageText: '공기보다 가벼워서 풍선을 하늘에 띄우고, 마시면 재밌는 목소리로 변해요.' },
  { id: 'neon', name: '네온 (Ne)', icon: 'fa-lightbulb', usageId: 'neon-usage', usageText: '전기를 통하면 붉은색의 밝고 예쁜 빛을 내어, 밤거리의 네온사인 간판에 쓰여요.' }
];

let selectedGasId = null;
let selectedUsageId = null;
let matchedPairs = 0;

function initMatchingGame() {
  selectedGasId = null;
  selectedUsageId = null;
  matchedPairs = 0;
  document.getElementById('match-score').innerText = '0';

  const gasCardsContainer = document.getElementById('gas-cards-container');
  const usageCardsContainer = document.getElementById('usage-cards-container');

  // HTML 내용 초기화
  gasCardsContainer.innerHTML = '';
  usageCardsContainer.innerHTML = '';

  // 기체 리스트 셔플 (좌측)
  const shuffledGases = [...gasData].sort(() => Math.random() - 0.5);
  // 쓰임새 리스트 셔플 (우측)
  const shuffledUsages = [...gasData].sort(() => Math.random() - 0.5);

  // 기체 카드 동적 추가
  shuffledGases.forEach(gas => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.id = gas.id;
    card.dataset.type = 'gas';
    
    // 특수 아이콘 예외 처리 (풍선 아이콘은 fa-solid가 아닐 수도 있으니)
    let iconHTML = `<i class="fa-solid ${gas.icon}"></i>`;
    if (gas.id === 'helium') {
      iconHTML = `<i class="fa-solid fa-parachute-box"></i>`; // 🎈 헬륨 느낌의 낙하산/비행선 아이콘 대체
    }
    
    card.innerHTML = `
      <div class="game-card-icon">${iconHTML}</div>
      <div class="gas-card-name">${gas.name}</div>
    `;
    card.addEventListener('click', handleGameCardClick);
    gasCardsContainer.appendChild(card);
  });

  // 쓰임새 카드 동적 추가
  shuffledUsages.forEach(usage => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.id = usage.usageId;
    card.dataset.type = 'usage';
    card.innerHTML = `
      <div class="game-card-icon"><i class="fa-solid fa-circle-question"></i></div>
      <div class="usage-card-text">${usage.usageText}</div>
    `;
    card.addEventListener('click', handleGameCardClick);
    usageCardsContainer.appendChild(card);
  });
}

function handleGameCardClick(e) {
  const card = e.currentTarget;

  // 이미 맞춘 카드는 반응하지 않음
  if (card.classList.contains('matched')) return;

  const cardType = card.dataset.type;
  const cardId = card.dataset.id;

  if (cardType === 'gas') {
    // 기체 카드 선택 처리
    document.querySelectorAll('[data-type="gas"]').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedGasId = cardId;
  } else {
    // 쓰임새 카드 선택 처리
    document.querySelectorAll('[data-type="usage"]').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedUsageId = cardId;
  }

  // 매칭 여부 체크
  checkMatch();
}

function checkMatch() {
  if (selectedGasId && selectedUsageId) {
    // 매칭 짝 검증: gasId === usageId에서 'usage' 문자열 뺀 것
    const expectedUsageId = `${selectedGasId}-usage`;
    const gasCard = document.querySelector(`[data-type="gas"][data-id="${selectedGasId}"]`);
    const usageCard = document.querySelector(`[data-type="usage"][data-id="${selectedUsageId}"]`);

    if (expectedUsageId === selectedUsageId) {
      // 정답!
      gasCard.classList.remove('selected');
      usageCard.classList.remove('selected');
      
      gasCard.classList.add('matched');
      usageCard.classList.add('matched');

      // 성공 사운드 효과를 시각 효과로 구현 (매칭완료 표시)
      usageCard.querySelector('.game-card-icon').innerHTML = '<i class="fa-solid fa-check"></i>';
      
      matchedPairs++;
      document.getElementById('match-score').innerText = matchedPairs;

      // 초기화
      selectedGasId = null;
      selectedUsageId = null;

      // 게임 전체 완료 체크
      if (matchedPairs === 5) {
        setTimeout(() => {
          alert('🏆 축하합니다! 모든 기체의 쓰임새 짝을 완벽하게 맞췄어요!');
        }, 300);
      }
    } else {
      // 오답! 흔들기 효과
      gasCard.classList.add('wrong');
      usageCard.classList.add('wrong');

      setTimeout(() => {
        gasCard.classList.remove('wrong', 'selected');
        usageCard.classList.remove('wrong', 'selected');
      }, 500);

      // 선택 리셋
      selectedGasId = null;
      selectedUsageId = null;
    }
  }
}

document.getElementById('reset-game-btn').addEventListener('click', initMatchingGame);


// ==========================================================================
// 5. 퀴즈 놀이터 로직
// ==========================================================================
const quizQuestions = [
  {
    q: "찌그러진 탁구공을 뜨거운 물에 넣었더니 원래대로 동글게 펴졌습니다. 그 과학적 이유는 무엇일까요?",
    options: [
      "탁구공이 뜨거운 물을 빨아들여 늘어났기 때문에",
      "온도가 높아져 탁구공 안 기체의 부피가 늘어났기 때문에",
      "뜨거운 물의 수압이 사방에서 탁구공을 밀어냈기 때문에",
      "뜨거운 온도 때문에 탁구공의 고무가 부드럽게 펴져서"
    ],
    answer: 1,
    explanation: "🌡️ <strong>정답이에요!</strong> 온도가 높아지면 기체 알갱이들의 움직임이 빨라지고 활발해져 풍선이나 공 안쪽 벽을 더 밀어내므로 <strong>부피가 늘어납니다.</strong> 이 힘으로 탁구공이 다시 펴지는 것입니다."
  },
  {
    q: "높은 산에 과자봉지를 들고 올라가면 과자봉지가 빵빵하게 부풉니다. 원리가 무엇일까요?",
    options: [
      "높은 산은 해가 가까워서 기체의 온도가 매우 높아지기 때문에",
      "높은 산은 공기가 적어져서 외부에서 누르는 힘(기압)이 낮아지기 때문에",
      "산 정상에서는 공기 속 산소 기체 분자가 봉지 속으로 침투하기 때문에",
      "높은 고도에서는 지구의 끌어당기는 힘(중력)이 없어지기 때문에"
    ],
    answer: 1,
    explanation: "⛰️ <strong>정답이에요!</strong> 높은 산은 아래보다 공기가 적어 주변에서 밀어내는 공기의 압력(기압)이 매우 낮습니다. 주변 압력이 낮아지면 상대적으로 <strong>과자봉지 내부 공기 부피가 팽창해</strong> 빵빵하게 변해요."
  },
  {
    q: "주사기 입구를 꾹 막고 피스톤을 세게 눌렀을(압력을 강하게 가했을) 때 나타나는 변화는?",
    options: [
      "주사기 안 기체 알갱이들의 크기가 작아진다.",
      "기체의 부피가 줄어들고 알갱이 간의 사이가 좁아진다.",
      "주사기 속에 새로운 기체 알갱이가 생겨 개수가 많아진다.",
      "기체 알갱이들이 완전히 멈추어 고체로 변한다."
    ],
    answer: 1,
    explanation: "⚖️ <strong>정답이에요!</strong> 기체에 압력을 가해 꾹 누르면 입자의 크기나 개수는 그대로지만, <strong>알갱이들 사이의 빈 공간이 압축되면서 전체 부피가 줄어듭니다.</strong>"
  },
  {
    q: "공기 중에 가장 많이 들어있고, 다른 물질과 쉽게 반응하지 않아 과자봉지 속에 넣는 기체는?",
    options: [
      "산소",
      "이산화 탄소",
      "질소",
      "헬륨"
    ],
    answer: 2,
    explanation: "🍿 <strong>정답이에요!</strong> 공기의 78% 정도를 차지하는 <strong>질소</strong>는 반응성이 거의 없어 다른 물질과 잘 섞이지 않습니다. 그래서 음식이 상하거나 과자가 쉽게 부서지지 않게 봉지에 채워 넣어요."
  },
  {
    q: "스스로 타지 않고 불을 꺼주는 소화기에 많이 쓰이고, 톡 쏘는 탄산음료에 주입되는 기체는?",
    options: [
      "이산화 탄소",
      "질소",
      "네온",
      "산소"
    ],
    answer: 0,
    explanation: "🥤 <strong>정답이에요!</strong> 불에 절대 타지 않고 산소를 차단해주는 <strong>이산화 탄소</strong>는 소화기에 아주 필수적입니다. 또한, 액체에 압력을 가해 녹여 상큼한 탄산음료를 만들기도 합니다."
  }
];

let currentQuestionIndex = 0;
let quizScore = 0;
let answered = false;

function startQuiz() {
  document.getElementById('quiz-start-screen').classList.remove('active');
  document.getElementById('quiz-play-screen').classList.add('active');
  document.getElementById('quiz-result-screen').classList.remove('active');
  
  currentQuestionIndex = 0;
  quizScore = 0;
  
  showQuestion();
}

function showQuestion() {
  answered = false;
  const qData = quizQuestions[currentQuestionIndex];
  
  // 상태 바 및 정보 업데이트
  document.getElementById('current-question-num').innerText = currentQuestionIndex + 1;
  document.getElementById('quiz-score-display').innerText = quizScore * 20;
  const progressPercent = ((currentQuestionIndex) / quizQuestions.length) * 100;
  document.getElementById('quiz-progress-fill').style.width = `${progressPercent || 5}%`;

  // 피드백 박스 숨김
  document.getElementById('quiz-feedback').classList.remove('active', 'correct-feedback', 'incorrect-feedback');

  // 질문 텍스트
  document.getElementById('quiz-question-text').innerHTML = `Q${currentQuestionIndex + 1}. ${qData.q}`;

  // 보기 버튼 렌더링
  const optionsContainer = document.getElementById('quiz-options-container');
  optionsContainer.innerHTML = '';

  qData.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.innerHTML = `
      <span>${idx + 1}. ${opt}</span>
      <i class="fa-regular fa-circle-question opt-icon"></i>
    `;
    btn.addEventListener('click', () => selectOption(idx));
    optionsContainer.appendChild(btn);
  });
}

function selectOption(selectedIdx) {
  if (answered) return;
  answered = true;

  const qData = quizQuestions[currentQuestionIndex];
  const optionsContainer = document.getElementById('quiz-options-container');
  const optionButtons = optionsContainer.querySelectorAll('.quiz-option');
  const feedbackBox = document.getElementById('quiz-feedback');
  const feedbackText = document.getElementById('quiz-feedback-text');

  // 정답 및 오답 표시
  optionButtons.forEach((btn, idx) => {
    const icon = btn.querySelector('.opt-icon');
    if (idx === qData.answer) {
      btn.classList.add('correct');
      icon.className = 'fa-solid fa-circle-check';
    } else if (idx === selectedIdx) {
      btn.classList.add('incorrect');
      icon.className = 'fa-solid fa-circle-xmark';
    }
  });

  // 점수 계산 및 피드백 메시지 노출
  if (selectedIdx === qData.answer) {
    quizScore++;
    document.getElementById('quiz-score-display').innerText = quizScore * 20;
    feedbackBox.className = 'quiz-feedback-box active correct-feedback';
    feedbackBox.querySelector('.feedback-icon').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
  } else {
    feedbackBox.className = 'quiz-feedback-box active incorrect-feedback';
    feedbackBox.querySelector('.feedback-icon').innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
  }
  
  feedbackText.innerHTML = qData.explanation;

  // 마지막 문제인 경우 '결과 보기'로 버튼 텍스트 교체
  const nextBtn = document.getElementById('next-question-btn');
  if (currentQuestionIndex === quizQuestions.length - 1) {
    nextBtn.innerHTML = '결과 보러 가기 <i class="fa-solid fa-square-poll-vertical"></i>';
  } else {
    nextBtn.innerHTML = '다음 문제로 <i class="fa-solid fa-arrow-right"></i>';
  }
}

function nextQuestion() {
  if (currentQuestionIndex < quizQuestions.length - 1) {
    currentQuestionIndex++;
    showQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  document.getElementById('quiz-play-screen').classList.remove('active');
  document.getElementById('quiz-result-screen').classList.add('active');

  const finalScore = quizScore * 20;
  document.getElementById('result-score').innerText = `${finalScore}점`;

  const resultTitle = document.getElementById('result-title');
  const resultMessage = document.getElementById('result-message');
  const resultIcon = document.getElementById('result-icon-container');

  if (finalScore === 100) {
    resultTitle.innerText = "👑 완벽해요! 기체 천재 과학자";
    resultMessage.innerText = "5문제를 모두 맞히셨어요! 기체의 성질과 쓰임새를 완벽하게 이해하고 있군요. 아주 훌륭합니다!";
    resultIcon.innerHTML = '<i class="fa-solid fa-crown" style="color: #f7b731;"></i>';
  } else if (finalScore >= 80) {
    resultTitle.innerText = "🏆 대단해요! 기체 탐험가";
    resultMessage.innerText = "대부분의 원리를 잘 이해하고 있어요! 아쉽게 틀린 1문제만 복습해 보세요.";
    resultIcon.innerHTML = '<i class="fa-solid fa-award" style="color: #a55eea;"></i>';
  } else if (finalScore >= 60) {
    resultTitle.innerText = "🏅 잘했어요! 기체 꿈나무";
    resultMessage.innerText = "기체의 신기한 원리를 열심히 학습하셨네요! 조금만 더 복습하면 백점도 문제없어요.";
    resultIcon.innerHTML = '<i class="fa-solid fa-medal" style="color: #4b7bec;"></i>';
  } else {
    resultTitle.innerText = "💡 한 번 더 도전해봐요!";
    resultMessage.innerText = "시뮬레이션과 실생활 카드를 한 번 더 꼼꼼히 탐구하고 퀴즈에 다시 도전해 보세요!";
    resultIcon.innerHTML = '<i class="fa-solid fa-rotate-right" style="color: #eb3b5a;"></i>';
  }
}

function restartQuiz() {
  startQuiz();
}


// ==========================================================================
// 6. 초기화 로드
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
  // 기본적으로 첫 홈 화면 로드
  switchTab('home');

  // 리사이즈 시 캔버스 폭 재설정
  window.addEventListener('resize', () => {
    if (activeTab === 'temperature') {
      initTempSimulation();
    } else if (activeTab === 'pressure') {
      initPressSimulation();
    }
  });
});
