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
    <div class="col-xxl-12">
        <div class="mb-2">
            <div class="row">
                <div class="col-3">
                    <input type="text" class="form-control flatpickr-input date-input-custom"
                           value="December 9, 2023"
                           data-provider="flatpickr" data-altFormat="F j, Y">
                </div>
            </div>
        </div>
        <div style="background-color: transparent!important;">
            <div class="pt-3">
                <!-- Nav tabs -->
                <ul class="nav nav-tabs nav-justified nav-border-top nav-border-top-success mb-3" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link active" data-bs-toggle="tab" href="#nav-border-justified-overview" role="tab" aria-selected="false">
                            OVERVIEW
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-bs-toggle="tab" href="#nav-border-justified-compare-employee" role="tab" aria-selected="false">
                            COMPARE BY EMPLOYEE
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-bs-toggle="tab" href="#nav-border-justified-compare-date" role="tab" aria-selected="false">
                            COMPARE BY DATE
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" data-bs-toggle="tab" href="#nav-border-justified-extra" role="tab" aria-selected="false">
                            EXTRA HOURS
                        </a>
                    </li>
                </ul>
                <div class="tab-content text-muted">
                    <div class="tab-pane active" id="nav-border-justified-overview" role="tabpanel">
                        <div class="pt-3">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">DESK TIME</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="8">0</span>h
                                                        <span class="counter-value" data-target="12">0</span>m
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->

                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">TIME AT WORK</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="8">0</span>h
                                                        <span class="counter-value" data-target="12">0</span>m
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->

                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">OFFLINE TIME</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-danger report-card-value">
                                                        <span>5:30</span>PM
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-danger-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-danger"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->

                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">PRODUCTIVITY</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="70">0</span>%
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->


                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">EFFECTIVENESS</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="100">0</span>%
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->

                            </div> <!-- end row-->
                            <hr>
                            <div class="row m-0">
                                <div class="card card-animate" style="height: 250px;">
                                    <div class="card-body">
                                        PRODUCTIVITY BAR
                                    </div>
                                </div>
                            </div>
                            <hr>
                            <div class="row">
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST PRODUCTIVE</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST UNPRODUCTIVE</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-danger">35%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-danger">35%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-danger">35%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-danger">35%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-danger">35%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST EFFECTIVE</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m of 8h 26m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">TOTAL DESK TIME</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">8h 15m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success">95%</span>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                            </div>
                            <hr>
                            <div class="row">
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">LATE</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            <?php
                                             $employees = $top_datas['late'];
                                             if(!empty($employees))
                                             {?>
                                            
                                            <ul class="list-group mb-1">
                                                  <?php
                                            $hours = 0;
                                            $minutes = 30;
                                           
                                            
                                            foreach($employees as $key => $val)
                                            {
                                             $totalMinutes = ($hours * 60) + $minutes;

                                                // Decrease by 15 minutes
                                                $totalMinutes += 10;
                                            
                                                // Convert back to hours and minutes for the next iteration
                                                $hours = floor($totalMinutes / 60);
                                                $minutes = $totalMinutes % 60;
                                            
                                            ?>
                                                
                                                
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0"><?=$val['name']?></h6>
                                                                    <!--<small class="text-muted"><?=$hours?>:<?=$minutes?>:10</small>-->
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                
                                            <?php
                                            if($key == 4)
                                            {
                                                break;
                                            }
                                            }
                                            ?>
                                                
                                                
                                            </ul>
                                            <!--<div class="text-end view-all p-1" style="display: block;">-->
                                            <!--    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                                            <!--        View all (10) <i class="ri-arrow-right-line align-middle"></i></button>-->
                                            <!--</div>-->
                                            <?php
                                             }
                                             else
                                             {
                                                 echo "No data found!";
                                             }?>
                                            
                                            
                                            
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">EARLY</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            
                                             <?php
                                             $employees = $top_datas['early_leaving'];
                                             if(!empty($employees))
                                             {?>
                                                <ul class="list-group mb-1">
                                                      <?php
                                                $hours = 0;
                                                $minutes = 30;
                                                
    
                                                foreach($employees as $key => $val)
                                                {
                                                 $totalMinutes = ($hours * 60) + $minutes;
    
                                                    // Decrease by 15 minutes
                                                    $totalMinutes += 10;
                                                
                                                    // Convert back to hours and minutes for the next iteration
                                                    $hours = floor($totalMinutes / 60);
                                                    $minutes = $totalMinutes % 60;
                                                
                                                ?>
                                                    
                                                    
                                                    <li class="list-group-item">
                                                        <div class="d-flex align-items-center">
                                                            <div class="flex-grow-1">
                                                                <div class="d-flex">
                                                                    <div class="flex-shrink-0 avatar-xs">
                                                                        <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
                                                                    </div>
                                                                    <div class="flex-shrink-0 ms-2">
                                                                        <h6 class="fs-14 mb-0"><?=$val['name']?></h6>
                                                                        <!--<small class="text-muted"><?=$hours?>:<?=$minutes?>:10</small>-->
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                    
                                                <?php
                                                if($key == 4)
                                                {
                                                    break;
                                                }
                                                }
                                                ?>
                                                    
                                                    
                                                </ul>
                                                <!--<div class="text-end view-all p-1" style="display: block;">-->
                                                <!--    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                                                <!--        View all (10) <i class="ri-arrow-right-line align-middle"></i></button>-->
                                                <!--</div>-->
                                            <?php
                                             }
                                             else
                                             {
                                                 echo "No data found!";
                                             }
                                             ?>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">ABSENT</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            
                                            <?php
                                             $employees = $top_datas['absent'];
                                             if(!empty($employees))
                                             {?>
                                             
                                                <ul class="list-group mb-1">
                                                      <?php
                                                $hours = 0;
                                                $minutes = 30;
                                                
                                                $employees = $top_datas['absent'];
                                                
                                                $empcount = sizeof($employees);
                                                
                                                foreach($employees as $key => $val)
                                                {
                                                    
                                                    
                                                 $totalMinutes = ($hours * 60) + $minutes;
    
                                                    // Decrease by 15 minutes
                                                    $totalMinutes += 10;
                                                
                                                    // Convert back to hours and minutes for the next iteration
                                                    $hours = floor($totalMinutes / 60);
                                                    $minutes = $totalMinutes % 60;
                                                
                                                ?>
                                                    
                                                    
                                                    <li class="list-group-item">
                                                        <div class="d-flex align-items-center">
                                                            <div class="flex-grow-1">
                                                                <div class="d-flex">
                                                                    <div class="flex-shrink-0 avatar-xs">
                                                                        <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
                                                                    </div>
                                                                    <div class="flex-shrink-0 ms-2">
                                                                        <h6 class="fs-14 mb-0"><?=$val['name']?></h6>
                                                                        <small class="text-muted">Absent</small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                    
                                                <?php
                                                    if($key == 4)
                                                    {
                                                        break;
                                                    }
                                                    
                                                }
                                                
                                                $bal = $empcount - 5;
                                                
                                                // print_r($empcount);
                                                
                                                ?>
                                                    
                                                    
                                                </ul>
                                                <?php
                                                if($bal != 0)
                                                {?>
                                                
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$bal?>) <i class="ri-arrow-right-line align-middle"></i></button>
                                                </div>
                                                <?php
                                                }
                                                
                                             }
                                             else
                                             {
                                                 echo "No data found!";
                                             }
                                             ?>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">IDLE IN DASHBOARD</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                             <ul class="list-group mb-1">
                                                  <?php
                                           
                                           
                                            
                                            $employees = $idle; 
                                            
                                            foreach($employees as $key => $val)
                                            {
                                               
                                            $seconds = $val['idle_time'];
                                            $hours = floor($seconds / 3600);
                                            $minutes = floor(($seconds % 3600) / 60);
                                            $formattedTime = sprintf("%02d:%02d", $hours, $minutes);
                                            
                                            list($hours, $minutes) = explode(':', $formattedTime);
                                            
                                            ?>
                                                
                                                
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0"><?=$val['name']?></h6>
                                                                    <small class="text-muted"><?=$hours?> : <?=$minutes?></small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                
                                            <?php
                                                if($key == 4)
                                                {
                                                    break;
                                                }
                                               
                                            }
                                            ?>
                                                
                                                
                                            </ul>
                                            <!--<div class="text-end view-all p-1" style="display: block;">-->
                                            <!--    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                                            <!--        View all (10) <i class="ri-arrow-right-line align-middle"></i></button>-->
                                            <!--</div>-->
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                            </div>        

                            <!--<div class="row">-->
                            <!--    <div class="col-4">-->
                            <!--        <div class="card card-height-100 card-animate">-->
                            <!--            <div class="card-header align-items-center d-flex">-->
                            <!--                <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">LATE</h5>-->
                            <!--            </div><!-- end card header -->-->
                            <!--            <div class="card-body p-1">-->
                            <!--                <ul class="list-group mb-1">-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:35:10</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:35:10</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:35:10</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:35:10</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:35:10</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                </ul>-->
                            <!--                <div class="text-end view-all p-1" style="display: block;">-->
                            <!--                    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                            <!--                        View all (10) <i class="ri-arrow-right-line align-middle"></i></button>-->
                            <!--                </div>-->
                            <!--            </div><!-- end card body -->-->
                            <!--        </div><!-- end card -->-->
                            <!--    </div>-->
                            <!--    <div class="col-4">-->
                            <!--        <div class="card card-height-100 card-animate">-->
                            <!--            <div class="card-header align-items-center d-flex">-->
                            <!--                <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">ABSENCE</h5>-->
                            <!--            </div><!-- end card header -->-->
                            <!--            <div class="card-body p-1">-->
                            <!--                <ul class="list-group mb-1">-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">Absent</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">Absent</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">Absent</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">Absent</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">Absent</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                </ul>-->
                            <!--                <div class="text-end view-all p-1" style="display: block;">-->
                            <!--                    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                            <!--                        View all (5) <i class="ri-arrow-right-line align-middle"></i></button>-->
                            <!--                </div>-->
                            <!--            </div><!-- end card body -->-->
                            <!--        </div><!-- end card -->-->
                            <!--    </div>-->
                            <!--    <div class="col-4">-->
                            <!--        <div class="card card-height-100 card-animate">-->
                            <!--            <div class="card-header align-items-center d-flex">-->
                            <!--                <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST OFFLINE TIME LOGGED</h5>-->
                            <!--            </div><!-- end card header -->-->
                            <!--            <div class="card-body p-1">-->
                            <!--                <ul class="list-group mb-1">-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:23:31</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:23:31</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:23:31</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:23:31</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                    <li class="list-group-item">-->
                            <!--                        <div class="d-flex align-items-center">-->
                            <!--                            <div class="flex-grow-1">-->
                            <!--                                <div class="d-flex">-->
                            <!--                                    <div class="flex-shrink-0 avatar-xs">-->
                            <!--                                        <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">-->
                            <!--                                    </div>-->
                            <!--                                    <div class="flex-shrink-0 ms-2">-->
                            <!--                                        <h6 class="fs-14 mb-0">John Doe</h6>-->
                            <!--                                        <small class="text-muted">1:23:31</small>-->
                            <!--                                    </div>-->
                            <!--                                </div>-->
                            <!--                            </div>-->
                            <!--                        </div>-->
                            <!--                    </li>-->
                            <!--                </ul>-->
                            <!--                <div class="text-end view-all p-1" style="display: block;">-->
                            <!--                    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                            <!--                        View all (10) <i class="ri-arrow-right-line align-middle"></i></button>-->
                            <!--                </div>-->
                            <!--            </div><!-- end card body -->-->
                            <!--        </div><!-- end card -->-->
                            <!--    </div>-->
                            <!--</div>-->
                            <div class="row">
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-success">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">PRODUCTIVE APPS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-0 bg-white">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">docs.google.com</h6>
                                                                    <small class="text-muted">80h 20m 24s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Slack</h6>
                                                                    <small class="text-muted">10h 22m 23s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Google Chrome</h6>
                                                                    <small class="text-muted">8h 50m 37s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">google.com</h6>
                                                                    <small class="text-muted">7h 56m 25s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Adobe Premiere Pro</h6>
                                                                    <small class="text-muted">4h 44m 17s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1 bg-white" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-warning">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">UNPRODUCTIVE APPS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-0 bg-white">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">instagram.com</h6>
                                                                    <small class="text-muted">3h 5m 32s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">chat.openai.com</h6>
                                                                    <small class="text-muted">1h 33m 49s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">web.whatsapp.com</h6>
                                                                    <small class="text-muted">1h 9m 50s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Windows Explorer</h6>
                                                                    <small class="text-muted">34m 38s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">quillbot.com</h6>
                                                                    <small class="text-muted">32m 44s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-dark">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">NEUTRAL APPS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-0 bg-white">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">spts.org</h6>
                                                                    <small class="text-muted">13h 49m 15s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">thecropsite.com</h6>
                                                                    <small class="text-muted">10h 31m 15s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">sci-tech-today.com</h6>
                                                                    <small class="text-muted">4h 37m 1s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Resolve</h6>
                                                                    <small class="text-muted">4h 13m 41s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Brave</h6>
                                                                    <small class="text-muted">4h 7m 9s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="tab-pane" id="nav-border-justified-compare-employee" role="tabpanel">
                        <div class="pt-3" id="compare_employee">
                            <div class="row">
                                <div class="col-6">
                                    <div class="mb-3">
                                        <div style="max-width: 260px; margin:auto;">
                                        </div>
                                    </div>
                                    <div class="row">

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">DESK TIME</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="8">0</span>h
                                                                <span class="counter-value" data-target="12">0</span>m
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">TIME AT WORK</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="8">0</span>h
                                                                <span class="counter-value" data-target="12">0</span>m
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">OFFLINE TIME</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-danger report-card-value">
                                                                <span>5:30</span>PM
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-danger-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-danger"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">PRODUCTIVITY</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="70">0</span>%
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->


                                        <div class="col-md-12">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">EFFECTIVENESS</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="100">0</span>%
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                    </div> <!-- end row-->
                                    <hr>
                                    <div class="row m-0">
                                        <div class="card card-animate" style="height: 200px;">
                                            <div class="card-body">
                                                PRODUCTIVITY BAR
                                            </div>
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST PRODUCTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST UNPRODUCTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST EFFECTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">TOTAL DESK TIME</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">LATE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">ABSENCE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (5) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-12">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST OFFLINE TIME LOGGED</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate card-success">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">PRODUCTIVE APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">docs.google.com</h6>
                                                                            <small class="text-muted">80h 20m 24s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Slack</h6>
                                                                            <small class="text-muted">10h 22m 23s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Google Chrome</h6>
                                                                            <small class="text-muted">8h 50m 37s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">google.com</h6>
                                                                            <small class="text-muted">7h 56m 25s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Adobe Premiere Pro</h6>
                                                                            <small class="text-muted">4h 44m 17s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1 bg-white" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate card-warning">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">UNPRODUCTIVE APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">instagram.com</h6>
                                                                            <small class="text-muted">3h 5m 32s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">chat.openai.com</h6>
                                                                            <small class="text-muted">1h 33m 49s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">web.whatsapp.com</h6>
                                                                            <small class="text-muted">1h 9m 50s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Windows Explorer</h6>
                                                                            <small class="text-muted">34m 38s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">quillbot.com</h6>
                                                                            <small class="text-muted">32m 44s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-12">
                                            <div class="card card-height-100 card-animate card-dark">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">NEUTRAL APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">spts.org</h6>
                                                                            <small class="text-muted">13h 49m 15s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">thecropsite.com</h6>
                                                                            <small class="text-muted">10h 31m 15s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">sci-tech-today.com</h6>
                                                                            <small class="text-muted">4h 37m 1s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Resolve</h6>
                                                                            <small class="text-muted">4h 13m 41s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Brave</h6>
                                                                            <small class="text-muted">4h 7m 9s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="mb-3">
                                        <div style="max-width: 260px; margin:auto">
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">DESK TIME</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="8">0</span>h
                                                                <span class="counter-value" data-target="12">0</span>m
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">TIME AT WORK</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="8">0</span>h
                                                                <span class="counter-value" data-target="12">0</span>m
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">OFFLINE TIME</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-danger report-card-value">
                                                                <span>5:30</span>PM
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-danger-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-danger"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">PRODUCTIVITY</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="70">0</span>%
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->


                                        <div class="col-md-12">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">EFFECTIVENESS</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="100">0</span>%
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                    </div> <!-- end row-->
                                    <hr>
                                    <div class="row m-0">
                                        <div class="card card-animate" style="height: 200px;">
                                            <div class="card-body">
                                                PRODUCTIVITY BAR
                                            </div>
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST PRODUCTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST UNPRODUCTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST EFFECTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">TOTAL DESK TIME</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">LATE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">ABSENCE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (5) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-12">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST OFFLINE TIME LOGGED</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate card-success">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">PRODUCTIVE APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">docs.google.com</h6>
                                                                            <small class="text-muted">80h 20m 24s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Slack</h6>
                                                                            <small class="text-muted">10h 22m 23s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Google Chrome</h6>
                                                                            <small class="text-muted">8h 50m 37s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">google.com</h6>
                                                                            <small class="text-muted">7h 56m 25s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Adobe Premiere Pro</h6>
                                                                            <small class="text-muted">4h 44m 17s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1 bg-white" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate card-warning">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">UNPRODUCTIVE APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">instagram.com</h6>
                                                                            <small class="text-muted">3h 5m 32s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">chat.openai.com</h6>
                                                                            <small class="text-muted">1h 33m 49s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">web.whatsapp.com</h6>
                                                                            <small class="text-muted">1h 9m 50s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Windows Explorer</h6>
                                                                            <small class="text-muted">34m 38s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">quillbot.com</h6>
                                                                            <small class="text-muted">32m 44s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-12">
                                            <div class="card card-height-100 card-animate card-dark">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">NEUTRAL APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">spts.org</h6>
                                                                            <small class="text-muted">13h 49m 15s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">thecropsite.com</h6>
                                                                            <small class="text-muted">10h 31m 15s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">sci-tech-today.com</h6>
                                                                            <small class="text-muted">4h 37m 1s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Resolve</h6>
                                                                            <small class="text-muted">4h 13m 41s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Brave</h6>
                                                                            <small class="text-muted">4h 7m 9s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div class="tab-pane" id="nav-border-justified-compare-date" role="tabpanel">
                        <div class="pt-3" id="compare_date">
                            <div class="row">
                                <div class="col-6">
                                    <div class="mb-3">
                                        <div style="max-width: 260px; margin:auto;">
                                            <input type="text" class="form-control flatpickr-input text-center date-input-custom"
                                                   value="December 9, 2023"
                                                   data-provider="flatpickr" data-altFormat="F j, Y">
                                        </div>
                                    </div>
                                    <div class="row">

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">DESK TIME</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="8">0</span>h
                                                                <span class="counter-value" data-target="12">0</span>m
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">TIME AT WORK</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="8">0</span>h
                                                                <span class="counter-value" data-target="12">0</span>m
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">OFFLINE TIME</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-danger report-card-value">
                                                                <span>5:30</span>PM
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-danger-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-danger"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">PRODUCTIVITY</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="70">0</span>%
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->


                                        <div class="col-md-12">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">EFFECTIVENESS</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="100">0</span>%
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                    </div> <!-- end row-->
                                    <hr>
                                    <div class="row m-0">
                                        <div class="card card-animate" style="height: 200px;">
                                            <div class="card-body">
                                                PRODUCTIVITY BAR
                                            </div>
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST PRODUCTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST UNPRODUCTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST EFFECTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">TOTAL DESK TIME</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">LATE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">ABSENCE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (5) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-12">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST OFFLINE TIME LOGGED</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate card-success">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">PRODUCTIVE APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">docs.google.com</h6>
                                                                            <small class="text-muted">80h 20m 24s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Slack</h6>
                                                                            <small class="text-muted">10h 22m 23s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Google Chrome</h6>
                                                                            <small class="text-muted">8h 50m 37s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">google.com</h6>
                                                                            <small class="text-muted">7h 56m 25s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Adobe Premiere Pro</h6>
                                                                            <small class="text-muted">4h 44m 17s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1 bg-white" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate card-warning">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">UNPRODUCTIVE APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">instagram.com</h6>
                                                                            <small class="text-muted">3h 5m 32s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">chat.openai.com</h6>
                                                                            <small class="text-muted">1h 33m 49s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">web.whatsapp.com</h6>
                                                                            <small class="text-muted">1h 9m 50s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Windows Explorer</h6>
                                                                            <small class="text-muted">34m 38s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">quillbot.com</h6>
                                                                            <small class="text-muted">32m 44s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-12">
                                            <div class="card card-height-100 card-animate card-dark">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">NEUTRAL APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">spts.org</h6>
                                                                            <small class="text-muted">13h 49m 15s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">thecropsite.com</h6>
                                                                            <small class="text-muted">10h 31m 15s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">sci-tech-today.com</h6>
                                                                            <small class="text-muted">4h 37m 1s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Resolve</h6>
                                                                            <small class="text-muted">4h 13m 41s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Brave</h6>
                                                                            <small class="text-muted">4h 7m 9s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                </div>
                                <div class="col-6">
                                    <div class="mb-3">
                                        <div style="max-width: 260px; margin:auto">
                                            <input type="text" class="form-control flatpickr-input text-center date-input-custom"
                                                   value="December 9, 2023"
                                                   data-provider="flatpickr" data-altFormat="F j, Y">
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">DESK TIME</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="8">0</span>h
                                                                <span class="counter-value" data-target="12">0</span>m
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">TIME AT WORK</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="8">0</span>h
                                                                <span class="counter-value" data-target="12">0</span>m
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">OFFLINE TIME</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-danger report-card-value">
                                                                <span>5:30</span>PM
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-danger-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-danger"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                        <div class="col-md-6">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">PRODUCTIVITY</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="70">0</span>%
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->


                                        <div class="col-md-12">
                                            <div class="card card-animate">
                                                <div class="card-body">
                                                    <div class="d-flex justify-content-between">
                                                        <div class="report-card-data">
                                                            <p class="fw-medium text-primary mb-0 report-card-label">EFFECTIVENESS</p>
                                                            <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                                <span class="counter-value" data-target="100">0</span>%
                                                            </h2>
                                                        </div>
                                                        <div>
                                                            <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-funds-line text-success"></i>
                                                        </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div> <!-- end card-->
                                        </div> <!-- end col-->

                                    </div> <!-- end row-->
                                    <hr>
                                    <div class="row m-0">
                                        <div class="card card-animate" style="height: 200px;">
                                            <div class="card-body">
                                                PRODUCTIVITY BAR
                                            </div>
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST PRODUCTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST UNPRODUCTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-danger">35%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST EFFECTIVE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m of 8h 26m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">TOTAL DESK TIME</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">8h 15m</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div class="flex-shrink-0">
                                                                    <span class="text-success">95%</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (65) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                    <hr>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">LATE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:35:10</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">ABSENCE</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">Absent</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (5) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-12">
                                            <div class="card card-height-100 card-animate">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST OFFLINE TIME LOGGED</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-1">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">John Doe</h6>
                                                                            <small class="text-muted">1:23:31</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                    <div class="row">
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate card-success">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">PRODUCTIVE APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">docs.google.com</h6>
                                                                            <small class="text-muted">80h 20m 24s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Slack</h6>
                                                                            <small class="text-muted">10h 22m 23s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Google Chrome</h6>
                                                                            <small class="text-muted">8h 50m 37s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">google.com</h6>
                                                                            <small class="text-muted">7h 56m 25s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Adobe Premiere Pro</h6>
                                                                            <small class="text-muted">4h 44m 17s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1 bg-white" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-6">
                                            <div class="card card-height-100 card-animate card-warning">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">UNPRODUCTIVE APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">instagram.com</h6>
                                                                            <small class="text-muted">3h 5m 32s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">chat.openai.com</h6>
                                                                            <small class="text-muted">1h 33m 49s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">web.whatsapp.com</h6>
                                                                            <small class="text-muted">1h 9m 50s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Windows Explorer</h6>
                                                                            <small class="text-muted">34m 38s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">quillbot.com</h6>
                                                                            <small class="text-muted">32m 44s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                        <div class="col-12">
                                            <div class="card card-height-100 card-animate card-dark">
                                                <div class="card-header align-items-center d-flex">
                                                    <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">NEUTRAL APPS</h5>
                                                </div><!-- end card header -->
                                                <div class="card-body p-0 bg-white">
                                                    <ul class="list-group mb-1">
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">spts.org</h6>
                                                                            <small class="text-muted">13h 49m 15s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">thecropsite.com</h6>
                                                                            <small class="text-muted">10h 31m 15s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">sci-tech-today.com</h6>
                                                                            <small class="text-muted">4h 37m 1s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Resolve</h6>
                                                                            <small class="text-muted">4h 13m 41s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                        <li class="list-group-item">
                                                            <div class="d-flex align-items-center">
                                                                <div class="flex-grow-1">
                                                                    <div class="d-flex">
                                                                        <div class="flex-shrink-0 avatar-xs">
                                                                            <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                        </div>
                                                                        <div class="flex-shrink-0 ms-2">
                                                                            <h6 class="fs-14 mb-0">Brave</h6>
                                                                            <small class="text-muted">4h 7m 9s</small>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    </ul>
                                                    <div class="text-end view-all p-1" style="display: block;">
                                                        <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                            View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                                    </div>
                                                </div><!-- end card body -->
                                            </div><!-- end card -->
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                    <div class="tab-pane" id="nav-border-justified-extra" role="tabpanel">
                        <div class="pt-3">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">DESK TIME</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="8">0</span>h
                                                        <span class="counter-value" data-target="12">0</span>m
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->

                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">EXTRA HOURS BEFORE WORK</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="8">0</span>h
                                                        <span class="counter-value" data-target="12">0</span>m
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->

                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">EXTRA HOURS AFTER WORK</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="2">0</span>h
                                                        <span class="counter-value" data-target="45">0</span>s
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-success"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->

                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">PRIVATE TIME</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-danger report-card-value">
                                                        <span class="counter-value" data-target="2">0</span>h
                                                        <span class="counter-value" data-target="45">0</span>s
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-danger-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-danger"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->


                                <div class="col-md-4">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">OFFLINE TIME</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-danger report-card-value">
                                                        <span class="counter-value" data-target="2">0</span>h
                                                        <span class="counter-value" data-target="45">0</span>s
                                                    </h2>
                                                </div>
                                                <div>
                                                    <div class="avatar-sm flex-shrink-0">
                                                        <span class="avatar-title bg-danger-subtle rounded-circle fs-2">
                                                            <i class="ri-time-line text-danger"></i>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div><!-- end card body -->
                                    </div> <!-- end card-->
                                </div> <!-- end col-->

                            </div> <!-- end row-->
                            <hr>
                            <div class="row m-0">
                                <div class="card card-animate" style="height: 250px;">
                                    <div class="card-body">
                                        PRODUCTIVITY BAR
                                    </div>
                                </div>
                            </div>
                            <hr>
                            <div class="row">
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST EXTRA HOURS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:35:10</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:35:10</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:35:10</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:35:10</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:35:10</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST EXTRA HOURS BEFORE WORK</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">Absent</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">Absent</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">Absent</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">Absent</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">Absent</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View all (5) <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">EXTRA HOURS AFTER WORK</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:23:31</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:23:31</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:23:31</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:23:31</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/users/avatar-2.jpg" alt="" class="avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">John Doe</h6>
                                                                    <small class="text-muted">1:23:31</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View all (10) <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-success">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">PRODUCTIVE APPS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-0 bg-white">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">docs.google.com</h6>
                                                                    <small class="text-muted">80h 20m 24s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Slack</h6>
                                                                    <small class="text-muted">10h 22m 23s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Google Chrome</h6>
                                                                    <small class="text-muted">8h 50m 37s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">google.com</h6>
                                                                    <small class="text-muted">7h 56m 25s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Adobe Premiere Pro</h6>
                                                                    <small class="text-muted">4h 44m 17s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1 bg-white" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-warning">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">UNPRODUCTIVE APPS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-0 bg-white">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">instagram.com</h6>
                                                                    <small class="text-muted">3h 5m 32s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">chat.openai.com</h6>
                                                                    <small class="text-muted">1h 33m 49s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">web.whatsapp.com</h6>
                                                                    <small class="text-muted">1h 9m 50s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Windows Explorer</h6>
                                                                    <small class="text-muted">34m 38s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">quillbot.com</h6>
                                                                    <small class="text-muted">32m 44s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-dark">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">NEUTRAL APPS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-0 bg-white">
                                            <ul class="list-group mb-1">
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">spts.org</h6>
                                                                    <small class="text-muted">13h 49m 15s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">thecropsite.com</h6>
                                                                    <small class="text-muted">10h 31m 15s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">sci-tech-today.com</h6>
                                                                    <small class="text-muted">4h 37m 1s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Resolve</h6>
                                                                    <small class="text-muted">4h 13m 41s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                                <li class="list-group-item">
                                                    <div class="d-flex align-items-center">
                                                        <div class="flex-grow-1">
                                                            <div class="d-flex">
                                                                <div class="flex-shrink-0 avatar-xs">
                                                                    <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                </div>
                                                                <div class="flex-shrink-0 ms-2">
                                                                    <h6 class="fs-14 mb-0">Brave</h6>
                                                                    <small class="text-muted">4h 7m 9s</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            </ul>
                                            <div class="text-end view-all p-1" style="display: block;">
                                                <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                    View detailed <i class="ri-arrow-right-line align-middle"></i></button>
                                            </div>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div><!-- end card-body -->
        </div>
    </div><!--end col-->
</div>
<!--end row-->

<style>
    .nav-tabs .nav-link{
        font-size: 17px; !important;
    }
    .report-card-label{
        font-size: 16px; !important;
    }
    .report-card-value{
        font-size: 30px !important;
    }
    .report-card-data{
        border-left: 5px solid #efefef; padding-left: 10px;
    }

    #compare_date .report-card-label, #compare_employee .report-card-label{
        font-size: 14px; !important;
    }
    #compare_date .report-card-value, #compare_employee .report-card-value{
        font-size: 24px !important;
    }

    .report-rank-card-title{
        font-size: 13px!important;
    }

    .application-image{
        max-width: 20px;height: auto;
    }
</style>



