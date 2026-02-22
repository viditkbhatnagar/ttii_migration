<style>
    .mynavlink.active{
        background-color: #FB803D !important;
        border-radius: 45px;
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
</style>
<div class="container-fluid">
    <div class="card">
        <div class="card-body">
            <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/exambanner2.png" class="w-100">
            
            <div class="row mt-4">
                <div class="col-12  ">
                    <div class="d-flex align-items-center justify-content-between">
                        <ul class="nav nav-pills nav-success mb-3" role="tablist">
                            <li class="nav-item waves-effect waves-light">
                                <a class="nav-link mynavlink active" data-bs-toggle="tab" href="#home-1" role="tab">Upcoming Exams</a>
                            </li>
                            <li class="nav-item waves-effect waves-light">
                                <a class="nav-link mynavlink" data-bs-toggle="tab" href="#profile-1" role="tab">Past Results</a>
                            </li>
                        </ul>
                        <a href="<?= base_url('app/exams/calendar') ?>" class="btn btn-light rounded-pill"><i class="ri-calendar-line"></i> Calendar</a>
                    </div>
                    <!-- Tab panes -->
                    <div class="tab-content text-muted">
                        <div class="tab-pane active" id="home-1" role="tabpanel">
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
                        
                                <a href="<?= base_url('app/exams/exam/'.$exam['id']) ?>" class="start-btn mt-3">Start</a>
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
                        <div class="tab-pane" id="profile-1" role="tabpanel">
                            <div class="row">
                                <div style="min-height: 60vh;">
                                    no exams found.
                                </div>
                            <!--    <div class="col-12 col-md-4 col-lg-3">-->
                            <!--        <div class="exam-card">-->
                            <!--    <div class="d-flex align-items-center">-->
                            <!--        <div class="icon-circle">-->
                            <!--            <i class="ri-file-list-3-line text-primary"></i>-->
                            <!--        </div>-->
                            <!--        <div class="ms-3">-->
                            <!--            <h6 class="mb-0 fw-bold">Exam Test - 1</h6>-->
                            <!--            <p class="text-muted mb-0">Maths Basic Exam</p>-->
                            <!--        </div>-->
                            <!--    </div>-->
                                
                            <!--    <hr>-->
                        
                            <!--    <div class="d-flex justify-content-between align-items-center">-->
                            <!--        <div class="question-count">-->
                            <!--            <i class="ri-question-line"></i> 20 Questions-->
                            <!--        </div>-->
                            <!--    </div>-->
                        
                            <!--    <div class="d-flex justify-content-between align-items-center mt-2 exam-date">-->
                            <!--        <span>17.1.2025</span>-->
                            <!--        <span>—</span>-->
                            <!--        <span>9:00 AM to 12:30 PM</span>-->
                            <!--    </div>-->
                        
                            <!--    <a href="#" class="start-btn mt-3">View Result</a>-->
                            <!--</div>-->
                            <!--    </div>-->
                            </div>
                        </div>
                    </div>
                    <!--<img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/eventscard2.png" class="w-50 mb-3">-->
                    
                </div>
            </div>
        </div>
    </div>
</div>
            