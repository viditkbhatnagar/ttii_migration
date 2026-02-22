<header id="page-topbar">
    <div class="layout-width">
        <div class="navbar-header" style="background: #FAF9F6;">
            <div class="d-flex">
                <!-- LOGO -->
                <div class="navbar-brand-box horizontal-logo">
                    <a href="<?=base_url('app/dashboard/index')?>" class="logo logo-dark">
                        <span class="logo-sm">
                            <img src="<?=base_url(get_site_logo())?>" alt="" height="22">
                        </span>
                        <span class="logo-lg">
                            <img src="<?=base_url(get_site_logo())?>" alt="" height="50">
                        </span>
                    </a>

                    <a href="<?=base_url('app/dashboard/index')?>" class="logo logo-light">
                        <span class="logo-sm">
                            <img src="<?=base_url(get_site_logo())?>" alt="" height="22">
                        </span>
                        <span class="logo-lg">
                            <img src="<?=base_url(get_site_logo())?>" alt="" height="50">
                        </span>
                    </a>
                </div>

                <button type="button" class="btn btn-sm px-3 fs-16 header-item vertical-menu-btn topnav-hamburger" id="topnav-hamburger-icon">
                    <span class="hamburger-icon">
                        <span></span>
                        <span></span>
                        <span></span>
                    </span>
                </button>

                <!-- App Search-->
                <form class="app-search d-none">
                    <div class="position-relative">
                        <input type="text" class="form-control" placeholder="Search..." autocomplete="off" id="search-options" value="">
                        <span class="mdi mdi-magnify search-widget-icon"></span>
                        <span class="mdi mdi-close-circle search-widget-icon search-widget-icon-close d-none" id="search-close-options"></span>
                    </div>
                    <div class="dropdown-menu dropdown-menu-lg" id="search-dropdown">
                        <div data-simplebar style="max-height: 320px;">
                            <!-- item-->
                            <div class="dropdown-header">
                                <h6 class="text-overflow text-muted mb-0 text-uppercase">Suggested Searches</h6>
                            </div>

                            <div class="dropdown-item bg-transparent text-wrap">
                                <a href="index.html" class="btn btn-soft-secondary btn-sm rounded-pill">how to setup <i class="mdi mdi-magnify ms-1"></i></a>
                                <a href="index.html" class="btn btn-soft-secondary btn-sm rounded-pill">buttons <i class="mdi mdi-magnify ms-1"></i></a>
                            </div>
                            <!-- item-->
                            <div class="dropdown-header mt-2">
                                <h6 class="text-overflow text-muted mb-1 text-uppercase">Suggested Pages</h6>
                            </div>

                            <!-- item-->
                            <a href="javascript:void(0);" class="dropdown-item notify-item">
                                <i class="ri-bubble-chart-line align-middle fs-18 text-muted me-2"></i>
                                <span>Analytics Dashboard</span>
                            </a>

                            <!-- item-->
                            <a href="javascript:void(0);" class="dropdown-item notify-item">
                                <i class="ri-lifebuoy-line align-middle fs-18 text-muted me-2"></i>
                                <span>Help Center</span>
                            </a>

                            <!-- item-->
                            <a href="javascript:void(0);" class="dropdown-item notify-item">
                                <i class="ri-user-settings-line align-middle fs-18 text-muted me-2"></i>
                                <span>My account settings</span>
                            </a>

                            <!-- item-->
                            <div class="dropdown-header mt-2">
                                <h6 class="text-overflow text-muted mb-2 text-uppercase">Members</h6>
                            </div>

                            <div class="notification-list">
                                <!-- item -->
                                <a href="javascript:void(0);" class="dropdown-item notify-item py-2">
                                    <div class="d-flex">
                                        <img src="<?=base_url()?>assets/admin/images/users/avatar-2.jpg" class="me-3 rounded-circle avatar-xs" alt="user-pic">
                                        <div class="flex-grow-1">
                                            <h6 class="m-0">Angela Bernier</h6>
                                            <span class="fs-11 mb-0 text-muted">Manager</span>
                                        </div>
                                    </div>
                                </a>
                                <!-- item -->
                                <a href="javascript:void(0);" class="dropdown-item notify-item py-2">
                                    <div class="d-flex">
                                        <img src="<?=base_url()?>assets/admin/images/users/avatar-3.jpg" class="me-3 rounded-circle avatar-xs" alt="user-pic">
                                        <div class="flex-grow-1">
                                            <h6 class="m-0">David Grasso</h6>
                                            <span class="fs-11 mb-0 text-muted">Web Designer</span>
                                        </div>
                                    </div>
                                </a>
                                <!-- item -->
                                <a href="javascript:void(0);" class="dropdown-item notify-item py-2">
                                    <div class="d-flex">
                                        <img src="<?=base_url()?>assets/admin/images/users/avatar-5.jpg" class="me-3 rounded-circle avatar-xs" alt="user-pic">
                                        <div class="flex-grow-1">
                                            <h6 class="m-0">Mike Bunch</h6>
                                            <span class="fs-11 mb-0 text-muted">React Developer</span>
                                        </div>
                                    </div>
                                </a>
                            </div>
                        </div>

                        <div class="text-center pt-3 pb-1">
                            <a href="pages-search-results.html" class="btn btn-primary btn-sm">View Search Results <i class="ri-arrow-right-line ms-1"></i></a>
                        </div>
                    </div>
                </form>
            </div>

            <div class="d-flex align-items-center ">

                <div class="dropdown topbar-head-dropdown header-item d-none">
                    <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" id="page-header-search-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <i class="bx bx-search fs-22"></i>
                    </button>
                    <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" aria-labelledby="page-header-search-dropdown">
                        <form class="p-3">
                            <div class="form-group m-0">
                                <div class="input-group">
                                    <input type="text" class="form-control" placeholder="Search ..." aria-label="Recipient's username">
                                    <button class="btn btn-primary" type="submit"><i class="mdi mdi-magnify"></i></button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="dropdown topbar-head-dropdown ms-1 header-item d-none">
                    <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <i class='bx bx-category-alt fs-22'></i>
                    </button>
                    <div class="dropdown-menu dropdown-menu-lg p-0 dropdown-menu-end">
                        <div class="p-3 border-top-0 border-start-0 border-end-0 border-dashed border">
                            <div class="row align-items-center">
                                <div class="col">
                                    <h6 class="m-0 fw-semibold fs-15"> Web Apps </h6>
                                </div>
                                <div class="col-auto">
                                    <a href="#!" class="btn btn-sm btn-soft-info"> View All Apps
                                        <i class="ri-arrow-right-s-line align-middle"></i></a>
                                </div>
                            </div>
                        </div>

                        <div class="p-2">
                            <div class="row g-0">
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/admin/images/brands/github.png" alt="Github">
                                        <span>GitHub</span>
                                    </a>
                                </div>
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/admin/images/brands/bitbucket.png" alt="bitbucket">
                                        <span>Bitbucket</span>
                                    </a>
                                </div>
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/admin/images/brands/dribbble.png" alt="dribbble">
                                        <span>Dribbble</span>
                                    </a>
                                </div>
                            </div>

                            <div class="row g-0">
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/admin/images/brands/dropbox.png" alt="dropbox">
                                        <span>Dropbox</span>
                                    </a>
                                </div>
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/admin/images/brands/mail_chimp.png" alt="mail_chimp">
                                        <span>Mail Chimp</span>
                                    </a>
                                </div>
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/admin/images/brands/slack.png" alt="slack">
                                        <span>Slack</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div class="ms-1 header-item d-none">
                    <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" data-toggle="fullscreen">
                        <i class='bx bx-fullscreen fs-22'></i>
                    </button>
                </div>

                <div class="ms-1 header-item d-none" style="display: none!important;">
                    <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle light-dark-mode">
                        <i class='bx bx-moon fs-22'></i>
                    </button>
                </div>
                
                <?php if(get_role_id() != 1){ ?>
                    <div class="dropdown topbar-head-dropdown ms-1 header-item d-none" id="notificationDropdown">
                        <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" id="page-header-notifications-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-haspopup="true" aria-expanded="false">
                            <i class='bx bx-bell fs-22'></i>
                            <span class="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger"><span class="visually-hidden">unread messages</span></span>
                        </button>
                        <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" aria-labelledby="page-header-notifications-dropdown">
    
                            <div class="dropdown-head bg-primary bg-pattern rounded-top">
                                <div class="p-3">
                                    <div class="row align-items-center">
                                        <div class="col">
                                            <h6 class="m-0 fs-16 fw-semibold text-white"> Notifications </h6>
                                        </div>
                                        <!--<div class="col-auto dropdown-tabs">-->
                                        <!--    <span class="badge bg-light-subtle text-body fs-13"> <?//=get_notifications()->getNumRows() ?? 0;?> New</span>-->
                                        <!--</div>-->
                                    </div>
                                </div>
    
                            </div>
                            
                            <div class="tab-content position-relative d" id="notificationItemsTabContent">
                                <div class="tab-pane fade show active py-2 ps-2" id="all-noti-tab" role="tabpanel">
                                    
    
                                </div>
                            </div>
                        </div>
                    </div>
                <?php } ?>

                    
                    <!--maximise icon-->
                        <li class="nav-item list-unstyled"> 
                            <a id="maximize-btn" class="nav-link menu-link <?= show_active_menu($page_name, 'global_calender/index') ?>" >
                                <i class= "ri-fullscreen-line text-dark fs-4 pe-3"></i>
                                
                                <!--<span data-key="t-dashboards" class="text-light">Global Calendar</span>-->
                            </a>
                        </li>


                <!--chat support icon-->
                    <?php if (has_permission('notification/index')): ?>
                        <li class="nav-item list-unstyled"> 
                            <a class="nav-link menu-link <?= show_active_menu($page_name, 'notification/index') ?>" 
                               href="<?= base_url('centre/notification/index/') ?>">
                                 <i class="ri-notification-line text-dark fs-4 pe-3"></i>
                                
                                <!--<span data-key="t-dashboards" class="text-light">Global Calendar</span>-->
                            </a>
                        </li>
                    <?php endif; ?>

                    <!--chat support icon-->
                    <?php if (has_permission('support/index')): ?>
                        <li class="nav-item list-unstyled"> 
                            <a class="nav-link menu-link <?= show_active_menu($page_name, 'support/index') ?>" 
                               href="<?= base_url('centre/support/index/') ?>" >
                                 <i class="ri-chat-1-line text-dark fs-4 pe-3"></i>
                            </a>
                        </li>
                    <?php endif; ?>

                    <li class="nav-item list-unstyled"> 
                            <a class="nav-link menu-link" 
                               href="<?= base_url('login/logout/') ?>">
                                 <i class="mdi mdi-logout text-muted fs-16 align-middle me-1"></i>
                            </a>
                        </li>

                <div class="dropdown ms-sm-3 header-item topbar-user" style="background: #FAF9F6;">
                    <button type="button" class="btn" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <span class="d-flex align-items-center">
                            <!--<img class="rounded-circle header-profile-user" src="<?=base_url()?>assets/admin/images/users/avatar-1.jpg" alt="Header Avatar">-->
                            <span class="text-start ms-xl-2">
                                <span class="d-none d-xl-inline-block ms-1 fw-medium user-name-text text-dark"><?=get_user_name()?></span>
                                <span class="d-none d-xl-block ms-1 fs-12 user-name-sub-text text-dark"><?=get_role_title()?></span>
                            </span>
                        </span>
                    </button>
                    <div class="dropdown-menu dropdown-menu-end">
                        <!-- item-->
                        <h6 class="dropdown-header"><?=get_user_name()?>!</h6>
                        <a class="dropdown-item d-none" href="<?= base_url('app/profile/index/').get_user_id()?>"><i class="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i> <span class="align-middle">Profile</span></a>
                        <div class="dropdown-divider"></div>
                        <!--<a class="dropdown-item" href="pages-profile-settings.html"><i class="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i> <span class="align-middle">Settings</span></a>-->
                        <a class="dropdown-item" href="<?=base_url('login/logout/')?>"><i class="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span class="align-middle" data-key="t-logout">Logout</span></a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>