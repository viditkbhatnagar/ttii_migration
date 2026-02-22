<div class="app-menu navbar-menu" style="background:#8f2774;">
    <!-- LOGO -->
    <div class="navbar-brand-box" style="margin-top: 10px;">
        <!-- Dark Logo-->
        <a href="<?=base_url('admin/dashboard/index')?>" class="logo logo-dark">
            <span class="logo-sm" style="line-height:0px">
                <img src="<?=get_image_url(17)?>" alt="" height="50">
                <span style="font-size: 8px; font-weight: 500; white-space: nowrap;">
                    <?= get_settings('system_name') ?>
                </span>
            </span>
            <span class="logo-lg">
                <img src="<?=get_image_url(19)?>" alt="" height="50">
            </span>
        </a>
        <!-- Light Logo-->
        <a href="<?=base_url('admin/dashboard/index')?>" class="logo logo-light">
            <span class="logo-sm">
                <img src="<?=get_image_url(19)?>" alt="" height="50">
            </span>
            <span class="logo-lg">
            
                <!--<img src="<?=get_image_url(19)?>" alt="" height="50" style="filter: brightness(0) invert(1);">-->
            </span>
        </a>
        <div class="system-name" style="font-size: 10px; font-weight: 500;">
            <!--<?= get_settings('system_name') ?>-->
        </div>
        <button type="button" class="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover" id="vertical-hover">
            <i class="ri-record-circle-line"></i>
        </button>
    </div>

    <div id="scrollbar" style="margin-top: 10px;">
        <div class="container-fluid">

            <div id="two-column-menu"></div>

            <ul class="navbar-nav" id="navbar-nav">


                    <li class="nav-item mt-2">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'dashboard/index')?>" href="<?=base_url('admin/dashboard/index')?>">
                            <i class="ri-dashboard-2-line"></i> <span data-key="t-analytics">Dashboard</span>
                        </a>
                    </li>
                    
                    
                     <?php
                        if (has_permission('enrol/index')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link" href="#sidebarPage4" data-bs-toggle="collapse" role="button"
                                   aria-expanded="false" aria-controls="sidebarPage4">
                                    <i class="ri-pie-chart-line"></i> <span data-key="t-pages">Learner Management</span>
                                </a>
                                <div class="collapse menu-dropdown <?php show_report_menu($page_name) ?>" id="sidebarPage4">
                                    <ul class="nav nav-sm flex-column">
                                        
                                                <li class="nav-item">
                                                    <a href="<?=base_url('admin/students/applications')?>" class="nav-link <?php show_active_menu($page_name, 'students/applications')?>" data-key="t-gallery">Applications</a>
                                                </li>
                                                <li class="nav-item">
                                                    <a href="<?=base_url('admin/students/applications')?>" class="nav-link <?php show_active_menu($page_name, 'students/index')?>" data-key="t-gallery">Students</a>
                                                </li>
                                    </ul>
                                </div>
                            </li>
                    <?php } ?>
                    
          
        
                    
                  <?php
                   if (has_permission('centres/index')){
                        ?>
                        <li class="nav-item">
                            <a class="nav-link menu-link <?php show_active_menu($page_name, 'centres/index')?>" href="<?=base_url('admin/centres/index')?>">
                                <i class="ri-mac-line"></i> <span data-key="t-employee">Centres</span>
                            </a>
                        </li>
                    <?php } 
                    if (has_permission('course/index')){
                        ?>
                        <li class="nav-item">
                            <a class="nav-link menu-link <?php show_active_menu($page_name, 'course/index')?>" href="<?=base_url('admin/course/index')?>">
                                <i class="ri-mac-line"></i> <span data-key="t-employee">Courses</span>
                            </a>
                        </li>
                    <?php } 
                    if (has_permission('students/index')){
                        ?>
                        <li class="nav-item d-none">
                            <a class="nav-link menu-link <?php show_active_menu($page_name, 'students/index')?>" href="<?=base_url('admin/students/index')?>">
                                <i class="ri-team-line"></i> <span data-key="t-analytics">Students</span>
                            </a>
                        </li>
                    <?php } 
                    if (has_permission('instructor/index')){
                        ?>
                        <li class="nav-item">
                            <a class="nav-link menu-link <?php show_active_menu($page_name, 'instructor/index')?>" href="<?=base_url('admin/instructor/index')?>">
                                <i class="ri-team-line"></i> <span data-key="t-analytics">Instructors</span>
                            </a>
                        </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('question/bulk_upload')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'question/bulk_upload')?>" href="<?=base_url('admin/question/bulk_upload')?>">
                                    <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Question Bulk Upload</span>
                                </a>
                            </li>
                    <?php } ?>
                    
             
                    
                    <?php
                        if (has_permission('exam/index')){
                            ?>
                    <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'exam/index')?>" href="<?=base_url('admin/exam/index')?>">
                            <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Exam</span>
                        </a>
                    </li>
                    <?php
                        }
                        if (has_permission('question_bank/index')){
                            ?>
                    <li class="nav-item ">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'question_bank/index')?>" href="<?=base_url('admin/question_bank/index')?>">
                            <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Question Bank</span>
                        </a>
                    </li>
                    <?php } ?>
                    
                      <?php
                        if (has_permission('assignment/index')){
                            ?>
                     <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'assignment/index')?>" href="<?=base_url('admin/assignment/index')?>">
                            <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Assignments</span>
                        </a>
                    </li>
                    <?php } ?>
                    
              
                    <?php
                        if (has_permission('demo_video/index')){
                            ?>
                     <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'demo_video/index')?>" href="<?=base_url('admin/demo_video/index')?>">
                            <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Demo Videos</span>
                        </a>
                    </li>
                    <?php } ?>
                    
                    
                       <?php
                        if (has_permission('feed/index')){
                            ?>
                     <li class="nav-item">
                        <a class="nav-link menu-link <?php show_active_menu($page_name, 'feed/index')?>" href="<?=base_url('admin/feed/index')?>">
                            <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Feeds</span>
                        </a>
                    </li>
                    <?php } ?>
                    
                    
                    
                    
                    <?php
                        if (has_permission('feed/index')){
                            ?>
                             <li class="nav-item d-none">
                                <a class="nav-link menu-link" href="#sidebarPage3" data-bs-toggle="collapse" role="button"
                                   aria-expanded="false" aria-controls="sidebarPage3">
                                    <i class="ri-pie-chart-line"></i> <span data-key="t-pages">Feed</span>
                                </a>
                                <div class="collapse menu-dropdown <?php show_report_menu($page_name) ?>" id="sidebarPage3">
                                    <ul class="nav nav-sm flex-column">
                                        
                                                <li class="nav-item">
                                                    <a href="<?=base_url('admin/feed/index')?>" class="nav-link <?php show_active_menu($page_name, 'feed/index')?>" data-key="t-gallery">Feed</a>
                                                </li>
                                                <li class="nav-item">
                                                    <a href="<?=base_url('admin/feed_category/index')?>" class="nav-link <?php show_active_menu($page_name, 'feed_category/index')?>" data-key="t-gallery">Feed Category</a>
                                                </li>
                                    </ul>
                                </div>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('live_class/index')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'live_class/index')?>" href="<?=base_url('admin/live_class/index')?>">
                                    <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Live Class</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('events/index')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'events/index')?>" href="<?=base_url('admin/events/index')?>">
                                    <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Events</span>
                                </a>
                            </li>
                    <?php } ?>
                    
             
                    
                    <?php
                        if (has_permission('stories/index')){
                            ?>
                            <li class="nav-item d-none">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'stories/index')?>" href="<?=base_url('admin/stories/index')?>">
                                    <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Stories</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('notification/index')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'notification/index')?>" href="<?=base_url('admin/notification/index')?>">
                                    <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Notification</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('review/index')){
                            ?>
                            <li class="nav-item d-none">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'review/index')?>" href="<?=base_url('admin/review/index')?>">
                                    <i class="ri-calendar-check-line"></i> <span data-key="t-analytics">Review</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('review/index')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'banners/index')?>" href="<?=base_url('admin/banners/index')?>">
                                    <i class="ri-gallery-line"></i> <span data-key="t-analytics">Banner</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('user_queries/index')){
                            ?>
                            <li class="nav-item d-none">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'user_queries/index')?>" href="<?=base_url('admin/user_queries/index')?>">
                                    <i class="ri-file-copy-2-line"></i> <span data-key="t-analytics">User Queries</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('enrol/index')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link" href="#sidebarPage4" data-bs-toggle="collapse" role="button"
                                   aria-expanded="false" aria-controls="sidebarPage4">
                                    <i class="ri-pie-chart-line"></i> <span data-key="t-pages">Enrolment</span>
                                </a>
                                <div class="collapse menu-dropdown <?php show_report_menu($page_name) ?>" id="sidebarPage4">
                                    <ul class="nav nav-sm flex-column">
                                        
                                                <li class="nav-item">
                                                    <a href="<?=base_url('admin/enrol/index')?>" class="nav-link <?php show_active_menu($page_name, 'enrol/index')?>" data-key="t-gallery">Enrol History</a>
                                                </li>
                                                <li class="nav-item">
                                                    <a href="<?=base_url('admin/enrol/enrol_student')?>" class="nav-link <?php show_active_menu($page_name, 'enrol/enrol_student')?>" data-key="t-gallery">Enrol a Student</a>
                                                </li>
                                    </ul>
                                </div>
                            </li>
                    <?php } ?>
                    
          
        
                    
                    <?php
                        if (has_permission('report/index')){
                            ?>
                            <li class="nav-item d-none">
                                <a class="nav-link menu-link" href="#sidebarPage5" data-bs-toggle="collapse" role="button"
                                   aria-expanded="false" aria-controls="sidebarPage5">
                                    <i class="ri-pie-chart-line"></i> <span data-key="t-pages">Reports</span>
                                </a>
                                <div class="collapse menu-dropdown <?php show_report_menu($page_name) ?>" id="sidebarPage5">
                                    <ul class="nav nav-sm flex-column">
                                        <li class="nav-item d-none">
                                            <a href="<?=base_url('admin/report/question')?>" class="nav-link <?php show_active_menu($page_name, 'report/question')?>" data-key="t-gallery">Question Report</a>
                                        </li>
                                        <li class="nav-item  d-none">
                                            <a href="<?=base_url('admin/exam_report/index')?>" class="nav-link <?php show_active_menu($page_name, 'exam_report/index')?>" data-key="t-gallery">Exam Report</a>
                                        </li>
                                        <li class="nav-item d-none">
                                            <a href="<?=base_url('admin/report/student')?>" class="nav-link <?php show_active_menu($page_name, 'report/student')?>" data-key="t-gallery">Student Report</a>
                                        </li>
                                        <li class="nav-item  d-none">
                                            <a href="<?=base_url('admin/live_report/index')?>" class="nav-link <?php show_active_menu($page_name, 'live_report/index')?>" data-key="t-gallery">Live Report</a>
                                        </li>
                                        
                                        <li class="nav-item">
                                            <a href="<?=base_url('admin/lesson_files/user_reports')?>" class="nav-link <?php show_active_menu($page_name, 'lesson_files/user_reports')?>" data-key="t-gallery">Lesson File Report</a>
                                        </li>
                                             
                                           
                                    </ul>
                                </div>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('settings/system')){
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
                                    </ul>
                                </div>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('packages/index')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'packages/index')?>" href="<?=base_url('admin/packages/index')?>">
                                    <i class="ri-award-fill"></i> <span data-key="t-analytics">Package & Pricing</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('packages/index')){
                            ?>
                            <li class="nav-item d-none">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'coupon_code/index')?>" href="<?=base_url('admin/coupon_code/index')?>">
                                    <i class="ri-cake-2-line"></i> <span data-key="t-analytics">Coupon Code</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('payments/index')){
                            ?>
                            <li class="nav-item">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'payments/index')?>" href="<?=base_url('admin/payments/index')?>">
                                    <i class="ri-mac-line"></i> <span data-key="t-employee">Payments</span>
                                </a>
                            </li>
                    <?php } ?>
                    
                    <?php
                        if (has_permission('settings/app_version')){
                            ?>
                             <li class="nav-item">
                                <a class="nav-link menu-link <?php show_active_menu($page_name, 'settings/app_version')?>" href="<?=base_url('admin/settings/app_version')?>">
                                    <i class="ri-mac-line"></i> <span data-key="t-employee">App Version</span>
                                </a>
                            </li>
                    <?php }?>
                    

            </ul>
        </div>
        <!-- Sidebar -->
    </div>
    <div class="sidebar-background"></div>
</div>
<!-- Left Sidebar End -->
<!-- Vertical Overlay-->
<div class="vertical-overlay"></div>