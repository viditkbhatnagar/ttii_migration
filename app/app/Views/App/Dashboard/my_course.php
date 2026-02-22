<style>
    .course-card {
        border-radius: 16px;
        /*box-shadow: 0 8px 24px rgba(255, 83, 83, 0.2);*/
        overflow: hidden;
        transition: transform 0.3s ease;
    }

    /*.course-card:hover {*/
    /*    transform: translateY(-5px);*/
    /*}*/

    .course-card img {
        width: 100%;
        height: auto;
    }

    .progress-bar {
        background-color: #03306F;
    }

    .btn-custom {
        border: 1px solid #ff6b6b;
        color: #ff6b6b;
        border-radius: 8px;
        transition: background-color 0.3s;
    }

    .btn-custom:hover {
        background-color: #ff6b6b;
        color: #fff;
    }
    
    
</style>

<style>
        .live-card {
            border: none;
            border-radius: 16px;
            /*box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);*/
            padding: 20px;
            max-width: 350px;
            background: #fff;
        }

        .live-badge {
            background-color: #ff7f50;
            color: white;
            border-radius: 20px;
            padding: 5px 12px;
            font-size: 14px;
            font-weight: bold;
        }

        .info-box {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 10px;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .info-box i {
            font-size: 18px;
            color: #6c757d;
        }
    </style>
    
<style>
.mycourse-course-card {
    border: none;
    border-radius: 12px;
    /*box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);*/
    padding: 15px;
    max-width: 350px;
    background: #fff;
    display: flex;
    align-items: center;
    gap: 15px;
}
.mycourse-course-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
}
.mycourse-progress-bar-container {
    width: 100%;
    background: #e9ecef;
    border-radius: 8px;
    overflow: hidden;
    height: 8px;
    margin-top: 8px;
}
.mycourse-progress-bar {
    width: 45%;
    height: 100%;
    background: navy;
}
.mycourse-progress-text {
    font-size: 14px;
    font-weight: bold;
    color: navy;
    text-align: right;
}
</style>

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
    h5{
        font-family: 'Onest' !important;
    }
</style>

