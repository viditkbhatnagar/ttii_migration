<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="javascript: void(0);">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>
        </div>
    </div>
</div>
<!-- end page title -->
<div class="card" id="contactList">
    <div class="card-header">
        <form action="" method="get">
            <div class="row">
                <div class="col-lg-2">
                    <label for="from_date">Start Date:</label>
                    <div class="custom-dropdown">
                        <input type="date" class="form-control" id="from_date" name="from_date" value="<?php echo isset($_GET['from_date']) ? htmlspecialchars($_GET['from_date']) : date('Y-m-d'); ?>" required>
                    </div>
                </div>
                <div class="col-lg-2">
                    <label for="to_date">End Date:</label>
                    <div class="custom-dropdown">
                        <input type="date" class="form-control" id="to_date" name="to_date" value="<?php echo isset($_GET['to_date']) ? htmlspecialchars($_GET['to_date']) : date('Y-m-d'); ?>" required>
                    </div>
                </div>
                
                

                <div class="col-lg-2">
                    <!-- Apply Filter button -->
                    <button class="btn btn-success" type="submit" style="margin-top:28px;">Apply Filter</button>
                </div>
            </div>
        </form>
        <!--end row-->
    </div>
</div>
<div class="row">
    <div class="col-xxl-12">
        <div class="card">
            <div class="card-body">
                <div class="card-body">
                    <div class="table-responsive">
                        <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                            <thead>
                                <tr>
                                    <th style="width: 50px;">#</th>
                                    <th>User</th>
                                    <th>Date & Time</td>
                                    <th>Remarks</th>
                                    <th>Status</th>
                                    <th>Approver Remarks</th>

                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach($over_time_data as $key=> $over_time) { ?>
                                    <tr>
                                        <td><?=$key + 1?></td>
                                        <th><?=$employee_name[$over_time['user_id']] ?? ''?></th>
                                        <td><?= DateTime::createFromFormat('Y-m-d H:i:s', $over_time['start_time'])->format('d-m-Y g:i A')?> To <br><?= DateTime::createFromFormat('Y-m-d H:i:s', $over_time['end_time'])->format('d-m-Y g:i A')?></td>
                                        <th><?=$over_time['remarks']?></th>
                                        <td>
                                            <?php if($over_time['is_approved'] == 2){ ?>
                                                <span class="badge rounded-pill bg-success-subtle fs-11 text-success">Approved</span>
                                            <?php } else if($over_time['is_approved'] == 0){ ?>
                                                <span class="badge rounded-pill bg-danger-subtle fs-11 text-danger">Rejected</span>
                                            <?php } else if($over_time['is_approved'] == 1){ ?>
                                                <span class="badge rounded-pill bg-secondary-subtle fs-11 text-secondary">Waiting</span>
                                            <?php } ?>
                                        </td>
                                        <th>
                                            <?=$over_time['approved_remarks']?>
                                        </th>
                                      
                                      
                                    </tr>
                                <?php } ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>