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
  width: calc(var(--progress-bar-width) - 11px);
  height: calc(var(--progress-bar-height) - 11px);
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
</style>

<div class="container-fluid">
    <div class="row">
        <div class="col-12">
            <nav aria-label="breadcrumb">
              <ol class="breadcrumb">
                <li class="breadcrumb-item"><a href="#">My Course</a></li>
                <li class="breadcrumb-item active" aria-current="page">Lessons</li>
              </ol>
            </nav>
        </div>
        
        <div class="col-12 col-lg-9">
            <?php if(!empty($subjects)){ ?>
                <?php foreach($subjects as $key => $subject){ ?>
                    <!--<div class="card rounded-4 mb-3">-->
                    <!--    <div class="card-body px-4" >-->
                    <!--        <div class="row">-->
                    <!--            <div class="col-9">-->
                    <!--                <h4 class="mb-3">Lesson 1</h4>-->
                                    
                    <!--                <p class="fs-4 fw-bold">Explore Numbers and Counting</p>-->
                                    
                    <!--                <p class="text-muted">5 Videos • 10 Materials</p>-->
                    <!--            </div>-->
                    <!--            <div class="col-3">-->
                    <!--                <img src="</?= base_url() ?>assets/app/images/lmsdashboardcards/ttiiticksignlessons.png" style="position: absolute; bottom: 15px; right: 15px;">-->
                    <!--            </div>-->
                    <!--        </div>-->
                    <!--    </div>-->
                    <!--</div>-->
                    <div class="card rounded-4 mb-3">
                        <div class="card-body px-4" >
                            <div class="row">
                                <div class="col-10">
                                    <h4 class="mb-3">Lesson <?= ++$key ?></h4>
                                    
                                    <p class="fs-4 fw-bold"><?= $subject['title'] ?? '' ?></p>
                                    
                                    <!--<p class="text-muted">5 Videos • 10 Materials</p>-->
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar" role="progressbar" style="width: 0%; background-color: #FDCCB1;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                </div>
                                <div class="col-2"> <a href="<?= base_url('app/lesson/index/'.$subject['id']) ?>" class="rounded-pill px-3 py-2 text-white" style="position:absolute; bottom: 8px; background-color: #FB803D;">Continue</a></div>
                                
                            </div>
                        </div>
                    </div>
                <?php } ?>
            <?php } ?>
        </div>
        <div class="col-12 col-lg-3">
            <div class="card rounded-4">
                <div class="card-body">
                    <div class="circular-progress mx-auto" data-inner-circle-color="#fff" data-percentage="<?= $daily_habits['progress'] ?? 20 ?>" data-progress-color="#FB803D" data-bg-color="#ddd">
                      <div class="inner-circle"></div>
                      <p class="percentage">0%</p><br>
                    </div>
                    <div class="text-center mt-4">
                        <h5 class="fw-bold">
                            Primary Teacher Training
                        </h5>
                        <p class="my-3"><i class="ri-book-open-fill text-muted"></i> Lessons 1/4</p>
                    </div>
                </div>
            </div>
            <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/mylessons.png" class="w-100">-->
            <h3 class="h6 text-dark mb-3">Hours Spent</h3>
                    <div class="card">
                        <div class="card-body">
                            <style>
                                .chart-container {
                                    display: flex;
                                    align-items: flex-end;
                                    height: 200px;
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
                                    bottom: -20px;
                                    width: 100%;
                                    text-align: center;
                                    color: #000;
                                    font-size: 0.5rem;
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
                                Lesson 1
                            </div>
                            <div class="chart-container">
                                <div class="y-axis">
                                    <span>22 Hr</span>
                                    <span>20 Hr</span>
                                    <span>15 Hr</span>
                                    <span>08 Hr</span>
                                    <span>0 Hr</span>
                                </div>
                                <div class="bar mx-1" style="height: 0%;" data-value="0"><div class="bar-label">Mon</div></div>
                                <div class="bar mx-1" style="height: 0%;" data-value="0"><div class="bar-label">Tue</div></div>
                                <div class="bar mx-1" style="height: 0%;" data-value="0"><div class="bar-label">Wed</div></div>
                                <div class="bar mx-1" style="height: 0%;" data-value="0"><div class="bar-label">Thu</div></div>
                                <div class="bar mx-1" style="height: 0%;" data-value="0"><div class="bar-label">Fri</div></div>
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
                                const newData = [0,0,0,0,0];
                                setTimeout(() => {
                                    updateChart(newData);
                                }, 2000); // Update the chart after 2 seconds
                            </script>
                        </div>
                    </div>
            <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/mylessons2.png" class="w-100 mt-3">-->
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