<div class="container-fluid">
    <div class="row mt-3">
        <div class="col-12 col-lg-8">
            
            <ul class="nav nav-pills nav-success mb-3 gap-3 bg-white d-flex align-items-center px-5 py-3" role="tablist">
                <li class="nav-item waves-effect waves-light">
                    <a class="nav-link mynavlink active" data-bs-toggle="tab" href="#ongoing" role="tab">Ongoing</a>
                </li>
                <li class="nav-item waves-effect waves-light">
                    <a class="nav-link mynavlink" data-bs-toggle="tab" href="#completed" role="tab">Completed</a>
                </li>
            </ul>
            
            <!-- Tab panes -->
            <div class="tab-content">
                <!--ongoing-->
                <div class="tab-pane fade show active" id="ongoing" role="tabpanel">
                    <div class="row g-3">
                        <div class="col-md-5 mb-4">
                            <div class="card rounded-4 shadow-sm h-100 border-0 overflow-hidden">
                                <img src="https://foundr.com/wp-content/uploads/2021/09/Best-online-course-platforms.png" 
                                     class="card-img-top rounded-top-4" 
                                     alt="Course Banner" 
                                     style="object-fit: cover; height: 180px;">
                                <div class="p-4">
                                    <h5 class="fw-bold text-dark mb-3">Nursery Teacher</h5>
            
                                    <div class="d-flex justify-content-between text-muted mb-4">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-book-2-fill fs-5"></i>
                                            <span class="fs-6">5 Subjects</span>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-file-list-3-line fs-5"></i>
                                            <span class="fs-6">8 Lessons</span>
                                        </div>
                                    </div>
            
                                    <button class="btn w-100 rounded-3 fw-semibold" 
                                            style="color: #FB803D; border: 2px solid #FB803D;">
                                        Continue Course
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-5 mb-4">
                            <div class="card rounded-4 shadow-sm h-100 border-0 overflow-hidden">
                                <img src="https://foundr.com/wp-content/uploads/2021/09/Best-online-course-platforms.png" 
                                     class="card-img-top rounded-top-4" 
                                     alt="Course Banner" 
                                     style="object-fit: cover; height: 180px;">
                                <div class="p-4">
                                    <h5 class="fw-bold text-dark mb-3">Nursery Teacher</h5>
            
                                    <div class="d-flex justify-content-between text-muted mb-4">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-book-2-fill fs-5"></i>
                                            <span class="fs-6">5 Subjects</span>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-file-list-3-line fs-5"></i>
                                            <span class="fs-6">8 Lessons</span>
                                        </div>
                                    </div>
            
                                    <button class="btn w-100 rounded-3 fw-semibold" 
                                            style="color: #FB803D; border: 2px solid #FB803D;">
                                        Continue Course
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-5 mb-4">
                            <div class="card rounded-4 shadow-sm h-100 border-0 overflow-hidden">
                                <img src="https://foundr.com/wp-content/uploads/2021/09/Best-online-course-platforms.png" 
                                     class="card-img-top rounded-top-4" 
                                     alt="Course Banner" 
                                     style="object-fit: cover; height: 180px;">
                                <div class="p-4">
                                    <h5 class="fw-bold text-dark mb-3">Nursery Teacher</h5>
            
                                    <div class="d-flex justify-content-between text-muted mb-4">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-book-2-fill fs-5"></i>
                                            <span class="fs-6">5 Subjects</span>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-file-list-3-line fs-5"></i>
                                            <span class="fs-6">8 Lessons</span>
                                        </div>
                                    </div>
            
                                    <button class="btn w-100 rounded-3 fw-semibold" 
                                            style="color: #FB803D; border: 2px solid #FB803D;">
                                        Continue Course
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-5 mb-4">
                            <div class="card rounded-4 shadow-sm h-100 border-0 overflow-hidden">
                                <img src="https://foundr.com/wp-content/uploads/2021/09/Best-online-course-platforms.png" 
                                     class="card-img-top rounded-top-4" 
                                     alt="Course Banner" 
                                     style="object-fit: cover; height: 180px;">
                                <div class="p-4">
                                    <h5 class="fw-bold text-dark mb-3">Nursery Teacher</h5>
            
                                    <div class="d-flex justify-content-between text-muted mb-4">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-book-2-fill fs-5"></i>
                                            <span class="fs-6">5 Subjects</span>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-file-list-3-line fs-5"></i>
                                            <span class="fs-6">8 Lessons</span>
                                        </div>
                                    </div>
            
                                    <button class="btn w-100 rounded-3 fw-semibold" 
                                            style="color: #FB803D; border: 2px solid #FB803D;">
                                        Continue Course
                                    </button>
                                </div>
                            </div>
                        </div>
            
                        <!-- Repeat <div class="col-md-4 mb-4">...</div> for more cards -->
            
                    </div>
                </div>
                <!--completed-->
                <div class="tab-pane fade show" id="completed" role="tabpanel">
                    <div class="row g-3">
                        <div class="col-md-5 mb-4">
                            <div class="card rounded-4 shadow-sm h-100 border-0 overflow-hidden">
                                <img src="https://foundr.com/wp-content/uploads/2021/09/Best-online-course-platforms.png" 
                                     class="card-img-top rounded-top-4" 
                                     alt="Course Banner" 
                                     style="object-fit: cover; height: 180px;">
                                <div class="p-4">
                                    <h5 class="fw-bold text-dark mb-3">Nursery Teacher</h5>
            
                                    <div class="d-flex justify-content-between text-muted mb-4">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-book-2-fill fs-5"></i>
                                            <span class="fs-6">5 Subjects</span>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-file-list-3-line fs-5"></i>
                                            <span class="fs-6">8 Lessons</span>
                                        </div>
                                    </div>
            
                                    <button class="btn w-100 rounded-3 fw-semibold" 
                                            style="color: #FB803D; border: 2px solid #FB803D;">
                                        Continue Course
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-5 mb-4">
                            <div class="card rounded-4 shadow-sm h-100 border-0 overflow-hidden">
                                <img src="https://foundr.com/wp-content/uploads/2021/09/Best-online-course-platforms.png" 
                                     class="card-img-top rounded-top-4" 
                                     alt="Course Banner" 
                                     style="object-fit: cover; height: 180px;">
                                <div class="p-4">
                                    <h5 class="fw-bold text-dark mb-3">Nursery Teacher</h5>
            
                                    <div class="d-flex justify-content-between text-muted mb-4">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-book-2-fill fs-5"></i>
                                            <span class="fs-6">5 Subjects</span>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-file-list-3-line fs-5"></i>
                                            <span class="fs-6">8 Lessons</span>
                                        </div>
                                    </div>
            
                                    <button class="btn w-100 rounded-3 fw-semibold" 
                                            style="color: #FB803D; border: 2px solid #FB803D;">
                                        Continue Course
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-5 mb-4">
                            <div class="card rounded-4 shadow-sm h-100 border-0 overflow-hidden">
                                <img src="https://foundr.com/wp-content/uploads/2021/09/Best-online-course-platforms.png" 
                                     class="card-img-top rounded-top-4" 
                                     alt="Course Banner" 
                                     style="object-fit: cover; height: 180px;">
                                <div class="p-4">
                                    <h5 class="fw-bold text-dark mb-3">Nursery Teacher</h5>
            
                                    <div class="d-flex justify-content-between text-muted mb-4">
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-book-2-fill fs-5"></i>
                                            <span class="fs-6">5 Subjects</span>
                                        </div>
                                        <div class="d-flex align-items-center gap-2">
                                            <i class="ri-file-list-3-line fs-5"></i>
                                            <span class="fs-6">8 Lessons</span>
                                        </div>
                                    </div>
            
                                    <button class="btn w-100 rounded-3 fw-semibold" 
                                            style="color: #FB803D; border: 2px solid #FB803D;">
                                        Continue Course
                                    </button>
                                </div>
                            </div>
                        </div>
            
                        <!-- Repeat <div class="col-md-4 mb-4">...</div> for more cards -->
            
                    </div>
                </div>
            </div>

            
            <div class="d-none">
                <?php if(!empty($primary_course_subjects)){ ?>
                    <h3 class="my-3">Continue Learning</h3>
                    <?php foreach($primary_course_subjects as $subject){ ?>
                        <div class="mycourse-course-card mb-2">
                            <img src="<?= !empty($subject['thumbnail']) ? $subject['thumbnail'] :  base_url().'assets/app/images/lmsdashboardcards/mycourselessonscardimg.png' ?>" alt="Course Image" class="mycourse-course-image">
                            <div class="w-100">
                                <h6 class="mb-1"><?= !empty($subject['title']) ? $subject['title'] : '' ?></h6>
                                <!--<p class="text-muted mb-1" style="font-size: 14px;">Lesson 2 &bull; Video 5</p>-->
                                <div>
                                    
                                </div>
                                <div class="progress" style="height: 8px;">
                                        <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                <div class="mycourse-progress-text">0%</div>
                            </div>
                        </div>
                    <?php } ?>
                <?php } ?>
            </div>
            
            <!--old-->
            <div class="d-none">
                <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/mycoursebanner.png" class="w-100">
             
            <div class="row mt-4">
                <div class="col-6 col-md-3">
                    <div class="card rounded-4" style="background: linear-gradient(180deg, rgba(218, 233, 254, 0.5) 0%, #FFFFFF 41.9%);">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-4">
                                    <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/mycourseongoingicon.png" class="w-100">
                                </div>
                                <div class="col-8 p-0 d-flex align-items-center">
                                    <span class="text-muted">Ongoing</span>
                                </div>
                                <div class="col-12 pt-4">
                                    <span class="fs-1"><?= !empty($courses) ? count($courses) : 0 ?></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card rounded-4" style="background: linear-gradient(180deg, rgb(89 255 125 / 10%) 0%, #FFFFFF 44.01%);">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-4">
                                    <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/mycoursecompletedicon.png" class="w-100">
                                </div>
                                <div class="col-8 p-0 d-flex align-items-center">
                                    <span class="text-muted">Completed</span>
                                </div>
                                <div class="col-12 pt-4">
                                    <span class="fs-1">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-md-3">
                    <div class="card rounded-4" style="background: linear-gradient(180deg, rgba(255, 223, 214, 0.5) 0%, #FFFFFF 54.23%);">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-4">
                                    <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/mycoursecertificateicon.png" class="w-100">
                                </div>
                                <div class="col-8 p-0 d-flex align-items-center">
                                    <span class="text-muted">Certificate</span>
                                </div>
                                <div class="col-12 pt-4">
                                    <span class="fs-1">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="card rounded-4" style="background: linear-gradient(180deg, rgba(206, 194, 255, 0.2) 0%, #FFFFFF 43.66%);">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-4">
                                    <img src="<?= base_url() ?>assets/app/images/lmsdashboardcards/mycoursehoursicon.png" class="w-100">
                                </div>
                                <div class="col-8 p-0 d-flex align-items-center">
                                    <span class="text-muted">Hours Spend</span>
                                </div>
                                <div class="col-12 pt-4">
                                    <span class="fs-1">0</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row">
                <?php if(!empty($courses)){ ?>
                    <div class="col-12">
                        <h3 class="h3 text-dark mb-3">Active Course</h3>
                    </div>
                    <?php foreach($courses as $course){ ?>
                        <div class="col-12 col-md-6 col-xl-4">
                             <div class="card course-card">
                                 <div class="px-3 pt-3">
                                    <img src="<?= !empty($course['thumbnail']) ? $course['thumbnail'] : base_url().'assets/app/images/lmsdashboardcards/153.png' ?>" alt="Nursery Class">
                                 </div>
                                <div class="card-body">
                                    <h5 class="card-title fw-bold"><?= $course['title'] ?? '' ?></h5>
                                    <!--<p class="text-muted">5 Subjects • 4 Hours</p>-->
                                    <p class="text-muted"><?= $course['lessons_count'] ?? '' ?> Subjects</p>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                    <p class="mt-2 fw-semibold">0%</p>
                                    <a href="<?= $course['free'] == 'on' ? base_url('app/subject/index/'.$course['id']) : 'javascript:void(0)' ?>" class="btn btn-outline-primary rounded-4 w-100"><?= $course['free'] == 'on' ? 'Continue Course' : "<i class='ri-lock-2-line'></i>" ?></a>
                                </div>
                            </div>
                        </div>
                    <?php } ?>
                <?php } else {?>
                    <div class="col-12 d-flex align-items-center justify-content-center" style="min-height: 30vh;">
                        <span class="fs-4">
                            No courses enrolled.
                        </span>
                    </div>
                <?php } ?>
            </div>  
            <div class="row">
                <?php if(!empty($other_courses)){ ?>
                    <div class="col-12">
                        <h3 class="h3 text-dark mb-3">Other Course</h3>
                    </div>
                    <?php foreach($other_courses as $course){ ?>
                        <div class="col-12 col-md-6 col-xl-4">
                             <div class="card course-card">
                                 <div class="px-3 pt-3">
                                    <img src="<?= !empty($course['thumbnail']) ? $course['thumbnail'] : base_url().'assets/app/images/lmsdashboardcards/153.png' ?>" alt="Nursery Class">
                                 </div>
                                <div class="card-body">
                                    <h5 class="card-title fw-bold"><?= $course['title'] ?? '' ?></h5>
                                    <!--<p class="text-muted">5 Subjects • 4 Hours</p>-->
                                    <p class="text-muted"><?= $course['lessons_count'] ?? '' ?> Subjects</p>
                                    <div class="progress" style="height: 8px;">
                                        <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                    <p class="mt-2 fw-semibold">0%</p>
                                    <a href="<?= $course['free'] == 'on' ? base_url('app/subject/index/'.$course['id']) : 'javascript:void(0)' ?>" class="btn btn-outline-primary rounded-4 w-100"><?= $course['free'] == 'on' ? 'Continue Course' : "<i class='ri-lock-2-line'></i>" ?></a>
                                </div>
                            </div>
                        </div>
                    <?php } ?>
                <?php } ?>
            </div> 
            </div>
            
        </div>
        
        <!--RIGHT END-->
        <div class="col-12 col-lg-4">
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
                    height: 40px;
                    line-height:50px;
                    padding:0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-radius: 50%;
                    margin:5px;
                  }

            </style>
            <div class="card rounded-4  chat-bg">
                <div class="p-3">
                    <div class="d-flex"> <!-- Use Flexbox here -->
                        <img src="<?= base_url('assets/app/images/chat-bot.svg') ?>" alt="Chat Bot" class="me-3">
                        <div class="align-items-center">
                            <h3 class="text-white">AI Chat Bot</h3>
                            <h6 class="text-white">Your Private Tutorial</h6>
                        </div>
                    </div>
                </div>
                <div class="bg-white">
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
                    <div class="p-3 rounded-4">
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
                   
                    <div class="d-flex align-items-center border-top p-2" style="">
                      <input type="text" class="form-control me-2 rounded-pill outline-none" placeholder="Type a message..."  style="border: none; box-shadow: none;">
                      <button class=" send-btn" type="button" >
                          <i class="ri-send-plane-2-line fs-6 text-white"></i>
                      </button>
                    </div>
                </div>
            </div>
            
            <div class="d-none">
                <?php if(!empty($upcoming_live)){ ?>
                <?php foreach($upcoming_live as $live){ ?>
                    <div class="live-card">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">Live Now</h6>
                            <span class="btn btn-primary">JOIN</span>
                        </div>
                        <h5 class="mt-2"><?= $live['title'] ?? '' ?></h5>
                        <div class="mt-3 d-flex justify-content-between info-box">
                            <div class="d-flex align-items-center">
                                <i class="ri-time-line fs-2"></i>
                                <div class="ms-2">
                                    <strong><?= $live['duration'] ?? '' ?> Min</strong>
                                    <p class="mb-0 text-muted" style="font-size: 12px;">Duration</p>
                                </div>
                            </div>
                            <div class="d-flex align-items-center">
                                <i class="ri-calendar-2-line fs-2"></i>
                                <div class="ms-2">
                                    <strong><?= $live['from_date'] ?? '' ?></strong>
                                    <p class="mb-0 text-muted" style="font-size: 12px;">Date</p>
                                </div>
                            </div>
                        </div>
                    </div>
                <?php } ?>
            <?php } ?>
            <div>
                <?php if(!empty($primary_course_subjects)){ ?>
                    <h3 class="my-3">Continue Learning</h3>
                    <?php foreach($primary_course_subjects as $subject){ ?>
                        <div class="mycourse-course-card mb-2">
                            <img src="<?= !empty($subject['thumbnail']) ? $subject['thumbnail'] :  base_url().'assets/app/images/lmsdashboardcards/mycourselessonscardimg.png' ?>" alt="Course Image" class="mycourse-course-image">
                            <div class="w-100">
                                <h6 class="mb-1"><?= !empty($subject['title']) ? $subject['title'] : '' ?></h6>
                                <!--<p class="text-muted mb-1" style="font-size: 14px;">Lesson 2 &bull; Video 5</p>-->
                                <div>
                                    
                                </div>
                                <div class="progress" style="height: 8px;">
                                        <div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                    </div>
                                <div class="mycourse-progress-text">0%</div>
                            </div>
                        </div>
                    <?php } ?>
                <?php } ?>
            </div>
            </div>
            
        </div>
    </div>
</div>