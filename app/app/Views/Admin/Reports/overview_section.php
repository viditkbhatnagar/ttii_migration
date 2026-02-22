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
        <div class="mb-2 d-none">
            <div class="row">
                <div class="col-3">
                    <input type="text" class="form-control flatpickr-input date-input-custom"
                           value="February 22, 2023"
                           data-provider="flatpickr" data-altFormat="F j, Y">
                </div>
            </div>
        </div>
        <div style="background-color: transparent!important;">
            <div class="pt-3">
                <!-- Nav tabs -->
                <ul class="nav nav-tabs nav-justified nav-border-top nav-border-top-success mb-3" role="tablist">
                    <li class="nav-item">
                        <a class="nav-link active" href="<?=base_url('app/reports/index/overview')?>">
                            OVERVIEW
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="<?=base_url('app/reports/employee')?>">
                            COMPARE BY EMPLOYEE
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="<?=base_url('app/reports/index/date')?>">
                            COMPARE BY DATE
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="<?=base_url('app/reports/index/hour')?>">
                            EXTRA HOURS
                        </a>
                    </li>
                </ul>
                
                <!--TEAM & EMPLOYEE SECTION-->
                <form id="filterForm" action="<?=base_url('app/reports/index/overview')?>" method="post">
                    <div class="row m-4">
                         <div class="col-md-2">
                            <label for="export_period">Date Period:</label>
                            <div class="custom-dropdown">
                                <select class="form-control" id="export_period" name="export_period">
                                    <option value="yesterday" selected <?php if(!empty($export_period) && $export_period=="yesterday") echo "selected" ?>>Yesterday</option>
                                    <option value="previous_week" <?php if(!empty($export_period) && $export_period=="previous_week") echo "selected" ?>>Previous Week</option>
                                    <option value="previous_month" <?php if(!empty($export_period) && $export_period=="previous_month") echo "selected" ?>>Previous Month</option>
                                    <option value="custom" <?php if(!empty($export_period) && $export_period=="custom") echo "selected" ?>>Custom</option>
                                </select>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <label for="export_period">From Date:</label>
                            <div class="custom-dropdown">
                                <input type="date" class="form-control" id="primary_from_date" name="from_date" value="<?= !empty($from_date) ? $from_date : date('Y-m-d', strtotime('-1 day'))?>" required readonly>
                            </div>
                        </div>
                        <div class="col-md-2">
                            <label for="export_period">To Date:</label>
                            <div class="custom-dropdown">
                                <input type="date" class="form-control" id="primary_to_date" name="to_date" value="<?= !empty($to_date) ? $to_date : date('Y-m-d', strtotime('-1 day'))?>" required readonly>
                            </div>
                        </div>
                     
                        
                        <div class="col-md-3">
                            <label for="team_id">Team:</label>
                            <div class="custom-dropdown">
                                
                                
                                <select class="form-control team select2" id="primary_team_id" name="team_id[]" multiple placeholder="Select Team">

                                    <?php foreach($teams as $team){ ?>
                                        <?php if(in_array($team['id'], $team_ids)) { ?>
                                            <option value="<?=$team['id']?>" selected><?=$team['title']?></option>
                                        <?php } else { ?>
                                            <option value="<?=$team['id']?>"><?=$team['title']?></option>
                                        <?php } ?>
                                    <?php } ?>
                                </select>
                            </div>
                        </div>
                        
                        <div class="col-md-3">
                            <label for="employee_id">Employee:</label>
                            <div class="custom-dropdown">
                                <select class="form-control employee select2" id="primary_employee_id" name="employee_id[]" multiple >
                                    <?php
                                    if(!empty($team_ids))
                                    {?>
                                        <?php foreach($employees as $employee){ ?>
                                            <?php if(in_array($employee['id'], $user_ids)) { ?>
                                                <option value="<?=$employee['id']?>" selected><?=$employee['name']?></option>
                                            <?php } else { ?>
                                                <option value="<?=$employee['id']?>"><?=$employee['name']?></option>
                                            <?php } ?>
                                        <?php } ?>
                                     
                                     
                                    <?php   
                                    }
                                    ?>
                                    
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
                    <div class="tab-pane active" id="nav-border-justified-overview" role="tabpanel">
                        <div class="pt-3">
                            <div class="row">
                                <div class="col-md-3">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">DESK TIME</p>
                                                     <?php
                                        $seconds = $total_desktime;
                                        $hours = floor($seconds / 3600);
                                        $minutes = floor(($seconds % 3600) / 60);
                                        $remainingSeconds = $seconds % 60;
                                        
                                        ?>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="<?=$hours?>">0</span>h
                                                        <span class="counter-value" data-target="<?=$minutes?>">0</span>m
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

                                <div class="col-md-3">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">TIME AT WORK</p>
                                                    
                                                    <?php
                                         $seconds = $total_time_at_work;
                                        $hours = floor($seconds / 3600);
                                        $minutes = floor(($seconds % 3600) / 60);
                                        $formattedTime = sprintf("%02d:%02d", $hours, $minutes);
                                        
                                        list($hours, $minutes) = explode(':', $formattedTime);

                                        
                                        ?>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="<?=$hours?>">0</span>h
                                                        <span class="counter-value" data-target="<?=$minutes?>">0</span>m
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

                                <div class="col-md-3">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                    <p class="fw-medium text-primary mb-0 report-card-label">OFFLINE TIME</p>
                                                    
                                                       <?php
                                        $seconds = $total_idletime;
                                        $hours = floor($seconds / 3600);
                                        $minutes = floor(($seconds % 3600) / 60);
                                        $remainingSeconds = $seconds % 60;
                                        
                                        ?>
                                                    

                                                    
                                                    
                                                    
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-danger report-card-value">
                                                        <!--<span>5:30</span>-->
                                                         <span class="counter-value" data-target="<?=$hours?>">0</span>h
                                                        <span class="counter-value" data-target="<?=$minutes?>">0</span>m
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

                                <div class="col-md-3">
                                    <div class="card card-animate">
                                        <div class="card-body">
                                            <div class="d-flex justify-content-between">
                                                <div class="report-card-data">
                                                      <?php
                                            if($total_time_at_work != 0)
                                            {
                                                $productivity_rate = intval($total_productive_time/$total_time_at_work*100);
                                            }
                                            else
                                            {
                                                $productivity_rate = 0;
                                            }
                                            ?>
                                                    <p class="fw-medium text-primary mb-0 report-card-label">PRODUCTIVITY</p>
                                                    <h2 class="mt-2 ff-secondary fw-semibold text-success report-card-value">
                                                        <span class="counter-value" data-target="<?=$productivity_rate?>">0</span>%
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


                                <div class="col-md-4 d-none">
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
                            <div class="row m-0 d-none">
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
                                        <?php
                                        if(!empty($most_productive))
                                        {?>
                                           
                                            <ul class="list-group mb-1">
                                                
                                            <?php
                                            
                                            $most_productive_count  = sizeof($most_productive);
                                           
                                            foreach($most_productive as $key => $val)
                                            {
                                                
                                                ///////////////////producive time///////////////
                                                $seconds = $val['total_duration'];
                                                $hours = floor($seconds / 3600);
                                                $minutes = floor(($seconds % 3600) / 60);
                                                $formattedTime = sprintf("%02d:%02d", $hours, $minutes);
                                                
                                                list($hours, $minutes) = explode(':', $formattedTime);
                                                
                                               //////////////////total work /////////////////
                                               
                                                $tot_seconds = $val['total_work'];
                                                $tot_hours = floor($tot_seconds / 3600);
                                                $tot_minutes = floor(($tot_seconds % 3600) / 60);
                                                $tot_formattedTime = sprintf("%02d:%02d", $tot_hours, $tot_minutes);
                                                
                                                list($tot_hours, $tot_minutes) = explode(':', $tot_formattedTime);

                                            
                                            
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
                                                                    <small class="text-muted"><?=$hours?>h <?=$minutes?>m of <?=$tot_hours?>h <?=$tot_minutes?>m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success"><?=$val['pr_percentage']?>%</span>
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
                                            <?php
                                            if($most_productive_count > 5)
                                            {?>
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <a href="<?=base_url()?>app/reports/productive_report" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$most_productive_count?>) <i class="ri-arrow-right-line align-middle"></i></a>
                                                </div>
                                            <?php
                                            }
                                            
                                        }
                                        else
                                        {
                                            echo "No data found";
                                        }
                                            ?>
                                            
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST UNPRODUCTIVE</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                        <?php
                                        if(!empty($most_unproductive))
                                        {?>
                                           
                                            <ul class="list-group mb-1">
                                                
                                            <?php
                                            
                                            $most_unproductive_count  = sizeof($most_unproductive);
                                           
                                            foreach($most_unproductive as $key => $val)
                                            {
                                                
                                                ///////////////////producive time///////////////
                                                $seconds = $val['total_duration'];
                                                $hours = floor($seconds / 3600);
                                                $minutes = floor(($seconds % 3600) / 60);
                                                $formattedTime = sprintf("%02d:%02d", $hours, $minutes);
                                                
                                                list($hours, $minutes) = explode(':', $formattedTime);
                                                
                                               //////////////////total work /////////////////
                                               
                                                $tot_seconds = $val['total_work'];
                                                $tot_hours = floor($tot_seconds / 3600);
                                                $tot_minutes = floor(($tot_seconds % 3600) / 60);
                                                $tot_formattedTime = sprintf("%02d:%02d", $tot_hours, $tot_minutes);
                                                
                                                list($tot_hours, $tot_minutes) = explode(':', $tot_formattedTime);

                                            
                                            
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
                                                                    <small class="text-muted"><?=$hours?>h <?=$minutes?>m of <?=$tot_hours?>h <?=$tot_minutes?>m</small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success"><?=$val['pr_percentage']?>%</span>
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
                                            <?php
                                            if($most_unproductive_count > 5)
                                            {?>
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <a href="<?=base_url()?>app/reports/un_productive_report" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$most_unproductive_count?>) <i class="ri-arrow-right-line align-middle"></i></a>
                                                </div>
                                            <?php
                                            }
                                            
                                        }
                                        else
                                        {
                                            echo "No data found";
                                        }
                                            ?>
                                            
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">MOST EFFECTIVE</h5>
                                        </div><!-- end card header -->
                                         <div class="card-body p-1">
                                        <?php
                                        if(!empty($most_effective))
                                        {?>
                                           
                                            <ul class="list-group mb-1">
                                                
                                            <?php
                                            
                                            $most_effective_count  = sizeof($most_effective);
                                           
                                            foreach($most_effective as $key => $val)
                                            {
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

                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success"><?=$val['effectiveness']?>%</span>
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
                                            <?php
                                            if($most_effective_count > 5)
                                            {?>
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <a href="<?=base_url()?>app/reports/effective_report" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$most_effective_count?>) <i class="ri-arrow-right-line align-middle"></i></a>
                                                </div>
                                            <?php
                                            }
                                            
                                        }
                                        else
                                        {
                                            echo "No data found";
                                        }
                                            ?>
                                            
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-3">
                                    <div class="card card-height-100 card-animate">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">TOTAL DESK TIME</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-1">
                                        <?php
                                        if(!empty($desktime_data))
                                        {?>
                                           
                                            <ul class="list-group mb-1">
                                                
                                            <?php
                                            
                                            $desktime_data_count  = sizeof($desktime_data);
                                           
                                            foreach($desktime_data as $key => $val)
                                            {
                                                
                                                ///////////////////producive time///////////////
                                                $seconds = $val['total_desktime'];
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
                                                                    <small class="text-muted"><?=$hours?>h <?=$minutes?>m </small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="flex-shrink-0">
                                                            <span class="text-success"></span>
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
                                            <?php
                                            if($desktime_data_count > 5)
                                            {?>
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <a href="<?=base_url()?>app/reports/desk_time_report" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$desktime_data_count?>) <i class="ri-arrow-right-line align-middle"></i></a>
                                                </div>
                                            <?php
                                            }
                                            
                                        }
                                        else
                                        {
                                            echo "No data found";
                                        }
                                            ?>
                                            
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
                                              $empcount = sizeof($employees);
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
                                                                    <small class="text-muted"><?=$val['difference']?></small>
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
                                             <?php
                                                if($empcount > 5)
                                                { ?>
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <a href="<?=base_url('app/reports/late_report')?>" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$empcount?>) <i class="ri-arrow-right-line align-middle"></i></a>
                                                </div>
                                                <?php
                                                }
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
                                             
                                               $empcount = sizeof($employees);
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
                                                                        <small class="text-muted"><?=$val['difference']?></small>
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
                                                <?php
                                                if($empcount > 5)
                                                { ?>
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <a href="<?=base_url('app/reports/early_report')?>" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$empcount?>) <i class="ri-arrow-right-line align-middle"></i></a>
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
                                                

                                                // print_r($empcount);
                                                
                                                ?>
                                                    
                                                    
                                                </ul>
                                                <?php
                                                if($empcount > 5)
                                                {?>
                                                
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <a href="<?=base_url('app/reports/absent_report')?>" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$empcount?>) <i class="ri-arrow-right-line align-middle"></i></a>
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
                                            
                                            <?php
                                            $employees = $top_datas['idle'];
                                            if(!empty($employees))
                                            { ?>
                                             <ul class="list-group mb-1">
                                                  <?php
                                           
                                           
                                        

                                                $empcount = sizeof($employees);
                                            
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
                                             <?php
                                                  if($empcount > 5)
                                                {?>
                                                
                                                <div class="text-end view-all p-1" style="display: block;">
                                                    <a href="<?=base_url('app/reports/idle_report')?>" class="btn btn-sm btn-soft-primary waves-effect waves-light">
                                                        View all (<?=$empcount?>) <i class="ri-arrow-right-line align-middle"></i></a>
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
                            </div>        
    

                        
                        
                            <div class="row">
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-success">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">PRODUCTIVE APPS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-0 bg-white">
                                            
                                            <?php
                                            if(!empty($productive_apps))
                                            { ?>
                                          
                                            <ul class="list-group mb-1">
                                                
                                                <?php
                                                foreach($productive_apps as $key => $val)
                                                { 
                                                    $seconds = $val['total_duration'];
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
                                                                        <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                    </div>
                                                                    <div class="flex-shrink-0 ms-2">
                                                                        <h6 class="fs-14 mb-0"><?=$val['title']?></h6>
                                                                        <small class="text-muted"><?=$hours?>h <?=$minutes?>m </small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                <?php
                                                }
                                                ?>
                                            </ul>
                                            
                                            
                                            <!--<div class="text-end view-all p-1 bg-white" style="display: block;">-->
                                            <!--    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                                            <!--        View detailed <i class="ri-arrow-right-line align-middle"></i></button>-->
                                            <!--</div>-->
                                            
                                            
                                            <?php
                                            }
                                            else
                                            {
                                                echo "<span style='color:black;'>No data found</span>";
                                            }
                                            ?>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-warning">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">UNPRODUCTIVE APPS</h5>
                                        </div><!-- end card header -->
                                        <div class="card-body p-0 bg-white">
                                            
                                            <?php
                                            if(!empty($unproductive_apps))
                                            { ?>
                                          
                                            <ul class="list-group mb-1">
                                                
                                                <?php
                                                foreach($unproductive_apps as $key => $val)
                                                { 
                                                    $seconds = $val['total_duration'];
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
                                                                        <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                    </div>
                                                                    <div class="flex-shrink-0 ms-2">
                                                                        <h6 class="fs-14 mb-0"><?=$val['title']?></h6>
                                                                        <small class="text-muted"><?=$hours?>h <?=$minutes?>m </small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                <?php
                                                }
                                                ?>
                                            </ul>
                                            
                                            
                                            <!--<div class="text-end view-all p-1 bg-white" style="display: block;">-->
                                            <!--    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                                            <!--        View detailed <i class="ri-arrow-right-line align-middle"></i></button>-->
                                            <!--</div>-->
                                            
                                            
                                            <?php
                                            }
                                             else
                                            {
                                                echo "<span style='color:black;'>No data found</span>";
                                            }
                                            ?>
                                        </div><!-- end card body -->
                                    </div><!-- end card -->
                                </div>
                                <div class="col-4">
                                    <div class="card card-height-100 card-animate card-dark">
                                        <div class="card-header align-items-center d-flex">
                                            <h5 class="card-title mb-0 flex-grow-1 report-rank-card-title">NEUTRAL APPS</h5>
                                        </div><!-- end card header -->
                                         <div class="card-body p-0 bg-white">
                                            
                                            <?php
                                            if(!empty($nuetral_apps))
                                            { ?>
                                          
                                            <ul class="list-group mb-1">
                                                
                                                <?php
                                                foreach($nuetral_apps as $key => $val)
                                                { 
                                                    $seconds = $val['total_duration'];
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
                                                                        <img src="<?=base_url()?>assets/app/images/icons/application.png" alt="" class="application-image avatar-xs rounded-circle">
                                                                    </div>
                                                                    <div class="flex-shrink-0 ms-2">
                                                                        <h6 class="fs-14 mb-0"><?=$val['title']?></h6>
                                                                        <small class="text-muted"><?=$hours?>h <?=$minutes?>m </small>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </li>
                                                <?php
                                                }
                                                ?>
                                            </ul>
                                            
                                            
                                            <!--<div class="text-end view-all p-1 bg-white" style="display: block;">-->
                                            <!--    <button type="button" class="btn btn-sm btn-soft-primary waves-effect waves-light">-->
                                            <!--        View detailed <i class="ri-arrow-right-line align-middle"></i></button>-->
                                            <!--</div>-->
                                            
                                            
                                            <?php
                                            }
                                            else
                                            {
                                                echo "<span style='color:black;'>No data found</span>";
                                            }
                                            ?>
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

   var selectElement = document.getElementById("primary_team_id");
    selectElement.setAttribute("placeholder", "Select Team");

var base_url = '<?=base_url('app/')?>';
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
        
        
        $('#primary_team_id').change(function() {
        var teamIds = $(this).val(); // Get selected team ids
            $.ajax({
                type: 'POST',
                url: base_url+'Advanced_report/getEmployeesByTeam', // Adjust the URL as per your routes
                data: {
                    team_ids: teamIds
                },
                dataType: 'json',
                success: function(response) {
                    // Clear existing options
                    $('#primary_employee_id').empty();
                    // Add new options
                    $.each(response, function(index, employee) {
                        $('#primary_employee_id').append('<option value="' + employee.user_id + '">' + employee.user_name + '</option>');
                    });
                }
            });
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
