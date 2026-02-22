<div class="app-menu navbar-menu">
    <!-- LOGO -->
    <div class="navbar-brand-box">
        <!-- Dark Logo-->
        <a href="<?= base_url('app/dashboard/index') ?>" class="logo logo-dark">
            <span class="logo-sm">
                <img src="<?=base_url()?>assets/app/images/ttiilmssmalllogo.png" alt="" class="m-1" height="50"  >
            </span>
            <span class="logo-lg">
                <img src="<?=base_url()?>assets/app/images/TTII-logo-land.png" alt="" class="m-1 mt-3"  height="50">
            </span>
        </a>
        <!-- Light Logo-->
        <a href="<?= base_url('app/dashboard/index') ?>" class="logo logo-light">
            <span class="logo-sm">
                <img src="<?=base_url()?>assets/app/images/ttiilmssmalllogo.png" alt="" height="50" style="padding: 0.5em;">
            </span>
            <span class="logo-lg">
                <img src="<?=base_url()?>assets/app/images/TTII-logo-land.png" alt="" height="50" style="padding: 0.5em;">
            </span>
        </a>
        <button type="button" class="btn btn-sm p-0 fs-20 header-item float-end btn-vertical-sm-hover" id="vertical-hover">
            <i class="ri-record-circle-line"></i>
        </button>
    </div>
                            <img src="<?=base_url()?>assets/app/images/TTII-logo-land.png"  alt="" height="50" class="ms-3 mb-3 d-md-none">
    <div id="scrollbar">
        <div class="container-fluid">

            <div id="two-column-menu">
            </div>
            <ul class="navbar-nav" id="navbar-nav">
                <li class="menu-title mb-4">
                    <!--<hr class="m-0 p-0"></span>-->
                </li>
                <li class="nav-item my-2">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'dashboard/index') ?>" href="<?= base_url('app/dashboard/index/') ?>">
                        <i class='bx bxs-dashboard fs-4'></i>   <span data-key="t-dashboards">Dashboard</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link  fs-4 <?php show_active_menu($page_name, 'dashboard/my_course') ?>" href="<?= base_url('app/course/my_course/') ?>">
                        <i class="ri-book-open-line"></i>   <span data-key="t-course">My Course</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'events/index') ?>" href="<?= base_url('app/events/index/') ?>">
                        <i class="ri-calendar-event-line"></i> <span data-key="t-course">Events</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'exams/calendar') ?>" href="<?= base_url('app/exams/calendar/') ?>">
                        <i class="ri-calendar-2-line"></i> <span data-key="t-course">Calendar</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'ai-mentor/index') ?>" href="<?//= base_url('app/ai-mentor/index/') ?>#">
                        <i class="ri-robot-line"></i> <span data-key="t-course">AI Mentor</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'live_class/index') ?>" href="<?= base_url('app/live_class/index/') ?>">
                        <i class="ri-live-line"></i> <span data-key="t-course">Live Class</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'exams/index') ?>" href="<?= base_url('app/exams/index/') ?>">
                        <i class="ri-file-list-3-line"></i> <span data-key="t-course">Exam</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'assignment/index') ?>" href="<?= base_url('app/assignment/index/') ?>">
                        <i class="ri-task-line"></i> <span data-key="t-course">Assignment</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'payment/index') ?>" href="<?= base_url('app/payment/index/') ?>">
                        <i class="ri-bank-card-line"></i> <span data-key="t-course">Payment</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'progress/index') ?>" href="<?= base_url('app/progress/index/') ?>">
                        <i class="ri-bar-chart-box-line"></i> <span data-key="t-course">Progress</span>
                    </a>
                </li>
                <li class="nav-item my-2 ">
                    <a class="nav-link menu-link fs-4 <?php show_active_menu($page_name, 'logout') ?>" href="<?=base_url('login/logout/')?>" style="color: #FB803D;">
                        <i class="ri-logout-box-line"></i> <span data-key="t-course">Logout</span>
                    </a>
                </li>
            </ul>
   
        <!-- Sidebar -->
<div style="width: 50%; max-width: 200px;">
    <div class="container">
        <style>
            /* Define the container */
            .container {
                container-type: inline-size; /* Makes it a query container */
                width: 100%; /* Allow it to shrink */
            }

            @container (max-width: 70px) {
                #aichatcard {
                    display: none;
                }
                #aichatforsmallwidth {
                    display: block;
                }
            }

            @container (min-width: 70px) {
                #aichatcard {
                    display: block;
                    width: 190px;
                }
                #aichatforsmallwidth {
                    display: none;
                }
            }

            .mycard {
                margin: 20px;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                text-align: center;
                background: linear-gradient(180deg, #FAEAE2 0%, #FAFCFE 100%);
            }

            .mycard h3 {
                margin-bottom: 15px;
                font-size: 20px;
                color: #333;
            }

            .mycard p {
                font-size: 12px;
                color: #666;
            }
        </style>

        <div class="card mycard" id="aichatcard">
            <img style="max-width: 60px; position: absolute; top: -28px; right: 10px;" 
                src="<?=base_url()?>assets/app/images/ttiirobot.png">
            <h3 class="mt-3">Support 24/7</h3>
            <p>Contact us any time</p>
            <a href="#" class="btn btn-primary">AI CHAT</a>
        </div>

        <img id="aichatforsmallwidth" style="max-width: 50px;" src="<?=base_url()?>assets/app/images/ttiirobot.png">
    </div>
</div>
     </div>

    </div>

    <div class="sidebar-background"></div>
</div>
<script>
    function addActiveClassToNavItems() {
    document.querySelectorAll(".nav-item").forEach(li => {
        const aTag = li.querySelector("a.nav-link");
        if (aTag && aTag.classList.contains("active")) {
            li.classList.add("myactive");
        }
    });
}

// Call the function on page load
document.addEventListener("DOMContentLoaded", addActiveClassToNavItems);

</script>
<style>
    .menu-dropdown {
        background-color: #fff !important;
    }
</style>