<div class="app-menu navbar-menu">
    <!-- LOGO -->
    <div class="navbar-brand-box">
        <!-- Dark Logo-->
        <a href="<?= base_url('centre/dashboard/index') ?>" class="logo logo-dark">
            <span class="logo-sm">
                <!-- <img src="<?=base_url(get_file(get_site_logo()))?>" alt="" class="w-100 m-1" height="80"  > -->
                <img src="<?=base_url()?>/uploads/system/202509/1758687072_c30707b038aa244a95c9_sm.jpg" alt="" height="50" style="padding: 0.5em;">
            </span>
            <span class="logo-lg">
                <img src="<?=base_url(get_file(get_site_logo()))?>" alt="" class="w-100 m-1 mt-3"  height="80">
                <!-- <img src="<?=base_url()?>assets/app/images/TTII-logo-land.png" alt="" height="50" style="padding: 0.5em;"> -->
            </span>
        </a>

        <a href="<?= base_url('centre/dashboard/index') ?>" class="logo logo-light">
            <span class="logo-sm">
                <img src="<?=base_url(get_file(get_site_logo()))?>" alt="" class=" w-100 " height="50" style="padding: 0.5em;">
                <!-- <img src="<?=base_url()?>assets/app/images/ttii_logo_sm.png" alt="" height="50" style="padding: 0.5em;"> -->
            </span>
            <span class="logo-lg">
                <img src="<?=base_url(get_file(get_site_logo()))?>" alt="" class=" w-100 " height="50" style="padding: 0.5em;">
                <!-- <img src="<?=base_url()?>assets/app/images/TTII-logo-land.png" alt="" height="50" style="padding: 0.5em;"> -->
            </span>
        </a>
        <button type="button" class="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover" id="vertical-hover">
            <i class="ri-record-circle-line"></i>
        </button>
    </div>

    

    <div id="scrollbar">
        <div class="container-fluid">
            <div id="two-column-menu">
            </div>
            <ul class="navbar-nav" id="navbar-nav">
                <li class="menu-title">
                    <hr class="m-0 p-0"></span>
                    
                </li>
                
                <div class="sidebar-center-card nav-item">
                    <div class="small text-uppercase text-muted mb-1">Center Profile</div>


                    <div class="fw-bold fs-6 text-white">
                        <?php 
                        $data = get_centre_name();

                        if (!empty($data)) {
                            echo $data['centre_name'];
                        }
                        ?>


                    </div>

                    <div class="mt-1 small text-info fw-semibold">
                        ID: <?php if (!empty($data)) {
                            echo $data['centre_id'];
                        } ?>
                        
                    </div>
                </div>

                <?php
                if (has_permission('dashboard/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'dashboard/index') ?>" href="<?= base_url('centre/dashboard/index/') ?>">
                            <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">Dashboard</span>
                        </a>
                    </li>
                <?php
                }
                ?>

               
               <?php

                if (has_permission('students/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_student" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-graduation-cap-line"></i> <span data-key="t-landing">Learner Management</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Students/index', 'Applications/index',]) ?>" id="navigation_student">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                
                                
                                if (has_permission('students/applications')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('centre/applications/index') ?>" class="nav-link <?php show_active_menu($page_name, 'applications/index') ?>" data-key="t-admin">Applications</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('students/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('centre/students/index') ?>" class="nav-link <?php show_active_menu($page_name, 'students/index') ?>" data-key="t-admin">Students</a>
                                    </li>
                                <?php
                                }

                                if (has_permission('students/alumni')) {
                                ?>
                                    <!--<li class="nav-item">-->
                                    <!--    <a href="<?= base_url('admin/students/index') ?>" class="nav-link <?php show_active_menu($page_name, 'students/alumni') ?>" data-key="t-admin">Alumni</a>-->
                                    <!--</li>-->
                                <?php
                                }
                                
                                if (has_permission('students/referrals')) {
                                ?>
                                    <!--<li class="nav-item">-->
                                    <!--    <a href="<?= base_url('admin/students/index') ?>" class="nav-link <?php show_active_menu($page_name, 'students/referrals') ?>" data-key="t-admin">Student Referrals</a>-->
                                    <!--</li>-->
                                <?php
                                }
                                
                                if (has_permission('students/performance')) {
                                ?>
                                    <!--<li class="nav-item">-->
                                    <!--    <a href="<?= base_url('admin/students/index') ?>" class="nav-link <?php show_active_menu($page_name, 'students/performance') ?>" data-key="t-admin">Student Performance</a>-->
                                    <!--</li>-->
                                <?php
                                }
                                 if (has_permission('batch/index')) {
                                ?>
                                    <!--<li class="nav-item">-->
                                    <!--    <a href="<?= base_url('admin/batch/index') ?>" class="nav-link <?php show_active_menu($page_name, 'batch/index') ?>" data-key="t-admin">Batch</a>-->
                                    <!--</li>-->
                                <?php
                                }
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
               
               
                if (has_permission('centres/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_centres" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-school-line"></i> <span data-key="t-landing">Fee Management</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Centres/index', 'Centres/add','Centres/performance','Centres/wallet','Centres/chat_support','Centres/resources','Centres/training_videos']) ?>" id="navigation_centres">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('centres/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/centres/index') ?>" class="nav-link <?php show_active_menu($page_name, 'centres/index') ?>" data-key="t-admin">Wallet</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('centres/add')) {
                                ?>
                                
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/centres/performance') ?>" class="nav-link <?php show_active_menu($page_name, 'centres/add') ?>" data-key="t-admin">Centre Performance</a>
                                    </li>
                                    
                                    
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/centres/wallet') ?>" class="nav-link <?php show_active_menu($page_name, 'centres/wallet') ?>" data-key="t-admin">Wallet Status</a>
                                    </li>
                                    
                                    
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/centres/chat_support') ?>" class="nav-link <?php show_active_menu($page_name, 'centres/chat_support') ?>" data-key="t-admin">Chat Support</a>
                                    </li>
                                    
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/centres/resources') ?>" class="nav-link <?php show_active_menu($page_name, 'centres/resources') ?>" data-key="t-admin">Resources</a>
                                    </li>

                                <?php
                                }
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                
                if (has_permission('Course/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_course" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">Courses</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Course/index', 'Course/add']) ?>" id="navigation_course">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('course/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/course/index') ?>" class="nav-link <?php show_active_menu($page_name, 'course/index') ?>" data-key="t-admin">Course Directory</a>
                                    </li>
                                <?php
                                }
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                if (has_permission('Books/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_books" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">Books</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Books/index']) ?>" id="navigation_books">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('books/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/books/index') ?>" class="nav-link <?php show_active_menu($page_name, 'books/index') ?>" data-key="t-admin">View Books</a>
                                    </li>
                                <?php
                                }
                                ?>
                                <?php
                                if (has_permission('book_report/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/book_report/index') ?>" class="nav-link <?php show_active_menu($page_name, 'book_report/index') ?>" data-key="t-admin">Book Report</a>
                                    </li>
                                <?php
                                }
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                 
                if (has_permission('Cohorts/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_cohorts" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">Cohorts Management</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Cohorts/index', 'Cohorts/add','Cohorts/live_class','Cohorts/add_live_class','Cohorts/attendance','Cohorts/sessions']) ?>" id="navigation_cohorts">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('cohorts/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('centre/cohorts/index') ?>" class="nav-link <?php show_active_menu($page_name, 'cohorts/index') ?>" data-key="t-admin">Cohorts</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('cohorts/add')) {
                                ?>
                                    <li class="nav-item d-none">
                                        <a href="<?= base_url('admin/cohorts/add') ?>" class="nav-link <?php show_active_menu($page_name, 'cohorts/add') ?>" data-key="t-admin">Add Cohorts</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('live_class/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/live_class/index') ?>" class="nav-link <?php show_active_menu($page_name, 'live_class/index') ?>" data-key="t-admin">Live Sessions</a>
                                    </li>
                                <?php
                                }
                                if (has_permission('Assignment/index')) {
                                ?>
                
                                    <li class="nav-item">
                                        <a class="nav-link <?php show_active_menu($page_name, 'assignment/index') ?>" href="<?= base_url('admin/assignment/index/') ?>" data-key="t-admin">Assignments</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('cohorts/attendance')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/cohorts/attendance') ?>" class="nav-link <?php show_active_menu($page_name, 'cohorts/attendance') ?>" data-key="t-admin">Attendance Management</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('cohorts/sessions')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/cohorts/sessions') ?>" class="nav-link <?php show_active_menu($page_name, 'cohorts/sessions') ?>" data-key="t-admin">Sessions Feedbacks</a>
                                    </li>
                                <?php
                                }
                                
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                ?>


                <?php
                if (has_permission('wallet/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'wallet/index') ?>" href="<?= base_url('centre/wallet/index/') ?>">
                            <i class="ri-wallet-2-line"></i> <span data-key="t-dashboards">Payment Wallet</span>
                        </a>
                    </li>
                <?php
                }
                ?>

                <?php
                if (has_permission('courses/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'courses/index') ?>" href="<?= base_url('centre/courses/index/') ?>">
                            <i class="ri-file-list-3-line"></i> <span data-key="t-dashboards">Courses</span>
                        </a>
                    </li>
                <?php
                }
                ?>



                <?php
                if (has_permission('Course_fee/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_fee" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">Fee Information</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Course_fee/index','Scholarships/index']) ?>" id="navigation_fee">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('course_fee/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/course_fee/index') ?>" class="nav-link <?php show_active_menu($page_name, 'course_fee/index') ?>" data-key="t-admin">Course Fee Status</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('scholarships/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/scholarships/index') ?>" class="nav-link <?php show_active_menu($page_name, 'scholarships/index') ?>" data-key="t-admin">Scholarships</a>
                                    </li>
                                <?php
                                }
                                
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                
                if (has_permission('global_calender/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'global_calender/index') ?>" href="<?= base_url('admin/global_calender/index/') ?>">
                            <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">Global Calender</span>
                        </a>
                    </li>
                <?php
                }

                
                 if (has_permission('Instructor/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_instructor" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">Instructors</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Instructor/index', 'Instructor/add']) ?>" id="navigation_instructor">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('instructor/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/instructor/index') ?>" class="nav-link <?php show_active_menu($page_name, 'instructor/index') ?>" data-key="t-admin">Instructors Directory</a>
                                    </li>
                                <?php
                                }
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                
                 if (has_permission('Exam/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_exam" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">Exam</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Exam/index', 'Exam/add','Exam/re_examination','Exam/evaluation','Question_bank/index']) ?>" id="navigation_exam">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('exam/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/exam/index') ?>" class="nav-link <?php show_active_menu($page_name, 'exam/index') ?>" data-key="t-admin">Exams</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('exam/re_examination')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/Re_exam/index') ?>" class="nav-link <?php show_active_menu($page_name, 'course/re_examination') ?>" data-key="t-admin">Re-Examination</a>
                                    </li>
                                <?php
                                }
                                if (has_permission('exam/evaluation')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/Exam_evaluation/index') ?>" class="nav-link <?php show_active_menu($page_name, 'exam/evaluation') ?>" data-key="t-admin">Evaluation</a>
                                    </li>
                                <?php
                                }
                                if (has_permission('exam/result')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/Exam_result/index') ?>" class="nav-link <?php show_active_menu($page_name, 'exam/result') ?>" data-key="t-admin">Result</a>
                                    </li>
                                <?php
                                }
                                if (has_permission('question_bank/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/question_bank/index') ?>" class="nav-link <?php show_active_menu($page_name, 'question_bank/index') ?>" data-key="t-admin">Question Bank</a>
                                    </li>
                                <?php
                                }
                                
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                
                if (has_permission('Documents/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_document" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">Documents Manager</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Documents/requests', 'Documents/issued']) ?>" id="navigation_document">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('documents/requests')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/documents/requests') ?>" class="nav-link <?php show_active_menu($page_name, 'documents/requests') ?>" data-key="t-admin">Requests</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('documents/issued')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/documents/issued') ?>" class="nav-link <?php show_active_menu($page_name, 'documents/issued') ?>" data-key="t-admin">Documents Issued</a>
                                    </li>
                                <?php
                                }
                                if (has_permission('documents/delivery')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/documents/delivery') ?>" class="nav-link <?php show_active_menu($page_name, 'documents/delivery') ?>" data-key="t-admin">Documents Delivery</a>
                                    </li>
                                <?php
                                }
                                
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                
                if (has_permission('Mentorship/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_ai" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">AI Mentor</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Mentorship/history', 'Mentorship/analysis']) ?>" id="navigation_ai">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('mentorship/history')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/mentorship/history') ?>" class="nav-link <?php show_active_menu($page_name, 'mentorship/history') ?>" data-key="t-admin">Mentorship History</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('mentorship/analysis')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/mentorship/analysis') ?>" class="nav-link <?php show_active_menu($page_name, 'mentorship/analysis') ?>" data-key="t-admin">Mentorship Analysis</a>
                                    </li>
                                <?php
                                }
                                
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                
                
                
                 if (has_permission('resources/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'resources/index') ?>" href="<?= base_url('centre/resources/index/') ?>">
                            <i class="ri-folder-line"></i> <span data-key="t-dashboards">Resources</span>
                        </a>
                    </li>
                <?php
                }

                 if (has_permission('training_videos/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'training_videos/index') ?>" href="<?= base_url('centre/training_videos/index/') ?>">
                            <i class="ri-video-line"></i> <span data-key="t-dashboards">Trainings</span>
                        </a>
                    </li>
                <?php
                }

                 if (has_permission('support/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'support/index') ?>" href="<?= base_url('centre/support/index/') ?>">
                            <i class="ri-chat-1-line"></i> <span data-key="t-dashboards">Admin Support</span>
                        </a>
                    </li>
                <?php
                }

                
                if (has_permission('Events/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'events/index') ?>" href="<?= base_url('admin/events/index/') ?>">
                            <i class="ri-user-2-line"></i> <span data-key="t-dashboards">Events</span>
                        </a>
                    </li>
                <?php
                }
                
                if (has_permission('Circular/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'circulars/index') ?>" href="<?= base_url('admin/circulars/index/') ?>">
                            <i class="ri-user-2-line"></i> <span data-key="t-dashboards">Circulars</span>
                        </a>
                    </li>
                <?php
                }
                
                  if (has_permission('Entrance_exam/index')) {
                ?>

                    <li class="nav-item">
                        <a class="nav-link menu-link" href="#navigation_entrance" data-bs-toggle="collapse" role="button" aria-expanded="false" aria-controls="sidebarLanding">
                            <i class="ri-user-2-line"></i> <span data-key="t-landing">Entrance Exam</span>
                        </a>
                        <div class="collapse menu-dropdown <?php show_active_main_menu($page_name, ['Entrance_exam/registrations','Entrance_exam/index', 'Entrance_exam/results','Entrance_exam/add']) ?>" id="navigation_entrance">
                            <ul class="nav nav-sm flex-column ">
                                <?php
                                if (has_permission('entrance_exam/registrations')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/entrance_exam/registrations') ?>" class="nav-link <?php show_active_menu($page_name, 'entrance_exam/registrations') ?>" data-key="t-admin">Registrations</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('entrance_exam/index')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/entrance_exam/index') ?>" class="nav-link <?php show_active_menu($page_name, 'entrance_exam/index') ?>" data-key="t-admin">Entrance Exams</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('entrance_exam/results')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/entrance_exam/results') ?>" class="nav-link <?php show_active_menu($page_name, 'entrance_exam/results') ?>" data-key="t-admin">Exam Results</a>
                                    </li>
                                <?php
                                }
                                
                                if (has_permission('entrance_exam/add')) {
                                ?>
                                    <li class="nav-item">
                                        <a href="<?= base_url('admin/entrance_exam/add') ?>" class="nav-link <?php show_active_menu($page_name, 'entrance_exam/add') ?>" data-key="t-admin">Add Entrance</a>
                                    </li>
                                <?php
                                }
                                
                                ?>
                            </ul>
                        </div>
                    </li>
                <?php
                }
                
                
                  if (has_permission('enrol/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'enrol/index') ?>" href="<?= base_url('admin/enrol/index/') ?>">
                            <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">App Enrollments</span>
                        </a>
                    </li>
                <?php
                }
                
                  if (has_permission('notification/index')) {
                ?>
                    <li class="nav-item d-none">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'notification/index') ?>" href="<?= base_url('admin/notification/index/') ?>">
                            <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">Notifications</span>
                        </a>
                    </li>
                <?php
                }
                
                  if (has_permission('banners/index')) {
                ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'banners/index') ?>" href="<?= base_url('admin/banners/index/') ?>">
                            <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">Banners</span>
                        </a>
                    </li>
                <?php
                }
                
                        if (has_permission('feed/index')){
                            ?>
                     <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'feed/index')?>" href="<?=base_url('admin/feed/index')?>">
                            <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Feeds</span>
                        </a>
                    </li>
                    <?php } 
                    
                     if (has_permission('settings/system'))
                     {
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link" href="#sidebarPages" data-bs-toggle="collapse" role="button"
                                   aria-expanded="false" aria-controls="sidebarPages">
                                    <i class="ri-settings-4-line"></i> <span data-key="t-pages">Settings</span>
                                </a>
                                <div class="collapse menu-dropdown <?php show_settings_menu($page_name) ?>" id="sidebarPages">
                                    <ul class="nav nav-sm flex-column">
                                     
                                        <li class="nav-item">
                                            <a href="<?=base_url('admin/settings/system_settings/')?>" class="nav-link <?php show_active_menu($page_name, 'settings/system')?>" data-key="t-team"> System Settings </a>
                                        </li>
                                        <li class="nav-item">
                                            <a href="<?=base_url('admin/settings/contact_settings/')?>" class="nav-link <?php show_active_menu($page_name, 'settings/contact_settings')?>" data-key="t-team"> Contact Settings </a>
                                        </li>
                                        <li class="nav-item">
                                            <a href="<?=base_url('admin/settings/website_settings/')?>" class="nav-link <?php show_active_menu($page_name, 'settings/website_settings')?>" data-key="t-team"> Website Settings </a>
                                        </li>
                                        
                                         <?php
                                          if (has_permission('integration/index')) {
                                        ?>
                                            <li class="nav-item">
                                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'integration/index') ?>" href="<?= base_url('admin/integration/index/') ?>">
                                                    <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">Integrations</span>
                                                </a>
                                            </li>
                                        <?php
                                        }
                                          if (has_permission('review/index')) {
                                        ?>
                                            <li class="nav-item">
                                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'review/index') ?>" href="<?= base_url('admin/review/index/') ?>">
                                                    <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">User Feedbacks</span>
                                                </a>
                                            </li>
                                        <?php
                                        }
                                        
                                          if (has_permission('faq/index')) {
                                        ?>
                                            <li class="nav-item">
                                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'faq/index') ?>" href="<?= base_url('admin/faq/index/') ?>">
                                                    <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">FAQs</span>
                                                </a>
                                            </li>
                                        <?php
                                        }
                                        if (has_permission('language/index')) {
                                        ?>
                                            <li class="nav-item">
                                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'language/index') ?>" href="<?= base_url('admin/language/index/') ?>">
                                                    <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">Language</span>
                                                </a>
                                            </li>
                                        <?php
                                        }
                                          if (has_permission('app_version/index')) {
                                        ?>
                                            <li class="nav-item">
                                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'app_version/index') ?>" href="<?= base_url('admin/settings/app_version/') ?>">
                                                    <i class="ri-dashboard-2-line"></i> <span data-key="t-dashboards">App Version</span>
                                                </a>
                                            </li>
                                        <?php
                                        }?>
                                    </ul>
                                </div>
                            </li>
                    <?php } ?>
               



            </ul>
        </div>
        <!-- Sidebar -->
    </div>

    <div class="sidebar-background"></div>
</div>

<style>
    .menu-dropdown {
        background-color: #fff !important;
    }
</style>