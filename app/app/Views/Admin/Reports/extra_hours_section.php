<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/css/select2.min.css">
<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.13/js/select2.min.js"></script>
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
                        <a class="nav-link" href="<?=base_url('app/reports/index/overview')?>">
                            OVERVIEW
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="<?=base_url('app/reports/index/employee')?>">
                            COMPARE BY EMPLOYEE
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="<?=base_url('app/reports/index/date')?>">
                            COMPARE BY DATE
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link active" href="<?=base_url('app/reports/index/hour')?>">
                            EXTRA HOURS
                        </a>
                    </li>
                </ul>
                
                <!--TEAM & EMPLOYEE SECTION-->
                <form id="filterForm" action="" method="post">
                    <dprimary_iv class="row m-4">
                        <div class="col-md-2">
                            <label for="export_period">Date Period:</label>
                            <div class="custom-dropdown">
                                <select class="form-control" id="export_period" name="export_period">
                                    <option value="yesterday" selected>Yesterday</option>
                                    <option value="previous_week">Previous Week</option>
                                    <option value="previous_month">Previous Month</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <label for="export_period">From Date:</label>
                            <div class="custom-dropdown">
                                <input type="date" class="form-control" id="primary_from_date" name="primary_from_date" value="<?php echo date('Y-m-d', strtotime('-1 day')); ?>" required readonly>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <label for="export_period">To Date:</label>
                            <div class="custom-dropdown">
                                <input type="date" class="form-control" id="primary_to_date" name="primary_to_date" value="<?php echo date('Y-m-d', strtotime('-1 day')); ?>" required readonly>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <label for="team_id">Team:</label>
                            <div class="custom-dropdown">
                                <select class="form-control team" id="primary_team_id" name="primary_team_id[]" multiple>
                                    <?php foreach($teams as $team){ ?>
                                        <option value="<?=$team['id']?>"><?=$team['title']?></option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <label for="employee_id">Employee:</label>
                            <div class="custom-dropdown">
                                <select class="form-control employee" id="primary_employee_id" name="primary_employee_id[]" multiple>
                                    <?php foreach($employees as $employee){ ?>
                                        <option value="<?=$employee['id']?>"><?=$employee['name']?></option>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <!-- Apply Filter button -->
                            <button class="btn btn-success" type="submit" style="margin-top:25px;">Apply Filter</button>
                        </div>
                    </div>
                </form>
                
                
                <div class="tab-content text-muted">
                    <div class="tab-pane active" id="nav-border-justified-extra" role="tabpanel">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
                                                                    <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="" class="avatar-xs rounded-circle">
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
    input[readonly] {
        cursor: not-allowed;
        background-color: #f5f5f5; /* You can customize the background color */
        /* You can add additional styles as needed */
    }
</style>


<script>
    $(document).ready(function() {
        $('.team, .employee').select2();
    });
    $(document).ready(function () {
        // Function to handle select box change event
        $("#export_period").change(function () {
            // Get the selected option value
            var selectedValue = $(this).val();

            // Disable date fields by default
            $("#primary_from_date, #primary_to_date").prop("readonly", true);

            // If 'Custom' is selected, enable date fields and make them required
            if (selectedValue === "custom") {
                $("#primary_from_date, #primary_to_date").prop("readonly", false).prop("required", true);
            } else {
                // Handle other options (Yesterday, Previous week, Previous month) here
                // You can customize the logic for each option based on your requirements
                // For simplicity, I'm setting default values for 'Yesterday', 'Previous week', and 'Previous month'
                var today = new Date();

                if (selectedValue === "yesterday") {
                    var yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    $("#primary_from_date").val(formatDate(yesterday));
                    $("#primary_to_date").val(formatDate(yesterday));
                } else if (selectedValue === "previous_week") {
                    var lastWeek = new Date(today);
                    lastWeek.setDate(today.getDate() - 7);
                    $("#primary_from_date").val(formatDate(lastWeek));
                    $("#primary_to_date").val(formatDate(today));
                } else if (selectedValue === "previous_month") {
                    var lastMonth = new Date(today);
                    lastMonth.setMonth(today.getMonth() - 1);
                    $("#primary_from_date").val(formatDate(lastMonth));
                    $("#primary_to_date").val(formatDate(today));
                }
            }
        });

        // Helper function to format date as 'YYYY-MM-DD'
        function formatDate(date) {
            var year = date.getFullYear();
            var month = String(date.getMonth() + 1).padStart(2, '0');
            var day = String(date.getDate()).padStart(2, '0');
            return year + '-' + month + '-' + day;
        }
    });
</script>
