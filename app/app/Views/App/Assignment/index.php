<style>
    .mynavlink.active{
        color:#03306F !important;
        border:1px solid #03306F !important;
        background-color: #E6EAF1!important;
        border-radius: 45px;
    }
    .mynavlink{
        
        border-radius: 45px;
        padding:10px 30px;
    }
</style>

<div class="container-fluid">
    <div class="row">
        <div class="col-12 col-lg-8">
            <ul class="nav nav-pills nav-success mb-3 gap-3 bg-white d-flex align-items-center px-5 py-3" role="tablist">
                <li class="nav-item waves-effect waves-light">
                    <a class="nav-link mynavlink active" data-bs-toggle="tab" href="#current-1" role="tab">Current</a>
                </li>
                <li class="nav-item waves-effect waves-light">
                    <a class="nav-link mynavlink" data-bs-toggle="tab" href="#home-1" role="tab">Upcoming</a>
                </li>
                <li class="nav-item waves-effect waves-light">
                    <a class="nav-link mynavlink" data-bs-toggle="tab" href="#profile-1" role="tab">Completed</a>
                </li>
                <!-- Save Draft tab moved to the end -->
                <li class="nav-item waves-effect waves-light ms-auto">
                    <a class="nav-link mynavlink" href="" role="tab">Save Draft
                        <i class="ri-bookmark-fill fs-5 ms-2" style="color: #03306F;"></i>
                    </a>
                </li>
            </ul>

            <!-- Tab panes -->
            <div class="tab-content text-muted">
                <div class="tab-pane active" id="current-1" role="tabpanel">
                    <?php if($assignments['current']){ ?>
                        <?php foreach($assignments['current'] as $assignment){ ?>
                            <div class="col-md-6 mb-4">
                                    <div class="card rounded-4 shadow-sm p-3 h-100">
                                        <div class="card-body d-flex flex-column">
                                            <!-- Top: Icons -->
                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                <div class=" text-white rounded-circle d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; background-color:#8F2774;">
                                                    <i class="ri-clipboard-line fs-5"></i>
                                                </div>
                                                <i class="ri-bookmark-fill text-muted fs-1"></i>
                                            </div>
                        
                                            <!-- Title -->
                                            <h4 class="h4 text-dark fw-bold"><?= $assignment['title'] ?? '' ?></h4>
                        
                                            <!-- Description -->
                                            <p class="text-muted flex-grow-1"><?= $assignment['description'] ?? '' ?></p>
                        
                                            <!-- Bottom: Marks + Button -->
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="fw-semibold text-dark fs-7">Total Marks: <?= $assignment['total_mark'] ?? 'N/A' ?></span>
                                                <a href="<?= base_url('app/assignment/details/'.$assignment['id']) ?>" class="btn btn-primary rounded px-4">View</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        <?php } ?>
                    <?php } else { ?>
                        <div style="min-height: 40vh;" class="d-flex align-items-center justify-content-center">
                            <span>No current assignments found.</span>
                        </div>
                    <?php } ?>
                </div>
                <div class="tab-pane" id="home-1" role="tabpanel">
                     <?php if($assignments['upcoming']){ ?>
                        <?php foreach($assignments['upcoming'] as $assignment){ ?>
                            <div class="col-md-6 mb-4">
                                    <div class="card rounded-4 shadow-sm p-3 h-100">
                                        <div class="card-body d-flex flex-column">
                                            <!-- Top: Icons -->
                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                <div class=" text-white rounded-circle d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; background-color:#8F2774;">
                                                    <i class="ri-clipboard-line fs-5"></i>
                                                </div>
                                                <i class="ri-bookmark-fill text-muted fs-1"></i>
                                            </div>
                        
                                            <!-- Title -->
                                            <h4 class="h4 text-dark fw-bold"><?= $assignment['title'] ?? '' ?></h4>
                        
                                            <!-- Description -->
                                            <p class="text-muted flex-grow-1"><?= $assignment['description'] ?? '' ?></p>
                        
                                            <!-- Bottom: Marks + Button -->
                                            <div class="d-flex justify-content-between align-items-center">
                                                <span class="fw-semibold text-dark fs-7">Total Marks: <?= $assignment['total_mark'] ?? 'N/A' ?></span>
                                                <a href="<?= base_url('app/assignment/details/'.$assignment['id']) ?>" class="btn btn-primary rounded px-4">View</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                        <?php } ?>
                    <?php } else { ?> 
                        <div style="min-height: 40vh;" class="d-flex align-items-center justify-content-center">
                            <span>No upcoming assignments found.</span>
                        </div>
                    <?php } ?>
                </div>
                <div class="tab-pane" id="profile-1" role="tabpanel">
                    <?php if($assignments['completed']){ ?>
                        <div class="row">
                            <?php foreach($assignments['completed'] as $assignment){ ?>
                                <div class="col-md-6 mb-4">
                                    <div class="card rounded-4 shadow-sm p-3 h-100">
                                        <div class="card-body d-flex flex-column">
                                            <!-- Top: Icons -->
                                            <div class="d-flex justify-content-between align-items-center mb-3">
                                                <div class=" text-white rounded-circle d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; background-color:#8F2774;">
                                                    <i class="ri-clipboard-line fs-5"></i>
                                                </div>
                                                <i class="ri-bookmark-fill text-muted fs-1"></i>
                                            </div>
                        
                                            <!-- Title -->
                                            <h4 class="h4 text-dark fw-bold"><?= $assignment['title'] ?? '' ?></h4>
                        
                                            <!-- Description -->
                                            <p class="text-muted flex-grow-1"><?= $assignment['description'] ?? '' ?></p>
                        
                                            <!-- Bottom: Marks + Button -->
                                            <div class="d-flex justify-content-between align-items-center mt-3">
                                                <span class="fw-semibold text-dark fs-7">Total Marks: <?= $assignment['total_mark'] ?? 'N/A' ?></span>
                                                <a href="<?= base_url('app/assignment/details/'.$assignment['id']) ?>" class="btn btn-primary rounded px-4">View</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            <?php } ?>
                        </div>


                    <?php } else { ?>
                        <div style="min-height: 40vh;" class="d-flex align-items-center justify-content-center">
                            <span>No completed assignments found.</span>
                        </div>
                    <?php } ?>
                </div>
            </div>
            <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/eventscard2.png" class="w-50 mb-3">-->
            
        </div>
        
        <div class="col-12 col-lg-4">
            <!--calendar-->
            <div>
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
                        font-weight: bold;
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
                        background-color: #03306F;
                        color: white !important;
                    }
                    .week-days span:nth-child(5), /* Friday */
                    .week-days span:nth-child(6)  /* Saturday */ {
                      color: #03306F;
                      font-weight: bold;
                    }
                    .month-dates span:nth-child(7n + 5), /* Friday column */
                    .month-dates span:nth-child(7n + 6)  /* Saturday column */ {
                      color: #03306F;
                      font-weight: bold;
                    }


                </style>
            
                <div class="card mymycard rounded-4">
                    <div class="card-header mymycard-header rounded-4">
                        <span class="arrow" id="prevMonth">&lt;</span>
                        <h5 id="monthYear">December 2025</h5>
                        <span class="arrow" id="nextMonth">&gt;</span>
                    </div>
                    <div class="card-body mymycard-body">
                        <div class="week-days">
                            <span>Mo</span>
                            <span>Tu</span>
                            <span>We</span>
                            <span>Th</span>
                            <span>Fr</span>
                            <span>Sa</span>
                            <span>Su</span>
                        </div>
                        <div class="month-dates" id="monthDates">
                            <!-- Dates will be populated here -->
                        </div>
                        <div class="w-100">
                            <h2 class="btn rounded w-100" style="background-color:#FED8C3; color:#FB803D;">View Schedule</h2>
                        </div>
                    </div>
                </div>
            
                <script>
                    let currentDate = new Date();
            
                    function updateCalendar() {
                        const monthYear = document.getElementById('monthYear');
                        const monthDates = document.getElementById('monthDates');
            
                        // Set the month and year
                        const month = currentDate.toLocaleString('default', { month: 'long' });
                        const year = currentDate.getFullYear();
                        monthYear.textContent = `${month} ${year}`;
            
                        // Clear previous dates
                        monthDates.innerHTML = '';
            
                        // First day of the month
                        const firstDay = new Date(year, currentDate.getMonth(), 1);
                        const lastDay = new Date(year, currentDate.getMonth() + 1, 0); // Last day of the month
            
                        const firstDayIndex = (firstDay.getDay() + 6) % 7; // Adjusting for Monday start
                        const daysInMonth = lastDay.getDate();
            
                        // Get today's date for highlighting
                        const today = new Date();
                        const todayDate = today.getDate();
                        const todayMonth = today.getMonth();
                        const todayYear = today.getFullYear();
            
                        // Fill empty spaces before the first day
                        for (let i = 0; i < firstDayIndex; i++) {
                            const emptySpan = document.createElement('span');
                            monthDates.appendChild(emptySpan);
                        }
            
                        // Populate the month dates
                        for (let i = 1; i <= daysInMonth; i++) {
                            const dateElement = document.createElement('span');
                            dateElement.textContent = i;
            
                            // Check if this date is today
                            if (i === todayDate && currentDate.getMonth() === todayMonth && year === todayYear) {
                                dateElement.classList.add('today');
                            }
            
                            monthDates.appendChild(dateElement);
                        }
                    }
            
                    document.getElementById('prevMonth').addEventListener('click', () => {
                        currentDate.setMonth(currentDate.getMonth() - 1);
                        updateCalendar();
                    });
            
                    document.getElementById('nextMonth').addEventListener('click', () => {
                        currentDate.setMonth(currentDate.getMonth() + 1);
                        updateCalendar();
                    });
            
                    // Initialize the calendar
                    updateCalendar();
                </script>
            </div>
            
            
            <style>
                .chat-bg {
                    background-image: url('<?= base_url('assets/app/images/chat-bg.png') ?>');
                    background-size: cover;
                    background-position: center;
                }
                .send-btn {
                    background-color: #FB803D;
                    border: none;
                    width: 50px;
                    height: 50px;
                    line-height:50px;
                    padding:0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-radius: 50%;
                  }

            </style>
            <div class="card rounded-4  chat-bg">
                <div class="p-3">
                    <div class="d-flex">
                        <img src="<?= base_url('assets/app/images/chat-bot.svg') ?>" alt="Chat Bot" class="me-3">
                        <div class="align-items-center">
                            <h3 class="text-white">AI Chat Bot</h1>
                            <h6 class="text-white">Your Private Tutorial</h6>
                        </div>
                        <div></div>
                    </div>
                </div>
                <div style="background-color: white;">
                    <div class="d-flex gap-3 p-3">
                        <div class="w-100 d-flex justify-content-center">
                            <a class="btn w-100 rounded" style="background-color:#FB803D; color:white;">
                                General Area
                            </a>
                        </div>
                        <div class="w-100 d-flex justify-content-center">
                            <a class="btn btn-outline-dark w-100 rounded">
                                Book Wise
                            </a>
                        </div>
                    </div>

                    <!--chat section-->
                    <div class="p-3">
                         <!--left bubble-->
                        <div class="d-flex gap-1 justify-content-start">
                            <img src="<?= base_url('assets/app/images/chat-bot.svg') ?>" alt="Chat Bot" class="me-3 fs-2">
                            <div class="p-3 bg-light rounded-4 mb-2" style="max-width:85%; width: fit-content;">
                                <h6 class="mb-1 fw-semibold">AI Chat Bot</h6>
                                <h6 class="mb-1" style="opacity: 0.6;">Hi, how can I help you?</h6>
                                <h6 class="text-end mb-0 small text-muted">9:00 am</h6>
                            </div>
                        </div>
                        <!--right bubble-->
                        <div class="d-flex gap-1 justify-content-end">
                            <div class="p-3 bg-light rounded-4 mb-2" style="max-width:85%; width: fit-content;">
                                <h6 class="mb-1 fw-semibold">AI Chat Bot</h6>
                                <h6 class="mb-1" style="opacity: 0.6;">Hi, how can I help you?</h6>
                                <h6 class="text-end mb-0 small text-muted">9:00 am</h6>
                            </div>
                            <img src="<?= base_url('assets/app/images/chat-bot.svg') ?>" alt="Chat Bot" class="me-3 fs-2">
                        </div>
                        <div></div>
                    </div>
                   
                    <div class="d-flex align-items-center border-top p-2" style="background-color: #fff;">
                      <input type="text" class="form-control me-2 rounded-pill" placeholder="Type a message...">
                      <button class=" send-btn" type="button">
                          <i class="ri-send-plane-2-line fs-6 text-white"></i>
                      </button>

                    </div>
                </div>
            </div>
            
            
            <!--deadline-->
            <div class="d-none">
                <h3 class="text-dark mb-3">Upcoming Deadline</h3>
                <div class="card rounded-4">
                    <div class="card-body">
                        <div class="d-flex align-items-center justify-content-between">
                            <h5 class="text-dark">Webinar Masterclass</h5>
                            <p class="fs-5">Time Left</p>
                        </div>
                        <div class="d-flex align-items-center justify-content-between">
                            <p class="fs-6 text-muted">Join Us for an inspiring and trans..</p>
                            <p class="rounded-pill px-2" style="border: 2px solid #FB803D; color: #FB803D;"> • 3 Hour</p>
                        </div>
                    </div>
                </div>
                <div class="card rounded-4">
                    <div class="card-body">
                        <div class="d-flex align-items-center justify-content-between">
                            <h5 class="text-dark">Webinar Masterclass</h5>
                            <p class="fs-5">Time Left</p>
                        </div>
                        <div class="d-flex align-items-center justify-content-between">
                            <p class="fs-6 text-muted">Join Us for an inspiring and trans..</p>
                            <p class="rounded-pill px-2" style="border: 2px solid #FB803D; color: #FB803D;"> • 3 Hour</p>
                        </div>
                    </div>
                </div>
                <div class="card rounded-4">
                    <div class="card-body">
                        <div class="d-flex align-items-center justify-content-between">
                            <h5 class="text-dark">Webinar Masterclass</h5>
                            <p class="fs-5">Time Left</p>
                        </div>
                        <div class="d-flex align-items-center justify-content-between">
                            <p class="fs-6 text-muted">Join Us for an inspiring and trans..</p>
                            <p class="rounded-pill px-2" style="border: 2px solid #FB803D; color: #FB803D;"> • 3 Hour</p>
                        </div>
                    </div>
                </div>
            </div>
            <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/eventscard4.png" class="w-100 mb-3">-->
            <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/eventscard3.png" class="w-100 mb-3">-->
        </div>
    </div>
</div>