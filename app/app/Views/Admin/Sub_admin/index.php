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
                        <button class="btn btn-primary float-end"
                                onclick="show_small_modal('<?=base_url('admin/sub_admin/add/')?>', 'Add <?=$page_title ?? ''?>')">
                            <i class="mdi mdi-plus"></i>
                            Create <?=$page_title ?? ''?>
                        </button>
                    </div>
                </div>


            </div>
            <div class="card-body">
                <div class="table-responsive">
                <table id="" class="data_table_basic table table-bordered nowrap table-striped align-middle table-responsive" style="width:100%">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php 
                            if (isset($list_items)){
                                foreach ($list_items as $key => $list_item){
                        ?>
                            <tr>
                                <td><?= ++$key ?></td>
                                <td><?= $list_item['name'] ?></td>
                                <td><?=$list_item['country_code'].'-'.$list_item['phone']?></td>
                                <td><?= $list_item['user_email'] ?></td>
                                <td>
                                    <div class="dropdown d-inline-block">
                                        <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                            <i class="ri-more-fill align-middle"></i> 
                                        </button>
                                        <ul class="dropdown-menu dropdown-menu-end">
                                            <li><a href="#!" class="dropdown-item" onclick="show_ajax_modal('<?=base_url('admin/sub_admin/view/'.$list_item['id'])?>', 'View <?=$page_title ?? ''?>')"><i class="ri-eye-fill align-bottom me-2 text-muted" ></i> View</a></li>
                                            <!-- <li><a href="#!" class="dropdown-item" onclick="show_ajax_modal('</?=base_url('admin/sub_admin/reset_password/'.$list_item['id'])?>', 'Reset Password')"><i class="ri-lock-2-line align-bottom me-2 text-muted" ></i> Reset Password</a></li> -->
                                            <li><a class="dropdown-item edit-item-btn" onclick="show_small_modal('<?=base_url('admin/sub_admin/edit/'.$list_item['id'])?>', 'Update <?=$page_title ?? ''?>')"><i class="ri-pencil-fill align-bottom me-2 text-muted" ></i> Edit</a></li>
                                            <li>
                                                <?php if($list_item['id'] != 1 && $list_item['id'] != get_user_id()){ ?>
                                                    <a class="dropdown-item remove-item-btn" onclick="delete_modal('<?=base_url('admin/sub_admin/delete/'.$list_item['id'])?>')">
                                                        <i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Delete
                                                    </a>
                                                <?php } ?>
                                            </li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>
                        <?php } } ?>
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    </div>
</div><!--end row-->





