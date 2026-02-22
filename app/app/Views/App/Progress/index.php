<style>
    :root {
  --progress-bar-width: 80px;
  --progress-bar-height: 80px;
  --font-size: 1rem;
}

.circular-progress {
  width: var(--progress-bar-width);
  height: var(--progress-bar-height);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  /*background-color: lightgrey;*/
}
.inner-circle {
  position: absolute;
  width: calc(var(--progress-bar-width) - 17px);
  height: calc(var(--progress-bar-height) - 17px);
  border-radius: 50%;
  
}

.percentage {
  position: relative;
  font-size: var(--font-size);
  color: rgb(0, 0, 0, 0.8);
  margin-bottom: -20px;
}
.progressdata {
  position: relative;
  font-size: 1rem;
  color: rgb(0, 0, 0, 0.8);
}

.progress-card {
            width: 300px;
            background: #fff;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
        }

        .semi-circle {
            transform: rotate(180deg);
        }

        .progress-text {
            font-size: 24px;
            font-weight: bold;
            margin-top: -40px;
            position: relative;
            z-index: 1;
        }

        .progress-info {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }

        .well-done {
            margin-top: 10px;
            font-weight: bold;
            color: #ff7f2a;
        }
</style>
<div class="container-fluid">
    <div class="row">
        <div class="col-12 col-md-9">
            <h3>Progress</h3>
            <div class="card rounded-4">
                <div class="card-body">
                    <h3 class="h5 text-dark mb-3">Hours Spent</h3>
                    <style>
                        .chart-container {
                            display: flex;
                            align-items: flex-end;
                            height: 400px;
                            width: 70%;
                            margin: 20px auto;
                            border-left: 2px solid #000;
                            border-bottom: 2px solid #000;
                            position: relative;
                        }
                        .bar {
                            width: 25%;
                            /*background-color: #F6935D;*/
                            background: #FBDECE;

                            border-top-right-radius: 45px;
                            border-top-left-radius: 45px;
                            /*margin: 0 10px;*/
                            position: relative;
                            text-align: center;
                            color: white;
                            font-weight: bold;
                        }
                        .bar-label {
                            position: absolute;
                            bottom: -28px;
                            width: 100%;
                            text-align: center;
                            color: #000;
                            font-size: 1rem;
                        }
                        .y-axis {
                            position: absolute;
                            left: -40px;
                            top: 0;
                            bottom: 0;
                            display: flex;
                            flex-direction: column;
                            justify-content: space-between;
                        }
                        .y-axis span {
                            /*transform: rotate(-90deg);*/
                            white-space: nowrap;
                        }
                    </style>
                    <div class="px-3 py-2 rounded-pill text-white" style="background-color: #FB803D; position: absolute; right: 20px;">
                        Weekly
                    </div>
                    <div class="chart-container">
                        <div class="y-axis">
                            <span>22 Hr</span>
                            <span>20 Hr</span>
                            <span>15 Hr</span>
                            <span>08 Hr</span>
                            <span>0 Hr</span>
                        </div>
                        <div class="bar mx-1 mx-lg-4" style="height: 100%;" data-value="22"><div class="bar-label">Mon</div></div>
                        <div class="bar mx-1 mx-lg-4" style="height: 90.9%;" data-value="20"><div class="bar-label">Tue</div></div>
                        <div class="bar mx-1 mx-lg-4" style="height: 68.2%;" data-value="15"><div class="bar-label">Wed</div></div>
                        <div class="bar mx-1 mx-lg-4" style="height: 36.4%;" data-value="8"><div class="bar-label">Thu</div></div>
                        <div class="bar mx-1 mx-lg-4" style="height: 0%;" data-value="0"><div class="bar-label">Fri</div></div>
                    </div>
                
                    <script>
                        // Function to update the chart dynamically
                        function updateChart(data) {
                            const bars = document.querySelectorAll('.bar');
                            bars.forEach((bar, index) => {
                                const value = data[index];
                                const heightPercentage = (value / 22) * 100; // 22 is the max value
                                bar.style.height = `${heightPercentage}%`;
                                bar.setAttribute('data-value', value);
                            });
                        }
                
                        // Example dynamic data
                        const newData = [18, 22, 10, 5, 2];
                        setTimeout(() => {
                            updateChart(newData);
                        }, 2000); // Update the chart after 2 seconds
                    </script>
                </div>
            </div>
            <h3>Performance Metrics</h3>
            <div class="row">
                <div class="col-12 col-sm-6">
                     <div class="card card-height-100 rounded-4" style="background: linear-gradient(180deg, #F5F9FF 0%, #FFFFFF 100%);">
                         <div class="card-body">
                             <div class="row">
                                 <div class="col-7">
                                     <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiiassessmentjourney.png" style="width: 50px; height: 50px;">
                                     <h5 class="text-dark my-3">Your Assessment Journey</h5>
                                     <span>5 completed assignments</span>
                                 </div>
                                 <div class="col-5">
                                    <div class="circular-progress mx-auto" data-inner-circle-color="#fff" data-percentage="<?= $daily_habits['progress'] ?? 20 ?>" data-progress-color="#08105E" data-bg-color="#E6EAF1">
                                      <div class="inner-circle"></div>
                                      <p class="percentage">0%</p><br>
                                    </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                </div>
                <div class="col-12 col-sm-6">
                     <div class="card card-height-100 rounded-4" style="background: linear-gradient(180deg, #F5F9FF 0%, #FFFFFF 100%);">
                         <div class="card-body">
                             <div class="row">
                                 <div class="col-7">
                                     <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiiexamattempted.png" style="width: 50px; height: 50px;">
                                     <h5 class="text-dark my-3">Exam Attempted</h5>
                                     <span>Total Exam Attempted</span>
                                 </div>
                                 <div class="col-5">
                                    <div class="circular-progress mx-auto" data-inner-circle-color="#fff" data-percentage="<?= $daily_habits['progress'] ?? 20 ?>" data-progress-color="#2C9741" data-bg-color="#E4F1E6">
                                      <div class="inner-circle"></div>
                                      <p class="percentage">0%</p><br>
                                    </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                </div>
                <div class="col-12 col-sm-6">
                     <div class="card card-height-100 rounded-4" style="background: linear-gradient(180deg, #FFF6F1 0%, #FFFFFF 100%);">
                         <div class="card-body">
                             <div class="row">
                                 <div class="col-7">
                                     <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiiqna.png" style="width: 50px; height: 50px;">
                                     <h5 class="text-dark my-3">Total Attempted Question</h5>
                                     <span>Total Question attempted by you</span>
                                 </div>
                                 <div class="col-5">
                                    <div class="circular-progress mx-auto" data-inner-circle-color="#fff" data-percentage="<?= $daily_habits['progress'] ?? 20 ?>" data-progress-color="#F59158" data-bg-color="#E6EAF1">
                                      <div class="inner-circle"></div>
                                      <p class="percentage">0%</p><br>
                                    </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                </div>
                <div class="col-12 col-sm-6">
                     <div class="card card-height-100 rounded-4" style="background: linear-gradient(180deg, #F6F4FF 0%, #FFFFFF 100%);">
                         <div class="card-body">
                             <div class="row">
                                 <div class="col-7">
                                     <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicorrectandincorrect.png" style="width: 50px; height: 50px;">
                                     <h5 class="text-dark my-3">Correct : Incorrect</h5>
                                     <span>Total correct and incorrect Question</span>
                                 </div>
                                 <div class="col-5">
                                    <div class="circular-progress mx-auto" data-inner-circle-color="#fff" data-percentage="<?= $daily_habits['progress'] ?? 20 ?>" data-progress-color="#B6A8E9" data-bg-color="#EDE8FF">
                                      <div class="inner-circle"></div>
                                      <p class="percentage">0%</p><br>
                                    </div>
                                 </div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>
        <div class="col-12 col-md-3">
            <h3>Peer Performance</h3>
            <div class="card rounded-4">
                <div class="card-body text-center">
                    <h5 class="text-dark mb-3">Progress Analysis</h5>
                    <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiipointer.png" class="w-75 mx-auto">
                    <h5 class="text-dark mt-3 mb-0">Your Point:</h5>
                    <h5 class="text-dark mb-3 fw-bold">9.596</h5>
                    <div class="px-3 py-2 rounded-pill text-white w-50 mx-auto" style="background-color: #FB803D;">
                        Monthly
                    </div>
                </div>
            </div>
            <h3>Attendance Statistics</h3>
            <div class="progress-card">
        
        <!-- Semi-Circle Progress -->
        <svg width="150" height="80" viewBox="0 0 100 50">
            <!-- Background Arc -->
            <path d="M 10 50 A 40 40 0 1 1 90 50" fill="none" stroke="#f8c6a0" stroke-width="8"/>
            
            <!-- Progress Arc (Dynamic based on percentage) -->
            <path d="M 10 50 A 40 40 0 1 1 90 50" fill="none" stroke="#6a93c8" stroke-width="8" stroke-dasharray="92,100"/>
            
            <!-- Circle at the end -->
            <circle cx="82" cy="22" r="4" fill="#ff6833"/>
        </svg>

        <div class="progress-text">92%</div>
        <div class="progress-info my-5">You have attended 92% of your classes so far.</div>
        <div class="well-done" style="color: #FB803D;">Well Done!</div>
    </div>
        </div>
    </div>
