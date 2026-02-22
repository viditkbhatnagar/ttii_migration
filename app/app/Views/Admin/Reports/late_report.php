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
<?php
if(!is_employee()){
    ?>
    <div class="row">
        <div class="col-xl-3 col-md-5">
            <a href="<?=base_url('app/reports/late_report/')?>">
                <div class="card card-animate <?=empty($team_id) ? 'card_active' : ''?>">
                    <div class="card-body">
                        <div class="d-flex justify-content-between mt-0">
                            <div class="align-items-start">
                                <h4 class="fw-semibold ff-secondary mb-2 text-primary" style="font-size:15px;">ALL TEAM</h4>
                                <span class="text-muted" style="font-size:11px;">VIEW MEMBERS</span>
                            </div>
                            <div class="avatar-sm flex-shrink-0 align-items-end">
                            <span class="avatar-title bg-success-subtle rounded fs-4">
                                <!--<i class="bx bx-folder-open text-info"></i>--><span class="text-info"><?=$total_members?></span>
                            </span>
                            </div>
                        </div>
                    </div>
                </div>
            </a>
        </div>
        <?php
        foreach($teams_list as $team){ ?>
            <div class="col-xl-3 col-md-5">
                <a href="<?=base_url('app/reports/late_report/'.$team['id'])?>">
                    <div class="card card-animate <?=$team_id == $team['id'] ? 'card_active' : ''?>">
                        <div class="card-body">
                            <div class="d-flex justify-content-between mt-0">
                                <div class="align-items-start">
                                    <h4 class="fw-semibold ff-secondary mb-2 text-primary" style="font-size:15px;"><?=strtoupper($team['title'])?></h4>
                                    <span class="text-muted" style="font-size:11px;">VIEW MEMBERS</span>
                                </div>
                                <div class="avatar-sm flex-shrink-0 align-items-end">
                                <span class="avatar-title bg-success-subtle rounded fs-4">
                                    <!--<i class="bx bx-folder-open text-info"></i>--><span class="text-info"><?=$team['member_count']?></span>
                                </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
            </div>
            <?php
        }
        ?>
    </div>
    <?php
}
?>

<div class="card" id="contactList">
    <div class="card-header">
        <div class="row">
            <div class="col-lg-6">
                <form action="" method="get">
                    <div class="row ">
                        <div class="col-lg-4">
                            <label for="from_date">From Date:</label>
                            <div class="custom-dropdown">
                                <input type="date" class="form-control" id="from_date" name="from_date" value="<?=$from_date?>" required>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <label for="to_date">To Date:</label>
                            <div class="custom-dropdown">
                                <input type="date" class="form-control" id="to_date" name="to_date" value="<?=$to_date?>" required>
                            </div>
                        </div>
                        <div class="col-lg-4">
                            <!-- Apply Filter button -->
                            <button class="btn btn-success" type="submit" style="margin-top:28px;">Apply Filter</button>
                        </div>
                    </div>
                    
                </form>
            </div>
            <div class="col-lg-6 text-end">
                <a href="<?=base_url('app/reports/all')?>" class="btn btn-md btn-outline-primary" style="margin-top:28px;"><i class="ri-arrow-go-back-line"></i> Back</a>
            </div>
        </div>
        <!--end row-->
    </div>
</div>
<div class="tab-pane" id="nav-border-justified-compare-employee" role="tabpanel">
    <div class="row mb-4">
        <div class="col-lg-12">
            <div class="card">
                <div class="card-body">
                    <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                        <thead>
                        <tr>
                            <th style="width: 50px;">#</th>
                            <th style="width: 50px;">Code</th>
                            <th style="width: 150px;">Name</th>
                            <th style="width: 120px;">Date</th>
                            <th style="width: 80px;">Time</th>
                        </tr>
                        </thead>
                        <tbody>
                            <?php
                            if(!empty($late_data))
                            { 
                                foreach($late_data as $key => $data)
                                { ?>
                            
                            <tr>
                                <td><?=$key + 1?></td>
                                <td>
                                    <?=$data['employee_code']?>
                                </td>
                                <td>
                                    <strong><?=$data['name']?></strong><br>
                                </td>
                                <td>
                                    <?=date('d-m-Y',strtotime($data['first_start_time']))?>
                                </td>
                                <td>
                                    <?=$data['difference']?>
                                </td>
                            </tr>
                            <?php
                                }
                            }
                            ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div><!-- end col -->
    </div>
</div>

<style>
    .view_team_members_btn{
        width: 200px; !important;
    }
    .card_active{
        border:2px solid #405189!important;
    }
</style>
