<!-- start page title -->
<div class="row">
    <div class="col-12">
        <div class="page-title-box d-sm-flex align-items-center justify-content-between">
            <h4 class="mb-sm-0"><?=$page_title ?? ''?></h4>

            <div class="page-title-right">
                <ol class="breadcrumb m-0">
                    <li class="breadcrumb-item"><a href="<?=base_url('admin/dashboard/index')?>">Dashboard</a></li>
                    <li class="breadcrumb-item active"><?=$page_title ?? ''?></li>
                </ol>
            </div>

        </div>
    </div>
</div>
<div class="row">
    <div class="col-lg-12">
        <div class="card">
            <div class="card-header">
                <div class="row">
                    <div class="col-8">
                        <h5 class="card-title mb-0"><?=$page_title ?? ''?></h5>
                    </div>

                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Name</th>
                        <th style="width: 120px;">Course</th>
                        <!--<th style="width: 120px;">Package</th>-->
                        <th style="width: 120px;">Enrolled Date</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                   
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                                // Create a DateTime object
                                $cdate = new \DateTime($list_item['created_at']);
                                // Format the date
                                $date = $cdate->format('M d, Y');
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?= $student[$list_item['user_id']] ?? '' ?></td>
                                    <td><?= $course[$list_item['course_id']] ?? '' ?></td>
                                    <!--<td><?//= $package[$list_item['package_id']] ?? '' ?></td>-->
                                    <td><?=$date?></td>

                                    <td>
                                        
                                         <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/enrol/delete/'.$list_item['id'])?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i>
                                                    </a>
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
    </div>
</div><!--end row-->





