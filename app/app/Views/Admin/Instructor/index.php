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
                    <div class="col-4">
                        <button class="btn btn-md btn-primary rounded-pill float-end"
                                onclick="show_ajax_modal('<?=base_url('admin/instructor/ajax_add/')?>', 'Add Instructor')">
                            <i class="mdi mdi-plus"></i>
                            Add <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle" style="width:100%">
                    <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th style="width: 150px;">Name</th>
                        <th style="width: 120px;">Phone</th>
                        <th style="width: 120px;">Email</th>
                        <th style="width: 120px;">OTP</th>
                        <th style="width: 120px;">Course</th>
                        <th style="width: 120px;" class="d-none">Students</th>
                        <th style="width: 100px;">Action</th>
                    </tr>
                    </thead>
                    <tbody>
                    <?php
                        if (isset($list_items)){
                            foreach ($list_items as $key => $list_item){
                                ?>
                                <tr>
                                    <td><?=$key + 1?></td>
                                    <td><?=$list_item['name']?></td>
                                    <td><?=$list_item['country_code']?> <?=$list_item['phone']?></td>
                                    <td><?=$list_item['user_email']?></td>
                                    <td><?=$list_item['verification_code']?></td>
                                    <!--<td></td>-->
                                    <td> 
                                        <a class="btn btn-sm btn-primary rounded-pill" href="<?=base_url('admin/instructor/course/'.$list_item['id'])?>">
                                           Enrolled Courses
                                        </a>
                                    </td>
                                    <td class="d-none">
                                         <a class="btn btn-md btn-primary" href="<?=base_url('admin/instructor/students/'.$list_item['id'])?>">
                                            Students
                                        </a>
                                    </td>

                                    <td>
                                        <div class="dropdown d-inline-block">
                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                <i class="ri-more-fill align-middle"></i>
                                            </button>
                                            <ul class="dropdown-menu dropdown-menu-end">
                                                <li class="d-none">
                                                    <a href="javascript::void()" class="dropdown-item" onclick="show_small_modal('<?=base_url('admin/instructor/ajax_view/'.$list_item['id'])?>', 'View Instructor')">
                                                        <i class="ri-eye-fill align-bottom me-2 text-muted"></i> View
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item edit-item-btn" onclick="show_ajax_modal('<?=base_url('admin/instructor/ajax_edit/'.$list_item['id'])?>', 'Update Instructor')">
                                                        <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Edit
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="javascript::void()" class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/instructor/delete/'.$list_item['id'])?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="<?=base_url('admin/instructor/change_device/'.$list_item['id'])?>" class="dropdown-item" >
                                                        <i class="ri-exchange-fill align-bottom me-2 text-muted"></i> Change Device
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
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





