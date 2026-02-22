
<style>
 /* Base Styles */
.custom-card {
    border-radius: 0.5rem;
    background-color: #fff;
     /*box-shadow: 0px 5px 17px rgba(0, 0, 0, 0.1);*/
}

.custom-card-body {
    display: flex;
    align-items: center;
    padding: 1rem;
}

.custom-icon-container {
    width: 25%;
}

.custom-icon {
    width: 100%;
    min-width: 10px;
}

.custom-content-container {
    width: 75%;
    padding-left: 0.75rem;
}

.custom-title {
    font-weight: bold;
    font-size: 0.8rem;
    margin-bottom: 0;
}

.custom-subtitle {
    color: #6c757d;
    font-size: 0.7rem;
}

.custom-progress-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.custom-progress-bar-container {
    width: 75%;
    height: 0.5rem;
    background-color: #e9ecef;
    border-radius: 0.25rem;
    overflow: hidden;
}

.custom-progress-bar {
    height: 100%;
    background-color: #5290DB;
    border-radius: 0.25rem;
}

.custom-progress-percentage {
    font-weight: bold;
    font-size: 0.55rem;
}

/* Responsive Styles (Optional, if you want to adjust font sizes for smaller screens) */
@media (max-width: 768px) {
    .custom-title {
        font-size: 0.9rem;
    }

    .custom-subtitle {
        font-size: 0.6rem;
    }

    .custom-progress-percentage {
        font-size: 0.5rem;
    }
}

