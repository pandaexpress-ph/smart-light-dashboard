const socket = new WebSocket("ws://127.0.0.1:3000/ecclab");

// =========================
// ELEMENTS
// =========================
const adcValue = document.getElementById("adcValue");
const adcStatus = document.getElementById("adcStatus");
const progressBar = document.getElementById("progressBar");
const connectionStatus = document.getElementById("connectionStatus");

const onBtn = document.getElementById("onBtn");
const offBtn = document.getElementById("offBtn");

const brightnessSlider = document.getElementById("brightnessSlider");
const brightnessValue = document.getElementById("brightnessValue");

const lightBulb = document.getElementById("lightBulb");
const pwmDisplay = document.getElementById("pwmDisplay");

// =========================
// SYSTEM
// =========================
let currentValue = 0;
let targetValue = 0;
let pwmValue = 0;

// ✅ โหมดควบคุม
let isManual = false;

// =========================
// CHART
// =========================
const ctx = document.getElementById("adcChart").getContext("2d");

const adcChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "ADC (%)",
        data: [],
        borderColor: "#38bdf8",
        backgroundColor: "rgba(56,189,248,0.2)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 2
      },
      {
        label: "PWM (%)",
        data: [],
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245,158,11,0.2)",
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 2
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      y: { min: 0, max: 100 }
    }
  }
});

// =========================
// CONNECT
// =========================
socket.onopen = () => {
  connectionStatus.innerText = "● Connected";
};

// =========================
// RECEIVE ADC
// =========================
socket.onmessage = (event) => {

  const raw = event.data;

  if (raw.startsWith("ok: adc")) {

    const parts = raw.split(",");
    const adc = Number(parts[2]);

    const mappedADC = Math.floor((adc / 1023) * 100);
    const mappedPWM = Math.floor((pwmValue / 255) * 100);
    console.log("ADC:", mappedADC);
    console.log("PMW:", mappedPWM);

    // ✅ ใช้เฉพาะ AUTO
    if (!isManual) {
      targetValue = mappedADC;
    }
  }
};

// =========================
// LOOP
// =========================
function loop() {

  currentValue += (targetValue - currentValue) * 0.08;

  // ✅ PWM delay
  pwmValue += (currentValue - pwmValue) * 0.15;

  const adc = Math.round(currentValue);
  const pwm = Math.round(pwmValue);

  updateSystem(adc, pwm);

  if (!window.lastChartUpdate || Date.now() - window.lastChartUpdate > 300) {
    updateChart(adc, pwm);
    window.lastChartUpdate = Date.now();
  }

  requestAnimationFrame(loop);
}

loop();

// =========================
// UPDATE SYSTEM
// =========================
function updateSystem(adc, pwm) {

  adcValue.innerHTML = `
    <span style="font-size:18px;color:#94a3b8;">
      ADC VALUE
    </span><br>
    ${adc}%
  `;

  progressBar.style.width = adc + "%";

  if (adc < 50) {
    adcStatus.innerText = "LOW";
    adcStatus.className = "low";
  } else if (adc == 50) {
    adcStatus.innerText = "NORMAL";
    adcStatus.className = "normal";
  } else {
    adcStatus.innerText = "HIGH";
    adcStatus.className = "high";
  }

  // ✅ PWM
  pwmDisplay.innerText = pwm + "%";

  brightnessSlider.value = adc;
  brightnessValue.innerText = adc;

  updateLightBulb(pwm);
}

// =========================
// UPDATE CHART
// =========================
function updateChart(adc, pwm) {

  const time = new Date().toLocaleTimeString();

  adcChart.data.labels.push(time);

  adcChart.data.datasets[0].data.push(adc);
  adcChart.data.datasets[1].data.push(pwm);

  if (adcChart.data.labels.length > 15) {
    adcChart.data.labels.shift();
    adcChart.data.datasets[0].data.shift();
    adcChart.data.datasets[1].data.shift();
  }

  adcChart.update();
}

// =========================
// USER CONTROL (Manual)
// =========================
brightnessSlider.addEventListener("input", () => {

  const value = Number(brightnessSlider.value);

  isManual = true;          // ✅ ใช้ slider
  targetValue = value;

  brightnessValue.innerText = value;
});

// =========================
// BUTTON CONTROL
// =========================
onBtn.addEventListener("click", () => {
  isManual = true;
  targetValue = 100;

  brightnessSlider.value = 100;
  brightnessValue.innerText = 100;
});

offBtn.addEventListener("click", () => {
  isManual = true;
  targetValue = 0;

  brightnessSlider.value = 0;
  brightnessValue.innerText = 0;
});


// =========================
// LIGHT
// =========================
function updateLightBulb(brightness) {

  lightBulb.className =
    brightness > 0 ? "light-on" : "light-off";

  const glow = brightness / 5;

  lightBulb.style.filter =
    `brightness(${brightness}%) drop-shadow(0 0 ${glow}px yellow)`;

  const scale = 1 + (brightness / 200);

  lightBulb.style.transform = `scale(${scale})`;
}