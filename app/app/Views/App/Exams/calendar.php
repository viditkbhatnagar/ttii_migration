<style>
    .mymycard {
        max-width: 500px;
        /*margin: 50px auto;*/
        text-align: center;
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
        font-weight: bold;
        
    }
    
    /*date styles*/
    .month-dates {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
    }
    .month-dates span {
        padding: 10px;
        font-size:14px;
        font-weight:600;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
        border: 1px solid rgba(224, 224, 224, 0.5);
        min-height: 100px; 
        position: relative;
    }
    .today {
        background-color: #FC7024;
        color: white;
    }
    .highlighted {
        background-color: green;
        color: white;
        border-radius: 50%;
    }
    
    .exam-card {
        border-radius: 10px;
        border: 1px solid #e2e2e2;
        padding: 20px;
        background: #fff;
        transition: 0.3s;
        max-width: 350px;
    }
    .exam-card:hover {
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    }
    .icon-circle {
        width: 50px;
        height: 50px;
        background: #e7f4ff;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
    }
    .question-count {
        display: flex;
        align-items: center;
        font-size: 14px;
        font-weight: 500;
        color: #333;
    }
    .question-count i {
        font-size: 18px;
        color: #0d6efd;
        margin-right: 6px;
    }
    .exam-date {
        font-size: 14px;
        color: #666;
        font-weight: 500;
    }
    .start-btn {
        width: 100%;
        padding: 10px;
        font-size: 16px;
        font-weight: 500;
        background: #ffe3d5;
        border: none;
        border-radius: 8px;
        color: #f48c68;
        transition: 0.3s;
        display: block;
        text-align: center;
    }
    .start-btn:hover {
        background: #f48c68;
        color: white;
    }
    .blue-button{
        font-size:12px !important;
        background-color:#03306F;
        border-radius:5px;
        color:#FFFFFF;
        padding:10px 20px;
    }
    .cyan-icon-bg{
        background-color:#5CBAAB;
        border-radius:50px;
        color:#FFFFFF;
        height:50px;
        width:50px;
        line-height:50px;
        padding:0 !important;
        margin: 0 !important;
        display:flex;
        justify-content:center;
        align-items:center;
    }
    h5,h2{
        font-family: 'Onest' !important;
        font-weight:600;
    }
</style>

