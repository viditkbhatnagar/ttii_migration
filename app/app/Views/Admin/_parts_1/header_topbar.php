<header id="page-topbar">
    <div class="layout-width">
        <div class="navbar-header" style="background-color: #8f2774 !important;">
            <div class="d-flex">
                <!-- LOGO -->
                <div class="navbar-brand-box horizontal-logo" style="background-color: #8f2774 !important;">
                    <a href="<?=base_url('admin/dashboard/index')?>" class="logo logo-dark  mt-3">
                        <span class="logo-sm">
                            <img src="<?=base_url()?>assets/app/images/logo-sm.png" alt="" height="22">
                        </span>
                        <span class="logo-lg">
                            <img src="<?=base_url(get_site_logo())?>" alt="" height="17">
                        </span>
                    </a>

                    <a href="<?=base_url('admin/dashboard/index')?>" class="logo logo-light">
                        <span class="logo-sm">
                            <img src="<?=base_url()?>assets/app/images/logo-sm.png" alt="" height="22">
                        </span>
                        <span class="logo-lg">
                            <img src="<?=base_url(get_site_logo())?>" alt="" height="17">
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

               
               
            </div>

            <div class="d-flex align-items-center">

                <div class="dropdown d-md-none topbar-head-dropdown header-item">
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

                <div class="dropdown topbar-head-dropdown ms-1 header-item d-none" >
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
                                        <img src="<?=base_url()?>assets/app/images/brands/github.png" alt="Github">
                                        <span>GitHub</span>
                                    </a>
                                </div>
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/app/images/brands/bitbucket.png" alt="bitbucket">
                                        <span>Bitbucket</span>
                                    </a>
                                </div>
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/app/images/brands/dribbble.png" alt="dribbble">
                                        <span>Dribbble</span>
                                    </a>
                                </div>
                            </div>

                            <div class="row g-0">
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/app/images/brands/dropbox.png" alt="dropbox">
                                        <span>Dropbox</span>
                                    </a>
                                </div>
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/app/images/brands/mail_chimp.png" alt="mail_chimp">
                                        <span>Mail Chimp</span>
                                    </a>
                                </div>
                                <div class="col">
                                    <a class="dropdown-icon-item" href="#!">
                                        <img src="<?=base_url()?>assets/app/images/brands/slack.png" alt="slack">
                                        <span>Slack</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <!--<div class="ms-1 header-item d-none d-sm-flex">-->
                <!--    <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" data-toggle="fullscreen">-->
                <!--        <i class='bx bx-fullscreen fs-22'></i>-->
                <!--    </button>-->
                <!--</div>-->

                <!--<div class="ms-1 header-item d-none d-sm-flex" style="display: none!important;">-->
                <!--    <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle light-dark-mode">-->
                <!--        <i class='bx bx-moon fs-22'></i>-->
                <!--    </button>-->
                <!--</div>-->

                <div class="dropdown topbar-head-dropdown ms-1 header-item d-none" id="notificationDropdown">
                    <button type="button" class="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" id="page-header-notifications-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="outside" aria-haspopup="true" aria-expanded="false">
                        <i class='bx bx-bell fs-22'></i>
                        <!--<span class="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">3<span class="visually-hidden">unread messages</span></span>-->
                    </button>
                    <div class="dropdown-menu dropdown-menu-lg dropdown-menu-end p-0" aria-labelledby="page-header-notifications-dropdown">

                        <div class="dropdown-head bg-primary bg-pattern rounded-top">
                            <div class="p-3">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <h6 class="m-0 fs-16 fw-semibold text-white"> Notifications </h6>
                                    </div>
                                    <div class="col-auto dropdown-tabs">
                                        <!--<span class="badge bg-light-subtle text-body fs-13"> 4 New</span>-->
                                    </div>
                                </div>
                            </div>

                        </div>

                        <div class="tab-content position-relative" id="notificationItemsTabContent2">
                            <div class="tab-pane fade show active py-2 ps-2" id="all-noti-tab" role="tabpanel">
                                <div data-simplebar style="max-height: 300px;" class="pe-2">
                                    <!--<div class="text-reset notification-item d-block dropdown-item position-relative">-->
                                    <!--    <div class="d-flex">-->
                                    <!--        <div class="avatar-xs me-3 flex-shrink-0">-->
                                    <!--                <span class="avatar-title bg-info-subtle text-info rounded-circle fs-16">-->
                                    <!--                    <i class="ri-notification-2-line"></i>-->
                                    <!--                </span>-->
                                    <!--        </div>-->
                                    <!--        <div class="flex-grow-1">-->
                                    <!--            <a href="#!" class="stretched-link">-->
                                    <!--                <h6 class="mt-0 mb-2 lh-base">Your Elite author Graphic Optimization reward is ready!</h6>-->
                                    <!--            </a>-->
                                    <!--            <p class="mb-0 fs-11 fw-medium text-uppercase text-muted">-->
                                    <!--                <span><i class="mdi mdi-clock-outline"></i> Just 30 sec ago</span>-->
                                    <!--            </p>-->
                                    <!--        </div>-->
                                    <!--    </div>-->
                                    <!--</div>-->
                                    <!--<div class="text-reset notification-item d-block dropdown-item position-relative">-->
                                    <!--    <div class="d-flex">-->
                                    <!--        <div class="avatar-xs me-3 flex-shrink-0">-->
                                    <!--                <span class="avatar-title bg-info-subtle text-info rounded-circle fs-16">-->
                                    <!--                    <i class="ri-notification-2-line"></i>-->
                                    <!--                </span>-->
                                    <!--        </div>-->
                                    <!--        <div class="flex-grow-1">-->
                                    <!--            <a href="#!" class="stretched-link">-->
                                    <!--                <h6 class="mt-0 mb-2 lh-base">Your Elite author Graphic Optimization reward is ready!</h6>-->
                                    <!--            </a>-->
                                    <!--            <p class="mb-0 fs-11 fw-medium text-uppercase text-muted">-->
                                    <!--                <span><i class="mdi mdi-clock-outline"></i> Just 30 sec ago</span>-->
                                    <!--            </p>-->
                                    <!--        </div>-->
                                    <!--    </div>-->
                                    <!--</div>-->
                                    <!--<div class="text-reset notification-item d-block dropdown-item position-relative">-->
                                    <!--    <div class="d-flex">-->
                                    <!--        <div class="avatar-xs me-3 flex-shrink-0">-->
                                    <!--                <span class="avatar-title bg-info-subtle text-info rounded-circle fs-16">-->
                                    <!--                    <i class="ri-notification-2-line"></i>-->
                                    <!--                </span>-->
                                    <!--        </div>-->
                                    <!--        <div class="flex-grow-1">-->
                                    <!--            <a href="#!" class="stretched-link">-->
                                    <!--                <h6 class="mt-0 mb-2 lh-base">Your Elite author Graphic Optimization reward is ready!</h6>-->
                                    <!--            </a>-->
                                    <!--            <p class="mb-0 fs-11 fw-medium text-uppercase text-muted">-->
                                    <!--                <span><i class="mdi mdi-clock-outline"></i> Just 30 sec ago</span>-->
                                    <!--            </p>-->
                                    <!--        </div>-->
                                    <!--    </div>-->
                                    <!--</div>-->
                                    <!--<div class="text-reset notification-item d-block dropdown-item position-relative">-->
                                    <!--    <div class="d-flex">-->
                                    <!--        <div class="avatar-xs me-3 flex-shrink-0">-->
                                    <!--                <span class="avatar-title bg-info-subtle text-info rounded-circle fs-16">-->
                                    <!--                    <i class="ri-notification-2-line"></i>-->
                                    <!--                </span>-->
                                    <!--        </div>-->
                                    <!--        <div class="flex-grow-1">-->
                                    <!--            <a href="#!" class="stretched-link">-->
                                    <!--                <h6 class="mt-0 mb-2 lh-base">Your Elite author Graphic Optimization reward is ready!</h6>-->
                                    <!--            </a>-->
                                    <!--            <p class="mb-0 fs-11 fw-medium text-uppercase text-muted">-->
                                    <!--                <span><i class="mdi mdi-clock-outline"></i> Just 30 sec ago</span>-->
                                    <!--            </p>-->
                                    <!--        </div>-->
                                    <!--    </div>-->
                                    <!--</div>-->

                                    <!--<div class="my-3 text-center view-all">-->
                                    <!--    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                                    <!--        View All Notifications <i class="ri-arrow-right-line align-middle"></i></button>-->
                                    <!--</div>-->
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
 
                <div class="dropdown ms-sm-3 header-item topbar-user" style="background-color: #f19ab1;">
                    <button type="button" class="btn" id="page-header-user-dropdown" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                        <span class="d-flex align-items-center">
                            <!--<img class="rounded-circle header-profile-user" src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="Header Avatar">-->
                            <?php if(valid_file(get_user_profile())){ ?>
                                <img src="<?=base_url(get_file(get_user_profile()))?>" id="user-profile-img" class="rounded-circle header-profile-user" alt="user-profile-image">
                            <?php }else{ ?>
                                <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" id="user-profile-img" class="rounded-circle header-profile-user" alt="user-profile-image">
                            <?php } ?>
                            <span class="text-start ms-xl-2">
                                <span class="d-none d-xl-inline-block ms-1 fw-medium user-name-text"><?=get_user_name()?></span>
                                <span class="d-none d-xl-block ms-1 fs-12 user-name-sub-text"><?=get_role_title()?></span>
                            </span>
                        </span>
                    </button>
                    <div class="dropdown-menu dropdown-menu-end">
                        <!-- item-->
                        <h6 class="dropdown-header">Welcome <?=get_user_name()?>!</h6>
                        <a class="dropdown-item" href="javascript:void(0);"><i class="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i> <span class="align-middle"><?=get_user_name()?></span></a>
                        <!--<a class="dropdown-item" href="<?//=base_url('admin/profile/index/')?>"><i class="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i> <span class="align-middle">Profile</span></a>-->
                        <div class="dropdown-divider"></div>
                        <!--<a class="dropdown-item" href="<?=base_url('admin/profile/index/')?>"><i class="mdi mdi-cog-outline text-muted fs-16 align-middle me-1"></i> <span class="align-middle">Settings</span></a>-->
                        <a class="dropdown-item" id="logout" href="<?=base_url('home/logout')?>"><i class="mdi mdi-logout text-muted fs-16 align-middle me-1"></i> <span class="align-middle" data-key="t-logout">Logout</span></a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>