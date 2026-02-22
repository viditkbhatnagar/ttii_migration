<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('app/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<!-- end page title -->
<div class="row">
    <div >
        <div class="tab-content text-muted">
            <div class="tab-pane active" id="nav-border-justified-overview" role="tabpanel">
                <div class="row mb-4">
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">ATTENDANCE REPORT</h4>
                                        <span class="text-muted fs-13">Tracks daily employee presence and time logged in office.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-success-subtle rounded fs-3">
                                            <i class="bx bxs-user-check text-success"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/attendance_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">APP USAGE</h4>
                                        <span class="text-muted fs-13">Monitors work hour inactivity for productivity assessment.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-info-subtle rounded fs-3">
                                            <i class="ri-calendar-check-line text-info"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/app_usage/index')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">PRODUCTIVE REPORT</h4>
                                        <span class="text-muted fs-13">Measures productivity by time spent on productive app usage.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-success-subtle rounded fs-3">
                                            <i class="bx bxs-right-top-arrow-circle text-success"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/reports/productive_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">UN PRODUCTIVE REPORT</h4>
                                        <span class="text-muted fs-13">Identifies time spent on non-work-related activities by employees.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-danger-subtle rounded fs-3">
                                            <i class="bx bxs-left-down-arrow-circle text-danger"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/reports/un_productive_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">EFFECTIVE REPORT</h4>
                                        <span class="text-muted fs-13">Evaluates effectiveness and efficiency of team's work performance.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-success-subtle rounded fs-3">
                                            <i class="bx bxs-badge-check text-success"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/reports/effective_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">DESK TIME REPORT</h4>
                                        <span class="text-muted fs-13">Monitors active and idle desk time during work hours.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-warning-subtle rounded fs-3">
                                            <i class="bx bxs-stopwatch text-warning"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/reports/desk_time_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">LATE REPORT</h4>
                                        <span class="text-muted fs-13">Analyzes instances of late arrivals to work by employees.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-danger-subtle rounded fs-3">
                                            <i class="bx bx-alarm-exclamation text-danger"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/reports/late_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">EARLY REPORT</h4>
                                        <span class="text-muted fs-13">Highlights occurrences of employees leaving earlier than scheduled times.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-danger-subtle rounded fs-3">
                                            <i class="bx bx-alarm-exclamation text-danger"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/reports/early_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">ABSENT REPORT</h4>
                                        <span class="text-muted fs-13">Documents days employees were not present at work.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-danger-subtle rounded fs-3">
                                            <i class="bx bxs-user-minus text-danger"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/reports/absent_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!--<div class="col-xl-4 col-md-6">-->
                    <!--    <div class="card card-animate">-->
                    <!--        <div class="card-body">-->
                    <!--            <div class="d-flex justify-content-between mt-1">-->
                    <!--                <div class="col-10">-->
                    <!--                    <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">IDLE REPORT</h4>-->
                    <!--                    <span class="text-muted fs-13">Assesses periods of inactivity during expected work hours.</span>-->
                    <!--                </div>-->
                    <!--                <div class="col-2 avatar-sm flex-shrink-0 mt-3">-->
                    <!--                    <span class="avatar-title bg-primary-subtle rounded fs-3">-->
                    <!--                        <i class="bx bxs-hourglass text-muted"></i>-->
                    <!--                    </span>-->
                    <!--                </div>-->
                    <!--            </div>-->
                    <!--            <div class="mt-4">-->
                    <!--                <a href="<?//=base_url('app/reports/idle_report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>-->
                    <!--            </div>-->
                    <!--        </div>-->
                    <!--    </div>-->
                    <!--</div>-->
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">IDLE TIME REPORT</h4>
                                        <span class="text-muted fs-13">Assesses periods of inactivity during expected work hours.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-primary-subtle rounded fs-3">
                                            <i class="bx bxs-hourglass text-muted"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/idle_time/report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-xl-4 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex justify-content-between mt-1">
                                    <div class="col-10">
                                        <h4 class="fs-16 fw-semibold ff-secondary mb-3 text-primary">PRIVATE TIME REPORT</h4>
                                        <span class="text-muted fs-13">Assesses inactivity during expected work hours.</span>
                                    </div>
                                    <div class="col-2 avatar-sm flex-shrink-0 mt-3">
                                        <span class="avatar-title bg-primary-subtle rounded fs-3">
                                            <i class="bx bx-time-five text-primary"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="mt-4">
                                    <a href="<?=base_url('app/private_time/report')?>" class="btn btn-md btn-primary float-end">VIEW<i class="ri-arrow-right-s-line align-middle ms-1 lh-1"></i></a>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
                <!--end row-->
            </div>
        </div>
    </div>
</div>

<style>
.col-10{
    height: 80px;
}
.nav-border-top-success .nav-link.active {
    color: #0ab39c;
    border-top-color: #0ab39c;
    background-color: #fff;
}
.pdf_section{
    text-align:center;
    margin-bottom:20px;
}
.pdf_section h6{
    padding-top:30px;
    padding-bottom:10px;
    color:#878A99;
}
.pdf_section img{
    width:9%;
}
</style>