<div class="container-fluid" >
    <div class="row">
        
      <!--LEFT END SECTION-->
        <div class="col-12 col-lg-8" >
            <div class="row">
                <div class="bg-white rounded-4 p-3 border">
                    <div class="card-header mymycard-header rounded-4 justify-between">
                        
                        <div class="">
                            <span class="arrow blue-button" id="prevMonth">&lt; Pre</span>
                            <span class="arrow blue-button" id="nextMonth">Next &gt;</span>
                        </div>
                        
                        <h5 id="monthYear" class="pt-2">December 2025</h5>
                        <span class="blue-button">Today</span>
                    </div>
                    <div class="card-body mymycard-body">
                        <div class="week-days">
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                            <span>Sun</span>
                        </div>
                        <!--Modal to appear-->
                        <div class="modal fade" id="eventModal" tabindex="-1" aria-labelledby="eventModalLabel" aria-hidden="true">
                          <div class="modal-dialog">
                            <div class="modal-content rounded-4">
                              <div class="modal-header">
                                <h5 class="modal-title" id="eventModalLabel">Event Details</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                              </div>
                              <div class="modal-body">
                                  <div class="card shadow-sm rounded-4 border-0">
                                
                                    <!-- Flex container for cards -->
                                    <div class="d-flex flex-wrap gap-3">
                                
                                      <!-- First Card -->
                                      <div class="p-3 border rounded-4" style="flex: 1 1 300px; min-width: 280px;">
                                        <div class="d-flex align-items-center">
                                          <div class="cyan-icon-bg">
                                            <i class="ri-calendar-event-line fs-5"></i>
                                          </div>
                                          <span class="fw-semibold fs-5 ms-3">Events</span>
                                        </div>
                                        <h5 class="fw-semibold text-dark mt-4">Webinar Master Class</h5>
                                        <div class="d-flex text-muted my-3">
                                          <span class="me-3"><i class="ri-calendar-line me-1"></i> Date</span>
                                          <span><i class="ri-time-line me-1"></i> Time</span>
                                        </div>
                                        <div class="w-100">
                                          <h2 class="btn rounded w-100" style="background-color:#FED8C3; color:#FB803D;">View</h2>
                                        </div>
                                      </div>
                                
                                    </div> <!-- End Flex Container -->
                                
                                  </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="month-dates" id="monthDates"></div>
                    </div>
                </div>
                <script>
                            let currentDate = new Date(); // Define current date globally
                        
                            const highlightedDatesArray = []; // Given dates
                        
                            // Convert the array into an object with month-year as keys and an array of days as values
                            const highlightedDates = {};
                            highlightedDatesArray.forEach(date => {
                                const [day, month, year] = date.split('-');
                                const key = `${parseInt(month)}-${year}`; // Convert '02' -> 2
                                if (!highlightedDates[key]) {
                                    highlightedDates[key] = [];
                                }
                                highlightedDates[key].push(parseInt(day)); // Convert '12' -> 12
                            });
                        
                            function updateCalendar() {
                                const monthYear = document.getElementById('monthYear');
                                const monthDates = document.getElementById('monthDates');
                                const month = currentDate.toLocaleString('default', { month: 'long' });
                                const year = currentDate.getFullYear();
                                monthYear.textContent = `${month} ${year}`;
                                monthDates.innerHTML = '';
                        
                                const firstDay = new Date(year, currentDate.getMonth(), 1);
                                const lastDay = new Date(year, currentDate.getMonth() + 1, 0);
                                const firstDayIndex = (firstDay.getDay() + 6) % 7;
                                const daysInMonth = lastDay.getDate();
                                const today = new Date();
                                const todayDate = today.getDate();
                                const todayMonth = today.getMonth();
                                const todayYear = today.getFullYear();
                        
                                // Get the highlighted days for the current month and year
                                const currentMonthKey = `${currentDate.getMonth() + 1}-${year}`;
                                const highlightedDays = highlightedDates[currentMonthKey] || [];
                        
                                for (let i = 0; i < firstDayIndex; i++) {
                                    const emptySpan = document.createElement('span');
                                    monthDates.appendChild(emptySpan);
                                }
                        
                                for (let i = 1; i <= daysInMonth; i++) {
                                    const dateElement = document.createElement('span');
                                    dateElement.textContent = i;
                        
                                    if (i === todayDate && currentDate.getMonth() === todayMonth && year === todayYear) {
                                        dateElement.classList.add('today');
                                    }
                        
                                    if (highlightedDays.includes(i)) {
                                        dateElement.classList.add('highlighted');
                                    }
                                    
                                     // Add Bootstrap modal attributes
                                    dateElement.setAttribute('data-bs-toggle', 'modal');
                                    dateElement.setAttribute('data-bs-target', '#eventModal');
                                
                                    // Optional: pass data to modal if needed
                                    dateElement.setAttribute('data-date', `${i}-${currentDate.getMonth() + 1}-${year}`);
                                    monthDates.appendChild(dateElement);
                                }
                            }
                        
                            // Event listeners for next & previous buttons
                            document.getElementById('prevMonth').addEventListener('click', () => {
                                currentDate.setMonth(currentDate.getMonth() - 1);
                                updateCalendar();
                            });
                        
                            document.getElementById('nextMonth').addEventListener('click', () => {
                                currentDate.setMonth(currentDate.getMonth() + 1);
                                updateCalendar();
                            });
                        
                            // Initial call to display the calendar
                            updateCalendar();
                        </script>
                
                <!--OLD-->
                <div class="col-12 col-lg-6 d-none">
                    <div style="margin-top: 10px;">
                        <ul style="list-style: none; padding: 0;">
                            <li style="display: flex; align-items: center; margin-bottom: 5px;">
                                <span style="width: 15px; height: 15px; background-color: green; display: inline-block; border-radius: 50%; margin-right: 10px;"></span>
                                Scheduled Exams
                            </li>
                            <li style="display: flex; align-items: center;">
                                <span style="width: 15px; height: 15px; background-color: #FC7024; display: inline-block; border-radius: 50%; margin-right: 10px;"></span>
                                Current Date
                            </li>
                        </ul>
                    </div>

                </div>
                <!--OLD-->
                <div class="col-12 d-none">
                    <h3>Scheduled Exams</h3>
                    <div class="row">
                                
                                <?php
                                    if(!empty($exams)){
                                        foreach($exams as $exam){ ?>
                                    <div class="col-12 col-md-4 col-lg-3 py-2">
                                    <div class="exam-card">
                                <div class="d-flex align-items-center">
                                    <div class="icon-circle">
                                        <i class="ri-file-list-3-line text-primary"></i>
                                    </div>
                                    <div class="ms-3">
                                        <h6 class="mb-0 fw-bold"><?= $exam['title'] ?? '' ?></h6>
                                        <!--<p class="text-muted mb-0">Maths Basic Exam</p>-->
                                    </div>
                                </div>
                                
                                <hr>
                        
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="question-count">
                                        <i class="ri-question-line"></i> <?= $exam['questions_count'] ?? '' ?>
                                    </div>
                                </div>
                        
                                <div class="d-flex justify-content-between align-items-center mt-2 exam-date">
                                    <span><?= $exam['date'] ?? '' ?></span>
                                    <!--<span>—</span>-->
                                    <!--<span>9:00 AM to 12:30 PM</span>-->
                                </div>
                        
                                <a href="#" class="start-btn mt-3">Start</a>
                            </div>
                                </div>
                                <?php 
                                    } 
                                }  else { 
                                ?>
                                
                                <div style="min-height: 60vh;">
                                    no exams found.
                                </div>
                                <?php } ?>
                            </div>
                </div>
            </div>
            
            <!--bottom cards-->
            <div class="row">
                <div class="my-3">
                  <div class="card p-4 shadow-sm rounded-4 border-0">
                    <h5 class="h4 text-dark fw-semibold my-4">Your Monthly Schedules</h5>
                
                    <!-- Flex container for cards -->
                    <div class="d-flex flex-wrap gap-3">
                
                      <!-- First Card -->
                      <div class="p-3 border rounded-4" style="flex: 1 1 300px; min-width: 280px;">
                        <div class="d-flex align-items-center">
                          <div class="cyan-icon-bg">
                            <i class="ri-calendar-event-line fs-5"></i>
                          </div>
                          <span class="fw-semibold fs-5 ms-3">Events</span>
                        </div>
                        <h5 class="fw-semibold text-dark mt-4">Webinar Master Class</h5>
                        <div class="d-flex text-muted my-3">
                          <span class="me-3"><i class="ri-calendar-line me-1"></i> Date</span>
                          <span><i class="ri-time-line me-1"></i> Time</span>
                        </div>
                        <div class="w-100">
                          <h2 class="btn rounded w-100" style="background-color:#FED8C3; color:#FB803D;">View</h2>
                        </div>
                      </div>
                
                      <!-- Second Card -->
                      <div class="p-3 border rounded-4" style="flex: 1 1 300px; min-width: 280px;">
                        <div class="d-flex align-items-center">
                          <div class="cyan-icon-bg">
                            <i class="ri-calendar-event-line fs-5"></i>
                          </div>
                          <span class="fw-semibold fs-5 ms-3">Live Class</span>
                        </div>
                        <h5 class="fw-semibold text-dark mt-4">Webinar Master Class</h5>
                        <div class="d-flex text-muted my-3">
                          <span class="me-3"><i class="ri-calendar-line me-1"></i> Date</span>
                          <span><i class="ri-youtube-fill me-1"></i> Time</span>
                        </div>
                        <div class="w-100">
                          <h2 class="btn rounded w-100" style="background-color:#FED8C3; color:#FB803D;">View</h2>
                        </div>
                      </div>
                
                    </div> <!-- End Flex Container -->
                
                  </div>
                </div>
            </div>
        </div>
        
        

        
        <!--RIGHT END-->
        <div class="col-12 col-lg-4" >
            <div class="card p-4 shadow-sm rounded-4 border-0">
                <span class="h4 text-dark fw-semibold my-4" style="font-family: 'Onest' !important;">Recent Schedules</span>
                
                
                <div class="p-3 border rounded-4 mb-4">
                    <div class="d-flex align-items-center">
                        <div class="cyan-icon-bg">
                            <i class="ri-calendar-event-line fs-5"></i>
                        </div>
                        <span class="fw-semibold fs-5 ms-3">Events</span>
                    </div>
                    <h5 class="fw-semibold text-dark mt-4">Webinar Master Class</h5>
                    <div class="d-flex text-muted my-3">
                      <span class="me-3"><i class="ri-calendar-line me-1"></i> Date</span>
                      <span><i class="ri-time-line me-1"></i> Time</span>
                    </div>
                    <div class="w-100">
                        <h2 class="btn rounded w-100" style="background-color:#FED8C3; color:#FB803D;">View</h2>
                    </div>
                </div>
                <div class="p-3 border rounded-4 mb-4">
                    <div class="d-flex align-items-center">
                        <div class="cyan-icon-bg">
                            <i class="ri-calendar-event-line fs-5"></i>
                        </div>
                        <span class="fw-semibold fs-5 ms-3">Live Class</span>
                    </div>
                    <h5 class="fw-semibold text-dark mt-4">Webinar Master Class</h5>
                    <div class="d-flex text-muted my-3">
                      <span class="me-3"><i class="ri-calendar-line me-1"></i> Date</span>
                      <span><i class="ri-youtube-fill"></i> Time</span>
                    </div>
                    <div class="w-100">
                        <h2 class="btn rounded w-100" style="background-color:#FED8C3; color:#FB803D;">View</h2>
                    </div>
                </div>
                
            </div>
        </div>
    </div>
</div>