</div>


<script>
    const circularProgress = document.querySelectorAll(".circular-progress");

Array.from(circularProgress).forEach((progressBar) => {
  const progressValue = progressBar.querySelector(".percentage");
  const innerCircle = progressBar.querySelector(".inner-circle");
  let startValue = 0,
    endValue = Number(progressBar.getAttribute("data-percentage")),
    speed = 50,
    progressColor = progressBar.getAttribute("data-progress-color");

  // Handle the case when progress is 0%
  if (endValue === 0) {
    progressValue.textContent = "0%";
    progressValue.style.color = `${progressColor}`;
    innerCircle.style.backgroundColor = `${progressBar.getAttribute("data-inner-circle-color")}`;
    progressBar.style.background = "white"; // Set the background to white
    return; // Exit the function early
  }

  // Animate the progress bar for non-zero values
  const progress = setInterval(() => {
    startValue++;
    progressValue.textContent = `${startValue}%`;
    progressValue.style.color = `${progressColor}`;

    innerCircle.style.backgroundColor = `${progressBar.getAttribute("data-inner-circle-color")}`;

    progressBar.style.background = `conic-gradient(${progressColor} ${
      startValue * 3.6
    }deg, ${progressBar.getAttribute("data-bg-color")} 0deg)`;
    if (startValue === endValue) {
      clearInterval(progress);
    }
  }, speed);
});
</script>