@media (max-width: 480px) {
    .custom-title {
        font-size: 0.7rem;
        margin-bottom: -8px;
    }

    .custom-subtitle {
        font-size: 0.5rem;
    }

    .custom-progress-percentage {
        font-size: 0.45rem;
    }
    
    .custom-card-body {
    padding: 0.5rem;
}

}
</style>
<div class="container-fluid" >
  <div class="row">
      <!--LEFT END SECTION-->
      <div class="col-12 col-lg-8" >
          <div class="row">
              <div class="col-12">
                  <img src="<?= base_url() ?>assets/app/images/ttiibannerimage.png" class="w-100" >
              </div>
              
              <!--new cards-->
              <div class="row g-3">
                  <!--card 1-->
                  <div class="col-6 col-md-4">
                    <div class="custom-card custom-rounded shadow shadow-1">
                        <div class="d-flex align-items-center p-2">
                            <div class="mx-3">
                                <i class="ri-book-mark-fill fs-1" style="color:#FB803D"></i>
                            </div>
                            <div class="p-2">
                                <div class="fw-bold fs-3">45</div>
                                <div class="text-muted fw-semibold">Individual Courses</div>
                            </div>
                        </div>
                    </div>
                      <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard2.png" class="w-100">-->
                  </div>
                  
                  <!--card 2-->
                  <div class="col-6 col-md-4">
                    <div class="custom-card custom-rounded shadow shadow-1">
                        <div class="d-flex align-items-center p-2">
                            <div class="mx-3">
                                <i class="ri-pencil-fill fs-1" style="color:#FB803D"></i>
                            </div>
                            <div class="p-2">
                                <div class="fw-bold fs-3">30</div>
                                <div class="text-muted fw-semibold">Total Assignment</div>
                            </div>
                        </div>
                    </div>
                      <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard2.png" class="w-100">-->
                  </div>
                  
                  <!--card 3-->
                  <div class="col-6 col-md-4">
                    <div class="custom-card custom-rounded shadow shadow-1">
                        <div class="d-flex align-items-center p-2">
                            <div class="mx-3">
                                <i class="ri-award-fill fs-1" style="color:#FB803D"></i>
                            </div>
                            <div class="p-2">
                                <div class="fw-bold fs-3">10</div>
                                <div class="text-muted fw-semibold">Badge Earned</div>
                            </div>
                        </div>
                    </div>
                      <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard2.png" class="w-100">-->
                  </div>
                  
              </div>
              
              <!--row 1-->
              <div class="row">
                  <!--Hours Spent-->
                  <div class="col-12 col-lg-8 pt-3 mt-4">
                        <div class="fs-semibold fs-4 text-dark"></div>
                        <h3 class="h4 text-dark fw-semibold" style="font-family: 'Onest' !important;">Hours Spent</h3>
                        <div class="card rounded-4 h-90">
                            <div class="card-body">
                                <style>
                                    .chart-container {
                                        display: flex;
                                        align-items: flex-end;
                                        height: 300px;
                                        width: 80%;
                                        margin: 20px auto;
                                        border-left: 2px solid #000;
                                        border-bottom: 2px solid #000;
                                        position: relative;
                                    }
                                    .bar {
                                        width: 25%;
                                        /*background-color: #F6935D;*/
                                        background: #205CB133;
    
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
                                        transform: rotate(-90deg);
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
                                    <div class="bar mx-2 mx-lg-3" style="height: 0%;" data-value="0"><div class="bar-label">Mon</div></div>
                                    <div class="bar mx-2 mx-lg-3" style="height: 0%;" data-value="0"><div class="bar-label">Tue</div></div>
                                    <div class="bar mx-2 mx-lg-3" style="height: 0%;" data-value="0"><div class="bar-label">Wed</div></div>
                                    <div class="bar mx-2 mx-lg-3" style="height: 0%;" data-value="0"><div class="bar-label">Thu</div></div>
                                    <div class="bar mx-2 mx-lg-3" style="height: 0%;" data-value="0"><div class="bar-label">Fri</div></div>
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
                                    const newData = [0, 0, 0,0,0];
                                    setTimeout(() => {
                                        updateChart(newData);
                                    }, 2000); // Update the chart after 2 seconds
                                </script>
                            </div>
                        </div>
                      <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiigraph.png" class="w-100">-->
                  </div>
                  
                  <!--Peer Performance-->
                  <div class="col-12 col-lg-4 pt-3 mt-4">
                      <h3 class="h4 text-dark fw-semibold" style="font-family: 'Onest' !important;">Peer Performance</h3>
                      <div class="card rounded-4">
                          <div class="card-body p-0">
                              <div class="row">
                                  <div class="fw-bold fs-6 text-center p-3">Progress Analysis</div>
                                  <div class="d-flex flex-column align-items-center text-center">
                                      <div >
                                        <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiicardiconlast.png" alt="Icon" style="max-width: 200px; width: 100%; height: auto;">
                                      </div>
                                    
                                      <div class="d-flex flex-column align-items-center justify-content-center p-4 rounded-4 shadow-sm" style="max-width: 300px;">
                                        <div class="mb-3">
                                          <div class="fs-5 small">Your Point</div>
                                          <div class="fw-bold fs-4">9.546</div>
                                        </div>
                                        <div class="dropdown">
                                          <button class="btn btn-sm rounded-pill text-white dropdown-toggle px-3 py-2" type="button" data-bs-toggle="dropdown" aria-expanded="false" style="background-color: #FB803D;">
                                            Monthly
                                          </button>
                                          <ul class="dropdown-menu text-start">
                                            <li><a class="dropdown-item" href="#">WEEKLY</a></li>
                                            <li><a class="dropdown-item" href="#">MONTHLY</a></li>
                                            <li><a class="dropdown-item" href="#">YEARLY</a></li>
                                          </ul>
                                        </div>
                                    </div>
                                </div>


                                  
                                  <!--old-->
                                  <div class="col-6 d-none">
                                        <div class="w-100 border border-1 border-muted py-3 text-center fw-bold">
                                            Progress Analysis
                                        </div>
                                        <div class="w-100 border border-1 border-muted p-2 d-flex align-items-center justify-content-between">
                                            <span class="fw-bold">Rank</span> <div class="py-2 px-3 rounded-3 bg-light">8</div>
                                        </div>
                                        <div class="w-100 border border-1 border-muted p-2 d-flex align-items-center justify-content-between">
                                            <span class="fw-bold">Stage</span> <div class="py-2 px-3 rounded-3 bg-light">8</div>
                                        </div>
                                        <div class="w-100 border border-1 border-muted p-2 d-flex align-items-center justify-content-between">
                                            <span class="fw-bold">Enrolled Students</span> <div class="py-2 px-3 rounded-3 bg-light">8</div>
                                        </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiipeerperformance.png" class="w-100">-->
                  </div>
              </div>
              
              <!--row 2-->
              <div class="row">
                  <!--Active Courses-->
                  <div class="col-12 col-lg-8 pt-2 my-1">
                      <h3 class="h4 text-dark fw-semibold" style="font-family: 'Onest' !important;">Active Courses</h3>
                      <p class="fw-semibold text-muted">Here are some of your active courses</p>
                      <div class="card rounded-4 h-90 p-4">
                            <img src="<?= base_url() ?>assets/app/images/programmer.svg" style=" width: 10%; height: auto;">
                            <div class="my-3 fs-4 fw-bold">Course Code</div>
                            <p class="text-muted">Type the code here to join to a new course</p>

                            <div class="d-flex flex-column flex-sm-row align-items-center gap-2">
                              <input type="text" class="form-control" placeholder="Enter coupon code" style="max-width: 250px; border: none;">
                              <button class="btn text-white rounded-pill" style="background-color: #FB803D;">
                                Join Course
                              </button>
                            </div>

                      </div>
                  </div>
                  <!--Upcoming Classes-->
                  <div class="col-12 col-lg-4 p-2 mt-1  fw-semibold">
                    <h3 class="h4 text-dark fw-semibold" style="font-family: 'Onest' !important;">Upcoming  Classes</h3>
                    <p class="fw-semibold text-muted">4 Today</p>
                    <div class="card rounded-4 h-90 p-3">
                        <!-- First Item -->
                        <div class="d-flex align-items-center justify-content-between pb-2 border-bottom">
                          <p class="fs-6 mb-0 flex-grow-1 py-2">Data Management</p>
                          <p class="fs-6 text-muted mb-0" style="width: 40px;">2 Hrs</p>
                        </div>
                        
                        <!-- Second Item -->
                        <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                          <p class="fs-6 mb-0 flex-grow-1  py-2">Presentation Tools</p>
                          <p class="fs-6 text-muted mb-0" style="width: 40px;">2 Hrs</p>
                        </div>
                        
                        <!-- Third Item -->
                        <div class="d-flex align-items-center justify-content-between py-2 border-bottom">
                          <p class="fs-6 mb-0 flex-grow-1  py-2">Collaboration Tools</p>
                          <p class="fs-6 text-muted mb-0" style="width: 40px;">2 Hrs</p>
                        </div>
                        
                        <!-- Fourth Item (no border on last item) -->
                        <div class="d-flex align-items-center justify-content-between pt-2">
                          <p class="fs-6 mb-0 flex-grow-1 py-2">School Management</p>
                          <p class="fs-6 text-muted mb-0" style="width: 40px;">2 Hrs</p>
                        </div>
                    </div>

                  </div>
              </div>
              
              <!--row 3-->
              <div class="row">
                  <!--Recommended Courses-->
                  <div class="col-12 col-lg-8 pt-3 mt-1">
                      <h3 class="h4 text-dark fw-semibold" style="font-family: 'Onest' !important;">Recommended Courses</h3>
                      <div class="card rounded-4 h-90 p-4" style="background-color: #1A61C5;">
                          <div class="d-flex align-items-center justify-content-between">
                            <p class="fs-5 text-white mb-0">Teachers Training</p>
                            <div class="fs-5 rounded-pill px-3 py-2 text-white" style="background-color: #5290DB;">14 hrs</div>
                          </div>
                        
                          <div class="mt-2 text-white fs-4">
                            Certification in Digital Classroom Management & LMS Tools
                          </div>
                        
                          <div class="mt-2 d-flex justify-content-between align-items-end">
                          <div class="fs-5 rounded-pill px-3 py-2 my-2 d-inline-block" style="background-color: #fff;">
                            Start the course
                          </div>
                          <div style="display: flex; gap: 9px; height: 8px; align-items: end;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #5290DB;"></div>
                            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: white;"></div>
                            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: white;"></div>
                            <div style="width: 8px; height: 8px; border-radius: 50%; background-color: white;"></div>
                          </div>
                      </div>

                </div>

                  </div>
                  <!--Attendance Statistics-->
                  <div class="col-12 col-lg-4 pt-3 mt-1">
                      <h3 class="h4 text-dark fw-semibold" style="font-family: 'Onest' !important;">Attendance Statistics</h3>
                      <div class="card rounded-4 h-90 p-4 text-center">
                          <div class="progress-circle mx-auto mb-3">
                            <div class="progress-value fw-bold" style="color: #5290DB; font-size: 3rem;">92%</div>
                            <div class="progress-indicator"></div>
                          </div>
                        
                          <p class="mb-2 fs-6 fw-semibold">You have attended 92% of your classes so far.</p>
                          <p class="mb-0  fs-5 fw-bold" style="color: #FB803D";>Great Work!</p>
                        </div>

                  </div>
              </div>
              
              <!--old cards-->
              <div class="d-none">
                  <div class="col-6 col-md-4 pt-3">
                  <div class="custom-card custom-rounded shadow shadow-1">
                    <div class="custom-card-body custom-flex">
                        <div class="custom-icon-container">
                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiicard1icon.png" alt="Icon" class="custom-icon">
                        </div>
                        <div class="custom-content-container">
                            <p class="custom-title d-none "><?= $enrolled_course_count ?>/<?= $course_count ?? 0 ?></p>
                            <span class="custom-title">Courses</span>
                            <div class="custom-progress-container">
                                <div class="custom-progress-bar-container">
                                    <div class="custom-progress-bar" style="width: 0%;"></div>
                                </div>
                                <span class="custom-progress-percentage">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                  <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard1.png" class="w-100">-->
              </div>
              <div class="col-6 col-md-4 pt-3">
                <div class="custom-card custom-rounded shadow shadow-1">
                    <div class="custom-card-body custom-flex">
                        <div class="custom-icon-container">
                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiicard2icon.png" alt="Icon" class="custom-icon">
                        </div>
                        <div class="custom-content-container">
                            <p class="custom-title d-none ">27/35</p>
                            <span class="custom-title ">Assignments</span>
                            <div class="custom-progress-container">
                                <div class="custom-progress-bar-container">
                                    <div class="custom-progress-bar" style="width: 0%; background-color: #fb803d;"></div>
                                </div>
                                <span class="custom-progress-percentage">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                  <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard2.png" class="w-100">-->
              </div>
              <div class="col-6 col-md-4 pt-3 d-none"> 
                  <div class="custom-card custom-rounded shadow shadow-1">
                    <div class="custom-card-body custom-flex">
                        <div class="custom-icon-container">
                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiicard3icon.png" alt="Icon" class="custom-icon">
                        </div>
                        <div class="custom-content-container">
                            <p class="custom-title d-none ">27/35</p>
                            <span class="custom-title ">Badge Earned</span>
                            <div class="custom-progress-container">
                                <div class="custom-progress-bar-container">
                                    <div class="custom-progress-bar" style="width: 0%; background-color: #F9D0B4;"></div>
                                </div>
                                <span class="custom-progress-percentage">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                  <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard3.png" class="w-100">-->
              </div>
              <div class="col-6 col-md-4 pt-3">
                <div class="custom-card custom-rounded shadow shadow-1">
                    <div class="custom-card-body custom-flex">
                        <div class="custom-icon-container">
                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiicard4icon.png" alt="Icon" class="custom-icon">
                        </div>
                        <div class="custom-content-container">
                            <p class="custom-title d-none ">27/35</p>
                            <span class="custom-title ">Practice</span>
                            <div class="custom-progress-container">
                                <div class="custom-progress-bar-container">
                                    <div class="custom-progress-bar" style="width: 0%; background-color: #E95454;"></div>
                                </div>
                                <span class="custom-progress-percentage">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard4.png" class="w-100">-->
              </div>
              <div class="col-6 col-md-4 pt-3">
                <div class="custom-card custom-rounded shadow shadow-1">
                    <div class="custom-card-body custom-flex">
                        <div class="custom-icon-container">
                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiicard5icon.png" alt="Icon" class="custom-icon">
                        </div>
                        <div class="custom-content-container">
                            <p class="custom-title d-none ">27/35</p>
                            <span class="custom-title ">Payment</span>
                            <div class="custom-progress-container">
                                <div class="custom-progress-bar-container">
                                    <div class="custom-progress-bar" style="width: 0%; background-color: #26A6FE;"></div>
                                </div>
                                <span class="custom-progress-percentage">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                  <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard5.png" class="w-100">-->
              </div>
              <div class="col-6 col-md-4 pt-3">
                  <div class="custom-card custom-rounded shadow shadow-1">
                    <div class="custom-card-body custom-flex">
                        <div class="custom-icon-container">
                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiicard6icon.png" alt="Icon" class="custom-icon">
                        </div>
                        <div class="custom-content-container">
                            <p class="custom-title d-none ">27/35</p>
                            <span class="custom-title ">Exam</span>
                            <div class="custom-progress-container">
                                <div class="custom-progress-bar-container">
                                    <div class="custom-progress-bar" style="width: 0%; background-color: #F2C34E;"></div>
                                </div>
                                <span class="custom-progress-percentage">0%</span>
                            </div>
                        </div>
                    </div>
                </div>
                  <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiicard6.png" class="w-100">-->
              </div>
              </div>
              
              <!--attendance statistics-->
              <div class="col-12 col-md-4 pt-3 mt-4 d-none">
                   <style>
                        .mynewcard {
                            background: linear-gradient(135deg, #0a58ca, #0047ab);
                            color: white;
                            border-radius: 15px;
                            padding: 20px;
                            text-align: center;
                            /*width: 260px;*/
                        }
                
                        .progress-container {
                            position: relative;
                            width: 130px;
                            height: 90px; /* Increased height */
                            margin: 0 auto;
                        }
                
                        .progress-text {
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            font-size: 22px;
                            font-weight: bold;
                        }
                
                        .info-box {
                            background: rgba(255, 255, 255, 0.2);
                            border-radius: 10px;
                            padding: 10px;
                            margin-top: 15px;
                        }
                
                        /* Dynamic Progress */
                        .progress-circle {
                            transition: stroke-dashoffset 0.6s ease;
                        }
                    </style>
                    <h3 class="h4 text-dark mb-3">Attendance Statistics</h3>
                   <div class="card shadow-lg mynewcard">
                        <div class="progress-container">
                            <svg width="130" height="70" viewBox="0 0 130 70">
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stop-color="white"/>
                                        <stop offset="100%" stop-color="lightblue"/>
                                    </linearGradient>
                                </defs>
                                <!-- Background Arc -->
                                <path d="M15,60 A50,50 0 1,1 115,60" stroke="#ffffff40" stroke-width="12" fill="transparent"/>
                                <!-- Progress Arc -->
                                <path class="progress-circle" d="M15,60 A50,50 0 1,1 115,60"
                                      stroke="url(#progressGradient)"
                                      stroke-width="12"
                                      fill="transparent"
                                      stroke-dasharray="157"
                                      stroke-dashoffset="157"/>
                            </svg>
                            <div class="progress-text">0</div>
                        </div>
                        <h5 class="mt-3 text-white fs-4">Great Work!</h5>
                        <div class="info-box">
                            <p class="fs-3">You Have Attended 0 Of Your Classes So Far.</p>
                        </div>
                    </div>
                    <script>
                        document.addEventListener("DOMContentLoaded", function () {
                            let percentage = 0; // Dynamic Progress
                            let totalLength = 157; // Full circle length
                            let progressArc = document.querySelector(".progress-circle");
                            progressArc.style.strokeDashoffset = totalLength * ((100 - percentage) / 100);
                        });
                    </script>
                  <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiigraph2.png" class="w-100">-->
              </div>
              <div  class="col-12 pt-3 ps-3">
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css"/>
                    <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
                    <style>
                
                        .carousel-container {
                            position: relative;
                            max-width: 900px;
                            margin: auto;
                        }
                
                        .myswiper {
                            padding: 20px 0;
                        }
                
                        .myswiper-slide {
                            background: #fff;
                            border-radius: 15px;
                            padding: 20px;
                            /*box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);*/
                            text-align: left;
                            width: 280px;
                        }
                
                        .course-header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-size: 14px;
                            color: #555;
                        }
                
                        .course-header .badge {
                            background: #ff6b35;
                            color: white;
                            border-radius: 25px;
                            padding: 15px 10px;
                            font-size: 12px;
                        }
                
                        .course-title {
                            font-size: 18px;
                            font-weight: bold;
                            margin: 10px 0;
                            color: #222;
                        }
                
                        .myprogress-container {
                            display: flex;
                            align-items: center;
                            margin-top: 10px;
                        }
                
                        .myprogress-bar {
                            width: 100px;
                            height: 8px;
                            background: #e0e0e0;
                            border-radius: 5px;
                            position: relative;
                            margin-left: 10px;
                        }
                
                        .myprogress-fill {
                            height: 8px;
                            background: #ff6b35;
                            border-radius: 5px;
                            width: 64%;
                        }
                 
                    </style>
                    <?php if(!empty($enrolled_courses)){ ?>
                    <div class="carousel-container d-none">
                        <div class="d-flex align-items-center justify-content-between">
                            <h2 class="text-dark">Enrolled Courses</h2>
                            <div>
                                <!-- Navigation Buttons -->
                                <!--<div class="swiper-button-prev"></div>-->
                                <!--<div class="swiper-button-next"></div>-->
                            </div>
                        </div>
                        <div class="swiper myswiper">
                            <div class="swiper-wrapper">
                                <!-- Course Card -->
                                
                                    <?php foreach($enrolled_courses as $course){ ?>
                                        <div class="swiper-slide myswiper-slide shadow shadow-1">
                                            <div class="course-header py-3 border border-start-0 border-end-0 border-top-0 border-bottom-1 ">
                                                <span class="text-dark fs-4">Certification In</span>
                                                <div>
                                                    <!--<span class="badge">14 hrs</span>-->
                                                    <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiiiconarrow.png" alt="Icon" class="custom-icon" style="width: 25px; height: 25px;">
                                                </div>
                                            </div>
                                            <div class="course-title"><?= $course['title'] ?? '' ?></div>
                                            <div class="row">
                                                <div class="col-6">
                                                    <div class="d-flex align-items-center justify-content-around">
                                                        <strong class="fs-1">0%</strong>
                                                        <span class="text-muted">Total <br>Course</span>
                                                    </div>
                                                </div>
                                                <div class="col-6">
                                                    <div class="myprogress-container">
                                                        <div class="myprogress-bar me-2">
                                                            <div class="myprogress-fill"></div>
                                                        </div>
                                                        <span class="fw-bold">0%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    <?php } ?>
                                
                            </div>
                        </div>
                    </div>
                    <?php } ?>
                    <script>
                        var swiper = new Swiper('.swiper', {
                            slidesPerView: 1,
                            spaceBetween: 20,
                            navigation: {
                                nextEl: '.swiper-button-next',
                                prevEl: '.swiper-button-prev',
                            },
                            breakpoints: {
                                768: { slidesPerView: 2 },
                                480: { slidesPerView: 1 }
                            }
                        });
                    </script>
              </div>
              <!--<div class="col-12 pt-3 ps-3  ">-->
              <!--  <span class="fw-bold fs-3">Enrolled Courses</span>-->
              <!--  <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/nextpreviousbutton.png" style="width: 90px;">-->
              <!--</div>-->
              <!--<div class="col-12 col-md-6 pt-3">-->
              <!--    <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/enrolledcoursescard1.png" class="w-100">-->
              <!--</div>-->
              <!--<div class="col-12 col-md-6 pt-3">-->
              <!--    <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/enrolledcoursescard1.png" class="w-100">-->
              <!--</div>-->
              
              <!--badges earned-->
              <div class="col-12">
                  <style>
                      .specialized-slider {
                        overflow: hidden; /* Prevents overflowing */
                        width: 100%; /* Ensures it fits the parent container */
                    }
                    
                    .swiper-wrapper {
                        display: flex; /* Ensures slides are in a row */
                    }
                    
                    .swiper-slide {
                        flex-shrink: 0; /* Prevents slides from squishing */
                        width: auto; /* Ensures slides don’t exceed the container */
                    }

                  </style>
                  <h2 class="text-dark mb-3 d-none">Badges Earned</h2>
                      <div class="carousel-container specialized-slider d-none">
                        <div class="swiper-wrapper">
                            <div class="swiper-slide">
                                <div class="card shadow border-0 rounded-4  " style="background-color: #1A5FC3;">
                                    <div class="card-body">
                                        <div class="text-center">
                                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiimedalicon.png" alt="Icon" class="custom-icon mx-auto w-50" >
                                        </div>
                                        <div class="text-center">
                                            <span class="fs-1 text-white">17</span>
                                        </div>
                                        <div class="text-center">
                                            <span class="fs-6 text-white">Overall Badges</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="swiper-slide">
                                <div class="card shadow border-0 rounded-4">
                                    <div class="card-body">
                                        <div class="text-center">
                                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiimedalicon.png" alt="Icon" class="custom-icon mx-auto w-50" >
                                        </div>
                                        <div class="text-center my-1">
                                            <div class="fs-4 py-1  rounded-4 border border-2 text-muted">Platinum</div>
                                        </div>
                                        <div class="text-center">
                                            <span class="fs-6 text-muted">Earned</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="swiper-slide">
                                <div class="card shadow border-0 rounded-4">
                                    <div class="card-body">
                                        <div class="text-center">
                                            <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiimedalicon.png" alt="Icon" class="custom-icon mx-auto w-50" >
                                        </div>
                                        <div class="text-center my-1">
                                            <div class="fs-4 py-1  rounded-4 border border-2 text-warning">Gold</div>
                                        </div>
                                        <div class="text-center">
                                            <span class="fs-6 text-muted">Earned</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!--<div class="swiper-pagination"></div>-->
                    </div>
                  <script>
                       // Swiper for Specialized Practices
                    new Swiper('.specialized-slider', {
                        slidesPerView: 1,
                        spaceBetween: 10,
                        pagination: {
                            el: '.swiper-pagination',
                            clickable: true,
                        },
                        breakpoints: {
                            640: { slidesPerView: 2, spaceBetween: 20 },
                            768: { slidesPerView: 3, spaceBetween: 30 },
                            1024: { slidesPerView: 4, spaceBetween: 40 },
                        },
                    });
                  </script>
                <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiibadge.png" class="w-100">-->
              </div>
               
              <div class="col-12 col-md-6 pt-2 d-none">
                  <h3 class="h3 text-dark">Recommended Courses</h3>
                  <div class="rounded-4 px-3" style="background-color: #1A5FC3;"><div class="course-header  py-3 border border-start-0 border-end-0 border-top-0 border-bottom-1 ">
                        <span class="text-white fs-4">Teachers Training</span>
                        <div>
                            <span class="badge px-3" style="background-color: #5290DB;">14 hrs</span>
                        </div>
                    </div> 
                    <div class="course-title text-white">Certification in Digital Classroom Management & LMS Tools</div>
                                    <a href="<?= base_url('') ?>" class="btn btn-light rounded-pill mb-4 mt-2 fw-bold" style="color: #5290DB;">START THE COURSE</a>
                    </div>
                  <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiirecommenedcourses.png" class="w-100">-->
              </div>
              
          </div>
      </div>
      
      <!--RIGHT END SECTION-->
      <div class="col-12 col-lg-4">
          <div class="">
              <div class="d-flex align-items-center justify-content-between">
                  <span class="fw-semibold fs-4">Profile</span>
                  <a href="<?= base_url('app/profile/index') ?>">
                    <img src="<?= base_url() ?>assets/app/images/ttiiicons/ttiiediticon.png" alt="Icon" style="width: 50px; height: 50px;" >
                  </a>
              </div>
              <div class="text-center">
                  <img src="<?=get_user_profile() ? base_url(get_file(get_user_profile())) :  base_url().'assets/app/images/users/avatar-1.jpg'?>" class="rounded-circle mx-auto" style="width: 150px; height: 150px;">
                  <p class="fs-4 fw-bold my-2"><?=get_user_name()?></p>
                  <P class="text-muted fs-5">Enrollment No: ttii<?= get_user_id() ?></P>
              </div>
              
              <!--cgpa batch section-->
              <div class="row border rounded-4 p-3 mb-3 bg-white mx-0">
                  <div class="col-5">
                    <div class="fw-semibold fs-5 mb-1">Batch:</div>
                    <div>IT</div>
                  </div>
                  <div class="col-3 border-start">
                    <div class="fw-semibold fs-5 mb-1">CGPA:</div>
                    <div>8.7</div>
                  </div>
                  <div class="col-3 border-start">
                    <div class="fw-semibold fs-5 mb-1">Year:</div>
                    <div>2025</div>
                  </div>
              </div>



            <!--calendar-->
            <div class="mb-3">
                <style>
                    .mymycard {
                        width: 100%;
                        max-width: 100%;
                        margin: 0 auto;
                        text-align: center;
                    }
                    
                    @media (min-width: 768px) {
                        .mymycard {
                            max-width: 400px;
                        }
                    }

                    .mymycard-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 10px;
                    }
                    .mymycard-header .arrow {
                        cursor: pointer;
                        font-size: 1.5rem;
                    }
                    .mymycard-body {
                        padding: 10px;
                    }
                    .week-days {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        margin-bottom: 10px;
                    }
                    .week-days span {
                        text-align: center;
                    }
                    .month-dates {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        gap: 5px;
                    }
                    .month-dates span {
                        text-align: center;
                        padding: 10px;
                        margin: 2px;
                    }
                    .today {
                        background-color: #FB803D;
                        border-radius:50px;
                        color: white !important;
                    }


                </style>
            
                <div class="card mymycard rounded-4">
                    <div class="card-header mymycard-header rounded-4">
                        <span class="arrow" id="prevWeek">&lt;</span>
                        <h5 id="weekRange" class="fw-semibold" style="font-family: 'Onest' !important;">Week of December 1, 2025</h5>
                        <span class="arrow" id="nextWeek">&gt;</span>
                    </div>
                    <div class="card-body mymycard-body">
                        <div class="week-days text-muted">
                            <span>M</span>
                            <span>T</span>
                            <span>W</span>
                            <span>T</span>
                            <span>F</span>
                            <span>S</span>
                            <span>S</span>
                        </div>
                        <div class="month-dates fw-semibold" id="weekDates">
                            <!-- Dates will be populated here -->
                        </div>
                    </div>
                </div>
                
                <script>
                    let currentDate = new Date();
                
                    function getWeekDates(date) {
                        // Clone the date to avoid modifying the original
                        const d = new Date(date);
                        // Get the current day of the week (0-6, where 0 is Sunday)
                        const day = d.getDay();
                        // Calculate difference to Monday (assuming week starts on Monday)
                        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
                        
                        const weekDates = [];
                        for (let i = 0; i < 7; i++) {
                            const newDate = new Date(d.setDate(diff + i));
                            weekDates.push(newDate);
                        }
                        return weekDates;
                    }
                
                    function updateWeekCalendar() {
                        const weekRange = document.getElementById('weekRange');
                        const weekDatesElement = document.getElementById('weekDates');
                
                        // Get the current week's dates
                        const weekDates = getWeekDates(currentDate);
                        
                        // Set the week range text
                        const firstDay = weekDates[0];
                        const lastDay = weekDates[6];
                        const month = firstDay.toLocaleString('default', { month: 'long' });
                        const year = firstDay.getFullYear();
                        
                        if (firstDay.getMonth() === lastDay.getMonth()) {
                            weekRange.textContent = `${month} ${year}`;
                        } else {
                            const lastMonth = lastDay.toLocaleString('default', { month: 'long' });
                            weekRange.textContent = `Week of ${month} ${firstDay.getDate()} - ${lastMonth} ${lastDay.getDate()}, ${year}`;
                        }
                
                        // Clear previous dates
                        weekDatesElement.innerHTML = '';
                
                        // Get today's date for highlighting
                        const today = new Date();
                        const todayDate = today.getDate();
                        const todayMonth = today.getMonth();
                        const todayYear = today.getFullYear();
                
                        // Populate the week dates
                        weekDates.forEach(date => {
                            const dateElement = document.createElement('span');
                            dateElement.textContent = date.getDate();
                
                            // Check if this date is today
                            if (date.getDate() === todayDate && 
                                date.getMonth() === todayMonth && 
                                date.getFullYear() === todayYear) {
                                dateElement.classList.add('today');
                            }
                
                            weekDatesElement.appendChild(dateElement);
                        });
                    }
                
                    document.getElementById('prevWeek').addEventListener('click', () => {
                        currentDate.setDate(currentDate.getDate() - 7);
                        updateWeekCalendar();
                    });
                
                    document.getElementById('nextWeek').addEventListener('click', () => {
                        currentDate.setDate(currentDate.getDate() + 7);
                        updateWeekCalendar();
                    });
                
                    // Initialize the calendar
                    updateWeekCalendar();
                </script>
            </div>
            
            <!--To Do List-->
            <div class="card rounded-4 mb-3 p-3">
                <div class="rounded-4">
                    <div class="fs-4 fw-semibold ms-2">To-Do List</div>
                </div>
                <div class="card-body mymycard-body p-3">
                    <style>
                        .form-check-input:checked {
                            background-color: #205CB1;
                            border-color: #205CB1;
                        }
                    </style>
                    <div class="form-check py-2 border-bottom">
                        <input class="form-check-input fs-5" type="checkbox" id="todo1">
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo1">Complete the Assignment</label>
                    </div>
                    <div class="form-check py-2 border-bottom">
                        <input class="form-check-input fs-5" type="checkbox" id="todo2" checked>
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo2">Finish the Training course</label>
                    </div>
                    <div class="form-check py-2 border-bottom">
                        <input class="form-check-input fs-5" type="checkbox" id="todo3">
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo3">Attend the Webinar at 3pm</label>
                    </div>
                    <div class="form-check py-2">
                        <input class="form-check-input fs-5" type="checkbox" id="todo4">
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo4">Pay the course Fees</label>
                    </div>
                </div>
            </div>
            
            <!--Add Ons-->
            <div class="card rounded-4 mb-3 p-3">
                <div class="rounded-4 d-flex justify-content-between align-items-center p-3">
                    <div>
                        <div class="fs-4 fw-semibold mb-1">Add Ons</div>
                        <p class="text-muted mb-0 fw-semibold">Checkout our Addons</p>
                    </div>
                    <div class="flex-shrink-0">
                        <button class="btn text-white rounded-pill px-3 py-2" style="background-color: #FB803D;">
                            Join
                        </button>
                    </div>
                </div>
                <div class="card-body mymycard-body p-3 overflow-y-auto" style="max-height: 200px;">
                    <style>
                        .form-check-input:checked {
                            background-color: #205CB1;
                            border-color: #205CB1;
                        }
                    </style>
                    <div class="form-check py-2 border-bottom">
                        <input class="form-check-input fs-5" type="checkbox" id="todo1">
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo1">Teachers Training Course</label>
                    </div>
                    <div class="form-check py-2 border-bottom">
                        <input class="form-check-input fs-5" type="checkbox" id="todo2" checked>
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo2">Montessori Teachers Training</label>
                    </div>
                    <div class="form-check py-2 border-bottom">
                        <input class="form-check-input fs-5" type="checkbox" id="todo3">
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo3">Pre Primary Teaching</label>
                    </div>
                    <div class="form-check py-2 border-bottom">
                        <input class="form-check-input fs-5" type="checkbox" id="todo3">
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo3">Pre Primary Teaching</label>
                    </div>
                    <div class="form-check py-2 border-bottom">
                        <input class="form-check-input fs-5" type="checkbox" id="todo3">
                        <label class="form-check-label ms-2 fs-6 fw-semibold" for="todo3">Pre Primary Teaching</label>
                    </div>
                </div>
            </div>
            
            <!--Upcoming Events-->
            <div class="fs-4 fw-semibold py-3">Upcoming Events</div>
            <div class="card rounded-4 mb-3 p-2">
                <div class="rounded-4 p-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="fs-4 fw-semibold mb-1">Webinar</div>
                        <button class="btn text-white rounded-pill px-3 py-2" style="background-color: #FB803D;">
                            Join
                        </button>
                    </div>
                    <div class="fs-5 mb-0">Strategies for Job Seekers & Professionals</div>
                    <p class="text-muted py-2">Schedule your task & date</p>
                </div>
                
                <div class="border rounded-4 p-3 m-2">
                      <div class="row g-2">
                        <!-- First Column - Time -->
                        <div class="col-md-6">
                          <div class="h-100 d-flex align-items-center">  <!-- Removed card-body and flex-column -->
                            <div class="d-flex align-items-center w-100">  <!-- Added w-100 -->
                              <!-- Clock Icon -->
                              <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" 
                                   style="width: 2.5rem; height: 2.5rem; line-height: 2.5rem; padding: 0;">
                                <i class="ri-time-line text-white fs-5 m-0"></i>  <!-- Changed fs-4 to fs-5 -->
                              </div>
                              
                              <div class="ms-3 flex-grow-1">  <!-- Added flex-grow-1 -->
                                <div class="fw-semibold fs-5 mb-1">45 Min</div>
                                <div class="text-muted">Duration</div>
                              </div>
                            </div>
                          </div>
                        </div>
                    
                        <!-- Second Column - Date -->
                        <div class="col-md-6">
                          <div class="h-100 d-flex align-items-center">  <!-- Removed card-body and flex-column -->
                            <div class="d-flex align-items-center w-100">  <!-- Added w-100 -->
                              <!-- Calendar Icon -->
                              <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" 
                                   style="width: 2.5rem; height: 2.5rem; line-height: 2.5rem; padding: 0;">
                                <i class="ri-calendar-line text-white fs-5 m-0"></i>  <!-- Changed fs-4 to fs-5 -->
                              </div>
                              
                              <div class="ms-3 flex-grow-1">  <!-- Added flex-grow-1 -->
                                <div class="fw-semibold fs-5 mb-1">17 Jan 2025</div>
                                <div class="text-muted">Date</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    
                  </div>
                </div>
            </div>
              
              <!--course enrolled old-->
                <div class="card rounded-4 d-none">
                    <div class="card-header rounded-top-4 d-flex align-items-center justify-content-between">
                        <span class="fw-bold fs-4">Courses Enrolled</span>
                        <a href="<?= base_url('app/course/my_course') ?>" class="px-3 py-2 rounded-pill text-white" style="background-color: #FB803D;">Join</a>
                    </div>
                    <div class="card-body">
                        <?php if(!empty($enrolled_courses)){ ?>
                            <?php foreach($enrolled_courses as $course){ ?>
                                <div class="border border-1 border-muted rounded-4 d-flex align-items-center p-3 mb-2">
                                    <input type="checkbox" id="courseCheckbox" checked readonly class="custom-checkbox m-3 fs-4">
                                    <label for="courseCheckbox" class="h5"><?= $course['title'] ?? '' ?></label>
                                </div>
                            <?php } ?>
                        <?php } ?>
                        
                        <h6 class="h6 mt-3 ms-3">Addons</h6>
                        <div id="course_list">
                            <?php if(!empty($other_courses)){ ?>
                                <?php foreach($other_courses as $course){ ?>
                                    <div class="border border-1 border-muted rounded-4 d-flex align-items-center p-1 mb-2">
                                        <input type="checkbox" id="courseCheckbox"  class="custom-checkbox m-3 fs-4">
                                        <label for="courseCheckbox" class="h5"> <?= $course['title'] ?? '' ?></label>
                                    </div>
                                <?php } ?>
                            <?php } ?>
                        </div>
                    </div>
                </div>
                
                <style>
                    #course_list{
                        height: 150px;
                        padding: 10px;
                        width: 100%;
                        overflow-y: auto;
                    }
                    
                    #course_list::-webkit-scrollbar {
                      width: 10px;
                    }
                        
                    /* Track */
                    #course_list::-webkit-scrollbar-track {
                      background: #f1f1f1;
                    }
                        
                        /* Handle */
                    #course_list::-webkit-scrollbar-thumb {
                      background: #888;
                      border-radius: 10px;
                    }
                
                    /* Custom checkbox styling */
                    .custom-checkbox {
                        appearance: none; /* Remove default styling */
                        width: 24px; /* Set width */
                        height: 24px; /* Set height */
                        border: 2px solid #ccc; /* Add a border */
                        border-radius: 6px; /* Rounded corners */
                        cursor: pointer; /* Pointer cursor on hover */
                        position: relative;
                    }
                
                    /* Background color when checked */
                    .custom-checkbox:checked {
                        background-color: #FB803D;
                        border-color: #FB803D;
                    }
                
                    /* Custom checkmark */
                    .custom-checkbox:checked::after {
                        content: "✔"; /* Unicode checkmark */
                        font-size: 16px; /* Checkmark size */
                        color: white; /* Checkmark color */
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                    }
                </style>
                
                <!--assignment old-->
                 <div class="card rounded-4 d-none">
                    <div class="card-header rounded-top-4 d-flex align-items-center justify-content-between">
                        <span class="fw-bold fs-5">Assignments(<?= $total_assignments ?? 0 ?>)</span>
                        <span class="text-info"><?= $completed_assignments ?>/<?= $total_assignments ?> Complete</span>
                    </div>
                    <div class="card-body">
                        <div id="course_list">
                            <?php if(!empty($assignments)){ ?>
                                <?php foreach($assignments as $assignment){ ?>
                                    <div class="border border-1 border-muted rounded-4 d-flex align-items-center p-1 mb-2">
                                        <input type="checkbox" id="courseCheckbox"  class="custom-checkbox m-3 fs-4">
                                        <div>
                                            <label for="courseCheckbox" class="h5 mb-1"> <?= $assignment['title'] ?? '' ?></label>
                                            <div class="d-flex align-items-center justify-content-between">
                                                <span><?= date('d M Y', strtotime($assignment['due_date'])) ?></span>
                                                <!--<span>Mark: <span class="fw-bold">100</span></span>-->
                                            </div>
                                        </div>
                                    </div>
                                <?php } ?>
                            <?php } ?>
                        </div>
                    </div>
                </div>
                 <div class="card rounded-4 d-none">
                    <div class="card-header rounded-top-4 ">
                        <div class="d-flex align-items-center justify-content-between">
                            <span class="fw-bold fs-5">Exam</span>
                            <span class="text-light"> .</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="fs-1 fw-bold d-flex align-items-center">82%</div>
                                <div class="text-muted fs-6 d-flex align-items-center ps-2">Average Score</div>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <style>
                            .mymymyprogress-container {
                            display: flex;
                            align-items: center;
                            margin-top: 10px;
                        }
                
                        .mymymyprogress-bar {
                            width: 100%;
                            height: 20px;
                            background: #F3F3F9;
                            border-radius: 45px;
                            position: relative;
                            margin-left: 10px;
                        }
                
                        .mymymyprogress-fill {
                            height: 20px;
                            background: #1A5FC3;
                            border-radius: 45px;
                            width: 30%;
                        }
                        </style>
                         <div class="d-flex align-items-center justify-content-between px-2"><span>Highest Score</span> <span>30%</span></div>
                         <div class="mymymyprogress-container">
                            <div class="mymymyprogress-bar me-2">
                                <div class="mymymyprogress-fill"></div>
                            </div>
                        </div>
                         <div class="d-flex align-items-center justify-content-between px-2 mt-3"><span>Lowest Score</span> <span>30%</span></div>
                         <div class="mymymyprogress-container">
                            <div class="mymymyprogress-bar me-2">
                                <div class="mymymyprogress-fill" style="background-color: #D0DAE9;"></div>
                            </div>
                        </div>
                    </div>
                </div>
                 <div class="card rounded-4 d-none">
                    <div class="card-header rounded-top-4 ">
                        <div class="d-flex align-items-center justify-content-between">
                            <span class="fw-bold fs-5">Upcoming Live Class</span>
                            <span class="text-success"><i class="ri-checkbox-circle-fill fs-3"></i></span>
                        </div>
                        <div class="d-flex align-items-center">
                            <div class="fs-1 fw-bold d-flex align-items-center">0</div>
                                <div class="text-muted fs-6 d-flex align-items-center ps-2">Scheduled  Live Class</div>
                        </div>
                    </div>
                    
                    <div class="card-body">
                        <div id="course_list">
                            <div class=" rounded-4 d-flex align-items-center p-1 mb-2 d-none">
                                <span class="text-success"><i class="ri-checkbox-circle-fill fs-3"></i></span>
                                <div class="ps-2">
                                        <div><span>Jan 6-2025 | <span class="fw-bold">2 Hrs</span></span></div>
                                    <label for="courseCheckbox" class="h5 mb-1"> Teacher Training course</label>
                                        
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
               
          </div>
                  <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/ttiiprofilesection.png" class="w-100">-->
      </div>
  </div>

</div>